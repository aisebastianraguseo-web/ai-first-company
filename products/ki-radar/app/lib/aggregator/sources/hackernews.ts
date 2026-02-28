// Hacker News Source — Official Algolia API
// Rate limit: none documented, be polite (1 req/s)
// Docs: https://hn.algolia.com/api

import type { FeedItem } from '../../supabase/types'

const HN_API = 'https://hn.algolia.com/api/v1/search'

// AI-related search tags on HN
const AI_TAGS = [
  'openai', 'anthropic', 'llm', 'large language model',
  'gpt', 'claude', 'gemini', 'mistral', 'ai safety',
  'machine learning release',
]

interface HNHit {
  objectID: string
  title: string
  url: string | null
  story_text: string | null
  points: number
  created_at: string
  _highlightResult?: { title?: { value?: string } }
}

export async function fetchHackerNews(maxResults = 15): Promise<Partial<FeedItem>[]> {
  const query = AI_TAGS.slice(0, 3).join(' OR ')  // Algolia OR syntax
  const params = new URLSearchParams({
    query,
    tags: 'story',
    hitsPerPage: String(maxResults),
    attributesToRetrieve: 'objectID,title,url,story_text,points,created_at',
  })

  const response = await fetch(`${HN_API}?${params}`, {
    headers: { 'User-Agent': 'KI-Radar/1.0' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`HN API error: ${response.status}`)
  }

  const data = await response.json() as { hits: HNHit[] }

  return data.hits
    .filter((hit) => hit.url && hit.title)  // Skip text-only posts without URL
    .map((hit) => ({
      source_type: 'hackernews' as const,
      source_name: 'Hacker News',
      source_url: hit.url!,
      title: hit.title,
      summary_short: hit.story_text
        ? hit.story_text.replace(/<[^>]+>/g, '').slice(0, 280)
        : `${hit.points} points on Hacker News`,
      summary_plain: null,
      published_at: hit.created_at,
      language: 'en' as const,
      // Higher score for highly-voted items
      relevance_score: Math.min(0.5 + (hit.points / 1000) * 0.5, 1.0),
    }))
}
