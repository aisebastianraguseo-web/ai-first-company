# Feature: Smart Search

## Overview

Text-based Suchfunktion die Bookmarks nach Titel, URL und Kategorien durchsucht. Schnelle Antwortzeiten (<500ms) und relevante Ergebnisse.

## User Story

Als Power-User möchte ich meine Bookmarks durchsuchen können um gespeicherte Links schnell wiederzufinden.

## Acceptance Criteria

- [ ] Search-Field durchsucht Titel, URL und Kategorien
- [ ] Suchergebnisse erscheinen in <500ms
- [ ] Partial matches werden gefunden (z.B. "react" findet "React Hooks")
- [ ] Case-insensitive Suche
- [ ] Keine Ergebnisse → Hilfreiche "Not Found" Message mit Vorschlägen
- [ ] Search-Highlight in Ergebnissen zeigt Match-Stellen
- [ ] Auto-complete/Suggestions für häufige Suchbegriffe

## User Flow

1. User klickt in Search-Field (prominent im Header/Dashboard)
2. User tippt Suchbegriff (z.B. "javascript")
3. System sucht während User tippt (debounced nach 300ms)
4. Ergebnisse erscheinen unter Search-Field oder ersetzen Hauptliste
5. User klickt auf Ergebnis → öffnet URL in neuem Tab
6. Search bleibt aktiv für weitere Suchen

## UI/UX Requirements

Header Search:
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search bookmarks...                                  │
└─────────────────────────────────────────────────────────┘

Results (while typing):
┌─────────────────────────────────────────────────────────┐
│ Found 3 results for "react":                           │
│ ─────────────────────────────────────────────────────── │
│ 📄 **React** Hooks Tutorial                            │
│ 🔗 https://reactjs.org/hooks                           │ 
│ 🏷️ Development • **React** • Tutorial                  │
│ ─────────────────────────────────────────────────────── │
│ 📄 Advanced **React** Patterns                         │
│ 🔗 https://advanced-**react**.com                      │
│ 🏷️ **React** • JavaScript • Patterns                  │
└─────────────────────────────────────────────────────────┘

No Results:
┌─────────────────────────────────────────────────────────┐
│ No bookmarks found for "xyz"                           │
│ • Check your spelling                                  │  
│ • Try different keywords                               │
│ • Browse by categories instead                         │
└─────────────────────────────────────────────────────────┘

## Edge Cases

- What if search term is <2 characters? → Show "Type at least 2 characters"
- What if search returns 100+ results? → Show first 20, "Show more" button
- What if database is slow? → Show loading spinner after 500ms
- What if user searches for special characters? → Escape properly, don't break query
- What if user searches while AI is still categorizing? → Include uncategorized bookmarks too

## Technical Notes

**Database Query:**
SELECT * FROM bookmarks b
LEFT JOIN bookmark_categories bc ON b.id = bc.bookmark_id
WHERE b.user_id = $1 
AND (
  b.title ILIKE '%' || $2 || '%' 
  OR b.url ILIKE '%' || $2 || '%'
  OR bc.category_name ILIKE '%' || $2 || '%'
)
ORDER BY b.created_at DESC
LIMIT 20

**Frontend Implementation:**
- Debounce search input (300ms delay)
- Use SWR or React Query for caching
- Highlight search terms in results
- Clear search with Escape key

**Performance:**
- Database indexes on title, url columns
- Full-text search with PostgreSQL (if needed later)
- Cache frequent searches client-side

## Dependencies

- Requires User Authentication (search only user's bookmarks)
- Requires Bookmark data to exist
- Requires Database with proper indexing

## Open Questions

- [ ] Should we track popular search terms for auto-complete?
- [ ] Should we search bookmark content/descriptions (if we add that later)?
- [ ] Do we need search filters (by date, category, favorites)?
- [ ] Should search history be saved per user?

[ASSUMPTION: Users primarily search by topic/title, not URL | REASON: More natural user behavior]
[DECISION: Text search only in MVP, no semantic/vector search | REASON: Complexity and cost control]