// KI-Radar — Database Types
// Source of truth: infrastructure/schema.sql

export type SourceType =
  | 'release_notes'
  | 'github'
  | 'arxiv'
  | 'vc_news'
  | 'industry_blog'
  | 'hackernews'

export type Industry =
  | 'automotive'
  | 'pharma'
  | 'finance'
  | 'mechanical_engineering'
  | 'it_saas'
  | 'other'

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type MatchMethod = 'keyword' | 'semantic'
export type UserFeedback = 'relevant' | 'not_relevant'
export type AssignedBy = 'system' | 'human'

export interface CapabilityTag {
  id: string
  slug: string
  name: string
  icon: string
  description_technical: string
  description_plain: string
  is_active: boolean
  created_at: string
}

export interface FeedItem {
  id: string
  source_type: SourceType
  source_name: string
  source_url: string
  title: string
  summary_short: string | null
  summary_plain: string | null
  published_at: string
  fetched_at: string
  relevance_score: number
  language: 'en' | 'de'
  is_archived: boolean
}

export interface FeedItemTag {
  feed_item_id: string
  capability_id: string
  confidence: number
  assigned_at: string
  assigned_by: AssignedBy
}

// Feed item enriched with its tags
export interface FeedItemWithTags extends FeedItem {
  tags: Array<CapabilityTag & { confidence: number }>
}

export interface ProblemField {
  id: string
  user_id: string
  title: string
  description: string | null
  industry: Industry
  priority: Priority
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProblemMatch {
  id: string
  problem_field_id: string
  feed_item_id: string
  confidence: number
  match_method: MatchMethod
  match_reason: string | null
  user_feedback: UserFeedback | null
  created_at: string
}

export interface ProblemMatchWithItem extends ProblemMatch {
  feed_item: FeedItemWithTags
}

// ── API request/response shapes ────────────────────────────────────────

export interface CreateProblemFieldInput {
  title: string
  description?: string
  industry: Industry
  priority?: Priority
}

export interface FeedResponse {
  items: FeedItemWithTags[]
  total: number
  page: number
}

export interface CapabilityMapData {
  tags: Array<
    CapabilityTag & {
      recent_count: number   // entries in last 7 days
      is_hot: boolean        // recent_count >= 5
    }
  >
}
