# Smart Bookmark Manager - Vision

**Version:** 1.0  
**Datum:** 2026-02-05  
**Status:** Draft

---

## Problem Statement

### Wer hat das Problem?
- Wissensarbeiter (Researcher, Developer, Designer)
- Power-User mit 200+ Browser-Bookmarks
- Teams die Ressourcen gemeinsam sammeln

### Was ist das Problem?
Menschen speichern hunderte Bookmarks aber finden sie nie wieder, weil:
1. Manuelle Kategorisierung ist zu viel Aufwand
2. Browser-Bookmarks haben schlechte Suchfunktion
3. Keine Tags/Notizen ohne Extra-Klicks
4. Keine Team-Sharing Features

### Wie groß ist das Problem?
- **Frequency:** Täglich (jeder vergessene Bookmark = verschwendete Zeit)
- **Impact:** Produktivitätsverlust, Frustration
- **Current Solutions:** Browser-Bookmarks, Pocket, Raindrop.io
  - **Problem mit Existing:** Alle erfordern manuelle Kategorisierung

---

## Lösung

### High-Level Konzept
Ein Bookmark Manager der URLs **automatisch mit AI kategorisiert**, sodass User sie wiederfinden ohne manuelles Tagging.

### Unique Value Proposition
**"Save it, find it - ohne zu denken"**

Andere Bookmark Manager: Manuelle Kategorisierung ODER Chaos  
Wir: AI kategorisiert automatisch, aber User kann override

### Core Features (MVP)

#### 1. Painless Add
- Browser-Extension (später) ODER Manual URL-Entry
- Ein Klick → Bookmark gespeichert
- AI läuft automatisch im Hintergrund

#### 2. AI Kategorisierung
- Claude API analysiert URL-Content
- Schlägt 2-3 Kategorien vor
- User kann akzeptieren oder manuell anpassen

#### 3. Smart Search
- Suche nach Titel, URL, Kategorie
- (Phase 2: Semantic Search mit Embeddings)

#### 4. Simple Organization
- Kategorien als Filter
- Datum-Sorting
- Favoriten/Archive

#### 5. User Authentication
- Clerk.dev für Auth
- Jeder User hat eigene Bookmarks (keine Team-Features im MVP)

---

## Nicht im MVP

(Wichtig zu definieren um Scope Creep zu vermeiden)

- ❌ Browser Extension (nur Web-Interface)
- ❌ Team-Sharing / Kollaboration
- ❌ Advanced Semantic Search (nur Basic)
- ❌ Mobile App
- ❌ Import von anderen Tools (kann manuell re-add)
- ❌ Auto-Screenshot von Websites
- ❌ Reminder-System ("check this bookmark again in 1 week")

---

## Success Metrics (Post-MVP)

### User Activation
- User added >10 Bookmarks innerhalb 7 Tage

### Retention
- User kommt zurück (DAU/MAU >20%)

### AI Quality
- User akzeptiert AI-Kategorien in >70% der Fälle

---

## Technical Constraints

### Budget
- **Target:** <$10/month für 100 active users
- **AI Cost:** Claude API ~$0.01 per Bookmark
- **Infrastructure:** Vercel Free Tier (bis 100GB bandwidth)

### Tech Stack (Decision)
- **Frontend:** Next.js 14 + React + Tailwind
- **Auth:** Clerk.dev
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude Sonnet
- **Deployment:** Vercel

**Reasoning:**
- Next.js: Fast to develop, good DX, Vercel integration
- Clerk: Avoid building auth from scratch
- Supabase: Generous free tier, good API, Postgres
- Claude: Best at content understanding (vs OpenAI for categorization)

---

## Open Questions

(To be validated)

1. Wie gut funktioniert AI-Kategorisierung wirklich?
   - Test needed: 100 diverse URLs
   
2. Wie viele Kategorien sind optimal? (2? 5? 10? User-defined?)
   
3. Reicht Text-only oder brauchen wir URL-Screenshots für AI?

4. Performance: Wie lange dauert AI-Categorization?
   - Acceptable: <3 seconds
   - Ideal: <1 second

---

## Assumptions (zu validieren mit Beta-Testern)

1. [ASSUMPTION] User wollen Auto-Kategorisierung mehr als manuelle Kontrolle
2. [ASSUMPTION] User haben 50-500 Bookmarks (nicht 5 und nicht 10.000)
3. [ASSUMPTION] User nutzen primär Desktop (nicht Mobile)
4. [ASSUMPTION] Kategorien (Tags) sind besser als Ordner-Hierarchie
