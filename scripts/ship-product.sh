#!/usr/bin/env bash
# ============================================================
# ship-product.sh — Produkt in eigenes GitHub Repo deployen
#
# Nimmt den fertigen app/-Ordner eines Produkts und:
#   1. Erstellt ein dediziertes GitHub Repo (<org>/<product-id>)
#   2. Initialisiert Git im app/-Ordner (via Temp-Dir)
#   3. Pusht den Code ins neue Repo
#   4. Setzt intake/<id>.yaml Status auf "done"
#   5. Gibt die Repo-URL und nächste Deploy-Schritte aus
#
# Voraussetzungen:
#   - gh CLI installiert + authentifiziert (gh auth status)
#   - ANTHROPIC_API_KEY gesetzt (für spätere Workflows)
#   - products/<id>/app/ existiert mit gebautem Code
#
# Usage:
#   bash scripts/ship-product.sh <product-id>
#   bash scripts/ship-product.sh ki-radar
#   bash scripts/ship-product.sh ki-radar --dry-run
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

PRODUCT_ID="${1:-}"
DRY_RUN=false
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=true

# ── Validierung ───────────────────────────────────────────

if [[ -z "$PRODUCT_ID" ]]; then
  echo -e "${RED}Fehler: Product-ID erforderlich${NC}"
  echo "Usage: bash scripts/ship-product.sh <product-id>"
  echo "       bash scripts/ship-product.sh ki-radar"
  echo ""
  echo "Verfügbare Produkte:"
  bash "$SCRIPT_DIR/list-products.sh" 2>/dev/null || true
  exit 1
fi

APP_DIR="$ROOT_DIR/products/$PRODUCT_ID/app"
INTAKE_FILE="$ROOT_DIR/intake/$PRODUCT_ID.yaml"

if [[ ! -d "$APP_DIR" ]]; then
  echo -e "${RED}Fehler: app/-Ordner nicht gefunden: $APP_DIR${NC}"
  echo "Stelle sicher dass der Orchestrator Phase 3 (Code generieren) abgeschlossen hat."
  exit 1
fi

