// Capability Tagger — Keyword-based classification (ADR-007: Option A)
// QA-002 FIX: uses inlined TS constant instead of fs.readFileSync (Vercel-safe)
// DSGVO-safe: no external API calls, fully local

import { CAPABILITY_KEYWORDS } from './capability-keywords'

export interface TagResult {
  slug: string
  confidence: number     // 0.0 - 1.0
  matched_terms: string[]
}

/**
 * Tags a feed item with capability categories based on keyword matching.
 * Returns up to 3 tags with confidence >= 0.3, sorted by confidence desc.
 */
export function tagFeedItem(title: string, summary: string): TagResult[] {
  const text = `${title} ${summary}`.toLowerCase()
  const results: TagResult[] = []

  for (const [slug, { keywords }] of Object.entries(CAPABILITY_KEYWORDS)) {
    const matched = keywords.filter((rule) =>
      text.includes(rule.term.toLowerCase())
    )

    if (matched.length === 0) continue

    const rawScore = matched.reduce((sum, r) => sum + r.weight, 0)
    const confidence = Math.min(Math.round(rawScore * 100) / 100, 1.0)

    if (confidence >= 0.3) {
      results.push({
        slug,
        confidence,
        matched_terms: matched.map((r) => r.term),
      })
    }
  }

  // Max 3 tags, sorted by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

/**
 * Batch-tags multiple items.
 */
export function tagBatch(
  items: Array<{ title: string; summary: string }>
): TagResult[][] {
  return items.map(({ title, summary }) => tagFeedItem(title, summary))
}
