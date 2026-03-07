import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import JsonLd from '@/components/JsonLd'

const BASE_URL = 'https://sheetmind.xyz'

export const metadata: Metadata = {
  title: 'Blog — SheetMind | AI for Google Sheets Guides & Tips',
  description:
    'Tips, guides, and insights on using AI in Google Sheets. Learn about formula automation, data analysis, data cleaning, and spreadsheet best practices.',
  keywords: [
    'AI Google Sheets blog',
    'Google Sheets tips',
    'spreadsheet AI guides',
    'formula automation',
    'Google Sheets tutorials',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog — SheetMind | AI for Google Sheets Guides & Tips',
    description:
      'Tips, guides, and insights on using AI in Google Sheets. Learn about formula automation, data analysis, and spreadsheet best practices.',
    type: 'website',
    url: `${BASE_URL}/blog`,
    siteName: 'SheetMind',
    locale: 'en_US',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'SheetMind Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — SheetMind | AI for Google Sheets Guides & Tips',
    description:
      'Tips, guides, and insights on using AI in Google Sheets. Formula automation, data analysis, and best practices.',
    images: ['/og-default.png'],
  },
}

const categoryColors: Record<string, string> = {
  Product: 'bg-emerald-100 text-emerald-700',
  Guide: 'bg-blue-100 text-blue-700',
  Security: 'bg-rose-100 text-rose-700',
  Tutorial: 'bg-purple-100 text-purple-700',
  General: 'bg-slate-100 text-slate-700',
}

const categoryGradient: Record<string, string> = {
  Product: 'from-emerald-500 to-teal-400',
  Guide: 'from-blue-500 to-blue-400',
  Security: 'from-rose-500 to-rose-400',
  Tutorial: 'from-purple-500 to-violet-400',
  General: 'from-slate-400 to-slate-300',
}

export default function BlogPage() {
  const posts = getAllPosts()
  const featured = posts[0]
  const rest = posts.slice(1)

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'SheetMind Blog',
    description:
      'Tips, guides, and insights on using AI in Google Sheets — formula automation, data analysis, and spreadsheet best practices.',
    url: `${BASE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'SheetMind',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    blogPost: posts.slice(0, 10).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      datePublished: post.date,
      author: { '@type': 'Person', name: post.author },
      ...(post.image ? { image: post.image } : {}),
    })),
  }

  return (
    <main className="min-h-screen">
      <JsonLd data={blogSchema} />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 lg:pt-36 pb-16 lg:pb-20 bg-hero-mesh">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <div className="pill-badge mx-auto mb-4 w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2Z" />
              </svg>
              {posts.length} Articles
            </div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight">
              Insights &amp; <span className="text-gradient">Guides</span>
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              Tips on using AI in Google Sheets, product updates, and best practices for
              spreadsheet professionals.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-24 lg:pb-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-center text-slate-400 py-16">No posts yet. Check back soon!</p>
          ) : (
            <div className="space-y-10">

              {/* Featured post — most recent, full-width hero card */}
              {featured && (
                <ScrollReveal>
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group block glass-card glass-card-hover rounded-2xl overflow-hidden"
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${categoryGradient[featured.category] || categoryGradient.General}`} />
                    <div className="p-8 md:p-10">
                      <div className="flex flex-wrap items-center gap-2.5 mb-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Latest
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${categoryColors[featured.category] || categoryColors.General}`}>
                          {featured.category}
                        </span>
                        <span className="text-xs text-slate-400">{featured.readTime}</span>
                      </div>

                      <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors leading-snug max-w-3xl">
                        {featured.title}
                      </h2>
                      <p className="text-base text-slate-500 leading-relaxed mb-7 max-w-2xl">
                        {featured.description}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-4 pt-5 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          {featured.authorImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={featured.authorImage}
                              alt={featured.author}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-200/60"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 ring-2 ring-emerald-200/50">
                              {featured.author.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-slate-700">{featured.author}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(featured.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-3 transition-all duration-200">
                          Read article
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              )}

              {/* Remaining posts — 3-column grid */}
              {rest.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post, i) => (
                    <ScrollReveal key={post.slug} delay={i * 60}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group flex flex-col h-full glass-card glass-card-hover rounded-2xl overflow-hidden"
                      >
                        <div className={`h-1.5 bg-gradient-to-r ${categoryGradient[post.category] || categoryGradient.General}`} />

                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${categoryColors[post.category] || categoryColors.General}`}>
                              {post.category}
                            </span>
                            <span className="text-xs text-slate-400">{post.readTime}</span>
                          </div>

                          <h2 className="font-display font-bold text-lg text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors leading-snug">
                            {post.title}
                          </h2>

                          <p className="text-sm text-slate-500 leading-relaxed mb-5 line-clamp-3 flex-1">
                            {post.description}
                          </p>

                          <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {post.authorImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={post.authorImage}
                                  alt={post.author}
                                  width={28}
                                  height={28}
                                  className="w-7 h-7 rounded-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                  {post.author.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <div className="text-xs font-semibold text-slate-700">{post.author}</div>
                                <div className="text-[11px] text-slate-400">
                                  {new Date(post.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </div>
                            <svg
                              className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
