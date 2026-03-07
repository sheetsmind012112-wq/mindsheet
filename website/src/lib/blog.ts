import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorTitle: string
  authorImage: string
  category: string
  readTime: string
  image?: string
  keywords?: string[]
  content: string
}

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  authorTitle: string
  authorImage: string
  category: string
  readTime: string
  image?: string
  keywords?: string[]
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'))

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data } = matter(raw)

    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '',
      author: data.author || 'SheetMind Team',
      authorTitle: data.authorTitle || '',
      authorImage: data.authorImage || '',
      category: data.category || 'General',
      readTime: data.readTime || '5 min read',
      image: data.image || undefined,
      keywords: Array.isArray(data.keywords) ? data.keywords : undefined,
    }
  })

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)

  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const processed = await remark().use(html).process(content)
  const htmlContent = processed.toString()

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '',
    author: data.author || 'SheetMind Team',
    authorTitle: data.authorTitle || '',
    authorImage: data.authorImage || '',
    category: data.category || 'General',
    readTime: data.readTime || '5 min read',
    image: data.image || undefined,
    keywords: Array.isArray(data.keywords) ? data.keywords : undefined,
    content: htmlContent,
  }
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}
