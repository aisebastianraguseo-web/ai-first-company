# Code Standards — Governance Layer

**Version**: 1.0 | **Status**: AKTIV | **Verbindlichkeit**: PFLICHT

## GELTUNGSBEREICH

Diese Standards gelten für ALLE Produkte in diesem System. Kein Agent darf Code produzieren, der gegen diese Standards verstößt. Der Quality Gate Agent prüft Compliance automatisch.

---

## ALLGEMEINE PRINZIPIEN

### Clean Code
- Funktionen: max. 30 Zeilen (Ausnahmen dokumentieren)
- Dateien: max. 300 Zeilen (Ausnahmen via Architecture Decision)
- Variablen: sprechende Namen, keine Abkürzungen außer etablierte (id, url, api)
- Keine verschachtelten Callbacks >2 Ebenen (Promises/Async-Await stattdessen)
- DRY: Keine Duplizierung von Logik über Dateigrenzen hinweg

### Kommentare
- Kommentiere das **Warum**, nicht das Was
- Komplexe Business-Logik: immer kommentieren
- TODO/FIXME: immer mit Issue-Referenz oder Datum
- Keine auskommentierten Code-Blöcke im Main-Branch

### Naming Conventions
```
HTML:     kebab-case für IDs und Klassen (expense-form, btn-submit)
CSS:      BEM-Methodik: Block__Element--Modifier
JS:       camelCase für Variablen/Funktionen, PascalCase für Klassen
Dateien:  kebab-case (expense-tracker.js, not expenseTracker.js)
Konstanten: SCREAMING_SNAKE_CASE
```

---

## HTML STANDARDS

### Struktur
```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Produkt - Seite</title>
  <!-- CSS vor JS -->
</head>
<body>
  <!-- Semantisches HTML5 (header, main, nav, section, article, aside, footer) -->
  <!-- Scripts am Ende des body -->
</body>
</html>
```

### Pflicht-Attribute
- Alle `<img>`: `alt` Attribut (leer für dekorative Bilder)
- Alle `<input>`: `id` + `name` + korrespondierendes `<label>`
- Alle Buttons: `type` Attribut (button/submit/reset)
- Alle Links: sinnvoller Link-Text (kein "Hier klicken")
- Interaktive Elemente: `tabindex` wenn nötig

---

## CSS STANDARDS

### Architektur
```
1. Custom Properties (Variablen) → :root {}
2. Reset/Base Styles
3. Layout (Grid/Flexbox)
4. Components (BEM)
5. Utilities
6. Media Queries (Mobile-First)
```

### Custom Properties Pflicht
```css
:root {
  /* Farben */
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-bg: #ffffff;
  --color-bg-subtle: #f9fafb;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
}
```

### Verboten
- Keine Inline-Styles (außer dynamisch via JS)
- Keine !important (außer in Utility-Klassen)
- Keine CSS-Hacks für Browser <2 Jahre alt
- Keine fixen px-Werte für Schriftgrößen (rem verwenden)

---

## JAVASCRIPT STANDARDS

### Pflicht
```javascript
'use strict'; // Immer am Anfang

// Moderne Syntax (ES2020+)
const { property } = object;          // Destructuring
const result = array.map(fn);         // Array methods
const value = condition ?? fallback;  // Nullish coalescing
const text = `Hello ${name}`;         // Template literals
const data = await fetchData();       // Async/Await

// Error Handling - IMMER
try {
  const result = await riskyOperation();
} catch (error) {
  console.error('[ModuleName] Operation failed:', error.message);
  // User-freundliche Fehlermeldung anzeigen
  showError('Aktion konnte nicht ausgeführt werden. Bitte erneut versuchen.');
}
```

### State Management
- Zentraler App-State als plain Object
- State nur über dedizierte Funktionen mutieren
- State-Änderungen loggen (DEBUG-Mode)

```javascript
const AppState = {
  _state: {},
  get(key) { return this._state[key]; },
  set(key, value) {
    const old = this._state[key];
    this._state[key] = value;
    this._notify(key, old, value);
  },
  _notify(key, old, newVal) { /* Event emitting */ }
};
```

### Verboten
- Kein `var` (nur `const` und `let`)
- Kein `eval()`
- Kein `document.write()`
- Keine globalen Variablen (alles in Modulen/IIFE)
- Kein synchrones XHR

### Event Handling
```javascript
// Event Delegation statt viele Listener
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-action]')) {
    handleAction(e.target.dataset.action, e);
  }
});
```

---

## DATA HANDLING & STORAGE

### LocalStorage
```javascript
// Wrapper mit Error-Handling
const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  },
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }
};
```

### Input Sanitization (PFLICHT)
```javascript
function sanitizeInput(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
// Keine innerHTML mit User-Input — immer textContent oder DOM-API
```

---

## PWA STANDARDS

### Manifest (pflicht für PWA-ready)
```json
{
  "name": "Produktname",
  "short_name": "Name",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker
- Offline-Fallback für alle Seiten
- Cache-First für statische Assets
- Network-First für API-Calls

---

## PERFORMANCE STANDARDS

| Metric | Ziel | Minimum |
|--------|------|---------|
| First Contentful Paint | <1.5s | <2.5s |
| Largest Contentful Paint | <2.5s | <4.0s |
| Total Blocking Time | <200ms | <600ms |
| Cumulative Layout Shift | <0.1 | <0.25 |
| JS Bundle | <100KB | <250KB |

### Pflicht-Optimierungen
- Images: `loading="lazy"` + WebP format
- Fonts: `font-display: swap`
- Kritischer CSS: inline (above-the-fold)
- Scripts: `defer` oder `async`

---

## DOKUMENTATIONS-STANDARD

Jedes Produkt braucht:
- `README.md`: Setup, Run, Deploy
- `CHANGELOG.md`: Alle Versionen mit Datum
- `docs/architecture.md`: Technische Entscheidungen

---

## VERSIONIERUNG

- Semantic Versioning: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: Neue Features (rückwärtskompatibel)
- PATCH: Bug fixes

## ENFORCEMENT

- Quality Gate Agent prüft diese Standards automatisch
- Gate FAIL bei kritischen Verstößen (Security, A11y, XSS)
- Gate WARNING bei Style-Verstößen (dokumentiert, nicht blocking)
- Human Review nötig bei >5 Warnings
