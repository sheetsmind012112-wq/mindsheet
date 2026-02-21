import { useState, useRef, useEffect } from "react";
import type { QuickAction, ChatMode, SheetInfo } from "../types/api";

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  quickActions?: QuickAction[];
  onQuickAction?: (prompt: string) => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  sheets: SheetInfo[];
  selectedSheet: string | null;
  onSheetChange: (sheetName: string) => void;
  sheetName?: string;
  rowCount?: number;
  trialExpired?: boolean;
}

const MAX_HISTORY = 50;

function InputArea({
  onSend,
  isLoading,
  quickActions,
  onQuickAction,
  mode,
  onModeChange,
  sheets,
  selectedSheet,
  onSheetChange,
  sheetName,
  trialExpired = false,
}: InputAreaProps) {
  const [message, setMessage] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedMessage, setSavedMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleSend = () => {
    const text = message.trim();
    if (!text || isLoading) return;

    const history = commandHistoryRef.current;
    if (history[0] !== text) {
      history.unshift(text);
      if (history.length > MAX_HISTORY) {
        history.pop();
      }
    }

    onSend(text);
    setMessage("");
    setHistoryIndex(-1);
    setSavedMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const history = commandHistoryRef.current;
      if (history.length === 0) return;
      if (historyIndex === -1) {
        setSavedMessage(message);
      }
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setMessage(history[newIndex]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const history = commandHistoryRef.current;
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setMessage(savedMessage);
        return;
      }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setMessage(history[newIndex]);
      return;
    }
  };

  const hasQuickActions = quickActions && quickActions.length > 0;

  return (
    <div className="border-t border-slate-100 bg-white">
      {/* Quick actions */}
      {hasQuickActions && !isLoading && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 animate-fade-in">
          {quickActions.slice(0, 4).map((qa, i) => (
            <button
              key={i}
              onClick={() => onQuickAction?.(qa.prompt)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-100 hover:border-emerald-200 active:scale-[0.97] transition-all"
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 pb-2">
        <div className="flex items-end gap-2 bg-slate-50/80 rounded-2xl p-2 border border-slate-100 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100/50 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={trialExpired ? "Free trial ended — upgrade to continue" : "Ask anything about your data..."}
            rows={1}
            disabled={isLoading || trialExpired}
            style={{ resize: 'none' }}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading || trialExpired}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-2.5 text-white hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-30 disabled:hover:shadow-none active:scale-[0.93] transition-all"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div className="px-3 pb-2.5 flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex gap-0.5 p-0.5 bg-slate-50 rounded-lg border border-slate-100">
          <button
            onClick={() => onModeChange("action")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "action"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Creates sheets & formulas"
          >
            Action
          </button>
          <button
            onClick={() => onModeChange("chat")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "chat"
                ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Answers questions only"
          >
            Chat
          </button>
        </div>

        {/* Sheet selector */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v4H7V7zm0 6h4v4H7v-4zm6-6h4v4h-4V7zm0 6h4v4h-4v-4z"/>
            </svg>
          </div>
          {sheets.length > 0 ? (
            <select
              value={selectedSheet || ""}
              onChange={(e) => onSheetChange(e.target.value)}
              className="flex-1 text-xs bg-white border border-slate-100 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300 min-w-0 font-medium"
            >
              {sheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheet.name} ({sheet.rowCount})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-slate-400 truncate font-medium">
              {sheetName || "Loading..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputArea;
