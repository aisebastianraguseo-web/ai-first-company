#!/usr/bin/env bash
# ============================================================
# run-pipeline.sh — AI-First Company Pipeline Runner
# Führt die vollständige Agent-Pipeline für ein Produkt aus
# Usage: ./scripts/run-pipeline.sh <product-id> [--stage <stage>]
# ============================================================

set -euo pipefail

# ─── CONFIG ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/state/logs"
STATE_FILE="$ROOT_DIR/state/system-state.yaml"
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")

# ─── COLORS ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── HELPERS ───────────────────────────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC}  $1"; }
log_stage()   { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

usage() {
  echo ""
  echo "Usage: $0 <product-id> [OPTIONS]"
  echo ""
  echo "OPTIONS:"
  echo "  --stage <name>    Run only specific stage (validate|spec|personas|security|a11y|quality|build)"
  echo "  --skip-gates      Skip quality gate checks (NOT RECOMMENDED)"
  echo "  --dry-run         Show what would run without executing"
  echo "  --verbose         Enable verbose output"
  echo "  --help            Show this help"
  echo ""
  echo "STAGES:"
  echo "  1. validate       Validate product config and dependencies"
  echo "  2. spec           Check spec completeness"
  echo "  3. personas       Validate personas coverage"
  echo "  4. security       Run security challenger"
  echo "  5. a11y           Run accessibility challenger"
  echo "  6. quality        Run quality gate"
  echo "  7. build          Build and deploy (if all gates GREEN)"
  echo ""
  exit 1
}

# ─── ARGS PARSING ──────────────────────────────────────────
PRODUCT_ID=""
SPECIFIC_STAGE=""
SKIP_GATES=false
DRY_RUN=false
VERBOSE=false

if [[ $# -eq 0 ]]; then usage; fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stage)    SPECIFIC_STAGE="$2"; shift 2 ;;
    --skip-gates) SKIP_GATES=true; shift ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --verbose)  VERBOSE=true; shift ;;
    --help)     usage ;;
    -*)         log_error "Unknown option: $1"; usage ;;
    *)          PRODUCT_ID="$1"; shift ;;
  esac
done

if [[ -z "$PRODUCT_ID" ]]; then
  log_error "Missing product-id"
  usage
fi

PRODUCT_DIR="$ROOT_DIR/products/$PRODUCT_ID"
LOG_FILE="$LOG_DIR/${PRODUCT_ID}_pipeline_$(date +%Y%m%d_%H%M%S).log"

# ─── VALIDATION ────────────────────────────────────────────
if [[ ! -d "$PRODUCT_DIR" ]]; then
  log_error "Product '$PRODUCT_ID' not found at $PRODUCT_DIR"
  log_info "Run: ./scripts/bootstrap-product.sh $PRODUCT_ID first"
  exit 1
fi

mkdir -p "$LOG_DIR"

if [[ "$SKIP_GATES" == "true" ]]; then
  log_warn "⚠️  SKIP-GATES aktiviert — Gates werden NICHT geprüft!"
  log_warn "    Dies verletzt die Governance-Policy. Nur für Notfälle."
  read -p "Bestätige mit 'SKIP': " confirm
  if [[ "$confirm" != "SKIP" ]]; then
    log_info "Abgebrochen."
    exit 0
  fi
fi

# ─── PIPELINE FUNCTIONS ────────────────────────────────────

stage_validate() {
  log_stage "STAGE 1: VALIDATE"

  local errors=0

  # Check config.yaml
  if [[ -f "$PRODUCT_DIR/config.yaml" ]]; then
    log_success "config.yaml vorhanden"
  else
    log_error "config.yaml fehlt!"
    ((errors++))
  fi

  # Check specs
  local spec_count
  spec_count=$(find "$PRODUCT_DIR/specs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$spec_count" -gt 0 ]]; then
    log_success "$spec_count Spec(s) gefunden"
  else
    log_error "Keine Specs gefunden! Erstelle Specs in products/$PRODUCT_ID/specs/"
    ((errors++))
  fi

  # Check personas
  if [[ -f "$PRODUCT_DIR/personas/variables.yaml" ]]; then
    log_success "Personas vorhanden"
  else
    log_warn "personas/variables.yaml fehlt — Personas sollten definiert sein"
  fi

  # Check governance
  for gfile in code-standards security-policy accessibility-policy quality-gates; do
    if [[ -f "$ROOT_DIR/governance/$gfile.md" ]]; then
      log_success "Governance: $gfile.md"
    else
      log_error "Governance fehlt: $gfile.md"
      ((errors++))
    fi
  done

  if [[ $errors -gt 0 ]]; then
    log_error "Validate FAILED: $errors Fehler"
    return 1
  fi

  log_success "Validate PASSED"
  return 0
}

