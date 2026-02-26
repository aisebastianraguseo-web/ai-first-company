# Feature Spec: Kategorisierung

**Feature ID**: ET-F02
**Status**: APPROVED
**Priority**: P0 (MVP-kritisch)
**Version**: 1.0

---

## Zweck

Ausgaben werden Kategorien zugeordnet, die den deutschen Steuerrichtlinien für Freelancer entsprechen. Phase 1: Manuell. Phase 2: KI-gestützte Auto-Kategorisierung.

## User Stories

| ID | Als... | möchte ich... | damit... | Akzeptanzkriterium |
|----|--------|---------------|---------|-------------------|
| US-01 | Max | Kategorien sehen die für Entwickler relevant sind | ich schnell die richtige Kategorie finde | Kategorie-Liste enthält IT-relevante Einträge |
| US-02 | Dr. Weber | Steuerkonforme Kategorien nutzen | mein Steuerberater die Daten direkt verwenden kann | Kategorien entsprechen EÜR-Positionen |
| US-03 | Lisa | Eigene Kategorien anlegen | ich branchen-spezifische Ausgaben tracken kann | Custom-Kategorie anlegen, bearbeiten, löschen |
| US-04 | Stefan | Häufige Kategorien schnell auswählen | ich Zeit spare bei der Erfassung | Letzte 3 genutzten Kategorien oben angezeigt |
| US-05 | Ingrid | Verständliche Kategorienamen | ich auch ohne Steuerwissen die richtige wähle | Einfache deutsche Namen, kein Steuerjargon |

## Standard-Kategorien (Phase 1)

Basierend auf **EÜR (Einnahmen-Überschuss-Rechnung)** für deutsche Freelancer:

```yaml
categories:
  # ── Betriebsausgaben (steuerlich absetzbar) ──
  - id: hardware
    name: "Hardware & Geräte"
    icon: "💻"
    tax_relevant: true
    eur_position: "Abschreibungen / Geringwertige Wirtschaftsgüter"
    examples: ["Laptop", "Tastatur", "Monitor", "Kamera"]

  - id: software
    name: "Software & Lizenzen"
    icon: "📀"
    tax_relevant: true
    eur_position: "Sonstige betriebliche Aufwendungen"
    examples: ["Adobe CC", "GitHub Pro", "Figma", "Office 365"]

  - id: internet_phone
    name: "Internet & Telefon"
    icon: "📡"
    tax_relevant: true
    eur_position: "Sonstige betriebliche Aufwendungen"
    deductible_rate: 0.8  # 80% bei gemischter Nutzung (Richtwert)
    examples: ["Internet-Rechnung", "Mobilfunk", "Festnetz"]

  - id: office_supplies
    name: "Büromaterial"
    icon: "📎"
    tax_relevant: true
    eur_position: "Bürobedarf"
    examples: ["Drucker-Papier", "Stifte", "Ordner", "Porto"]

  - id: travel
    name: "Reise & Fahrtkosten"
    icon: "🚗"
    tax_relevant: true
    eur_position: "Reisekosten"
    examples: ["Bahn-Ticket", "Parkgebühr", "Hotel", "Taxi"]

  - id: meals_business
    name: "Bewirtung (geschäftlich)"
    icon: "🍽️"
    tax_relevant: true
    eur_position: "Bewirtungskosten"
    deductible_rate: 0.7  # 70% steuerlich absetzbar
    examples: ["Geschäftsessen mit Kunden"]

  - id: education
    name: "Fortbildung & Kurse"
    icon: "📚"
    tax_relevant: true
    eur_position: "Fortbildungskosten"
    examples: ["Udemy", "Konferenz-Ticket", "Fachbuch", "Online-Kurs"]

  - id: marketing
    name: "Marketing & Werbung"
    icon: "📣"
    tax_relevant: true
    eur_position: "Werbekosten"
    examples: ["Google Ads", "LinkedIn", "Visitenkarten", "Website"]

  - id: insurance
    name: "Versicherungen (beruflich)"
    icon: "🛡️"
    tax_relevant: true
    eur_position: "Versicherungen"
    examples: ["Berufshaftpflicht", "Rechtschutz (beruflich)", "BU"]

  - id: accounting
    name: "Steuer & Buchhaltung"
    icon: "🧾"
    tax_relevant: true
    eur_position: "Steuerberatungskosten"
    examples: ["Steuerberater", "DATEV", "Buchhaltungssoftware"]

  - id: home_office
    name: "Homeoffice"
    icon: "🏠"
    tax_relevant: true
    eur_position: "Raumkosten"
    examples: ["Anteil Miete", "Anteil Strom", "Schreibtisch"]

  - id: other_business
    name: "Sonstige Betriebsausgaben"
    icon: "📋"
    tax_relevant: true
    eur_position: "Sonstige betriebliche Aufwendungen"
    examples: ["Diverses"]

  # ── Nicht absetzbar ──
  - id: private
    name: "Privat (nicht absetzbar)"
    icon: "🏷️"
    tax_relevant: false
    examples: ["Persönliche Ausgaben"]
```

