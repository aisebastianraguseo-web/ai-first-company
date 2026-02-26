#!/usr/bin/env python3
"""
resume-pipeline.py — AI-First Company Pipeline State Manager

Zweck:
  Verwaltet Pipeline-State über Sessions hinweg.
  Erlaubt das Fortsetzen unterbrochener Pipelines.
  Trackt welche Stages abgeschlossen sind.

Usage:
  python3 scripts/resume-pipeline.py --product <id>
  python3 scripts/resume-pipeline.py --product <id> --resume
  python3 scripts/resume-pipeline.py --product <id> --reset
  python3 scripts/resume-pipeline.py --list
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ─── CONFIG ────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent.parent
STATE_DIR = ROOT_DIR / "state"
PIPELINE_STATE_FILE = STATE_DIR / "pipeline-state.json"

STAGES = ["validate", "spec", "personas", "security", "a11y", "quality", "build"]

STAGE_DETAILS = {
    "validate": {
        "description": "Validiert Produkt-Config und Dependencies",
        "agent": None,
        "autonomy": "FULL",
    },
    "spec": {
        "description": "Prüft Spec-Vollständigkeit",
        "agent": "agents/meta/spec-writer.md",
        "autonomy": "FULL",
    },
    "personas": {
        "description": "Validiert Personas-Coverage",
        "agent": "agents/meta/persona-architect.md",
        "autonomy": "FULL",
    },
    "security": {
        "description": "Security Challenge (OWASP Top 10)",
        "agent": "agents/specialized/security-challenger.md",
        "autonomy": "FULL",
    },
    "a11y": {
        "description": "Accessibility Challenge (WCAG 2.1 AA)",
        "agent": "agents/specialized/accessibility-challenger.md",
        "autonomy": "FULL",
    },
    "quality": {
        "description": "Quality Gate (alle Metriken)",
        "agent": "agents/specialized/quality-gate.md",
        "autonomy": "BATCH",
    },
    "build": {
        "description": "Build & Deploy Readiness",
        "agent": None,
        "autonomy": "HUMAN",
    },
}

# ─── COLORS ────────────────────────────────────────────────
class Colors:
    RED     = "\033[0;31m"
    GREEN   = "\033[0;32m"
    YELLOW  = "\033[1;33m"
    BLUE    = "\033[0;34m"
    CYAN    = "\033[0;36m"
    BOLD    = "\033[1m"
    NC      = "\033[0m"

def cprint(color: str, msg: str) -> None:
    print(f"{color}{msg}{Colors.NC}")

# ─── STATE MANAGEMENT ──────────────────────────────────────

def load_state() -> dict:
    """Loads pipeline state from JSON file."""
    if not PIPELINE_STATE_FILE.exists():
        return {}
    with open(PIPELINE_STATE_FILE) as f:
        return json.load(f)

def save_state(state: dict) -> None:
    """Persists pipeline state to JSON file."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(PIPELINE_STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, default=str)

def get_product_state(product_id: str) -> dict:
    """Returns state for a specific product, initializing if needed."""
    state = load_state()
    if product_id not in state:
        state[product_id] = {
            "product_id": product_id,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "current_run": None,
            "runs": [],
        }
        save_state(state)
    return state[product_id]

def init_run(product_id: str) -> dict:
    """Initializes a new pipeline run."""
    state = load_state()
    run = {
        "run_id": f"run_{int(datetime.now().timestamp())}",
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "status": "in_progress",
        "stages": {stage: {"status": "pending", "started_at": None, "completed_at": None, "result": None}
                   for stage in STAGES},
    }

    if product_id not in state:
        state[product_id] = {
            "product_id": product_id,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "runs": [],
        }

    state[product_id]["current_run"] = run["run_id"]
    state[product_id]["runs"].append(run)
    state[product_id]["last_updated"] = datetime.now().isoformat()
    save_state(state)
    return run

