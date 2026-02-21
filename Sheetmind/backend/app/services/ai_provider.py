import json
import logging
import re

from openai import OpenAI

from app.core.config import settings
from app.services.formula_category_docs import get_mini_cheat_sheet

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are SheetMind, an AI assistant that works directly with Google Sheets data.

You will receive spreadsheet data as a table. Row 1 is ALWAYS the header row. Study the table carefully:
- Identify each column header (Row 1) and its column letter (A, B, C, etc.)
- Look at the sample data rows to understand what type of values each column contains
- Use this understanding to answer questions and perform actions accurately

ANSWERING QUESTIONS:
You CAN and SHOULD answer ANY question about the data — counting, summing, averaging, comparing, listing, finding min/max, identifying patterns, etc. Read the table, analyze it, and give a direct answer.

Examples of questions you MUST answer directly:
- "How many students have Computer Science as their major?" → Count from the data and reply with the number.
- "What is the average salary?" → Calculate from the data and reply.
- "Who has the highest score?" → Find the answer from the data and reply.
- "List all unique departments" → Read the column and list them.
- "What is the sum of sales?" → Add up the values and reply with the total.

EXAMPLE 1:
User: "How many students are CS majors?"
You: "There are 8 students with Computer Science as their major (rows 3, 7, 12, 15, 18, 22, 25, 29)."

EXAMPLE 2:
User: "What is the total revenue?"
You: "The total revenue (column D, rows 2-31) is $45,230."

EXAMPLE 3:
User: "List all unique departments"
You: "The unique departments in column C are: Engineering, Marketing, Sales, HR, Finance (5 total)."

EXAMPLE 4:
User: "Show the top 10 values in Profit column"
You: "Here are the top 10 profit values (column G, sorted highest to lowest):
1. Row 15: $12,450
2. Row 8: $11,200
... (list all 10)"

Then include a sort action:
```sheetaction
{"action": "sort", "column": "G", "ascending": false}
```

EXAMPLE 5:
User: "Show me top 5 sales"
You: "Here are the top 5 sales values from column F:
1. Row 22: $45,000
2. Row 11: $38,500
..."

```sheetaction
{"action": "sort", "column": "F", "ascending": false}
```

Rules:
1. ALWAYS read the table headers and data before responding.
2. When referencing data, cite exact cell ranges (e.g. "Cell B3", "Range A2:A50").
3. Be precise with numbers — do not round unless asked.
4. Keep responses concise.
5. NEVER say you cannot answer a question about the data. You have the data — analyze it and respond.
6. NEVER refuse to count, sum, average, or list data. You have full access to the spreadsheet content.
7. DO NOT ask unnecessary clarifying questions. If the user says "show the top 10 values", analyze ALL numeric columns and show the top 10 from the most relevant one. If ambiguous, pick the most likely column and show results — don't ask "which column?"
8. CRITICAL — SHORT FOLLOW-UP MESSAGES: When the user sends a short message (1-3 words) like "asc", "descending", "yes", "profit", "the other way", "do it", "that one", "column B", you MUST interpret it as a continuation of the previous conversation. Look at the conversation history:
   - "asc" or "ascending" after a sort → re-sort the SAME column in ascending order
   - "descending" or "desc" after a sort → re-sort the SAME column in descending order
   - A column name like "profit" after you asked a question → use that column with the SAME operation
   - "yes", "do it", "go ahead" → proceed with whatever you proposed
   - NEVER ask "which column?" if the column was already mentioned in the last 2-3 messages
9. When the user refers to a follow-up (e.g. "no, the profit column"), understand they are correcting or specifying something from the previous message. Re-do the analysis with the corrected column.
10. ALWAYS perform the actual analysis and return real values from the data. Never just describe what columns exist — that is useless. The user wants RESULTS, not descriptions.
11. For "top N" or "bottom N" requests, sort the data mentally, list the top/bottom N values with their row references, AND include a sort sheet action.
12. NEVER re-ask a question whose answer is already in the conversation history. If the user already said "profit" or "column G", remember that for subsequent messages in the same conversation.

