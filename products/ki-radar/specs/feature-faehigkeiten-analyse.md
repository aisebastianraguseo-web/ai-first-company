# Feature: Fähigkeiten-Analyse & Visualisierung
**Status**: Draft | **Priorität**: MVP (P0) | **Komplexität**: L

---

## User Stories

### Story 1: Capability-Tagging
**Als** Markus (Efficiency Driver)
**möchte ich** dass neue KI-Updates automatisch nach Capability-Kategorien getaggt werden
**damit** ich auf einen Blick sehe welche KI-Fähigkeit sich verbessert hat

#### Acceptance Criteria
- [ ] GIVEN ein neuer Feed-Eintrag eingeht WHEN das Analyse-System läuft THEN bekommt er mindestens einen Capability-Tag zugewiesen
- [ ] GIVEN ein Eintrag hat Tags WHEN er im Feed angezeigt wird THEN sind Tags als klickbare Chips sichtbar
- [ ] GIVEN ein Capability-Tag wird geklickt WHEN Nutzer auf Tag klickt THEN filtert der Feed auf alle Einträge mit diesem Tag
- [ ] GIVEN ein Tag hat Confidence < 0.6 WHEN er angezeigt wird THEN ist er visuell anders dargestellt (z.B. gestrichelt) und hat Tooltip "Unsichere Kategorisierung"
- [ ] Error Case: GIVEN Analyse-System nicht verfügbar WHEN Eintrag eingeht THEN Eintrag wird ohne Tags gespeichert, Tag "Unkategorisiert" vergeben, Retry nach 1h

### Story 2: Capability-Landkarte
**Als** Stefan (Reliable Professional)
**möchte ich** eine visuelle Übersicht aller KI-Capabilities und deren aktuellen Entwicklungsstand sehen
**damit** ich systematisch tracken kann wo Capability-Sprünge stattgefunden haben

#### Acceptance Criteria
- [ ] GIVEN Dashboard geöffnet WHEN "Capability Map" Tab gewählt wird THEN wird eine Visualisierung mit allen aktiven Capability-Kategorien angezeigt
- [ ] GIVEN Capability-Map angezeigt WHEN in den letzten 7 Tagen neue Einträge für eine Kategorie eingingen THEN ist diese Kategorie visuell hervorgehoben ("Hot")
- [ ] GIVEN Kategorie in Map angeklickt WHEN Nutzer klickt THEN öffnet sich Seiten-Panel mit allen Einträgen dieser Kategorie (sortiert nach Datum)
- [ ] GIVEN Nutzer ist Andrea (Non-Expert) WHEN Map angezeigt wird THEN hat jede Kategorie einen Erklärungstext bei Hover/Tap

### Story 3: Verständliche Visualisierung für Non-Experts
**Als** Andrea (Simplicity Seeker)
**möchte ich** die Capability-Landkarte ohne KI-Fachkenntnisse verstehen
**damit** ich meinem Vorgesetzten berichten kann was sich verändert hat

#### Acceptance Criteria
- [ ] GIVEN Capability-Map angezeigt WHEN Andrea über eine Kategorie hovert THEN erscheint Tooltip mit max. 2 Sätzen Erklärung in einfacher Sprache
- [ ] GIVEN Eintrag mit "HIGH RELEVANCE" Tag WHEN angezeigt THEN gibt es eine Begründung: "Relevant weil: [Begründung]" — keine Black-Box
- [ ] GIVEN Visualisierung farbkodiert WHEN Rot-Grün unterschieden wird THEN wird zusätzlich Form/Icon/Text verwendet (Rot-Grün-Blindheit, Andrea und Petra)

---

## UI/UX Beschreibung

### Zustand 1: Capability-Map View
Tab neben dem Feed. Zeigt Raster von Capability-Kacheln:

**Standard Capability-Tags (MVP minimum 8):**
- 🧠 Reasoning & Planning
- 💬 Language & Dialogue
- 👁️ Vision & Multimodal
- 🔧 Tool Use & Agents
- 🗄️ Memory & Context
- 🔌 API & Integration
- ⚡ Performance & Speed
- 🔒 Safety & Alignment

Jede Kachel zeigt:
- Icon + Name
- Anzahl neuer Einträge (letzte 7 Tage)
- Aktivitäts-Indikator (HOT = >5 Einträge, AKTIV = 1-5, RUHIG = 0)
- Kein Grün/Rot als alleinige Differenzierung — zusätzlich Icon und Text (LEARN-004-analog)

