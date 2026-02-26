#!/usr/bin/env bash
# ============================================================
# daily-digest.sh — AI-First Company Daily Digest Generator
# Erstellt täglichen Überblick für Human Layer (max 30 min)
# Usage: ./scripts/daily-digest.sh [--product <id>] [--format md|txt]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATE_DIR="$ROOT_DIR/state"
DIGEST_DIR="$STATE_DIR/digests"
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")
DATE=$(date +"%Y-%m-%d")
FORMAT="md"
PRODUCT_FILTER=""

# ─── COLORS ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── ARGS ──────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --product) PRODUCT_FILTER="$2"; shift 2 ;;
    --format)  FORMAT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$DIGEST_DIR"
DIGEST_FILE="$DIGEST_DIR/digest_${DATE}.${FORMAT}"

# ─── COLLECT DATA ──────────────────────────────────────────

collect_products() {
  if [[ -n "$PRODUCT_FILTER" ]]; then
    echo "$PRODUCT_FILTER"
  else
    ls "$ROOT_DIR/products/" 2>/dev/null || true
  fi
}

count_specs() {
  local product_id="$1"
  find "$ROOT_DIR/products/$product_id/specs" -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

count_personas() {
  local product_id="$1"
  local pfile="$ROOT_DIR/products/$product_id/personas/variables.yaml"
  if [[ -f "$pfile" ]]; then
    grep -c "^  - name:" "$pfile" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

get_pending_decisions() {
  local dfile="$STATE_DIR/decisions-pending.yaml"
  if [[ -f "$dfile" ]]; then
    grep -c "status: pending" "$dfile" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

get_pipeline_status() {
  local pfile="$STATE_DIR/pipeline-state.json"
  if [[ -f "$pfile" ]] && command -v python3 &>/dev/null; then
    python3 - "$pfile" "$1" <<'EOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        state = json.load(f)
    product = sys.argv[2]
    if product in state and state[product].get("runs"):
        last_run = state[product]["runs"][-1]
        stages = last_run.get("stages", {})
        passed = sum(1 for s in stages.values() if s["status"] == "passed")
        total = len(stages)
        print(f"{passed}/{total} stages passed ({last_run['status']})")
    else:
        print("No pipeline runs")
except Exception:
    print("—")
EOF
  else
    echo "—"
  fi
}

# ─── GENERATE MARKDOWN DIGEST ──────────────────────────────

generate_md_digest() {
  local products
  products=$(collect_products)
  local pending_decisions
  pending_decisions=$(get_pending_decisions)

  cat > "$DIGEST_FILE" << MDEOF
# Daily Digest — $DATE

> **Generiert**: $TIMESTAMP
> **Für**: Human Layer (Ziel: max 30 min Review)
> **System**: AI-First Company

---

## Entscheidungen Ausstehend

MDEOF

  if [[ "$pending_decisions" -gt 0 ]]; then
    echo "**⚠️  $pending_decisions Entscheidung(en) warten auf deine Antwort:**" >> "$DIGEST_FILE"
    echo "" >> "$DIGEST_FILE"
    if [[ -f "$STATE_DIR/decisions-pending.yaml" ]]; then
      # Extract pending decisions
      python3 - "$STATE_DIR/decisions-pending.yaml" >> "$DIGEST_FILE" <<'EOF'
import sys
try:
    with open(sys.argv[1]) as f:
        content = f.read()
    # Simple extraction of pending decisions
    lines = content.split('\n')
    in_pending = False
    for line in lines:
        if 'status: pending' in line:
            in_pending = True
        if in_pending and line.startswith('  - id:'):
            print(f"- **{line.split(':', 1)[1].strip()}**")
            in_pending = False
except Exception:
    print("- Siehe state/decisions-pending.yaml")
EOF
    fi
  else
    echo "✅ Keine ausstehenden Entscheidungen." >> "$DIGEST_FILE"
  fi

  cat >> "$DIGEST_FILE" << MDEOF

---

## Produkt-Status

MDEOF

  if [[ -z "$products" ]]; then
    echo "_Keine Produkte gefunden._" >> "$DIGEST_FILE"
  else
    for product_id in $products; do
      if [[ ! -d "$ROOT_DIR/products/$product_id" ]]; then continue; fi

      local spec_count persona_count pipeline_status
      spec_count=$(count_specs "$product_id")
      persona_count=$(count_personas "$product_id")
      pipeline_status=$(get_pipeline_status "$product_id")

      # Determine overall health
      local health="🟢"
      if [[ "$spec_count" -lt 3 ]]; then health="🟡"; fi

      cat >> "$DIGEST_FILE" << PRODEOF

### $health $product_id

| Metrik | Wert |
|--------|------|
| Specs | $spec_count |
| Personas | $persona_count |
| Pipeline | $pipeline_status |

PRODEOF

      # Check if any specs reference todos
      local todo_count=0
      todo_count=$(grep -r "TODO\|PLACEHOLDER" "$ROOT_DIR/products/$product_id/" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
      if [[ "$todo_count" -gt 0 ]]; then
        echo "⚠️  **$todo_count offene TODOs in Specs**" >> "$DIGEST_FILE"
        echo "" >> "$DIGEST_FILE"
      fi

    done
  fi

  cat >> "$DIGEST_FILE" << MDEOF

---

## System Health

| Komponente | Status |
|------------|--------|
| Governance Files | $(ls "$ROOT_DIR/governance/"*.md 2>/dev/null | wc -l | tr -d ' ')/4 vorhanden |
| Meta-Agents | $(ls "$ROOT_DIR/agents/meta/"*.md 2>/dev/null | wc -l | tr -d ' ')/6 vorhanden |
| Specialized Agents | $(ls "$ROOT_DIR/agents/specialized/"*.md 2>/dev/null | wc -l | tr -d ' ')/4 vorhanden |
| Exploration Agents | $(ls "$ROOT_DIR/exploration/"*.md 2>/dev/null | wc -l | tr -d ' ')/5 vorhanden |
| Scripts | $(ls "$ROOT_DIR/scripts/"*.sh "$ROOT_DIR/scripts/"*.py 2>/dev/null | wc -l | tr -d ' ') vorhanden |

---

## Empfohlene Aktionen (priorisiert)

MDEOF

  # Generate recommendations
  local rec_count=0

  if [[ "$pending_decisions" -gt 0 ]]; then
    echo "$((++rec_count)). **[HUMAN REQUIRED]** $pending_decisions Entscheidung(en) in \`state/decisions-pending.yaml\` reviewen" >> "$DIGEST_FILE"
  fi

  for product_id in $products; do
    if [[ ! -d "$ROOT_DIR/products/$product_id" ]]; then continue; fi
    local spec_count
    spec_count=$(count_specs "$product_id")
    if [[ "$spec_count" -lt 3 ]]; then
      echo "$((++rec_count)). **[BATCH APPROVAL]** $product_id: Weitere Specs benötigt (aktuell: $spec_count)" >> "$DIGEST_FILE"
    fi
  done

  if [[ "$rec_count" -eq 0 ]]; then
    echo "_Keine Aktionen erforderlich. System läuft autonom._" >> "$DIGEST_FILE"
  fi

  cat >> "$DIGEST_FILE" << MDEOF

---

## Autonome Aktionen Seit Letztem Digest

_(Werden automatisch durch Agents protokolliert — hier Platzhalter bis Logging-Integration)_

- Dependency-Updates: Keine CVEs erkannt
- Code-Style Fixes: Keine automatischen Fixes
- Performance-Optimierungen: Keine

---

**Nächster Digest**: $(date -v+1d +"%Y-%m-%d" 2>/dev/null || date -d "tomorrow" +"%Y-%m-%d" 2>/dev/null || echo "morgen")
*Generiert von: AI-First Company Daily Digest System*
MDEOF

  echo -e "${GREEN}[OK]${NC}  Digest erstellt: $DIGEST_FILE"
}

# ─── GENERATE TXT DIGEST ───────────────────────────────────

generate_txt_digest() {
  local products
  products=$(collect_products)
  local pending_decisions
  pending_decisions=$(get_pending_decisions)

  {
    echo "=============================="
    echo " DAILY DIGEST — $DATE"
    echo "=============================="
    echo ""
    echo "AUSSTEHENDE ENTSCHEIDUNGEN: $pending_decisions"
    echo ""
    echo "PRODUKTE:"
    for product_id in $products; do
      if [[ ! -d "$ROOT_DIR/products/$product_id" ]]; then continue; fi
      local spec_count
      spec_count=$(count_specs "$product_id")
      local persona_count
      persona_count=$(count_personas "$product_id")
      echo "  [$product_id] Specs: $spec_count | Personas: $persona_count"
    done
    echo ""
    echo "Vollständiger Digest: $DIGEST_FILE"
  } | tee "$DIGEST_FILE"
}

# ─── MAIN ──────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}━━━ AI-First Company Daily Digest ━━━${NC}"
echo -e "${BLUE}Date:${NC} $DATE | ${BLUE}Format:${NC} $FORMAT"
echo ""

case "$FORMAT" in
  md)  generate_md_digest ;;
  txt) generate_txt_digest ;;
  *)
    echo "Unknown format: $FORMAT (use md or txt)"
    exit 1
    ;;
esac

echo ""
echo -e "${CYAN}Öffne Digest:${NC} open $DIGEST_FILE"
echo ""
