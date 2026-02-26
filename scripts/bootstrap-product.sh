#!/bin/bash
# =============================================================================
# bootstrap-product.sh — Erstellt vollständige Produkt-Struktur
# =============================================================================
# Verwendung: ./scripts/bootstrap-product.sh <product-id> "<product-name>"
# Beispiel:   ./scripts/bootstrap-product.sh expense-tracker "Expense Tracker"
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Args
PRODUCT_ID="${1:-}"
PRODUCT_NAME="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# =============================================================================
# VALIDATION
# =============================================================================

log() { echo -e "${BLUE}[bootstrap]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

validate_args() {
    if [ -z "$PRODUCT_ID" ]; then
        error "Kein Product-ID angegeben.\nVerwendung: $0 <product-id> '<product-name>'"
    fi

    if [ -z "$PRODUCT_NAME" ]; then
        error "Kein Product-Name angegeben.\nVerwendung: $0 <product-id> '<product-name>'"
    fi

    # ID muss kebab-case sein
    if ! echo "$PRODUCT_ID" | grep -qE '^[a-z][a-z0-9-]*$'; then
        error "Product-ID muss kebab-case sein (z.B. 'expense-tracker'). Eingabe: '$PRODUCT_ID'"
    fi

    # Prüfe ob Produkt bereits existiert
    PRODUCT_DIR="$ROOT_DIR/products/$PRODUCT_ID"
    if [ -d "$PRODUCT_DIR" ]; then
        warn "Produkt '$PRODUCT_ID' existiert bereits!"
        read -p "Überschreiben? (j/N): " confirm
        if [[ ! "$confirm" =~ ^[jJ]$ ]]; then
            log "Abgebrochen."
            exit 0
        fi
    fi

    success "Validierung: OK"
}

# =============================================================================
# DIRECTORY STRUCTURE
# =============================================================================

create_directories() {
    log "Erstelle Verzeichnisstruktur für: $PRODUCT_NAME ($PRODUCT_ID)"

    PRODUCT_DIR="$ROOT_DIR/products/$PRODUCT_ID"

    mkdir -p "$PRODUCT_DIR"/{specs,personas,code/{styles,js,assets/icons},feedback/{incoming,processed/{challenges,patterns,contrarian}},state/gate-reports,docs}

    success "Verzeichnisstruktur erstellt"
}

# =============================================================================
# CONFIG.YAML
# =============================================================================

create_config() {
    local product_dir="$ROOT_DIR/products/$PRODUCT_ID"
    local date_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log "Erstelle config.yaml..."

    cat > "$product_dir/config.yaml" << YAML
# Auto-generiert von bootstrap-product.sh
# Datum: $date_iso

product:
  id: $PRODUCT_ID
  name: "$PRODUCT_NAME"
  version: "0.1.0"
  created: "$date_iso"
  status: bootstrapped

stack:
  platform: web
  pwa_ready: true
  offline_support: true

personas:
  enabled: true
  list: []  # Wird von Persona Architect befüllt

specialized_agents:
  security:
    enabled: true
    blocking: true
    framework: OWASP_TOP_10
  accessibility:
    enabled: true
    blocking: true
    standard: WCAG_2.1_AA
  quality_gate:
    enabled: true
    blocking: true
  performance:
    enabled: true
    blocking: false

exploration_agents:
  feedback_challenger: true
  pattern_connector: true
  persona_validator: true
  contrarian: true
  synthesis: true

pipeline:
  auto_deploy: false
  auto_rollback: true
  max_retries: 3
  human_approval_required_for:
    - new_features
    - architecture_changes
    - version_major_bump

governance:
  code_standards: "../../governance/code-standards.md"
  security_policy: "../../governance/security-policy.md"
  accessibility_policy: "../../governance/accessibility-policy.md"
  quality_gates: "../../governance/quality-gates.md"
YAML

    success "config.yaml erstellt"
}

# =============================================================================
# BOILERPLATE HTML
# =============================================================================

create_boilerplate() {
    local product_dir="$ROOT_DIR/products/$PRODUCT_ID"

    log "Erstelle Boilerplate-Code..."

    # index.html
    cat > "$product_dir/code/index.html" << HTML
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="$PRODUCT_NAME">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';">
  <meta name="X-Content-Type-Options" content="nosniff">
  <title>$PRODUCT_NAME</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <!-- Skip Link (WCAG 2.4.1) -->
  <a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>

  <header role="banner">
    <nav aria-label="Hauptnavigation">
      <h1 class="app-title">$PRODUCT_NAME</h1>
    </nav>
  </header>

  <main id="main-content" role="main">
    <!-- Inhalt wird dynamisch eingefügt -->
    <div class="loading-state" aria-live="polite">
      <p>Wird geladen...</p>
    </div>
  </main>

  <!-- ARIA Live Regions für Screen Reader -->
  <div aria-live="polite" aria-atomic="true" id="status-message" class="sr-only"></div>
  <div aria-live="assertive" role="alert" id="error-message" class="sr-only"></div>

  <script src="js/app.js" defer></script>
</body>
</html>
HTML

    # main.css
    cat > "$product_dir/code/styles/main.css" << CSS
/* =============================================================================
   $PRODUCT_NAME — Main Styles
   Governance: ../../governance/code-standards.md
   ============================================================================= */

/* Custom Properties (Design Tokens) */
:root {
  /* Farben — WCAG AA konform */
  --color-primary: #1d4ed8;      /* Kontrast auf Weiß: 7.2:1 */
  --color-primary-hover: #1e40af;
  --color-secondary: #7c3aed;
  --color-success: #15803d;      /* Kontrast auf Weiß: 5.4:1 */
  --color-warning: #92400e;      /* Kontrast auf Weiß: 7.2:1 */
  --color-error: #b91c1c;        /* Kontrast auf Weiß: 6.1:1 */
  --color-text: #111827;         /* Kontrast auf Weiß: 17.9:1 */
  --color-text-muted: #374151;   /* Kontrast auf Weiß: 10.2:1 */
  --color-bg: #ffffff;
  --color-bg-subtle: #f9fafb;
  --color-border: #e5e7eb;
  --color-focus: #2563eb;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Typography */
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --line-height-base: 1.5;
  --line-height-heading: 1.25;

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.10);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;  /* Nicht überschreiben — User-Einstellung respektieren */
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  min-height: 100vh;
}

/* Skip Link (Accessibility) */
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-md);
  background: var(--color-primary);
  color: white;
  padding: var(--space-sm) var(--space-md);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  z-index: 1000;
  transition: top var(--transition-fast);
}
.skip-link:focus {
  top: 0;
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus Styles (Accessibility) */
:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

/* Touch Targets (min 44px per WCAG 2.5.5) */
button,
[role="button"],
input[type="checkbox"],
input[type="radio"] {
  min-height: 44px;
  min-width: 44px;
}

/* Header */
header {
  background: var(--color-primary);
  color: white;
  padding: var(--space-md) var(--space-lg);
}

.app-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

/* Main Layout */
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-lg);
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
CSS

    # app.js
    cat > "$product_dir/code/js/app.js" << 'JAVASCRIPT'
