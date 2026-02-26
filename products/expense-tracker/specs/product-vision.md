# Product Vision — ExpenseTracker

## Vision Statement

> "ExpenseTracker ist die einfachste Art für Freelancer, Ausgaben zu erfassen, Belege zu archivieren und die Steuererklärung vorzubereiten — ohne Cloud-Zwang, ohne Abo-Modell, ohne Komplexität."

## Problem

Freelancer verlieren jährlich durchschnittlich 8-12 Stunden mit dem Suchen, Sortieren und Kategorisieren von Belegen für die Steuererklärung. Bisherige Lösungen sind entweder:
- Zu komplex (Buchhaltungssoftware)
- Zu teuer (DATEV, Lexoffice)
- Nicht offline-fähig (reine Cloud-Apps)
- Datenschutzproblematisch (US-Server)

## Zielgruppe (primär)

**Freelancer in Deutschland** mit 10-100 Ausgaben/Monat:
- Entwickler, Designer, Berater
- Einzelunternehmer / Kleingewerbetreibende
- Keine Buchhaltungskenntnisse erwartet
- Nutzen Smartphone und Desktop

## Lösungsansatz

1. **Capture First**: Beleg sofort nach Kauf fotografieren (30 Sekunden)
2. **Smart Categorize**: Automatische Kategorisierung (Phase 2) / Manuell (Phase 1)
3. **Easy Export**: Ein-Klick CSV-Export für Steuerberater

## Value Proposition

| Feature | ExpenseTracker | Konkurrenz |
|---------|---------------|-----------|
| Offline-first | ✅ | ❌ meist Cloud |
| DSGVO by design | ✅ (lokal) | ⚠️ |
| Kostenlos (Phase 1) | ✅ | ❌ Abo |
| Einfachheit | ✅ (3 Schritte) | ❌ Komplex |
| Beleg-Archiv | ✅ | ✅ |

## User Journey (Kernflow)

```
1. Ausgabe entstanden
   └─→ App öffnen (3 sec)
       └─→ Foto schießen ODER Betrag tippen
           └─→ Kategorie auswählen / bestätigen
               └─→ Gespeichert ✓ (lokal)

2. Steuererklärung vorbereiten
   └─→ Zeitraum auswählen
       └─→ "Exportieren" klicken
           └─→ CSV herunterladen
               └─→ An Steuerberater schicken ✓
```

## Erfolgsmetriken (MVP)

| Metrik | Ziel |
|--------|------|
| Ausgabe erfassen (Zeit) | < 30 Sekunden |
| Export erstellen | < 60 Sekunden |
| Onboarding ohne Hilfe | 90% der User |
| Fehlerrate | < 2% |
| Performance Score | ≥ 90 (Lighthouse) |
| A11y Score | ≥ 95 (WCAG 2.1 AA) |

## Non-Goals (Phase 1)

- Keine automatische OCR / KI-Erkennung
- Kein Cloud-Sync
- Kein Mehrbenutzer
- Kein DATEV-Export
- Kein Rechnungsschreiben
- Keine Steuerberechnung

## Technische Leitprinzipien

1. **Offline-First**: Alles im LocalStorage, Service Worker für PWA
2. **Zero Dependencies**: Kein Framework — reines HTML/CSS/JS
3. **Privacy by Design**: Kein Tracking, keine externen Requests
4. **Progressive Enhancement**: Funktioniert auch ohne JS (Grundfunktion)
5. **Mobile First**: Primär für Smartphone-Nutzung optimiert

## Referenzen

- Agent: `../../agents/meta/spec-writer.md`
- Personas: `personas/variables.yaml`
- MVP-Scope: `mvp-scope.md`
- Governance: `../../governance/`
