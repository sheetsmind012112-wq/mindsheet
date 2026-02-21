import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — SheetMind',
  description: 'SheetMind privacy policy. Learn how we handle your data.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: false,
  },
  openGraph: {
    title: 'Privacy Policy — SheetMind',
    description: 'SheetMind privacy policy. Learn how we handle your data.',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy — SheetMind',
    description: 'SheetMind privacy policy. Learn how we handle your data.',
  },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="pt-28 lg:pt-36 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <h1 className="font-display font-extrabold text-4xl text-slate-900 tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 mb-10">Last updated: February 17, 2026</p>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-a:text-emerald-600">
            <h2>Overview</h2>
            <p>
              SheetMind (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our Google Sheets sidebar addon and website.
            </p>

            <h2>Data We Collect</h2>
            <p><strong>Account data:</strong> When you create an account, we collect your name, email address, and authentication credentials. If you sign in with Google, we receive your basic profile information.</p>
            <p><strong>Sheet data (temporary):</strong> When you send a message in the SheetMind sidebar, the relevant sheet data (headers, cell values) is sent to our backend for AI processing. This data is NOT stored permanently. It is processed in memory and discarded after the response is generated.</p>
            <p><strong>Conversation history:</strong> Your chat messages and AI responses are stored in our database so you can resume conversations. Message content is associated with your user ID.</p>
            <p><strong>Usage data:</strong> We track anonymized usage metrics (message counts, feature usage, session data) via PostHog analytics. We never track the content of your messages or sheet data in analytics.</p>

            <h2>Data We Do NOT Collect</h2>
            <ul>
              <li>We never store your raw spreadsheet data permanently</li>
              <li>We never track the content of your messages or AI responses in analytics</li>
              <li>We never sell your data to third parties</li>
              <li>We never use your data to train AI models</li>
            </ul>

            <h2>PII Detection</h2>
            <p>
              SheetMind includes automatic PII (Personally Identifiable Information) detection. Before processing your sheet data, we scan for patterns that may indicate sensitive information (emails, phone numbers, SSNs, etc.) and display a warning banner. You decide whether to proceed. This detection happens locally before data is sent to external AI services.
            </p>

            <h2>Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Google AI (Gemini):</strong> For AI processing of your queries. Subject to Google&apos;s privacy policy.</li>
              <li><strong>Supabase:</strong> For database and authentication. Data stored with row-level security.</li>
              <li><strong>PostHog:</strong> For anonymized usage analytics. No message content tracked.</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement row-level security (RLS) policies on all database tables, ensuring users can only access their own data. All data is transmitted over HTTPS. Authentication tokens are securely stored.
            </p>

            <h2>Data Retention</h2>
            <p>
              Account data is retained as long as your account is active. Conversation history is retained until you delete it or close your account. Sheet data is never retained — it is processed in memory and immediately discarded.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Delete your account and all associated data</li>
              <li>Export your conversation history</li>
              <li>Opt out of analytics tracking</li>
            </ul>

            <h2>Contact</h2>
            <p>
              If you have questions about this privacy policy, please contact us at{' '}
              <a href="mailto:privacy@sheetmind.xyz">privacy@sheetmind.xyz</a>.
            </p>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
