import { useState, useRef, useEffect } from "react";
import type { ChatMode, SheetInfo, ConversationListResponse, User } from "../types/api";
import { usageApi } from "../services/api";
import { trackHistoryPanelOpened } from "../services/analytics";

interface HeaderProps {
  onNewChat: () => void;
  sheetName?: string;
  rowCount?: number;
  isConnected?: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  sheets: SheetInfo[];
  selectedSheet: string | null;
  onSheetChange: (sheetName: string) => void;
  onShowPricing?: () => void;
  conversations?: ConversationListResponse["conversations"];
  activeConversationId?: string | null;
  onLoadConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  user?: User | null;
  onLogout?: () => void;
  usageRefreshKey?: number;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Header({
  onNewChat,
  isConnected = true,
  onShowPricing,
  conversations = [],
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
  user,
  onLogout,
  usageRefreshKey = 0,
}: HeaderProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usageUsed, setUsageUsed] = useState<number | null>(null);
  const [usageLimit, setUsageLimit] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch usage stats when menu opens or after messages
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(() => { cancelled = true; }, 8000);
    usageApi.getTrialStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.is_trial) {
          setUsageUsed(status.trial_used ?? 0);
          setUsageLimit(status.trial_limit ?? 5);
        } else {
          setUsageUsed(status.monthly_used ?? 0);
          setUsageLimit(status.monthly_limit ?? 1000);
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user, usageRefreshKey]);

  // Close panels when clicking outside
  useEffect(() => {
    if (!showHistory && !showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (showHistory && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showHistory, showUserMenu]);

  const userInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const tierLabel = user?.tier === "pro" ? "Pro" : user?.tier === "team" ? "Team" : "Free";

  return (
    <header className="border-b border-slate-100 bg-white flex-shrink-0 relative">
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500" />

      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
                <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
                <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
                <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
                <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-sm">
                <span className="text-slate-900">Sheet</span>
                <span className="text-emerald-600">Mind</span>
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} ${isConnected ? 'shadow-sm shadow-emerald-300' : ''}`} />
                <span className="text-[10px] text-slate-400 font-medium">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Pro/Team badge OR Upgrade button for free users */}
            {user?.tier === "pro" ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full shadow-sm">
                PRO
              </span>
            ) : user?.tier === "team" ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full shadow-sm">
                TEAM
              </span>
            ) : onShowPricing ? (
              <button
                onClick={onShowPricing}
                className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all hover:shadow-sm active:scale-[0.97]"
              >
                Upgrade
              </button>
            ) : null}
            {/* History button */}
            <button
              onClick={() => { setShowHistory((v) => { if (!v) trackHistoryPanelOpened(); return !v; }); }}
              className={`p-1.5 rounded-lg transition-all ${
                showHistory
                  ? "text-emerald-600 bg-emerald-50 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              title="Chat History"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* New chat button */}
            <button
              onClick={() => { onNewChat(); setShowHistory(false); }}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-[0.93]"
              title="New Chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            {/* User avatar button */}
            {user && (
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-[0.93] ${
                  showUserMenu
                    ? "ring-2 ring-emerald-400 ring-offset-1"
                    : "hover:ring-2 hover:ring-slate-200"
                }`}
                title={user.name || user.email}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
                    {userInitial}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User account dropdown */}
      {showUserMenu && user && (
        <div
          ref={userMenuRef}
          className="absolute top-full right-0 z-50 w-56 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 mt-1 mr-3 animate-slide-down overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name || "User"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.tier === "pro"
                  ? "bg-emerald-100 text-emerald-700"
                  : user.tier === "team"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {tierLabel} Plan
              </span>
            </div>
          </div>
          {/* Usage stats row */}
          {usageUsed !== null && usageLimit !== null && (
            <div className="px-4 py-2.5 border-b border-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-slate-500">Messages used</span>
                <span className="text-[10px] font-bold text-slate-700">
                  {usageUsed.toLocaleString()} / {usageLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (usageUsed / usageLimit) >= 0.9
                      ? "bg-red-500"
                      : (usageUsed / usageLimit) >= 0.7
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min((usageUsed / usageLimit) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {(usageLimit - usageUsed).toLocaleString()} remaining{user.tier !== "free" ? " this month" : ""}
              </p>
            </div>
          )}
          {onShowPricing && (user.tier === "free") && (
            <button
              onClick={() => { setShowUserMenu(false); onShowPricing(); }}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Upgrade to Pro
            </button>
          )}
          {onLogout && (
            <button
              onClick={() => { setShowUserMenu(false); onLogout(); }}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-slate-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          )}
        </div>
      )}

      {/* Conversation history dropdown */}
      {showHistory && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-xl shadow-slate-200/50 max-h-72 overflow-y-auto custom-scrollbar animate-slide-down"
        >
          <div className="px-4 py-2 border-b border-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Chats</p>
          </div>
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-slate-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">No conversations yet</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Start chatting to see history here</p>
            </div>
          ) : (
            <ul className="py-1">
              {conversations.map((conv, i) => (
                <li
                  key={conv.id}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-all animate-fade-in-up ${
                    conv.id === activeConversationId
                      ? "bg-emerald-50/50 border-l-2 border-emerald-500"
                      : "hover:bg-slate-50/80 border-l-2 border-transparent"
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => {
                    onLoadConversation?.(conv.id);
                    setShowHistory(false);
                  }}
                >
                  {/* Chat icon */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    conv.id === activeConversationId ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">
                      {conv.title || "Untitled"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {timeAgo(conv.updated_at || conv.created_at)}
                    </div>
                  </div>
                  {/* Delete button */}
                  {onDeleteConversation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-[0.9]"
                      title="Delete conversation"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
