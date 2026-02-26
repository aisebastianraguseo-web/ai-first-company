# Quality Gates — Governance Layer

**Version**: 1.0 | **Status**: AKTIV | **Verbindlichkeit**: BLOCKING vor jedem Deployment

## ÜBERSICHT

Quality Gates sind automatisierte Prüfpunkte, die vor jedem Deployment durchlaufen werden müssen. Kein Code erreicht Production ohne GREEN auf allen Gates.

---

## GATE-ARCHITEKTUR

```
[Code Generated]
       ↓
[GATE 1: Security] ──── FAIL → Auto-Fix (minor) | HUMAN (critical)
       ↓ PASS
[GATE 2: Accessibility] ─ FAIL → Auto-Fix (minor) | Batch-Approval (moderate)
       ↓ PASS
[GATE 3: Code Quality] ── FAIL → Auto-Fix | Report
       ↓ PASS
[GATE 4: Spec Match] ──── FAIL → Re-generate (max 3x) | HUMAN
       ↓ PASS
[GATE 5: Performance] ─── FAIL → Optimize | Report
       ↓ ALL PASS
[DEPLOY]
```

---

## GATE 1: SECURITY (BLOCKING)

**Agent**: `agents/specialized/security-challenger.md`
**Blocking**: JA — kein Deployment bei CRITICAL oder HIGH

### Checks

| Check | Severity | Auto-Fix |
|-------|----------|----------|
| XSS via innerHTML mit User-Input | CRITICAL | Nein |
| eval() Verwendung | CRITICAL | Nein |
| Sensitive Data in Logs | HIGH | Nein |
| Fehlende Input-Validation | HIGH | Teilweise |
| Fehlende CSP-Header | HIGH | Ja |
| Unsichere Datei-Upload-Validierung | HIGH | Teilweise |
| Fehlende Security-Headers | MEDIUM | Ja |
| HTTP statt HTTPS (Links) | MEDIUM | Ja |
| Veraltete Dependencies (CVE) | Variable | Ja (kritisch) |
| console.log mit sensiblen Daten | MEDIUM | Ja |

### Schwellwerte
```yaml
security_gate:
  fail_on:
    - severity: CRITICAL
    - severity: HIGH
  warn_on:
    - severity: MEDIUM
  max_warnings: 5  # >5 → HUMAN REVIEW
  auto_fix_allowed:
    - CSP_HEADER_MISSING
    - SECURITY_HEADERS_MISSING
    - HTTP_LINK
    - CONSOLE_LOG_SENSITIVE  # Zeile entfernen
  retry_limit: 0  # Security fails: kein Auto-Retry
```

---

## GATE 2: ACCESSIBILITY (BLOCKING)

**Agent**: `agents/specialized/accessibility-challenger.md`
**Blocking**: JA — kein Deployment bei Critical oder Serious Violations

### Checks (WCAG 2.1 AA)

| Check | axe-core Level | Blocking |
|-------|---------------|---------|
| Bilder ohne Alt-Text | Critical | JA |
| Form-Inputs ohne Label | Critical | JA |
| Kontrastverhältnis <4.5:1 | Serious | JA |
| Fehlende ARIA-Rollen | Serious | JA |
| Tastatur-Fallen | Critical | JA |
| Fehlerhafte Heading-Hierarchie | Moderate | NEIN |
| Fehlende Skip-Links | Moderate | NEIN |
| Touch-Targets <44px | Moderate | NEIN |
| Fehlende lang-Attribute | Serious | JA |
| Focus nicht sichtbar | Serious | JA |

### Schwellwerte
```yaml
accessibility_gate:
  fail_on:
    - level: critical
    - level: serious
  warn_on:
    - level: moderate
    - level: minor
  max_warnings: 10
  auto_fix_allowed:
    - MISSING_LANG_ATTR
    - MISSING_ALT_TEXT  # Nur bei leeren alts für dekorative Bilder
    - MISSING_FORM_LABEL  # Nur wenn ID-For-Verbindung fehlt, Label vorhanden
  retry_limit: 3  # Bei minor issues: 3 Versuche
```

---

## GATE 3: CODE QUALITY (NON-BLOCKING für Minor)

**Agent**: `agents/specialized/quality-gate.md`
**Blocking**: NUR bei kritischen Strukturproblemen

### Checks

| Check | Severity | Blocking |
|-------|----------|---------|
| Syntax-Fehler (JS/CSS/HTML) | CRITICAL | JA |
| Undefined Variables | HIGH | JA |
| Infinite Loop Risiko | HIGH | JA |
| Fehlende Error-Handler für async | HIGH | JA |
| Globale Variablen | MEDIUM | NEIN |
| Funktionen >50 Zeilen | MEDIUM | NEIN |
| Dateien >500 Zeilen | LOW | NEIN |
| Fehlende Kommentare (komplexe Logik) | LOW | NEIN |
| console.log in Production Code | MEDIUM | NEIN |
| Magic Numbers ohne Konstante | LOW | NEIN |

