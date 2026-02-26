# Feature Spec: OCR + Auto-Kategorisierung

**Feature ID**: ET-F04
**Phase**: 2
**Status**: PLANNED — Implementierung nach MVP-Deployment
**Priority**: P0 (Phase 2 Core)
**Version**: 1.0
**Decision**: DEC-003 (2026-02-25)

---

## Vision

> "Beleg fotografieren → fertig. Betrag, Datum, Händler und Kategorie werden automatisch erkannt."

Der User macht ein Foto — die App extrahiert alle relevanten Daten und schlägt die passende Kategorie vor. Der User bestätigt in einem Klick.

## Voraussetzungen

- Phase 1 MVP deployed auf Vercel ✓
- Tests GREEN ✓
- User-Feedback nach MVP-Launch gesammelt

## Technologie-Entscheidung (offen, BATCH_APPROVAL)

Drei Optionen für die OCR-Engine — Entscheidung steht aus:

| Option | Technologie | Kosten | Datenschutz | Offline |
|--------|------------|--------|-------------|---------|
| **A** | OpenAI GPT-4o Vision API | ~0,01 €/Beleg | ⚠️ Daten gehen an OpenAI | ❌ |
| **B** | Google Cloud Vision API | ~0,001 €/Beleg | ⚠️ Daten gehen an Google | ❌ |
| **C** | Tesseract.js (WASM, lokal) | Kostenlos | ✅ Komplett lokal | ✅ |

**Empfehlung**: Option C (Tesseract.js) für Phase 2.0 — passt zu "Privacy by Design". Option A als Upgrade in Phase 2.1 wenn Nutzer es wünschen.

## User Stories

| ID | Als... | möchte ich... | damit... | Akzeptanzkriterium |
|----|--------|---------------|---------|-------------------|
| US-01 | Max | nach dem Beleg-Foto automatisch Betrag + Datum sehen | ich nichts tippen muss | Betrag und Datum korrekt in 80% der Fälle |
| US-02 | Lisa | eine Kategorie-Vorschlag sehen | ich nur bestätigen muss statt zu suchen | Vorschlag in 70% korrekt |
| US-03 | Stefan | Reisebelege schnell erfassen | ich auch 10 Belege am Tag in 3 min erfasse | Capture + Bestätigung < 10s pro Beleg |
| US-04 | Ingrid | erkennen wenn OCR unsicher ist | ich fehlerhafte Daten korrigieren kann | Confidence-Indikator bei unsicheren Feldern |
| US-05 | Dr. Weber | korrekte Steuerbeträge | der Export stimmt | MwSt.-Erkennung aus Beleg (Brutto/Netto) |

## Funktionale Anforderungen

### F1: OCR-Extraktion

**Eingabe**: Beleg-Foto (JPEG/PNG) oder PDF

**Extraktion (priorisiert)**:
```
Pflicht (P0):
  - Gesamtbetrag (inkl. MwSt.)
  - Datum

Wichtig (P1):
  - Händlername
  - Netto-Betrag + MwSt.-Betrag + MwSt.-Satz
  - Zahlungsart (wenn sichtbar: "EC-Karte", "Bar" etc.)

Optional (P2):
  - Einzelpositionen (Artikelliste)
  - Adresse des Händlers
  - Beleg-Nummer
```

**OCR-Ergebnis-Schema**:
```json
{
  "confidence": 0.92,
  "amount": { "value": 49.99, "confidence": 0.97 },
  "date": { "value": "2026-01-15", "confidence": 0.89 },
  "merchant": { "value": "GitHub Inc", "confidence": 0.78 },
  "payment_method": { "value": "card", "confidence": 0.65 },
  "tax": {
    "net": 42.01,
    "vat_amount": 7.98,
    "vat_rate": 19,
    "confidence": 0.71
  },
  "raw_text": "..."
}
```

### F2: Auto-Kategorisierung

**Methode**: Regelbasiert + Keyword-Matching (kein ML-Modell nötig für Phase 2)

