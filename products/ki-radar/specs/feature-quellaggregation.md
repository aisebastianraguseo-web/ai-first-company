# Feature: Automatische Quellenaggregation
**Status**: Draft | **Priorität**: MVP (P0) | **Komplexität**: L

---

## User Stories

### Story 1: Konsolidierter KI-Feed
**Als** Markus (Efficiency Driver)
**möchte ich** täglich einen aktuellen Feed mit den wichtigsten KI-Updates sehen
**damit** ich in 5 Minuten weiß was diese Woche relevant war — ohne 20 Quellen manuell zu prüfen

#### Acceptance Criteria
- [ ] GIVEN das System ist angemeldet WHEN der Feed geladen wird THEN zeigt er Einträge der letzten 24h (konfigurierbar: 7 Tage)
- [ ] GIVEN ein neuer Eintrag existiert WHEN er angezeigt wird THEN enthält er: Titel, Quelle, Datum, 2-Satz-Zusammenfassung, Link zur Original-Quelle
- [ ] GIVEN mehrere Quellen aktiv sind WHEN der Feed lädt THEN sind Einträge nach Relevanz-Score sortiert (nicht chronologisch)
- [ ] GIVEN kein neuer Eintrag in 48h WHEN Feed geöffnet wird THEN zeigt System eine Meldung "Keine neuen Updates seit [Datum]"
- [ ] Error Case: GIVEN Quell-API nicht erreichbar WHEN Aggregation läuft THEN wird Fehler geloggt, alte Daten bleiben sichtbar, Nutzer sieht "Quelle temporär nicht verfügbar"

### Story 2: Quellenfilter
**Als** Stefan (Reliable Professional)
**möchte ich** den Feed nach Quelltyp filtern können
**damit** ich gezielt technische Quellen (ArXiv, GitHub) von Business-News trennen kann

#### Acceptance Criteria
- [ ] GIVEN der Feed geladen ist WHEN Nutzer Quelltyp-Filter aktiviert THEN zeigt Feed nur Einträge dieser Quelltypen
- [ ] GIVEN Filter aktiv WHEN neue Einträge eingehen THEN respektieren sie den aktiven Filter
- [ ] GIVEN Filter gesetzt WHEN Seite neu geladen wird THEN bleibt Filter-Einstellung erhalten (persistiert im User-Profil)

### Story 3: Quellenverständlichkeit für Non-Experts
**Als** Andrea (Simplicity Seeker)
**möchte ich** zu jedem Update eine verständliche Erklärung sehen
**damit** ich die Bedeutung auch ohne KI-Expertenwissen einschätzen kann

#### Acceptance Criteria
- [ ] GIVEN ein technischer Eintrag (z.B. ArXiv-Abstract) WHEN er angezeigt wird THEN gibt es einen "Was das bedeutet:"-Abschnitt in einfacher Sprache
- [ ] GIVEN Eintrag hat Fachbegriffe WHEN Nutzer auf Begriff klickt THEN erscheint ein Tooltip mit Erklärung (max. 2 Sätze)

---

## UI/UX Beschreibung

### Zustand 1: Leerer Feed (Erstanmeldung)
Der Nutzer sieht eine Onboarding-Meldung: "Ihre erste Aggregation läuft. Normalerweise dauert das unter 5 Minuten." Mit Ladeanimation.

### Zustand 2: Befüllter Feed
Listenansicht mit Karten. Jede Karte zeigt:
- Quell-Icon + Quell-Name (z.B. "Anthropic Release Notes")
- Datum und Uhrzeit (relativ: "vor 3 Stunden")
- Titel fett
- 2-Satz-Zusammenfassung
- Capability-Tags (aus Feature F-002)
- Relevanz-Score als visueller Indikator (3 Stufen: LOW/MEDIUM/HIGH)
- "Original lesen →"-Link

### Interaktion: Quellen-Filterung
Horizontale Filter-Chips über dem Feed: [Alle] [Release Notes] [GitHub] [ArXiv] [VC-News]. Aktiver Filter visuell hervorgehoben. Klick togglet Filter.

---

## Daten-Modell

