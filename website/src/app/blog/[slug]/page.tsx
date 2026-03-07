import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllSlugs, getPostBySlug, getAllPosts } from '@/lib/blog'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import JsonLd from '@/components/JsonLd'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Props {
  params: { slug: string }
}

const BASE_URL = 'https://sheetmind.xyz'

const categoryColors: Record<string, string> = {
  Product: 'bg-emerald-100 text-emerald-700',
  Guide: 'bg-blue-100 text-blue-700',
  Security: 'bg-rose-100 text-rose-700',
  Tutorial: 'bg-purple-100 text-purple-700',
  General: 'bg-slate-100 text-slate-700',
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: `${post.title} — SheetMind Blog`,
    description: post.description,
    ...(post.keywords?.length ? { keywords: post.keywords } : {}),
    alternates: {
      canonical: `/blog/${params.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: `${BASE_URL}/blog/${params.slug}`,
      siteName: 'SheetMind',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      images: post.image
        ? [{ url: post.image, width: 1200, height: 630, alt: post.title }]
        : [{ url: '/og-default.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.image || '/og-default.png'],
    },
  }
}

// Estimate word count from readTime (assumes ~200 wpm)
function estimateWordCount(readTime: string): number {
  const match = readTime.match(/(\d+)/)
  return match ? parseInt(match[1]) * 200 : 800
}

export default async function BlogPostPage({ params }: Props) {
  const [post, allPosts] = await Promise.all([
    getPostBySlug(params.slug),
    Promise.resolve(getAllPosts()),
  ])
  if (!post) notFound()

  // Related posts: same category first, then other posts; exclude current; max 3
  const related = [
    ...allPosts.filter((p) => p.slug !== params.slug && p.category === post.category),
    ...allPosts.filter((p) => p.slug !== params.slug && p.category !== post.category),
  ].slice(0, 3)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    wordCount: estimateWordCount(post.readTime),
    ...(post.keywords?.length ? { keywords: post.keywords.join(', ') } : {}),
    ...(post.image ? { image: { '@type': 'ImageObject', url: post.image, width: 1200, height: 630 } } : {
      image: { '@type': 'ImageObject', url: `${BASE_URL}/og-default.png`, width: 1200, height: 630 },
    }),
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SheetMind',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${params.slug}`,
    },
    isPartOf: {
      '@type': 'Blog',
      '@id': `${BASE_URL}/blog`,
      name: 'SheetMind Blog',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${BASE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${BASE_URL}/blog/${params.slug}`,
      },
    ],
  }

  return (
    <main className="min-h-screen">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Navbar />

      <article className="pt-28 lg:pt-36 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            {/* Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: post.title },
              ]}
            />

            {/* Category + read time */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${categoryColors[post.category] || categoryColors.General}`}>
                {post.category}
              </span>
              <span className="text-sm text-slate-400">{post.readTime}</span>
              <span className="text-slate-200">·</span>
              <span className="text-sm text-slate-400">{estimateWordCount(post.readTime).toLocaleString()} words</span>
            </div>

            {/* Title */}
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight mb-6">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-500 leading-relaxed mb-8">
              {post.description}
            </p>

            {/* Author + Date */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-8 mb-10 border-b border-slate-200">
              <div className="flex items-center gap-4">
                {post.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.authorImage}
                    alt={post.author}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200 ring-offset-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm ring-2 ring-emerald-200 ring-offset-2">
                    {post.author.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="font-display font-semibold text-sm text-slate-900">{post.author}</div>
                  <div className="text-sm text-slate-400">
                    {post.authorTitle} &middot;{' '}
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Share on Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${BASE_URL}/blog/${params.slug}`)}&via=sheetmind`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 hover:border-slate-400 rounded-full px-3 py-1.5"
                aria-label="Share on Twitter"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share
              </a>
            </div>
          </ScrollReveal>

          {/* Article content */}
          <ScrollReveal delay={100}>
            <div
              className="prose prose-slate prose-lg max-w-none
                prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:leading-relaxed prose-p:text-slate-600
                prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-slate-800 prose-strong:font-semibold
                prose-li:text-slate-600
                prose-table:text-sm
                prose-th:bg-slate-50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-display prose-th:font-semibold
                prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-slate-100
                prose-code:text-emerald-600 prose-code:bg-emerald-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                prose-blockquote:border-emerald-300 prose-blockquote:bg-emerald-50/30 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-xl prose-blockquote:not-italic
                prose-img:rounded-2xl prose-img:shadow-lg
                prose-hr:border-slate-200
              "
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </ScrollReveal>

          {/* Bottom CTA */}
          <ScrollReveal delay={150}>
            <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 text-center">
              <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                Ready to try SheetMind?
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Start with 5 free messages. No credit card required.
              </p>
              <a href="/#pricing" className="btn-primary text-sm">
                Get SheetMind Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </ScrollReveal>

          {/* Related posts */}
          {related.length > 0 && (
            <ScrollReveal delay={200}>
              <div className="mt-16">
                <h2 className="font-display font-bold text-xl text-slate-900 mb-6">Related Articles</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/blog/${rel.slug}`}
                      className="group block p-5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-white hover:bg-emerald-50/30 transition-all duration-200"
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${categoryColors[rel.category] || categoryColors.General}`}>
                        {rel.category}
                      </span>
                      <h3 className="font-display font-semibold text-sm text-slate-800 leading-snug group-hover:text-emerald-700 transition-colors mb-1">
                        {rel.title}
                      </h3>
                      <span className="text-[11px] text-slate-400">{rel.readTime}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </article>

      <Footer />
    </main>
  )
}
