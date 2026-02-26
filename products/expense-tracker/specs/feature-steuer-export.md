# Feature Spec: Steuer-Export

**Feature ID**: ET-F03
**Status**: APPROVED
**Priority**: P1 (MVP-wichtig)
**Version**: 1.0

---

## Zweck

Ermöglicht Freelancern, ihre erfassten Ausgaben für die Steuererklärung aufzubereiten und als CSV-Datei zu exportieren. Export muss direkt vom Steuerberater verwendbar sein.

## User Stories

| ID | Als... | möchte ich... | damit... | Akzeptanzkriterium |
|----|--------|---------------|---------|-------------------|
| US-01 | Dr. Weber (Steuerberater) | CSV mit klaren Spalten erhalten | ich die Daten direkt in Excel/DATEV importieren kann | CSV enthält alle relevanten Felder, UTF-8 kodiert |
| US-02 | Max (Freelancer) | Zeitraum für Export wählen | ich nur das aktuelle Steuerjahr exportiere | Datepicker für Von-Bis-Datum |
| US-03 | Stefan (Berater) | Export-Vorschau sehen | ich sicher bin was exportiert wird | Tabellen-Vorschau mit Summen vor Download |
| US-04 | Lisa (Designerin) | Belege als ZIP mitzuschicken | ich dem Steuerberater alles auf einmal schicke | Optional: ZIP mit CSV + alle Beleg-Fotos |
| US-05 | Ingrid (Tech-Laie) | den Export per Email versenden können | ich ihn nicht erst selbst speichern muss | Share-Button öffnet Mail-App mit Export als Anhang |

## Funktionale Anforderungen

### F1: Export-Konfiguration

```
Export-Dialog mit Optionen:
  Zeitraum:
    [ ] Aktuelles Jahr (default)
    [ ] Letztes Jahr
    [ ] Quartal (Q1-Q4)
    [ ] Benutzerdefiniert (Von-Bis Datepicker)

  Kategorien:
    [ ] Alle Kategorien (default)
    [ ] Nur steuerrelevante
    [ ] Bestimmte Kategorien (Multiselect)

  Format:
    [●] CSV (Standard, empfohlen)
    [ ] ZIP mit CSV + Belegen

  Trennzeichen (für Deutschland):
    [●] Semikolon (;) — Excel DE
    [ ] Komma (,) — Excel EN
    [ ] Tab
```

### F2: CSV-Format (Standard)

**Dateiname**: `ausgaben_YYYY-MM-DD_YYYY-MM-DD.csv`

**Encoding**: UTF-8 mit BOM (für Windows Excel-Kompatibilität)

**Header-Zeile**:
```
Datum;Betrag (EUR);Kategorie;Steuerrelevant;Beschreibung;Händler;Zahlungsart;Beleg-Datei;Erstellt am
```

**Daten-Zeile Beispiel**:
```
15.03.2026;49,99;Software & Lizenzen;Ja;GitHub Pro Jahresabo;GitHub Inc;Karte;beleg_2026-03-15_github.jpg;2026-03-15T14:32:00
```

**Zusammenfassungs-Block am Ende**:
```
;;;;;;;;;;
ZUSAMMENFASSUNG;;;;;;;;;;
Zeitraum;01.01.2026 - 31.12.2026;;;;;;;;;
Gesamt-Ausgaben;2.847,50 EUR;;;;;;;;;
Steuerrelevant;2.341,20 EUR;;;;;;;;;
Nicht steuerrelevant;506,30 EUR;;;;;;;;;
;;;;;;;;;;
NACH KATEGORIE;;;;;;;;;;
Software & Lizenzen;384,00 EUR;;;;;;;;;
Hardware & Geräte;899,00 EUR;;;;;;;;;
[...weitere Kategorien]
```

### F3: ZIP-Export (optional)

```
Dateiname: ausgaben_YYYY-MM-DD_YYYY-MM-DD.zip

Inhalt:
  /ausgaben_YYYY-MM-DD_YYYY-MM-DD.csv
  /belege/
    beleg_2026-01-15_laptop.jpg
    beleg_2026-02-03_adobe.pdf
    [alle Belege des Zeitraums]
  /LESEMICH.txt  (Erklärung der CSV-Spalten)
```

**LESEMICH.txt Inhalt**:
```
ExpenseTracker Export
=====================
Erstellt am: [Datum]
Zeitraum: [Von] - [Bis]

Spalten-Erklärung:
- Datum: Kaufdatum der Ausgabe
- Betrag: In Euro, Dezimalkomma (,)
- Kategorie: Buchungskategorie
- Steuerrelevant: Ja = steuerlich absetzbar
- Beschreibung: Notiz zur Ausgabe
- Händler: Name des Verkäufers
- Zahlungsart: Bar/Karte/Überweisung/Sonstige
- Beleg-Datei: Dateiname im Ordner /belege/
- Erstellt am: Zeitpunkt der Erfassung in der App

Hinweis: Dies ist keine Steuerberatung.
Bitte prüfen Sie alle Angaben mit Ihrem Steuerberater.
```