### Zustand 2: Kategorie-Detail-Panel
Slide-in Panel (rechtsseitig). Enthält:
- Kategorie-Erklärung (2 Sätze, einfache Sprache)
- Chronologische Liste aller Einträge dieser Kategorie
- "Was das für Unternehmen bedeutet:" Sektion

### Interaktion: Tag-basierte Navigation
Capability-Tags im Feed sind klickbar → öffnet gefilterte Map-Ansicht für diesen Tag.

---

## Daten-Modell

```json
{
  "capability_taxonomy": {
    "id": "uuid-v4",
    "slug": "string — z.B. 'tool-use-agents'",
    "name": "string — Anzeigename",
    "icon": "string — Emoji oder Icon-Identifier",
    "description_technical": "string — für Experten",
    "description_plain": "string — für Non-Experts, max 2 Sätze",
    "created_at": "ISO-8601",
    "is_active": "boolean"
  },
  "feed_item_tag": {
    "feed_item_id": "uuid-v4 — FK",
    "capability_id": "uuid-v4 — FK",
    "confidence": "float 0.0-1.0",
    "assigned_at": "ISO-8601",
    "assigned_by": "system | human"
  }
}
```

---

## Business Rules

1. Jeder Eintrag bekommt 1-3 Capability-Tags (nicht mehr — verhindert Tag-Inflation)
2. Confidence < 0.6 gilt als "unsicher" und wird visuell markiert
3. Taxonomy ist erweiterbar durch Admin, nicht durch Endnutzer
4. "HOT"-Status: Kategorie erhält ≥5 neue Einträge in 7 Tagen
5. Visualisierung muss ohne Farbe als einziges Differenzierungsmerkmal funktionieren

---

## Edge Cases & Error Handling

| Szenario | User-Feedback | System-Aktion |
|----------|--------------|--------------|
| Eintrag passt in keine Kategorie | Tag "Sonstiges" vergeben | Admin-Notiz für Taxonomy-Erweiterung |
| Alle Kategorien HOT (viral event) | Keine Änderung — Map zeigt alle prominent | Log für spätere Analyse |
| Taxonomy-Daten nicht ladbar | "Kategorie-Ansicht temporär nicht verfügbar" | Feed weiterhin funktional ohne Tags |
| Visualisierung auf kleinem Screen | Responsive: Kacheln werden zu scrollbarer Liste | CSS-Breakpoint bei 640px |

---

## Persona Impact

| Persona | Impact | Spezifische Anforderung |
|---------|--------|------------------------|
| Markus ⚡ | HOCH | Tags müssen Business-Relevanz signalisieren, nicht nur technische Klassifikation |
| Andrea 🧭 | KRITISCH | Einfachsprache-Erklärungen und keine Farbe als einziges Differenzierungsmerkmal |
| Stefan 🔬 | HOCH | Technische Detailtiefe im Detail-Panel; Confidence-Score sichtbar |
| Petra 🔍 | HOCH | Jede HIGH-Relevance-Bewertung braucht Begründung — keine Black-Box |
| Dr. Hoffmann ⚖️ | NIEDRIG | Taxonomy ist system-seitig — keine User-Daten involviert |
| Felix 🕵️ | NIEDRIG | Kein User-Input in diesem Feature — kein XSS-Risiko |

---

## Security Anforderungen

- Taxonomy-Verwaltung (Hinzufügen/Ändern von Tags) nur für Admin-Rolle
- Tag-Confidence-Scores dürfen nicht direkt vom Client manipulierbar sein
- Governance-Referenz: governance/security-policy.md

---

## Accessibility Anforderungen

- Capability-Map-Kacheln als `<button>` mit `aria-label="[Kategorie-Name]: [Anzahl] neue Einträge, Status: [HOT/AKTIV/RUHIG]"`
- Detail-Panel: Fokus-Management — Fokus springt beim Öffnen auf Panel-Titel, beim Schließen zurück zum auslösenden Element
- Alle Icons haben `aria-hidden="true"` — Texte tragen die semantische Bedeutung
- Aktivitäts-Indikatoren NICHT nur durch Farbe unterscheidbar (Rot-Grün-Blindheit)
- Governance-Referenz: governance/accessibility-policy.md

---

## Offene Fragen

- [ ] Wie wird Capability-Tagging implementiert? Regelbasiertes Keyword-Matching (einfach, deterministisch, erklärbar) vs. LLM-Klassifikation (genauer, aber Kosten + DSGVO) → ADR-007 vorschlagen
- [ ] Taxonomy initial durch uns gepflegt oder Community-driven ab V2?