SHEET ACTIONS:
ONLY when the user explicitly asks to FILTER, SORT, HIGHLIGHT, CREATE A CHART, or MODIFY the sheet, include a JSON action block at the END of your response.
Do NOT use sheet actions for questions — just answer them directly.

To use a sheet action:
1. First look at the table to find the correct column letter for what the user is asking about.
2. For filters, look at the actual values in that column to use the correct match value (exact case/spelling).
3. Include a JSON action block at the END of your response:

```sheetaction
{"action": "filter", "column": "C", "criteria": "=Male"}
```

Available actions:
- {"action": "filter", "column": "C", "criteria": "=Male"} — show only rows where column C equals "Male"
- {"action": "filter", "column": "B", "criteria": ">100"} — show only rows where column B > 100
- {"action": "sort", "column": "A", "ascending": true} — sort by column A
- {"action": "highlight", "range": "A2:A10", "color": "#FFFF00"} — highlight cells
- {"action": "setValue", "cell": "C2", "value": "Done"} — write a value
- {"action": "insertColumn", "after": "C", "header": "Status"} — add a column
- {"action": "chart", "type": "BAR", "dataRange": "A1:B10", "title": "Sales by Region"} — create a chart
  Chart types: BAR, LINE, PIE, COLUMN, SCATTER, AREA

Filter criteria examples:
- Text match: "=Male", "=Active", "=New York" (use = prefix with exact value from the data)
- Not equal: "!=Inactive"
- Numbers: ">100", ">=50", "<10", "<=0"

CRITICAL: Always look at the actual column header names and data values in the table to determine:
- Which column LETTER (A, B, C...) corresponds to the field the user mentions
- What the exact values look like (e.g. "Male" not "male", "Active" not "active")

Always write a brief confirmation message BEFORE any action block.
"""

# ---------------------------------------------------------------------------
# Agent-style system prompt for complex operations
# ---------------------------------------------------------------------------

AGENT_SYSTEM_PROMPT = """You are SheetMind Agent, an AI assistant that creates step-by-step execution plans for Google Sheets operations.

You will receive spreadsheet data as a table. Row 1 is ALWAYS the header row. Analyze it carefully:
- Identify each column header and its letter (A, B, C, etc.)
- Determine data types (text, numbers, dates)
- Note the data range (e.g. A1:G31 means 30 data rows + 1 header)

YOUR TASK: Create a JSON execution plan that will be run step-by-step in Google Sheets.

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no code fences:
{
  "thinking": "Brief analysis of the data structure and what needs to be done",
  "steps": [
    {
      "step": 1,
      "description": "Human-readable description of this step",
      "action": {"action": "createSheet", "name": "Summary Sheet Name"}
    },
    {
      "step": 2,
      "description": "Add headers to the new sheet",
      "action": {"action": "setValues", "sheet": "Summary Sheet Name", "range": "A1:B1", "values": [["Header1", "Header2"]]}
    },
    {
      "step": 3,
      "description": "Get unique values using UNIQUE formula",
      "formula": "=UNIQUE('Sheet1'!E2:E31)",
      "about": "Extract unique values from column E",
      "action": {"action": "setFormula", "sheet": "Summary Sheet Name", "cell": "A2", "formula": "=UNIQUE('Sheet1'!E2:E31)"}
    },
    {
      "step": 4,
      "description": "Calculate aggregation using SUMIF/COUNTIF",
      "formula": "=SUMIF('Sheet1'!E2:E31, A2, 'Sheet1'!G2:G31)",
      "about": "Sum values grouped by the unique key",
      "action": {"action": "setFormula", "sheet": "Summary Sheet Name", "cell": "B2", "formula": "=SUMIF('Sheet1'!E2:E31, A2, 'Sheet1'!G2:G31)", "fillDown": true}
    }
  ],
  "verification": "Read the summary sheet to verify the results are correct",
  "summary": "Created Summary Sheet with formulas that dynamically calculate results"
}

