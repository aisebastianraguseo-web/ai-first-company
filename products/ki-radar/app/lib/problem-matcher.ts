// Problem Matcher — Keyword-based matching (ADR-004: Option A)
// DSGVO-safe: problem fields never sent to external APIs
// Semantic LLM matching deferred to V2 (opt-in)

import type { ProblemField, FeedItem } from './supabase/types'

export interface MatchResult {
  problemFieldId: string
  feedItemId: string
  confidence: number       // 0.0 - 1.0
  matchReason: string      // Human-readable explanation (max 200 chars)
  matchedTerms: string[]
}

/**
 * Normalises text for keyword comparison.
 * Strips punctuation, lowercases, splits into tokens.
 */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2) // skip very short tokens
}

/**
 * Scores a feed item against a single problem field.
 * Returns null if confidence < 0.3 (no match).
 */
export function scoreProblemMatch(
  problem: ProblemField,
  item: FeedItem
): MatchResult | null {
  const problemTokens = new Set([
    ...tokenise(problem.title),
    ...tokenise(problem.description ?? ''),
  ])

  const itemText = `${item.title} ${item.summary_short ?? ''} ${item.summary_plain ?? ''}`
  const itemTokens = tokenise(itemText)

  const matched = itemTokens.filter((t) => problemTokens.has(t))
  const uniqueMatched = [...new Set(matched)]

  if (uniqueMatched.length === 0) return null

  // Confidence: proportion of problem tokens found in item, capped at 1.0
  const coverage = uniqueMatched.length / Math.max(problemTokens.size, 1)
  const confidence = Math.min(Math.round(coverage * 100) / 100, 1.0)

  if (confidence < 0.3) return null

  const topTerms = uniqueMatched.slice(0, 5)
  const matchReason = `Übereinstimmende Begriffe: ${topTerms.join(', ')}`

  return {
    problemFieldId: problem.id,
    feedItemId: item.id,
    confidence,
    matchReason: matchReason.slice(0, 200),
    matchedTerms: topTerms,
  }
}

/**
 * Matches multiple problem fields against a single new feed item.
 * Returns all matches above threshold.
 */
export function matchFeedItem(
  problems: ProblemField[],
  item: FeedItem
): MatchResult[] {
  const results: MatchResult[] = []

  for (const problem of problems) {
    if (!problem.is_active) continue
    const match = scoreProblemMatch(problem, item)
    if (match) results.push(match)
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Batch: matches all active problem fields against multiple new feed items.
 * Used by the aggregation cron job after inserting new items.
 */
export function matchBatch(
  problems: ProblemField[],
  items: FeedItem[]
): MatchResult[] {
  const allMatches: MatchResult[] = []
  for (const item of items) {
    allMatches.push(...matchFeedItem(problems, item))
  }
  return allMatches
}
