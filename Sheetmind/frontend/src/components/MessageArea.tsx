import { useEffect, useRef, useState } from "react";
import type { Message, StepAction, AgentReasoningStep } from "../types/api";
import ChartDisplay from "./ChartDisplay";
import ClarificationCards from "./ClarificationCards";

interface MessageAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  responseTime: number | null;
  onUndo?: (messageId: string) => void;
  onQuickAction?: (prompt: string) => void;
  onClarificationSelect?: (messageId: string, value: string) => void;
}

// Extended step with runtime status
interface StepWithStatus extends StepAction {
  _status?: string;
  _result?: string;
}

const SUGGESTIONS = [
  { icon: "sparkle", label: "Summarize this sheet", prompt: "Give me a summary of this data" },
  { icon: "formula", label: "Find duplicates", prompt: "Find duplicate rows" },
  { icon: "chart", label: "Create a chart", prompt: "Create a chart from this data" },
  { icon: "sort", label: "Top performers", prompt: "Show the top 10 values" },
];

function SuggestionIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  if (type === "sparkle") return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
  if (type === "formula") return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
  if (type === "chart") return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-7.5L16.5 3m0 0L12 7.5m4.5-4.5v13.5" />
    </svg>
  );
}

// Animated typing indicator with status messages
function TypingIndicator({ startTime }: { startTime: number }) {
  const [dots, setDots] = useState("");
  const [statusMessage, setStatusMessage] = useState("Thinking");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);

    const timeInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed < 2) setStatusMessage("Reading your data");
      else if (elapsed < 5) setStatusMessage("Analyzing the request");
      else if (elapsed < 8) setStatusMessage("Creating execution plan");
      else if (elapsed < 12) setStatusMessage("Generating formulas");
      else setStatusMessage("Almost there");
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timeInterval);
    };
  }, [startTime]);

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="max-w-[85%] w-full">
        <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 border border-emerald-200/60 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6">
                <svg className="w-6 h-6 text-emerald-600 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div className="absolute inset-0 w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-sm font-semibold text-emerald-800">
                {statusMessage}{dots}
              </span>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {elapsedSeconds}s
            </span>
          </div>

          <div className="h-1 bg-slate-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(95, (elapsedSeconds / 15) * 100)}%`,
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          </div>

          <div className="mt-3 space-y-2">
            <div className="h-3 bg-white/60 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-white/60 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: StepWithStatus }) {
  const status = step._status || "pending";

  const statusIcon =
    status === "done" ? "✅"
      : status === "executing" ? "⏳"
      : status === "error" ? "❌"
      : "⏸️";

  const borderColor =
    status === "done" ? "border-green-200 bg-green-50/50"
      : status === "executing" ? "border-emerald-300 bg-emerald-50/50 animate-pulse"
      : status === "error" ? "border-red-200 bg-red-50/50"
      : "border-slate-100 bg-slate-50/30";

  return (
    <div className={`rounded-xl border px-3 py-2 mb-1.5 transition-all duration-300 ${borderColor}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0 mt-0.5">{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800">
            Step {step.step}: {step.description}
          </p>
          {step.formula && (
            <code className="block mt-1 text-xs bg-slate-100 rounded-lg px-2 py-1 text-emerald-700 font-mono overflow-x-auto">
              {step.formula}
            </code>
          )}
          {step.about && (
            <p className="mt-0.5 text-xs text-slate-500">{step.about}</p>
          )}
          {step._result && status === "error" && (
            <p className="mt-0.5 text-xs text-red-600">{step._result}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReasoningSteps({ steps, autoExpand = false }: { steps: AgentReasoningStep[]; autoExpand?: boolean }) {
  const [expanded, setExpanded] = useState(autoExpand);

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
      const timer = setTimeout(() => setExpanded(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [autoExpand]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-600 transition-colors mb-1 w-full"
      >
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-medium">Agent Reasoning</span>
        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
          {steps.length} steps
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 mt-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50/50 to-white p-3 text-xs animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {step.step}
                </span>
                <div className="flex-1 min-w-0">
                  {step.thought && (
                    <div className="mb-2 p-2 bg-blue-50/60 rounded-lg border-l-2 border-blue-300">
                      <p className="text-slate-600">
                        <span className="font-semibold text-blue-600">Thought:</span>{" "}
                        {step.thought}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-medium text-slate-500">Tool:</span>
                    <code className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono text-xs">
                      {step.tool}
                    </code>
                  </div>
                  {step.tool_input && (
                    <p className="text-slate-500 mt-1 font-mono text-xs bg-slate-50 p-1.5 rounded-lg overflow-x-auto">
                      {step.tool_input}
                    </p>
                  )}
                  {step.result && (
                    <div className="mt-1.5 p-1.5 bg-green-50/60 rounded-lg border border-green-100">
                      <p className="text-green-700 text-xs">
                        <span className="font-medium">Result:</span>{" "}
                        {step.result.substring(0, 150)}
                        {step.result.length > 150 && "..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rich Message Renderer ──────────────────────────────────────────
// Parses AI text into formatted blocks with clickable option buttons.

interface FollowUpOption {
  number: string;
  text: string;
}

interface ParsedBlock {
  type: "heading" | "paragraph" | "bullets" | "numbered" | "code" | "options" | "divider" | "keyvalue";
  content: string;
  items?: string[];
  options?: FollowUpOption[];
  questionText?: string;
}

function parseMessageContent(text: string): ParsedBlock[] {
  const lines = text.trim().split("\n");
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // Divider (--- or ***)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "divider", content: "" });
      i++; continue;
    }

    // Heading (# or ## or ###)
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: "heading", content: headingMatch[1] });
      i++; continue;
    }

    // Bold-only line as heading (e.g. **Summary**)
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      blocks.push({ type: "heading", content: trimmed.replace(/\*\*/g, "").replace(/:$/, "") });
      i++; continue;
    }

    // Key-value line: **Label:** value
    const kvMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s+(.+)/);
    if (kvMatch) {
      blocks.push({ type: "keyvalue", content: `${kvMatch[1]}|||${kvMatch[2]}` });
      i++; continue;
    }

    // Bullet list (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullets", content: "", items });
      continue;
    }

    // Numbered list — check if it's clickable options (after a question)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: FollowUpOption[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)/);
        if (m) items.push({ number: m[1], text: m[2] });
        i++;
      }

      // If the previous block was a paragraph ending with ? or :, treat as clickable options
      const prev = blocks[blocks.length - 1];
      const isQuestion = prev && prev.type === "paragraph" && /[?:]$/.test(prev.content.trim());

      if (isQuestion && items.length >= 2 && items.length <= 6) {
        const questionText = prev.content;
        blocks.pop(); // remove the question paragraph
        blocks.push({ type: "options", content: "", options: items, questionText });
      } else {
        blocks.push({ type: "numbered", content: "", items: items.map(o => o.text) });
      }
      continue;
    }

    // Code block (```)
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++; // skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    // Regular paragraph
    blocks.push({ type: "paragraph", content: trimmed });
    i++;
  }

  return blocks;
}

