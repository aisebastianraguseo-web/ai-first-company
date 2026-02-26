# Accessibility Policy — Governance Layer

**Version**: 1.0 | **Standard**: WCAG 2.1 Level AA | **Verbindlichkeit**: BLOCKING

## GELTUNGSBEREICH

Alle UI-Komponenten aller Produkte. WCAG AA ist das Minimum — kein Deployment ohne A11y Gate GREEN.

---

## WCAG 2.1 LEVEL AA — PFLICHT-KRITERIEN

### 1. WAHRNEHMBAR (Perceivable)

#### 1.1 Textalternativen
```html
<!-- PFLICHT: Alt-Text für alle informellen Bilder -->
<img src="receipt.jpg" alt="Kassenbon von REWE, 15.02.2024, 47,30 EUR">

<!-- Dekorative Bilder: leeres alt="" -->
<img src="decorative-wave.svg" alt="" role="presentation">

<!-- Icons mit Bedeutung: aria-label -->
<button aria-label="Beleg löschen">
  <svg aria-hidden="true">...</svg>
</button>
```

#### 1.2 Zeitbasierte Medien
- Fotos/Bilder: Immer Textalternative
- Videos (falls vorhanden): Untertitel erforderlich
- Audio: Transkript erforderlich

#### 1.3 Anpassbar
```html
<!-- Semantisches HTML statt div-Suppe -->
<header>
  <nav aria-label="Hauptnavigation">...</nav>
</header>
<main>
  <section aria-labelledby="expenses-heading">
    <h2 id="expenses-heading">Meine Ausgaben</h2>
    ...
  </section>
</main>
<footer>...</footer>

<!-- Landmarks für Screenreader -->
<nav aria-label="Seitennavigation">
<aside aria-label="Zusammenfassung">
<form aria-labelledby="form-title">
```

#### 1.4 Unterscheidbar (WCAG AA)
**Kontrastanforderungen:**
| Element | Minimum-Kontrastverhältnis |
|---------|--------------------------|
| Normaler Text (<18px) | 4.5:1 |
| Großer Text (≥18px oder ≥14px bold) | 3:1 |
| UI-Komponenten & Grafiken | 3:1 |
| Fokus-Indikator | 3:1 |

**Pflicht-Farben (erfüllen WCAG AA):**
```css
:root {
  /* Getestet gegen #ffffff (weiß) Hintergrund */
  --color-primary: #1d4ed8;      /* Kontrast: 7.2:1 ✓ */
  --color-text: #111827;          /* Kontrast: 17.9:1 ✓ */
  --color-text-muted: #374151;    /* Kontrast: 10.2:1 ✓ */
  --color-error: #b91c1c;         /* Kontrast: 6.1:1 ✓ */
  --color-success: #15803d;       /* Kontrast: 5.4:1 ✓ */
  --color-warning-text: #92400e;  /* Kontrast: 7.2:1 ✓ */
}
```

---

### 2. BEDIENBAR (Operable)

#### 2.1 Tastaturbedienbarkeit
**Alle Funktionen müssen per Tastatur erreichbar sein:**

```javascript
// Fokus-Management für Modals
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.removeAttribute('hidden');
  // Fokus auf ersten fokussierbaren Element
  const focusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus();
  // Fokus im Modal halten (Focus Trap)
  trapFocus(modal);
}

function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];

  element.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  });
}
```

**Tab-Reihenfolge:**
- Logische Tab-Reihenfolge entspricht visueller Reihenfolge
- Keine Tab-Fallen (außer Modal-Dialoge)
- Skip-Link: "Zum Hauptinhalt springen" als erstes Element

```html
<!-- Skip Link (PFLICHT) -->
<a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
</style>
```

#### 2.2 Ausreichend Zeit
- Keine Timeouts ohne Warnung
- Automatisch bewegende Inhalte: Pause-Möglichkeit
- Session-Timeout: Min. 20 min Warnung vor Ablauf

#### 2.3 Anfälle vermeiden
- Keine Inhalte die >3x/Sekunde blinken

#### 2.4 Navigierbar
```html
<!-- Seitenstruktur mit korrekten Überschriften -->
<h1>Expense Tracker</h1>        <!-- Nur einmal pro Seite -->
  <h2>Ausgaben hinzufügen</h2>
    <h3>Beleg-Details</h3>
  <h2>Ausgabenliste</h2>
    <h3>Februar 2024</h3>

<!-- Breadcrumbs (wenn mehrere Ebenen) -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Dashboard</a></li>
    <li aria-current="page">Ausgaben</li>
  </ol>
</nav>
```

---

### 3. VERSTÄNDLICH (Understandable)

