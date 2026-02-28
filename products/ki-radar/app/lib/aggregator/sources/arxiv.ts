// ArXiv Source — Official API (atom feed)
// Rate limit: 5 req/s, no auth needed
// Docs: https://arxiv.org/help/api/user-manual

import type { FeedItem } from '../../supabase/types'

const ARXIV_API = 'https://export.arxiv.org/api/query'

// AI-relevant search categories
const AI_QUERIES = [
  'cat:cs.AI',
  'cat:cs.LG',
  'cat:cs.CL',
  'cat:cs.CV',
].join('+OR+')

interface ArXivEntry {
  id: string
  title: string
  summary: string
  published: string
  link: string
  authors: string[]
}

function parseAtom(xml: string): ArXivEntry[] {
  const entries: ArXivEntry[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`).exec(block)
      return m ? m[1].trim() : ''
    }
    const linkMatch = /href="([^"]+)"/.exec(block)
    entries.push({
      id: get('id'),
      title: get('title').replace(/\s+/g, ' '),
      summary: get('summary').replace(/\s+/g, ' ').slice(0, 500),
      published: get('published'),
      link: linkMatch?.[1] ?? get('id'),
      authors: [],
    })
  }

  return entries
}

export async function fetchArxiv(maxResults = 20): Promise<Partial<FeedItem>[]> {
  const params = new URLSearchParams({
    search_query: AI_QUERIES,
    sortBy: 'submittedDate',
    sortOrder: 'descending',
    max_results: String(maxResults),
  })

  const response = await fetch(`${ARXIV_API}?${params}`, {
    headers: { 'User-Agent': 'KI-Radar/1.0 (https://ki-radar.vercel.app)' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.status}`)
  }

  const xml = await response.text()
  const entries = parseAtom(xml)

  return entries.map((e) => ({
    source_type: 'arxiv' as const,
    source_name: 'ArXiv',
    source_url: e.link,
    title: e.title,
    summary_short: e.summary.slice(0, 280),
    summary_plain: null, // V2: LLM simplification
    published_at: e.published,
    language: 'en' as const,
    relevance_score: 0.7, // ArXiv = high baseline relevance
  }))
}