/** Inline formatting: **bold**, *italic*, `code` */
function renderInlineFormatting(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold text-slate-900">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic text-slate-600">{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<code key={key++} className="px-1.5 py-0.5 bg-slate-100 text-emerald-700 rounded-md text-xs font-mono">{match[6]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function RichMessage({ content, onOptionClick }: { content: string; onOptionClick?: (text: string) => void }) {
  const blocks = parseMessageContent(content);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h3 key={i} className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full flex-shrink-0" />
                {renderInlineFormatting(block.content)}
              </h3>
            );

          case "keyvalue":
            const [label, value] = block.content.split("|||");
            return (
              <div key={i} className="flex items-baseline gap-2 pl-2 py-1 border-l-2 border-emerald-100">
                <span className="text-xs font-semibold text-slate-700 flex-shrink-0">{label}:</span>
                <span className="text-sm text-slate-600">{renderInlineFormatting(value)}</span>
              </div>
            );

          case "bullets":
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {block.items!.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                    <span className="text-slate-700 leading-relaxed">{renderInlineFormatting(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case "numbered":
            return (
              <ol key={i} className="space-y-1.5 pl-1">
                {block.items!.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      {j + 1}
                    </span>
                    <span className="text-slate-700 leading-relaxed">{renderInlineFormatting(item)}</span>
                  </li>
                ))}
              </ol>
            );

          case "options":
            return (
              <div key={i} className="space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed">{renderInlineFormatting(block.questionText || "")}</p>
                <div className="flex flex-col gap-1.5">
                  {block.options!.map((opt, j) => (
                    <button
                      key={j}
                      onClick={() => onOptionClick?.(opt.text)}
                      className="group flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50/50 to-white hover:from-emerald-50 hover:to-emerald-100 hover:border-emerald-200 hover:shadow-sm active:scale-[0.98] transition-all"
                    >
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors">
                        {opt.number}
                      </span>
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                        {renderInlineFormatting(opt.text)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );

          case "code":
            return (
              <pre key={i} className="bg-gray-900 text-green-400 text-xs rounded-xl p-3 overflow-x-auto font-mono leading-relaxed">
                {block.content}
              </pre>
            );

          case "divider":
            return <hr key={i} className="border-slate-100" />;

          case "paragraph":
          default:
            return (
              <p key={i} className="text-sm text-slate-700 leading-relaxed">
                {renderInlineFormatting(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
}

function RAGBadge({ timing }: { timing?: { rag_ms?: number; agent_ms?: number; total_ms?: number } }) {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 font-medium border border-purple-100">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Semantic Search
      </span>
      {timing && (
        <div className="flex gap-2 text-slate-400">
          {timing.rag_ms !== undefined && timing.rag_ms > 0 && (
            <span className="tabular-nums">RAG: {timing.rag_ms}ms</span>
          )}
          {timing.agent_ms !== undefined && (
            <span className="tabular-nums">Agent: {timing.agent_ms}ms</span>
          )}
        </div>
      )}
    </div>
  );
}

function MessageArea({ messages, isLoading, error, responseTime, onUndo, onQuickAction, onClarificationSelect }: MessageAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loadingStartTime, setLoadingStartTime] = useState(() => Date.now());

  useEffect(() => {
    if (isLoading) {
      setLoadingStartTime(Date.now());
    }
  }, [isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Empty state — welcoming and inviting
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        {/* Animated logo */}
        <div className="relative mb-5 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-float">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
              <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
              <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
              <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
              <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          {/* Decorative ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-emerald-200 animate-ping opacity-20" />
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-1 animate-fade-in-up delay-1">
          What can I help with?
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-[240px] mb-6 animate-fade-in-up delay-2">
          Ask anything about your spreadsheet data. I can analyze, create formulas, and build charts.
        </p>

        {/* Suggestion cards */}
        <div className="w-full grid grid-cols-2 gap-2 animate-fade-in-up delay-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onQuickAction?.(s.prompt)}
              className="group flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/30 active:scale-[0.97] transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                <SuggestionIcon type={s.icon} />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 leading-tight pt-0.5">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
      {messages.map((msg, msgIndex) => (
        <div
          key={msg.id}
          className={`flex animate-fade-in-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          style={{ animationDelay: `${Math.min(msgIndex * 0.05, 0.3)}s` }}
        >
          <div
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
              msg.role === "user"
                ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-white border border-slate-100 text-slate-800 shadow-sm hover:shadow-md transition-shadow"
            }`}
          >
            {/* PII warning banner */}
            {msg.role === "assistant" && msg.pii_warning && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <span>{msg.pii_warning}</span>
              </div>
            )}

            {/* RAG indicator */}
            {msg.role === "assistant" && msg.used_rag && (
              <div className="mb-3 pb-2 border-b border-slate-50">
                <RAGBadge timing={msg.agent_timing} />
              </div>
            )}

            {/* Thinking section */}
            {msg.role === "assistant" && msg.thinking && (
              <div className="mb-3 pb-2 border-b border-slate-50">
                <p className="text-xs text-slate-500 italic bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  {msg.thinking}
                </p>
              </div>
            )}

            {/* Text content */}
            {msg.role === "assistant" ? (
              <RichMessage content={msg.content} onOptionClick={onQuickAction} />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}

            {/* Step execution cards */}
            {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                  Execution Plan ({msg.steps.length} steps)
                </p>
                {(msg.steps as StepWithStatus[]).map((step, i) => (
                  <StepCard key={i} step={step} />
                ))}
                {msg.verification && (
                  <div className={`mt-2 p-2.5 rounded-xl text-xs ${
                    msg.verification.verification === "PASSED"
                      ? "bg-green-50/60 border border-green-100"
                      : msg.verification.verification === "PASSED_WITH_FIXES"
                        ? "bg-yellow-50/60 border border-yellow-100"
                        : "bg-red-50/60 border border-red-100"
                  }`}>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{msg.verification.verification === "PASSED" ? "✅" : msg.verification.verification === "PASSED_WITH_FIXES" ? "🔧" : "⚠️"}</span>
                      <span className={
                        msg.verification.verification === "PASSED" ? "text-green-700"
                          : msg.verification.verification === "PASSED_WITH_FIXES" ? "text-yellow-700"
                          : "text-red-700"
                      }>
                        {msg.verification.verification === "PASSED" ? "All actions verified"
                          : msg.verification.verification === "PASSED_WITH_FIXES" ? "Auto-fixed and ready"
                          : "Needs review"}
                      </span>
                      <span className="text-slate-400">({msg.verification.total_actions} actions)</span>
                    </div>
                    {msg.verification.fixes_applied && msg.verification.fixes_applied.length > 0 && (
                      <ul className="mt-1 ml-5 text-yellow-600 list-disc">
                        {msg.verification.fixes_applied.map((fix, i) => (
                          <li key={i}>{fix}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {/* Undo button */}
                {msg.undoInfo && !msg.undone && onUndo && (
                  <button
                    onClick={() => onUndo(msg.id)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-100 hover:border-red-200 rounded-xl active:scale-[0.97] transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10h10a5 5 0 0 1 0 10H9" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 14L3 10l4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Undo changes
                  </button>
                )}
                {msg.undone && (
                  <p className="mt-2 text-xs text-slate-400 italic">Changes undone</p>
                )}
              </div>
            )}

            {/* Clarification Cards */}
            {msg.role === "assistant" && msg.clarification && (
              <ClarificationCards
                clarification={msg.clarification}
                disabled={!!msg.clarificationAnswered}
                onSelect={(value) => onClarificationSelect?.(msg.id, value)}
              />
            )}

            {/* Reasoning Steps */}
            {msg.role === "assistant" && msg.reasoning_steps && msg.reasoning_steps.length > 0 && (
              <ReasoningSteps
                steps={msg.reasoning_steps}
                autoExpand={msgIndex === messages.length - 1}
              />
            )}

            {/* Sources */}
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-50">
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Sources</p>
                <div className="flex flex-wrap gap-1">
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-default border border-slate-100"
                    >
                      {src.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            {msg.role === "assistant" && msg.chart_config && (
              <div className="mt-3">
                <ChartDisplay config={msg.chart_config} />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading state */}
      {isLoading && <TypingIndicator startTime={loadingStartTime} />}

      {error && (
        <div className="mx-auto max-w-[90%] rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2 animate-scale-in">
          <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {responseTime !== null && !isLoading && messages.length > 0 && (
        <div className="flex justify-center items-center gap-2 py-1 animate-fade-in">
          <span className="text-[10px] text-slate-300 tabular-nums">
            {responseTime < 1000
              ? `${responseTime}ms`
              : `${(responseTime / 1000).toFixed(1)}s`}
          </span>
          {messages.length > 0 && messages[messages.length - 1].agent_timing?.total_ms && (
            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full tabular-nums border border-purple-100">
              Agent: {(messages[messages.length - 1].agent_timing!.total_ms! / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageArea;
