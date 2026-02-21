import { useState, useEffect } from "react";
import { usageApi } from "../services/api";
import type { TrialStatus } from "../types/api";

interface TrialBannerProps {
  onUpgradeClick?: () => void;
  refreshKey?: number; // increment to trigger refresh
}

export function TrialBanner({ onUpgradeClick, refreshKey = 0 }: TrialBannerProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadTrialStatus();
  }, [refreshKey]);

  const loadTrialStatus = async () => {
    try {
      setLoading(true);
      const status = await usageApi.getTrialStatus();
      setTrialStatus(status);
      setError(null);
    } catch (err) {
      setError("Failed to load trial status");
    } finally {
      setLoading(false);
    }
  };

  if (loading || error || !trialStatus) {
    return null;
  }

  // ---------- PRO / TEAM users: Show usage stats ----------
  if (!trialStatus.is_trial) {
    const used = trialStatus.monthly_used ?? 0;
    const limit = trialStatus.monthly_limit ?? 1000;
    const remaining = trialStatus.monthly_remaining ?? (limit - used);
    const pct = Math.min((used / limit) * 100, 100);

    // Don't show if dismissed and usage is under 80%
    if (dismissed && pct < 80) {
      return null;
    }

    // Color shifts: green → amber → red as usage climbs
    let barColor = "bg-emerald-500";
    let bgColor = "bg-emerald-50/60 border-emerald-100";
    let textColor = "text-emerald-700";
    if (pct >= 90) {
      barColor = "bg-red-500";
      bgColor = "bg-red-50/60 border-red-100";
      textColor = "text-red-700";
    } else if (pct >= 70) {
      barColor = "bg-amber-500";
      bgColor = "bg-amber-50/60 border-amber-100";
      textColor = "text-amber-700";
    }

    return (
      <div className={`mx-3 mt-2 ${bgColor} border rounded-xl p-2.5 mb-2 relative`}>
        {/* Close button (only if under 90%) */}
        {pct < 90 && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2 pr-5">
          <svg className={`w-4 h-4 ${textColor} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className={`text-xs font-medium ${textColor}`}>
            <span className="font-bold">{used.toLocaleString()}</span> / {limit.toLocaleString()} messages used
          </span>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {remaining.toLocaleString()} left
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // ---------- FREE tier users: Trial banner ----------

  // Don't show if user dismissed (but always show when expired)
  if (dismissed && trialStatus.trial_remaining !== 0 && !trialStatus.trial_expired) {
    return null;
  }

  const remaining = trialStatus.trial_remaining ?? 0;
  const total = trialStatus.trial_limit ?? 5;
  const expired = trialStatus.trial_expired;

  // Banner colors based on remaining trials
  let bgColor = "bg-emerald-50 border-emerald-200";
  let textColor = "text-emerald-800";
  let iconColor = "text-emerald-500";

  if (remaining <= 2 && remaining > 0) {
    bgColor = "bg-amber-50 border-amber-200";
    textColor = "text-amber-800";
    iconColor = "text-amber-500";
  } else if (expired || remaining === 0) {
    bgColor = "bg-red-50 border-red-200";
    textColor = "text-red-800";
    iconColor = "text-red-500";
  }

  // Expired — prominent blocked banner
  if (expired || remaining === 0) {
    return (
      <div className="mx-3 mt-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-3 animate-scale-in">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm font-bold text-red-800">Free trial ended</span>
        </div>
        <p className="text-xs text-red-600 mb-3 leading-relaxed">
          You've used all {total} free messages. Upgrade to Pro for 1,000 messages per month.
        </p>
        <button
          onClick={onUpgradeClick}
          className="w-full text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg transition-all active:scale-[0.98]"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className={`mx-3 mt-2 ${bgColor} border rounded-xl p-3 mb-3 relative`}>
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-2 pr-5">
        <svg className={`w-4 h-4 ${iconColor} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`text-xs font-medium ${textColor}`}>
          <span className="font-bold">{remaining}</span> of {total} free messages left
        </span>

        {remaining <= 2 && (
          <button
            onClick={onUpgradeClick}
            className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 transition-all"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            remaining <= 2 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${(remaining / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Compact version for header
export function TrialBadge({ onClick }: { onClick?: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    usageApi.getTrialStatus()
      .then(status => {
        setIsTrial(status.is_trial);
        setRemaining(status.trial_remaining ?? 0);
      })
      .catch(() => {});
  }, []);

  if (!isTrial || remaining === null) {
    return null;
  }

  const bgColor = remaining <= 2
    ? (remaining === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")
    : "bg-emerald-100 text-emerald-700";

  return (
    <button
      onClick={onClick}
      className={`${bgColor} text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity`}
    >
      <span>{remaining === 0 ? "Trial ended" : `${remaining} free left`}</span>
    </button>
  );
}
