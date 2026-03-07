import { trackTokenRefreshFailed } from "./analytics";
import type {
  ChatRequest,
  ChatResponse,
  ChartRequest,
  ChartResponse,
  ConversationListResponse,
  ConversationHistoryResponse,
  FormulaExecuteRequest,
  FormulaExecuteResponse,
  FormulaExplainRequest,
  FormulaExplainResponse,
  FormulaFixRequest,
  FormulaFixResponse,
  UsageStats,
  TrialStatus,
  AuthResponse,
  LoginResponse,
  User,
  // LangChain Agent & RAG types
  ClearMemoryRequest,
  ClearMemoryResponse,
  AgentStatusResponse,
  RAGIndexResponse,
  RAGSearchResponse,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/** Default timeout for all API requests (60s — chat can take a while). */
const REQUEST_TIMEOUT_MS = 60_000;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Prevents multiple concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  // If a refresh is already in progress, wait for it instead of starting another
  if (refreshPromise) return refreshPromise;

  refreshPromise = tryRefreshToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/** Parse a structured error message from the response, falling back to friendly defaults. */
async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.detail === "object" && body.detail?.message) return body.detail.message;
    if (body.message) return body.message;
  } catch {
    // Response wasn't JSON — use status-based fallback
  }
  if (res.status === 429) return "Too many requests. Please slow down.";
  if (res.status === 503) return "Service temporarily unavailable. Please try again.";
  if (res.status >= 500) return "Something went wrong on our end. Please try again.";
  return "Request failed.";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Abort on timeout to prevent indefinite hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please try again.");
    }
    throw new ApiError(0, "Network error. Please check your connection.");
  } finally {
    clearTimeout(timeoutId);
  }

  // On 401, try refreshing the token once, then retry
  if (res.status === 401 && !_isRetry) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    // Refresh failed — clear tokens so UI can redirect to login
    trackTokenRefreshFailed();
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);

    // Auto-retry 5xx once after 1s delay (transient server errors)
    if (res.status >= 500 && !_isRetry) {
      await new Promise((r) => setTimeout(r, 1000));
      return request<T>(path, options, true);
    }

    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export const chatApi = {
  sendMessage(data: ChatRequest): Promise<ChatResponse> {
    return request<ChatResponse>("/chat/query", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getConversations(): Promise<ConversationListResponse> {
    return request<ConversationListResponse>("/chat/history");
  },

  getMessages(conversationId: string): Promise<ConversationHistoryResponse> {
    return request<ConversationHistoryResponse>(
      `/chat/history?conversation_id=${conversationId}`,
    );
  },

  deleteConversation(conversationId: string): Promise<{ status: string }> {
    return request<{ status: string }>(`/chat/history/${conversationId}`, {
      method: "DELETE",
    });
  },
};

export const formulaApi = {
  execute(data: FormulaExecuteRequest): Promise<FormulaExecuteResponse> {
    return request<FormulaExecuteResponse>("/formula/execute", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  explain(data: FormulaExplainRequest): Promise<FormulaExplainResponse> {
    return request<FormulaExplainResponse>("/formula/explain", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  fix(data: FormulaFixRequest): Promise<FormulaFixResponse> {
    return request<FormulaFixResponse>("/formula/fix", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const chartApi = {
  generate(data: ChartRequest): Promise<ChartResponse> {
    return request<ChartResponse>("/chat/chart", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const usageApi = {
  getStats(): Promise<UsageStats> {
    return request<UsageStats>("/usage/stats");
  },

  getTrialStatus(): Promise<TrialStatus> {
    return request<TrialStatus>("/usage/trial");
  },
};

// Authentication API
export const authApi = {
  /**
   * Get Google OAuth login URL.
   * Redirect user to this URL to start login flow.
   */
  async getLoginUrl(nonce?: string): Promise<LoginResponse> {
    // No auth needed — use plain fetch to avoid 401 retry loop with stale tokens
    const url = nonce
      ? `${BASE_URL}/auth/login?nonce=${encodeURIComponent(nonce)}`
      : `${BASE_URL}/auth/login`;
    const res = await fetch(url);
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },

  /**
   * Sign up with email and password.
   */
  async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },

  /**
   * Sign in with email and password.
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Exchange OAuth tokens after redirect.
   * Call with tokens from URL hash after Google OAuth redirect.
   */
  callback(accessToken: string, refreshToken: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/callback", {
      method: "POST",
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    });
  },

  /**
   * Refresh expired access token.
   */
  refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
    return request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  /**
   * Get current authenticated user.
   */
  me(): Promise<User> {
    return request<User>("/auth/me");
  },

  /**
   * Log out (clears tokens client-side).
   */
  logout(): Promise<{ status: string; message: string }> {
    return request("/auth/logout", { method: "POST" });
  },

  /**
   * Check if user is logged in.
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem("access_token");
  },

  /**
   * Store tokens after login.
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  },

  /**
   * Clear stored tokens.
   */
  clearTokens(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

// LangChain Agent API
export const agentApi = {
  /**
   * Clear agent memory for a conversation.
   * Use this to start fresh without prior context.
   */
  clearMemory(data?: ClearMemoryRequest): Promise<ClearMemoryResponse> {
    return request<ClearMemoryResponse>("/chat/agent/clear", {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * Get agent status including memory state and configuration.
   */
  getStatus(conversationId?: string): Promise<AgentStatusResponse> {
    const url = conversationId
      ? `/chat/agent/status?conversation_id=${conversationId}`
      : "/chat/agent/status";
    return request<AgentStatusResponse>(url, {
      method: "POST",
    });
  },
};

// RAG (Retrieval Augmented Generation) API
export const ragApi = {
  /**
   * Pre-index a sheet for faster semantic search.
   * Call when loading large sheets (500+ rows).
   */
  indexSheet(data: ChatRequest): Promise<RAGIndexResponse> {
    return request<RAGIndexResponse>("/chat/rag/index", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Direct semantic search on sheet data.
   * Finds rows by meaning, not just keywords.
   *
   * @param data - Request with message (search query) and sheet_data
   * @param k - Number of results to return (default 30)
   */
  search(data: ChatRequest, k: number = 30): Promise<RAGSearchResponse> {
    return request<RAGSearchResponse>(`/chat/rag/search?k=${k}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Billing API
export const billingApi = {
  /**
   * Create a Dodo Payments checkout session.
   * Returns a checkout_url to redirect the user to.
   */
  async createCheckout(plan: "pro_monthly" | "pro_annual" | "team_monthly" | "team_annual"): Promise<{ checkout_url: string }> {
    return request<{ checkout_url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },

  /**
   * Create a customer portal session for managing subscriptions.
   */
  async getPortalUrl(): Promise<{ portal_url: string }> {
    return request<{ portal_url: string }>("/billing/portal", { method: "POST" });
  },
};

export { ApiError, tryRefreshToken as tryRefreshTokenOnStartup };
