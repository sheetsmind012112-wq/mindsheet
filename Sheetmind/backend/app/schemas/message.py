import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class SourceReference(BaseModel):
    label: str        # e.g. "Rows 45-67"
    sheet: str        # e.g. "Sheet1"
    range: str        # e.g. "A45:A67"


# ---------------------------------------------------------------------------
# Sheet Metadata Models (Pre-processing layer)
# ---------------------------------------------------------------------------

class ColumnMetadata(BaseModel):
    """Metadata for a single spreadsheet column."""
    letter: str
    header: str
    type: str  # "numeric", "text", "date", "categorical", "empty"
    uniqueCount: int = 0
    nullCount: int = 0
    samples: list[str] = []

    # Numeric stats (only for numeric columns)
    min: Optional[float] = None
    max: Optional[float] = None
    avg: Optional[float] = None
    sum: Optional[float] = None

    # Categorical stats (only for categorical columns)
    categories: list[str] = []


class SheetMetadata(BaseModel):
    """Complete metadata for a spreadsheet, used by the pre-processing layer."""
    sheetName: str
    totalRows: int
    dataRows: int  # Excluding header
    lastRow: int
    totalColumns: int
    columns: list[ColumnMetadata] = []
    suggestedGroupBy: list[str] = []  # Column letters good for grouping
    suggestedAggregate: list[str] = []  # Column letters good for SUM/AVG
    suggestedDateColumn: Optional[str] = None


class StepAction(BaseModel):
    step: int
    description: str
    action: dict
    formula: str | None = None
    about: str | None = None


class QuickAction(BaseModel):
    label: str
    prompt: str


class HistoryMessage(BaseModel):
    role: str
    content: str


# ---------------------------------------------------------------------------
# LangChain Agent Models
# ---------------------------------------------------------------------------

class AgentReasoningStep(BaseModel):
    """A single reasoning step from the LangChain ReAct agent."""
    step: int
    thought: str
    tool: str
    tool_input: str
    result: str


class ClarificationOption(BaseModel):
    """A single clickable option for clarification."""
    label: str          # e.g. "A: Name"
    value: str          # sent as message on click, e.g. "Column A (Name)"
    description: str    # e.g. "text, 30 rows"


class Clarification(BaseModel):
    """Clickable clarification cards sent with an AI question."""
    question: str       # The AI's question text
    type: str           # "column" | "sheet" | "range" | "custom"
    options: list[ClarificationOption]


class ClearMemoryRequest(BaseModel):
    """Request to clear agent memory."""
    conversation_id: str | None = None


# ---------------------------------------------------------------------------
# RAG Models
# ---------------------------------------------------------------------------

class RAGSearchResult(BaseModel):
    """A single result from RAG semantic search."""
    row: int
    content: str
    cells: dict
    score: float
    sheet: str | None = None


class RAGIndexResponse(BaseModel):
    """Response from RAG index endpoint."""
    status: str
    indexed: int
    collection: str | None = None
    embedding_type: str | None = None
    error: str | None = None


class RAGSearchResponse(BaseModel):
    """Response from RAG search endpoint."""
    query: str
    results: list[dict]
    count: int


class ChatMode(str, Enum):
    action = "action"  # Creates sheets & formulas
    chat = "chat"      # Just answers questions


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    message: str
    sheet_data: dict | None = None
    sheet_name: str | None = None
    force_refresh: bool = False
    history: list[HistoryMessage] | None = None
    mode: ChatMode | None = None  # "action" = create sheets/formulas, "chat" = just answer

    # --- Input size limits ---
    MAX_MESSAGE_LENGTH: int = 5000
    MAX_SHEET_CELLS: int = 50_000
    MAX_SHEET_DATA_BYTES: int = 5_000_000  # 5 MB
    MAX_HISTORY_LENGTH: int = 50  # 25 exchanges

    @field_validator("message")
    @classmethod
    def validate_message_length(cls, v: str) -> str:
        if len(v) > cls.MAX_MESSAGE_LENGTH:
            raise ValueError(
                f"Message too long ({len(v)} chars). Maximum is {cls.MAX_MESSAGE_LENGTH}."
            )
        return v

    @field_validator("history")
    @classmethod
    def validate_history_length(cls, v: list | None) -> list | None:
        if v is not None and len(v) > cls.MAX_HISTORY_LENGTH:
            # Truncate to the most recent messages rather than rejecting
            v = v[-cls.MAX_HISTORY_LENGTH:]
        return v

    @field_validator("sheet_data")
    @classmethod
    def validate_sheet_data_size(cls, v: dict | None) -> dict | None:
        if v is None:
            return v
        # Check cell count
        cells = v.get("cells")
        if isinstance(cells, dict) and len(cells) > cls.MAX_SHEET_CELLS:
            raise ValueError(
                f"Sheet data too large ({len(cells)} cells). Maximum is {cls.MAX_SHEET_CELLS}."
            )
        # Check total payload byte size to prevent memory abuse
        try:
            byte_size = len(json.dumps(v))
        except (TypeError, ValueError):
            byte_size = 0
        if byte_size > cls.MAX_SHEET_DATA_BYTES:
            mb = byte_size / 1_000_000
            raise ValueError(
                f"Sheet data payload too large ({mb:.1f} MB). Maximum is {cls.MAX_SHEET_DATA_BYTES // 1_000_000} MB."
            )
        return v


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str
    sources: list[SourceReference]
    chart_config: dict | None = None
    sheet_action: dict | None = None
    steps: list[StepAction] | None = None
    thinking: str | None = None
    verification: str | None = None
    quick_actions: list[QuickAction] | None = None
    # LangChain specific fields
    reasoning_steps: list[AgentReasoningStep] | None = None
    used_rag: bool | None = None
    agent_timing: dict | None = None
    # Pre-processing metadata
    sheet_metadata: SheetMetadata | None = None
    # PII detection warning
    pii_warning: str | None = None
    # Clarification cards (clickable options)
    clarification: Clarification | None = None


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    sources: list[SourceReference] | None
    created_at: datetime
