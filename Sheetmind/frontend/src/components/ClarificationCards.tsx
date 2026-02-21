import type { Clarification } from "../types/api";

interface ClarificationCardsProps {
  clarification: Clarification;
  disabled: boolean;
  onSelect: (value: string) => void;
}

function TypeIcon({ type, colDesc }: { type: string; colDesc?: string }) {
  const cls = "w-3.5 h-3.5";

  // For column type, infer icon from description
  if (type === "column" && colDesc) {
    const lower = colDesc.toLowerCase();
    if (lower.includes("numeric"))
      return <span className={`${cls} inline-flex items-center justify-center text-[10px] font-bold text-blue-600`}>#</span>;
    if (lower.includes("date"))
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    if (lower.includes("categorical"))
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      );
    // Default: text
    return <span className={`${cls} inline-flex items-center justify-center text-[10px] font-bold text-slate-500`}>Aa</span>;
  }

  if (type === "sheet")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    );

  if (type === "range")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5" />
      </svg>
    );

  return <span className={`${cls} inline-flex items-center justify-center text-[10px] font-bold text-slate-500`}>?</span>;
}

function ClarificationCards({ clarification, disabled, onSelect }: ClarificationCardsProps) {
  return (
    <div className={`mt-2.5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="grid grid-cols-2 gap-1.5">
        {clarification.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opt.value)}
            disabled={disabled}
            className="group flex items-start gap-2 rounded-xl border border-slate-100 p-2.5 text-left bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm active:scale-[0.97] transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
              <TypeIcon type={clarification.type} colDesc={opt.description} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">
                {opt.label}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {opt.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ClarificationCards;
