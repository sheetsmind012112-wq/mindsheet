import { useState, useEffect } from "react";
import { usageApi } from "../services/api";
import type { TrialStatus } from "../types/api";
import { trackPricingPageViewed, trackPricingPlanSelected, trackBillingToggleChanged } from "../services/analytics";

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan?: (plan: string) => void;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  popular?: boolean;
  current?: boolean;
}

export function PricingPage({ onBack, onSelectPlan }: PricingPageProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    trackPricingPageViewed();
    usageApi.getTrialStatus()
      .then(setTrialStatus)
      .catch(() => {});
  }, []);

  const plans: Plan[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Try SheetMind with limited messages",
      features: [
        { text: "5 messages total", included: true },
        { text: "Basic AI responses", included: true },
        { text: "Sheet analysis", included: true },
        { text: "Formula generation", included: false },
        { text: "Chart creation", included: false },
        { text: "Priority support", included: false },
      ],
      buttonText: trialStatus?.tier === "free" || !trialStatus?.tier
        ? (trialStatus?.trial_expired ? "Trial Ended" : "Current Plan")
        : "Free Plan",
      current: (trialStatus?.tier === "free" || !trialStatus?.tier) && !trialStatus?.trial_expired,
    },
    {
      name: "Pro",
      price: selectedBilling === "monthly" ? "$9" : "$7",
      period: selectedBilling === "monthly" ? "/month" : "/month (billed annually)",
      description: "For power users and professionals",
      features: [
        { text: "1,000 messages/month", included: true },
        { text: "Advanced AI responses", included: true },
        { text: "Sheet analysis", included: true },
        { text: "Formula generation", included: true },
        { text: "Chart creation", included: true },
        { text: "Email support", included: true },
      ],
      buttonText: trialStatus?.tier === "pro" ? "Current Plan" : "Upgrade to Pro",
      popular: trialStatus?.tier !== "pro",
      current: trialStatus?.tier === "pro",
    },
    {
      name: "Team",
      price: selectedBilling === "monthly" ? "$29" : "$24",
      period: selectedBilling === "monthly" ? "/month" : "/month (billed annually)",
      description: "For teams and businesses",
      features: [
        { text: "Unlimited messages", included: true },
        { text: "Advanced AI responses", included: true },
        { text: "Sheet analysis", included: true },
        { text: "Formula generation", included: true },
        { text: "Chart creation", included: true },
        { text: "Priority support", included: true },
      ],
      buttonText: trialStatus?.tier === "team" ? "Current Plan" : "Contact Sales",
      current: trialStatus?.tier === "team",
    },
  ];

  const handleSelectPlan = async (planName: string) => {
    if (planName === "Free") return;

    trackPricingPlanSelected(planName, selectedBilling);
    setIsLoading(true);
    try {
      // TODO: Integrate with Dodo Payments
      if (onSelectPlan) {
        onSelectPlan(planName);
      } else {
        // For now, show alert
        alert(`Upgrade to ${planName} - Payment integration coming soon!`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800">Pricing</h1>
            <p className="text-xs text-slate-500">Choose the plan that works for you</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Trial status banner */}
        {trialStatus?.is_trial && (
          <div className={`mb-4 p-3 rounded-xl border ${
            trialStatus.trial_expired
              ? "bg-red-50 border-red-200"
              : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="flex items-center gap-2">
              {trialStatus.trial_expired ? (
                <>
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium text-red-700">
                    Your free trial has ended. Upgrade to continue!
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-emerald-700">
                    {trialStatus.trial_remaining} of {trialStatus.trial_limit} free messages remaining
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => { setSelectedBilling("monthly"); trackBillingToggleChanged("monthly"); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                selectedBilling === "monthly"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => { setSelectedBilling("annual"); trackBillingToggleChanged("annual"); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                selectedBilling === "annual"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="ml-1 text-xs text-emerald-600">-20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                plan.popular
                  ? "border-emerald-500 bg-emerald-50/50"
                  : plan.current
                  ? "border-slate-300 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-4">
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-emerald-500 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-800">{plan.price}</span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {feature.included ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${feature.included ? "text-slate-700" : "text-slate-400"}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.name)}
                disabled={plan.current || isLoading}
                className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600"
                    : plan.current
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50"
                } disabled:opacity-50`}
              >
                {isLoading ? "Processing..." : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Have questions?{" "}
            <a href="#" className="text-emerald-600 hover:underline">
              View FAQ
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 bg-white/80">
        <p className="text-xs text-slate-400 text-center">
          Secure payments powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
