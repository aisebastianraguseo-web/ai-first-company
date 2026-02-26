# Feature Spec: Beleg-Capture

**Feature ID**: ET-F01
**Status**: APPROVED
**Priority**: P0 (MVP-kritisch)
**Version**: 1.0

---

## Zweck

Ermöglicht Nutzern das schnelle Erfassen von Ausgaben durch Kamera-Aufnahme eines Belegs oder manuelle Eingabe. Kern-Interaktion der App — muss in unter 30 Sekunden abgeschlossen sein.

## User Stories

| ID | Als... | möchte ich... | damit... | Akzeptanzkriterium |
|----|--------|---------------|---------|-------------------|
| US-01 | Lisa (Freelance Designer) | ein Foto meines Kassenbons machen | ich ihn sofort archiviere ohne ihn aufzuheben | Foto wird lokal gespeichert, Thumbnail sichtbar in Liste |
| US-02 | Max (Freelance Dev) | Betrag manuell eingeben | ich auch ohne Beleg Ausgaben tracken kann | Eingabe ohne Foto möglich, Pflichtfeld: Betrag + Kategorie |
| US-03 | Stefan (Berater) | Notiz zur Ausgabe hinzufügen | ich bei der Steuererklärung weiß wofür | Freitextfeld optional, max 200 Zeichen |
| US-04 | Ingrid (Tech-Laie) | eine klare Bestätigung sehen | ich weiß dass es gespeichert wurde | Visuelles Feedback (Toast/Animation) nach Speichern |
| US-05 | Hacker Hans | keine Schadsoftware einschleusen | — | Datei-Validierung schlägt fehl, Fehlermeldung angezeigt |

## Funktionale Anforderungen

### F1: Kamera-Funktion
```
- Kamera-Zugriff über Browser Camera API (getUserMedia / input[type=file][capture])
- Fallback: File-Upload wenn Kamera nicht verfügbar
- Unterstützte Formate: JPEG, PNG, PDF
- Max. Dateigröße: 10 MB
- Komprimierung: Bilder auf max. 1920x1080px skalieren (clientseitig)
- Orientierung: EXIF-Rotation korrigieren
```

### F2: Manuelle Eingabe
```
Pflichtfelder:
  - Betrag (Dezimalzahl, max. 2 Nachkommastellen, max. 99.999,99€)
  - Datum (default: heute, Kalender-Picker)
  - Kategorie (Dropdown, aus categories.yaml)

Optionale Felder:
  - Beschreibung/Notiz (max 200 Zeichen)
  - Beleg-Foto (File Upload)
  - Händler/Empfänger (max 100 Zeichen)
  - Zahlungsart (Bar, Karte, Überweisung)
```

### F3: Validierung
```
Client-seitig (sofort):
  - Betrag: nur positive Zahlen, kein Komma-Separator-Fehler
  - Datum: nicht in der Zukunft (max: heute)
  - Datei-Typ: Whitelist [image/jpeg, image/png, application/pdf]
  - Datei-Größe: max 10 MB (Fehler wenn überschritten)

Server-seitig (Phase 1: n/a — nur LocalStorage)
```

### F4: Speicherung
```
Speicherort: LocalStorage + IndexedDB (Fotos)
Format: JSON pro Ausgabe
Schema:
  {
    "id": "uuid-v4",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "amount": 42.50,
    "currency": "EUR",
    "date": "YYYY-MM-DD",
    "category_id": "string",
    "description": "string | null",
    "merchant": "string | null",
    "payment_method": "cash|card|transfer|other",
    "receipt": {
      "file_name": "string",
      "file_type": "image/jpeg|image/png|application/pdf",
      "file_size_bytes": number,
      "thumbnail_data_url": "string (base64, 200x200px)"
    } | null
  }
```

## Nicht-Funktionale Anforderungen

| Anforderung | Zielwert |
|-------------|---------|
| Erfassungszeit (gesamt) | < 30 Sekunden |
| Kamera-Öffnung | < 2 Sekunden |
| Speicherung | < 500ms |
| Offline-fähig | Ja (Service Worker) |
| Touch-Targets | min 44x44px (WCAG 2.5.5) |
| Kontrast | ≥ 4.5:1 (WCAG 1.4.3) |

## Security-Anforderungen

Referenz: `../../governance/security-policy.md`

- [ ] **Datei-Validierung**: Magic Bytes prüfen (nicht nur Extension/MIME-Type)
- [ ] **Dateigröße-Limit**: 10 MB serverseitig erzwingen (Phase 2), clientseitig (Phase 1)
- [ ] **Kein Code-Execution**: Dateiinhalte werden nie ausgeführt
- [ ] **XSS-Prevention**: Dateinamen HTML-escapen bei Anzeige
- [ ] **IndexedDB Isolation**: Keine Cross-Origin-Zugriffe möglich

## Accessibility-Anforderungen

Referenz: `../../governance/accessibility-policy.md`

- [ ] Kamera-Button: `aria-label="Beleg fotografieren"`
- [ ] Upload-Button: `aria-label="Beleg aus Galerie wählen"`
- [ ] Formular-Felder: Explizite Labels (kein Placeholder als Label-Ersatz)
- [ ] Fehler-Meldungen: `role="alert"` für Screenreader
- [ ] Tastatur-Navigation: Vollständig ohne Maus bedienbar
- [ ] Bestätigung: Akustisches/taktiles Feedback optional (bei PWA)

## Edge Cases

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Kamera verweigert | Weiche auf File-Upload zurück, erklärende Meldung |
| Foto zu groß | Clientseitige Komprimierung, dann speichern |
| LocalStorage voll | Fehlermeldung mit Hinweis zum Export + Löschen |
| PDF-Upload | Erste Seite als Thumbnail rendern (PDF.js oder native) |
| Offline | Vollständig funktionsfähig (Speichern lokal) |
| Doppelter Submit | Button nach erstem Klick deaktivieren (Debounce) |

## UI-Skizze (Wireframe-Beschreibung)

```
┌─────────────────────────┐
│  ← Zurück    Ausgabe +  │  (Header)
├─────────────────────────┤
│                         │
│  [ 📷 Foto aufnehmen  ] │  (Primary CTA)
│  [ 📁 Aus Galerie     ] │  (Secondary)
│                         │
├─────────────────────────┤
│  Betrag (€)  [____.__]  │
│  Datum       [TT.MM.YY] │
│  Kategorie   [▼ Essen ] │
│  Notiz       [________] │
│              [________] │
│                         │
│  [   Ausgabe speichern  ]│  (Primary Button)
└─────────────────────────┘
```

## Abhängigkeiten

- `feature-kategorien.md` — Kategorie-System muss definiert sein
- PWA Manifest + Service Worker
- IndexedDB für Foto-Storage

## Akzeptanzkriterien (Definition of Done)

- [ ] Unit-Tests für Validierungslogik (100% Coverage)
- [ ] Lighthouse Performance ≥ 90
- [ ] Lighthouse A11y ≥ 95
- [ ] Security Challenger: GREEN
- [ ] Quality Gate: GREEN
- [ ] Getestet mit: Max, Lisa, Stefan, Ingrid Personas
- [ ] Adversarial Test: Hacker Hans — alle Angriffe abgewehrt
