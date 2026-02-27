#!/usr/bin/env bash
# ============================================================
# list-products.sh — Produkt-Backlog anzeigen
#
# Liest alle intake/*.yaml (außer _template.yaml) und zeigt
# Status, ID und Name in einer formatierten Tabelle.
#
# Usage:
#   bash scripts/list-products.sh
#   bash scripts/list-products.sh --status ready
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INTAKE_DIR="$ROOT_DIR/intake"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

FILTER_STATUS="${2:-}"
[[ "${1:-}" == "--status" ]] && FILTER_STATUS="${2:-}"

# Status → Farbe + Symbol
status_format() {
  case "$1" in
    idea)        echo -e "${GRAY}◦ idea      ${NC}" ;;
    ready)       echo -e "${CYAN}● ready     ${NC}" ;;
    building)    echo -e "${YELLOW}⚙ building  ${NC}" ;;
    done)        echo -e "${GREEN}✓ done      ${NC}" ;;
    archived)    echo -e "${GRAY}✗ archived  ${NC}" ;;
    *)           echo -e "${GRAY}? unknown   ${NC}" ;;
  esac
}

if [[ ! -d "$INTAKE_DIR" ]]; then
  echo -e "${RED}Fehler: intake/ Verzeichnis nicht gefunden${NC}"
  exit 1
fi

FILES=("$INTAKE_DIR"/*.yaml)
PRODUCT_FILES=()
for f in "${FILES[@]}"; do
  [[ "$(basename "$f")" == _* ]] && continue   # _template.yaml etc. überspringen
  [[ -f "$f" ]] && PRODUCT_FILES+=("$f")
done

if [[ ${#PRODUCT_FILES[@]} -eq 0 ]]; then
  echo -e "${YELLOW}Keine Produkte im Backlog. Erstelle intake/<name>.yaml aus intake/_template.yaml${NC}"
  exit 0
fi

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   AI-First Company — Produkt-Backlog${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
printf "  ${BOLD}%-14s %-22s %-30s${NC}\n" "STATUS" "ID" "NAME"
echo -e "  ${GRAY}──────────────────────────────────────────────────────${NC}"

COUNT=0
for FILE in "${PRODUCT_FILES[@]}"; do
  PRODUCT_ID=$(python3 -c "
import re
content = open('$FILE').read()
m = re.search(r'^\s*id:\s*[\"\']([\w-]+)', content, re.MULTILINE)
print(m.group(1) if m else '?')
" 2>/dev/null || echo "?")

  PRODUCT_NAME=$(python3 -c "
import re
content = open('$FILE').read()
m = re.search(r'^\s*name:\s*[\"\'](.*?)[\"\']\s*(?:#.*)?$', content, re.MULTILINE)
print(m.group(1).strip() if m else '?')
" 2>/dev/null || echo "?")

  PRODUCT_STATUS=$(python3 -c "
import re
content = open('$FILE').read()
m = re.search(r'^\s*status:\s*[\"\']([\w-]+)', content, re.MULTILINE)
print(m.group(1) if m else 'unknown')
" 2>/dev/null || echo "unknown")

  # Filter anwenden
  if [[ -n "$FILTER_STATUS" && "$PRODUCT_STATUS" != "$FILTER_STATUS" ]]; then
    continue
  fi

  STATUS_FMT=$(status_format "$PRODUCT_STATUS")
  printf "  %b%-22s %-30s\n" "$STATUS_FMT" "$PRODUCT_ID" "$PRODUCT_NAME"
  COUNT=$((COUNT + 1))
done

echo ""
echo -e "  ${GRAY}$COUNT Produkt(e)${NC}"
if [[ -n "$FILTER_STATUS" ]]; then
  echo -e "  ${GRAY}Filter: status=$FILTER_STATUS${NC}"
fi
echo ""
echo -e "${BOLD}Legende:${NC}"
echo -e "  ${GRAY}◦ idea${NC}      — Rohidee, noch nicht bereit"
echo -e "  ${CYAN}● ready${NC}     — Ausgefüllt, bereit zum Build"
echo -e "  ${YELLOW}⚙ building${NC}  — Orchestrator läuft gerade"
echo -e "  ${GREEN}✓ done${NC}      — MVP deployed"
echo -e "  ${GRAY}✗ archived${NC}  — Verworfen"
echo ""
echo -e "${BOLD}Build starten:${NC}"
echo -e "  bash scripts/build-product.sh intake/<id>.yaml"
echo ""
