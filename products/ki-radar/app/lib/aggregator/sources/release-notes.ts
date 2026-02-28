// QA-001 FIX: Official Release Notes source adapter
// Fetches from RSS/Atom feeds of major AI providers
// All are official feeds — no ToS concerns (ADR-005: Option A)

import type { FeedItem } from '../../supabase/types'

interface RssSource {
  name: string
  url: string
  weight: number  // relevance baseline
}

const RSS_SOURCES: RssSource[] = [
  { name: 'Anthropic News', url: 'https://www.anthropic.com/rss.xml', weight: 0.9 },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', weight: 0.9 },
  { name: 'Google AI Blog', url: 'https://blog.research.google/feeds/posts/default', weight: 0.85 },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', weight: 0.8 },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', weight: 0.85 },
]

function parseRssItem(itemXml: string, sourceName: string, weight: number): Partial<FeedItem> | null {
  const get = (tag: string) => {
    const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`).exec(itemXml)
    return m ? m[1].trim() : null
  }

  const title = get('title')
  const link = get('link') ?? get('guid')
  const pubDate = get('pubDate') ?? get('published') ?? get('updated')
  const description = get('description') ?? get('summary') ?? get('content:encoded')

  if (!title || !link) return null

  const cleanDesc = description
    ? description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280)
    : null

  let publishedAt: string
  try {
    publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
  } catch {
    publishedAt = new Date().toISOString()
  }

  return {
    source_type: 'release_notes' as const,
    source_name: sourceName,
    source_url: link,
    title,
    summary_short: cleanDesc,
    summary_plain: null,
    published_at: publishedAt,
    language: 'en' as const,
    relevance_score: weight,
  }
}

export async function fetchReleaseNotes(): Promise<Partial<FeedItem>[]> {
  const results: Partial<FeedItem>[] = []

  const fetches = RSS_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'KI-Radar/1.0 (https://ki-radar.vercel.app)',
          Accept: 'application/rss+xml, application/atom+xml, text/xml',
        },
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) return

      const xml = await response.text()
      const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
      let match

      while ((match = itemRegex.exec(xml)) !== null) {
        const item = parseRssItem(match[1], source.name, source.weight)
        if (item) results.push(item)
      }
    } catch {
      console.warn(`[release-notes] Failed to fetch ${source.url}`)
    }
  })

  await Promise.allSettled(fetches)
  return results
}