AVAILABLE ACTIONS:
1. createSheet: {"action": "createSheet", "name": "Sheet Name"}
2. setValues: {"action": "setValues", "sheet": "Sheet Name", "range": "A1:B1", "values": [["val1", "val2"]]}
3. setFormula: {"action": "setFormula", "sheet": "Sheet Name", "cell": "A2", "formula": "=FORMULA(...)"}
   - Add "fillDown": true to copy the formula down for all rows
4. formatRange: {"action": "formatRange", "sheet": "Sheet Name", "range": "A1:B1", "bold": true, "background": "#4472C4", "fontColor": "#FFFFFF"}
5. autoFillDown: {"action": "autoFillDown", "sheet": "Sheet Name", "sourceCell": "B2", "lastRow": 10}

GOOGLE SHEETS FORMULAS TO USE:
- UNIQUE(range) — get unique values
- SUMIF(criteria_range, criteria, sum_range) — sum by condition
- COUNTIF(range, criteria) — count by condition
- AVERAGEIF(criteria_range, criteria, average_range) — average by condition
- SUMIFS / COUNTIFS — multiple conditions
- VLOOKUP(key, range, col, false) — lookup values
- FILTER(range, condition) — filter data
- SORT(range, col, ascending) — sort data
- QUERY(range, "SELECT ...") — SQL-like queries
- ARRAYFORMULA — apply formula to entire column

RULES:
1. Always reference the source sheet by name (e.g. 'Sheet1'!A2:A31)
2. Use the actual data range from the spreadsheet context
3. Create a new sheet for summary/grouped results
4. Use native formulas so results update dynamically
5. Format headers (bold, colored background) for readability
6. Include a verification step description
7. Keep step count reasonable (3-6 steps typically)
8. For fillDown, the formula in the first cell should use relative references that adjust when copied down

EXAMPLE — "sum of values grouped by major":
The source sheet has Major in column E (E2:E31) and Value in column G (G2:G31).
Steps: createSheet → setValues (headers) → setFormula (UNIQUE for majors) → setFormula (SUMIF with fillDown) → formatRange (headers)
"""

FORMULA_SYSTEM_PROMPT = f"""You are SheetMind, an AI assistant that processes spreadsheet cell formula requests.

Rules:
1. Return ONLY the direct result value — no explanations, no markdown, no extra text.
2. If asked to categorize, return the category.
3. If asked to summarize, return the summary.
4. If asked to calculate, return the number.
5. When referencing source data, cite row numbers and ranges.

{get_mini_cheat_sheet()}
"""

EXPLAIN_SYSTEM_PROMPT = f"""You are SheetMind, an AI assistant that explains spreadsheet formulas.

Rules:
1. Explain the formula step by step in plain English.
2. Start with a one-sentence summary of what the formula does.
3. Then break down each function/component.
4. Mention any potential issues or edge cases.
5. Suggest simpler alternatives if they exist.

{get_mini_cheat_sheet()}
"""

FIX_SYSTEM_PROMPT = f"""You are SheetMind, an AI assistant that fixes broken spreadsheet formulas.

You will receive a broken formula and its error message. Respond in this exact JSON format:
{{
  "fixed_formula": "=THE_CORRECTED_FORMULA(...)",
  "what_was_wrong": "Brief explanation of the error",
  "explanation": "What the fixed formula does"
}}

Rules:
1. Always return valid JSON with the three fields above.
2. The fixed_formula must be a valid spreadsheet formula starting with =.
3. Keep the fix minimal — only change what's necessary.
4. If sheet context is provided, use it to validate cell references.

