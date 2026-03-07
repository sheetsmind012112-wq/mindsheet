import posthog from "posthog-js";

// ── Configuration ──────────────────────────────────────────────────────────
// Replace with your PostHog project API key and host after setup.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;
let sessionStart: number | null = null;
let sessionMessageCount = 0;
const modesUsed = new Set<string>();

// ── Initialization ─────────────────────────────────────────────────────────

export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false, // Dense sidebar UI — autocapture is noisy
    capture_pageview: false, // Single-page sidebar, manual tracking
    capture_pageleave: false,
    persistence: "localStorage", // Works in iframes (GAS sidebar)
    disable_session_recording: false,
    person_profiles: "always", // Capture events for anonymous AND identified users
    loaded: (ph) => {
      ph.capture("posthog_initialized", { source: "sheetmind_sidebar" });
    },
  });

  initialized = true;
}

// ── Identity ───────────────────────────────────────────────────────────────

export function identifyUser(user: {
  id: string;
  email: string;
  name?: string;
  tier?: string;
  auth_method?: string;
}): void {
  if (!initialized) return;

  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    tier: user.tier,
    auth_method: user.auth_method,
  });
}

export function resetUser(): void {
  if (!initialized) return;
  posthog.reset();
}

// ── Generic track ──────────────────────────────────────────────────────────

export function track(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// ── Session helpers ────────────────────────────────────────────────────────

export function startSession(props?: Record<string, unknown>): void {
  sessionStart = Date.now();
  sessionMessageCount = 0;
  modesUsed.clear();
  track("session_started", props);
}

export function endSession(): void {
  if (!sessionStart) return;
  const durationSeconds = Math.round((Date.now() - sessionStart) / 1000);
  track("session_ended", {
    duration_seconds: durationSeconds,
    messages_sent: sessionMessageCount,
    modes_used: Array.from(modesUsed),
  });
  sessionStart = null;
}

// ── Auth funnel ────────────────────────────────────────────────────────────

export function trackLoginPageViewed(): void {
  track("login_page_viewed");
}

export function trackLoginGoogleClicked(): void {
  track("login_google_clicked");
}

export function trackLoginEmailSubmitted(isSignup: boolean): void {
  track(isSignup ? "signup_submitted" : "login_email_submitted");
}

export function trackLoginSuccess(method: "google" | "email"): void {
  track("login_email_success", { method });
}

export function trackSignupSuccess(): void {
  track("signup_success");
}

export function trackLoginError(method: string, errorMessage?: string): void {
  track("login_error", { method, error_message: errorMessage });
}

// ── Core usage ─────────────────────────────────────────────────────────────

export function trackMessageSent(props: {
  mode: string;
  message_length: number;
  has_sheet_data: boolean;
  is_first_message: boolean;
}): void {
  sessionMessageCount++;
  modesUsed.add(props.mode);
  track("message_sent", props);
}

export function trackMessageReceived(props: {
  has_steps: boolean;
  step_count: number;
  has_chart: boolean;
  used_rag: boolean;
  response_time_ms: number;
}): void {
  track("message_received", props);
}

export function trackMessageError(props: {
  error_type: string;
  status_code?: number;
}): void {
  track("message_error", props);
}

export function trackStepsExecuted(props: {
  step_count: number;
  success_count: number;
  error_count: number;
}): void {
  track("steps_executed", props);
}

export function trackUndoPerformed(props: {
  sheets_deleted: number;
  cells_cleared: number;
}): void {
  track("undo_performed", props);
}

export function trackQuickActionUsed(label: string): void {
  track("quick_action_used", { prompt_label: label });
}

// ── Navigation ─────────────────────────────────────────────────────────────

export function trackModeChanged(mode: string): void {
  modesUsed.add(mode);
  track("mode_changed", { mode });
}

export function trackSheetChanged(sheetName: string): void {
  track("sheet_changed", { sheet_name: sheetName });
}

export function trackNewChatStarted(): void {
  track("new_chat_started");
}

export function trackConversationLoaded(): void {
  track("conversation_loaded");
}

export function trackConversationDeleted(): void {
  track("conversation_deleted");
}

export function trackHistoryPanelOpened(): void {
  track("history_panel_opened");
}

export function trackPricingPageViewed(): void {
  track("pricing_page_viewed");
}

export function trackPricingPlanSelected(plan: string, billing: string): void {
  track("pricing_plan_selected", { plan, billing });
}

export function trackBillingToggleChanged(billing: string): void {
  track("billing_toggle_changed", { billing });
}

// ── API / Errors ───────────────────────────────────────────────────────────

export function trackTokenRefreshFailed(): void {
  track("token_refresh_failed");
}
