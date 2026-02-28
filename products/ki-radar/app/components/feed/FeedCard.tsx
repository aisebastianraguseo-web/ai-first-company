'use client'

import type { FeedItemWithTags } from '../../lib/supabase/types'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import Badge from '../ui/Badge'

interface FeedCardProps {
  item: FeedItemWithTags
}

const SOURCE_LABELS: Record<string, string> = {
  arxiv: 'ArXiv',
  github: 'GitHub',
  release_notes: 'Release Notes',
  hackernews: 'Hacker News',
  vc_news: 'VC News',
  industry_blog: 'Blog',
}

const RELEVANCE_LABELS: Record<string, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

function relevanceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

export default function FeedCard({ item }: FeedCardProps) {
  const level = relevanceLevel(item.relevance_score)
  const timeAgo = formatDistanceToNow(new Date(item.published_at), {
    addSuffix: true,
    locale: de,
  })

  return (
    <article
      className="feed-card"
      aria-label={`${item.title}, ${SOURCE_LABELS[item.source_type] ?? item.source_name}, ${timeAgo}`}
    >
      <div className="feed-card__meta">
        <span className="feed-card__source">{SOURCE_LABELS[item.source_type] ?? item.source_name}</span>
        <time dateTime={item.published_at} className="feed-card__time">
          {timeAgo}
        </time>
        {/* Relevance: NOT color-only (Andrea/Petra a11y requirement) */}
        <span
          className={`feed-card__relevance feed-card__relevance--${level}`}
          aria-label={`Relevanz: ${RELEVANCE_LABELS[level]}`}
        >
          {level === 'high' ? '▲' : level === 'medium' ? '■' : '▼'} {RELEVANCE_LABELS[level]}
        </span>
      </div>

      <h2 className="feed-card__title">{item.title}</h2>

      {item.summary_short && (
        <p className="feed-card__summary">{item.summary_short}</p>
      )}

      {item.summary_plain && (
        <details className="feed-card__plain">
          <summary>Was das bedeutet:</summary>
          <p>{item.summary_plain}</p>
        </details>
      )}

      {/* Capability tags */}
      {item.tags && item.tags.length > 0 && (
        <ul role="list" className="feed-card__tags" aria-label="Fähigkeitskategorien">
          {item.tags.map((tag) => (
            <li key={tag.slug} role="listitem">
              <Badge
                slug={tag.slug}
                label={`${tag.icon} ${tag.name}`}
                uncertain={tag.confidence < 0.6}
                title={tag.confidence < 0.6 ? 'Unsichere Kategorisierung' : tag.description_plain}
              />
            </li>
          ))}
        </ul>
      )}

      <a
        href={item.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="feed-card__link"
        aria-describedby={undefined}
      >
        Original lesen →
        <span className="sr-only"> (öffnet in neuem Tab: {item.title})</span>
      </a>
    </article>
  )
}
