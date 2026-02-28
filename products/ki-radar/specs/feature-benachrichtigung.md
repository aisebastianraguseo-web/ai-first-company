# Feature: Benachrichtigungs-System
**Status**: Descoped | **Priorität**: P1 (V2) | **Komplexität**: M
> **Entscheidung 2026-02-27**: E-Mail-Notifications aus MVP herausgenommen. MVP validiert Core-Value (Feed + Capability-Map + Problem-Matching) ohne E-Mail-Infrastruktur-Overhead.

---

## User Stories

### Story 1: E-Mail-Benachrichtigung konfigurieren
**Als** Markus (Efficiency Driver)
**möchte ich** E-Mail-Alerts für bestimmte Capability-Themen konfigurieren
**damit** ich informiert werde ohne täglich ins Dashboard schauen zu müssen

#### Acceptance Criteria
- [ ] GIVEN Nutzer in Einstellungen WHEN "Benachrichtigung hinzufügen" geklickt THEN zeigt Modal: Trigger (Capability-Tag-Dropdown oder Problemfeld-Dropdown), Frequenz (Sofort/Täglich/Wöchentlich), E-Mail-Adresse (vorausgefüllt mit Konto-E-Mail)
- [ ] GIVEN Alert-Regel gespeichert WHEN Trigger-Bedingung erfüllt ist (neuer Eintrag mit passendem Tag) THEN wird E-Mail innerhalb des konfigurierten Zeitfensters gesendet
- [ ] GIVEN "Täglich" konfiguriert WHEN um 08:00 Uhr THEN sendet System eine Digest-E-Mail mit allen Treffern der letzten 24h (nur wenn mindestens 1 Treffer vorhanden)
- [ ] GIVEN "Wöchentlich" konfiguriert WHEN Montag 08:00 Uhr THEN sendet System Digest der letzten 7 Tage
- [ ] GIVEN keine neuen Treffer im Zeitraum WHEN geplante E-Mail-Zeit kommt THEN wird KEINE E-Mail gesendet (kein Spam)

### Story 2: Benachrichtigungs-Überblick
**Als** Andrea (Simplicity Seeker)
**möchte ich** meine aktiven Benachrichtigungen übersichtlich verwalten
**damit** ich jederzeit sehe worüber ich informiert werde und was ich deaktivieren kann

#### Acceptance Criteria
- [ ] GIVEN Benachrichtigungs-Einstellungen geöffnet WHEN Seite lädt THEN zeigt Liste aller aktiven Alert-Regeln mit: Trigger-Beschreibung, Frequenz, Status (Aktiv/Pausiert)
- [ ] GIVEN Alert-Regel aktiv WHEN "Pausieren" geklickt THEN wechselt Regel in Status "Pausiert" und sendet keine weiteren E-Mails bis "Reaktivieren" geklickt
- [ ] GIVEN Alert-Regel WHEN "Löschen" geklickt THEN erscheint Bestätigungs-Dialog "Benachrichtigung wirklich entfernen?"

### Story 3: Abmelden ohne Login
**Als** Andrea (Simplicity Seeker, Tech-Level niedrig)
**möchte ich** mich direkt aus der E-Mail von Benachrichtigungen abmelden können
**damit** ich nicht erst einloggen muss um unerwünschte Mails zu stoppen

#### Acceptance Criteria
- [ ] GIVEN E-Mail erhalten WHEN "Abmelden"-Link in E-Mail geklickt THEN öffnet sich Seite mit "Sie erhalten keine weiteren Benachrichtigungen zu [Trigger]" — ohne Login
- [ ] GIVEN Abmelde-Link WHEN geklickt THEN ist der Link nach einer Nutzung ungültig (Token-basiert, One-Time-Use)
- [ ] GIVEN Abmelde-Seite WHEN "Alle Benachrichtigungen abmelden" geklickt THEN werden alle Alert-Regeln des Nutzers deaktiviert

---

## UI/UX Beschreibung

### Zustand 1: Benachrichtigungs-Einstellungen (leer)
Leerer State: "Sie haben noch keine Benachrichtigungen eingerichtet." + "Erste Benachrichtigung erstellen"-Button.

### Zustand 2: Alert-Regelübersicht
Liste mit Alert-Regeln. Jede Regel als Zeile:
- Icon (Bell) + Beschreibung: "Neue Einträge zu: [Tag/Problemfeld]"
- Frequenz-Badge: Sofort / Täglich / Wöchentlich
- Status-Toggle: Aktiv (grün) / Pausiert (grau) — NICHT nur Farbe: Text "Aktiv"/"Pausiert" sichtbar
- Actions: Bearbeiten | Löschen

### Zustand 3: E-Mail (HTML)
- Betreff: "KI-Radar: N neue Entwicklungen zu [Trigger]"
- Header: KI-Radar Logo + Datum
- Inhalt: Kompakte Liste der Treffer (max. 5), jeweils Titel + 1-Satz-Zusammenfassung + Link
- Footer: "Zu wenige Treffer? Einstellungen anpassen [Link]" + "Abmelden [One-Time-Link]"

---

## Daten-Modell

