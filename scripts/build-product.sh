#!/usr/bin/env bash
# ============================================================
# build-product.sh — Autonomous Product Builder
#
# Nimmt ein ausgefülltes new-product.yaml und:
#   1. Bootstrapped das Produkt-Verzeichnis
#   2. Generiert product-vision.md aus dem YAML
#   3. Startet den Pipeline-Orchestrator in Claude Code
#
# Usage:
#   bash scripts/build-product.sh new-product.yaml
#   bash scripts/build-product.sh new-product.yaml --dry-run
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INPUT_FILE="${1:-}"
DRY_RUN=false
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=true

# ── Validierung ───────────────────────────────────────────

if [[ -z "$INPUT_FILE" ]]; then
  echo -e "${RED}Fehler: Input-Datei erforderlich${NC}"
  echo "Usage: bash scripts/build-product.sh intake/<produkt>.yaml"
  echo "       bash scripts/build-product.sh intake/<produkt>.yaml --dry-run"
  echo ""
  echo "Backlog anzeigen: bash scripts/list-products.sh"
  exit 1
fi

# Kurzform: "ki-radar" → "intake/ki-radar.yaml"
if [[ "$INPUT_FILE" != *.yaml && "$INPUT_FILE" != *.yml ]]; then
  INPUT_FILE="intake/${INPUT_FILE}.yaml"
fi

