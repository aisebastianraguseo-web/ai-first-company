// QA-002 FIX: Inlined as TypeScript constant — avoids fs.readFileSync on Vercel serverless
// Previously: capability-keywords.yaml read at runtime via fs
// Now: bundled at build time, zero filesystem dependency

export interface KeywordRule {
  term: string
  weight: number
}

export type KeywordRuleMap = Record<string, { keywords: KeywordRule[] }>

export const CAPABILITY_KEYWORDS: KeywordRuleMap = {
  'reasoning-planning': {
    keywords: [
      { term: 'reasoning', weight: 0.9 },
      { term: 'chain-of-thought', weight: 1.0 },
      { term: 'planning', weight: 0.8 },
      { term: 'multi-step', weight: 0.8 },
      { term: 'o1', weight: 0.7 },
      { term: 'o3', weight: 0.7 },
      { term: 'thinking', weight: 0.6 },
      { term: 'decomposition', weight: 0.7 },
      { term: 'problem solving', weight: 0.6 },
      { term: 'math', weight: 0.5 },
      { term: 'logic', weight: 0.6 },
    ],
  },
  'language-dialogue': {
    keywords: [
      { term: 'language model', weight: 0.8 },
      { term: 'llm', weight: 0.7 },
      { term: 'gpt', weight: 0.7 },
      { term: 'claude', weight: 0.7 },
      { term: 'gemini', weight: 0.7 },
      { term: 'mistral', weight: 0.7 },
      { term: 'multilingual', weight: 0.9 },
      { term: 'translation', weight: 0.8 },
      { term: 'summarization', weight: 0.8 },
      { term: 'text generation', weight: 0.7 },
      { term: 'instruction following', weight: 0.8 },
      { term: 'dialogue', weight: 0.7 },
    ],
  },
  'vision-multimodal': {
    keywords: [
      { term: 'vision', weight: 0.9 },
      { term: 'multimodal', weight: 1.0 },
      { term: 'image', weight: 0.7 },
      { term: 'video', weight: 0.8 },
      { term: 'audio', weight: 0.7 },
      { term: 'speech', weight: 0.7 },
      { term: 'ocr', weight: 0.8 },
      { term: 'visual', weight: 0.7 },
      { term: 'gpt-4o', weight: 0.8 },
    ],
  },
  'tool-use-agents': {
    keywords: [
      { term: 'agent', weight: 0.9 },
      { term: 'agentic', weight: 1.0 },
      { term: 'tool use', weight: 1.0 },
      { term: 'function calling', weight: 1.0 },
      { term: 'computer use', weight: 1.0 },
      { term: 'autonomous', weight: 0.8 },
      { term: 'orchestration', weight: 0.7 },
      { term: 'code interpreter', weight: 0.9 },
      { term: 'mcp', weight: 0.9 },
      { term: 'model context protocol', weight: 1.0 },
    ],
  },
  'memory-context': {
    keywords: [
      { term: 'context window', weight: 1.0 },
      { term: 'long context', weight: 1.0 },
      { term: 'memory', weight: 0.8 },
      { term: 'rag', weight: 0.9 },
      { term: 'retrieval', weight: 0.8 },
      { term: 'vector', weight: 0.7 },
      { term: 'embedding', weight: 0.7 },
      { term: 'knowledge base', weight: 0.7 },
      { term: '1m token', weight: 0.9 },
    ],
  },
  'api-integration': {
    keywords: [
      { term: 'api', weight: 0.7 },
      { term: 'sdk', weight: 0.8 },
      { term: 'deprecat', weight: 0.9 },
      { term: 'breaking change', weight: 1.0 },
      { term: 'integration', weight: 0.6 },
      { term: 'webhook', weight: 0.7 },
      { term: 'openai api', weight: 0.9 },
      { term: 'anthropic api', weight: 0.9 },
      { term: 'versioning', weight: 0.6 },
    ],
  },
  'performance-speed': {
    keywords: [
      { term: 'faster', weight: 0.8 },
      { term: 'latency', weight: 0.9 },
      { term: 'throughput', weight: 0.8 },
      { term: 'benchmark', weight: 0.7 },
      { term: 'efficient', weight: 0.6 },
      { term: 'quantization', weight: 0.9 },
      { term: 'cheaper', weight: 0.8 },
      { term: 'tokens per second', weight: 0.9 },
    ],
  },
  'safety-alignment': {
    keywords: [
      { term: 'safety', weight: 0.9 },
      { term: 'alignment', weight: 0.9 },
      { term: 'red team', weight: 1.0 },
      { term: 'jailbreak', weight: 0.9 },
      { term: 'guardrail', weight: 0.9 },
      { term: 'constitutional', weight: 0.8 },
      { term: 'hallucination', weight: 0.8 },
      { term: 'bias', weight: 0.7 },
      { term: 'trustworthy', weight: 0.7 },
    ],
  },
}