```javascript
// Kategorisierungs-Engine (Phase 2.0 — regelbasiert)
const CATEGORY_RULES = [
  {
    category_id: 'software',
    patterns: ['github', 'adobe', 'jetbrains', 'figma', 'notion', 'slack', 'zoom', 'microsoft', 'google workspace'],
    confidence_boost: 0.9
  },
  {
    category_id: 'hardware',
    patterns: ['amazon', 'mediamarkt', 'saturn', 'apple store', 'dell', 'logitech', 'otto'],
    confidence_boost: 0.7  // Niedrig — Amazon verkauft alles
  },
  {
    category_id: 'travel',
    patterns: ['db bahn', 'deutsche bahn', 'lufthansa', 'ryanair', 'flix', 'mietwagen', 'sixt', 'europcar', 'parkhaus', 'bvg', 'mvg'],
    confidence_boost: 0.95
  },
  {
    category_id: 'meals_business',
    patterns: ['restaurant', 'cafe', 'bistro', 'gastronomie', 'mcdonald', 'subway', 'delivery'],
    confidence_boost: 0.6  // Niedrig — könnte privat sein
  },
  {
    category_id: 'internet_phone',
    patterns: ['telekom', 'vodafone', 'o2', '1&1', 'congstar', 'internet', 'mobilfunk'],
    confidence_boost: 0.9
  },
  {
    category_id: 'education',
    patterns: ['udemy', 'coursera', 'pluralsight', 'oreilly', 'linkedin learning', 'fachbuch', 'konferenz', 'seminar'],
    confidence_boost: 0.85
  }
  // ... weitere Regeln aus Nutzer-Feedback ergänzen
];
```

**Phase 2.1**: ML-Klassifikator trainiert auf deutschen Belegen (TensorFlow.js / ONNX)

### F3: Bestätigungs-UI

```
Nach OCR-Erkennung:

┌─────────────────────────────────────┐
│ Erkannt — bitte prüfen              │
├─────────────────────────────────────┤
│                                     │
│  Betrag    [  49,99 €  ] ✓ (97%)   │
│  Datum     [ 15.01.26  ] ✓ (89%)   │
│  Händler   [ GitHub    ] ~ (78%)   │
│  Kategorie [ Software  ] ? (65%)   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🖼 Beleg-Vorschau             │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Alles korrekt — Speichern ✓]      │
│  [Bearbeiten]                       │
└─────────────────────────────────────┘

Confidence-Indikator:
  ✓  ≥ 90% — Grün, vorausgefüllt
  ~  70–89% — Gelb, vorausgefüllt + Hinweis
  ?  < 70%  — Rot, leer + Pflicht-Eingabe
```

### F4: Lern-Mechanismus (Phase 2.1)

```
User korrigiert "Händler: GitHub → Kategorie: Software"
→ Lokal speichern: { "github": "software" }
→ Nächstes Mal: Sofort korrekte Kategorie vorschlagen
→ Nutzerspezifisches Dictionary in LocalStorage
```

## Tesseract.js Integration

### Implementierung

```javascript
// js/ocr.js
import Tesseract from 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';

export class OCRService {
  constructor() {
    this._worker = null;
    this._initialized = false;
  }

  async init() {
    // Worker einmal initialisieren (teuer — ~2-3s beim ersten Mal)
    this._worker = await Tesseract.createWorker(['deu', 'eng'], 1, {
      logger: (m) => { /* Progress-Callback */ }
    });
    this._initialized = true;
  }

  async extractFromImage(imageFile) {
    if (!this._initialized) await this.init();

    const url = URL.createObjectURL(imageFile);
    try {
      const { data } = await this._worker.recognize(url);
      return this._parseReceiptText(data.text, data.confidence);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  _parseReceiptText(text, overallConfidence) {
    return {
      amount:       this._extractAmount(text),
      date:         this._extractDate(text),
      merchant:     this._extractMerchant(text),
      raw_text:     text,
      confidence:   overallConfidence / 100,
    };
  }

  _extractAmount(text) {
    // Muster: "49,99 €", "EUR 49.99", "Gesamt: 49,99"
    const patterns = [
      /(?:gesamt|total|summe|betrag|zu zahlen)[:\s]*(\d{1,5}[.,]\d{2})/gi,
      /(\d{1,5}[.,]\d{2})\s*(?:€|eur)/gi,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        return { value, confidence: 0.85 };
      }
    }
    return { value: null, confidence: 0 };
  }

  _extractDate(text) {
    // DD.MM.YYYY oder DD.MM.YY
    const pattern = /(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/;
    const match = pattern.exec(text);
    if (!match) return { value: null, confidence: 0 };

    const [, day, month, yearRaw] = match;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    const iso = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;

    // Sanity check
    const date = new Date(iso);
    if (isNaN(date.getTime()) || iso > new Date().toISOString().slice(0,10)) {
      return { value: null, confidence: 0 };
    }
    return { value: iso, confidence: 0.88 };
  }

  _extractMerchant(text) {
    // Erste Zeile des Belegs ist oft der Händlername
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    if (!lines.length) return { value: null, confidence: 0 };
    return { value: lines[0].slice(0, 100), confidence: 0.6 };
  }

  async terminate() {
    await this._worker?.terminate();
    this._worker = null;
    this._initialized = false;
  }
}
```

