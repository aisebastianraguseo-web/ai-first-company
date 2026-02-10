# Feature: Painless Add

## Overview

User können URLs mit minimalem Aufwand als Bookmarks speichern. Ein Input-Field, ein Click, fertig. AI-Kategorisierung läuft automatisch im Hintergrund.

## User Story

Als Wissensarbeiter möchte ich eine URL mit einem Klick speichern um interessante Links schnell zu sammeln ohne Unterbrechung meines Workflows.

## Acceptance Criteria

- [ ] URL Input-Field prominent auf Dashboard platziert
- [ ] URL-Format wird validiert (http/https required)
- [ ] System extrahiert automatisch Titel von Website
- [ ] Bookmark wird mit Titel, URL, Timestamp, User-ID gespeichert
- [ ] Erfolgs-Feedback innerhalb 2 Sekunden
- [ ] AI-Kategorisierung startet automatisch (async)
- [ ] Duplicate URLs werden erkannt und abgelehnt

## User Flow

1. User sieht "Add Bookmark" Input-Field auf Dashboard
2. User fügt URL ein (paste oder type)
3. User drückt Enter oder klickt "Add" Button  
4. System validiert URL-Format
5. System fetcht Website-Titel (timeout nach 10 Sekunden)
6. Bookmark erscheint sofort in Liste mit "Categorizing..." Status
7. AI-Kategorisierung läuft im Hintergrund
8. Kategorien erscheinen nach 1-3 Sekunden automatisch

## UI/UX Requirements

[Add Bookmark Input Field - Full Width]
┌─────────────────────────────────────────────────────────────┐
│ 🔗 https://example.com                              [Add]    │
└─────────────────────────────────────────────────────────────┘

Status Messages:
✅ "Bookmark saved! AI is categorizing..."
❌ "Invalid URL format" 
❌ "This URL is already bookmarked"
⏳ "Fetching page title..."

## Edge Cases

- What if URL is invalid format? → Show inline error "Please enter valid URL (https://...)"
- What if URL is duplicate? → Show error "This URL is already in your bookmarks" + link to existing
- What if website is unreachable? → Save with URL as title, show warning "Could not fetch title"
- What if title extraction takes >10s? → Timeout, use URL as title
- What if AI categorization fails? → Bookmark saved, categories remain empty, retry later

## Technical Notes

- Use fetch() with 10s timeout for title extraction
- Extract title from <title> tag or og:title meta tag
- Store bookmark immediately, trigger AI categorization as background job
- Database: bookmarks table with user_id, url, title, created_at
- Validation: URL regex pattern matching

## Dependencies

- Requires User Authentication (user must be logged in)
- Requires Database connection
- AI Categorization feature will update this bookmark asynchronously

## Open Questions

- [ ] Should we show website favicon alongside bookmark?
- [ ] Should we validate that URL is actually reachable before saving?
- [ ] What if user adds same URL multiple times quickly? (Race condition)