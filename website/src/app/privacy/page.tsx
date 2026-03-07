import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — SheetMind',
  description: 'SheetMind privacy policy. Learn how we handle your data.',
  alternates: { canonical: '/privacy' },
  robots: { index: false },
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'data-collected', label: 'Data We Collect' },
  { id: 'data-not-collected', label: 'What We Never Do' },
  { id: 'pii', label: 'PII Detection' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'security', label: 'Data Security' },
  { id: 'retention', label: 'Data Retention' },
  { id: 'rights', label: 'Your Rights' },
  { id: 'contact', label: 'Contact' },
]

function SectionHeading({ id, icon, children }: { id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 font-display font-bold text-xl text-slate-900 mt-12 mb-4 scroll-mt-24"
    >
      <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-600 leading-relaxed mb-4">{children}</p>
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 mb-4">{children}</ul>
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-slate-600">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </li>
  )
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />

      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-28 lg:pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15)_0,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(5,150,105,0.1)_0,transparent_60%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Privacy Policy
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-4">
            Your privacy is a core feature,<br className="hidden sm:block" />
            <span className="text-emerald-400"> not an afterthought</span>
          </h1>
          <p className="text-slate-400 text-sm">Last updated: February 17, 2026</p>
        </div>
      </div>

      {/* Key commitments */}
      <div className="bg-emerald-50 border-y border-emerald-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-emerald-600 mb-4">Our three core commitments</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>,
                title: 'Your sheet data is never stored',
                desc: 'Processed in memory, discarded immediately after each response.',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M18 6L6 18M6 6l12 12" /></svg>,
                title: 'Your data is never sold',
                desc: 'We do not share, sell, or trade your data with third parties.',
              },
              {
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2Z" /></svg>,
                title: 'We never train AI on your data',
                desc: 'Your content is never used to improve AI models.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm text-slate-900 mb-0.5">{item.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
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
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
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
              <div className="mt-8 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Questions about your data?{' '}
                  <a href="mailto:privacy@sheetmind.xyz" className="text-emerald-600 font-medium hover:underline">
                    Email us
                  </a>
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <article className="max-w-2xl">
            <div className="divide-y divide-slate-100">

              <div className="pb-10">
                <SectionHeading id="overview" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                }>
                  Overview
                </SectionHeading>
                <P>
                  SheetMind (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our Google Sheets sidebar addon and website.
                </P>
              </div>

              <div className="py-10">
                <SectionHeading id="data-collected" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10Z" /></svg>
                }>
                  Data We Collect
                </SectionHeading>
                <div className="space-y-4">
                  {[
                    { label: 'Account data', text: 'When you create an account, we collect your name, email address, and authentication credentials. If you sign in with Google, we receive your basic profile information.' },
                    { label: 'Sheet data (temporary)', text: 'When you send a message in the SheetMind sidebar, the relevant sheet data (headers, cell values) is sent to our backend for AI processing. This data is NOT stored permanently — it is processed in memory and discarded after the response is generated.' },
                    { label: 'Conversation history', text: 'Your chat messages and AI responses are stored so you can resume conversations. Message content is associated with your user ID.' },
                    { label: 'Usage data', text: 'We track anonymized usage metrics (message counts, feature usage, session data) via PostHog analytics. We never track the content of your messages or sheet data in analytics.' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="w-1 rounded-full bg-emerald-400 flex-shrink-0 self-stretch" />
                      <div>
                        <p className="font-display font-semibold text-sm text-slate-800 mb-1">{item.label}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-10">
                <SectionHeading id="data-not-collected" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                }>
                  What We Never Do
                </SectionHeading>
                <UL>
                  <LI>Store your raw spreadsheet data permanently</LI>
                  <LI>Track the content of your messages or AI responses in analytics</LI>
                  <LI>Sell your data to third parties</LI>
                  <LI>Use your data to train AI models</LI>
                </UL>
              </div>

              <div className="py-10">
                <SectionHeading id="pii" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                }>
                  PII Detection
                </SectionHeading>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/60 mb-4">
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" />
                    </svg>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      <strong>You are always in control.</strong> SheetMind warns you before processing any data that may contain sensitive information.
                    </p>
                  </div>
                </div>
                <P>
                  SheetMind includes automatic PII (Personally Identifiable Information) detection. Before processing your sheet data, we scan for patterns that may indicate sensitive information (emails, phone numbers, SSNs, etc.) and display a warning banner. This detection happens before data is sent to external AI services — you decide whether to proceed.
                </P>
              </div>

              <div className="py-10">
                <SectionHeading id="third-party" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10Z" /><path d="M2 12h20" /></svg>
                }>
                  Third-Party Services
                </SectionHeading>
                <div className="space-y-3">
                  {[
                    { name: 'Google AI (Gemini)', desc: 'For AI processing of your queries. Subject to Google\'s privacy policy.' },
                    { name: 'Supabase', desc: 'For database and authentication. Data stored with row-level security.' },
                    { name: 'PostHog', desc: 'For anonymized usage analytics. No message content tracked.' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/60 bg-white">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                      <div>
                        <span className="font-semibold text-sm text-slate-800">{item.name}: </span>
                        <span className="text-sm text-slate-500">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-10">
                <SectionHeading id="security" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
                }>
                  Data Security
                </SectionHeading>
                <P>
                  We implement row-level security (RLS) policies on all database tables, ensuring users can only access their own data. All data is transmitted over HTTPS. Authentication tokens are securely stored and never exposed.
                </P>
              </div>

              <div className="py-10">
                <SectionHeading id="retention" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                }>
                  Data Retention
                </SectionHeading>
                <P>
                  Account data is retained as long as your account is active. Conversation history is retained until you delete it or close your account. Sheet data is never retained — it is processed in memory and immediately discarded after each response.
                </P>
              </div>

              <div className="py-10">
                <SectionHeading id="rights" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                }>
                  Your Rights
                </SectionHeading>
                <P>You have the right to:</P>
                <UL>
                  <LI>Access your personal data</LI>
                  <LI>Delete your account and all associated data</LI>
                  <LI>Export your conversation history</LI>
                  <LI>Opt out of analytics tracking</LI>
                </UL>
              </div>

              <div className="pt-10">
                <SectionHeading id="contact" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
                }>
                  Contact
                </SectionHeading>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div>
                    <p className="font-display font-semibold text-slate-900 mb-1">Privacy questions?</p>
                    <p className="text-sm text-slate-500">We&apos;ll respond within 2 business days.</p>
                  </div>
                  <a
                    href="mailto:privacy@sheetmind.xyz"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:-translate-y-0.5 shadow-md shadow-emerald-500/20 transition-all duration-300"
                  >
                    privacy@sheetmind.xyz
                  </a>
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Also see our <a href="/terms" className="text-emerald-600 hover:underline">Terms of Service</a>.
                </p>
              </div>

            </div>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  )
}
