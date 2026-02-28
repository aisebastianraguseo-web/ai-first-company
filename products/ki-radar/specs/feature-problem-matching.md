# Feature: Problem-Matching Dashboard
**Status**: Draft | **Priorität**: MVP (P0) | **Komplexität**: XL
**Sicherheits-Kritikalität**: HOCH (enthält Geschäftsgeheimnisse der Nutzer)

---

## User Stories

### Story 1: Problemfelder definieren
**Als** Markus (Efficiency Driver)
**möchte ich** bis zu 10 unternehmensspezifische Problemfelder definieren
**damit** das System nur die KI-Entwicklungen hervorhebt die für meine konkreten Herausforderungen relevant sind

#### Acceptance Criteria
- [ ] GIVEN Nutzer im Dashboard WHEN "Problemfeld hinzufügen" geklickt THEN öffnet sich Eingabe-Modal mit: Titel (Pflicht, max 100 Zeichen), Beschreibung (optional, max 500 Zeichen), Branche (Dropdown), Priorität (HOCH/MITTEL/NIEDRIG)
- [ ] GIVEN Formular ausgefüllt WHEN "Speichern" geklickt THEN erscheint Problemfeld in Liste (max. 10 gleichzeitig aktiv)
- [ ] GIVEN 10 Problemfelder aktiv WHEN Nutzer weiteres hinzufügen will THEN erscheint Hinweis "Maximum erreicht. Deaktivieren Sie ein bestehendes Problemfeld."
- [ ] GIVEN Problemfeld angelegt WHEN es gespeichert wird THEN ist es NUR für diesen Nutzer sichtbar (strikte User-Scope-Isolation)
- [ ] Error Case: GIVEN Eingabe enthält XSS-Payload WHEN gespeichert THEN wird Input server-seitig sanitized, kein Code wird ausgeführt

### Story 2: Matching-Ergebnisse sehen
**Als** Andrea (Simplicity Seeker)
**möchte ich** sehen welche neuen KI-Fähigkeiten zu meinen definierten Problemen passen
**damit** ich sofort erkenne welche Entwicklungen für mein Unternehmen relevant sind

#### Acceptance Criteria
- [ ] GIVEN Problemfeld definiert und neue Einträge vorhanden WHEN Dashboard geöffnet THEN zeigt System unter jedem Problemfeld: "N neue passende Entwicklungen seit [Datum]"
- [ ] GIVEN Matching-Ergebnis angezeigt WHEN Details geöffnet werden THEN ist für jeden Match sichtbar: Warum matcht das? (Begründung in max. 2 Sätzen)
- [ ] GIVEN kein Match für Problemfeld WHEN in letzten 30 Tagen THEN zeigt System: "Keine neuen Entwicklungen. Letzte relevante Meldung: [Datum]"
- [ ] GIVEN Match-Confidence < 0.5 WHEN angezeigt THEN ist Match-Karte mit "Schwacher Treffer"-Label versehen

### Story 3: Audit-Trail für Entscheider
**Als** Petra (Critical Sceptic)
**möchte ich** nachvollziehen können warum ein Match als relevant bewertet wurde
**damit** ich die Einschätzung belegen und intern kommunizieren kann

#### Acceptance Criteria
- [ ] GIVEN Match angezeigt WHEN Nutzer "Warum relevant?" klickt THEN öffnet Panel mit: Matching-Begründung, Quell-URL, Veröffentlichungsdatum, Match-Methode (keyword/semantic), Confidence-Score
- [ ] GIVEN Match-Details angezeigt WHEN Link zu Original geklickt THEN öffnet Original-Quelle in neuem Tab
- [ ] GIVEN Match als "nicht relevant" markiert WHEN Nutzer Feedback gibt THEN wird Match archiviert und Feedback für System-Verbesserung geloggt (anonym)

---

## UI/UX Beschreibung

### Zustand 1: Leeres Problem-Dashboard (Erstanmeldung)
Leerer State mit Call-to-Action: "Definieren Sie Ihre ersten Unternehmens-Herausforderungen, um personalisierte KI-Insights zu erhalten." + "Problemfeld hinzufügen"-Button.

### Zustand 2: Dashboard mit definierten Problemfeldern
Pro Problemfeld eine expandierbare Karte:
- Problemfeld-Titel + Prioritäts-Badge
- "N neue Treffer" (letzte 7 Tage) oder "Keine neuen Treffer"
- Die top 3 Treffer als kompakte Vorschau
- "Alle Treffer anzeigen →"-Link

### Zustand 3: Problemfeld-Detail-View
Vollständige Trefferliste für ein Problemfeld:
- Sortiert nach Match-Confidence (höchster zuerst)
- Jeder Treffer: Zusammenfassung + Begründung + "Warum relevant?"-Button
- Filter: Zeitraum, Quelltyp, Confidence-Schwelle

### Interaktion: Problemfeld-Eingabe-Modal
Felder: Titel*, Beschreibung (mit Zeichenzähler), Branche (Dropdown: Automotive, Pharma, Finanz, Maschinenbau, IT/SaaS, Sonstiges), Priorität (Radio-Buttons). Alle Pflichtfelder mit * markiert. Validation on submit (nicht on blur).

---

## Daten-Modell