### F4: Export-Vorschau

```
Modal vor Download:
  ┌─────────────────────────────────┐
  │ Export-Vorschau                 │
  │                                 │
  │ Zeitraum: 01.01.2026 - 31.12.26│
  │ Ausgaben: 47 Einträge           │
  │ Gesamtbetrag: 2.847,50 €        │
  │ Steuerrelevant: 2.341,20 €      │
  │                                 │
  │ [Tabelle: Erste 5 Einträge]     │
  │ ...                             │
  │                                 │
  │ [Abbrechen]  [📥 Herunterladen] │
  └─────────────────────────────────┘
```

### F5: Share-Funktion

```
"Teilen" Button:
  - Web Share API (mobile): Öffnet nativen Share-Dialog
  - Fallback: Öffnet mailto: mit Anhang (falls unter 25MB)
  - Fallback 2: "Datei gespeichert, bitte manuell teilen"
```

## Non-Funktionale Anforderungen

| Anforderung | Zielwert |
|-------------|---------|
| Export-Generierung (100 Einträge) | < 2 Sekunden |
| ZIP-Generierung (mit Belegen) | < 10 Sekunden |
| Max. Einträge pro Export | 10.000 (LocalStorage-Limit) |
| CSV-Kompatibilität | Excel 2016+, LibreOffice, Google Sheets |

## Security-Anforderungen

- [ ] Export nur über explizite User-Aktion (kein Auto-Export)
- [ ] Keine Übertragung an externe Server
- [ ] Downloads via Blob-URL (kein data: URL für große Dateien → Memory)
- [ ] ZIP-Passwort optional (Phase 2)
- [ ] Keine Metadaten-Leaks in Blob-URLs

## Accessibility-Anforderungen

- [ ] Export-Dialog: `role="dialog"`, `aria-labelledby`
- [ ] Focus Trap im Dialog
- [ ] Download-Button: `aria-describedby` mit Beschreibung was heruntergeladen wird
- [ ] Ladeindikator: `role="progressbar"` oder `aria-busy`
- [ ] Erfolgsmeldung: `role="alert"`

## DSGVO-Konformität

```
- Alle Daten bleiben lokal (kein Server-Upload)
- Export enthält ausschließlich vom User selbst eingegebene Daten
- Kein Tracking welche Daten exportiert werden
- User hat vollständige Kontrolle über Export-Inhalte
- "Alle Daten löschen" Funktion löscht auch Export-History
```

## Steuerberater-Kompatibilität

Getestet mit folgenden Formaten und Tools:
- Microsoft Excel (DE) — Semikolon-Trenner, UTF-8 BOM
- LibreOffice Calc — UTF-8, Semikolon
- Google Sheets — Upload via CSV
- DATEV-Kompatibilität (Phase 3 — direkte DATEV-Integration)

**Hinweis in App**: "Dies ist kein offizielles Steuer-Dokument. Lassen Sie die Angaben von einem Steuerberater prüfen."

## Edge Cases

| Szenario | Verhalten |
|----------|-----------|
| Keine Ausgaben im Zeitraum | Dialog zeigt "Keine Ausgaben gefunden" |
| Beleg-Datei fehlt (gelöscht) | CSV-Zeile bleibt, Beleg-Spalte = "Beleg nicht mehr verfügbar" |
| Sonderzeichen in Beschreibung | Korrekt escaped in CSV (Anführungszeichen) |
| Betrag 0,00 € | Wird exportiert (z.B. kostenlose Downloads dokumentiert) |
| ZIP > 100 MB | Warnung anzeigen, Download trotzdem ermöglichen |

## Abhängigkeiten

- `feature-beleg-capture.md` — Zu exportierende Ausgaben
- `feature-kategorien.md` — Kategorie-Namen im Export
- JSZip oder native File API (Blob + URL.createObjectURL)

## Akzeptanzkriterien (Definition of Done)

- [ ] CSV-Export generiert korrektes Format
- [ ] UTF-8 BOM vorhanden (Excel-Kompatibilität)
- [ ] ZIP-Export enthält CSV + alle Beleg-Dateien
- [ ] LESEMICH.txt in ZIP vorhanden
- [ ] Export-Vorschau zeigt korrekte Zusammenfassung
- [ ] Share-Funktion nutzt Web Share API mit Fallback
- [ ] A11y: Dialog vollständig tastatur-zugänglich
- [ ] DSGVO: Kein externer Server-Call während Export
- [ ] Quality Gate: GREEN
