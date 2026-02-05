# Feature: Simple Organization

## Overview

User können Bookmarks nach Kategorien filtern, nach Datum sortieren, und Favoriten markieren. Einfache, übersichtliche Organisation ohne komplexe Hierarchien.

## User Story

Als Wissensarbeiter möchte ich meine Bookmarks nach Kategorien filtern und als Favoriten markieren um thematisch verwandte oder wichtige Links schnell zu finden.

## Acceptance Criteria

- [ ] Sidebar zeigt alle verfügbaren Kategorien mit Anzahl
- [ ] Click auf Kategorie filtert Bookmark-Liste
- [ ] Aktive Filter sind visuell hervorgehoben  
- [ ] "Clear Filters" / "Show All" Button verfügbar
- [ ] Sort-Dropdown: "Newest First", "Oldest First", "Alphabetical"
- [ ] Heart/Star Icon zum Markieren von Favoriten
- [ ] "Favorites" Filter in Sidebar
- [ ] Favoriten sind visuell hervorgehoben (gelber Stern)

## User Flow

**Category Filtering:**
1. User sieht Sidebar mit allen Kategorien (z.B. "Development (15)", "Design (8)")
2. User klickt auf "Development" 
3. Hauptliste zeigt nur Development-Bookmarks
4. Sidebar zeigt "Development" als aktiv
5. "Clear Filter" Button erscheint
6. User kann weitere Kategorien dazu-filtern (OR-Verknüpfung)

**Favorites:**
1. User hoviert über Bookmark
2. Heart-Icon erscheint
3. User klickt Heart → Bookmark wird Favorite (gelber Stern)
4. User klickt "Favorites" in Sidebar
5. Nur favorisierte Bookmarks werden angezeigt

## UI/UX Requirements

Layout:
┌─────────────────┬─────────────────────────────────────────┐
│ SIDEBAR         │ MAIN CONTENT                            │
│                 │                                         │
│ 📂 All (23)     │ [Sort: Newest First ▼]  [Clear Filter] │
│ 🏷️ Development │ ─────────────────────────────────────── │
│    (15)         │ 📄 React Hooks Tutorial                │
│ 🏷️ Design (8)  │ 🔗 https://react.dev                   │
│ 🏷️ Marketing   │ 🏷️ Development • React       ⭐       │
│    (3)          │ 📅 2 hours ago                          │
│ ⭐ Favorites    │ ─────────────────────────────────────── │
│    (5)          │ 📄 CSS Grid Guide                      │
│                 │ 🔗 https://css-tricks.com              │
│                 │ 🏷️ Development • CSS        ♡         │
│                 │ 📅 1 day ago                            │
└─────────────────┴─────────────────────────────────────────┘

States:
♡ = Not favorite (empty heart)
⭐ = Favorite (filled star)
🏷️ Development (15) = Active filter (highlighted)

## Edge Cases

- What if user has no bookmarks in selected category? → Show "No bookmarks in this category" message
- What if user has 50+ categories? → Scroll in sidebar, search categories field
- What if bookmark has no categories yet (AI processing)? → Show in "Uncategorized" section
- What if user tries to filter by multiple categories? → Show union (OR logic) of both categories
- What if user marks/unmarks favorite quickly? → Debounce database calls

## Technical Notes

**Database Schema:**
-- Add to bookmarks table
ALTER TABLE bookmarks ADD COLUMN is_favorite BOOLEAN DEFAULT false;

-- Categories from existing bookmark_categories table
-- No changes needed

**API Endpoints:**
GET /api/bookmarks?category=Development&favorite=true&sort=newest
PUT /api/bookmarks/:id/favorite (toggle favorite status)
GET /api/categories (get all categories for current user)

**Frontend State:**
- Use URL params for filters (?category=Development&favorite=true)
- Sidebar reflects current URL state
- Browser back/forward works correctly

## Dependencies

- Requires AI Categorization feature (for category data)
- Requires User Authentication
- Requires Bookmark data to exist

## Open Questions

- [ ] Should categories be sorted alphabetically or by count?
- [ ] Do we need a "Recently Added" quick filter?
- [ ] Should we limit visible categories to top 10 + "Show more"?
- [ ] Do we need multi-select for categories (AND logic instead of OR)?

[ASSUMPTION: Users prefer OR logic for category filtering | REASON: More inclusive, finds more results]
[DECISION: No folder hierarchies in MVP | REASON: Simplicity, categories are sufficient]