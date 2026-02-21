import asyncio
import json
import re
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query

from app.core.config import settings
from app.core.database import get_supabase
from app.core.auth import get_current_user
from app.schemas.message import (
    ChatRequest, ChatResponse, SourceReference, StepAction, QuickAction,
    AgentReasoningStep, ClearMemoryRequest, RAGIndexResponse, RAGSearchResponse,
    ChatMode,
)
from app.services.ai_provider import chat_completion, agent_completion
from app.services.chart_generator import generate_chart
from app.services.source_linker import extract_sources
from app.services.usage import check_limit, increment_usage, check_and_increment
from app.services.rate_limiter import check_rate_limit
from app.services.cache import get_cached, set_cached
from app.services.profiler import StepTimer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

_bg_executor = ThreadPoolExecutor(max_workers=settings.THREAD_POOL_SIZE)

# LangChain imports (lazy loaded based on feature flag)
_langchain_available = False
_smart_executor = None
try:
    if settings.LANGCHAIN_ENABLED:
        from app.services.langchain_agent import get_agent, clear_agent, remove_agent
        from app.services.rag_system import get_rag
        from app.services.smart_executor import SmartExecutor, RequestType
        from app.services.sheet_analyzer import analyze_sheet
        _langchain_available = True
        logger.info("LangChain agent enabled with SmartExecutor")
except ImportError as e:
    logger.warning(f"LangChain not available: {e}")

_CHART_INTENT_PATTERN = re.compile(
    r"\b(show\s+(me\s+)?(a\s+)?chart|"
    r"create\s+(a\s+)?chart|"
    r"generate\s+(a\s+)?chart|"
    r"make\s+(a\s+)?chart|"
    r"visualize|visualise|"
    r"plot\s+(the\s+)?data|"
    r"bar\s+chart|line\s+chart|pie\s+chart|"
    r"doughnut\s+chart|scatter\s+chart|radar\s+chart|"
    r"graph\s+(the|my|this))\b",
    re.IGNORECASE,
)

# Phase 2B: Intent detection for agent-style vs simple answer
_AGENT_INTENT_PATTERN = re.compile(
    r"\b(group\s+by|grouped\s+by|summarize|summarise|"
    r"pivot\s+table|create\s+(a\s+)?sheet|"
    r"create\s+(a\s+)?new\s+sheet|"
    r"move\s+to\s+(a\s+)?new\s+sheet|"
    r"split\s+into|merge\s+|"
    r"deduplicate|de-duplicate|remove\s+duplicates|find\s+duplicates|"
    r"create\s+(a\s+)?summary|"
    r"breakdown\s+by|break\s+down\s+by|"
    r"aggregate|aggregated|"
    r"cross\s*tab|crosstab|"
    r"sum\s+of\s+.*\s+by\s+|count\s+of\s+.*\s+by\s+|"
    r"average\s+of\s+.*\s+by\s+|"
    r"total\s+.*\s+per\s+|count\s+.*\s+per\s+|"
    r"for\s+each\s+(unique\s+)?|per\s+each\s+|"
    r"grouped|categorize\s+by|categorise\s+by|"
    r"organize\s+by|organise\s+by|"
    # "X wise" patterns (Indian English: "major wise", "department wise")
    r"\w+\s+wise\s+(sum|count|total|average|avg|mean|breakdown|split|value)|"
    r"(sum|count|total|average|avg|mean)\s+\w+\s+wise|"
    r"\w+\s+wise\b|"
    # Short "verb by X" patterns
    r"sum\s+by\s+|count\s+by\s+|average\s+by\s+|avg\s+by\s+|"
    r"total\s+by\s+|mean\s+by\s+|"
    # Top/bottom/sort/rank patterns
    r"top\s+\d+|bottom\s+\d+|"
    r"sort\s+(by|the)|sort\s+\w+\s+(asc|desc|ascending|descending)|"
    r"highest\s+\d+|lowest\s+\d+|"
    r"rank\s+by|ranking|"
    r"best\s+\d+|worst\s+\d+|"
    r"largest\s+\d+|smallest\s+\d+|"
    r"show\s+(me\s+)?(the\s+)?top\s+|show\s+(me\s+)?(the\s+)?bottom\s+|"
    r"sort\s+descending|sort\s+ascending|"
    r"order\s+by|arrange\s+by)\b",
    re.IGNORECASE,
)


def detect_chart_intent(message: str) -> bool:
    """Return True if the user message indicates they want a chart."""
    return bool(_CHART_INTENT_PATTERN.search(message))