# Fallback: Name ohne Pfad → erst intake/ prüfen
if [[ ! -f "$INPUT_FILE" && ! "$INPUT_FILE" == */* ]]; then
  INPUT_FILE="intake/$INPUT_FILE"
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo -e "${RED}Fehler: Datei nicht gefunden: $INPUT_FILE${NC}"
  echo ""
  echo "Verfügbare Produkte im Backlog:"
  bash "$SCRIPT_DIR/list-products.sh" 2>/dev/null || echo "  (scripts/list-products.sh nicht verfügbar)"
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo -e "${RED}Fehler: python3 nicht gefunden${NC}"
  exit 1
fi

# ── YAML parsen ────────────────────────────────────────────

PRODUCT_ID=$(python3 -c "
import re
content = open('$INPUT_FILE').read()
m = re.search(r'^\s*id:\s*[\"\']([\w-]+)', content, re.MULTILINE)
print(m.group(1) if m else '')
")

PRODUCT_NAME=$(python3 -c "
import re
content = open('$INPUT_FILE').read()
m = re.search(r'^\s*name:\s*[\"\'](.*?)[\"\']\s*(?:#.*)?$', content, re.MULTILINE)
print(m.group(1).strip() if m else 'Unbenanntes Produkt')
")

if [[ -z "$PRODUCT_ID" ]]; then
  echo -e "${RED}Fehler: product.id nicht gefunden oder ungültig in $INPUT_FILE${NC}"
  echo "Stelle sicher dass 'id:' in kebab-case gesetzt ist: id: \"mein-produkt\""
  exit 1
fi

# Kebab-case validieren
if ! echo "$PRODUCT_ID" | grep -qE '^[a-z][a-z0-9-]+$'; then
  echo -e "${RED}Fehler: product.id muss kebab-case sein (nur Kleinbuchstaben, Zahlen, Bindestriche)${NC}"
  echo "Ungültig: '$PRODUCT_ID'"
  exit 1
fi

PRODUCT_DIR="$ROOT_DIR/products/$PRODUCT_ID"

# ── Header ────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   AI-First Company — Autonomous Product Builder${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Produkt:${NC}  $PRODUCT_NAME"
echo -e "  ${BLUE}ID:${NC}       $PRODUCT_ID"
echo -e "  ${BLUE}Input:${NC}    $INPUT_FILE"
[[ "$DRY_RUN" == true ]] && echo -e "  ${YELLOW}Modus:    DRY RUN (keine Dateien werden erstellt)${NC}"
echo ""

# ── Schritt 1: Produkt bootstrappen ──────────────────────

if [[ -d "$PRODUCT_DIR" ]]; then
  echo -e "${YELLOW}⚠️  Produkt '$PRODUCT_ID' existiert bereits.${NC}"
  read -rp "   Überschreiben? (j/N): " confirm
  if [[ "$confirm" != "j" && "$confirm" != "J" ]]; then
    echo "Abgebrochen."
    exit 0
  fi
fi

echo -e "${BLUE}[1/3]${NC} Produkt-Verzeichnis bootstrappen..."

if [[ "$DRY_RUN" == false ]]; then
  bash "$SCRIPT_DIR/bootstrap-product.sh" "$PRODUCT_ID" 2>/dev/null || {
    # Manuelles Bootstrapping falls Skript nicht verfügbar
    mkdir -p "$PRODUCT_DIR"/{specs,personas,app/{css,js,icons,tests},feedback/{incoming,processed},state/gate-reports,docs}
    echo -e "${GREEN}  ✓ Verzeichnisse erstellt${NC}"
  }
else
  echo -e "${YELLOW}  [DRY] Würde erstellen: $PRODUCT_DIR/...${NC}"
fi

# ── Schritt 2: product-vision.md generieren ───────────────

echo -e "${BLUE}[2/3]${NC} product-vision.md aus YAML generieren..."

VISION_FILE="$PRODUCT_DIR/specs/product-vision.md"

if [[ "$DRY_RUN" == false ]]; then
  python3 - "$INPUT_FILE" "$VISION_FILE" "$PRODUCT_NAME" "$PRODUCT_ID" << 'PYEOF'
import sys, re
from datetime import date

input_file  = sys.argv[1]
output_file = sys.argv[2]
product_name = sys.argv[3]
product_id   = sys.argv[4]
today        = date.today().isoformat()

def extract_block(content, key):
    """Extrahiert einen YAML block-scalar Wert (nach 'key: |')"""
    pattern = rf'{key}:\s*\|\s*\n((?:[ \t]+.*\n?)*)'
    m = re.search(pattern, content)
    if m:
        lines = m.group(1).split('\n')
        stripped = [l.lstrip() for l in lines]
        return '\n'.join(stripped).strip()
    return ""

def extract_scalar(content, key):
    """Extrahiert einen einfachen Scalar-Wert"""
    m = re.search(rf'^\s*{key}:\s*["\']?(.*?)["\']?\s*$', content, re.MULTILINE)
    return m.group(1).strip() if m else ""

def extract_list(content, section_key):
    """Extrahiert eine Liste unter einem Key"""
    pattern = rf'{section_key}:\s*\n((?:\s+- .*\n?)*)'
    m = re.search(pattern, content)
    if not m: return []
    items = re.findall(r'- name: ["\']?(.*?)["\']?\s*\n\s*description: ["\']?(.*?)["\']?\s*(?:\n|$)', m.group(0))
    if items: return items
    simple = re.findall(r'- ["\']?(.*?)["\']?\s*$', m.group(0), re.MULTILINE)
    return [(s.strip(), '') for s in simple if s.strip()]

content = open(input_file).read()

target_users     = extract_block(content, 'target_users')
core_problem     = extract_block(content, 'core_problem')
value_prop       = extract_block(content, 'value_proposition')
features         = extract_list(content, 'mvp_features')
data_source      = extract_scalar(content, 'source')
data_desc        = extract_block(content, 'description')
backend_needed   = extract_scalar(content, 'backend_needed')
out_of_scope     = re.findall(r'out_of_scope:\s*\n((?:\s+- .*\n?)*)', content)
oos_items        = re.findall(r'- ["\']?(.*?)["\']?\s*$', out_of_scope[0] if out_of_scope else '', re.MULTILINE)
technical        = extract_block(content, 'technical') or extract_scalar(content, 'technical')
sensitivity      = extract_scalar(content, 'data_sensitivity') or 'low'
metrics          = re.findall(r'- ["\']?(.*?)["\']?\s*$', re.search(r'success_metrics:\s*\n((?:\s+- .*\n?)*)', content).group(0) if re.search(r'success_metrics:', content) else '', re.MULTILINE)

features_md = '\n'.join([f"- **{n}**: {d}" for n, d in features]) if features else "_(noch nicht definiert)_"
oos_md = '\n'.join([f"- {i.strip()}" for i in oos_items if i.strip()]) or "_(keine explizit ausgeschlossen)_"
metrics_md = '\n'.join([f"- {m.strip()}" for m in metrics if m.strip()]) or "_(noch nicht definiert)_"

vision_content = f"""# {product_name} — Produktvision

**Produkt-ID**: {product_id}
**Erstellt**: {today}
**Status**: Draft

---

## Executive Summary

{target_users or "_(noch zu definieren)_"}

---

## Problem Statement

{core_problem or "_(noch zu definieren)_"}

---

## Value Proposition

{value_prop or "_(noch zu definieren)_"}

---

## MVP Features (P0)

{features_md}

---

## Daten & Infrastruktur

**Datenquelle**: {data_source}
{data_desc}

**Backend benötigt**: {backend_needed}

---

## Constraints & Assumptions

### Technisch
{technical or "Vanilla JS, kein Framework, kein Build-Step"}

### Explizit Out-of-Scope
{oos_md}

### Datensensitivität
{sensitivity}

---

## Success Metrics

{metrics_md}

---

## Target Personas

Werden generiert durch: `agents/meta/persona-architect.md`
Datei: `products/{product_id}/personas/variables.yaml`
"""

import os
os.makedirs(os.path.dirname(output_file), exist_ok=True)
open(output_file, 'w').write(vision_content)
print(f"  ✓ {output_file}")
PYEOF
  echo -e "${GREEN}  ✓ product-vision.md erstellt${NC}"
else
  echo -e "${YELLOW}  [DRY] Würde generieren: $VISION_FILE${NC}"
fi

# ── Schritt 3: Orchestrator-Prompt generieren ─────────────

echo -e "${BLUE}[3/3]${NC} Orchestrator-Prompt vorbereiten..."

ORCHESTRATOR_PROMPT_FILE="$PRODUCT_DIR/state/orchestrator-start.md"

if [[ "$DRY_RUN" == false ]]; then
  cat > "$ORCHESTRATOR_PROMPT_FILE" << PROMPTEOF
# Orchestrator Start — $PRODUCT_NAME

**Führe den vollständigen Produkt-Build für '$PRODUCT_ID' autonom durch.**

## Deine Anweisungen

Lies zuerst: \`agents/meta/pipeline-orchestrator.md\`
Ersetze dabei überall \`<id>\` durch \`$PRODUCT_ID\`.

## Bereits erledigt (durch build-product.sh)
- Verzeichnisstruktur erstellt: \`products/$PRODUCT_ID/\`
- product-vision.md generiert: \`products/$PRODUCT_ID/specs/product-vision.md\`

## Dein Startpunkt
Phase 1 — Personas generieren.
Folge exakt dem Orchestrator-Protokoll.
Pausiere nur beim Human-Checkpoint nach den Specs.

## Wichtige Learnings aus bisherigen Sprints
Lies: \`state/project-learnings.yaml\` (nur technical + process Sektionen)
PROMPTEOF
  echo -e "${GREEN}  ✓ Orchestrator-Prompt erstellt: $ORCHESTRATOR_PROMPT_FILE${NC}"
fi

# ── Fertig: Anleitung ausgeben ────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}   Setup abgeschlossen! ✓${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Nächster Schritt — Gib Claude diesen Prompt:${NC}"
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}                                                     ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  Lies products/$PRODUCT_ID/state/orchestrator-start.md  ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  und führe den Build autonom durch.                  ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}                                                     ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${YELLOW}Was Claude danach autonom macht:${NC}"
echo "  Phase 1: Personas generieren         (kein Review nötig)"
echo "  Phase 2: Specs generieren             (kein Review nötig)"
echo "  ⏸  PAUSE: Specs reviewen              (du: ~15 min)"
echo "  Phase 3: Code generieren              (kein Review nötig)"
echo "  Phase 4: Security + A11y + Quality    (kein Review nötig)"
echo "  Phase 5: Auto-Fix bei Gate-Failures   (kein Review nötig)"
echo "  Phase 6: Deployment-Ready Report      (du: deploy-Befehl ausführen)"
echo ""
echo -e "${BLUE}Generierte Dateien:${NC}"
echo "  📁 products/$PRODUCT_ID/"
echo "  📄 products/$PRODUCT_ID/specs/product-vision.md"
echo "  📄 products/$PRODUCT_ID/state/orchestrator-start.md"
echo ""

# system-state.yaml aktualisieren
if [[ "$DRY_RUN" == false ]]; then
  python3 - "$ROOT_DIR/state/system-state.yaml" "$PRODUCT_ID" "$PRODUCT_NAME" << 'PYEOF'
import sys, re
from datetime import date

state_file   = sys.argv[1]
product_id   = sys.argv[2]
product_name = sys.argv[3]
today        = date.today().isoformat()

content = open(state_file).read()

new_product = f"""
  {product_id}:
    status: bootstrapped
    bootstrapped_at: "{today}"
    name: "{product_name}"
    config: products/{product_id}/config.yaml
    next_action: "run orchestrator — products/{product_id}/state/orchestrator-start.md"
"""

if f"  {product_id}:" in content:
    content = re.sub(rf'\n  {product_id}:.*?(?=\n  \w|\nmetrics|\Z)', new_product, content, flags=re.DOTALL)
else:
    content = content.replace('\nmetrics:', new_product + '\nmetrics:')

open(state_file, 'w').write(content)
PYEOF
fi
