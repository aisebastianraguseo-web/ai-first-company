# MVP Scope — ExpenseTracker

**Version**: 1.0
**Status**: APPROVED
**Sprint-Target**: 2 Sprints (je 1 Woche)

---

## MVP-Definition

Das MVP ist lieferbar wenn ein Freelancer vollständig von "Ausgabe entstanden" bis "CSV an Steuerberater" ohne externe Tools arbeiten kann.

## IN SCOPE (Phase 1 MVP)

### Must-Haves (P0 — ohne diese kein MVP)

| Feature | Spec | Aufwand |
|---------|------|---------|
| Ausgabe manuell erfassen (Betrag, Datum, Kategorie) | ET-F01 | S |
| Beleg-Foto hochladen (File Input) | ET-F01 | M |
| 13 Standard-Kategorien | ET-F02 | S |
| Ausgaben-Liste mit Filter (Monat/Jahr) | — | M |
| CSV-Export | ET-F03 | M |
| LocalStorage-Persistenz | — | S |
| PWA: Installierbar, Offline-fähig | — | M |

### Should-Haves (P1 — stark empfohlen für MVP)

| Feature | Spec | Aufwand |
|---------|------|---------|
| Ausgaben-Suche | — | S |
| Einfache Statistiken (Gesamt, nach Kategorie) | ET-F02 | S |
| Beleg-Vorschau in App | ET-F01 | S |
| ZIP-Export mit Belegen | ET-F03 | S |
| Custom Kategorien | ET-F02 | S |
| Daten löschen (einzeln + alle) | — | S |

### Could-Haves (P2 — nice to have, wenn Zeit bleibt)

| Feature | Aufwand |
|---------|---------|
| Dark Mode | S |
| Mehrere Währungen | M |
| Wiederkehrende Ausgaben | M |
| Ausgaben bearbeiten (nach Speichern) | S |

## OUT OF SCOPE (Phase 1)

Diese Features sind **explizit ausgeschlossen** und müssen nicht implementiert werden:

- OCR / automatische Beleg-Erkennung
- Cloud-Sync / Backup
- Mehrere Nutzer / Freigabe
- DATEV-Export
- Steuerberechnung oder Steuerberatung
- Einnahmen-Tracking
- Rechnungsschreiben
- Bankverbindung / Bank-Import
- Mobile App (nativ iOS/Android)
- Backend / API
- User-Accounts / Login

## Sprint-Plan

### Sprint 1 (Woche 1): Core Foundation

**Ziel**: Ausgabe erfassen und lokal speichern

```
Tag 1-2: Projekt-Setup
  - PWA-Grundstruktur (manifest.json, service-worker.js)
  - HTML-Skeleton (App Shell)
  - CSS Design System (Farben, Typography, Spacing)
  - LocalStorage Service

Tag 3-4: Beleg-Capture (ET-F01)
  - Eingabe-Formular (Betrag, Datum, Kategorie)
  - File-Upload für Beleg-Foto
  - Validierung
  - Speicherung in LocalStorage + IndexedDB

Tag 5: Kategorien (ET-F02)
  - 13 Standard-Kategorien implementieren
  - Dropdown-Komponente
  - "Zuletzt genutzt" Logik
```

**Sprint 1 Definition of Done**:
- [ ] Ausgabe erfassen und speichern funktioniert
- [ ] Beleg-Foto hochladen funktioniert
- [ ] Daten persistent nach App-Neustart

### Sprint 2 (Woche 2): View & Export

**Ziel**: Ausgaben anzeigen und exportieren

```
Tag 1-2: Ausgaben-Liste
  - Liste mit allen Ausgaben
  - Filter: Monat / Jahr
  - Suche
  - Ausgabe löschen
  - Beleg-Vorschau

Tag 3: Statistiken + Custom Kategorien
  - Gesamt-Summen
  - Summen nach Kategorie
  - Custom-Kategorie anlegen/bearbeiten/löschen

Tag 4: Export (ET-F03)
  - CSV-Export mit Konfiguration
  - ZIP-Export mit Belegen
  - Export-Vorschau

Tag 5: PWA + QA
  - Service Worker (Offline-Support)
  - Installierbarkeit testen
  - Lighthouse-Check
  - A11y-Check
  - Security-Check
```

**Sprint 2 Definition of Done**:
- [ ] Ausgaben-Liste mit Filter funktioniert
- [ ] CSV-Export funktioniert (Excel-kompatibel)
- [ ] App ist installierbar (PWA)
- [ ] Lighthouse Score ≥ 90 (alle Kategorien)
- [ ] WCAG 2.1 AA: Alle kritischen Flows
- [ ] Security Challenger: GREEN

## Technische Architektur (Phase 1)

```
📁 /
├── index.html          (App Entry Point)
├── manifest.json       (PWA Manifest)
├── service-worker.js   (Offline Cache)
├── 📁 css/
│   ├── reset.css       (Normalize)
│   ├── design-tokens.css (Variablen)
│   ├── components.css  (UI Komponenten)
│   └── app.css         (App-spezifisch)
├── 📁 js/
│   ├── app.js          (App Entry)
│   ├── router.js       (SPA Routing)
│   ├── storage.js      (LocalStorage + IndexedDB)
│   ├── categories.js   (Kategorie-Daten + Logik)
│   ├── expenses.js     (Ausgaben-Logik)
│   ├── export.js       (CSV + ZIP Export)
│   └── 📁 components/
│       ├── expense-form.js
│       ├── expense-list.js
│       ├── category-select.js
│       └── export-dialog.js
├── 📁 icons/           (PWA Icons)
└── 📁 tests/
    ├── storage.test.js
    ├── expenses.test.js
    ├── export.test.js
    └── categories.test.js
```

## Qualitäts-Gates (MVP)

Alle müssen GREEN sein vor Release:

| Gate | Schwellwert |
|------|------------|
| Test Coverage | ≥ 80% |
| Lighthouse Performance | ≥ 90 |
| Lighthouse A11y | ≥ 95 |
| Lighthouse Best Practices | ≥ 90 |
| Lighthouse SEO | ≥ 80 |
| Security Challenger | 0 CRITICAL, 0 HIGH |
| A11y Challenger | 0 CRITICAL |

## Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| IndexedDB Speicherlimit | Niedrig | Hoch | User-Warnung bei 80% Füllstand |
| Browser-Kompatibilität Camera API | Mittel | Mittel | File-Input Fallback implementiert |
| LocalStorage gelöscht (Browser) | Niedrig | Hoch | Export-Reminder nach je 10 Ausgaben |
| Große Belege → Slow ZIP | Mittel | Niedrig | Web Worker für ZIP-Generierung |

## Erfolgs-Kriterien MVP

Das MVP ist erfolgreich wenn:
1. Eine Person ohne Anleitung in < 5 Minuten die erste Ausgabe erfasst
2. Ein Steuerberater den CSV-Export ohne Rückfragen nutzen kann
3. Alle Quality Gates GREEN sind
4. 5 verschiedene Personas die App ohne Frustration nutzen können (Usability Test)