def detect_agent_intent(message: str, history: list = None) -> bool:
    """Return True if the query needs agent-style step execution.

    Also returns True if any previous message in history had agent intent,
    to maintain context for follow-up questions like "yes" or "do it".
    """
    # Check current message
    if _AGENT_INTENT_PATTERN.search(message):
        return True

    # Check if this looks like a follow-up confirmation
    # Short messages that confirm previous agent queries should use agent
    short_confirmations = re.compile(
        r"^(yes|yeah|yep|sure|ok|okay|do it|go ahead|proceed|please|correct|right|exactly|that one|the first|create it)[\s!.?]*$",
        re.IGNORECASE
    )
    if short_confirmations.match(message.strip()):
        # Check if any previous user message had agent intent
        if history:
            for h in history:
                if h.get("role") == "user" and _AGENT_INTENT_PATTERN.search(h.get("content", "")):
                    return True

    # Check for explicit action requests
    action_request = re.compile(
        r"\b(create\s+(a\s+)?sheet|create\s+(a\s+)?chart|make\s+(a\s+)?chart|"
        r"do\s+(the\s+)?action|perform|execute|make\s+it|in\s+the\s+sheet|"
        r"not\s+answer|actions?\s+in|"
        r"visualize|visualise|plot\s+(the\s+)?data|"
        r"bar\s+chart|line\s+chart|pie\s+chart|doughnut\s+chart|scatter\s+chart)",
        re.IGNORECASE
    )
    if action_request.search(message):
        return True

    return False


# Simple greeting detection - skip sheet context for these
_GREETING_PATTERN = re.compile(
    r"^(hi|hello|hey|good\s*(morning|afternoon|evening)|thanks|thank\s*you|ok|okay|bye|goodbye)[\s!.?]*$",
    re.IGNORECASE,
)


def is_simple_greeting(message: str) -> bool:
    """Return True if the message is just a greeting (no data analysis needed)."""
    return bool(_GREETING_PATTERN.match(message.strip()))


_ACTION_PATTERN = re.compile(r"```sheetaction\s*\n(.*?)\n```", re.DOTALL)


def _extract_sheet_action(text: str) -> tuple[str, dict | None]:
    """Extract a sheet action JSON from AI response.

    Returns (cleaned_text, action_dict_or_None).
    """
    match = _ACTION_PATTERN.search(text)
    if not match:
        return text, None
    try:
        action = json.loads(match.group(1).strip())
        # Remove the action block from the user-visible text
        cleaned = text[:match.start()].rstrip() + text[match.end():]
        return cleaned.strip(), action
    except (json.JSONDecodeError, IndexError):
        return text, None


# Phase 4A: Detect column types and generate quick actions
def _generate_quick_actions(sheet_data: dict | None, sheet_name: str | None) -> list[QuickAction]:
    """Generate smart quick action suggestions based on column types."""
    if not sheet_data or "cells" not in sheet_data or not sheet_data["cells"]:
        return []

    cells = sheet_data["cells"]
    cell_pattern = re.compile(r"^([A-Z]+)(\d+)$")

    # Parse header row and sample data
    headers = {}  # col_letter -> header_name
    col_values = {}  # col_letter -> list of sample values

    for ref, val in cells.items():
        m = cell_pattern.match(ref)
        if not m:
            continue
        col = m.group(1)
        row = int(m.group(2))
        if row == 1:
            headers[col] = str(val)
        else:
            if col not in col_values:
                col_values[col] = []
            col_values[col].append(str(val))

    if not headers:
        return []

    actions = []

    # Detect numeric columns
    numeric_cols = []
    text_cols = []
    for col, values in col_values.items():
        if col not in headers:
            continue
        numeric_count = 0
        for v in values[:20]:
            try:
                float(v.replace(",", "").replace("$", "").replace("%", ""))
                numeric_count += 1
            except ValueError:
                pass
        if numeric_count > len(values[:20]) * 0.7:
            numeric_cols.append(headers[col])
        else:
            unique_ratio = len(set(values[:20])) / max(len(values[:20]), 1)
            if unique_ratio < 0.6:
                text_cols.append(headers[col])

    # Generate suggestions based on detected types
    if numeric_cols and text_cols:
        num_col = numeric_cols[0]
        text_col = text_cols[0]
        actions.append(QuickAction(
            label=f"Sum {num_col} by {text_col}",
            prompt=f"Find the sum of {num_col} grouped by {text_col}",
        ))
        actions.append(QuickAction(
            label=f"Average {num_col} by {text_col}",
            prompt=f"Calculate the average {num_col} for each {text_col}",
        ))

    if numeric_cols:
        col_name = numeric_cols[0]
        actions.append(QuickAction(
            label=f"Total {col_name}",
            prompt=f"What is the total {col_name}?",
        ))

    if text_cols:
        col_name = text_cols[0]
        actions.append(QuickAction(
            label=f"Count by {col_name}",
            prompt=f"Count the number of entries for each {col_name}",
        ))

    # Always add a general action
    name = sheet_name or "Sheet1"
    actions.append(QuickAction(
        label="Find Duplicates",
        prompt=f"Find duplicate rows in {name}",
    ))

    return actions[:5]  # Limit to 5 suggestions


