import type { Metadata } from 'next'
import BlogArticleView from '@/components/blog/BlogArticleView'
import { FALLBACK_BLOG_POSTS } from '@/lib/blog-data'
import { getCmsBlogPost } from '@/lib/cms.server'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export function generateStaticParams() {
  return FALLBACK_BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getCmsBlogPost(slug)
  if (!post) {
    return {
      title: 'Article Not Found | Kamna Bhardwaj',
    }
  }
  return {
    title: `${post.title} | Kamna Bhardwaj`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getCmsBlogPost(slug)
  return <BlogArticleView post={post} />
}
