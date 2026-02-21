import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'Blog — SheetMind | AI for Google Sheets Insights',
  description:
    'Tips, guides, and insights on using AI in Google Sheets. Learn about formula automation, data analysis, and spreadsheet best practices.',
  alternates: {
    canonical: '/blog',
  },
  twitter: {
    card: 'summary',
    title: 'Blog — SheetMind | AI for Google Sheets Insights',
    description:
      'Tips, guides, and insights on using AI in Google Sheets. Learn about formula automation, data analysis, and spreadsheet best practices.',
  },
}

const categoryColors: Record<string, string> = {
  Product: 'bg-emerald-100 text-emerald-700',
  Guide: 'bg-blue-100 text-blue-700',
  Security: 'bg-rose-100 text-rose-700',
  Tutorial: 'bg-purple-100 text-purple-700',
  General: 'bg-slate-100 text-slate-700',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 lg:pt-36 pb-16 lg:pb-20 bg-hero-mesh">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <div className="pill-badge mx-auto mb-4 w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2Z" /></svg>
              Blog
            </div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight">
              Insights & <span className="text-gradient">Guides</span>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <ScrollReveal key={post.slug} delay={i * 80}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block h-full glass-card glass-card-hover rounded-2xl overflow-hidden"
                  >
                    {/* Color bar */}
                    <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />

                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${categoryColors[post.category] || categoryColors.General}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-slate-400">{post.readTime}</span>
                      </div>

                      <h2 className="font-display font-bold text-lg text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors leading-snug">
                        {post.title}
                      </h2>

                      <p className="text-sm text-slate-500 leading-relaxed mb-5 line-clamp-3">
                        {post.description}
                      </p>

                      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.authorImage}
                          alt={post.author}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                          loading="lazy"
                        />
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
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
