import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/sections/SiteFooter'
import { Tape } from '@/components/collage/Decor'
import { formatBlogDate, type BlogPost } from '@/lib/blog-data'
import { site } from '@/lib/content'
import './blog.css'

export default function BlogArticleView({ post }: { post: BlogPost | null }) {
  return (
    <div id="top" className="blog-shell">
      <SiteHeader />

      <main className="article-main">
        <div className="wrap">
          <div className="article-container">
            <Link href="/blog" className="article-back">
              &larr; All Posts
            </Link>

            {!post ? (
              <div className="blog-empty" style={{ marginTop: 32 }}>
                <h1 className="blog-empty-title">Article not found</h1>
                <p className="blog-empty-copy">
                  That essay may have moved or the link might be outdated.
                </p>
                <div style={{ marginTop: 22 }}>
                  <Link href="/blog" className="article-btn-secondary">
                    &larr; All Posts
                  </Link>
                </div>
              </div>
            ) : (
              <article>
                <header className="article-head">
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt} className="article-date">
                      {formatBlogDate(post.publishedAt)}
                    </time>
                  ) : null}

                  <h1 className="article-title">{post.title}</h1>
                  {post.excerpt ? (
                    <p className="article-deck">{post.excerpt}</p>
                  ) : null}

                  <div className="article-author">
                    <Image
                      src={post.authorPhoto || '/blog/author-kamna.jpg'}
                      alt={post.authorName}
                      width={42}
                      height={42}
                    />
                    <div>
                      <p className="article-author-name">{post.authorName}</p>
                      <p className="article-author-role">
                        Personal Branding &amp; Content Creation
                      </p>
                    </div>
                  </div>
                </header>

                {post.coverImage ? (
                  <div className="article-cover">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      priority
                      sizes="(max-width: 760px) 100vw, 720px"
                    />
                  </div>
                ) : null}

                <div
                  className="article-prose"
                  dangerouslySetInnerHTML={{ __html: post.bodyHtml ?? '' }}
                />

                <aside className="article-callout" aria-label="Work with Kamna">
                  <Tape variant="pink" className="article-callout-tape" />
                  <p className="article-callout-eyebrow">1:1 STRATEGY &amp; BRAND WORK</p>
                  <h2 className="article-callout-title">
                    Want help shaping a brand that sounds like you?
                  </h2>
                  <p className="article-callout-body">
                    Book a 1:1 session for LinkedIn positioning, profile audits, and content
                    pillars — or head back to explore full-scale creator campaigns.
                  </p>
                  <div className="article-callout-actions">
                    <a
                      href={site.social.topmate}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="article-btn-primary"
                    >
                      Book a 1:1 on Topmate
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                    <Link href="/" className="article-btn-secondary">
                      Back to Portfolio
                    </Link>
                    <Link href="/blog" className="article-back">
                      &larr; All Posts
                    </Link>
                  </div>
                </aside>
              </article>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
