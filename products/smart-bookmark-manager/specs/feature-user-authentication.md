# Feature: User Authentication

## Overview

Clerk.dev Integration für User Registration, Login, und Session Management. Jeder User hat eigene private Bookmark-Sammlung.

## User Story

Als neuer User möchte ich einen Account erstellen und als bestehender User mich einloggen um auf meine gespeicherten Bookmarks zuzugreifen.

## Acceptance Criteria

- [ ] User kann sich mit Email/Password registrieren
- [ ] Email-Verification erforderlich vor erstem Login
- [ ] User kann sich mit Email/Password einloggen  
- [ ] "Remember Me" Funktionalität (längere Session)
- [ ] User kann Passwort zurücksetzen
- [ ] User kann sich ausloggen
- [ ] Protected Routes: Unauthenticated User → Login Page
- [ ] User Profile Page mit Account Settings

## User Flow

**Registration:**
1. User kommt auf Landing Page
2. User klickt "Sign Up" 
3. Clerk Registration Modal öffnet sich
4. User gibt Email + Password ein
5. System sendet Verification Email
6. User klickt Link in Email
7. User wird zu Dashboard weitergeleitet

**Login:**
1. User kommt auf Landing Page
2. User klickt "Sign In"
3. Clerk Login Modal öffnet sich  
4. User gibt Credentials ein
5. Erfolgreicher Login → Dashboard
6. Fehlschlag → Error Message

## UI/UX Requirements

Landing Page:
┌─────────────────────────────────────────────────────────┐
│ Smart Bookmark Manager                    [Sign Up] [Sign In] │
│                                                         │
│ Save it, find it - ohne zu denken                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • AI categorizes your bookmarks automatically          │
│ • Smart search finds everything                        │
│ • No manual organization needed                        │
│                                                         │
│                    [Get Started Free]                   │
└─────────────────────────────────────────────────────────┘

Clerk Modal (handled by Clerk):
┌─────────────────────────────────────┐
│ Sign up                             │
│ ─────────────────────────────────── │
│ Email: [                    ]       │
│ Password: [                 ]       │
│ [ ] I agree to Terms of Service     │
│                    [Sign Up]        │
│                                     │
│ Already have account? Sign in       │
└─────────────────────────────────────┘

## Edge Cases

- What if email is already registered? → Clerk handles error message
- What if user doesn't verify email? → Cannot access protected routes
- What if user forgets password? → Clerk password reset flow
- What if Clerk service is down? → Show maintenance message, no access to app
- What if user's session expires? → Auto-redirect to login, preserve intended destination

## Technical Notes

**Clerk Configuration:**
// _app.js
import { ClerkProvider } from '@clerk/nextjs'

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <Component {...pageProps} />
    </ClerkProvider>
  )
}

**Protected Routes:**
// middleware.js
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
});

**Database Integration:**
- Use Clerk User ID as foreign key in bookmarks table
- Sync user data via Clerk webhooks
- No need to store passwords (Clerk handles)

**Environment Variables:**
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

## Dependencies

- Requires Clerk.dev account and API keys
- Requires HTTPS for production (Clerk requirement)
- Requires webhook endpoint for user sync

## Open Questions

- [ ] Do we need social login (Google, GitHub) in MVP?
- [ ] Should we collect additional user data during signup?
- [ ] Do we need user deletion/account deactivation?
- [ ] What happens to bookmarks when user deletes account?

[DECISION: Use Clerk over building custom auth | REASON: Security, maintenance, faster development]
[ASSUMPTION: Email/password auth is sufficient for MVP | REASON: Social login adds complexity]