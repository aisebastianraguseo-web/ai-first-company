// QA-001 FIX: VC News / Industry Blog source adapter
// Only RSS feeds used — no HTML scraping (ADR-005: ToS-safe)

import type { FeedItem } from '../../supabase/types'

interface RssSource {
  name: string
  url: string
  type: 'vc_news' | 'industry_blog'
}

// All sources have public RSS feeds — no scraping needed
const VC_SOURCES: RssSource[] = [
  { name: 'a16z AI', url: 'https://a16z.com/tag/ai/feed/', type: 'vc_news' },
  { name: 'Sequoia Capital', url: 'https://www.sequoiacap.com/rss/', type: 'vc_news' },
  { name: 'The Batch (deeplearning.ai)', url: 'https://www.deeplearning.ai/the-batch/feed/', type: 'industry_blog' },
  { name: 'Import AI', url: 'https://importai.substack.com/feed', type: 'industry_blog' },
  { name: 'AI Supremacy', url: 'https://aisupremacy.substack.com/feed', type: 'industry_blog' },
]

function parseItem(
  itemXml: string,
  sourceName: string,
  sourceType: RssSource['type']
): Partial<FeedItem> | null {
  const get = (tag: string) => {
    const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`).exec(itemXml)
    return m ? m[1].trim() : null
  }

  const title = get('title')
  const link = get('link') ?? get('guid')
  const pubDate = get('pubDate') ?? get('published') ?? get('updated')
  const description = get('description') ?? get('summary')

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
    source_type: sourceType,
    source_name: sourceName,
    source_url: link,
    title,
    summary_short: cleanDesc,
    summary_plain: null,
    published_at: publishedAt,
    language: 'en' as const,
    relevance_score: sourceType === 'vc_news' ? 0.75 : 0.7,
  }
}

export async function fetchVcNews(): Promise<Partial<FeedItem>[]> {
  const results: Partial<FeedItem>[] = []

  const fetches = VC_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'KI-Radar/1.0 (https://ki-radar.vercel.app)' },
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) return

      const xml = await response.text()
      const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
      let match

      while ((match = itemRegex.exec(xml)) !== null) {
        const item = parseItem(match[1], source.name, source.type)
        if (item) results.push(item)
      }
    } catch {
      console.warn(`[vc-news] Failed to fetch ${source.url}`)
    }
  })

  await Promise.allSettled(fetches)
  return results
}