if [[ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
  echo -e "${RED}Fehler: app/-Ordner ist leer: $APP_DIR${NC}"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo -e "${RED}Fehler: gh CLI nicht gefunden${NC}"
  echo "Installieren: brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo -e "${RED}Fehler: gh CLI nicht authentifiziert${NC}"
  echo "Ausführen: gh auth login"
  exit 1
fi

# ── GitHub Org aus Remote-URL extrahieren ─────────────────

REMOTE_URL=$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || echo "")
GH_ORG=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')

if [[ -z "$GH_ORG" ]]; then
  echo -e "${RED}Fehler: GitHub Org konnte nicht aus Remote-URL ermittelt werden${NC}"
  echo "Remote URL: $REMOTE_URL"
  exit 1
fi

PRODUCT_REPO="${GH_ORG}/${PRODUCT_ID}"
REPO_URL="https://github.com/${PRODUCT_REPO}"

# ── Produktname aus intake YAML lesen ─────────────────────

PRODUCT_NAME="$PRODUCT_ID"
if [[ -f "$INTAKE_FILE" ]]; then
  PRODUCT_NAME=$(python3 -c "
import re
content = open('$INTAKE_FILE').read()
m = re.search(r'^\s*name:\s*[\"\'](.*?)[\"\']\s*(?:#.*)?$', content, re.MULTILINE)
print(m.group(1).strip() if m else '$PRODUCT_ID')
" 2>/dev/null || echo "$PRODUCT_ID")
fi

# ── Header ────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}   AI-First Company — Ship Product${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Produkt:${NC}  $PRODUCT_NAME ($PRODUCT_ID)"
echo -e "  ${BLUE}App-Dir:${NC}  $APP_DIR"
echo -e "  ${BLUE}Ziel-Repo:${NC} $REPO_URL"
[[ "$DRY_RUN" == true ]] && echo -e "  ${YELLOW}Modus:    DRY RUN (keine Aktionen werden ausgeführt)${NC}"
echo ""

# Prüfen ob Repo schon existiert
REPO_EXISTS=false
if gh repo view "$PRODUCT_REPO" &>/dev/null; then
  REPO_EXISTS=true
  echo -e "${YELLOW}Repo existiert bereits: $REPO_URL${NC}"
  read -rp "   Trotzdem pushen (überschreibt main)? (j/N): " confirm
  if [[ "$confirm" != "j" && "$confirm" != "J" ]]; then
    echo "Abgebrochen."
    exit 0
  fi
fi

# ── Schritt 1: GitHub Repo erstellen ─────────────────────

echo -e "${BLUE}[1/4]${NC} GitHub Repo erstellen..."

if [[ "$DRY_RUN" == false ]]; then
  if [[ "$REPO_EXISTS" == false ]]; then
    gh repo create "$PRODUCT_REPO" \
      --public \
      --description "$PRODUCT_NAME — gebaut mit AI-First Company Orchestrator" \
      --homepage "$REPO_URL" \
      2>&1 | sed 's/^/  /'
    echo -e "${GREEN}  ✓ Repo erstellt: $REPO_URL${NC}"
  else
    echo -e "${YELLOW}  → Repo bereits vorhanden, überspringe Erstellung${NC}"
  fi
else
  echo -e "${YELLOW}  [DRY] gh repo create $PRODUCT_REPO --public${NC}"
fi

# ── Schritt 2: App-Code in Temp-Dir vorbereiten ───────────

echo -e "${BLUE}[2/4]${NC} App-Code für Git vorbereiten..."

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

if [[ "$DRY_RUN" == false ]]; then
  cp -r "$APP_DIR/." "$TEMP_DIR/"

  # .gitignore für Produkt-Repo erstellen falls nicht vorhanden
  if [[ ! -f "$TEMP_DIR/.gitignore" ]]; then
    cat > "$TEMP_DIR/.gitignore" << 'GITIGNORE'
.DS_Store
.env
.env.*
node_modules/
.vercel
*.local
GITIGNORE
    echo -e "${GREEN}  ✓ .gitignore erstellt${NC}"
  fi

  # README.md erstellen falls nicht vorhanden
  if [[ ! -f "$TEMP_DIR/README.md" ]]; then
    cat > "$TEMP_DIR/README.md" << READMEEOF
# $PRODUCT_NAME

Gebaut mit dem [AI-First Company](https://github.com/${GH_ORG}/ai-first-company) Orchestrator.

## Deploy

Dieses Repository ist mit Vercel verbunden.
Jeder Push auf \`main\` triggert ein automatisches Deployment.
READMEEOF
    echo -e "${GREEN}  ✓ README.md erstellt${NC}"
  fi

  echo -e "${GREEN}  ✓ $(ls "$TEMP_DIR" | wc -l | tr -d ' ') Dateien vorbereitet${NC}"
else
  echo -e "${YELLOW}  [DRY] Würde $APP_DIR → temp-dir kopieren${NC}"
fi

# ── Schritt 3: Git init + push ────────────────────────────

echo -e "${BLUE}[3/4]${NC} Code nach GitHub pushen..."

if [[ "$DRY_RUN" == false ]]; then
  cd "$TEMP_DIR"
  git init -q
  git checkout -b main
  git add .
  git commit -q -m "feat: initial ship — $PRODUCT_NAME

Built autonomously by AI-First Company Orchestrator.
Source: https://github.com/${GH_ORG}/ai-first-company/tree/master/products/$PRODUCT_ID"

  git remote add origin "https://github.com/${PRODUCT_REPO}.git"
  git push --force origin main 2>&1 | sed 's/^/  /'
  cd "$ROOT_DIR"
  echo -e "${GREEN}  ✓ Code gepusht: $REPO_URL${NC}"
else
  echo -e "${YELLOW}  [DRY] git init + push → $REPO_URL${NC}"
fi

# ── Schritt 4: Status updaten ─────────────────────────────

echo -e "${BLUE}[4/4]${NC} Status aktualisieren..."

if [[ "$DRY_RUN" == false ]]; then
  # intake YAML: status → done
  if [[ -f "$INTAKE_FILE" ]]; then
    python3 -c "
import re, sys
content = open('$INTAKE_FILE').read()
content = re.sub(r'(^\s*status:\s*)[\"\']([\w-]+)[\"\'](.*)', r\"\1'done'\3\", content, flags=re.MULTILINE)
open('$INTAKE_FILE', 'w').write(content)
print('  ✓ intake/$PRODUCT_ID.yaml → status: done')
"
  fi

  # system-state.yaml updaten
  python3 - "$ROOT_DIR/state/system-state.yaml" "$PRODUCT_ID" "$REPO_URL" << 'PYEOF'
import sys, re
from datetime import date

state_file  = sys.argv[1]
product_id  = sys.argv[2]
repo_url    = sys.argv[3]
today       = date.today().isoformat()

content = open(state_file).read()
if f"  {product_id}:" in content:
    content = re.sub(
        rf'(\n  {product_id}:.*?)(next_action:.*?)(\n  \w|\nmetrics|\Z)',
        rf'\1status: done\n    shipped_at: "{today}"\n    repo: "{repo_url}"\n    next_action: "connect Vercel to {repo_url}"\3',
        content, flags=re.DOTALL
    )
    open(state_file, 'w').write(content)
PYEOF
  echo -e "${GREEN}  ✓ state/system-state.yaml aktualisiert${NC}"
else
  echo -e "${YELLOW}  [DRY] Würde intake/$PRODUCT_ID.yaml und system-state.yaml updaten${NC}"
fi

# ── Fertig ────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}   Shipped! ✓${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Repo:${NC} $REPO_URL"
echo ""
echo -e "${BOLD}Nächste Schritte — Vercel Deployment:${NC}"
echo ""
echo -e "  ${CYAN}Option A — Vercel CLI (einmalig):${NC}"
echo "    cd $APP_DIR"
echo "    npx vercel --prod"
echo ""
echo -e "  ${CYAN}Option B — Vercel Dashboard (empfohlen):${NC}"
echo "    1. vercel.com/new → Repo importieren: $PRODUCT_REPO"
echo "    2. Deploy klicken — fertig"
echo ""
echo -e "  ${CYAN}Option C — GitHub Actions (für CI/CD):${NC}"
echo "    VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
echo "    als Secrets in $REPO_URL/settings/secrets/actions setzen"
echo ""
echo -e "${GRAY}Backlog-Status prüfen: bash scripts/list-products.sh${NC}"
echo ""
