// POST /api/aggregate
// Protected by CRON_SECRET (not Clerk) — called by GitHub Actions Cron
// SEC-004 FIX: timing-safe comparison via crypto.timingSafeEqual
// SEC-007 FIX: generic error messages in response body
// SEC-008 FIX: guard for missing CRON_SECRET env var

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { runAggregation } from '../../../lib/aggregator'

function verifyCronSecret(provided: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  // SEC-008: Fail closed if secret is not configured
  if (!secret) {
    console.error('[aggregate] CRON_SECRET is not set — refusing all requests')
    return false
  }
  if (!provided) return false

  const providedTrimmed = provided.trim()
  if (secret.length !== providedTrimmed.length) return false

  try {
    // SEC-004: timing-safe comparison prevents timing attacks
    return timingSafeEqual(Buffer.from(secret), Buffer.from(providedTrimmed))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Use X-Cron-Secret header to avoid Clerk middleware JWT validation on Authorization header
  if (!verifyCronSecret(req.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAggregation()
    const httpStatus = result.errors.length > 0 ? 207 : 200
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, { status: httpStatus })
  } catch (err) {
    // SEC-007: log details server-side, return generic message to caller
    console.error('[aggregate] Fatal error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