```yaml
code_quality_gate:
  fail_on:
    - severity: CRITICAL
    - severity: HIGH
  warn_on:
    - severity: MEDIUM
    - severity: LOW
  max_warnings: 20
  auto_fix_allowed:
    - CONSOLE_LOG_PRODUCTION
    - MISSING_SEMICOLON
    - TRAILING_WHITESPACE
  retry_limit: 3
```

---

## GATE 4: SPEC COMPLIANCE (BLOCKING)

**Agent**: `agents/specialized/quality-gate.md` (Spec-Check Modul)
**Blocking**: JA

### Checks

| Check | Blocking |
|-------|---------|
| Alle MVP-Features implementiert | JA |
| Alle Acceptance Criteria erfüllt | JA |
| Kein Feature implementiert das NICHT in Spec ist | JA |
| UI entspricht beschriebener UX | NEIN (Warnung) |
| Copy/Texte entsprechen Spec | NEIN (Warnung) |

```yaml
spec_compliance_gate:
  required_features_check: true
  acceptance_criteria_check: true
  scope_creep_check: true  # Kein Code der nicht in Spec ist
  retry_limit: 3
  on_fail: HUMAN_REVIEW  # Spec unklar → Human entscheidet
```

---

## GATE 5: PERFORMANCE (NON-BLOCKING, aber reportiert)

**Agent**: `agents/specialized/performance-advisor.md`
**Blocking**: NUR bei extremen Verstößen (>10x schlechter als Threshold)

### Checks (Lighthouse-Äquivalent)

| Metric | Ziel | Warnung | Blocking |
|--------|------|---------|---------|
| First Contentful Paint | <1.5s | <2.5s | >5s |
| Largest Contentful Paint | <2.5s | <4.0s | >8s |
| Total Blocking Time | <200ms | <600ms | >2000ms |
| Cumulative Layout Shift | <0.1 | <0.25 | >0.5 |
| JS Bundle Größe | <100KB | <250KB | >500KB |
| CSS Größe | <50KB | <100KB | >200KB |
| Image ohne Optimierung | - | Warnung | Nein |

---

## SELF-HEALING REGELN

### Auto-Rollback
```yaml
auto_rollback:
  trigger: error_rate > 5% for 10min
  action: redeploy previous version
  notification: human (Digest)
  log: state/system-state.yaml
```

### Auto-Regenerate
```yaml
auto_regenerate:
  trigger: gate_fail AND severity IN [minor, warning]
  max_retries: 3
  strategy: regenerate_failing_component
  on_max_retries_exceeded: human_escalation
```

### Auto-Update (Dependencies)
```yaml
auto_update:
  trigger: CVE detected
  severity_map:
    CRITICAL: immediate (within 1h)
    HIGH: within 24h
    MEDIUM: next batch (weekly)
    LOW: monthly
  process:
    1. Update dependency
    2. Run all gates
    3. If all PASS: deploy
    4. If FAIL: human escalation
```

---

## GATE-REPORT FORMAT

Jeder Gate-Run erzeugt einen Report:

```yaml
gate_report:
  timestamp: "2024-02-15T14:30:00Z"
  product: expense-tracker
  version: "1.2.3"
  overall_status: PASS | FAIL | WARNING

  gates:
    security:
      status: PASS
      violations: []
      warnings: 2
      auto_fixes_applied: ["CSP_HEADER_ADDED"]

    accessibility:
      status: PASS
      violations: []
      warnings: 3
      wcag_level: AA

    code_quality:
      status: PASS
      violations: []
      warnings: 5

    spec_compliance:
      status: PASS
      missing_features: []
      extra_features: []

    performance:
      status: WARNING
      lcp: "2.8s"  # Über Ziel, unter Blocking
      fcp: "1.2s"
      tbt: "150ms"
      cls: 0.05

  actions_required: []
  next_deployment: allowed
```

---

## ESKALATIONS-PROTOKOLL

```
Gate FAIL (Critical/High)
        ↓
    Auto-Fix möglich?
   /              \
 JA               NEIN
  ↓                 ↓
Apply Fix      Retry möglich? (max 3)
  ↓           /           \
Re-run Gate  JA            NEIN
  ↓           ↓              ↓
PASS?      Regenerate    HUMAN REQUIRED
/    \     Component     (state/decisions-pending.yaml)
JA   NEIN
↓     ↓
DEPLOY  ↑ (Loop bis max retries)
```

---

## APPROVED GATE THRESHOLDS

Diese Thresholds gelten bis zur nächsten Human-Approval-Session:

```yaml
approved_thresholds:
  approved_by: human
  approved_date: "2024-02-15"
  valid_until: "2024-08-15"  # 6 Monate

  security: STRICT  # Keine Änderungen ohne Human Approval
  accessibility: WCAG_AA  # Keine Absenkung ohne Human Approval
  code_quality: STANDARD  # Batch-Approval für Threshold-Änderungen
  performance: ADVISORY  # Batch-Approval für Threshold-Änderungen
```
