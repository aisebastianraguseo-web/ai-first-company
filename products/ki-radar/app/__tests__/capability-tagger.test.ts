// Tests: capability-tagger.ts
// Coverage: tagFeedItem, tagBatch, edge cases

import { tagFeedItem, tagBatch } from '../lib/capability-tagger'

describe('tagFeedItem', () => {
  it('tags an agent-related article correctly', () => {
    const tags = tagFeedItem(
      'Anthropic releases Claude Computer Use for agentic tool use',
      'New autonomous agent capabilities with function calling and computer use'
    )
    expect(tags.some((t) => t.slug === 'tool-use-agents')).toBe(true)
    const agentTag = tags.find((t) => t.slug === 'tool-use-agents')
    expect(agentTag?.confidence).toBeGreaterThanOrEqual(0.3)
  })

  it('tags a context/memory article', () => {
    const tags = tagFeedItem(
      'New 1M token context window for Gemini Pro',
      'Long context retrieval and memory capabilities for RAG applications'
    )
    expect(tags.some((t) => t.slug === 'memory-context')).toBe(true)
  })

  it('tags a multimodal article', () => {
    const tags = tagFeedItem(
      'GPT-4o vision benchmark results — multimodal reasoning',
      'Image understanding and visual question answering benchmarks'
    )
    expect(tags.some((t) => t.slug === 'vision-multimodal')).toBe(true)
  })

  it('returns maximum 3 tags', () => {
    const tags = tagFeedItem(
      'GPT-4o multimodal agent with long context window and function calling reasoning',
      'Vision tool use memory retrieval autonomous planning API benchmark safety alignment'
    )
    expect(tags.length).toBeLessThanOrEqual(3)
  })

  it('returns empty array for unrelated content', () => {
    const tags = tagFeedItem(
      'Top 10 hiking trails in Switzerland',
      'Explore beautiful mountain landscapes'
    )
    expect(tags).toHaveLength(0)
  })

  it('confidence is between 0 and 1', () => {
    const tags = tagFeedItem(
      'Claude agent tool use function calling autonomous reasoning planning',
      'Agentic workflows with computer use and API integration'
    )
    for (const tag of tags) {
      expect(tag.confidence).toBeGreaterThanOrEqual(0)
      expect(tag.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('sorts results by confidence descending', () => {
    const tags = tagFeedItem(
      'agent autonomous tool use function calling agentic workflow MCP',
      'model context protocol computer use API integration'
    )
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i].confidence).toBeLessThanOrEqual(tags[i - 1].confidence)
    }
  })

  it('handles empty strings without crashing', () => {
    expect(() => tagFeedItem('', '')).not.toThrow()
  })

  it('marks matched terms in result', () => {
    const tags = tagFeedItem('LLM reasoning chain-of-thought planning', 'multi-step decomposition')
    const tag = tags.find((t) => t.slug === 'reasoning-planning')
    expect(tag?.matched_terms.length).toBeGreaterThan(0)
  })
})

describe('tagBatch', () => {
  it('processes multiple items', () => {
    const items = [
      { title: 'New GPT-4o API release', summary: 'API versioning breaking change' },
      { title: 'RLHF safety alignment paper', summary: 'Constitutional AI guardrails' },
    ]
    const results = tagBatch(items)
    expect(results).toHaveLength(2)
  })

  it('returns empty arrays for non-matching items', () => {
    const items = [
      { title: 'Weather forecast for Berlin', summary: 'Sunny skies expected' },
    ]
    const results = tagBatch(items)
    expect(results[0]).toHaveLength(0)
  })
})
