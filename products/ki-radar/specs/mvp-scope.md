# MVP Scope — KI-Radar
**Status**: Draft | **Erstellt**: 2026-02-27

---

## MVP Definition

Der KI-Radar MVP ist ein webbasiertes Dashboard für Innovations- und Technologieentscheider in Unternehmen. Es aggregiert KI-Entwicklungen aus öffentlichen Quellen, bewertet deren praktische Relevanz, ermöglicht unternehmens-spezifisches Problem-Matching und sendet Alerts bei relevanten Neuerungen.

**MVP-Grenze**: Das System aggregiert und analysiert — es generiert keinen eigenen KI-Content und ersetzt keine eigene KI-Forschung.

---

## Feature-Matrix

| Feature | MVP (P0) | V2 (P1) | V3 (P2) | Out of Scope |
|---------|----------|---------|---------|-------------|
| Automatische Quellenaggregation (RSS/API) | ✓ | | | |
| Manuelle Quellen-Kuration durch Admin | | ✓ | | |
| Fähigkeiten-Analyse & Capability-Tagging | ✓ | | | |
| Visualisierung: Capability-Landkarte | ✓ | | | |
| Interaktive Trendkurven über Zeit | | ✓ | | |
| Problem-Matching Dashboard | ✓ | | | |
| Problem-Matching via LLM (semantisch) | | ✓ | | |
| Benachrichtigungs-System (E-Mail) | | ✓ | | |
| Push-Benachrichtigungen (Mobile) | | | ✓ | |
| Multi-User / Team-Workspaces | | | ✓ | |
| Chatbot / Assistent | | | | ✗ |
| Eigenes Modelltraining | | | | ✗ |
| Direkte Drittservice-Integration (Slack etc.) | | | | ✗ |
| Generative KI-Ausgaben | | | | ✗ |

---

## P0-Features (MVP)

### F-001: Automatische Quellenaggregation
Aggregiert täglich Updates aus definierten Quellen (Release-Notes, GitHub Trending, ArXiv, VC-News). Präsentiert als gefilterter Feed.

### F-002: Fähigkeiten-Analyse & Visualisierung
Analysiert neue Inhalte auf KI-Capability-Sprünge (Autonomie, Memory, Tool-Use, Multimodal etc.) und visualisiert diese als Capability-Landkarte.

### F-003: Problem-Matching Dashboard
Nutzer definiert bis zu 10 unternehmensspezifische Problemfelder. System zeigt welche neuen KI-Fähigkeiten diese Probleme adressieren könnten.

### ~~F-004: Benachrichtigungs-System~~ → P1 (descoped)
E-Mail-Alerts sind aus dem MVP herausgenommen. MVP-Nutzer öffnen das Dashboard aktiv.
V2 liefert E-Mail-Digest + Push-Notifications.

---

## MVP Acceptance Criteria

Das MVP ist vollständig wenn:
- [ ] Aggregation läuft automatisch (mindestens 1x täglich, konfigurierbar)
- [ ] Mindestens 5 Quelltypen aktiv: Official Release Notes, GitHub Trending, ArXiv, VC-Blogs, Branchennews
- [ ] Capability-Tags werden automatisch vergeben (mindestens 8 Standard-Tags)
- [ ] Capability-Landkarte ist für nicht-technische Nutzer verständlich (Andrea-Test)
- [ ] Problem-Matching erlaubt Eingabe von min. 3 Problemfeldern und zeigt Treffer
- [ ] Jede Einschätzung enthält: Quelle, Datum, Confidence-Score, Link zum Original (Petra-Anforderung)
- [ ] Alle Ressourcen-IDs sind UUIDs (Felix-Sicherheitsanforderung)
- [ ] DSGVO-Grundvoraussetzungen erfüllt: Privacy Policy, DPA verfügbar, EU-Hosting

---

## Nicht im MVP (explizit ausgeschlossen)

- **Chatbot / Assistent**: Out of scope per Product Vision — kein generischer Assistent
- **Eigenes Modelltraining**: Nur Analyse und Empfehlungen, keine generative KI
- **Direkte Drittservice-Integration (Slack, Teams, Jira)**: Phase 2+
- **Multi-User / Team-Workspaces**: Komplexität zu hoch für MVP; Einzeluser MVP zuerst
- **Mobilapp (native iOS/Android)**: Web-First MVP mit responsivem Design
- **Real-Time-Updates (WebSocket)**: Polling alle 15 Minuten reicht für MVP

---

## Technische Anforderungen (MVP)

| Anforderung | Wert |
|-------------|------|
| Stack Frontend | React (Vercel, statisch) |
| Stack Backend | Vercel API Routes (serverless, Node.js) |
| Scheduled Jobs | GitHub Actions Cron (kostenlos) → triggert Aggregations-Endpunkt |
| Datenbank | Supabase (Frankfurt, EU) — PostgreSQL + Row Level Security |
| Hosting | Vercel (Frontend + API) + Supabase (DB, EU) |
| Auth | Clerk (EU Instance — DSGVO-konform, Zero Backend-Code) |
| API-Design | RESTful, alle IDs als UUID v4 |
| Rate-Limiting | Pflicht auf allen Endpunkten |
| Data Sensitivity | medium — Problem-Matching-Daten sind Geschäftsgeheimnisse |

---

## Risiken & Annahmen

| Risiko | Eintrittswahrscheinlichkeit | Mitigation |
|--------|-----------------------------|------------|
| Quell-APIs ändern Format/Rate-Limits | HOCH | Abstractions-Layer per Quelle, Fehler-Alerting |
| Capability-Tagging zu ungenau | MITTEL | Human-in-the-loop Review für erste 100 Tags |
| Problem-Matching zu generisch | MITTEL | Nutzerfeedback ab Tag 1 sammeln (Daumen rauf/runter) |
| DSGVO-Blocking durch DPOs (Dr. Hoffmann) | HOCH | DPA vor Launch bereitstellen, EU-Hosting dokumentieren |
| IDOR / API-Scraping (Felix) | HOCH | UUID-only IDs, Rate-Limiting, User-Scope-Validierung ab Day 1 |

---

## Offene Fragen (Human-Entscheidung erforderlich)

- [ ] **ADR-004**: Werden Problem-Matching-Eingaben zur semantischen Analyse an externe LLMs gesendet? Falls ja: Opt-In + DPA-Pflicht (Dr. Hoffmann-Blocker). Default-Empfehlung: Keyword-Matching für MVP (lokal), semantisches LLM-Matching als Opt-In ab V2.
- [ ] **ADR-005**: Welche Quellen-APIs sind im MVP priorisiert? (Kosten, Rate-Limits variieren)
- [ ] **ADR-006**: E-Mail-Versand via eigener SMTP-Server oder SaaS (SendGrid/Postmark)? (DSGVO-relevant)
