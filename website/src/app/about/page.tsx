import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'About — SheetMind | Our Mission',
  description: 'SheetMind is the AI sidebar for Google Sheets built for trust, safety, and real utility. Learn our story.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About — SheetMind | Our Mission',
    description: 'SheetMind is the AI sidebar for Google Sheets built for trust, safety, and real utility. Learn our story.',
  },
  twitter: {
    card: 'summary',
    title: 'About — SheetMind | Our Mission',
    description: 'SheetMind is the AI sidebar for Google Sheets built for trust, safety, and real utility. Learn our story.',
  },
}

const values = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
    ),
    title: 'Transparency First',
    description: 'Every AI response shows a confidence score and source references. No black boxes. You always know where the answer came from.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
    ),
    title: 'Privacy by Design',
    description: 'We never store your spreadsheet data. Analytics never track message content. PII is detected and flagged before processing.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13" /></svg>
    ),
    title: 'User Control',
    description: 'Every AI action is undoable. You approve changes before they happen. The AI assists — you decide.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
    ),
    title: 'Accuracy Over Speed',
    description: 'We validate formulas against 120+ functions before applying them. We would rather be slow and correct than fast and wrong.',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 lg:pt-36 pb-16 lg:pb-20 bg-hero-mesh relative">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <div className="pill-badge mx-auto mb-4 w-fit">About Us</div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight">
              AI you can <span className="text-gradient">actually trust</span>
            </h1>
            <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              We built SheetMind because every AI tool for spreadsheets felt like a black box.
              You&apos;d paste a prompt, get output, and have no idea if it was right. We believed
              spreadsheet professionals deserved better — AI that shows its work, lets you verify,
              and gives you an undo button for everything.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight mb-4">
                Our Mission
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Make AI in spreadsheets <strong className="text-slate-800">safe</strong>,{' '}
                <strong className="text-slate-800">transparent</strong>, and{' '}
                <strong className="text-slate-800">genuinely useful</strong> — not just impressive in a demo.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 100}>
                <div className="glass-card glass-card-hover rounded-2xl p-7 h-full">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                    {v.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '120+', label: 'Validated Functions' },
                { value: '52', label: 'Smart Templates' },
                { value: '5', label: 'Chart Types' },
                { value: '15', label: 'Security Policies' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display font-extrabold text-4xl text-emerald-600">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 text-center">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight mb-4">
              Join us
            </h2>
            <p className="text-lg text-slate-500 mb-8">
              Try SheetMind free and see what AI in spreadsheets should feel like.
            </p>
            <a href="/signup" className="btn-primary">
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  )
}