```json
{
  "id": "uuid-v4",
  "source_type": "release_notes | github | arxiv | vc_news | industry_blog",
  "source_name": "string — z.B. 'Anthropic Blog'",
  "source_url": "string — Original-URL",
  "title": "string",
  "summary_short": "string — max 280 Zeichen, maschinell generiert",
  "summary_plain": "string — Einfachsprache-Erklärung, max 100 Wörter",
  "published_at": "ISO-8601 datetime",
  "fetched_at": "ISO-8601 datetime",
  "relevance_score": "float 0.0-1.0",
  "capability_tags": ["array of string — aus F-002"],
  "language": "de | en",
  "is_archived": "boolean"
}
```

---

## Business Rules

1. Aggregation läuft automatisch alle 6 Stunden (konfigurierbar: 1h / 6h / 24h)
2. Duplikate (gleiche URL) werden dedupliziert — neuere Version überschreibt
3. Einträge älter als 90 Tage werden archiviert (nicht gelöscht)
4. Mindestens 5 Quelltypen aktiv im MVP: release_notes, github, arxiv, vc_news, industry_blog
5. Einfachsprache-Zusammenfassung wird nur für Einträge auf Englisch generiert (DE bleibt wie ist)

---

## Edge Cases & Error Handling

| Szenario | User-Feedback | System-Aktion |
|----------|--------------|--------------|
| Quelle antwortet nicht | "Quelle [Name] temporär nicht verfügbar. Letzte Aktualisierung: [Datum]" | Log + Retry nach 1h, Alerting nach 3 Fehlern |
| Rate-Limit der Quell-API | Keine Nutzer-Meldung | Retry mit Exponential Backoff, nächstes reguläres Intervall |
| Feed leer (alle Quellen down) | "Keine aktuellen Daten verfügbar. Wir prüfen die Verbindungen." | Admin-Alert |
| Eintrag ohne Zusammenfassung | Eintrag trotzdem anzeigen mit Originaltext-Ausschnitt (max. 300 Zeichen) | Fallback: title + first paragraph |
| Ungültige URL in Eintrag | Eintrag anzeigen ohne klickbaren Link, Tooltip: "Originalquelle nicht verfügbar" | Log für Admin |

---

## Persona Impact

| Persona | Impact | Spezifische Anforderung |
|---------|--------|------------------------|
| Markus ⚡ | KRITISCH | Max. 5 Top-Einträge prominently, Rest "weitere Einträge laden" |
| Andrea 🧭 | HOCH | Einfachsprache-Erklärung bei jedem Eintrag Pflicht |
| Stefan 🔬 | HOCH | Direktlink zum Original, ArXiv-Filter, technische Details sichtbar |
| Petra 🔍 | HOCH | Quellen-URL + Datum + Confidence-Score bei jeder Einschätzung |
| Dr. Hoffmann ⚖️ | MITTEL | Feed-Inhalte sind öffentliche Daten — kein DSGVO-Risiko in diesem Feature |
| Felix 🕵️ | NIEDRIG | Kein User-generierter Content in Feed → kein XSS-Risiko |

---

## Security Anforderungen

- Alle externen URLs müssen vor dem Anzeigen validiert werden (kein javascript: Protocol)
- HTML-Content aus Quellen muss gesanitized werden (DOMPurify oder Server-Side)
- SSRF-Prevention: Aggregation-Service darf nur Whitelist-URLs fetchen
- Rate-Limiting auf /api/feed Endpunkt: 100 req/min per User
- Governance-Referenz: governance/security-policy.md

---

## Accessibility Anforderungen

- Jede Feed-Karte als `<article>` mit `aria-label="[Titel], [Quelle], [Datum]"`
- Relevanz-Score nicht nur als Farbe — auch als Text (HIGH/MEDIUM/LOW)
- Capability-Tags mit `role="list"` und `role="listitem"`
- "Original lesen"-Links mit `aria-describedby` auf den Artikel-Titel
- Feed-Update per Polling: `aria-live="polite"` Region mit "X neue Einträge" Ankündigung (LEARN-004: 50ms setTimeout)
- Governance-Referenz: governance/accessibility-policy.md

---

## Offene Fragen

- [ ] Welche konkreten APIs/RSS-Feeds sind im MVP priorisiert? (Kosten, Rate-Limits, Auth-Keys) → ADR-005 ausstehend
- [ ] Wer generiert die Einfachsprache-Zusammenfassung? LLM-API (Kosten, DSGVO) oder regelbasiert? → Architecture-Entscheidung (ADR-007 vorschlagen)
