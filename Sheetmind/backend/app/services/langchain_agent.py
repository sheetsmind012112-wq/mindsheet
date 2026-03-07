"""
LangChain ReAct Agent with Memory for SheetMind.

This module provides:
- ReAct agent that reasons and acts with tools
- Conversation memory (per conversation_id)
- Integration with RAG for large sheets
- Session management for multiple users
- Pre-processing layer with sheet metadata analysis
"""

import logging
import threading
import time
from typing import Dict, List, Optional, Any

from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.services.langchain_tools import (
    ALL_TOOLS,
    get_pending_actions,
    set_sheet_context,
    clear_pending_actions,
    verify_actions,
)
from app.services.rag_system import get_rag
from app.services.sheet_analyzer import analyze_sheet, format_metadata_for_prompt, SheetMetadata
from app.services.formula_patterns import get_all_patterns_summary
from app.services.formula_category_docs import (
    classify_formula_intent, get_category_docs, get_mini_cheat_sheet
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ReAct Prompt Template
# ---------------------------------------------------------------------------

REACT_PROMPT = PromptTemplate.from_template("""You are SheetMind, an intelligent AI assistant that helps users work with Google Sheets.

**YOUR PRIMARY JOB IS TO CREATE SHEETS AND FORMULAS, NOT JUST ANSWER IN TEXT.**

When users ask for grouped summaries (sum by X, count by Y, etc.), you MUST:
1. Create a new summary sheet
2. Add UNIQUE formula for categories
3. Add SUMIF/COUNTIF formulas for aggregation
4. DO NOT just calculate and return text answers

You have access to tools that let you read sheet data and create execution plans.

AVAILABLE TOOLS:
{tools}

=== PRE-ANALYZED SHEET METADATA ===
{sheet_metadata}

CRITICAL VALUES FROM METADATA (DO NOT GUESS THESE):
- Sheet name: '{sheet_name}'
- Last row with data: {last_row}
- Columns good for grouping (categorical): {group_columns}
- Columns good for SUM/AVG (numeric): {numeric_columns}

**MANDATORY: NEVER assume column positions.**
- The metadata above shows EXACTLY which columns contain what data
- Column A is NOT always the grouping column — CHECK the metadata
- Column B is NOT always the value column — CHECK the metadata
- Use the "Good for grouping" and "Good for SUM/AVG" columns listed above
- If unsure, call get_headers first to verify column layout

CURRENT SPREADSHEET CONTEXT:
{sheet_context}

CONVERSATION HISTORY:
{chat_history}

IMPORTANT INSTRUCTIONS:

**CRITICAL: Before writing ANY aggregation formula (SUMIF, COUNTIF, SUMPRODUCT, etc.), call lookup_formula first to get the correct pattern and avoid common mistakes.**
Example: lookup_formula("sum of price times quantity by region")

**WARNING: NEVER use fillDown=true with UNIQUE formulas! UNIQUE auto-spills and fillDown will cause errors.**

1. USE THE METADATA ABOVE - it already tells you column types, row counts, and statistics
2. The lastRow value ({last_row}) is PRE-CALCULATED - use it directly, don't guess
3. UNIQUE formulas AUTOMATICALLY SPILL DOWN - NEVER use fillDown=true with them
   - For aggregation formulas (SUMIF/COUNTIF), use autoFillDown with lastRow = 1 + uniqueCount
4. Always use the exact sheet name '{sheet_name}' - never hardcode 'Sheet1'
5. Format headers using format_headers for professional appearance
6. Understand pronoun references from conversation history
7. SUMIF sum_range CANNOT have arithmetic - use SUMPRODUCT instead
8. Never use full column refs (A:A) - use A2:A{{last_row}}
9. UNIQUE/FILTER auto-spill - never use fillDown with them

{mini_cheat_sheet}

DETAILED FORMULA PATTERNS (call lookup_formula for full guidance):
{formula_patterns_summary}

{category_formula_docs}

RESPONSE FORMAT - You must follow this exact format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (see examples below)
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

ACTION INPUT EXAMPLES:
- get_chart_range: "B" (ALWAYS call before create_chart to get startRow/endRow!)
- lookup_formula: "sum by category" (ALWAYS call before set_formula for aggregations!)
- get_headers: (no input needed)
- get_column_values: "A"
- count_rows: (no input needed)
- create_sheet: "Summary"
- set_values: {{"sheet": "Summary", "range": "A1:B1", "values": [["Major", "Total"]]}}
- format_headers: {{"sheet": "Summary", "range": "A1:B1"}}
- set_formula: {{"sheet": "Summary", "cell": "A2", "formula": "=UNIQUE('Sheet1'!B2:B31)"}}
- insert_column: {{"after": "E", "header": "Total Sales"}}
- set_cell_value: {{"cell": "F2", "value": "=D2+E2"}}
- create_chart: {{"type": "bar", "title": "Title", "dataSheet": "Summary", "labelColumn": "A", "valueColumn": "B", "startRow": 2, "endRow": 3}}
- conditional_format: {{"sheet": "{sheet_name}", "range": "D2:D{last_row}", "type": "comparison", "operator": "greaterThan", "value": 1000, "background": "#FF0000", "fontColor": "#FFFFFF"}}

INSERTING COLUMNS AND SETTING VALUES ON ACTIVE SHEET:
When adding new calculated columns to the CURRENT/ACTIVE sheet:
Step 1: insert_column to add the column (e.g., {{"after": "E", "header": "Total"}})
Step 2: set_cell_value for the formula in the first data row (e.g., {{"cell": "F2", "value": "=D2+E2"}})
Step 3: Use auto_fill_down to fill the formula down (e.g., {{"sheet": "{sheet_name}", "sourceCell": "F2", "lastRow": {last_row}}})

GROUPED SUMMARY WITH CHART WORKFLOW:
Step 1: lookup_formula("sum by category") to get the correct formula pattern
Step 2: get_chart_range on the GROUP BY column (e.g., "B") - returns startRow, endRow, fillDownLastRow
Step 3: create_sheet("Summary")
Step 4: set_values for headers
Step 5: set_formula for UNIQUE (NO fillDown!): {{"sheet": "Summary", "cell": "A2", "formula": "=UNIQUE('{sheet_name}'!B2:B{last_row})"}}
Step 6: set_formula for SUMIF: {{"sheet": "Summary", "cell": "B2", "formula": "=SUMIF('{sheet_name}'!B2:B{last_row}, A2, '{sheet_name}'!G2:G{last_row})"}}
Step 7: autoFillDown: {{"sheet": "Summary", "sourceCell": "B2", "lastRow": fillDownLastRow}}
Step 8: create_chart using startRow and endRow from get_chart_range

CRITICAL FOR CHARTS:
- ALWAYS call get_chart_range on the grouping column to get startRow and endRow
- Use the returned values directly in create_chart
- Use fillDownLastRow for autoFillDown

CHART TYPES: bar, line, pie, doughnut, scatter
When user asks for a chart/graph/visualization, ALWAYS use create_chart tool after preparing the data.

CONDITIONAL FORMATTING WORKFLOW:
When user asks to highlight, color, or conditionally format cells:
Step 1: ALWAYS call get_headers first to identify the correct column letter for the data the user mentions
Step 2: Use the sheet metadata to get the last row ({{last_row}})
Step 3: Build the range as "X2:X{{last_row}}" where X is the correct column letter from Step 1 (skip header row 1)
Step 4: Call conditional_format with the correct range, type, operator, value, and colors
Example — "highlight sales above 1000 in red":
  - get_headers → find that "Sales" is in column D
  - conditional_format: {{"sheet": "'{sheet_name}'", "range": "D2:D{{last_row}}", "type": "comparison", "operator": "greaterThan", "value": 1000, "background": "#FF0000", "fontColor": "#FFFFFF"}}
Example — "color scale on GPA column":
  - get_headers → find that "GPA" is in column E
  - conditional_format: {{"sheet": "'{sheet_name}'", "range": "E2:E{{last_row}}", "type": "colorScale", "colorScaleMin": "#FF0000", "colorScaleMax": "#00FF00"}}

CRITICAL FOR CONDITIONAL FORMATTING:
- NEVER guess column letters — always call get_headers first to find the right column
- Use the actual sheet name '{sheet_name}', not "Sheet1"
- Range must be "ColumnLetter2:ColumnLetterN" (skip header row 1, end at last_row)
- For number comparisons, value must be a number not a string
- Always include background color — without it the rule has no visible effect

Begin!

Question: {input}
{agent_scratchpad}""")


# ---------------------------------------------------------------------------
# SheetMindAgent Class
# ---------------------------------------------------------------------------

class SheetMindAgent:
    """ReAct agent with conversation memory for spreadsheet operations."""

    def __init__(self, session_id: str = "default"):
        """
        Initialize the agent.

        Args:
            session_id: Unique ID for this session (usually conversation_id)
        """
        self.session_id = session_id
        self.created_at = time.time()
        self.last_used_at = time.time()

        # Initialize LLM (using OpenRouter Gemini since GEMINI_ENABLED=false)
        if settings.GEMINI_ENABLED and settings.GEMINI_API_KEY:
            # Use direct Gemini API
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.2,
                max_output_tokens=2048,
            )
            self._llm_source = "gemini_direct"
        else:
            # Use OpenRouter — Arcee Trinity (free) as primary
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                model="arcee-ai/trinity-large-preview:free",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.2,
                max_tokens=2048,
            )
            self._llm_source = "openrouter_arcee"
            # Gemini fallback LLM (used if primary fails)
            self._fallback_llm = ChatOpenAI(
                model="google/gemini-2.0-flash-001",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.2,
                max_tokens=2048,
            )

        # Conversation memory (remembers last N exchanges)
        self.memory = ConversationBufferWindowMemory(
            k=settings.MEMORY_WINDOW_SIZE,
            memory_key="chat_history",
            return_messages=False,
            input_key="input",
            output_key="output",
        )

        # Create ReAct agent
        self.agent = create_react_agent(
            llm=self.llm,
            tools=ALL_TOOLS,
            prompt=REACT_PROMPT,
        )

        # Executor with error handling
        self.executor = AgentExecutor(
            agent=self.agent,
            tools=ALL_TOOLS,
            memory=self.memory,
            verbose=settings.DEBUG,
            max_iterations=15,  # Increased to allow chart creation after summary
            max_execution_time=60,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
        )

        logger.info(f"Created SheetMindAgent for session {session_id} using {self._llm_source}")

    def run(
        self,
        message: str,
        sheet_data: Optional[Dict] = None,
        sheet_name: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Run the agent with a user message.

        Args:
            message: User's question or command
            sheet_data: Sheet context with cells dict
            sheet_name: Name of the active sheet

        Returns:
            Dict with:
                - response: str (final answer)
                - actions: List[dict] (pending actions for frontend)
                - reasoning: List[dict] (reasoning steps)
                - rows_used: List[int] (row numbers used via RAG)
                - used_rag: bool (whether RAG was used)
                - timing: dict (performance metrics)
                - metadata: dict (sheet metadata from pre-processing)
        """
        start_time = time.time()
        timing = {}

        # Clear any leftover pending actions
        clear_pending_actions()

        # Set context for tools
        context_str = "No spreadsheet data available."
        rows_used = []
        used_rag = False
        metadata: Optional[SheetMetadata] = None
        metadata_str = "No sheet data available for analysis."
        effective_sheet_name = sheet_name or "Sheet1"
        last_row = 1
        group_columns = "None detected"
        numeric_columns = "None detected"

        if sheet_data and "cells" in sheet_data:
            cells = sheet_data["cells"]

            # === PRE-PROCESSING LAYER ===
            # Analyze sheet structure BEFORE agent runs
            analysis_start = time.time()
            metadata = analyze_sheet(cells, effective_sheet_name)
            timing["analysis_ms"] = int((time.time() - analysis_start) * 1000)

            # Extract key values for prompt
            last_row = metadata.last_row
            effective_sheet_name = metadata.sheet_name

            # Format group and numeric columns with headers for better context
            if metadata.suggested_group_by:
                group_cols_with_headers = []
                for col_letter in metadata.suggested_group_by:
                    col = next((c for c in metadata.columns if c.letter == col_letter), None)
                    if col:
                        group_cols_with_headers.append(f"{col_letter} ({col.header})")
                    else:
                        group_cols_with_headers.append(col_letter)
                group_columns = ", ".join(group_cols_with_headers)
            else:
                group_columns = "None detected"

            if metadata.suggested_aggregate:
                num_cols_with_headers = []
                for col_letter in metadata.suggested_aggregate:
                    col = next((c for c in metadata.columns if c.letter == col_letter), None)
                    if col:
                        num_cols_with_headers.append(f"{col_letter} ({col.header})")
                    else:
                        num_cols_with_headers.append(col_letter)
                numeric_columns = ", ".join(num_cols_with_headers)
            else:
                numeric_columns = "None detected"

            # Format metadata for prompt
            metadata_str = format_metadata_for_prompt(metadata)

            logger.info(f"Sheet analysis: {metadata.total_rows} rows, last_row={last_row}, "
                       f"group_by={metadata.suggested_group_by}, aggregate={metadata.suggested_aggregate}")

            # Set tool context
            set_sheet_context({
                "cells": cells,
                "sheetName": effective_sheet_name,
                "dataRange": sheet_data.get("dataRange", ""),
                "metadata": metadata.to_dict(),  # Include metadata in tool context
            })

            # Use RAG for large sheets
            if settings.RAG_ENABLED:
                rag_start = time.time()
                rag = get_rag()
                context_str, rows_used, used_rag = rag.get_context_for_query(
                    message, cells, effective_sheet_name
                )
                timing["rag_ms"] = int((time.time() - rag_start) * 1000)
            else:
                # Format context without RAG
                context_str = self._format_basic_context(sheet_data, effective_sheet_name)

        # Pre-populate memory from DB history when agent is fresh/evicted
        if history and not self.memory.chat_memory.messages:
            pairs = []
            for msg in history:
                if msg["role"] == "user":
                    pairs.append({"user": msg["content"], "assistant": None})
                elif msg["role"] == "assistant" and pairs and pairs[-1]["assistant"] is None:
                    pairs[-1]["assistant"] = msg["content"]
            for pair in pairs:
                if pair["assistant"] is not None:
                    self.add_to_memory(pair["user"], pair["assistant"])
            if pairs:
                logger.info(f"Pre-populated memory with {len(pairs)} exchanges from DB history")

        # Classify formula intent for dynamic category docs injection
        detected_categories = classify_formula_intent(message)
        category_docs = get_category_docs(detected_categories) if detected_categories else ""

        invoke_input = {
            "input": message,
            "sheet_context": context_str,
            "sheet_metadata": metadata_str,
            "sheet_name": effective_sheet_name,
            "last_row": str(last_row),
            "group_columns": group_columns,
            "numeric_columns": numeric_columns,
            "formula_patterns_summary": get_all_patterns_summary(),
            "mini_cheat_sheet": get_mini_cheat_sheet(),
            "category_formula_docs": category_docs,
        }

        try:
            # Run the agent — try primary LLM, fall back to Gemini if available
            agent_start = time.time()
            try:
                result = self.executor.invoke(invoke_input)
            except Exception as primary_err:
                if hasattr(self, '_fallback_llm'):
                    logger.warning(
                        f"Primary LLM ({self._llm_source}) failed: {primary_err}, "
                        f"retrying with Gemini fallback"
                    )
                    clear_pending_actions()
                    self.agent = create_react_agent(
                        llm=self._fallback_llm,
                        tools=ALL_TOOLS,
                        prompt=REACT_PROMPT,
                    )
                    self.executor = AgentExecutor(
                        agent=self.agent,
                        tools=ALL_TOOLS,
                        memory=self.memory,
                        verbose=settings.DEBUG,
                        max_iterations=15,
                        max_execution_time=60,
                        handle_parsing_errors=True,
                        return_intermediate_steps=True,
                    )
                    self._llm_source = "openrouter_gemini_fallback"
                    result = self.executor.invoke(invoke_input)
                    timing["used_fallback"] = True
                else:
                    raise
            timing["agent_ms"] = int((time.time() - agent_start) * 1000)

            # Extract reasoning steps from intermediate_steps
            reasoning = []
            for i, (action, observation) in enumerate(result.get("intermediate_steps", [])):
                # Parse thought from action log
                thought = ""
                if hasattr(action, 'log'):
                    log_parts = action.log.split('Action:')
                    if log_parts:
                        thought = log_parts[0].replace('Thought:', '').strip()

                reasoning.append({
                    "step": i + 1,
                    "thought": thought,
                    "tool": action.tool,
                    "tool_input": str(action.tool_input)[:200],  # Truncate long inputs
                    "result": str(observation)[:500],  # Truncate long results
                })

            # Verify and fix actions before returning
            verification = verify_actions()
            logger.info(f"Action verification: {verification['verification']} - "
                       f"{verification['total_actions']} actions, {verification['issues_found']} issues")
            if verification['fixes_applied']:
                logger.info(f"Auto-fixes applied: {verification['fixes_applied']}")

            # Get pending actions queued by tools (after verification/fixes)
            actions = get_pending_actions()

            timing["total_ms"] = int((time.time() - start_time) * 1000)

            return {
                "response": result["output"],
                "actions": actions,
                "reasoning": reasoning,
                "rows_used": rows_used,
                "used_rag": used_rag,
                "timing": timing,
                "llm_source": self._llm_source,
                "metadata": metadata.to_dict() if metadata else None,
                "verification": verification,  # Include verification results
            }

        except Exception as e:
            elapsed = time.time() - start_time
            error_str = str(e)

            # Distinguish timeout/iteration limits from other errors
            if elapsed >= 58:  # Close to max_execution_time=60
                logger.error(f"Agent TIMEOUT for session {self.session_id} after {elapsed:.1f}s: {e}")
                user_msg = "This request took too long. Try a simpler question or smaller dataset."
            elif "max iterations" in error_str.lower() or "iteration limit" in error_str.lower():
                logger.error(f"Agent hit MAX ITERATIONS for session {self.session_id}: {e}")
                user_msg = "This request was too complex. Try breaking it into smaller steps."
            else:
                logger.error(f"Agent error for session {self.session_id}: {e}", exc_info=True)
                user_msg = "I encountered an error while processing your request. Please try rephrasing or simplifying your question."

            timing["total_ms"] = int(elapsed * 1000)
            timing["error"] = error_str

            return {
                "response": user_msg,
                "actions": [],
                "reasoning": [],
                "rows_used": [],
                "used_rag": used_rag,
                "timing": timing,
                "error": error_str,
            }

    def _format_basic_context(self, sheet_data: Dict, sheet_name: str) -> str:
        """Format sheet data as basic context (without RAG)."""
        parts = [f"Sheet: {sheet_name}"]

        if "dataRange" in sheet_data:
            parts.append(f"Data range: {sheet_data['dataRange']}")

        cells = sheet_data.get("cells", {})
        if cells:
            # Count rows and columns
            rows = set()
            cols = set()
            for ref in cells.keys():
                import re
                match = re.match(r"([A-Z]+)(\d+)", ref)
                if match:
                    cols.add(match.group(1))
                    rows.add(int(match.group(2)))

            parts.append(f"Rows: {len(rows)}, Columns: {len(cols)}")
            parts.append("Use get_headers and get_column_values tools to explore the data.")

        return "\n".join(parts)

    def add_to_memory(self, user_message: str, ai_response: str):
        """Manually add an exchange to memory (for external calls)."""
        self.memory.save_context(
            {"input": user_message},
            {"output": ai_response}
        )

    def clear_memory(self):
        """Clear conversation memory."""
        self.memory.clear()
        logger.info(f"Cleared memory for session {self.session_id}")

    def get_memory_summary(self) -> Dict:
        """Get summary of current memory state."""
        return {
            "session_id": self.session_id,
            "message_count": len(self.memory.chat_memory.messages) if hasattr(self.memory, 'chat_memory') else 0,
            "window_size": settings.MEMORY_WINDOW_SIZE,
            "llm_source": self._llm_source,
        }


# ---------------------------------------------------------------------------
# Session Management
# ---------------------------------------------------------------------------

# Agent instances per session (conversation_id)
_agents: Dict[str, SheetMindAgent] = {}
_agents_lock = threading.Lock()

# Maximum number of cached agents (prevent memory leaks)
MAX_CACHED_AGENTS = 500

# Agent timeout (clear agents older than this)
AGENT_TIMEOUT_SECONDS = 3600  # 1 hour


def _cleanup_old_agents():
    """Remove agents that haven't been used recently. Caller must hold _agents_lock."""
    now = time.time()
    old_sessions = [
        sid for sid, agent in _agents.items()
        if now - agent.last_used_at > AGENT_TIMEOUT_SECONDS
    ]
    for sid in old_sessions:
        del _agents[sid]
        logger.info(f"Cleaned up old agent for session {sid}")


def get_agent(session_id: str = "default") -> SheetMindAgent:
    """
    Get or create an agent for a session.

    Args:
        session_id: Unique session ID (typically conversation_id)

    Returns:
        SheetMindAgent instance
    """
    with _agents_lock:
        # Cleanup expired agents on every access (cheap scan under lock)
        _cleanup_old_agents()

        # Still too many? Remove least-recently-used
        if len(_agents) >= MAX_CACHED_AGENTS:
            oldest_sid = min(_agents.keys(), key=lambda s: _agents[s].last_used_at)
            del _agents[oldest_sid]
            logger.warning(f"Evicted LRU agent {oldest_sid} due to cache limit")

        # Get or create agent
        if session_id not in _agents:
            _agents[session_id] = SheetMindAgent(session_id)

        agent = _agents[session_id]
        agent.last_used_at = time.time()
        return agent


def clear_agent(session_id: str = "default"):
    """
    Clear an agent's memory (but keep the agent).

    Args:
        session_id: Session to clear
    """
    with _agents_lock:
        if session_id in _agents:
            _agents[session_id].clear_memory()


def remove_agent(session_id: str):
    """
    Completely remove an agent from cache.

    Args:
        session_id: Session to remove
    """
    with _agents_lock:
        if session_id in _agents:
            del _agents[session_id]
            logger.info(f"Removed agent for session {session_id}")


def get_all_sessions() -> List[str]:
    """Get list of all active session IDs."""
    with _agents_lock:
        return list(_agents.keys())
