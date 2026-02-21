import logging

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, field_validator

from app.core.auth import get_current_user
from app.services.ai_provider import formula_completion, explain_formula, explain_formula_enhanced, fix_formula
from app.services.confidence import calculate_confidence
from app.services.source_linker import extract_sources
from app.services.usage import check_and_increment
from app.services.rate_limiter import check_rate_limit
from app.services.cache import get_cached, set_cached
from app.services.profiler import StepTimer
from app.services.formula_validator import validate_formula

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/formula", tags=["Formula"])

MAX_PROMPT_LENGTH = 2000
MAX_FORMULA_LENGTH = 2000


class FormulaExecuteRequest(BaseModel):
    prompt: str
    range_data: list[list] | None = None
    options: dict | None = None  # e.g. {"format": "percent"}

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if len(v) > MAX_PROMPT_LENGTH:
            raise ValueError(f"Prompt too long ({len(v)} chars). Maximum is {MAX_PROMPT_LENGTH}.")
        return v


class FormulaExecuteResponse(BaseModel):
    result: str
    confidence_score: float | None
    confidence_tier: str | None
    sources: list[dict]


class FormulaExplainRequest(BaseModel):
    formula: str  # e.g. "=VLOOKUP(A2,Sheet2!A:D,4,FALSE)"
    mode: str = "standard"  # "standard" or "step_by_step"

    @field_validator("formula")
    @classmethod
    def validate_formula(cls, v: str) -> str:
        if len(v) > MAX_FORMULA_LENGTH:
            raise ValueError(f"Formula too long ({len(v)} chars). Maximum is {MAX_FORMULA_LENGTH}.")
        return v


class FormulaExplainResponse(BaseModel):
    explanation: str
    confidence_score: float | None
    confidence_tier: str | None
    steps: list[dict] | None = None
    simpler_alternative: str | None = None


class FormulaFixRequest(BaseModel):
    formula: str           # e.g. "=VLOKUP(A2,Sheet2!A:D,4,FALSE)"
    error_message: str     # e.g. "#NAME?"
    sheet_context: str | None = None

    @field_validator("formula")
    @classmethod
    def validate_formula(cls, v: str) -> str:
        if len(v) > MAX_FORMULA_LENGTH:
            raise ValueError(f"Formula too long ({len(v)} chars). Maximum is {MAX_FORMULA_LENGTH}.")
        return v

    @field_validator("error_message")
    @classmethod
    def validate_error_message(cls, v: str) -> str:
        if len(v) > MAX_FORMULA_LENGTH:
            raise ValueError(f"Error message too long ({len(v)} chars). Maximum is {MAX_FORMULA_LENGTH}.")
        return v

    @field_validator("sheet_context")
    @classmethod
    def validate_sheet_context(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 10_000:
            raise ValueError(f"Sheet context too long ({len(v)} chars). Maximum is 10,000.")
        return v


class FormulaFixResponse(BaseModel):
    fixed_formula: str
    what_was_wrong: str
    explanation: str
    confidence_score: float | None
    confidence_tier: str | None


def _check_limits(user: dict, usage_type: str):
    """Check rate limit, monthly quota, and atomically increment usage."""
    user_id = user["id"]
    tier = user.get("tier", "free")

    rate = check_rate_limit(user_id, tier)
    if not rate["allowed"]:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please slow down.",
            headers={
                "Retry-After": str(rate["retry_after"] or 60),
                "RateLimit-Limit": str(rate["limit"]),
                "RateLimit-Remaining": "0",
            },
        )
    check_and_increment(user_id, tier, usage_type)


