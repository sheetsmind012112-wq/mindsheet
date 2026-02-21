import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Sora, DM_Sans } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import JsonLd from '@/components/JsonLd'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://sheetmind.xyz'),
  title: 'SheetMind — AI Sidebar for Google Sheets | Chat, Act, Undo',
  description:
    'Chat with your Google Sheets data using AI. SheetMind understands your spreadsheet, writes validated formulas, takes actions, and lets you undo every change.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SheetMind: The AI Copilot for Google Sheets That Lets You Undo',
    description:
      'Ask questions about your data in plain English. Get formulas, formatting, and analysis — with step-by-step undo for every AI action. Privacy-first. Free to start.',
    type: 'website',
    url: 'https://sheetmind.xyz',
    siteName: 'SheetMind',
    locale: 'en_US',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'SheetMind — AI Sidebar for Google Sheets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@sheetmind',
    title: 'SheetMind — Ask anything. Change anything. Undo anything.',
    description:
      'The AI sidebar for Google Sheets. Validated formulas. PII detection. Step-by-step undo. Free to start.',
    images: ['/og-default.png'],
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SheetMind',
  url: 'https://sheetmind.xyz',
  logo: 'https://sheetmind.xyz/logo.png',
  description:
    'AI sidebar for Google Sheets that reads your data, takes action, and lets you undo every step.',
  sameAs: [],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://us.i.posthog.com" />
        <JsonLd data={organizationSchema} />
      </head>
      <body className="font-body antialiased">
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  )
}