'use strict';

// =============================================================================
// App State Management
// =============================================================================
const AppState = {
  _state: {},
  _listeners: {},

  get(key) {
    return this._state[key];
  },

  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this._notify(key, oldValue, value);
  },

  _notify(key, oldValue, newValue) {
    const listeners = this._listeners[key] || [];
    listeners.forEach(fn => {
      try { fn(newValue, oldValue); }
      catch (e) { console.error('[AppState] Listener error:', e.message); }
    });
  },

  subscribe(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
    return () => {
      this._listeners[key] = this._listeners[key].filter(l => l !== fn);
    };
  }
};

// =============================================================================
// Storage Helper
// =============================================================================
const Storage = {
  KEY: 'app-data',

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        UI.showError('Speicher voll. Bitte exportieren und alte Einträge löschen.');
      } else {
        UI.showError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      }
      console.error('[Storage] Write failed:', e.message);
      return false;
    }
  },

  load(fallback = {}) {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return fallback;
      const data = JSON.parse(raw);
      return data || fallback;
    } catch (e) {
      console.error('[Storage] Read failed:', e.message);
      return fallback;
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// =============================================================================
// UI Helpers
// =============================================================================
const UI = {
  announce(message, priority = 'polite') {
    const id = priority === 'assertive' ? 'error-message' : 'status-message';
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    setTimeout(() => { el.textContent = message; }, 50);
  },

  showError(message) {
    this.announce(message, 'assertive');
  },

  showSuccess(message) {
    this.announce(message, 'polite');
  },

  sanitize(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else el.setAttribute(key, value);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else el.appendChild(child);
    });
    return el;
  }
};