### Bundle-Größe & Performance

| Asset | Größe | Ladestrategie |
|-------|-------|--------------|
| tesseract.js Worker | ~5 MB | Lazy-Load (nur bei Beleg-Upload) |
| Deutsch-Sprachmodell | ~4 MB | Lazy-Load + IndexedDB-Cache |
| Englisch-Sprachmodell | ~4 MB | Optional, nur wenn DE nicht ausreicht |

**Ladezeit**: ~3-5s beim ersten Mal, danach aus Cache → ~0.5s

## Non-Funktionale Anforderungen

| Anforderung | Zielwert |
|-------------|---------|
| OCR-Accuracy (Betrag) | ≥ 85% korrekt |
| OCR-Accuracy (Datum) | ≥ 85% korrekt |
| Verarbeitungszeit | < 5s auf Mittelklasse-Smartphone |
| Datenschutz | Alle Daten bleiben lokal (kein API-Call) |
| Offline-fähig | Ja (nach erstem Modell-Download) |
| Bundle-Impact | +10 MB (lazy-loaded, kein Initial-Load-Impact) |

## Accessibility

- [ ] OCR-Fortschritt: `role="progressbar"` mit Prozent-Anzeige
- [ ] OCR-Ergebnis: `aria-live="polite"` ankündigen
- [ ] Confidence-Indikator: Farbe + Text (nicht nur Farbe)
- [ ] Korrektur-Flow: Vollständig tastaturzugänglich

## Security

- [ ] Tesseract.js aus vertrauenswürdiger CDN (Subresource Integrity Hash)
- [ ] Kein OCR-Ergebnis wird an externe Server geschickt
- [ ] Raw-Text wird nach Extraktion aus Memory gelöscht
- [ ] CSP-Update: `worker-src 'self' blob:` (für Tesseract Worker)

## Migrations-Plan (Phase 1 → Phase 2)

```
Phase 2 ist backward-compatible:
1. OCR ist opt-in (Feature Flag / Setting)
2. Alle Phase-1-Daten bleiben unverändert
3. Kein Breaking Change im Storage-Schema
4. Tesseract.js wird erst geladen wenn erstmals Foto hochgeladen wird
```

## Nächste Schritte (nach MVP-Launch)

1. **HUMAN REQUIRED**: Technologie-Entscheidung (Tesseract.js vs. API) bestätigen
2. Tesseract.js PoC: Accuracy-Test mit 20 echten Belegen
3. Kategorie-Regeln aus Phase-1-User-Daten ableiten
4. Implementierung starten (2 Sprints)

## Abhängigkeiten

- `feature-beleg-capture.md` — Upload-Flow wird erweitert
- `feature-kategorien.md` — Kategorie-Vorschlag nutzt bestehenden CategoryService
- MVP deployed + User-Feedback gesammelt (Trigger für Phase 2 Start)

## Akzeptanzkriterien (Phase 2 DoD)

- [ ] Tesseract.js lazy-loaded (kein Initial-Load-Impact)
- [ ] Betrag korrekt in ≥ 85% der Testbelege
- [ ] Datum korrekt in ≥ 85% der Testbelege
- [ ] Kategorie-Vorschlag korrekt in ≥ 70% der Fälle
- [ ] Vollständig offline-fähig (nach Modell-Download)
- [ ] Lernmechanismus: User-Korrekturen werden gespeichert
- [ ] Security Challenger: GREEN
- [ ] A11y: Fortschritt und Ergebnis für Screenreader zugänglich
- [ ] Quality Gate: GREEN