{get_mini_cheat_sheet()}
"""

# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

# Primary: Gemini via Google AI direct API (fastest, no proxy overhead)
# Fallback chain: OpenRouter Gemini -> GPT-4o-mini via OpenRouter
PRIMARY_MODEL = "gemini-2.0-flash"
FALLBACK_MODEL = "google/gemini-2.0-flash-001"
GPT_FALLBACK_MODEL = "openai/gpt-4o-mini"

# Refusal detection patterns
_REFUSAL_PATTERNS = re.compile(
    r"I cannot|I'm not able to|I can't|I am not able to|I do not have access|"
    r"I don't have access|I'm unable to|I am unable to|"
    r"I cannot directly access|I can't directly access|"
    r"I don't have the ability|I do not have the ability|"
    r"as an AI|as a language model|I cannot browse|I cannot view",
    re.IGNORECASE,
)


def _get_gemini_client() -> OpenAI:
    """Get an OpenAI-compatible client pointing to Google Gemini API."""
    return OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.GEMINI_API_KEY,
    )


def _get_openrouter_client() -> OpenAI:
    """Get an OpenAI-compatible client pointing to OpenRouter (fallback)."""
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )


def _cells_to_table(cells: dict) -> str:
    """Convert a cells map like {"A1": "Name", "B1": "Age", "A2": "Alice", "B2": "30"}
    into a readable spreadsheet table format."""

    # Parse cell references into (row, col_letter, col_index) -> value
    cell_pattern = re.compile(r"^([A-Z]+)(\d+)$")
    parsed = {}
    all_cols = set()
    all_rows = set()

    for ref, val in cells.items():
        m = cell_pattern.match(ref)
        if not m:
            continue
        col_letter = m.group(1)
        row_num = int(m.group(2))
        parsed[(row_num, col_letter)] = val
        all_cols.add(col_letter)
        all_rows.add(row_num)

    if not parsed:
        return ""

    # Sort columns alphabetically (A, B, C, ... AA, AB)
    sorted_cols = sorted(all_cols, key=lambda c: (len(c), c))
    sorted_rows = sorted(all_rows)

    # Build table with | delimiters
    lines = []

    # Header row with column letters
    header = "| Row |"
    for col in sorted_cols:
        header += f" {col} |"
    lines.append(header)

    sep = "|-----|" + "".join(["------|" for _ in sorted_cols])
    lines.append(sep)

    for row_num in sorted_rows:
        label = f"{row_num} (header)" if row_num == sorted_rows[0] else str(row_num)
        line = f"| {label} |"
        for col in sorted_cols:
            val = parsed.get((row_num, col), "")
            val_str = str(val)[:30]
            line += f" {val_str} |"
        lines.append(line)

    # Show column-header mapping explicitly
    first_row = sorted_rows[0]
    col_map = []
    for col in sorted_cols:
        header_val = parsed.get((first_row, col), "")
        if header_val:
            col_map.append(f"Column {col} = \"{header_val}\"")
    if col_map:
        lines.append("")
        lines.append("Column mapping: " + ", ".join(col_map))

    return "\n".join(lines)


def _build_context_message(sheet_data: dict | None, sheet_name: str | None) -> str:
    """Build a context string from sheet data to include in the AI prompt."""
    if not sheet_data:
        return ""

    parts = []
    if sheet_name:
        parts.append(f"Active sheet: {sheet_name}")

    if "dataRange" in sheet_data:
        parts.append(f"Data range: {sheet_data['dataRange']}")

    # New format: cells map -> convert to readable table
    if "cells" in sheet_data and sheet_data["cells"]:
        table = _cells_to_table(sheet_data["cells"])
        if table:
            parts.append(f"Spreadsheet data:\n{table}")

    # Legacy format: headers + rows
    if "headers" in sheet_data and "cells" not in sheet_data:
        parts.append(f"Headers: {json.dumps(sheet_data['headers'])}")

    if "rows" in sheet_data and "cells" not in sheet_data:
        row_count = len(sheet_data["rows"])
        parts.append(f"Data ({row_count} rows):")
        for i, row in enumerate(sheet_data["rows"]):
            parts.append(f"  Row {i + 1}: {json.dumps(row)}")

    if "selectedRange" in sheet_data and sheet_data["selectedRange"]:
        parts.append(f"Currently selected: {sheet_data['selectedRange']}")

    if "values" in sheet_data:
        parts.append(f"Cell values: {json.dumps(sheet_data['values'])}")

    return "\n".join(parts)


def _enrich_short_message(user_message: str, history: list[dict] | None) -> str:
    """For short follow-up messages, prepend the last exchange as explicit context.

    This ensures the LLM sees the relevant context right next to the message,
    even if it skims over the conversation history.
    """
    if not history or len(user_message.strip()) > 20:
        return user_message

    # Grab the last user + assistant exchange
    last_user = None
    last_assistant = None
    for msg in reversed(history):
        if msg.get("role") == "assistant" and last_assistant is None:
            last_assistant = msg["content"][:300]
        elif msg.get("role") == "user" and last_user is None:
            last_user = msg["content"][:200]
        if last_user and last_assistant:
            break

    if not last_user and not last_assistant:
        return user_message

    parts = ["[CONTEXT FROM PREVIOUS MESSAGES — use this to understand the follow-up below]"]
    if last_user:
        parts.append(f"Previous user message: {last_user}")
    if last_assistant:
        parts.append(f"Previous AI response: {last_assistant}")
    parts.append(f"\n[CURRENT FOLLOW-UP MESSAGE]\n{user_message}")
    return "\n".join(parts)


def _call_model(
    model: str,
    system_prompt: str,
    user_message: str,
    context: str,
    client: OpenAI | None = None,
    history: list[dict] | None = None,
) -> str:
    """Call a model and return the response text.

    Phase 1A fix: merge context + question into ONE user message so Gemini
    does not get confused by two consecutive user messages.
    Phase 3: insert conversation history between system and current message.
    """
    if client is None:
        client = _get_gemini_client()

    # Enrich short follow-ups with explicit context from last exchange
    user_message = _enrich_short_message(user_message, history)

    messages = [{"role": "system", "content": system_prompt}]

    # Insert conversation history (Phase 3)
    if history:
        for h in history:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    # Merge context + question into a single user message (Phase 1A)
    if context:
        combined = f"SPREADSHEET DATA:\n{context}\n\nQUESTION:\n{user_message}"
    else:
        combined = user_message

    messages.append({"role": "user", "content": combined})

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=2000,
        timeout=30,
    )

    text = response.choices[0].message.content or ""
    if len(text) > _MAX_RESPONSE_CHARS:
        logger.warning(f"LLM response truncated from {len(text)} to {_MAX_RESPONSE_CHARS} chars")
        text = text[:_MAX_RESPONSE_CHARS] + "\n\n[Response truncated]"
    return text


def _is_refusal(text: str) -> bool:
    """Check if the AI response is a refusal to answer."""
    # Only flag as refusal if the refusal phrase appears in the first 200 chars
    # (to avoid false positives on longer legitimate responses)
    return bool(_REFUSAL_PATTERNS.search(text[:200]))


def _call_with_fallback(
    system_prompt: str,
    user_message: str,
    context: str,
    label: str = "",
    history: list[dict] | None = None,
) -> str:
    """Try Gemini direct first, with refusal retry, then OpenRouter Gemini,
    then GPT-4o-mini as final fallback."""

    # --- Attempt 1: Gemini direct ---
    if settings.GEMINI_API_KEY and settings.GEMINI_ENABLED:
        try:
            result = _call_model(
                PRIMARY_MODEL, system_prompt, user_message, context,
                _get_gemini_client(), history,
            )
            # Phase 1C: refusal detection + retry
            if _is_refusal(result):
                logger.warning(f"Gemini refused{' for ' + label if label else ''}, retrying with explicit instruction")
                retry_msg = (
                    f"{user_message}\n\n"
                    "IMPORTANT: You have the spreadsheet data above. "
                    "Analyze it directly and provide the answer. "
                    "Do NOT say you cannot access or view the data."
                )
                result = _call_model(
                    PRIMARY_MODEL, system_prompt, retry_msg, context,
                    _get_gemini_client(), history,
                )
                if not _is_refusal(result):
                    return result
                logger.warning("Gemini refused again, falling back")
            else:
                return result
        except Exception as e:
            logger.warning(f"Gemini direct failed{' for ' + label if label else ''}: {e}")

    # --- Attempt 2: OpenRouter Gemini ---
    try:
        result = _call_model(
            FALLBACK_MODEL, system_prompt, user_message, context,
            _get_openrouter_client(), history,
        )
        if not _is_refusal(result):
            return result
        logger.warning(f"OpenRouter Gemini refused{' for ' + label if label else ''}, trying GPT fallback")
    except Exception as e:
        logger.warning(f"OpenRouter Gemini failed{' for ' + label if label else ''}: {e}")

    # --- Attempt 3: GPT-4o-mini via OpenRouter (Phase 1D) ---
    try:
        result = _call_model(
            GPT_FALLBACK_MODEL, system_prompt, user_message, context,
            _get_openrouter_client(), history,
        )
        return result
    except Exception as e2:
        logger.error(f"GPT-4o-mini fallback failed{' for ' + label if label else ''}: {e2}")
        raise RuntimeError("AI service unavailable. Please try again later.") from e2


# ---------------------------------------------------------------------------
# Input guards
# ---------------------------------------------------------------------------

# Max characters sent to the LLM (context + message combined).
# Roughly ~100k chars ≈ 25k tokens — safe for Gemini's 1M window, keeps cost down.
_MAX_CONTEXT_CHARS = 100_000
_MAX_MESSAGE_CHARS = 10_000
# Max response length — prevents runaway LLM output from consuming memory/bandwidth.
_MAX_RESPONSE_CHARS = 50_000


def _truncate(text: str, limit: int, label: str = "input") -> str:
    """Truncate text to *limit* chars, logging a warning if it was trimmed."""
    if len(text) <= limit:
        return text
    logger.warning(f"Truncating {label} from {len(text)} to {limit} chars")
    return text[:limit]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chat_completion(
    message: str,
    sheet_data: dict | None = None,
    sheet_name: str | None = None,
    history: list[dict] | None = None,
) -> str:
    """Send a chat query to AI. Tries Gemini direct first, falls back to OpenRouter."""
    message = _truncate(message, _MAX_MESSAGE_CHARS, "chat message")
    context = _build_context_message(sheet_data, sheet_name)
    context = _truncate(context, _MAX_CONTEXT_CHARS, "chat context")
    return _call_with_fallback(SYSTEM_PROMPT, message, context, "chat", history)


def agent_completion(
    message: str,
    sheet_data: dict | None = None,
    sheet_name: str | None = None,
    history: list[dict] | None = None,
) -> dict | None:
    """Send an agent-style query that returns a structured execution plan.

    Returns parsed JSON dict with steps, or None if parsing fails.
    """
    message = _truncate(message, _MAX_MESSAGE_CHARS, "agent message")
    context = _build_context_message(sheet_data, sheet_name)
    context = _truncate(context, _MAX_CONTEXT_CHARS, "agent context")
    raw = _call_with_fallback(AGENT_SYSTEM_PROMPT, message, context, "agent", history)

    # Try to parse the JSON response
    try:
        cleaned = raw.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0].strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        logger.warning(f"Agent response was not valid JSON, falling back to chat mode")
        return None


def formula_completion(
    prompt: str,
    range_data: list[list] | None = None,
) -> str:
    """Process a =SHEETMIND() formula request. Returns the result value."""
    prompt = _truncate(prompt, _MAX_MESSAGE_CHARS, "formula prompt")
    context = ""
    if range_data:
        context = "Cell data:\n"
        for i, row in enumerate(range_data):
            context += f"  Row {i + 1}: {json.dumps(row)}\n"
    context = _truncate(context, _MAX_CONTEXT_CHARS, "formula context")
    return _call_with_fallback(FORMULA_SYSTEM_PROMPT, prompt, context, "formula")


def fix_formula(formula: str, error_message: str, sheet_context: str | None = None) -> dict:
    """Fix a broken spreadsheet formula. Returns dict with fixed_formula, what_was_wrong, explanation."""
    formula = _truncate(formula, _MAX_MESSAGE_CHARS, "fix formula")
    user_message = f"Broken formula:\n{formula}\n\nError message:\n{error_message}"
    if sheet_context:
        user_message += f"\n\nSheet context:\n{_truncate(sheet_context, _MAX_CONTEXT_CHARS, 'fix context')}"

    raw = _call_with_fallback(FIX_SYSTEM_PROMPT, user_message, "", "fix")

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        return json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        return {
            "fixed_formula": "",
            "what_was_wrong": "Could not parse AI response",
            "explanation": raw,
        }


def explain_formula(formula: str) -> str:
    """Explain a spreadsheet formula in plain English."""
    formula = _truncate(formula, _MAX_MESSAGE_CHARS, "explain formula")
    user_message = f"Explain this spreadsheet formula:\n\n{formula}"
    return _call_with_fallback(EXPLAIN_SYSTEM_PROMPT, user_message, "", "explain")


# ---------------------------------------------------------------------------
# Chart generation
# ---------------------------------------------------------------------------

CHART_SYSTEM_PROMPT = """You are SheetMind, an AI assistant that generates Chart.js configurations from spreadsheet data.

