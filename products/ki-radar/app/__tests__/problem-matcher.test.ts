// Tests: problem-matcher.ts
// Coverage: scoreProblemMatch, matchFeedItem, matchBatch, security edge cases

import { scoreProblemMatch, matchFeedItem, matchBatch } from '../lib/problem-matcher'
import type { ProblemField, FeedItem } from '../lib/supabase/types'

const makeProblem = (overrides: Partial<ProblemField> = {}): ProblemField => ({
  id: 'uuid-problem-1',
  user_id: 'user_clerk_123',
  title: 'Lieferkettenprognose verbessern',
  description: 'Wir wollen Lieferengpässe früher erkennen durch bessere Vorhersagemodelle',
  industry: 'automotive',
  priority: 'HIGH',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const makeFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'uuid-item-1',
  source_type: 'arxiv',
  source_name: 'ArXiv',
  source_url: 'https://arxiv.org/abs/2501.00001',
  title: 'Supply Chain Forecasting with Reinforcement Learning',
  summary_short: 'We propose RL-based methods to improve supply chain predictions',
  summary_plain: null,
  published_at: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  relevance_score: 0.8,
  language: 'en',
  is_archived: false,
  ...overrides,
})

describe('scoreProblemMatch', () => {
  it('returns a match when title tokens overlap', () => {
    const problem = makeProblem()
    const item = makeFeedItem()
    const result = scoreProblemMatch(problem, item)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBeGreaterThanOrEqual(0.3)
  })

  it('returns null for completely unrelated content', () => {
    const problem = makeProblem({ title: 'Kundensupport automatisieren', description: null })
    const item = makeFeedItem({
      title: 'New vision encoder for satellite imagery',
      summary_short: 'Remote sensing with deep learning',
    })
    const result = scoreProblemMatch(problem, item)
    expect(result).toBeNull()
  })

  it('confidence is between 0 and 1', () => {
    const result = scoreProblemMatch(makeProblem(), makeFeedItem())
    if (result) {
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('match reason is max 200 characters', () => {
    const result = scoreProblemMatch(makeProblem(), makeFeedItem())
    if (result) {
      expect(result.matchReason.length).toBeLessThanOrEqual(200)
    }
  })

  it('returns null for inactive problem fields', () => {
    // matchFeedItem skips inactive — scoreProblemMatch itself doesn't check
    // but matchFeedItem should filter it
    const problem = makeProblem({ is_active: false })
    const item = makeFeedItem()
    // scoreProblemMatch processes it; matchFeedItem should skip it
    const matches = matchFeedItem([problem], item)
    expect(matches).toHaveLength(0)
  })

  it('handles XSS-like title gracefully (no code execution)', () => {
    const problem = makeProblem({
      title: '<script>alert("xss")</script> supply chain',
      description: null,
    })
    // Should not throw; treats as plain text for tokenisation
    expect(() => scoreProblemMatch(problem, makeFeedItem())).not.toThrow()
  })
})

describe('matchFeedItem', () => {
  it('skips inactive problems', () => {
    const problems = [makeProblem({ is_active: false })]
    const item = makeFeedItem()
    expect(matchFeedItem(problems, item)).toHaveLength(0)
  })

  it('returns multiple matches across different problem fields', () => {
    const problems = [
      makeProblem({ id: 'uuid-1', title: 'Lieferkette verbessern', description: null }),
      makeProblem({ id: 'uuid-2', title: 'Supply chain optimierung vorhersage', description: null }),
    ]
    const item = makeFeedItem()
    const results = matchFeedItem(problems, item)
    expect(results.length).toBeGreaterThan(0)
  })

  it('sorts results by confidence descending', () => {
    const problems = [
      makeProblem({ id: 'uuid-1', title: 'Lieferkette', description: null }),
      makeProblem({ id: 'uuid-2', title: 'Lieferkette supply chain vorhersage prediction model forecasting', description: 'Supply chain optimization' }),
    ]
    const item = makeFeedItem()
    const results = matchFeedItem(problems, item)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence)
    }
  })
})

describe('matchBatch', () => {
  it('processes multiple items against multiple problems', () => {
    const problems = [makeProblem()]
    const items = [makeFeedItem(), makeFeedItem({ id: 'uuid-item-2', source_url: 'https://arxiv.org/abs/2' })]
    const results = matchBatch(problems, items)
    expect(Array.isArray(results)).toBe(true)
  })

  it('returns empty array when no matches found', () => {
    const problems = [makeProblem({ title: 'Quantencomputing Hardware', description: null })]
    const items = [makeFeedItem({ title: 'Cat videos go viral', summary_short: 'Trending social media content' })]
    const results = matchBatch(problems, items)
    expect(results).toHaveLength(0)
  })
})
