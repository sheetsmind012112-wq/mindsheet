import { useState, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { LoginScreen } from "./components/LoginScreen";
import { PricingPage } from "./components/PricingPage";
import { chatApi, authApi, ApiError, tryRefreshTokenOnStartup } from "./services/api";
import {
  identifyUser, startSession, trackMessageSent, trackMessageReceived,
  trackMessageError, trackStepsExecuted, trackUndoPerformed, trackQuickActionUsed,
  trackModeChanged, trackSheetChanged, trackNewChatStarted, trackConversationLoaded,
  trackConversationDeleted, trackPricingPageViewed, trackPricingPlanSelected,
} from "./services/analytics";
import type { Message, SheetAction, StepAction, HistoryMessage, QuickAction, ChatMode, SheetInfo, UndoInfo, ConversationListResponse, User } from "./types/api";

type AppPage = "chat" | "pricing";

interface SheetData {
  sheetName: string;
  dataRange: string;
  cells: Record<string, string>;
  totalRows: number;
  totalColumns: number;
  truncated: boolean;
  selectedRange: string | null;
  selectedValues: unknown[][];
  error?: string;
}

function getSheetData(): Promise<SheetData | null> {
  return new Promise((resolve) => {
    try {
      google.script.run
        .withSuccessHandler((data: SheetData) => resolve(data))
        .withFailureHandler(() => resolve(null))
        .getSheetData();
    } catch {
      resolve(null);
    }
  });
}

function getAllSheets(): Promise<SheetInfo[]> {
  return new Promise((resolve) => {
    try {
      google.script.run
        .withSuccessHandler((sheets: SheetInfo[]) => resolve(sheets || []))
        .withFailureHandler(() => resolve([]))
        .getAllSheets();
    } catch {
      resolve([]);
    }
  });
}

function getSheetDataByName(sheetName: string): Promise<SheetData | null> {
  return new Promise((resolve) => {
    try {
      google.script.run
        .withSuccessHandler((data: SheetData) => {
          if (data && data.error) {
            resolve(null);
          } else {
            resolve(data);
          }
        })
        .withFailureHandler(() => resolve(null))
        .getSheetDataByName(sheetName);
    } catch {
      resolve(null);
    }
  });
}

function executeSheetAction(action: SheetAction): Promise<string> {
  return new Promise((resolve) => {
    try {
      google.script.run
        .withSuccessHandler((result: string) => resolve(result))
        .withFailureHandler((err: { message: string }) => resolve("Action failed: " + err.message))
        .executeSheetAction(action as unknown as Record<string, unknown>);
    } catch {
      resolve("Not running in Google Sheets");
    }
  });
}

function executeStepAction(action: SheetAction): Promise<string> {
  return executeSheetAction(action);
}

function undoSheetActionsGAS(undoInfo: UndoInfo): Promise<string> {
  return new Promise((resolve) => {
    try {
      google.script.run
        .withSuccessHandler((result: string) => resolve(result))
        .withFailureHandler((err: { message: string }) => resolve("Undo failed: " + err.message))
        .undoSheetActions(undoInfo as unknown as Record<string, unknown>);
    } catch {
      resolve("Not running in Google Sheets");
    }
  });
}

function buildUndoInfo(steps: StepAction[]): UndoInfo {
  const sheetsToDelete: string[] = [];
  const cellsToClear: { sheet: string; range: string }[] = [];

  for (const step of steps) {
    const action = step.action;
    if (action.action === "createSheet" && action.name) {
      sheetsToDelete.push(action.name);
    } else if (action.action === "setFormula" && action.sheet && action.cell) {
      // Only track modifications on sheets we didn't create (those get deleted entirely)
      if (!sheetsToDelete.includes(action.sheet)) {
        cellsToClear.push({ sheet: action.sheet, range: action.cell });
      }
    } else if (action.action === "setValues" && action.sheet && action.range) {
      if (!sheetsToDelete.includes(action.sheet)) {
        cellsToClear.push({ sheet: action.sheet, range: action.range });
      }
    }
  }

  return { sheetsToDelete, cellsToClear };
}

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = checking
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Sheet info for header display
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [rowCount, setRowCount] = useState<number | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(true);

  // Mode and sheet selection
  const [mode, setMode] = useState<ChatMode>("action");
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  // Conversation history
  const [conversations, setConversations] = useState<ConversationListResponse["conversations"]>([]);

  // Trial tracking
  const [trialRefreshKey, setTrialRefreshKey] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);

  // Page navigation
  const [currentPage, setCurrentPage] = useState<AppPage>("chat");

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);

      // First, try to verify existing token
      if (authApi.isLoggedIn()) {
        try {
          const u = await authApi.me();
          setUser(u);
          identifyUser({ id: u.id, email: u.email, name: u.name, tier: u.tier, auth_method: "existing_token" });
          startSession({ auth_method: "existing_token", sheet_connected: false });
          setIsLoggedIn(true);
          setIsCheckingAuth(false);
          return;
        } catch {
          // Token expired — try refreshing before giving up
          const refreshed = await tryRefreshTokenOnStartup();
          if (refreshed) {
            try {
              const u = await authApi.me();
              setUser(u);
              identifyUser({ id: u.id, email: u.email, name: u.name, tier: u.tier, auth_method: "token_refresh" });
              startSession({ auth_method: "token_refresh", sheet_connected: false });
              setIsLoggedIn(true);
              setIsCheckingAuth(false);
              return;
            } catch {
              // Refresh succeeded but token still invalid
            }
          }
          authApi.clearTokens();
        }
      }

      setIsLoggedIn(false);
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Load sheets list after login
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadSheets = async () => {
      const sheetsList = await getAllSheets();
      setSheets(sheetsList);
      // Set initial selected sheet to the active one
      const activeSheet = sheetsList.find((s) => s.isActive);
      if (activeSheet) {
        setSelectedSheet(activeSheet.name);
        setSheetName(activeSheet.name);
        setRowCount(activeSheet.rowCount);
      }
    };
    loadSheets();
  }, [isLoggedIn]);

  // Load conversation history after login
  const loadConversations = useCallback(async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.conversations || []);
    } catch {
      // Non-critical — silently fail
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadConversations();
  }, [isLoggedIn, loadConversations]);

  // Handle login success
  const handleLoginSuccess = useCallback(async () => {
    setIsLoggedIn(true);
    try {
      const u = await authApi.me();
      setUser(u);
      identifyUser({ id: u.id, email: u.email, name: u.name, tier: u.tier, auth_method: "login" });
      startSession({ auth_method: "login", sheet_connected: false });
    } catch {
      // Non-critical — analytics only
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    authApi.clearTokens();
    setUser(null);
    setIsLoggedIn(false);
    setMessages([]);
    setConversationId(null);
    setConversations([]);
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    trackModeChanged(newMode);
  }, []);

  // Handle sheet selection change
  const handleSheetChange = useCallback(async (newSheetName: string) => {
    setSelectedSheet(newSheetName);
    trackSheetChanged(newSheetName);
    const sheetData = await getSheetDataByName(newSheetName);
    if (sheetData) {
      setSheetName(sheetData.sheetName);
      setRowCount(sheetData.totalRows);
      setIsConnected(true);
    }
  }, []);

  // Build conversation history from last 5 messages (Phase 3)
  const buildHistory = useCallback((): HistoryMessage[] => {
    const recent = messages.slice(-10); // last 5 pairs (10 messages)
    return recent.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  // Execute steps sequentially with status updates (Phase 2D)
  const executeSteps = useCallback(
    async (steps: StepAction[], messageId: string) => {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Update step status to "executing"
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId || !msg.steps) return msg;
            return {
              ...msg,
              steps: msg.steps.map((s, idx) =>
                idx === i ? { ...s, _status: "executing" as const } : s
              ),
            };
          })
        );

        // Execute the action
        const result = await executeStepAction(step.action);

        // Update step status to "done" or "error"
        const status = result.startsWith("Error") ? "error" : "done";
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId || !msg.steps) return msg;
            return {
              ...msg,
              steps: msg.steps.map((s, idx) =>
                idx === i ? { ...s, _status: status as string, _result: result } : s
              ),
            };
          })
        );

        if (status === "error") { errorCount++; break; }
        successCount++;

        // Small delay between steps for visual feedback
        await new Promise((r) => setTimeout(r, 300));
      }

      trackStepsExecuted({
        step_count: steps.length,
        success_count: successCount,
        error_count: errorCount,
      });

      // Attach undo info to the message after all steps complete
      const undoInfo = buildUndoInfo(steps);
      if (undoInfo.sheetsToDelete.length > 0 || undoInfo.cellsToClear.length > 0) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, undoInfo } : msg
          )
        );
      }
    },
    []
  );

  const handleSend = useCallback(
    async (text: string) => {
      setError(null);
      setResponseTime(null);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const startTime = performance.now();

      const isFirstMessage = messages.length === 0;

      try {
        // Fetch data from selected sheet or active sheet
        const sheetData = selectedSheet
          ? await getSheetDataByName(selectedSheet)
          : await getSheetData();

        // Update sheet info for header
        if (sheetData) {
          setSheetName(sheetData.sheetName);
          setRowCount(sheetData.totalRows);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }

        // Refresh sheets list in case new sheets were created
        const updatedSheets = await getAllSheets();
        setSheets(updatedSheets);

        const history = buildHistory();

        trackMessageSent({
          mode,
          message_length: text.length,
          has_sheet_data: !!sheetData,
          is_first_message: isFirstMessage,
        });

        const res = await chatApi.sendMessage({
          message: text,
          conversation_id: conversationId ?? undefined,
          sheet_data: sheetData
            ? {
                dataRange: sheetData.dataRange,
                cells: sheetData.cells,
                totalRows: sheetData.totalRows,
                totalColumns: sheetData.totalColumns,
                selectedRange: sheetData.selectedRange,
                selectedValues: sheetData.selectedValues,
              }
            : undefined,
          sheet_name: sheetData?.sheetName ?? undefined,
          history: history.length > 0 ? history : undefined,
          mode: mode,
        });

        const elapsed = Math.round(performance.now() - startTime);
        setResponseTime(elapsed);
        setConversationId(res.conversation_id);

        // Store quick actions if returned (Phase 4), clear if not
        setQuickActions(res.quick_actions?.length ? res.quick_actions : []);

        let content = res.content;

        trackMessageReceived({
          has_steps: !!(res.steps && res.steps.length > 0),
          step_count: res.steps?.length ?? 0,
          has_chart: !!res.chart_config,
          used_rag: !!res.used_rag,
          response_time_ms: elapsed,
        });

        // If response has steps (agent mode), create message with steps
        if (res.steps && res.steps.length > 0) {
          const assistantMessage: Message = {
            id: res.message_id,
            role: "assistant",
            content,
            sources: res.sources,
            steps: res.steps.map((s) => ({ ...s, _status: "pending" })),
            thinking: res.thinking ?? undefined,
            verification: res.verification ?? undefined,
            // LangChain specific fields
            reasoning_steps: res.reasoning_steps ?? undefined,
            used_rag: res.used_rag ?? undefined,
            agent_timing: res.agent_timing ?? undefined,
            pii_warning: res.pii_warning ?? undefined,
            clarification: res.clarification ?? undefined,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Execute steps sequentially
          await executeSteps(res.steps, res.message_id);
        } else {
          // Regular response — handle sheet_action as before
          if (res.sheet_action) {
            const actionResult = await executeSheetAction(res.sheet_action);
            content += "\n\n> " + actionResult;
          }

          const assistantMessage: Message = {
            id: res.message_id,
            role: "assistant",
            content,
            sources: res.sources,
            chart_config: res.chart_config ?? undefined,
            // LangChain specific fields (can be present even without steps)
            reasoning_steps: res.reasoning_steps ?? undefined,
            used_rag: res.used_rag ?? undefined,
            agent_timing: res.agent_timing ?? undefined,
            pii_warning: res.pii_warning ?? undefined,
            clarification: res.clarification ?? undefined,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        // Refresh conversation list and trial counter
        loadConversations();
        setTrialRefreshKey((k) => k + 1);
      } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        setResponseTime(elapsed);

        // Handle 402 — trial limit reached
        if (err instanceof ApiError && err.status === 402) {
          setTrialExpired(true);
          setTrialRefreshKey((k) => k + 1);
          setError("You've used all your free messages. Upgrade to Pro to continue!");
          // Remove the optimistic user message
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        } else {
          // User-friendly error messages (api.ts now returns parsed messages)
          const msg =
            err instanceof ApiError
              ? err.message
              : "Network error. Please check your connection.";
          setError(msg);
          // Keep the user message in the UI so they can see what they sent
          // (don't remove it — they might want to retry)
        }
        trackMessageError({
          error_type: err instanceof ApiError ? "api_error" : "network_error",
          status_code: err instanceof ApiError ? err.status : undefined,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, buildHistory, executeSteps, selectedSheet, mode, loadConversations],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setResponseTime(null);
    setQuickActions([]);
    trackNewChatStarted();
  }, []);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      trackQuickActionUsed(prompt);
      handleSend(prompt);
    },
    [handleSend],
  );

  const handleUndo = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.undoInfo || msg.undone) return;

    trackUndoPerformed({
      sheets_deleted: msg.undoInfo.sheetsToDelete.length,
      cells_cleared: msg.undoInfo.cellsToClear.length,
    });

    const result = await undoSheetActionsGAS(msg.undoInfo);

    // Mark message as undone and refresh sheets list
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, undone: true } : m
      )
    );

    const updatedSheets = await getAllSheets();
    setSheets(updatedSheets);

    // Show a confirmation message
    const undoMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Undo complete: ${result}`,
    };
    setMessages((prev) => [...prev, undoMessage]);
  }, [messages]);

  // Handle clicking a clarification card
  const handleClarificationSelect = useCallback(
    (messageId: string, value: string) => {
      // Mark the clarification as answered (disables the cards)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, clarificationAnswered: true } : msg
        )
      );
      // Send the selected option as a new message
      handleSend(value);
    },
    [handleSend],
  );

  // Load a past conversation's messages
  const handleLoadConversation = useCallback(async (convId: string) => {
    trackConversationLoaded();
    try {
      const res = await chatApi.getMessages(convId);
      const loaded: Message[] = (res.messages || []).map((m) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
        sources: m.sources,
        created_at: m.created_at,
      }));
      setMessages(loaded);
      setConversationId(convId);
      setError(null);
      setResponseTime(null);
      setQuickActions([]);
    } catch {
      setError("Failed to load conversation.");
    }
  }, []);

  // Delete a conversation and refresh list
  const handleDeleteConversation = useCallback(async (convId: string) => {
    trackConversationDeleted();
    try {
      await chatApi.deleteConversation(convId);
      // If we're viewing the deleted conversation, reset to new chat
      if (conversationId === convId) {
        setMessages([]);
        setConversationId(null);
        setError(null);
        setQuickActions([]);
      }
      await loadConversations();
    } catch {
      setError("Failed to delete conversation.");
    }
  }, [conversationId, loadConversations]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5" opacity="0.9" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" opacity="0.7" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.7" />
              <path d="M17.5 13l.372 1.128a3 3 0 001.998 1.998L21 16.5l-1.13.374a3 3 0 00-1.998 1.998L17.5 20l-.372-1.128a3 3 0 00-1.998-1.998L14 16.5l1.13-.374a3 3 0 001.998-1.998L17.5 13z" />
            </svg>
          </div>
          <span className="text-xs text-slate-400 font-medium">Loading SheetMind...</span>
        </div>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Show pricing page
  if (currentPage === "pricing") {
    return (
      <PricingPage
        onBack={() => setCurrentPage("chat")}
        onSelectPlan={(plan) => {
          trackPricingPlanSelected(plan, "monthly");
          // TODO: Handle plan selection with Dodo Payments checkout
        }}
      />
    );
  }

  return (
    <Sidebar
      messages={messages}
      isLoading={isLoading}
      error={error}
      responseTime={responseTime}
      onSend={handleSend}
      onNewChat={handleNewChat}
      quickActions={quickActions}
      onQuickAction={handleQuickAction}
      sheetName={sheetName}
      rowCount={rowCount}
      isConnected={isConnected}
      mode={mode}
      onModeChange={handleModeChange}
      sheets={sheets}
      selectedSheet={selectedSheet}
      onSheetChange={handleSheetChange}
      onShowPricing={() => { trackPricingPageViewed(); setCurrentPage("pricing"); }}
      onUndo={handleUndo}
      onClarificationSelect={handleClarificationSelect}
      conversations={conversations}
      activeConversationId={conversationId}
      onLoadConversation={handleLoadConversation}
      onDeleteConversation={handleDeleteConversation}
      user={user}
      onLogout={handleLogout}
      trialRefreshKey={trialRefreshKey}
      trialExpired={trialExpired}
    />
  );
}

export default App;
