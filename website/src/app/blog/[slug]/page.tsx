import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllSlugs, getPostBySlug } from '@/lib/blog'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import JsonLd from '@/components/JsonLd'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Props {
  params: { slug: string }
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
    alternates: {
      canonical: `/blog/${params.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SheetMind',
      url: 'https://sheetmind.xyz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sheetmind.xyz/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sheetmind.xyz/blog/${params.slug}`,
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
        item: 'https://sheetmind.xyz',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://sheetmind.xyz/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://sheetmind.xyz/blog/${params.slug}`,
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
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                {post.category}
              </span>
              <span className="text-sm text-slate-400">{post.readTime}</span>
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
            <div className="flex items-center gap-4 pb-8 mb-10 border-b border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.authorImage}
                alt={post.author}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200 ring-offset-2"
                loading="lazy"
              />
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
          <ScrollReveal delay={200}>
            <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 text-center">
              <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                Ready to try SheetMind?
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Start with 5 free messages. No credit card required.
              </p>
              <a href="/#pricing" className="btn-primary text-sm">
                Get SheetMind Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </article>

      <Footer />
    </main>
  )
}
