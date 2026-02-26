# Persona Base Template

**Verwendung**: Basis für alle generierten Personas. Persona Architect füllt dieses Template aus.
**Datei-Ausgabe**: `products/<id>/personas/variables.yaml`

---

## YAML-TEMPLATE (Einzelne Persona)

```yaml
- id: "<kebab-case-identifier>"       # z.B. "max", "dr-weber", "hacker-hans"
  name: "<Vorname>"                    # z.B. "Max", "Dr. Weber"
  full_name: "<Vor- und Nachname>"     # z.B. "Max Müller"
  emoji: "<Emoji>"                     # Visueller Identifier
  archetype: "<Typ>"                   # power-user | creative | busy-professional | domain-expert | tech-novice | adversarial
  role: "<Berufsbezeichnung>"          # z.B. "Freelance Software-Entwickler"
  age: <Zahl>
  location: "<Stadt/Region>"           # z.B. "Berlin", "München"

  # SKILL-PROFIL (Skala 1-5)
  tech_level: <1-5>                    # 1=Tech-Laie, 5=Experte
  time_pressure: <1-5>                 # 1=immer Zeitdruck, 5=nimmt sich Zeit
  domain_expertise: <1-5>             # Expertise im Produkt-Domäne (Finanzen, etc.)
  patience: <1-5>                     # 1=ungeduldig, 5=sehr geduldig
  risk_tolerance: <1-5>               # 1=sehr vorsichtig, 5=risikofreudig

  # BIOGRAFIE
  biography: |
    <2-3 Sätze. Konkret und glaubwürdig. Beschreibt Beruf, Lebenssituation,
    und Bezug zum Produkt-Domäne. Kein Marketingsprech.>

  # ZIELE (3-5 konkrete, messbare Ziele)
  primary_goals:
    - "<Ziel 1: Was will sie mit dem Produkt erreichen?>"
    - "<Ziel 2>"
    - "<Ziel 3>"

  # PAIN POINTS (Aktuelle Probleme die das Produkt lösen soll)
  pain_points:
    - "<Pain Point 1: Konkret und produktspezifisch>"
    - "<Pain Point 2>"
    - "<Pain Point 3>"

  # MENTAL MODEL (Wie denkt sie über das Problem-Domäne nach?)
  mental_model: |
    <1-2 Sätze. Wie konzeptualisiert diese Person das Problem?
    Was erwartet sie intuitiv? Was ist ihr Referenzrahmen?>

  # SZENARIEN
  success_scenario: |
    <Beschreibung eines perfekten Nutzungstags mit dem Produkt.
    Konkret: Was macht sie, was sieht sie, wie fühlt es sich an?>

  failure_scenario: |
    <Was würde zur Deinstallation führen? Was ist der Worst Case
    aus ihrer Perspektive? Was bricht ihr Vertrauen?>

  # TYPISCHE AUSSAGEN (in ihrer Sprache, ihrer Wortwahl)
  key_quotes:
    - '"<Typisches Zitat 1>"'
    - '"<Typisches Zitat 2>"'
    - '"<Typisches Zitat 3>"'

  # TECHNOLOGIE-KONTEXT
  devices:
    primary: "<Gerät>"         # z.B. "MacBook Pro 14"", "iPhone 15"
    secondary: "<Gerät>"       # z.B. "iPad mini"
    browser: "<Browser>"       # z.B. "Firefox", "Safari iOS"
    os: "<OS>"                 # z.B. "macOS Sonoma", "iOS 17"

  # BARRIEREFREIHEITS-BEDÜRFNISSE
  accessibility_needs:
    - "<Bedürfnis>"            # z.B. "Keine besonderen Anforderungen"
    # ODER:
    # - "Nutzt Systemschrift-Vergrößerung (150%)"
    # - "Rot-Grün-Schwäche (Deuteranomalie)"
    # - "Bevorzugt reduzierte Animationen"

  # SECURITY-PERSPEKTIVE (Risiken aus IHRER Sicht)
  security_risks:
    - "<Risiko>"               # z.B. "Teilt Device mit Familie — Datenschutz wichtig"
    # Für Hacker Hans: konkrete Angriffsvektoren

  # FEATURE-PRIORITÄTEN (Für Challenge-Scoring)
  focus_features:              # Welche Features sind für diese Persona kritisch?
    - "<Feature-Name>"
    - "<Feature-Name>"

  # CHALLENGE-PRIORITÄT (1-5, wie wichtig ist diese Persona für Gates?)
  challenge_priority: <1-5>   # 5 = kritisch, muss immer gechallenget werden

  # PERSONA-SPEZIFISCHE ANFORDERUNGEN (An Specs/Code)
  specific_requirements:
    ui_language: "<Sprachebene>"    # z.B. "Einfach, keine Fachbegriffe"
    ui_density: "<Dichte>"          # z.B. "Minimal, nicht überwältigen"
    error_style: "<Stil>"           # z.B. "Erklärend, mit nächsten Schritten"
    feedback_style: "<Stil>"        # z.B. "Sofortige Bestätigung wichtig"
```

---

## PERSONA-ARCHETYPEN: DEFINITIONEN

### power-user
```
Charakteristik:
- Tech-Level: 4-5
- Zeitdruck: 1-2 (immer unter Zeitdruck)
- Bevorzugt Tastatur über Maus
- Will Effizienz, Batch-Operationen, APIs
- Frustration: fehlende Shortcuts, zu viele Klicks
Typische Anforderungen an Specs:
- Keyboard Shortcuts dokumentieren
- Bulk-Actions (mehrere Einträge gleichzeitig)
- Export in Profi-Format
- Konfigurierbarkeit
```

