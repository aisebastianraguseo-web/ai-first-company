// GET /api/capabilities — capability taxonomy with recent activity stats
// SEC-001 FIX: uses createAuthenticatedClient with Clerk JWT → RLS active

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '../../../lib/supabase/server'

const HOT_THRESHOLD = 5

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const { data: tags, error: tagError } = await db
    .from('capability_taxonomy')
    .select('id, slug, name, icon, description_technical, description_plain')
    .eq('is_active', true)
    .order('name')

  if (tagError) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const { data: recentCounts } = await db
    .from('feed_item_tags')
    .select('capability_id, feed_items!inner(published_at)')
    .gte('feed_items.published_at', since)

  const countMap: Record<string, number> = {}
  for (const row of recentCounts ?? []) {
    countMap[row.capability_id] = (countMap[row.capability_id] ?? 0) + 1
  }

  const enriched = (tags ?? []).map((tag) => ({
    ...tag,
    recent_count: countMap[tag.id] ?? 0,
    is_hot: (countMap[tag.id] ?? 0) >= HOT_THRESHOLD,
  }))

  return NextResponse.json({ tags: enriched })
}
