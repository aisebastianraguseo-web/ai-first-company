'use client'

import { useState, useEffect } from 'react'
import ProblemForm from './ProblemForm'
import type { ProblemField } from '../../lib/supabase/types'

const MAX_PROBLEMS = 10
const PRIORITY_LABELS = { HIGH: 'Hoch', MEDIUM: 'Mittel', LOW: 'Niedrig' }

interface ProblemWithCount extends ProblemField {
  recent_match_count?: number
}

export default function ProblemList() {
  const [problems, setProblems] = useState<ProblemWithCount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProblems() {
    setLoading(true)
    try {
      const res = await fetch('/api/problems')
      if (!res.ok) throw new Error('Laden fehlgeschlagen.')
      const data = await res.json()
      setProblems(data.problems)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProblems() }, [])

  const activeCount = problems.filter((p) => p.is_active).length
  const canAddMore = activeCount < MAX_PROBLEMS

  if (loading) {
    return <div aria-busy="true" aria-label="Problemfelder werden geladen" className="loading-state" />
  }

  return (
    <div className="problem-list">
      <div className="problem-list__header">
        <p className="problem-list__count">
          {activeCount}/{MAX_PROBLEMS} aktive Problemfelder
        </p>
        <button
          onClick={() => setShowForm(true)}
          disabled={!canAddMore}
          className="btn btn--primary"
          aria-label="Neues Problemfeld hinzufügen"
          title={!canAddMore ? `Maximum ${MAX_PROBLEMS} Problemfelder erreicht.` : undefined}
        >
          + Problemfeld hinzufügen
        </button>
      </div>

      {error && <p role="alert" className="error-banner">{error}</p>}

      {problems.length === 0 ? (
        <div className="empty-state">
          <p>Sie haben noch keine Problemfelder definiert.</p>
          <p className="empty-state__hint">
            Definieren Sie unternehmensspezifische Herausforderungen —
            der KI-Radar zeigt Ihnen automatisch passende Entwicklungen.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn--primary">
            Erstes Problemfeld anlegen
          </button>
        </div>
      ) : (
        <ul role="list" className="problem-cards" aria-label="Ihre Problemfelder">
          {problems.map((p) => (
            <li key={p.id} role="listitem">
              <div className="problem-card">
                <div className="problem-card__header">
                  <span
                    className={`priority-badge priority-badge--${p.priority.toLowerCase()}`}
                    aria-label={`Priorität: ${PRIORITY_LABELS[p.priority]}`}
                  >
                    {PRIORITY_LABELS[p.priority]}
                  </span>
                  <h3 className="problem-card__title">{p.title}</h3>
                </div>

                {p.description && (
                  <p className="problem-card__desc">{p.description}</p>
                )}

                <div className="problem-card__meta">
                  <span className="match-count" aria-label={`${p.recent_match_count ?? 0} neue Treffer in den letzten 7 Tagen`}>
                    {p.recent_match_count
                      ? `${p.recent_match_count} neue Treffer`
                      : 'Keine neuen Treffer'}
                  </span>
                  {!p.is_active && (
                    <span className="badge badge--inactive">Inaktiv</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <ProblemForm
          onSuccess={() => { setShowForm(false); loadProblems() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