def _persist_chat(
    sb,
    conversation_id: str,
    user_id: str,
    user_message: str,
    ai_response: str,
    conf_score: float | None,
    sources_json: list,
):
    """Save conversation, user msg, and assistant msg to DB (runs in background)."""
    try:
        # Verify conversation exists and belongs to this user before inserting
        conv = sb.table("conversations") \
            .select("id") \
            .eq("id", conversation_id) \
            .eq("user_id", user_id) \
            .execute()
        if not conv.data:
            logger.error(f"Persist skipped: conversation {conversation_id} not found for user {user_id}")
            return

        sb.table("messages").insert({
            "conversation_id": conversation_id,
            "role": "user",
            "content": user_message,
        }).execute()
        sb.table("messages").insert({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": ai_response,
            "confidence_score": conf_score,
            "sources": sources_json,
        }).execute()
        # Touch updated_at so conversation list sorts by most recent activity
        sb.table("conversations") \
            .update({"updated_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("id", conversation_id) \
            .execute()
    except Exception as exc:
        logger.error(f"Background DB persist failed: {exc}")


_COLUMN_QUESTION = re.compile(
    r"which\s+column|what\s+column|select\s+.*column|choose\s+.*column",
    re.IGNORECASE,
)
_SHEET_QUESTION = re.compile(
    r"which\s+sheet|what\s+sheet|select\s+.*sheet",
    re.IGNORECASE,
)
_RANGE_QUESTION = re.compile(
    r"which\s+range|what\s+range|which\s+cells",
    re.IGNORECASE,
)


def _detect_clarification(
    ai_response: str,
    sheet_metadata: dict | None,
    sheets: list | None = None,
    history: list[dict] | None = None,
) -> dict | None:
    """Detect if the AI response asks a clarifying question and build clickable options.

    Returns a dict with {question, type, options} or None.
    Suppresses clarification when the answer is already in recent history.
    """
    # Only trigger on responses that contain a question
    lines = [l.strip() for l in ai_response.strip().split("\n") if l.strip()]
    if not lines:
        return None

    # Check the last meaningful line for a question mark
    has_question = any("?" in line for line in lines[-3:])
    if not has_question:
        return None

    # Suppress clarification if the answer is already in recent history.
    # e.g. user said "profit" 2 messages ago → AI shouldn't ask "which column?"
    if history and len(history) >= 2:
        recent_user_msgs = " ".join(
            m.get("content", "") for m in history[-6:] if m.get("role") == "user"
        ).lower()
        # If column question but user already mentioned a column name from metadata
        if _COLUMN_QUESTION.search(ai_response) and sheet_metadata:
            columns = sheet_metadata.get("columns", [])
            for col in columns:
                header = col.get("header", "").lower()
                if header and len(header) > 1 and header in recent_user_msgs:
                    return None  # User already specified — don't show cards

    # Extract question text (last line with ?)
    question_text = ""
    for line in reversed(lines):
        if "?" in line:
            question_text = line.lstrip("#*- ").strip()
            break

    # Column question
    if _COLUMN_QUESTION.search(ai_response) and sheet_metadata:
        columns = sheet_metadata.get("columns", [])
        if columns:
            options = []
            for col in columns:
                letter = col.get("letter", "?")
                header = col.get("header", "")
                col_type = col.get("type", "")
                unique = col.get("uniqueCount", 0)
                desc_parts = []
                if col_type:
                    desc_parts.append(col_type)
                if unique:
                    desc_parts.append(f"{unique} unique")
                options.append({
                    "label": f"{letter}: {header}",
                    "value": f"Column {letter} ({header})",
                    "description": ", ".join(desc_parts) if desc_parts else "column",
                })
            return {
                "question": question_text,
                "type": "column",
                "options": options[:8],  # Cap at 8 options for UI
            }

    # Sheet question
    if _SHEET_QUESTION.search(ai_response) and sheets:
        options = []
        for s in sheets:
            name = s if isinstance(s, str) else s.get("name", str(s))
            options.append({
                "label": name,
                "value": f"Sheet: {name}",
                "description": "sheet",
            })
        if options:
            return {
                "question": question_text,
                "type": "sheet",
                "options": options[:8],
            }

    # Range question
    if _RANGE_QUESTION.search(ai_response):
        return {
            "question": question_text,
            "type": "range",
            "options": [
                {"label": "Full data range", "value": "Use the full data range", "description": "All rows and columns"},
                {"label": "Current selection", "value": "Use my current selection", "description": "Selected cells only"},
            ],
        }

    return None


def _fetch_db_history(conversation_id: str, limit: int = 20) -> list[dict] | None:
    """Fetch the last `limit` messages from DB for a conversation.

    Returns list of {role, content} dicts ordered by created_at ASC,
    or None if no messages found / on error.
    """
    try:
        sb = get_supabase()
        result = (
            sb.table("messages")
            .select("role, content")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        if result.data:
            return [{"role": m["role"], "content": m["content"]} for m in result.data]
    except Exception as exc:
        logger.warning(f"Failed to fetch DB history for {conversation_id}: {exc}")
    return None


@router.post("/query")
async def chat_query(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    profile: bool = Query(False, description="Return step-level timing breakdown"),
):
    """Process a chat query from the sidebar."""
    timer = StepTimer()

    # ===== LOGGING: Request received (basic info, intent logged after history built) =====
    logger.info("=" * 60)
    logger.info(f"📩 NEW REQUEST: {request.message[:100]}")
    logger.info(f"   Sheet: {request.sheet_name or 'None'}, Cells: {len(request.sheet_data.get('cells', {})) if request.sheet_data else 0}")
    logger.info(f"   Has history: {len(request.history) if request.history else 0} messages, Mode: {request.mode or 'default'}")

    timer.start("auth_and_init")
    sb = get_supabase()
    user_id = user["id"]
    tier = user.get("tier", "free")
    timer.stop("auth_and_init")

    timer.start("rate_limit")
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
    timer.stop("rate_limit")

    timer.start("usage_check")
    # Atomically check limit AND increment usage counter before the AI call.
    # This prevents concurrent requests from bypassing the quota.
    check_and_increment(user_id, tier, "chat_count")
    timer.stop("usage_check")

    # Check cache before calling AI (skip if force_refresh or continuing a conversation)
    timer.start("cache_lookup")
    cached = None
    if not request.force_refresh and not request.conversation_id:
        cached = get_cached(
            user_id=user_id,
            endpoint="chat",
            prompt=request.message,
            data=request.sheet_data,
        )
    timer.stop("cache_lookup")

    loop = asyncio.get_running_loop()

    # Create conversation (in background if new) and kick off chart concurrently
    timer.start("conv_create")
    conv_future = None
    if request.conversation_id:
        conversation_id = str(request.conversation_id)
    else:
        # Create conversation in background thread
        def _create_conv():
            result = sb.table("conversations").insert({
                "user_id": user_id,
                "title": request.message[:100],
            }).execute()
            return result.data[0]["id"]
        conv_future = loop.run_in_executor(_bg_executor, _create_conv)
    timer.stop("conv_create")

    chart_future = None
    if detect_chart_intent(request.message) and request.sheet_data:
        chart_future = loop.run_in_executor(
            _bg_executor,
            generate_chart,
            request.sheet_data,
        )

    # Phase 3: Build history — prefer DB history when conversation exists
    history = None
    if request.conversation_id:
        db_history = _fetch_db_history(str(request.conversation_id))
        if db_history:
            history = db_history
            logger.info(f"   Loaded {len(db_history)} messages from DB for conversation {request.conversation_id}")
    if history is None and request.history:
        history = [{"role": h.role, "content": h.content} for h in request.history]

    # Skip sheet data for simple greetings (faster response)
    is_greeting = is_simple_greeting(request.message)
    effective_sheet_data = None if is_greeting else request.sheet_data
    effective_sheet_name = None if is_greeting else request.sheet_name

    # PII detection — warn user if sensitive data will be sent to LLM
    pii_warning = None
    if settings.PII_DETECTION_ENABLED and effective_sheet_data and "cells" in effective_sheet_data:
        from app.services.pii_detector import scan_cells
        pii_result = scan_cells(effective_sheet_data["cells"])
        if pii_result["has_pii"]:
            pii_warning = pii_result["warning"]
            logger.warning(f"PII detected: {pii_result['types_found']}")

    # Phase 2B: Detect if this is an agent-style query (pass history for follow-ups)
    # If mode is explicitly set to "chat", never use agent (just answer questions)
    # If mode is "action" or not set, use agent for matching queries
    is_chat_mode = request.mode == ChatMode.chat
    is_action_mode = request.mode == ChatMode.action
    is_agent_query = not is_greeting and not is_chat_mode and (
        is_action_mode
        or detect_agent_intent(request.message, history)
        or detect_chart_intent(request.message)
    )

    # Log final intent after history-aware detection
    logger.info(
        f"   Intent: chart={detect_chart_intent(request.message)}, "
        f"agent={is_agent_query}, greeting={is_greeting}, "
        f"mode={request.mode}, action_mode_override={is_action_mode}"
    )
    logger.info("=" * 60)

    steps = None
    thinking = None
    verification = None
    sheet_action = None
    reasoning_steps = None
    used_rag = False
    agent_timing = None
    sheet_metadata = None  # Pre-processing metadata
    smart_chart_config = None  # Inline chart from SmartExecutor

    if cached:
        timer.mark("ai_call", 0)
        ai_response = cached["content"]
        sources_json = cached.get("sources", [])
    elif is_agent_query and settings.LANGCHAIN_ENABLED and _langchain_available:
        # ===== SMART EXECUTOR: Try to handle with 1-2 LLM calls first =====
        timer.start("ai_call")
        use_smart_executor = True
        smart_result = None

        try:
            # Analyze sheet first for metadata
            cells = effective_sheet_data.get("cells", {}) if effective_sheet_data else {}
            if cells:
                metadata = analyze_sheet(cells, effective_sheet_name or "Sheet1")
                metadata_dict = metadata.to_dict()

                # Create SmartExecutor with LLM
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model="google/gemini-2.0-flash-001",
                    api_key=settings.OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    temperature=0.1,
                    max_tokens=2048,
                )
                executor = SmartExecutor(llm)

                # Enrich short messages with conversation context for SmartExecutor
                smart_message = request.message
                if history and len(request.message.strip()) <= 20:
                    last_exchanges = []
                    for msg in history[-4:]:  # last 2 exchanges
                        role = msg.get("role", "")
                        content = msg.get("content", "")[:300]
                        if role and content:
                            last_exchanges.append(f"{role}: {content}")
                    if last_exchanges:
                        smart_message = (
                            "Previous conversation:\n"
                            + "\n".join(last_exchanges)
                            + f"\n\nCurrent request: {request.message}"
                        )

                # Try smart execution
                smart_result = await loop.run_in_executor(
                    _bg_executor,
                    lambda: executor.execute(smart_message, metadata_dict, cells=cells)
                )

                # Check if it succeeded or needs full agent
                if smart_result.get("request_type") == "complex" and not smart_result.get("actions"):
                    use_smart_executor = False
                    logger.info("⚡ SmartExecutor: Complex request, falling back to ReAct agent")
                else:
                    logger.info(f"⚡ SmartExecutor SUCCESS: {smart_result.get('request_type')} with {smart_result.get('llm_calls')} LLM calls")
            else:
                use_smart_executor = False

        except Exception as e:
            logger.warning(f"SmartExecutor failed, falling back to ReAct: {e}")
            use_smart_executor = False

        if use_smart_executor and smart_result:
            # Use SmartExecutor result
            ai_response = smart_result.get("response", "Done!")
            agent_actions = smart_result.get("actions", [])
            smart_chart_config = smart_result.get("chart_config")
            sources_json = []

            if agent_actions:
                steps = [
                    StepAction(
                        step=i + 1,
                        description=a.get("action", "Action"),
                        action=a,
                        formula=a.get("formula"),
                        about=a.get("about"),
                    )
                    for i, a in enumerate(agent_actions)
                ]

            # Minimal reasoning for smart executor
            reasoning_steps = [
                AgentReasoningStep(
                    step=1,
                    thought=f"Classified as {smart_result.get('request_type')}",
                    tool="SmartExecutor",
                    tool_input=request.message,
                    result=f"Generated {len(agent_actions)} actions in {smart_result.get('llm_calls')} LLM calls",
                )
            ]

            agent_timing = {"llm_calls": smart_result.get("llm_calls", 1), "mode": "smart"}
            sheet_metadata = metadata_dict if 'metadata_dict' in dir() else None

            logger.info(f"⚡ SMART EXECUTOR COMPLETED:")
            logger.info(f"   Response: {ai_response[:100]}...")
            logger.info(f"   Steps: {len(agent_actions)} actions")
            logger.info(f"   LLM calls: {smart_result.get('llm_calls')}")
            logger.info(f"   Type: {smart_result.get('request_type')}")

        else:
            # ===== FALLBACK: Full ReAct Agent (10-15 LLM calls) =====
            try:
                session_id = str(request.conversation_id) if request.conversation_id else str(uuid.uuid4())

                agent_result = await loop.run_in_executor(
                    _bg_executor,
                    lambda: get_agent(session_id).run(
                        message=request.message,
                        sheet_data=effective_sheet_data,
                        sheet_name=effective_sheet_name,
                        history=history,
                    ),
                )

                ai_response = agent_result.get("response", "")
                sources_json = []

                agent_actions = agent_result.get("actions", [])
                if agent_actions:
                    steps = [
                        StepAction(
                            step=i + 1,
                            description=a.get("action", "Action"),
                            action=a,
                            formula=a.get("formula"),
                            about=a.get("about"),
                        )
                        for i, a in enumerate(agent_actions)
                    ]

                agent_reasoning = agent_result.get("reasoning", [])
                if agent_reasoning:
                    reasoning_steps = [
                        AgentReasoningStep(
                            step=r.get("step", i + 1),
                            thought=r.get("thought", ""),
                            tool=r.get("tool", ""),
                            tool_input=r.get("tool_input", ""),
                            result=r.get("result", ""),
                        )
                        for i, r in enumerate(agent_reasoning)
                    ]

                used_rag = agent_result.get("used_rag", False)
                agent_timing = agent_result.get("timing", {})
                sheet_metadata = agent_result.get("metadata")

                logger.info(f"🤖 REACT AGENT COMPLETED:")
                logger.info(f"   Response: {ai_response[:100]}...")
                logger.info(f"   Steps: {len(agent_actions)} actions queued")
                logger.info(f"   Reasoning: {len(agent_reasoning)} steps")
                logger.info(f"   RAG used: {used_rag}")
                logger.info(f"   Timing: {agent_timing}")
                if agent_actions:
                    for i, a in enumerate(agent_actions):
                        logger.info(f"   Action {i+1}: {a.get('action')} - {str(a)[:80]}")

            except Exception as e:
                logger.error(f"LangChain agent failed: {e}", exc_info=True)
                try:
                    ai_response = chat_completion(
                        message=request.message,
                        sheet_data=effective_sheet_data,
                        sheet_name=effective_sheet_name,
                        history=history,
                    )
                    default_sheet = effective_sheet_name or "Sheet1"
                    sources = extract_sources(ai_response, default_sheet)
                    sources_json = [s.model_dump() for s in sources]
                except RuntimeError as e2:
                    logger.error(f"AI fallback also failed: {e2}")
                    raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

        timer.stop("ai_call")

    elif is_agent_query:
        # Legacy agent-style execution (when LangChain disabled)
        timer.start("ai_call")
        try:
            agent_result = await loop.run_in_executor(
                _bg_executor,
                lambda: agent_completion(
                    message=request.message,
                    sheet_data=effective_sheet_data,
                    sheet_name=effective_sheet_name,
                    history=history,
                ),
            )
        except RuntimeError as e:
            logger.error(f"AI provider error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
        timer.stop("ai_call")

        if agent_result and "steps" in agent_result:
            # Successfully got agent plan
            thinking = agent_result.get("thinking", "")
            verification = agent_result.get("verification", "")
            ai_response = agent_result.get("summary", "Execution plan created.")
            steps = [
                StepAction(
                    step=s.get("step", i + 1),
                    description=s.get("description", ""),
                    action=s.get("action", {}),
                    formula=s.get("formula"),
                    about=s.get("about"),
                )
                for i, s in enumerate(agent_result["steps"])
            ]
            sources_json = []
        else:
            # Agent parsing failed, fall back to regular chat
            try:
                ai_response = chat_completion(
                    message=request.message,
                    sheet_data=effective_sheet_data,
                    sheet_name=effective_sheet_name,
                    history=history,
                )
            except RuntimeError as e:
                logger.error(f"AI provider error: {e}")
                raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

            default_sheet = effective_sheet_name or "Sheet1"
            sources = extract_sources(ai_response, default_sheet)
            sources_json = [s.model_dump() for s in sources]
    else:
        # Regular chat
        timer.start("ai_call")
        try:
            ai_response = chat_completion(
                message=request.message,
                sheet_data=effective_sheet_data,
                sheet_name=effective_sheet_name,
                history=history,
            )
        except RuntimeError as e:
            logger.error(f"AI provider error: {e}")
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
        timer.stop("ai_call")

        timer.start("source_extraction")
        default_sheet = effective_sheet_name or "Sheet1"
        sources = extract_sources(ai_response, default_sheet)
        sources_json = [s.model_dump() for s in sources]
        timer.stop("source_extraction")

        timer.start("cache_set")
        set_cached(
            user_id=user_id,
            endpoint="chat",
            prompt=request.message,
            data=effective_sheet_data,
            response={
                "content": ai_response,
                "sources": sources_json,
            },
        )
        timer.stop("cache_set")

    # Resolve conversation_id if created in background
    if conv_future:
        timer.start("conv_await")
        try:
            conversation_id = await asyncio.wait_for(conv_future, timeout=5.0)
        except asyncio.TimeoutError:
            logger.error("Conversation creation timed out after 5s")
            raise HTTPException(status_code=503, detail="Service temporarily slow. Please try again.")
        except Exception as e:
            logger.error(f"Conversation creation failed: {e}")
            raise HTTPException(status_code=503, detail="Failed to start conversation. Please try again.")
        timer.stop("conv_await")

    # Generate a message ID client-side so we don't wait for the DB insert
    message_id = str(uuid.uuid4())

    # Persist messages + usage in background (non-blocking)
    loop.run_in_executor(
        _bg_executor,
        _persist_chat,
        sb, conversation_id, user_id, request.message,
        ai_response, None, sources_json,
    )

    # Await chart result if we started generation
    chart_config = None
    if chart_future:
        timer.start("chart_gen")
        try:
            chart_config = await chart_future
        except Exception as exc:
            logger.warning(f"Auto chart generation failed: {exc}")
        timer.stop("chart_gen")

    # Merge SmartExecutor inline chart if no chart was generated from chart_future
    if not chart_config and smart_chart_config:
        chart_config = smart_chart_config

    # Extract sheet action (filter/sort/highlight) if present and not agent mode
    if not steps:
        ai_response, sheet_action = _extract_sheet_action(ai_response)

    # Phase 4: Generate quick actions on first message (no conversation yet, skip for greetings)
    quick_actions = None
    if not request.conversation_id and effective_sheet_data and not is_greeting:
        qa_list = _generate_quick_actions(effective_sheet_data, effective_sheet_name)
        if qa_list:
            quick_actions = qa_list

    # Detect clarification questions in AI response
    clarification = None
    if not steps:  # Don't offer clarification when we already have an execution plan
        sheets_list = None
        if request.sheet_data and "cells" in (request.sheet_data or {}):
            # Build simple sheet list from the sheets the frontend knows about
            sheets_list = None  # Populated from frontend context if needed
        clarification = _detect_clarification(ai_response, sheet_metadata, sheets_list, history)

    profile_data = timer.log("chat_query")

    response = {
        "conversation_id": conversation_id,
        "message_id": message_id,
        "content": ai_response,
        "sources": sources_json,
        "chart_config": chart_config,
        "sheet_action": sheet_action,
        "steps": [s.model_dump() for s in steps] if steps else None,
        "thinking": thinking,
        "verification": verification,
        "quick_actions": [qa.model_dump() for qa in quick_actions] if quick_actions else None,
        # LangChain specific fields
        "reasoning_steps": [r.model_dump() for r in reasoning_steps] if reasoning_steps else None,
        "used_rag": used_rag if used_rag else None,
        "agent_timing": agent_timing if agent_timing else None,
        # Pre-processing metadata
        "sheet_metadata": sheet_metadata if sheet_metadata else None,
        # PII warning
        "pii_warning": pii_warning,
        # Clarification cards
        "clarification": clarification,
    }

    if profile:
        response["_profile"] = profile_data

    # ===== LOGGING: Response sent =====
    logger.info(f"📤 RESPONSE SENT:")
    logger.info(f"   Content length: {len(ai_response)} chars")
    logger.info(f"   Has steps: {bool(steps)}, Has chart: {bool(chart_config)}")
    logger.info(f"   Has reasoning: {bool(reasoning_steps)}")
    logger.info("=" * 60)

    return response


@router.get("/history")
async def chat_history(
    user: dict = Depends(get_current_user),
    conversation_id: str | None = None,
    limit: int = Query(20, ge=1, le=100, description="Max conversations to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """Get conversation history."""
    sb = get_supabase()
    user_id = user["id"]

    if conversation_id:
        # Verify the conversation belongs to the user
        conv = sb.table("conversations") \
            .select("id") \
            .eq("id", conversation_id) \
            .eq("user_id", user_id) \
            .execute()

        if not conv.data:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Return messages for a specific conversation (capped to prevent huge payloads)
        result = sb.table("messages") \
            .select("*") \
            .eq("conversation_id", conversation_id) \
            .order("created_at") \
            .limit(500) \
            .execute()

        return {"messages": result.data}
    else:
        # Return paginated list of conversations
        query = sb.table("conversations") \
            .select("*", count="exact") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .range(offset, offset + limit - 1)

        result = query.execute()

        return {
            "conversations": result.data,
            "total": result.count if result.count is not None else len(result.data),
            "limit": limit,
            "offset": offset,
        }


@router.delete("/history/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a conversation and all its messages."""
    # Validate UUID format to avoid passing arbitrary strings to DB queries
    try:
        uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    sb = get_supabase()

    # Verify ownership
    conv = sb.table("conversations") \
        .select("id") \
        .eq("id", conversation_id) \
        .eq("user_id", user["id"]) \
        .execute()

    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Messages cascade-delete automatically
    delete_result = sb.table("conversations") \
        .delete() \
        .eq("id", conversation_id) \
        .eq("user_id", user["id"]) \
        .execute()

    if not delete_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found or already deleted")

    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# LangChain Agent Endpoints
# ---------------------------------------------------------------------------

@router.post("/agent/clear")
async def clear_agent_memory(
    request: ClearMemoryRequest = None,
    user: dict = Depends(get_current_user),
):
    """
    Clear the LangChain agent's conversation memory.

    Use this to start a fresh conversation without prior context.
    """
    if not settings.LANGCHAIN_ENABLED or not _langchain_available:
        raise HTTPException(
            status_code=400,
            detail="LangChain agent is not enabled. Set LANGCHAIN_ENABLED=true in .env"
        )

    session_id = request.conversation_id if request and request.conversation_id else user["id"]

    try:
        clear_agent(session_id)
        return {
            "status": "memory_cleared",
            "session_id": session_id,
        }
    except Exception as e:
        logger.error(f"Failed to clear agent memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear agent memory.")


@router.post("/agent/status")
async def get_agent_status(
    user: dict = Depends(get_current_user),
    conversation_id: str = None,
):
    """
    Get the status of the LangChain agent for a session.

    Returns memory state and configuration.
    """
    if not settings.LANGCHAIN_ENABLED or not _langchain_available:
        return {
            "langchain_enabled": False,
            "rag_enabled": settings.RAG_ENABLED,
            "message": "LangChain agent is not enabled",
        }

    session_id = conversation_id or user["id"]

    try:
        agent = get_agent(session_id)
        memory_info = agent.get_memory_summary()

        return {
            "langchain_enabled": True,
            "rag_enabled": settings.RAG_ENABLED,
            "rag_threshold_rows": settings.RAG_THRESHOLD_ROWS,
            "memory": memory_info,
        }
    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        return {
            "langchain_enabled": True,
            "rag_enabled": settings.RAG_ENABLED,
            "error": "Failed to retrieve agent status",
        }


# ---------------------------------------------------------------------------
# RAG Endpoints
# ---------------------------------------------------------------------------

@router.post("/rag/index", response_model=RAGIndexResponse)
async def index_sheet_for_rag(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    Pre-index a sheet for faster semantic search.

    Call this when loading a large sheet (500+ rows) to prepare
    the RAG system. This is optional - RAG will auto-index on first query.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is not enabled. Set RAG_ENABLED=true in .env"
        )

    if not _langchain_available:
        raise HTTPException(
            status_code=400,
            detail="LangChain/RAG dependencies not installed"
        )

    if not request.sheet_data or "cells" not in request.sheet_data:
        raise HTTPException(status_code=400, detail="No sheet data provided")

    sheet_name = request.sheet_name or "Sheet1"

    loop = asyncio.get_running_loop()

    try:
        result = await loop.run_in_executor(
            _bg_executor,
            lambda: get_rag().index_sheet(
                request.sheet_data["cells"],
                sheet_name,
                force_reindex=request.force_refresh or False,
            )
        )

        return RAGIndexResponse(
            status=result.get("status", "unknown"),
            indexed=result.get("indexed", 0),
            collection=result.get("collection", ""),
            embedding_type=result.get("embedding_type", ""),
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"RAG indexing failed: {e}")
        return RAGIndexResponse(
            status="error",
            indexed=0,
            error=str(e),
        )


@router.post("/rag/search", response_model=RAGSearchResponse)
async def rag_search(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    k: int = Query(default=30, ge=1, le=100, description="Number of results to return"),
):
    """
    Direct semantic search on sheet data.

    Returns matching rows without running through the full agent.
    Useful for finding specific rows by meaning rather than exact keywords.

    Examples:
    - "unhappy customers" finds rows with "disappointed", "frustrated", etc.
    - "delivery problems" finds rows with "shipping delayed", "package lost"
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is not enabled. Set RAG_ENABLED=true in .env"
        )

    if not _langchain_available:
        raise HTTPException(
            status_code=400,
            detail="LangChain/RAG dependencies not installed"
        )

    if not request.sheet_data or "cells" not in request.sheet_data:
        raise HTTPException(status_code=400, detail="No sheet data provided")

    if not request.message:
        raise HTTPException(status_code=400, detail="No search query provided")

    sheet_name = request.sheet_name or "Sheet1"

    loop = asyncio.get_running_loop()

    try:
        results = await loop.run_in_executor(
            _bg_executor,
            lambda: get_rag().search(
                request.message,
                sheet_name,
                request.sheet_data["cells"],
                k=k,
            )
        )

        return RAGSearchResponse(
            query=request.message,
            results=results,
            count=len(results),
        )

    except Exception as e:
        logger.error(f"RAG search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed. Please try again.")