stage_spec() {
  log_stage "STAGE 2: SPEC CHECK"

  local missing=()

  # Required specs
  for spec in product-vision mvp-scope; do
    if [[ -f "$PRODUCT_DIR/specs/$spec.md" ]]; then
      log_success "Spec: $spec.md"
    else
      log_warn "Spec fehlt: $spec.md"
      missing+=("$spec")
    fi
  done

  # Check for TODO/placeholder content
  local todo_count
  todo_count=$(grep -r "TODO\|PLACEHOLDER\|\.\.\." "$PRODUCT_DIR/specs/" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$todo_count" -gt 0 ]]; then
    log_warn "$todo_count TODO/Placeholder in Specs gefunden — bitte vervollständigen"
  else
    log_success "Keine Placeholders in Specs"
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_warn "Spec-Check YELLOW: ${missing[*]} fehlen"
    return 2  # YELLOW = nicht blockierend
  fi

  log_success "Spec-Check PASSED"
  return 0
}

stage_personas() {
  log_stage "STAGE 3: PERSONAS VALIDATION"

  if [[ ! -f "$PRODUCT_DIR/personas/variables.yaml" ]]; then
    log_warn "Keine Personas definiert — Empfehlung: min. 3 Personas"
    return 2  # YELLOW
  fi

  local persona_count
  persona_count=$(grep -c "^  - name:" "$PRODUCT_DIR/personas/variables.yaml" 2>/dev/null || echo "0")

  if [[ "$persona_count" -ge 3 ]]; then
    log_success "$persona_count Personas definiert"
  else
    log_warn "Nur $persona_count Persona(s) — empfohlen sind min. 3"
  fi

  # Check for adversarial persona
  if grep -qi "hacker\|adversarial\|angreifer" "$PRODUCT_DIR/personas/variables.yaml" 2>/dev/null; then
    log_success "Adversarial Persona vorhanden (Security-Testing)"
  else
    log_warn "Keine adversarielle Persona — Security-Testing Coverage ggf. unvollständig"
  fi

  log_success "Personas PASSED"
  return 0
}

stage_security() {
  log_stage "STAGE 4: SECURITY CHALLENGE"

  log_info "Lade Security Challenger..."
  log_info "Agent: agents/specialized/security-challenger.md"

  # In einem echten System würde hier der Security-Challenger-Agent aufgerufen
  # Für die lokale Ausführung: Führe grundlegende Security-Checks durch

  local issues=()

  # Check for hardcoded secrets pattern
  if grep -r "password\s*=\s*['\"][^'\"]*['\"]" "$PRODUCT_DIR" 2>/dev/null | grep -v ".yaml" | grep -q .; then
    issues+=("Potenzielle hartcodierte Passwörter gefunden!")
  fi

  # Check for http:// (non-TLS)
  if grep -r "http://" "$PRODUCT_DIR/specs/" 2>/dev/null | grep -v "localhost\|127.0.0.1\|example" | grep -q .; then
    log_warn "HTTP URLs in Specs gefunden — statt HTTPS?"
  fi

  if [[ ${#issues[@]} -gt 0 ]]; then
    for issue in "${issues[@]}"; do
      log_error "SECURITY: $issue"
    done
    log_error "Security Gate: RED — Deploy gesperrt"
    return 1
  fi

  log_success "Security Gate: GREEN"
  return 0
}

stage_a11y() {
  log_stage "STAGE 5: ACCESSIBILITY CHALLENGE"

  log_info "Lade Accessibility Challenger..."
  log_info "Agent: agents/specialized/accessibility-challenger.md"
  log_info "Standard: WCAG 2.1 AA"

  # Check if specs mention accessibility
  local a11y_mentions
  a11y_mentions=$(grep -ri "wcag\|aria\|accessibility\|screen.reader\|keyboard\|contrast" "$PRODUCT_DIR/specs/" 2>/dev/null | wc -l | tr -d ' ')

  if [[ "$a11y_mentions" -gt 0 ]]; then
    log_success "A11y-Anforderungen in Specs erwähnt ($a11y_mentions Referenzen)"
  else
    log_warn "Keine A11y-Anforderungen in Specs — WCAG 2.1 AA muss implementiert werden"
  fi

  log_success "A11y Gate: GREEN (Specs-Phase)"
  return 0
}

stage_quality() {
  log_stage "STAGE 6: QUALITY GATE"

  log_info "Lade Quality Gate..."
  log_info "Agent: agents/specialized/quality-gate.md"

  local gate_status="GREEN"

  # Check spec completeness
  local total_specs
  total_specs=$(find "$PRODUCT_DIR/specs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

  if [[ "$total_specs" -ge 3 ]]; then
    log_success "Spec Coverage: $total_specs Specs vorhanden"
  else
    log_warn "Spec Coverage: Nur $total_specs Spec(s) — empfohlen sind min. 3"
    gate_status="YELLOW"
  fi

  # Check decision log
  if [[ -f "$ROOT_DIR/state/decisions-pending.yaml" ]]; then
    local pending
    pending=$(grep -c "status: pending" "$ROOT_DIR/state/decisions-pending.yaml" 2>/dev/null || echo "0")
    if [[ "$pending" -gt 0 ]]; then
      log_warn "$pending ausstehende Entscheidungen in decisions-pending.yaml"
    else
      log_success "Keine ausstehenden Entscheidungen"
    fi
  fi

  case "$gate_status" in
    GREEN)  log_success "Quality Gate: GREEN — Alle Checks bestanden" ;;
    YELLOW) log_warn    "Quality Gate: YELLOW — Minor issues, Deploy möglich" ;;
    RED)    log_error   "Quality Gate: RED — Deploy gesperrt"; return 1 ;;
  esac

  return 0
}

stage_build() {
  log_stage "STAGE 7: BUILD & DEPLOY READY"

  log_success "Alle Gates bestanden!"
  log_info ""
  log_info "Pipeline Summary:"
  log_info "  Produkt:   $PRODUCT_ID"
  log_info "  Timestamp: $TIMESTAMP"
  log_info "  Status:    READY FOR DEPLOYMENT"
  log_info ""
  log_info "Nächste Schritte:"
  log_info "  1. Implementierung starten (Specs vorhanden)"
  log_info "  2. Dev-Server starten"
  log_info "  3. Nach Build: Quality Gate erneut ausführen"
  log_info "  4. Deploy-Approval (wenn Human Required)"

  # Update state
  if [[ -f "$STATE_FILE" ]]; then
    # Simple append - in prod würde man yq oder python nutzen
    echo "  # Pipeline run: $TIMESTAMP for $PRODUCT_ID - ALL GATES GREEN" >> "$STATE_FILE"
  fi

  log_success "Build Stage: GREEN"
  return 0
}

# ─── MAIN PIPELINE ─────────────────────────────────────────

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║      AI-First Company Pipeline Runner         ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
log_info "Produkt:   $PRODUCT_ID"
log_info "Timestamp: $TIMESTAMP"
log_info "Dry Run:   $DRY_RUN"
[[ -n "$SPECIFIC_STAGE" ]] && log_info "Stage:     $SPECIFIC_STAGE (only)"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "DRY RUN — Keine Aktionen werden ausgeführt"
  echo ""
  echo "  Would run stages:"
  echo "  1. validate"
  echo "  2. spec"
  echo "  3. personas"
  echo "  4. security"
  echo "  5. a11y"
  echo "  6. quality"
  echo "  7. build"
  exit 0
fi

PIPELINE_STATUS=0
FAILED_STAGE=""

run_stage() {
  local name="$1"
  local fn="$2"

  if [[ -n "$SPECIFIC_STAGE" && "$SPECIFIC_STAGE" != "$name" ]]; then
    return 0
  fi

  if ! $fn 2>&1 | tee -a "$LOG_FILE"; then
    PIPELINE_STATUS=1
    FAILED_STAGE="$name"
    return 1
  fi
  return 0
}

run_stage "validate"  stage_validate  || { log_error "Pipeline abgebrochen bei: validate"; exit 1; }
run_stage "spec"      stage_spec      || log_warn "Spec warnings (non-blocking)"
run_stage "personas"  stage_personas  || log_warn "Persona warnings (non-blocking)"
run_stage "security"  stage_security  || { log_error "Pipeline abgebrochen bei: security"; exit 1; }
run_stage "a11y"      stage_a11y      || log_warn "A11y warnings (non-blocking)"
run_stage "quality"   stage_quality   || { log_error "Pipeline abgebrochen bei: quality"; exit 1; }
run_stage "build"     stage_build

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║           PIPELINE: SUCCESS ✓                 ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
log_info "Log gespeichert: $LOG_FILE"
echo ""
