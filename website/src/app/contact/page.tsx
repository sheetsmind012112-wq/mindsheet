import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'Contact — SheetMind | Get in Touch',
  description: 'Have questions about SheetMind? Get in touch with our team for support, sales, or partnership inquiries.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact — SheetMind | Get in Touch',
    description: 'Have questions about SheetMind? Get in touch with our team for support, sales, or partnership inquiries.',
  },
  twitter: {
    card: 'summary',
    title: 'Contact — SheetMind | Get in Touch',
    description: 'Have questions about SheetMind? Get in touch with our team for support, sales, or partnership inquiries.',
  },
}

const contactMethods = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>
    ),
    title: 'Email Us',
    description: 'For general inquiries and support.',
    action: 'hello@sheetmind.xyz',
    href: 'mailto:hello@sheetmind.xyz',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10Z" /></svg>
    ),
    title: 'Live Chat',
    description: 'Available for Pro and Team plans.',
    action: 'Start a conversation',
    href: '#',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" /></svg>
    ),
    title: 'Twitter / X',
    description: 'Follow us for updates and tips.',
    action: '@sheetmind',
    href: '#',
  },
]

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 lg:pt-36 pb-24 lg:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <div className="pill-badge mx-auto mb-4 w-fit">Contact</div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-slate-900 tracking-tight">
              Get in <span className="text-gradient">touch</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              Have a question, need help, or want to explore a partnership? We&apos;d love to hear from you.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact methods */}
            <div className="lg:col-span-2 space-y-4">
              {contactMethods.map((method, i) => (
                <ScrollReveal key={method.title} delay={i * 80}>
                  <a href={method.href} className="block glass-card glass-card-hover rounded-2xl p-5 group">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        {method.icon}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-900">{method.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{method.description}</p>
                        <p className="text-sm font-semibold text-emerald-600 mt-2">{method.action}</p>
                      </div>
                    </div>
                  </a>
                </ScrollReveal>
              ))}
            </div>

            {/* Contact form */}
            <ScrollReveal delay={100} className="lg:col-span-3">
              <div className="glass-card rounded-2xl p-8 shadow-xl shadow-slate-200/50">
                <h2 className="font-display font-bold text-xl text-slate-900 mb-6">Send us a message</h2>

                <form className="space-y-4" action="/contact">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer">
                      <option>General inquiry</option>
                      <option>Technical support</option>
                      <option>Sales / Enterprise</option>
                      <option>Partnership</option>
                      <option>Bug report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                    <textarea
                      rows={5}
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                    />
                  </div>

                  <button type="submit" className="btn-primary text-sm">
                    Send Message
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
                  </button>
                </form>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