#### 3.1 Lesbar
```html
<!-- Sprache IMMER deklarieren -->
<html lang="de">
<!-- Bei anderssprachigen Inhalten -->
<span lang="en">Receipt</span>
```

#### 3.2 Vorhersehbar
- Keine automatischen Kontextwechsel beim Fokus
- Keine unerwarteten Formularabsendungen
- Konsistente Navigation auf allen Seiten

#### 3.3 Eingabehilfe (PFLICHT)

```html
<!-- Fehler-Identifikation -->
<div class="form-group">
  <label for="amount">Betrag (EUR) *</label>
  <input
    id="amount"
    type="number"
    name="amount"
    min="0.01"
    max="999999"
    step="0.01"
    required
    aria-required="true"
    aria-describedby="amount-hint amount-error"
    aria-invalid="false"
  >
  <div id="amount-hint" class="form-hint">
    Tragen Sie den Betrag in Euro ein (z.B. 47,50)
  </div>
  <div id="amount-error" class="form-error" role="alert" hidden>
    Bitte geben Sie einen gültigen Betrag zwischen 0,01 und 999.999 EUR ein.
  </div>
</div>

<!-- Fehler-Zusammenfassung bei Formular-Submit -->
<div role="alert" aria-live="polite" id="form-errors">
  <!-- Fehler hier dynamisch einfügen -->
</div>
```

**Fehlermeldungen:**
- Beschreiben WAS falsch ist
- Erklären WIE man es korrigiert
- Verknüpft mit dem fehlerhaften Feld
- Nie nur durch Farbe kommuniziert

---

### 4. ROBUST (Robust)

#### 4.1 Kompatibel
```html
<!-- ARIA Live Regions für dynamische Inhalte -->
<div aria-live="polite" aria-atomic="true" id="status-message">
  <!-- Status-Updates hier einfügen -->
</div>

<div aria-live="assertive" role="alert" id="error-message">
  <!-- Kritische Fehler hier -->
</div>

<!-- Komplexe Widgets: ARIA-Roles -->
<div role="tablist" aria-label="Ausgaben-Kategorien">
  <button role="tab" aria-selected="true" aria-controls="tab-all" id="btn-all">
    Alle
  </button>
  <button role="tab" aria-selected="false" aria-controls="tab-business" id="btn-business">
    Geschäftlich
  </button>
</div>
<div role="tabpanel" id="tab-all" aria-labelledby="btn-all">
  <!-- Inhalt -->
</div>
```

---

## MOBILE ACCESSIBILITY

```css
/* Touch-Targets: min. 44x44px (Apple HIG) / 48x48px (Google Material) */
button, a, input, select {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-sm) var(--space-md);
}

/* Ausreichend Abstand zwischen Touch-Targets */
.button-group > * + * {
  margin-left: var(--space-sm);
}

/* Keine Hover-only Interaktionen auf Touch-Geräten */
@media (hover: none) {
  .tooltip { display: none; }
  /* Alternative für Touch bereitstellen */
}
```

---

## A11Y TESTING CHECKLISTE

### Automatisch (A11y Challenger Agent)
- [ ] axe-core Scan: 0 Violations (Critical + Serious)
- [ ] Kontrastverhältnisse alle ≥4.5:1
- [ ] Alle Bilder haben alt-Text
- [ ] Alle Formularfelder haben Labels
- [ ] Keine fehlenden ARIA-Rollen
- [ ] Heading-Hierarchie korrekt

### Manuell (Ingrid Persona Simulation)
- [ ] Nur mit Tastatur bedienbar (kein Mausklick)
- [ ] Screenreader-Test (Tab-Flow sinnvoll)
- [ ] Zoom auf 200% (kein Overflow, kein Datenverlust)
- [ ] High-Contrast Mode funktioniert
- [ ] Fehlermeldungen verständlich ohne Farbe

---

## SEVERITY FÜR A11Y VIOLATIONS

| Severity | axe-core Level | Action |
|----------|---------------|--------|
| BLOCKING | Critical + Serious | Kein Deployment |
| WARNING | Moderate | Dokumentieren + Sprint |
| INFO | Minor | Backlog |

---

## SPEZIAL-ANFORDERUNGEN: EXPENSE TRACKER

Da Ingrid (Tech-Laie, 58) eine Kern-Persona ist:
- Klare, einfache Sprache (max. Lesbarkeitsgrad: Klasse 8)
- Große Standard-Schriftgröße (min. 16px base)
- Deutliche Fehlerhinweise mit konkreten Anleitungen
- Keine Fachjargon ohne Erklärung
- Bestätigungs-Dialoge vor destruktiven Aktionen (Löschen)
- Fortschrittsanzeige bei langen Operationen (OCR, Export)
