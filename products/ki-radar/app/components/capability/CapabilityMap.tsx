'use client'

import { useState, useEffect, useRef } from 'react'
import CapabilityTile from './CapabilityTile'
import type { CapabilityMapData } from '../../lib/supabase/types'

export default function CapabilityMap() {
  const [data, setData] = useState<CapabilityMapData | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((d) => setData({ tags: d.tags }))
      .catch(() => setError('Kategorie-Ansicht temporär nicht verfügbar.'))
  }, [])

  // A11Y-006: Move focus into detail panel when it opens
  useEffect(() => {
    if (selected) {
      detailRef.current?.focus()
    }
  }, [selected])

  function handleTileClick(slug: string) {
    setSelected((prev) => (prev === slug ? null : slug))
  }

  if (error) return <p role="alert" className="error-banner">{error}</p>
  if (!data) return <div aria-busy="true" aria-label="Wird geladen" className="loading-state" />

  const selectedTag = selected ? data.tags.find((t) => t.slug === selected) : null

  return (
    <div className="capability-map">
      <div
        className="capability-grid"
        role="list"
        aria-label="KI-Fähigkeitskategorien"
      >
        {data.tags.map((tag) => (
          <div key={tag.id} role="listitem">
            <CapabilityTile
              {...tag}
              onClick={handleTileClick}
            />
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedTag && (
        <aside
          ref={detailRef}
          className="capability-detail"
          aria-label={`Details: ${selectedTag.name}`}
          tabIndex={-1}
        >
          <div className="capability-detail__header">
            <span aria-hidden="true">{selectedTag.icon}</span>
            <h2>{selectedTag.name}</h2>
            <button
              onClick={() => setSelected(null)}
              aria-label="Panel schließen"
              className="btn-icon"
            >
              ✕
            </button>
          </div>

          <p className="capability-detail__plain">{selectedTag.description_plain}</p>
          <p className="capability-detail__technical">{(selectedTag as any).description_technical}</p>

          <p className="capability-detail__count">
            <strong>{selectedTag.recent_count}</strong> neue Einträge in den letzten 7 Tagen
          </p>

          <a
            href={`/dashboard?capability=${selectedTag.slug}`}
            className="btn btn--primary"
          >
            Alle Einträge zu {selectedTag.name} anzeigen →
          </a>
        </aside>
      )}
    </div>
  )
}
