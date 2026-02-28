import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that don't require auth
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and aggregate endpoint (has own CRON_SECRET auth)
    '/((?!_next/static|_next/image|favicon.ico|api/aggregate|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
