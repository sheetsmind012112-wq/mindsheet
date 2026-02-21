import ScrollReveal from './ScrollReveal'

export default function CTA() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.3)_0,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.2)_0,transparent_60%)]" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight mb-6">
            Your spreadsheet is waiting
          </h2>
          <p className="text-lg text-emerald-100/80 max-w-xl mx-auto mb-10">
            Install SheetMind and start a conversation with your data. 30 seconds to set up.
            Works inside the Google Sheets you already use. Every AI action comes with an undo button.
          </p>

          {/* Email input + CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto mb-6">
            <label htmlFor="cta-email" className="sr-only">Email address</label>
            <input
              id="cta-email"
              type="email"
              placeholder="Enter your email to get started..."
              className="w-full sm:flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-emerald-200/50 backdrop-blur-sm outline-none focus:border-white/40 focus:bg-white/15 transition-all text-sm"
            />
            <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-display font-bold text-sm bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap">
              Get SheetMind Free
            </button>
          </div>

          <p className="text-sm text-emerald-200/50">
            No credit card required. No API key needed. 5 free messages to explore.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
