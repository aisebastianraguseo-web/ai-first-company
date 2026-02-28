'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CreateProblemFieldInput, Industry } from '../../lib/supabase/types'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'automotive', label: 'Automotive' },
  { value: 'pharma', label: 'Pharma & Life Sciences' },
  { value: 'finance', label: 'Finanzdienstleistungen' },
  { value: 'mechanical_engineering', label: 'Maschinenbau' },
  { value: 'it_saas', label: 'IT / SaaS' },
  { value: 'other', label: 'Sonstiges' },
]

interface ProblemFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function ProblemForm({ onSuccess, onCancel }: ProblemFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [industry, setIndustry] = useState<Industry>('other')
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)

  // A11Y-005: Focus first element on mount
  useEffect(() => {
    const first = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0]
    first?.focus()
  }, [])

  // A11Y-005: Trap focus within dialog (Tab / Shift+Tab)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onCancel(); return }
    if (e.key !== 'Tab') return
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [onCancel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Bitte geben Sie einen Titel ein.')
      return
    }
    setSaving(true)
    setError(null)

    const body: CreateProblemFieldInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      industry,
      priority,
    }

    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 422) {
        const data = await res.json()
        setError(data.error ?? 'Eingabe ungültig.')
        return
      }
      if (!res.ok) throw new Error('Speichern fehlgeschlagen.')

      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="problem-form-title"
      className="modal-overlay"
      onKeyDown={handleKeyDown}
    >
      <div className="modal">
        <h2 id="problem-form-title">Neues Problemfeld</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="pf-title">
              Titel <span aria-hidden="true">*</span>
              <span className="sr-only">(Pflichtfeld)</span>
            </label>
            <input
              id="pf-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              aria-required="true"
              aria-describedby={error ? 'pf-error' : undefined}
              className="input"
              placeholder="z.B. Lieferkettenprognose verbessern"
            />
            <span className="char-count" aria-live="polite">{title.length}/100</span>
          </div>

          <div className="form-field">
            <label htmlFor="pf-desc">Beschreibung (optional)</label>
            <textarea
              id="pf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="input"
              placeholder="Was ist der Kontext dieser Herausforderung?"
            />
            <span className="char-count" aria-live="polite">{description.length}/500</span>
          </div>

          <div className="form-field">
            <label htmlFor="pf-industry">Branche</label>
            <select
              id="pf-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as Industry)}
              className="input"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          <fieldset className="form-fieldset">
            <legend>Priorität</legend>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
              <label key={p} className="radio-label">
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                />
                {p === 'HIGH' ? 'Hoch' : p === 'MEDIUM' ? 'Mittel' : 'Niedrig'}
              </label>
            ))}
          </fieldset>

          {/* Error: assertive for immediate feedback (LEARN-007) */}
          {error && (
            <p
              id="pf-error"
              role="alert"
              aria-live="assertive"
              className="form-error"
            >
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn--secondary"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
