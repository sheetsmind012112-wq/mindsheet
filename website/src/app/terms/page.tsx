import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service — SheetMind',
  description: 'SheetMind terms of service. Read our terms before using the product.',
  alternates: { canonical: '/terms' },
  robots: { index: false },
}

const sections = [
  { id: 'acceptance', label: '1. Acceptance of Terms' },
  { id: 'service', label: '2. Description of Service' },
  { id: 'account', label: '3. Account Registration' },
  { id: 'acceptable-use', label: '4. Acceptable Use' },
  { id: 'billing', label: '5. Subscription & Billing' },
  { id: 'ai-content', label: '6. AI-Generated Content' },
  { id: 'privacy', label: '7. Data & Privacy' },
  { id: 'ip', label: '8. Intellectual Property' },
  { id: 'liability', label: '9. Limitation of Liability' },
  { id: 'changes', label: '10. Changes to Terms' },
  { id: 'contact', label: '11. Contact' },
]

function Section({ id, num, title, icon, children }: {
  id: string
  num: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div id={id} className="py-10 border-b border-slate-100 last:border-0 scroll-mt-24">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
          {icon}
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{num}</span>
          <h2 className="font-display font-bold text-xl text-slate-900 tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="pl-14">{children}</div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-600 leading-relaxed mb-4 last:mb-0">{children}</p>
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 mb-4">{children}</ul>
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-slate-600">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-1">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  )
}

export default function TermsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />

      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-28 lg:pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12)_0,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(5,150,105,0.08)_0,transparent_60%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/60 border border-slate-600/50 text-slate-300 text-sm font-medium mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            Terms of Service
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-4">
            Simple, plain-language terms
          </h1>
          <p className="text-slate-400 mb-6">Last updated: February 17, 2026</p>
        </div>
      </div>

      {/* TL;DR summary */}
      <div className="bg-slate-50 border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-slate-400 mb-4">TL;DR — The short version</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '✅', text: 'Use SheetMind for legitimate work on data you own or have rights to.' },
              { icon: '💳', text: 'Paid plans are billed monthly or annually. Cancel anytime — takes effect at period end.' },
              { icon: '🤖', text: 'AI outputs may have errors. Always review before relying on them. You stay responsible.' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content + TOC */}
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">

          {/* Sticky TOC — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-slate-400 mb-3">Sections</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-slate-500 hover:text-emerald-600 py-1 border-l-2 border-transparent hover:border-emerald-400 pl-3 transition-all duration-200"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Legal questions?{' '}
                  <a href="mailto:legal@sheetmind.xyz" className="text-emerald-600 font-medium hover:underline">
                    Email us
                  </a>
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <article className="max-w-2xl">

            <Section id="acceptance" num="Section 1" title="Acceptance of Terms" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            }>
              <P>By accessing or using SheetMind (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</P>
            </Section>

            <Section id="service" num="Section 2" title="Description of Service" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10Z" /></svg>
            }>
              <P>SheetMind is an AI-powered sidebar addon for Google Sheets that provides conversational data analysis, formula generation, chart creation, and spreadsheet automation. The Service is provided as-is and may be updated, modified, or discontinued at any time.</P>
            </Section>

            <Section id="account" num="Section 3" title="Account Registration" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            }>
              <P>To use the Service, you must create an account using a valid email address or Google authentication. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Service.</P>
            </Section>

            <Section id="acceptable-use" num="Section 4" title="Acceptable Use" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            }>
              <P>You agree not to:</P>
              <UL>
                <LI>Use the Service for any illegal purpose</LI>
                <LI>Attempt to reverse-engineer, decompile, or extract the source code</LI>
                <LI>Use the Service to process data you do not have the right to process</LI>
                <LI>Share your account credentials with others</LI>
                <LI>Attempt to circumvent rate limits or usage restrictions</LI>
                <LI>Use automated tools to access the Service beyond the provided API</LI>
              </UL>
            </Section>

            <Section id="billing" num="Section 5" title="Subscription & Billing" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>
            }>
              <P>SheetMind offers Free, Pro, and Team subscription tiers. Paid subscriptions are billed monthly or annually. You may cancel at any time — cancellation takes effect at the end of the current billing period. No refunds are provided for partial billing periods.</P>
              <div className="mt-4 flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <p className="text-sm text-blue-800">Cancel anytime — no lock-in. The Free plan is free forever.</p>
              </div>
            </Section>

            <Section id="ai-content" num="Section 6" title="AI-Generated Content" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2Z" /></svg>
            }>
              <P>SheetMind uses artificial intelligence to generate responses, formulas, and actions. While we strive for accuracy, AI-generated content may contain errors. You are responsible for reviewing and verifying all AI outputs before relying on them.</P>
              <P>SheetMind provides confidence scores and source references to assist with verification, but these are not guarantees of accuracy.</P>
            </Section>

            <Section id="privacy" num="Section 7" title="Data & Privacy" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            }>
              <P>
                Your use of the Service is also governed by our{' '}
                <a href="/privacy" className="text-emerald-600 font-medium hover:underline">Privacy Policy</a>.
                By using the Service, you consent to the collection and use of data as described in the Privacy Policy.
              </P>
            </Section>

            <Section id="ip" num="Section 8" title="Intellectual Property" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            }>
              <P>The Service, including its design, code, and content, is the intellectual property of SheetMind. Your data remains your property. We claim no ownership over your spreadsheet data or conversation content.</P>
            </Section>

            <Section id="liability" num="Section 9" title="Limitation of Liability" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
            }>
              <P>SheetMind is provided &quot;as is&quot; without warranty of any kind. We are not liable for any damages arising from the use of the Service, including but not limited to data loss, incorrect AI outputs, or service interruptions.</P>
              <P>Our total liability is limited to the amount you paid for the Service in the 12 months preceding the claim.</P>
            </Section>

            <Section id="changes" num="Section 10" title="Changes to Terms" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            }>
              <P>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of material changes via email or in-app notification.</P>
            </Section>

            <Section id="contact" num="Section 11" title="Contact" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
            }>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <p className="font-display font-semibold text-slate-900 mb-1">Legal questions?</p>
                  <p className="text-sm text-slate-500">We&apos;ll respond within 2 business days.</p>
                </div>
                <a
                  href="mailto:legal@sheetmind.xyz"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:-translate-y-0.5 shadow-md shadow-emerald-500/20 transition-all duration-300"
                >
                  legal@sheetmind.xyz
                </a>
              </div>
              <p className="mt-6 text-sm text-slate-400">
                Also see our <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>.
              </p>
            </Section>

          </article>
        </div>
      </div>

      <Footer />
    </main>
  )
}