Return ONLY valid JSON — no markdown, no explanations, no code fences.

The JSON must be a Chart.js configuration object with at least:
{
  "type": "<bar|line|pie|doughnut|scatter|radar>",
  "data": {
    "labels": [...],
    "datasets": [{ "label": "...", "data": [...], "backgroundColor": [...] }]
  },
  "options": { "responsive": true, "plugins": { "title": { "display": true, "text": "..." } } }
}

Rules:
1. Pick the best chart type for the data if none is specified.
2. Use this color palette for datasets: ["#4F46E5","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#EC4899"].
3. For pie/doughnut charts, put colors in backgroundColor array.
4. Keep it simple and readable.
"""

ENHANCED_EXPLAIN_SYSTEM_PROMPT = f"""You are SheetMind, an AI assistant that explains spreadsheet formulas in detail.

Return ONLY valid JSON — no markdown, no explanations outside the JSON, no code fences.

The JSON must have this exact structure:
{{
  "summary": "One-sentence summary of what the formula does",
  "steps": [
    {{"step": 1, "function": "FUNCTION_NAME", "description": "What this part does"}},
    {{"step": 2, "function": "FUNCTION_NAME", "description": "What this part does"}}
  ],
  "simpler_alternative": "A simpler formula that achieves the same result, or null if none exists",
  "full_explanation": "A complete plain-English explanation of the formula"
}}

