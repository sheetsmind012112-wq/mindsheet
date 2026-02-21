import { useState, useEffect } from "react";
import { authApi } from "../services/api";
import {
  trackLoginPageViewed, trackLoginGoogleClicked, trackLoginEmailSubmitted,
  trackLoginSuccess, trackSignupSuccess, trackLoginError,
} from "../services/analytics";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthMode = "login" | "signup";

const FEATURES = [
  { icon: "formula", label: "Smart Formulas", desc: "AI writes complex formulas for you" },
  { icon: "chart", label: "Instant Charts", desc: "Visualize data with one prompt" },
  { icon: "bolt", label: "Bulk Actions", desc: "Transform entire sheets in seconds" },
];

function FeatureIcon({ type }: { type: string }) {
  if (type === "formula") return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
    </svg>
  );
  if (type === "chart") return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Track login page view on mount
  useEffect(() => {
    trackLoginPageViewed();
  }, []);

  // Listen for OAuth tokens from the popup window via postMessage.
  // Only accept messages from the backend origin to prevent token injection attacks.
  useEffect(() => {
    const backendOrigin = new URL(
      import.meta.env.VITE_API_URL || "http://localhost:8000/api"
    ).origin;

    const handleMessage = (event: MessageEvent) => {
      // Validate the sender origin — reject messages from unknown sources
      if (event.origin !== backendOrigin && event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === "sheetmind-oauth" && event.data.access_token) {
        authApi.setTokens(event.data.access_token, event.data.refresh_token || "");
        trackLoginSuccess("google");
        onLoginSuccess();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLoginSuccess]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    trackLoginGoogleClicked();

    try {
      const { url } = await authApi.getLoginUrl();
      // Open as a centered popup — tokens come back via postMessage
      const w = 500, h = 600;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      const popup = window.open(
        url,
        "sheetmind-oauth",
        `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
      );
      if (!popup) {
        // Popup blocked — fall back to new tab
        window.open(url, "_blank");
        setError("Complete login in the popup, then come back here.");
      }
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError("Failed to start Google login. Please try again.");
      trackLoginError("google", "Failed to start Google login");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    trackLoginEmailSubmitted(mode === "signup");

    try {
      if (mode === "signup") {
        await authApi.signUp(email, password, name);
        trackSignupSuccess();
        setSuccess("Account created! Check your email to verify, then log in.");
        setMode("login");
      } else {
        const result = await authApi.signIn(email, password);
        if (result.access_token) {
          authApi.setTokens(result.access_token, result.refresh_token || "");
          trackLoginSuccess("email");
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      const message = err?.message || "Authentication failed. Please try again.";
      setError(message);
      trackLoginError(mode === "signup" ? "signup" : "email", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckLogin = async () => {
    setIsLoading(true);
    try {
      if (authApi.isLoggedIn()) {
        await authApi.me();
        onLoginSuccess();
      } else {
        setError("Not logged in yet. Complete login in the popup first.");
      }
    } catch {
      setError("Not logged in yet. Complete login in the popup first.");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 animate-gradient" />

      {/* Header with logo */}
      <div className="px-5 pt-5 pb-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-float">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
              <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
              <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
              <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
              <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">
              <span className="text-slate-900">Sheet</span>
              <span className="text-emerald-600">Mind</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">AI-Powered Sheets Assistant</p>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="px-5 pb-4 animate-fade-in-up delay-1">
        <div className="flex gap-2">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className={`flex-1 p-2.5 rounded-xl glass-card glass-card-hover animate-fade-in-up delay-${i + 2}`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <FeatureIcon type={f.icon} />
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-tight">{f.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main auth area */}
      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar">
        {/* Welcome heading */}
        <div className="mb-4 animate-fade-in-up delay-3">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === "login" ? "Welcome back" : "Get started free"}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {mode === "login"
              ? "Sign in to continue"
              : "5 free messages to try everything"}
          </p>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-red-700">{error}</p>
                {error.includes("popup") && (
                  <button
                    onClick={handleCheckLogin}
                    className="mt-1.5 text-sm font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
                  >
                    I've logged in
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-scale-in">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-semibold hover:border-slate-300 hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 animate-fade-in-up delay-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">or use email</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3 animate-fade-in-up delay-5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 text-sm border-2 border-slate-100 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all placeholder-slate-300"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-100 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all placeholder-slate-300"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-100 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all placeholder-slate-300"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 btn-primary disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-sm text-slate-400 mt-4 mb-2">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); }}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>

      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-50">
        <p className="text-[10px] text-slate-300 text-center">
          By signing in, you agree to our{" "}
          <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors">Terms</a>
          {" & "}
          <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors">Privacy</a>
        </p>
      </div>
    </div>
  );
}
