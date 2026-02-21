export interface SourceReference {
  label: string;
  sheet: string;
  range: string;
}

// Mode types
export type ChatMode = "action" | "chat";

export interface SheetInfo {
  name: string;
  rowCount: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Sheet Metadata Types (Pre-processing layer)
// ---------------------------------------------------------------------------

export interface ColumnMetadata {
  letter: string;
  header: string;
  type: "numeric" | "text" | "date" | "categorical" | "empty";
  uniqueCount: number;
  nullCount: number;
  samples: string[];
  // Numeric stats (only for numeric columns)
  min?: number | null;
  max?: number | null;
  avg?: number | null;
  sum?: number | null;
  // Categorical stats (only for categorical columns)
  categories?: string[];
}

export interface SheetMetadata {
  sheetName: string;
  totalRows: number;
  dataRows: number;  // Excluding header
  lastRow: number;
  totalColumns: number;
  columns: ColumnMetadata[];
  suggestedGroupBy: string[];  // Column letters good for grouping
  suggestedAggregate: string[];  // Column letters good for SUM/AVG
  suggestedDateColumn?: string | null;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  sheet_data?: Record<string, unknown>;
  sheet_name?: string;
  force_refresh?: boolean;
  history?: HistoryMessage[];
  mode?: ChatMode;  // "action" = create sheets/formulas, "chat" = just answer
}

export interface SheetAction {
  action: "filter" | "sort" | "highlight" | "setValue" | "insertColumn" |
    "createSheet" | "setFormula" | "setValues" | "autoFillDown" | "formatRange" | "readRange";
  column?: string;
  criteria?: string;
  ascending?: boolean;
  range?: string;
  color?: string;
  cell?: string;
  value?: string;
  after?: string;
  header?: string;
  name?: string;
  sheet?: string;
  formula?: string;
  fillDown?: boolean;
  values?: unknown[][];
  sourceCell?: string;
  lastRow?: number;
  bold?: boolean;
  background?: string;
  fontColor?: string;
}

export interface StepAction {
  step: number;
  description: string;
  action: SheetAction;
  formula?: string | null;
  about?: string | null;
}

export interface QuickAction {
  label: string;
  prompt: string;
}

// LangChain Agent Types
export interface AgentReasoningStep {
  step: number;
  thought: string;
  tool: string;
  tool_input: string;
  result: string;
}

export interface AgentTiming {
  rag_ms?: number;
  agent_ms?: number;
  total_ms?: number;
  error?: string;
}

// RAG Types
export interface RAGSearchResult {
  row: number;
  content: string;
  cells: Record<string, unknown>;
  score: number;
  sheet?: string;
}

export interface RAGIndexResponse {
  status: string;
  indexed: number;
  collection?: string;
  embedding_type?: string;
  error?: string;
}

export interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
  count: number;
}

// Clarification card types (clickable options for AI questions)
export interface ClarificationOption {
  label: string;
  value: string;
  description: string;
}

export interface Clarification {
  question: string;
  type: "column" | "sheet" | "range" | "custom";
  options: ClarificationOption[];
}

export interface ClearMemoryRequest {
  conversation_id?: string;
}

export interface ClearMemoryResponse {
  status: string;
  session_id: string;
}

export interface AgentStatusResponse {
  langchain_enabled: boolean;
  rag_enabled: boolean;
  rag_threshold_rows?: number;
  memory?: {
    session_id: string;
    message_count: number;
    window_size: number;
    llm_source: string;
  };
  message?: string;
  error?: string;
}

export interface ActionVerification {
  total_actions: number;
  issues_found: number;
  issues: string[];
  fixes_applied: string[];
  verification: "PASSED" | "PASSED_WITH_FIXES" | "NEEDS_REVIEW";
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  sources: SourceReference[];
  chart_config?: Record<string, unknown> | null;
  sheet_action?: SheetAction | null;
  steps?: StepAction[] | null;
  thinking?: string | null;
  verification?: ActionVerification | null;
  quick_actions?: QuickAction[] | null;
  // LangChain specific fields
  reasoning_steps?: AgentReasoningStep[] | null;
  used_rag?: boolean | null;
  agent_timing?: AgentTiming | null;
  // Pre-processing metadata
  sheet_metadata?: SheetMetadata | null;
  // PII warning
  pii_warning?: string | null;
  // Clarification cards
  clarification?: Clarification | null;
}

export interface UndoInfo {
  sheetsToDelete: string[];
  cellsToClear: { sheet: string; range: string }[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  chart_config?: Record<string, unknown>;
  steps?: StepAction[];
  thinking?: string;
  verification?: ActionVerification;
  quick_actions?: QuickAction[];
  created_at?: string;
  // LangChain specific fields
  reasoning_steps?: AgentReasoningStep[];
  used_rag?: boolean;
  agent_timing?: AgentTiming;
  // Pre-processing metadata
  sheet_metadata?: SheetMetadata;
  // Undo support
  undoInfo?: UndoInfo;
  undone?: boolean;
  // PII warning
  pii_warning?: string;
  // Clarification cards
  clarification?: Clarification;
  clarificationAnswered?: boolean;
}

export interface ConversationListResponse {
  conversations: { id: string; title: string; created_at: string; updated_at: string }[];
  total: number;
}

export interface ConversationHistoryResponse {
  messages: Message[];
}

export interface FormulaExecuteRequest {
  prompt: string;
  range_data?: unknown[][] | null;
  options?: Record<string, unknown> | null;
}

export interface FormulaExecuteResponse {
  result: string;
  sources: Record<string, unknown>[];
}

export interface FormulaExplainRequest {
  formula: string;
  mode?: "standard" | "step_by_step";
}

export interface FormulaExplainResponse {
  explanation: string;
  steps?: { step: number; function: string; description: string }[] | null;
  simpler_alternative?: string | null;
}

export interface FormulaFixRequest {
  formula: string;
  error_message: string;
  sheet_context?: string | null;
}

export interface FormulaFixResponse {
  fixed_formula: string;
  what_was_wrong: string;
  explanation: string;
}

export interface ChartRequest {
  data: Record<string, unknown>;
  chart_type?: string;
  title?: string;
}

export interface ChartResponse {
  chart_config: Record<string, unknown>;
  chart_type: string;
}

export interface UsageStats {
  period: string;
  query_count: number;
  formula_count: number;
  chat_count: number;
  total_used: number;
  limit: number;
  remaining: number;
  tier: string;
  is_trial?: boolean;
  status_message?: string;
  show_upgrade?: boolean;
  user_email?: string;
  user_name?: string;
}

// Trial-specific types
export interface TrialStatus {
  is_trial: boolean;
  trial_limit?: number;
  trial_used?: number;
  trial_remaining?: number;
  trial_expired?: boolean;
  upgrade_message?: string;
  // For paid users
  tier?: string;
  monthly_limit?: number;
  monthly_used?: number;
  monthly_remaining?: number;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tier: "free" | "pro" | "team";
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponse {
  url: string;
}

// Error response when trial/usage exceeded
export interface UsageLimitError {
  error: string;
  total_used: number;
  limit: number;
  tier: string;
  is_trial: boolean;
  message: string;
  upgrade_url?: string;
}
