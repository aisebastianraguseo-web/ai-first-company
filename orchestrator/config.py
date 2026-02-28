# orchestrator/config.py
"""Load and resolve pipeline.yaml configuration."""

from __future__ import annotations

import glob as _glob
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import yaml


class PipelineConfig:
    """Parsed and template-resolved pipeline.yaml."""

    def __init__(self, yaml_path: str = "pipeline.yaml", base_dir: str = "."):
        self.base_dir = Path(base_dir).resolve()
        self.yaml_path = self.base_dir / yaml_path
        self._raw: dict[str, Any] = {}
        self._load()

    # ── Loading ────────────────────────────────────────────────────────────

    def _load(self) -> None:
        with open(self.yaml_path) as f:
            self._raw = yaml.safe_load(f)

    # ── Template resolution ────────────────────────────────────────────────

    def resolve(self, product_id: str) -> dict[str, Any]:
        """Return a deep copy of the config with all template vars resolved."""
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        variables = {"product_id": product_id, "timestamp": timestamp}
        return self._resolve_node(self._raw, variables)

    def _resolve_node(self, node: Any, variables: dict[str, str]) -> Any:
        if isinstance(node, str):
            return self._resolve_str(node, variables)
        if isinstance(node, dict):
            return {k: self._resolve_node(v, variables) for k, v in node.items()}
        if isinstance(node, list):
            return [self._resolve_node(item, variables) for item in node]
        return node

    def _resolve_str(self, s: str, variables: dict[str, str]) -> str:
        def replacer(m: re.Match) -> str:
            key = m.group(1)
            return variables.get(key, m.group(0))
        return re.sub(r"\{(\w+)\}", replacer, s)

    # ── Accessors ──────────────────────────────────────────────────────────

    @property
    def default_model(self) -> str:
        return self._raw.get("default_model", "claude-opus-4-6")

    @property
    def default_max_tokens(self) -> int:
        return int(self._raw.get("default_max_tokens", 8192))

    def phases(self, product_id: str) -> list[dict[str, Any]]:
        resolved = self.resolve(product_id)
        return resolved.get("phases", [])

    def autonomy_contract(self) -> dict[str, Any]:
        return self._raw.get("autonomy_contract", {})

    def conflict_resolution(self) -> dict[str, Any]:
        return self._raw.get("conflict_resolution", {})

    # ── File helpers ───────────────────────────────────────────────────────

    def resolve_paths(self, paths: list[str], product_id: str) -> list[Path]:
        """Resolve template strings to absolute Paths; expand globs."""
        variables = {"product_id": product_id,
                     "timestamp": datetime.utcnow().strftime("%Y%m%d-%H%M%S")}
        result: list[Path] = []
        for p in paths:
            resolved = self._resolve_str(p, variables)
            if any(c in resolved for c in ("*", "?", "[")):
                matched = _glob.glob(str(self.base_dir / resolved), recursive=True)
                result.extend(Path(m) for m in sorted(matched))
            else:
                result.append(self.base_dir / resolved)
        return result

    def read_context_files(self, paths: list[str], product_id: str) -> str:
        """Return concatenated content of context files that exist.
        If a path is a directory, all .md and .yaml files within it are included."""
        parts: list[str] = []
        for p in self.resolve_paths(paths, product_id):
            if not p.exists():
                parts.append(f"=== {p.relative_to(self.base_dir)} === [FILE NOT FOUND]")
            elif p.is_dir():
                for child in sorted(p.rglob("*")):
                    if child.is_file() and child.suffix in (".md", ".yaml", ".yml", ".txt"):
                        parts.append(f"=== {child.relative_to(self.base_dir)} ===\n{child.read_text()}")
            else:
                parts.append(f"=== {p.relative_to(self.base_dir)} ===\n{p.read_text()}")
        return "\n\n".join(parts)

    def ensure_output_dirs(self, paths: list[str], product_id: str) -> None:
        """Create parent directories for all output file paths."""
        for p in self.resolve_paths(paths, product_id):
            p.parent.mkdir(parents=True, exist_ok=True)
