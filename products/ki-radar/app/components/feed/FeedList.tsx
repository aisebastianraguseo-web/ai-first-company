'use client'

import { useState, useEffect, useCallback } from 'react'
import FeedCard from './FeedCard'
import type { FeedItemWithTags } from '../../lib/supabase/types'

type SourceFilter = 'all' | 'arxiv' | 'github' | 'release_notes' | 'hackernews'

const FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'release_notes', label: 'Release Notes' },
  { value: 'github', label: 'GitHub' },
  { value: 'arxiv', label: 'ArXiv' },
  { value: 'hackernews', label: 'Hacker News' },
]

export default function FeedList() {
  const [items, setItems] = useState<FeedItemWithTags[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<SourceFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filter !== 'all') params.set('source_type', filter)

      const res = await fetch(`/api/feed?${params}`)
      if (!res.ok) throw new Error('Feed konnte nicht geladen werden.')
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  // Announce updates to screen readers (LEARN-004: 50ms delay)
  useEffect(() => {
    if (!loading && items.length > 0) {
      const el = document.getElementById('live-region')
      if (el) setTimeout(() => { el.textContent = `${items.length} Einträge geladen.` }, 50)
    }
  }, [loading, items.length])

  return (
    <div className="feed-list">
      {/* Source filters */}
      <div className="feed-filters" role="group" aria-label="Nach Quelle filtern">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(1) }}
            className={`filter-chip ${filter === opt.value ? 'filter-chip--active' : ''}`}
            aria-pressed={filter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="error-banner">
          {error}
          <button onClick={fetchFeed} className="btn btn--secondary">Erneut versuchen</button>
        </div>
      )}

      {loading ? (
        <div aria-busy="true" aria-label="Einträge werden geladen" className="feed-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card" aria-hidden="true" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="empty-state">
          Keine Einträge gefunden.
          {filter !== 'all' && ' Versuchen Sie den Filter zu entfernen.'}
        </p>
      ) : (
        <div className="feed-items" aria-live="polite">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {total > items.length && !loading && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="btn btn--secondary load-more"
        >
          Weitere Einträge laden ({total - items.length} verbleibend)
        </button>
      )}
    </div>
  )
}