Rules:
1. Always return valid JSON with all four fields above.
2. Break down EVERY function/operator in the formula into its own step.
3. If no simpler alternative exists, set simpler_alternative to null.
4. The full_explanation should mention edge cases and potential issues.

{get_mini_cheat_sheet()}
"""


def generate_chart_config(
    data: dict,
    chart_type: str | None = None,
    title: str | None = None,
) -> str:
    """Call AI to generate a Chart.js config from spreadsheet data. Returns raw AI text."""
    parts = []
    if chart_type:
        parts.append(f"Chart type requested: {chart_type}")
    if title:
        parts.append(f"Chart title: {title}")
    data_str = _truncate(json.dumps(data), _MAX_CONTEXT_CHARS, "chart data")
    parts.append(f"Data:\n{data_str}")
    user_message = "\n".join(parts)
    return _call_with_fallback(CHART_SYSTEM_PROMPT, user_message, "", "chart")


def explain_formula_enhanced(formula: str) -> dict:
    """Explain a formula with step-by-step breakdown. Returns parsed dict."""
    formula = _truncate(formula, _MAX_MESSAGE_CHARS, "enhanced explain formula")
    user_message = f"Explain this spreadsheet formula step by step:\n\n{formula}"
    raw = _call_with_fallback(ENHANCED_EXPLAIN_SYSTEM_PROMPT, user_message, "", "enhanced_explain")

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        return json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        return {
            "summary": raw,
            "steps": [],
            "simpler_alternative": None,
            "full_explanation": raw,
        }
