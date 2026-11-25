import type { Metadata } from 'next'
import BlogView from '@/components/blog/BlogView'
import { getCmsBlogPosts } from '@/lib/cms.server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Blog | Kamna Bhardwaj',
  description:
    'Notes on writing, mindset, LinkedIn strategy, and building a personal brand in public by Kamna Bhardwaj.',
}

export default async function BlogPage() {
  const posts = await getCmsBlogPosts()
  return <BlogView initialPosts={posts} />
}