```json
{
  "problem_field": {
    "id": "uuid-v4 — NICHT sequenziell (IDOR-Prevention, Felix)",
    "user_id": "uuid-v4 — FK zu User, RLS erzwungen",
    "title": "string — max 100 Zeichen, sanitized",
    "description": "string | null — max 500 Zeichen, sanitized",
    "industry": "string — Enum",
    "priority": "HIGH | MEDIUM | LOW",
    "is_active": "boolean",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "problem_match": {
    "id": "uuid-v4",
    "problem_field_id": "uuid-v4 — FK",
    "feed_item_id": "uuid-v4 — FK",
    "confidence": "float 0.0-1.0",
    "match_method": "keyword | semantic",
    "match_reason": "string — max 200 Zeichen, generiert",
    "user_feedback": "relevant | not_relevant | null",
    "created_at": "ISO-8601"
  }
}
```

---

## Business Rules

1. Problemfeld-IDs sind **immer UUID v4** — niemals sequenzielle Integer (IDOR-Prevention)
2. Problemfeld-Daten sind **user-scope-isolated** — Row Level Security auf DB-Ebene
3. Problemfeld-Text wird **server-seitig sanitized** vor dem Speichern
4. MVP-Matching-Methode: **Keyword-Matching** (lokale Verarbeitung, kein LLM) — semantisches Matching ist Opt-In ab V2
5. Problemfelder werden **NICHT an externe APIs gesendet** im MVP (ADR-004 Entscheidung: keyword-only bis LLM-Opt-In implementiert)
6. Max. 10 aktive Problemfelder pro Nutzer
7. Deaktivierte Problemfelder bleiben gespeichert (für Reaktivierung), aber kein Matching

---

## Edge Cases & Error Handling

| Szenario | User-Feedback | System-Aktion |
|----------|--------------|--------------|
| Problemfeld-Titel leer | "Bitte geben Sie einen Titel ein." (inline validation) | Formular nicht absenden |
| XSS im Titel/Beschreibung | Input wird gesanitized, korrekte Version gespeichert | Server-seitiges Sanitizing, Log |
| Matching findet >100 Treffer | Nur Top 20 angezeigt, "Weitere laden"-Button | Pagination, keine Performance-Probleme |
| User versucht fremdes Problemfeld via ID | 404 (nicht 403 — kein Leak ob Ressource existiert) | RLS verhindert Zugriff auf DB-Ebene |
| Netzwerkfehler beim Speichern | "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut." | Retry-Button, lokale Draft-Speicherung |

---

## Persona Impact

| Persona | Impact | Spezifische Anforderung |
|---------|--------|------------------------|
| Markus ⚡ | KRITISCH | Top-Treffer prominent, Business-Impact-Begründung |
| Andrea 🧭 | KRITISCH | Einfachsprache-Begründung "Warum relevant?"; Branchen-Dropdown hilft bei Relevanz-Kontext |
| Stefan 🔬 | HOCH | Confidence-Score sichtbar, technische Match-Methode transparent |
| Petra 🔍 | KRITISCH | Vollständiger Audit-Trail: Begründung + Quelle + Datum + Methode |
| Dr. Hoffmann ⚖️ | **BLOCKER** | Problemfelder dürfen MVP nicht an externe LLMs gehen. Keyword-Matching lokal = DSGVO-safe |
| Felix 🕵️ | **BLOCKER** | UUIDs Pflicht, RLS Pflicht, Output-Encoding Pflicht, Rate-Limiting Pflicht |

---

## Security Anforderungen

- **UUID v4** für alle Problemfeld- und Match-IDs (IDOR-Prevention)
- **Row Level Security** auf DB-Ebene: `user_id = auth.uid()` auf `problem_fields` und `problem_matches`
- **Server-seitiges Input-Sanitizing** (DOMPurify server-side oder äquivalent) für alle User-Texteingaben
- **Output-Encoding** beim Rendering von User-Eingaben im Frontend
- **Rate-Limiting** auf `/api/problems` Endpunkt: 30 Schreib-Requests/Minute per User
- **404 statt 403** bei Zugriff auf fremde Ressourcen (verhindert Enumeration)
- **Kein Senden** von Problemfeld-Daten an externe APIs im MVP
- Governance-Referenz: governance/security-policy.md

---

## Accessibility Anforderungen

- Modal: `role="dialog"`, `aria-labelledby` auf Titel, Fokus-Trap aktiv, ESC schließt Modal
- Fehler-Meldungen: `aria-live="assertive"` (LEARN-007: Fehler brauchen assertive, nicht polite)
- Problemfeld-Karten: `aria-expanded` für ausklappbare Treffer-Listen
- "N neue Treffer"-Badge: `aria-label="N neue Treffer in den letzten 7 Tagen"`
- Governance-Referenz: governance/accessibility-policy.md

---

## Offene Fragen

- [ ] **ADR-004 (HUMAN REQUIRED)**: Sollen Problemfelder in V2 an LLM für semantisches Matching gesendet werden? Wenn ja: Expliziter Opt-In + DPA mit LLM-Anbieter nötig. Default-Empfehlung: Nein für MVP.
- [ ] Wie viele Problemfelder sollen im V2 möglich sein? (Bezahlmodell-Frage)
- [ ] Sollen Problemfelder zwischen Team-Mitgliedern teilbar sein? (V3-Feature, Scope-Entscheidung nötig)