@router.post("/execute")
async def execute_formula(
    request: FormulaExecuteRequest,
    user: dict = Depends(get_current_user),
    profile: bool = Query(False),
):
    """Process a =SHEETMIND() cell formula request."""
    timer = StepTimer()

    timer.start("rate_limit")
    _check_limits(user, "formula_count")
    timer.stop("rate_limit")
    user_id = user["id"]

    timer.start("cache_lookup")
    cached = get_cached(
        user_id=user_id,
        endpoint="formula_execute",
        prompt=request.prompt,
        data=request.range_data,
    )
    timer.stop("cache_lookup")

    if cached:
        timer.mark("ai_call", 0)
        response_data = cached
    else:
        timer.start("ai_call")
        try:
            result = formula_completion(
                prompt=request.prompt,
                range_data=request.range_data,
            )
        except RuntimeError as e:
            logger.error(f"AI provider error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
        timer.stop("ai_call")

        timer.start("confidence")
        sheet_data = None
        if request.range_data:
            sheet_data = {"rows": request.range_data}
        conf = calculate_confidence(
            message=request.prompt,
            response=result,
            sheet_data=sheet_data,
        )
        timer.stop("confidence")

        timer.start("source_extraction")
        sources = extract_sources(result)
        sources_json = [s.model_dump() for s in sources]
        timer.stop("source_extraction")

        response_data = {
            "result": result,
            "confidence_score": conf["score"],
            "confidence_tier": conf["tier"],
            "sources": sources_json,
        }

        timer.start("cache_set")
        set_cached(
            user_id=user_id,
            endpoint="formula_execute",
            prompt=request.prompt,
            data=request.range_data,
            response=response_data,
        )
        timer.stop("cache_set")

    profile_data = timer.log("formula_execute")
    if profile:
        response_data["_profile"] = profile_data
    return response_data


@router.post("/explain")
async def explain_formula_endpoint(
    request: FormulaExplainRequest,
    user: dict = Depends(get_current_user),
    profile: bool = Query(False),
):
    """Explain an existing spreadsheet formula in plain English."""
    timer = StepTimer()

    timer.start("rate_limit")
    _check_limits(user, "query_count")
    timer.stop("rate_limit")
    user_id = user["id"]

    cache_endpoint = f"formula_explain_{request.mode}"

    timer.start("cache_lookup")
    cached = get_cached(
        user_id=user_id,
        endpoint=cache_endpoint,
        prompt=request.formula,
    )
    timer.stop("cache_lookup")

    if cached:
        timer.mark("ai_call", 0)
        profile_data = timer.log("formula_explain")
        response_data = cached
        if profile:
            response_data["_profile"] = profile_data
        return response_data

    # Validate formula syntax before explaining
    is_valid, syntax_errors = validate_formula(request.formula)
    syntax_note = ""
    if not is_valid:
        syntax_note = "Note: This formula has syntax issues: " + "; ".join(syntax_errors) + "\n\n"

    timer.start("ai_call")
    if request.mode == "step_by_step":
        try:
            result = explain_formula_enhanced(request.formula)
        except RuntimeError as e:
            logger.error(f"AI provider error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    else:
        try:
            result = explain_formula(request.formula)
        except RuntimeError as e:
            logger.error(f"AI provider error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    timer.stop("ai_call")

    timer.start("confidence")
    if request.mode == "step_by_step":
        explanation_text = result.get("full_explanation") or result.get("summary", "")
        if syntax_note:
            explanation_text = syntax_note + explanation_text
        conf = calculate_confidence(
            message=f"Explain: {request.formula}",
            response=explanation_text,
            sheet_data=None,
        )
        response_data = {
            "explanation": explanation_text,
            "confidence_score": conf["score"],
            "confidence_tier": conf["tier"],
            "steps": result.get("steps"),
            "simpler_alternative": result.get("simpler_alternative"),
        }
    else:
        explanation_result = syntax_note + result if syntax_note else result
        conf = calculate_confidence(
            message=f"Explain: {request.formula}",
            response=explanation_result,
            sheet_data=None,
        )
        response_data = {
            "explanation": explanation_result,
            "confidence_score": conf["score"],
            "confidence_tier": conf["tier"],
        }
    timer.stop("confidence")

    timer.start("cache_set")
    set_cached(
        user_id=user_id,
        endpoint=cache_endpoint,
        prompt=request.formula,
        response=response_data,
    )
    timer.stop("cache_set")

    profile_data = timer.log("formula_explain")
    if profile:
        response_data["_profile"] = profile_data
    return response_data


@router.post("/fix")
async def fix_formula_endpoint(
    request: FormulaFixRequest,
    user: dict = Depends(get_current_user),
    profile: bool = Query(False),
):
    """Fix a broken spreadsheet formula."""
    timer = StepTimer()

    timer.start("rate_limit")
    _check_limits(user, "query_count")
    timer.stop("rate_limit")
    user_id = user["id"]

    cache_prompt = f"{request.formula}||{request.error_message}"

    timer.start("cache_lookup")
    cached = get_cached(
        user_id=user_id,
        endpoint="formula_fix",
        prompt=cache_prompt,
        data=request.sheet_context,
    )
    timer.stop("cache_lookup")

    if cached:
        timer.mark("ai_call", 0)
        profile_data = timer.log("formula_fix")
        response_data = cached
        if profile:
            response_data["_profile"] = profile_data
        return response_data

    timer.start("ai_call")
    try:
        result = fix_formula(
            formula=request.formula,
            error_message=request.error_message,
            sheet_context=request.sheet_context,
        )
    except RuntimeError as e:
        logger.error(f"AI provider error: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    timer.stop("ai_call")

    timer.start("confidence")
    conf = calculate_confidence(
        message=f"Fix: {request.formula} Error: {request.error_message}",
        response=result.get("fixed_formula", ""),
        sheet_data=None,
    )
    timer.stop("confidence")

    fixed_formula = result.get("fixed_formula", "")
    what_was_wrong = result.get("what_was_wrong", "")

    # Validate the AI's fixed formula for syntax correctness
    if fixed_formula:
        fix_valid, fix_errors = validate_formula(fixed_formula)
        if not fix_valid:
            what_was_wrong += " | Warning: The suggested fix has syntax issues: " + "; ".join(fix_errors)

    response_data = {
        "fixed_formula": fixed_formula,
        "what_was_wrong": what_was_wrong,
        "explanation": result.get("explanation", ""),
        "confidence_score": conf["score"],
        "confidence_tier": conf["tier"],
    }

    timer.start("cache_set")
    set_cached(
        user_id=user_id,
        endpoint="formula_fix",
        prompt=cache_prompt,
        data=request.sheet_context,
        response=response_data,
    )
    timer.stop("cache_set")

    profile_data = timer.log("formula_fix")
    if profile:
        response_data["_profile"] = profile_data
    return response_data
