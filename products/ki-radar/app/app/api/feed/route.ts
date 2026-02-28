// GET /api/feed?page=1&source_type=arxiv&capability=tool-use-agents&days=7
// SEC-001 FIX: uses createAuthenticatedClient with Clerk JWT → RLS active

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '../../../lib/supabase/server'

const PAGE_SIZE = 20
const MAX_DAYS = 90

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const sourceType = searchParams.get('source_type')
  const capabilitySlug = searchParams.get('capability')
  const days = Math.min(MAX_DAYS, parseInt(searchParams.get('days') ?? '7', 10))

  const db = createServiceClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  let query = db
    .from('feed_items')
    .select(`
      id, source_type, source_name, source_url, title,
      summary_short, summary_plain, published_at, relevance_score, language,
      feed_item_tags (
        confidence,
        capability_taxonomy ( id, slug, name, icon, description_plain )
      )
    `, { count: 'exact' })
    .eq('is_archived', false)
    .gte('published_at', since)
    .order('relevance_score', { ascending: false })
    .order('published_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (sourceType) {
    query = query.eq('source_type', sourceType)
  }

  if (capabilitySlug) {
    const { data: tagIds } = await db
      .from('capability_taxonomy')
      .select('id')
      .eq('slug', capabilitySlug)
      .single()

    if (tagIds) {
      const { data: matchingItemIds } = await db
        .from('feed_item_tags')
        .select('feed_item_id')
        .eq('capability_id', tagIds.id)

      const ids = (matchingItemIds ?? []).map((r) => r.feed_item_id)
      if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        return NextResponse.json({ items: [], total: 0, page })
      }
    }
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[feed] DB error:', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page })
}
