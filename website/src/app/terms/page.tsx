import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service — SheetMind',
  description: 'SheetMind terms of service. Read our terms before using the product.',
  alternates: {
    canonical: '/terms',
  },
  robots: {
    index: false,
  },
  openGraph: {
    title: 'Terms of Service — SheetMind',
    description: 'SheetMind terms of service. Read our terms before using the product.',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service — SheetMind',
    description: 'SheetMind terms of service. Read our terms before using the product.',
  },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="pt-28 lg:pt-36 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <h1 className="font-display font-extrabold text-4xl text-slate-900 tracking-tight mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400 mb-10">Last updated: February 17, 2026</p>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-a:text-emerald-600">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using SheetMind (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              SheetMind is an AI-powered sidebar addon for Google Sheets that provides conversational data analysis, formula generation, chart creation, and spreadsheet automation. The Service is provided as-is and may be updated, modified, or discontinued at any time.
            </p>

            <h2>3. Account Registration</h2>
            <p>
              To use the Service, you must create an account using a valid email address or Google authentication. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Service.
            </p>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to reverse-engineer, decompile, or extract the source code</li>
              <li>Use the Service to process data you do not have the right to process</li>
              <li>Share your account credentials with others</li>
              <li>Attempt to circumvent rate limits or usage restrictions</li>
              <li>Use automated tools to access the Service beyond the provided API</li>
            </ul>

            <h2>5. Subscription and Billing</h2>
            <p>
              SheetMind offers Free, Pro, and Team subscription tiers. Paid subscriptions are billed monthly or annually. You may cancel at any time — cancellation takes effect at the end of the current billing period. No refunds are provided for partial billing periods.
            </p>

            <h2>6. AI-Generated Content</h2>
            <p>
              SheetMind uses artificial intelligence to generate responses, formulas, and actions. While we strive for accuracy, AI-generated content may contain errors. You are responsible for reviewing and verifying all AI outputs before relying on them. SheetMind provides confidence scores and source references to assist with verification, but these are not guarantees of accuracy.
            </p>

            <h2>7. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>. By using the Service, you consent to the collection and use of data as described in the Privacy Policy.
            </p>

            <h2>8. Intellectual Property</h2>
            <p>
              The Service, including its design, code, and content, is the intellectual property of SheetMind. Your data remains your property. We claim no ownership over your spreadsheet data or conversation content.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              SheetMind is provided &quot;as is&quot; without warranty of any kind. We are not liable for any damages arising from the use of the Service, including but not limited to data loss, incorrect AI outputs, or service interruptions. Our total liability is limited to the amount you paid for the Service in the 12 months preceding the claim.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of material changes via email or in-app notification.
            </p>

            <h2>11. Contact</h2>
            <p>
              If you have questions about these terms, please contact us at{' '}
              <a href="mailto:legal@sheetmind.xyz">legal@sheetmind.xyz</a>.
            </p>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
