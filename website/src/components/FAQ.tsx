'use client'

import { useState } from 'react'
import ScrollReveal from './ScrollReveal'
import { faqs } from '@/lib/faq-data'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24 lg:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <div className="pill-badge mx-auto mb-4 w-fit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
            FAQ
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Everything you need to know about SheetMind.
          </p>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div
                className={`rounded-2xl border transition-all duration-300 ${
                  openIndex === i
                    ? 'border-emerald-200 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200/60 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  aria-expanded={openIndex === i}
                  aria-controls={`faq-${i}`}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className={`font-display font-semibold text-[15px] pr-4 ${openIndex === i ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    openIndex === i ? 'bg-emerald-500 rotate-180' : 'bg-slate-100'
                  }`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={openIndex === i ? 'white' : '#64748b'} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </button>
                <div
                  id={`faq-${i}`}
                  role="region"
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: openIndex === i ? '300px' : '0',
                    opacity: openIndex === i ? 1 : 0,
                  }}
                >
                  <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