### creative
```
Charakteristik:
- Tech-Level: 1-3
- Zeit: 3-4 (nimmt sich Zeit für Details)
- Ästhetik ist wichtig
- Will eine schöne, intuitive UI
- Frustration: hässliches Design, unlogische Navigation
Typische Anforderungen an Specs:
- Klare visuelle Hierarchie
- Animationen und Transitions
- Gute Standardkategorien
- Einfaches Onboarding
```

### busy-professional
```
Charakteristik:
- Tech-Level: 2-4
- Zeitdruck: 1 (immer unter Zeitdruck)
- Mobile-First
- Will Mobile, Offline, Sync
- Frustration: Ladevorgänge, lange Formulare
Typische Anforderungen an Specs:
- Mobile-first Design
- Schnelle Eingabe (Mindest-Pflichtfelder)
- Offline-Fähigkeit
- Batch-Erfassung
```

### domain-expert
```
Charakteristik:
- Tech-Level: 1-3
- Domain-Expertise: 5
- Kennt Fachbegriffe, aber nicht die App
- Will fachlich korrektes Vokabular
- Frustration: falsche Kategorien, fehlende Fachbegriffe
Typische Anforderungen an Specs:
- Korrekte fachliche Terminologie
- Fachspezifische Kategorien/Vorlagen
- Export in Fachformat
- Validierung gegen Fachregeln
```

### tech-novice
```
Charakteristik:
- Tech-Level: 1
- Geduld: 3-5
- Braucht klare Führung, Bestätigung, Hilfe
- Vertraut Apps nicht blind
- Frustration: Fehlercodes, Jargon, keine Bestätigung
Typische Anforderungen an Specs:
- Jeder Begriff erklärt
- Bestätigungen für Aktionen
- Undo-Funktionalität
- Freundliche, erklärende Fehlermeldungen
- Progressives Onboarding
```

### adversarial
```
Charakteristik:
- Tech-Level: 5
- Sucht Exploits, testet Grenzen
- Kennt OWASP, gängige Angriffsmuster
- KEIN böser Akteur — konstruktiver Security-Tester
- Findet was andere übersehen
Typische Anforderungen (was er testet):
- XSS via Eingabefelder
- File Upload Bypass
- LocalStorage Manipulation
- CSRF (wenn vorhanden)
- Insecure Direct Object References
- Information Disclosure
```

---

## VOLLSTÄNDIGES BEISPIEL: MAX

```yaml
- id: max
  name: "Max"
  full_name: "Max Müller"
  emoji: "👨‍💻"
  archetype: power-user
  role: "Freelance Software-Entwickler"
  age: 32
  location: "Berlin"

  tech_level: 5
  time_pressure: 2
  domain_expertise: 2
  patience: 2
  risk_tolerance: 4

  biography: |
    Max arbeitet als freiberuflicher Entwickler und jongliert 3-5 Kunden gleichzeitig.
    Er gibt viel Geld aus (Hardware, Software, Konferenzen, Co-Working) und braucht
    alles für die Steuer. Aktuell nutzt er ein Excel-Sheet das er hasst.

  primary_goals:
    - "Ausgaben schnell erfassen (< 30 Sekunden pro Beleg)"
    - "Automatische Kategorisierung spart ihm Arbeit"
    - "DATEV-kompatibler Export für seinen Steuerberater"

  pain_points:
    - "Excel ist langsam und fehleranfällig"
    - "Belege fotografieren und dann manuell tippen nervt"
    - "Kategorisierung vergisst er immer am Jahresende"

  mental_model: |
    Max denkt in Workflows und Shortcuts. Eine gute App ist eine die aus dem Weg geht
    und die Daten einfach da hat wenn er sie braucht. Er erwartet Tastatursteuerung.

  success_scenario: |
    Max fotografiert einen Beleg, die App erkennt Betrag und Händler automatisch,
    er bestätigt kurz mit Tab+Enter und ist in 20 Sekunden fertig.

  failure_scenario: |
    Kein Keyboard-Shortcut für die häufigste Aktion, zu viele Pflichtfelder,
    kein DATEV-Export — Max deinstalliert nach einem Tag.

  key_quotes:
    - '"Warum brauche ich 5 Klicks für was das in 1 sein könnte?"'
    - '"Hat das Ding Keyboard Shortcuts? Nein? Dann nein."'
    - '"Ich will den CSV-Export für DATEV. Wenn der nicht stimmt, ist alles wertlos."'

  devices:
    primary: "MacBook Pro 14\" M3"
    secondary: "iPhone 15 Pro"
    browser: "Firefox Developer Edition"
    os: "macOS Sonoma"

  accessibility_needs:
    - "Keine besonderen Anforderungen"
    - "Bevorzugt dichtes Layout (viel Info auf einmal)"

  security_risks:
    - "Teilt MacBook nicht — Datenschutz kein großes Thema"
    - "Exportiert Daten zu Steuerberater — Sicherheit des Exports wichtig"

  focus_features:
    - feature-beleg-capture
    - feature-steuer-export

  challenge_priority: 4

  specific_requirements:
    ui_language: "Technisch, präzise, kein Babyspeak"
    ui_density: "Kompakt, viel Information auf einmal"
    error_style: "Kurz und präzise, kein Erklären"
    feedback_style: "Minimal, nicht unterbrechen"
```