// =============================================================================
// App Init
// =============================================================================
async function init() {
  try {
    const savedData = Storage.load({ initialized: true });
    AppState.set('data', savedData);

    render();
  } catch (error) {
    console.error('[App] Init failed:', error.message);
    UI.showError('App konnte nicht geladen werden. Bitte Seite neu laden.');
  }
}

function render() {
  const main = document.getElementById('main-content');
  if (!main) return;

  main.innerHTML = '';
  const loading = main.querySelector('.loading-state');
  if (loading) loading.remove();

  // Hauptinhalt hier rendern
  const p = document.createElement('p');
  p.textContent = 'App bereit.';
  main.appendChild(p);
}

document.addEventListener('DOMContentLoaded', init);
JAVASCRIPT

    # manifest.json
    cat > "$product_dir/code/manifest.json" << JSON
{
  "name": "$PRODUCT_NAME",
  "short_name": "$PRODUCT_NAME",
  "description": "$PRODUCT_NAME — PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "lang": "de",
  "icons": [
    {
      "src": "/assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
JSON

    success "Boilerplate-Code erstellt"
}

# =============================================================================
# PIPELINE STATE
# =============================================================================

create_pipeline_state() {
    local product_dir="$ROOT_DIR/products/$PRODUCT_ID"
    local date_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log "Erstelle Pipeline-State..."

    cat > "$product_dir/state/pipeline-state.yaml" << YAML
# Pipeline State — $PRODUCT_NAME
# Automatisch verwaltet von run-pipeline.sh und resume-pipeline.py

product_id: $PRODUCT_ID
last_updated: "$date_iso"

current_phase: bootstrapped
current_version: "0.1.0"

phases:
  bootstrap:
    status: completed
    completed_at: "$date_iso"

  persona_generation:
    status: pending
    completed_at: null

  spec_writing:
    status: pending
    completed_at: null

  human_review:
    status: pending
    completed_at: null

  code_generation:
    status: pending
    completed_at: null

  quality_gates:
    status: pending
    security: pending
    accessibility: pending
    code_quality: pending
    spec_compliance: pending
    performance: pending

  deployment:
    status: pending
    completed_at: null

  feedback_loop:
    status: pending

active_tasks: []
completed_tasks: []
failed_tasks: []

deployment_history: []

next_action: "run_persona_architect"
next_action_agent: "agents/meta/persona-architect.md"
YAML

    success "Pipeline-State erstellt"
}

# =============================================================================
# README
# =============================================================================

create_readme() {
    local product_dir="$ROOT_DIR/products/$PRODUCT_ID"
    local date=$(date +"%Y-%m-%d")

    cat > "$product_dir/docs/README.md" << MD
# $PRODUCT_NAME

Erstellt: $date | Version: 0.1.0 | Status: Bootstrapped

## Schnellstart

\`\`\`bash
# Pipeline starten
./scripts/run-pipeline.sh $PRODUCT_ID

# Pipeline fortsetzen nach Unterbrechung
python3 scripts/resume-pipeline.py --product $PRODUCT_ID
\`\`\`

## Verzeichnisstruktur

\`\`\`
$PRODUCT_ID/
├── config.yaml          # Produkt-Konfiguration
├── specs/               # Feature-Spezifikationen
├── personas/            # User-Personas
├── code/                # Generierter Code
├── feedback/            # User-Feedback (roh + klassifiziert)
├── state/               # Pipeline-State + Gate-Reports
└── docs/                # Dokumentation
\`\`\`

## Agents die für dieses Produkt arbeiten

- Persona Architect → \`agents/meta/persona-architect.md\`
- Spec Writer → \`agents/meta/spec-writer.md\`
- Security Challenger → \`agents/specialized/security-challenger.md\`
- A11y Challenger → \`agents/specialized/accessibility-challenger.md\`
- Quality Gate → \`agents/specialized/quality-gate.md\`

## Governance

Alle Code-Standards, Security-Policy und Accessibility-Policy findest du in:
\`../../governance/\`

## Changelog

### 0.1.0 — $date
- Initial Bootstrap
MD

    cat > "$product_dir/docs/CHANGELOG.md" << MD
# Changelog — $PRODUCT_NAME

## [Unreleased]

## [0.1.0] — $date
### Added
- Initial product bootstrap
- Verzeichnisstruktur
- Boilerplate HTML/CSS/JS (governance-konform)
- config.yaml
- pipeline-state.yaml
MD

    cat > "$product_dir/docs/architecture.md" << MD
# Architektur — $PRODUCT_NAME

## Stack

- **Platform**: Web (PWA-ready)
- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript ES2020+
- **Storage**: LocalStorage (client-side)
- **Build**: Kein Build-System (Zero-dependency)

## Architektur-Entscheidungen

### ADR-001: Vanilla JS statt Framework
**Datum**: $date
**Status**: Accepted
**Begründung**: Minimale Komplexität, kein Build-Step, maximale Performance für Single-Person-Team.

### ADR-002: LocalStorage für Datenspeicherung
**Datum**: $date
**Status**: Accepted
**Begründung**: Offline-First, keine Backend-Kosten, DSGVO-konform (Daten bleiben beim User).
MD

    success "Dokumentation erstellt"
}

# =============================================================================
# UPDATE SYSTEM STATE
# =============================================================================

update_system_state() {
    local date_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local state_file="$ROOT_DIR/state/system-state.yaml"

    if [ -f "$state_file" ]; then
        log "Aktualisiere system-state.yaml..."
        # Einfaches Anhängen — korrekte YAML-Manipulation via Python wäre besser
        cat >> "$state_file" << YAML

  # Hinzugefügt von bootstrap-product.sh
  $PRODUCT_ID:
    status: bootstrapped
    bootstrapped_at: "$date_iso"
    pipeline_ready: true
    next_step: "run_persona_architect"
YAML
        success "system-state.yaml aktualisiert"
    else
        warn "state/system-state.yaml nicht gefunden — manuell aktualisieren"
    fi
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Product Bootstrapper — AI-First Company  ${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""

    validate_args
    create_directories
    create_config
    create_boilerplate
    create_pipeline_state
    create_readme
    update_system_state

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ✅ Bootstrap erfolgreich!                ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Produkt: $PRODUCT_NAME ($PRODUCT_ID)"
    echo "Pfad:    $ROOT_DIR/products/$PRODUCT_ID"
    echo ""
    echo "Nächste Schritte:"
    echo "  1. Vision-Datei erstellen: products/$PRODUCT_ID/specs/product-vision.md"
    echo "  2. Pipeline starten: ./scripts/run-pipeline.sh $PRODUCT_ID"
    echo ""
}

main
