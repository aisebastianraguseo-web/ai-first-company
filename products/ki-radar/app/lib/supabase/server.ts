// Server-side Supabase clients
// SEC-001/002 FIX: createAuthenticatedClient uses the caller's Clerk JWT so RLS applies.
// Setup required: In Clerk dashboard → JWT Templates → create "supabase" template
//   with claim: { "role": "authenticated", "sub": "{{user.id}}" }
// Docs: https://clerk.com/docs/integrations/databases/supabase

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Server-side: use non-prefixed key so it is never bundled into client JS (SEC-006)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Authenticated client — uses the caller's Clerk JWT so all RLS policies apply.
 * User A CANNOT access User B's problem_fields or problem_matches.
 *
 * Usage in API routes:
 *   const { userId, getToken } = auth()
 *   const jwt = await getToken({ template: 'supabase' })
 *   const db = createAuthenticatedClient(jwt!)
 */
export function createAuthenticatedClient(clerkJwt: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${clerkJwt}` },
    },
    auth: { persistSession: false },
  })
}

/**
 * Service role client — bypasses ALL RLS policies.
 * Only for trusted server-side background jobs (aggregation, matching cron).
 * NEVER call from user-facing API routes.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  })
}
