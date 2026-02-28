// Main Aggregator — Coordinates all sources, tags, deduplicates, persists
// QA-001 FIX: Added release-notes + vc-news sources (5 total)
// QA-003 FIX: runAggregation() split into private helpers — each ≤30 lines
// Called by: /api/aggregate (triggered by GitHub Actions Cron)

import { createServiceClient } from '../supabase/server'
import { tagFeedItem } from '../capability-tagger'
import { matchBatch } from '../problem-matcher'
import { fetchArxiv } from './sources/arxiv'
import { fetchHackerNews } from './sources/hackernews'
import { fetchGithubTrending } from './sources/github-trending'
import { fetchReleaseNotes } from './sources/release-notes'
import { fetchVcNews } from './sources/vc-news'
import type { FeedItem, ProblemField } from '../supabase/types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = ReturnType<typeof createServiceClient>

export interface AggregationResult {
  fetched: number
  inserted: number
  duplicates: number
  tagged: number
  matches: number
  errors: string[]
}

// ── Private helpers ──────────────────────────────────────────────────────────

async function fetchAllSources(errors: string[]): Promise<Partial<FeedItem>[]> {
  const settled = await Promise.allSettled([
    fetchArxiv(20),
    fetchHackerNews(15),
    fetchGithubTrending(),
    fetchReleaseNotes(),
    fetchVcNews(),
  ])

  const labels = ['ArXiv', 'HackerNews', 'GitHub', 'ReleaseNotes', 'VcNews']
  const items: Partial<FeedItem>[] = []

  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value)
    else errors.push(`${labels[i]}: ${r.reason}`)
  })

  return items
}

async function upsertFeedItems(
  db: Db,
  rawItems: Partial<FeedItem>[],
  result: AggregationResult
): Promise<FeedItem[]> {
  // Deduplicate within the batch — PostgreSQL upsert fails if same URL appears twice
  const seen = new Set<string>()
  const deduplicated = rawItems.filter((item) => {
    if (!item.source_url || seen.has(item.source_url)) return false
    seen.add(item.source_url)
    return true
  })

  const { data, error } = await db
    .from('feed_items')
    .upsert(deduplicated, { onConflict: 'source_url', ignoreDuplicates: true })
    .select('id, title, summary_short, source_url, published_at')

  if (error) {
    result.errors.push(`DB insert: ${error.message}`)
    return []
  }

  const inserted = data ?? []
  result.inserted = inserted.length
  result.duplicates = result.fetched - result.inserted
  return inserted as FeedItem[]
}

async function tagInsertedItems(db: Db, items: FeedItem[], result: AggregationResult): Promise<void> {
  const { data: allTags } = await db.from('capability_taxonomy').select('id, slug').eq('is_active', true)
  const slugToId = Object.fromEntries((allTags ?? []).map((t) => [t.slug, t.id]))

  const tagInserts = items.flatMap((item) =>
    tagFeedItem(item.title, item.summary_short ?? '').flatMap((tag) => {
      const capId = slugToId[tag.slug]
      return capId
        ? [{ feed_item_id: item.id, capability_id: capId, confidence: tag.confidence, assigned_by: 'system' }]
        : []
    })
  )

  if (tagInserts.length === 0) return

  const { error } = await db
    .from('feed_item_tags')
    .upsert(tagInserts, { onConflict: 'feed_item_id,capability_id', ignoreDuplicates: true })

  if (error) result.errors.push(`Tagging: ${error.message}`)
  else result.tagged = tagInserts.length
}

async function runProblemMatching(db: Db, items: FeedItem[], result: AggregationResult): Promise<void> {
  const { data: activeProblems } = await db.from('problem_fields').select('*').eq('is_active', true)
  if (!activeProblems?.length) return

  const matches = matchBatch(activeProblems as ProblemField[], items)
  if (matches.length === 0) return

  const { error } = await db.from('problem_matches').upsert(
    matches.map((m) => ({
      problem_field_id: m.problemFieldId,
      feed_item_id: m.feedItemId,
      confidence: m.confidence,
      match_method: 'keyword',
      match_reason: m.matchReason,
    })),
    { onConflict: 'problem_field_id,feed_item_id', ignoreDuplicates: true }
  )

  if (error) result.errors.push(`Matching: ${error.message}`)
  else result.matches = matches.length
}

// ── Public entry point ───────────────────────────────────────────────────────

export async function runAggregation(): Promise<AggregationResult> {
  const result: AggregationResult = {
    fetched: 0, inserted: 0, duplicates: 0, tagged: 0, matches: 0, errors: [],
  }
  const db = createServiceClient()

  const rawItems = await fetchAllSources(result.errors)
  result.fetched = rawItems.length
  if (rawItems.length === 0) return result

  const inserted = await upsertFeedItems(db, rawItems, result)
  if (inserted.length === 0) return result

  // Tagging and problem matching are independent — run in parallel
  await Promise.all([
    tagInsertedItems(db, inserted, result),
    runProblemMatching(db, inserted, result),
  ])

  return result
}