```json
{
  "alert_rule": {
    "id": "uuid-v4",
    "user_id": "uuid-v4 — FK, RLS",
    "trigger_type": "capability_tag | problem_field",
    "trigger_id": "uuid-v4 — FK zu capability_taxonomy oder problem_field",
    "frequency": "immediate | daily | weekly",
    "email": "string — validiert, max 254 Zeichen",
    "is_active": "boolean",
    "created_at": "ISO-8601",
    "last_sent_at": "ISO-8601 | null"
  },
  "unsubscribe_token": {
    "id": "uuid-v4",
    "alert_rule_id": "uuid-v4 | null — null = alle Regeln des Users",
    "user_id": "uuid-v4",
    "token": "string — 32 Byte random hex, one-time-use",
    "expires_at": "ISO-8601 — 30 Tage Gültigkeit",
    "used_at": "ISO-8601 | null"
  }
}
```

---

## Business Rules

1. Max. 5 aktive Alert-Regeln pro Nutzer (MVP-Limit, erweiterbar)
2. Keine E-Mail wenn Trigger-Bedingung erfüllt aber 0 neue Einträge (kein Leer-Spam)
3. "Sofort"-Frequenz: max. 1 E-Mail pro Stunde pro Alert-Regel (Throttling)
4. Abmelde-Token ist One-Time-Use und läuft nach 30 Tagen ab
5. E-Mail-Versand darf User-Profildaten (Problemfelder) NICHT im E-Mail-Body exponieren (nur öffentliche Capability-Tags oder Problemfeld-Titel)
6. E-Mails enthalten Impressum und DPA-Hinweis (DSGVO)

---

## Edge Cases & Error Handling

| Szenario | User-Feedback | System-Aktion |
|----------|--------------|--------------|
| Ungültige E-Mail-Adresse | "Bitte geben Sie eine gültige E-Mail-Adresse ein." | Formular nicht absenden |
| E-Mail-Bounce (unzustellbar) | Nutzer sieht in Dashboard: "Letzte E-Mail unzustellbar. Bitte E-Mail-Adresse prüfen." | Alert-Regel nach 3 Bounces automatisch pausieren |
| Abmelde-Token abgelaufen | "Dieser Link ist nicht mehr gültig. Bitte melden Sie sich an, um Benachrichtigungen zu verwalten." | Link deaktivieren |
| E-Mail-Dienst nicht verfügbar | Nutzer wird nicht direkt informiert | Retry-Queue, Alert nach 30min erneut versuchen |
| Abmelde-Token bereits verwendet | "Sie haben sich bereits abgemeldet." | Kein Fehler, freundliche Bestätigung |

---

## Persona Impact

| Persona | Impact | Spezifische Anforderung |
|---------|--------|------------------------|
| Markus ⚡ | HOCH | "Sofort"-Option für Breaking Changes; max. Kompaktheit im E-Mail |
| Andrea 🧭 | KRITISCH | One-Click-Abmeldung ohne Login; verständliche E-Mail-Texte |
| Stefan 🔬 | MITTEL | Technischer Trigger-Typ (ArXiv-Tag) als Option |
| Petra 🔍 | MITTEL | E-Mail enthält Quellenangabe und Datum |
| Dr. Hoffmann ⚖️ | HOCH | E-Mail-Versand via EU-DSGVO-konformem Anbieter, Impressum in E-Mail Pflicht |
| Felix 🕵️ | MITTEL | E-Mail-Harvesting-Prevention: Keine User-Emails exponiert, kein Enumeration möglich |

---

## Security Anforderungen

- Abmelde-Tokens sind kryptographisch zufällig (32 Byte, CSPRNG), nicht vorhersehbar
- E-Mail-Adresse des Nutzers wird niemals in der E-Mail für andere sichtbar
- Kein User-Account-Enumeration via E-Mail-Versand (gleiche Antwort ob E-Mail existiert oder nicht)
- E-Mail-Versand via transaktionalem E-Mail-Dienst mit DKIM/SPF/DMARC
- Rate-Limiting auf `/api/alerts` Endpunkt: 20 req/min per User
- Governance-Referenz: governance/security-policy.md

---

## Accessibility Anforderungen

- Toggle-Buttons: `role="switch"`, `aria-checked="true|false"`, `aria-label="Benachrichtigung [Titel] [aktiv/pausiert]"`
- Lösch-Bestätigungs-Dialog: `role="alertdialog"`, Fokus-Trap, ESC schließt ohne Löschen
- Status-Wechsel: `aria-live="polite"` Ankündigung "Benachrichtigung pausiert" (LEARN-004: 50ms setTimeout)
- E-Mail HTML: Semantisches HTML, alt-Texte auf Bilder, funktioniert als Plain-Text-Fallback
- Governance-Referenz: governance/accessibility-policy.md

---

## Offene Fragen

- [ ] **ADR-006 (HUMAN REQUIRED)**: E-Mail-Versand via eigenem SMTP (Kontrolle, Kosten) oder SaaS wie SendGrid/Postmark (Zuverlässigkeit, aber Datenweitergabe an US-Unternehmen)? DSGVO-Implikation.
- [ ] Soll es eine In-App-Notification (Browser Push) als Alternative geben? (V2)
