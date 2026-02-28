// GET  /api/problems  — list user's problem fields with recent match counts
// POST /api/problems  — create new problem field
// SEC-001 FIX: uses createAuthenticatedClient with Clerk JWT → RLS active

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '../../../lib/supabase/server'
import { z } from 'zod'
// Strip all HTML tags — equivalent to DOMPurify with ALLOWED_TAGS:[]
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const MAX_ACTIVE_PROBLEMS = 10

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  industry: z.enum([
    'automotive', 'pharma', 'finance',
    'mechanical_engineering', 'it_saas', 'other',
  ]),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
})

function sanitiseText(text: string): string {
  return sanitize(text)
}

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data, error } = await db
    .from('problem_fields')
    .select(`
      id, title, description, industry, priority, is_active, created_at,
      problem_matches ( id, confidence, created_at )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const annotated = (data ?? []).map((p) => ({
    ...p,
    recent_match_count: (p.problem_matches ?? []).filter(
      (m: { created_at: string }) => m.created_at >= cutoff
    ).length,
    problem_matches: undefined,
  }))

  return NextResponse.json({ problems: annotated })
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { count } = await db
    .from('problem_fields')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if ((count ?? 0) >= MAX_ACTIVE_PROBLEMS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_ACTIVE_PROBLEMS} aktive Problemfelder erreicht.` },
      { status: 422 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { title, description, industry, priority } = parsed.data

  const { data, error } = await db
    .from('problem_fields')
    .insert({
      user_id: userId,
      title: sanitiseText(title),
      description: description ? sanitiseText(description) : null,
      industry,
      priority,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json({ problem: data }, { status: 201 })
}