def update_stage(product_id: str, run_id: str, stage: str, status: str, result: str = None) -> None:
    """Updates stage status in pipeline state."""
    state = load_state()
    product_state = state.get(product_id, {})
    runs = product_state.get("runs", [])

    for run in runs:
        if run["run_id"] == run_id:
            run["stages"][stage]["status"] = status
            if status == "running":
                run["stages"][stage]["started_at"] = datetime.now().isoformat()
            elif status in ("passed", "failed", "skipped"):
                run["stages"][stage]["completed_at"] = datetime.now().isoformat()
                run["stages"][stage]["result"] = result
            break

    state[product_id]["last_updated"] = datetime.now().isoformat()
    save_state(state)

def get_resume_point(product_id: str) -> tuple[str | None, str | None]:
    """
    Returns (run_id, stage) where pipeline should resume.
    Returns (None, None) if no resumable run found.
    """
    product_state = get_product_state(product_id)
    current_run_id = product_state.get("current_run")
    if not current_run_id:
        return None, None

    for run in reversed(product_state.get("runs", [])):
        if run["run_id"] == current_run_id and run["status"] == "in_progress":
            for stage in STAGES:
                if run["stages"][stage]["status"] in ("pending", "running"):
                    return current_run_id, stage
    return None, None

# ─── DISPLAY FUNCTIONS ─────────────────────────────────────

def print_pipeline_status(product_id: str) -> None:
    """Displays current pipeline state for a product."""
    product_state = get_product_state(product_id)
    current_run_id = product_state.get("current_run")

    print()
    cprint(Colors.BOLD + Colors.CYAN, f"━━━ Pipeline Status: {product_id} ━━━")
    print()

    if not product_state.get("runs"):
        cprint(Colors.YELLOW, "  Noch keine Pipeline-Runs für dieses Produkt.")
        print()
        return

    # Find current run
    current_run = None
    for run in product_state["runs"]:
        if run["run_id"] == current_run_id:
            current_run = run
            break

    if not current_run:
        cprint(Colors.YELLOW, "  Kein aktiver Run.")
        return

    print(f"  Run ID:    {current_run['run_id']}")
    print(f"  Gestartet: {current_run['started_at']}")
    print(f"  Status:    {current_run['status'].upper()}")
    print()

    status_icons = {
        "pending":  f"{Colors.BLUE}⬜{Colors.NC}",
        "running":  f"{Colors.YELLOW}🔄{Colors.NC}",
        "passed":   f"{Colors.GREEN}✅{Colors.NC}",
        "failed":   f"{Colors.RED}❌{Colors.NC}",
        "skipped":  f"{Colors.YELLOW}⏭️ {Colors.NC}",
    }

    print(f"  {'STAGE':<15} {'STATUS':<12} {'AGENT':<40} {'AUTONOMY'}")
    print(f"  {'─' * 80}")

    for stage in STAGES:
        stage_state = current_run["stages"][stage]
        icon = status_icons.get(stage_state["status"], "❓")
        agent = STAGE_DETAILS[stage].get("agent", "—") or "—"
        autonomy = STAGE_DETAILS[stage]["autonomy"]
        autonomy_color = {
            "FULL": Colors.GREEN,
            "BATCH": Colors.YELLOW,
            "HUMAN": Colors.RED,
        }.get(autonomy, Colors.NC)

        agent_short = agent.split("/")[-1] if "/" in agent else agent
        print(f"  {icon} {stage:<13} {stage_state['status']:<12} {agent_short:<40} "
              f"{autonomy_color}{autonomy}{Colors.NC}")

    print()

    # Show resume point
    _, resume_stage = get_resume_point(product_id)
    if resume_stage:
        cprint(Colors.CYAN, f"  → Resume point: {resume_stage}")
        print(f"    Run: python3 scripts/resume-pipeline.py --product {product_id} --resume")

    print()

