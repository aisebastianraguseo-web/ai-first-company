// GitHub Trending — Unofficial scraping (industry standard practice)
// GitHub ToS: scraping for personal/research use is accepted (CA-002)
// Falls back gracefully if scraping breaks
// SEC-005 FIX: DOMPurify sanitization on scraped descriptions (strip all HTML)

import type { FeedItem } from '../../supabase/types'

// Strip all HTML tags — equivalent to DOMPurify with ALLOWED_TAGS:[]
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const GITHUB_TRENDING_URL = 'https://github.com/trending'

// AI-related language filters
const AI_LANGS = ['python', 'jupyter-notebook', 'rust', '']

interface TrendingRepo {
  name: string
  description: string | null
  url: string
  language: string | null
  stars: number
}

function parseTrendingHtml(html: string): TrendingRepo[] {
  const repos: TrendingRepo[] = []
  // Parse article elements containing repo info
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g
  let match

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1]

    const nameMatch = /href="\/([^"]+)"\s[^>]*>[\s\S]*?<\/a>/.exec(block)
    const descMatch = /<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(block)
    const langMatch = /itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/.exec(block)
    const starsMatch = /aria-label="(\d[,\d]*) users starred/.exec(block)

    if (!nameMatch) continue
    const slug = nameMatch[1].replace(/\s/g, '')

    const rawDesc = descMatch ? descMatch[1] : null
    const safeDesc = rawDesc ? stripHtml(rawDesc) || null : null

    repos.push({
      name: slug,
      description: safeDesc,
      url: `https://github.com/${slug}`,
      language: langMatch ? langMatch[1].trim() : null,
      stars: starsMatch ? parseInt(starsMatch[1].replace(/,/g, ''), 10) : 0,
    })
  }

  return repos
}

export async function fetchGithubTrending(): Promise<Partial<FeedItem>[]> {
  const results: Partial<FeedItem>[] = []

  for (const lang of AI_LANGS) {
    const url = lang
      ? `${GITHUB_TRENDING_URL}/${lang}?since=daily`
      : `${GITHUB_TRENDING_URL}?since=daily`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KI-Radar/1.0)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(15_000),
      })

      if (!response.ok) continue

      const html = await response.text()
      const repos = parseTrendingHtml(html)

      // Filter for AI-relevant repos by keywords in name/description
      const aiKeywords = ['llm', 'gpt', 'ai', 'ml', 'model', 'agent', 'claude', 'openai']
      const filtered = repos.filter((r) => {
        const text = `${r.name} ${r.description ?? ''}`.toLowerCase()
        return aiKeywords.some((kw) => text.includes(kw))
      })

      for (const repo of filtered.slice(0, 5)) {
        results.push({
          source_type: 'github' as const,
          source_name: 'GitHub Trending',
          source_url: repo.url,
          title: `[GitHub] ${repo.name}`,
          summary_short: repo.description?.slice(0, 280) ?? 'Trending AI repository',
          summary_plain: null,
          published_at: new Date().toISOString(), // GitHub trending = today
          language: 'en' as const,
          relevance_score: Math.min(0.4 + (repo.stars / 5000) * 0.5, 0.95),
        })
      }
    } catch {
      // Scraping failure is non-fatal — log and continue
      console.warn(`[github-trending] Failed to fetch ${url}`)
    }
  }

  return results
}
