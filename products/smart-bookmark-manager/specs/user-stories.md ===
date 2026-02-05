# User Stories

## Format

Als {User-Type} möchte ich {Action} um {Benefit}

---

## Epic: Bookmark Management

### Story 1: Add New Bookmark

**Als:** Wissensarbeiter  
**Möchte ich:** Eine URL mit einem Klick speichern  
**Um:** Interessante Links schnell zu sammeln ohne Unterbrechung meines Workflows

**Acceptance Criteria:**
- [ ] User kann URL in Input-Field eingeben
- [ ] System validiert URL-Format  
- [ ] Bookmark wird gespeichert mit Titel, URL, Timestamp
- [ ] User sieht Erfolgs-Bestätigung innerhalb 2 Sekunden
- [ ] AI-Kategorisierung läuft automatisch im Hintergrund

**Priority:** High  
**Estimate:** 8 Story Points

### Story 2: View AI Categories

**Als:** Power-User  
**Möchte ich:** Automatisch vorgeschlagene Kategorien für meine Bookmarks sehen  
**Um:** Meine Links zu organisieren ohne manuelle Arbeit

**Acceptance Criteria:**
- [ ] System zeigt 2-3 AI-generierte Kategorie-Vorschläge pro Bookmark
- [ ] Kategorien sind verständlich und relevant (>70% User-Akzeptanz)
- [ ] AI-Verarbeitung dauert <3 Sekunden
- [ ] Loading-State während AI-Verarbeitung sichtbar

**Priority:** High  
**Estimate:** 13 Story Points

### Story 3: Override AI Categories

**Als:** Wissensarbeiter  
**Möchte ich:** AI-Kategorie-Vorschläge anpassen können  
**Um:** Bookmarks nach meinem persönlichen System zu organisieren

**Acceptance Criteria:**
- [ ] User kann AI-Kategorien editieren/löschen
- [ ] User kann eigene Kategorien hinzufügen
- [ ] Änderungen werden sofort gespeichert
- [ ] User kann zwischen "AI Mode" und "Manual Mode" wechseln

**Priority:** High  
**Estimate:** 5 Story Points

### Story 4: Search Bookmarks

**Als:** Power-User  
**Möchte ich:** Meine Bookmarks durchsuchen können  
**Um:** Gespeicherte Links schnell wiederzufinden

**Acceptance Criteria:**
- [ ] Search-Field durchsucht Titel, URL und Kategorien
- [ ] Suchergebnisse erscheinen in <500ms
- [ ] Relevante Ergebnisse werden zuerst angezeigt
- [ ] Keine Ergebnisse → Hilfreiche "Not Found" Message

**Priority:** High  
**Estimate:** 8 Story Points

### Story 5: Filter by Categories

**Als:** Wissensarbeiter  
**Möchte ich:** Bookmarks nach Kategorien filtern  
**Um:** Thematisch verwandte Links schnell zu finden

**Acceptance Criteria:**
- [ ] Sidebar zeigt alle verfügbaren Kategorien
- [ ] Click auf Kategorie filtert Bookmark-Liste
- [ ] Aktive Filter sind visuell hervorgehoben
- [ ] "Clear Filters" Button verfügbar

**Priority:** Medium  
**Estimate:** 5 Story Points

---

## Epic: User Management

### Story 6: User Registration

**Als:** Neuer User  
**Möchte ich:** Einen Account erstellen  
**Um:** Meine Bookmarks zu speichern und zu verwalten

**Acceptance Criteria:**
- [ ] User kann sich mit Email/Password registrieren
- [ ] Email-Verification erforderlich
- [ ] Account wird in <5 Sekunden erstellt
- [ ] User wird automatisch zu Dashboard weitergeleitet

**Priority:** High  
**Estimate:** 3 Story Points (Clerk handled)

### Story 7: User Login

**Als:** Bestehender User  
**Möchte ich:** Mich in meinen Account einloggen  
**Um:** Auf meine gespeicherten Bookmarks zuzugreifen

**Acceptance Criteria:**
- [ ] User kann sich mit Email/Password einloggen
- [ ] "Remember Me" Option verfügbar
- [ ] Falscher Login → Hilfreiche Error Message
- [ ] Erfolgreicher Login → Weiterleitung zu Dashboard

**Priority:** High  
**Estimate:** 2 Story Points (Clerk handled)

---

## Epic: Bookmark Organization

### Story 8: View All Bookmarks

**Als:** User  
**Möchte ich:** Alle meine Bookmarks in einer Liste sehen  
**Um:** Einen Überblick über meine gesammelten Links zu haben

**Acceptance Criteria:**
- [ ] Dashboard zeigt alle User-Bookmarks
- [ ] Sortierung nach Datum (neueste zuerst)
- [ ] Pagination bei >50 Bookmarks
- [ ] Jeder Bookmark zeigt Titel, URL, Kategorien, Datum

**Priority:** High  
**Estimate:** 5 Story Points

### Story 9: Mark as Favorite

**Als:** Power-User  
**Möchte ich:** Bookmarks als Favoriten markieren  
**Um:** Wichtige Links schnell zu finden

**Acceptance Criteria:**
- [ ] Heart/Star Icon bei jedem Bookmark
- [ ] Click togglet Favorite-Status
- [ ] "Favorites" Filter in Sidebar
- [ ] Favoriten visuell hervorgehoben

**Priority:** Low  
**Estimate:** 3 Story Points

### Story 10: Delete Bookmarks

**Als:** User  
**Möchte ich:** Bookmarks löschen können  
**Um:** Meine Sammlung sauber zu halten

**Acceptance Criteria:**
- [ ] Delete-Button bei jedem Bookmark
- [ ] Confirmation Dialog vor Löschung
- [ ] Gelöschte Bookmarks verschwinden sofort aus Liste
- [ ] Keine Restore-Funktion (MVP Einschränkung)

**Priority:** Medium  
**Estimate:** 3 Story Points