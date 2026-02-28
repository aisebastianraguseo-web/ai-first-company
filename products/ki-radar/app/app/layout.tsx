import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'KI-Radar — KI-Entwicklungen im Überblick',
  description: 'Gefilterte KI-Insights für Innovationsmanager und Technologieentscheider.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="de">
        <body>
          {/* Skip-link for keyboard/screen reader users (WCAG 2.4.1) */}
          <a href="#main-content" className="skip-link">
            Zum Hauptinhalt springen
          </a>
          <main id="main-content">
            {children}
          </main>
          {/* ARIA live region for status announcements (LEARN-004) */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            id="live-region"
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
