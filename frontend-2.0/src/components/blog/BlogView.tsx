'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/sections/SiteFooter'
import { Postmark, Tape } from '@/components/collage/Decor'
import { formatBlogDate, type BlogPost } from '@/lib/blog-data'
import { searchPosts } from '@/lib/kamna-knowledge'
import './blog.css'

export default function BlogView({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [query, setQuery] = useState('')

  const visible = useMemo(
    () => searchPosts(query, initialPosts),
    [query, initialPosts]
  )

  const trimmed = query.trim()

  return (
    <div id="top" className="blog-shell">
      <SiteHeader />

      <main className="blog-main">
        <div className="wrap">
          <header className="blog-header">
            <Postmark className="blog-postmark" top="NEW DELHI" bottom="JOURNAL" />

            <div className="blog-eyebrow-row">
              <span className="blog-dot" aria-hidden="true" />
              <span className="eyebrow">JOURNAL &middot; ESSAYS &amp; FIELD NOTES</span>
            </div>

            <div className="blog-header-top">
              <div>
                <h1 className="blog-title">The Blog</h1>
                <p className="blog-subtitle">
                  Notes on writing, mindset &amp; building in public
                </p>
              </div>
              <Link href="/" className="link-underline blog-back-home">
                &larr; Back to Portfolio
              </Link>
            </div>
          </header>

          <div className="blog-toolbar" role="search">
            <div className="blog-search">
              <label htmlFor="blog-search-input" className="blog-search-label">
                Search Essays
              </label>
              <div className="blog-search-field">
                <Search size={16} className="blog-search-icon" aria-hidden="true" />
                <input
                  id="blog-search-input"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try hooks, LinkedIn, headlines, consistency..."
                  maxLength={200}
                />
                {query ? (
                  <button
                    type="button"
                    className="blog-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <p className="blog-count" role="status" aria-live="polite">
              {trimmed
                ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'} for “${trimmed}”`
                : `${visible.length} ${visible.length === 1 ? 'article' : 'articles'}`}
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="blog-empty" role="status">
              <h2 className="blog-empty-title">No matching articles</h2>
              <p className="blog-empty-copy">
                Nothing matched “{trimmed}”. Try another topic like hooks, headlines, or building in public.
              </p>
              <button
                type="button"
                className="blog-empty-btn"
                onClick={() => setQuery('')}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="blog-grid">
              {visible.map((post, idx) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="blog-card"
                >
                  {idx % 2 === 0 ? (
                    <Tape variant="pink" className="blog-card-tape" />
                  ) : (
                    <Tape variant="cream" className="blog-card-tape" />
                  )}

                  <div className="blog-card-media">
                    <span className="blog-card-num" aria-hidden="true">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <Image
                      src={post.coverImage || '/blog/cover-1.jpg'}
                      alt={post.title}
                      fill
                      sizes="(max-width: 760px) 100vw, 50vw"
                    />
                  </div>

                  <div className="blog-card-body">
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt} className="blog-card-date">
                        {formatBlogDate(post.publishedAt)}
                      </time>
                    ) : null}

                    <h2 className="blog-card-title">{post.title}</h2>
                    <p className="blog-card-excerpt">{post.excerpt}</p>

                    <div className="blog-card-footer">
                      <div className="blog-byline">
                        <Image
                          src={post.authorPhoto || '/blog/author-kamna.jpg'}
                          alt={post.authorName}
                          width={26}
                          height={26}
                        />
                        <span>{post.authorName}</span>
                      </div>

                      <span className="blog-read-more">
                        Read Article &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