## Funktionale Anforderungen

### F1: Kategorie-Auswahl bei Eingabe
```
- Dropdown/Select mit Suche (Fuzzy-Search)
- Icons für schnelle visuelle Erkennung
- Letzte 3 verwendete Kategorien = "Zuletzt genutzt" Gruppe oben
- Keyboard-Navigation (Arrow Keys + Enter)
```

### F2: Benutzerdefinierte Kategorien
```
- Kategorie anlegen: Name (max 50 Zeichen), Icon (aus vordefinierten Set)
- Kategorie bearbeiten: Name, Icon änderbar
- Kategorie löschen: Nur wenn keine Ausgaben zugeordnet
  - Falls Ausgaben vorhanden: Reassignment-Dialog
- Max 20 Custom-Kategorien
```

### F3: Kategorie-Statistiken
```
- Pro Kategorie: Gesamtbetrag, Anzahl Ausgaben
- Zeitraumfilter: Monat, Quartal, Jahr, Custom
- Sortierung: Nach Betrag DESC (default), nach Name, nach Anzahl
- Darstellung: Liste + einfaches Balkendiagramm (SVG, no lib)
```

### F4: Steuer-Relevanz-Markierung
```
- Jede Kategorie hat tax_relevant: true/false
- Beim Export: Steuerlich relevante Ausgaben separat ausgewiesen
- Hinweis-Icon bei Kategorien mit Teilabzugsfähigkeit (z.B. 70% Bewirtung)
```

## Non-Funktionale Anforderungen

| Anforderung | Zielwert |
|-------------|---------|
| Dropdown-Öffnung | < 100ms |
| Suche Response | < 50ms (lokal, instant) |
| Max Kategorien | 50 (Standard + Custom) |

## Accessibility-Anforderungen

- [ ] Dropdown: `role="combobox"`, `aria-expanded`, `aria-autocomplete`
- [ ] Optionen: `role="option"`, `aria-selected`
- [ ] Custom-Kategorie-Dialog: Fokus-Management (Focus Trap)
- [ ] Icons: `aria-hidden="true"` (dekorativ, Text ist Label)

## Security-Anforderungen

- [ ] Kategorie-Name: HTML-Zeichen escapen bei Anzeige (XSS)
- [ ] Kategorie-ID: UUID verwenden (keine incrementellen IDs)
- [ ] Max-Länge erzwingen: 50 Zeichen für Namen

## Edge Cases

| Szenario | Verhalten |
|----------|-----------|
| Kategorie gelöscht, Ausgabe noch vorhanden | Ausgabe zeigt "Kategorie gelöscht" in Grau |
| Alle Custom-Kategorien gelöscht | Standard-Kategorien immer erhalten |
| Kategorie-Name Duplikat | Warnung "Name bereits vorhanden" |
| Import mit unbekannter Kategorie | "Unbekannt" Kategorie erstellen |

## Abhängigkeiten

- `feature-beleg-capture.md` — Kategorie-Feld in Eingabe-Formular
- `feature-steuer-export.md` — Kategorie-basierter Export
- LocalStorage für Persistenz

## Akzeptanzkriterien (Definition of Done)

- [ ] Alle 13 Standard-Kategorien vorhanden und korrekt
- [ ] Custom-Kategorie Create/Edit/Delete funktioniert
- [ ] Kategorie-Statistiken korrekt berechnet
- [ ] A11y: Dropdown vollständig tastaturnavigierbar
- [ ] Quality Gate: GREEN
