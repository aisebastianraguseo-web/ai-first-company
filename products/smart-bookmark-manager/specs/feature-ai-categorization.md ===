# Feature: AI Kategorisierung

## Overview

Claude API analysiert den Inhalt einer Website und schlägt 2-3 relevante Kategorien vor. Läuft automatisch nach dem Speichern eines Bookmarks im Hintergrund.

## User Story

Als Power-User möchte ich automatisch vorgeschlagene Kategorien für meine Bookmarks sehen um meine Links zu organisieren ohne manuelle Arbeit.

## Acceptance Criteria

- [ ] AI analysiert Website-Inhalt und schlägt 2-3 Kategorien vor
- [ ] Kategorisierung dauert <3 Sekunden in 90% der Fälle  
- [ ] Kategorien sind verständlich und relevant (>70% User-Akzeptanz target)
- [ ] Loading-State während AI-Verarbeitung sichtbar
- [ ] Fallback bei AI-Fehlern (leere Kategorien, retry möglich)
- [ ] Kategorien werden automatisch im UI aktualisiert wenn fertig

## User Flow

1. User fügt neuen Bookmark hinzu
2. Bookmark erscheint mit "🤖 Categorizing..." Status
3. System fetcht Website-Content (HTML)
4. System sendet Content an Claude API mit Prompt
5. Claude antwortet mit 2-3 Kategorie-Vorschlägen
6. Kategorien werden in Database gespeichert  
7. UI aktualisiert sich automatisch (WebSocket oder Polling)
8. User sieht finale Kategorien ohne Page-Refresh

## UI/UX Requirements

Bookmark Card:
┌─────────────────────────────────────────────────────────┐
│ 📄 "How to use React Hooks"                            │
│ 🔗 https://react.dev/hooks                             │
│ 🤖 Categorizing...          [Loading spinner]          │ ← During processing
│ ─────────────────────────────────────────────────────── │
│ 🏷️ Development • React • Tutorial                      │ ← After AI completion
│ 📅 2 minutes ago                                       │
└─────────────────────────────────────────────────────────┘

## Edge Cases

- What if website blocks scraping/has no content? → Use title + URL only, add "General" category
- What if Claude API is down? → Store bookmark without categories, show retry button, queue for later
- What if Claude returns inappropriate categories? → Fallback filter list of allowed categories
- What if website requires JavaScript (SPA)? → Use basic HTML only, inform user "Limited content available"
- What if categorization takes >10s? → Show timeout message, allow manual categorization

## Technical Notes

**API Integration:**
- Use Anthropic Claude 3 Sonnet API
- Extract main content text (remove nav, footer, ads)
- Prompt: "Analyze this webpage content and suggest 2-3 short, descriptive categories that would help someone organize this bookmark. Website: [title] Content: [text]"

**Content Extraction:**
- Fetch HTML with user-agent header
- Extract text from <main>, <article>, or <body>
- Limit to first 2000 characters to control API costs
- Remove script tags, style tags, navigation

**Database:**
- bookmark_categories table: bookmark_id, category_name
- ai_processing_jobs table: bookmark_id, status, retry_count, error_message

**Cost Control:**
- Max 2000 chars per request (~$0.01 per bookmark)
- Rate limiting: Max 10 concurrent requests
- Retry failed requests max 3 times

## Dependencies

- Requires Painless Add feature (bookmark must exist first)
- Requires Database connection
- Requires Claude API key and credits
- Requires Website content fetching capability

## Open Questions

- [ ] Should we cache AI results to avoid re-processing same URLs?
- [ ] How do we handle paywalled/login-required content?
- [ ] Should categories be global across all users or user-specific?
- [ ] What's our backup plan if Claude API becomes too expensive?

[ASSUMPTION: Categories are user-specific | REASON: Different users organize differently]
[DECISION: Use Claude over OpenAI | REASON: Better at content understanding and categorization]