def list_all_products() -> None:
    """Lists all products with their pipeline states."""
    state = load_state()
    if not state:
        cprint(Colors.YELLOW, "Keine Pipeline-States gefunden.")
        return

    print()
    cprint(Colors.BOLD + Colors.CYAN, "━━━ Alle Pipeline States ━━━")
    print()
    print(f"  {'PRODUKT':<25} {'STATUS':<15} {'LETZTER RUN'}")
    print(f"  {'─' * 70}")

    for product_id, product_state in state.items():
        runs = product_state.get("runs", [])
        if runs:
            last_run = runs[-1]
            status = last_run["status"]
            started = last_run["started_at"][:16] if last_run["started_at"] else "—"
        else:
            status = "no runs"
            started = "—"

        status_color = {
            "in_progress": Colors.YELLOW,
            "completed": Colors.GREEN,
            "failed": Colors.RED,
        }.get(status, Colors.BLUE)

        print(f"  {product_id:<25} {status_color}{status:<15}{Colors.NC} {started}")

    print()

# ─── MAIN ──────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI-First Company Pipeline State Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--product", help="Product ID")
    parser.add_argument("--resume", action="store_true", help="Resume interrupted pipeline")
    parser.add_argument("--reset", action="store_true", help="Reset pipeline state for product")
    parser.add_argument("--init", action="store_true", help="Initialize new pipeline run")
    parser.add_argument("--list", action="store_true", help="List all pipeline states")
    parser.add_argument("--stage-pass", metavar="STAGE", help="Mark stage as passed")
    parser.add_argument("--stage-fail", metavar="STAGE", help="Mark stage as failed")
    parser.add_argument("--run-id", help="Run ID for stage updates")
    args = parser.parse_args()

    if args.list:
        list_all_products()
        return

    if not args.product:
        parser.print_help()
        sys.exit(1)

    product_id = args.product
    product_dir = ROOT_DIR / "products" / product_id

    if not product_dir.exists():
        cprint(Colors.RED, f"[ERROR] Produkt '{product_id}' nicht gefunden: {product_dir}")
        cprint(Colors.BLUE, f"[INFO]  Erstelle mit: ./scripts/bootstrap-product.sh {product_id}")
        sys.exit(1)

    if args.reset:
        state = load_state()
        if product_id in state:
            del state[product_id]
            save_state(state)
            cprint(Colors.GREEN, f"[OK] Pipeline-State für '{product_id}' zurückgesetzt.")
        else:
            cprint(Colors.YELLOW, f"[INFO] Kein State für '{product_id}' gefunden.")
        return

    if args.init:
        run = init_run(product_id)
        cprint(Colors.GREEN, f"[OK] Neuer Run initialisiert: {run['run_id']}")
        print_pipeline_status(product_id)
        return

    if args.stage_pass and args.run_id:
        update_stage(product_id, args.run_id, args.stage_pass, "passed")
        cprint(Colors.GREEN, f"[OK] Stage '{args.stage_pass}' als PASSED markiert.")
        return

    if args.stage_fail and args.run_id:
        update_stage(product_id, args.run_id, args.stage_fail, "failed")
        cprint(Colors.RED, f"[FAIL] Stage '{args.stage_fail}' als FAILED markiert.")
        return

    if args.resume:
        run_id, resume_stage = get_resume_point(product_id)
        if not run_id:
            cprint(Colors.YELLOW, f"[INFO] Kein resumbarer Run für '{product_id}' gefunden.")
            cprint(Colors.BLUE,   f"[INFO] Starte neuen Run: ./scripts/run-pipeline.sh {product_id}")
        else:
            cprint(Colors.CYAN, f"[RESUME] Setze fort bei Stage: {resume_stage}")
            cprint(Colors.BLUE, f"[CMD]    ./scripts/run-pipeline.sh {product_id} --stage {resume_stage}")
        return

    # Default: show status
    print_pipeline_status(product_id)


if __name__ == "__main__":
    main()
