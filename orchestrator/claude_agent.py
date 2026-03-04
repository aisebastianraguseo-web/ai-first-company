# orchestrator/claude_agent.py
"""AsyncAnthropic wrapper — calls Claude, streams response, parses multi-file output."""

from __future__ import annotations

import asyncio
import re
import time
from pathlib import Path
from typing import Any, Optional

import anthropic

from .config import PipelineConfig
from .models import AgentResult
from .rate_limit import RateLimitHandler, PipelinePausedError

# Pattern for multi-file output:
#   --- FILE: path/to/file.ext ---
#   <content>
#   --- END FILE ---
_FILE_BLOCK = re.compile(
    r"---\s*FILE:\s*(.+?)\s*---\n(.*?)---\s*END FILE\s*---",
    re.DOTALL | re.IGNORECASE,
)

# Raw output below this threshold is treated as effectively empty
_MIN_NONEMPTY_BYTES = 50


class ClaudeAgent:
    """Wraps the Anthropic async client to execute a single agent turn."""

    def __init__(
        self,
        config: PipelineConfig,
        verbose: bool = False,
        semaphore: Optional[asyncio.Semaphore] = None,
    ):
        self.config = config
        self.verbose = verbose
        self.client = anthropic.AsyncAnthropic()
        self.rate_limit_handler = RateLimitHandler(verbose=verbose)
        # Shared semaphore limits concurrent API calls across parallel pipelines.
        # None → no limit (single-product mode).
        self._semaphore = semaphore

    # ── Public API ─────────────────────────────────────────────────────────

    async def run(
        self,
        agent_cfg: dict[str, Any],
        product_id: str,
        attempt: int = 1,
        extra_context: str = "",
    ) -> AgentResult:
        """Execute one agent call and return an AgentResult."""
        agent_id: str = agent_cfg["id"]
        start = time.monotonic()

        try:
            system_prompt = self._build_system(agent_cfg)
            user_message = self._build_user(agent_cfg, product_id, extra_context)

            if self.verbose:
                strategy = agent_cfg.get("thinking_strategy", "disabled")
                print(f"  → [{agent_id}] calling Claude ({self.config.default_model}, thinking={strategy})…")

            thinking_strategy = agent_cfg.get("thinking_strategy", "disabled")
            if thinking_strategy == "two_pass":
                raw_output, tokens = await self._run_two_pass(
                    system_prompt, user_message, agent_cfg, agent_id
                )
            else:
                raw_output, tokens = await self._call_claude(
                    system_prompt, user_message, agent_cfg, agent_id
                )

            output_files = self._write_output_files(raw_output, agent_cfg, product_id)
            parsed = self._try_parse_yaml(raw_output, output_files, product_id)

            # Outcome validation — empty or missing files = explicit failure
            ok, failure_reason, failure_type = self._check_outcome(
                raw_output, output_files, agent_cfg, product_id
            )

            duration = time.monotonic() - start

            if not ok:
                if self.verbose:
                    print(f"  ✗ [{agent_id}] outcome check failed ({failure_type}): {failure_reason}")
                return AgentResult(
                    agent_id=agent_id,
                    product_id=product_id,
                    success=False,
                    output_files=output_files,
                    raw_output=raw_output,
                    parsed_data=parsed,
                    tokens_used=tokens,
                    duration_seconds=duration,
                    attempt=attempt,
                    error=failure_reason,
                    failure_type=failure_type,
                )

            if self.verbose:
                print(f"  ✓ [{agent_id}] done in {duration:.1f}s ({tokens} tokens)")

            return AgentResult(
                agent_id=agent_id,
                product_id=product_id,
                success=True,
                output_files=output_files,
                raw_output=raw_output,
                parsed_data=parsed,
                tokens_used=tokens,
                duration_seconds=duration,
                attempt=attempt,
            )

        except PipelinePausedError:
            # Re-raise so pipeline.py can save state and exit cleanly
            raise

        except Exception as exc:
            duration = time.monotonic() - start
            return AgentResult(
                agent_id=agent_id,
                product_id=product_id,
                success=False,
                error=str(exc),
                failure_type="api_error",
                duration_seconds=duration,
                attempt=attempt,
            )

    # ── Prompt builders ────────────────────────────────────────────────────

    def _build_system(self, agent_cfg: dict[str, Any]) -> str:
        """Read the agent's .md prompt file as the system prompt."""
        prompt_path = self.config.base_dir / agent_cfg.get("prompt", "")
        if prompt_path.exists():
            return prompt_path.read_text()
        return (
            f"You are the {agent_cfg['id']} agent in an AI-First Company pipeline. "
            "Follow your role description exactly and produce structured outputs."
        )

    def _build_user(
        self,
        agent_cfg: dict[str, Any],
        product_id: str,
        extra_context: str = "",
    ) -> str:
        """Assemble the user turn from context files + output instructions."""
        parts: list[str] = []

        # Inject context files
        context_files: list[str] = agent_cfg.get("context_files", [])
        if context_files:
            context_text = self.config.read_context_files(context_files, product_id)
            if context_text.strip():
                parts.append("## CONTEXT FILES\n\n" + context_text)

        # Extra context (e.g. gate violations for code-fixer, retry hints)
        if extra_context.strip():
            parts.append("## ADDITIONAL CONTEXT\n\n" + extra_context)

        # Output instructions
        output_files: list[str] = agent_cfg.get("output_files", [])
        output_format: str = agent_cfg.get("output_format", "text")
        if output_files:
            file_list = "\n".join(f"  - {f}" for f in output_files)
            parts.append(
                "## OUTPUT INSTRUCTIONS\n\n"
                "Produce the following output files using this exact delimiter format:\n\n"
                "```\n"
                "--- FILE: path/to/file ---\n"
                "<file content here>\n"
                "--- END FILE ---\n"
                "```\n\n"
                f"Files to produce ({output_format} format):\n{file_list}\n\n"
                "Replace `{product_id}` with the actual product ID: "
                f"`{product_id}`\n\n"
                "After all FILE blocks, add a brief summary of what you produced."
            )

        return "\n\n".join(parts) if parts else "Execute your role for product: " + product_id

    # ── Claude API calls ───────────────────────────────────────────────────

    async def _stream_call(
        self, call_fn: Any, agent_id: str
    ) -> tuple[str, int]:
        """Run call_fn through semaphore + rate-limit handler."""
        if self._semaphore:
            async with self._semaphore:
                return await self.rate_limit_handler.run(call_fn, agent_id=agent_id)
        return await self.rate_limit_handler.run(call_fn, agent_id=agent_id)

    async def _call_claude(
        self,
        system: str,
        user_message: str,
        agent_cfg: dict[str, Any],
        agent_id: str = "unknown",
    ) -> tuple[str, int]:
        """
        Stream a single Claude call.
        Handles thinking_strategy=disabled (default) and fixed_budget.
        Returns (raw_text, total_output_tokens).
        Raises PipelinePausedError if rate limit exceeds inline-wait threshold.
        """
        thinking_strategy = agent_cfg.get("thinking_strategy", "disabled")
        thinking_budget = int(agent_cfg.get("thinking_budget_tokens", 0))
        # max_output_tokens is the text-only budget; max_tokens sent to API includes thinking
        max_output_tokens = int(agent_cfg.get(
            "max_output_tokens",
            agent_cfg.get("max_tokens", self.config.default_max_tokens),
        ))
        model: str = agent_cfg.get("model", self.config.default_model)

        if thinking_strategy == "fixed_budget" and thinking_budget > 0:
            # API max_tokens must cover thinking + text output
            api_max_tokens = thinking_budget + max_output_tokens
            thinking_param: Optional[dict] = {"type": "enabled", "budget_tokens": thinking_budget}
        else:
            api_max_tokens = max_output_tokens
            thinking_param = None

        async def _do_call() -> tuple[str, int]:
            raw_output = ""
            call_kwargs: dict[str, Any] = dict(
                model=model,
                max_tokens=api_max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_message}],
            )
            if thinking_param:
                call_kwargs["thinking"] = thinking_param

            async with self.client.messages.stream(**call_kwargs) as stream:
                async for text in stream.text_stream:
                    raw_output += text
                final = await stream.get_final_message()
                return raw_output, final.usage.output_tokens

        return await self._stream_call(_do_call, agent_id)

    async def _run_two_pass(
        self,
        system: str,
        user_message: str,
        agent_cfg: dict[str, Any],
        agent_id: str,
    ) -> tuple[str, int]:
        """
        Two-pass strategy for cognitive agents:
        - Pass 1: thinking enabled → structured plan (no file output)
        - Pass 2: thinking disabled, plan injected → full file output

        This separates the cognitive budget from the generation budget,
        preventing thinking from consuming tokens needed for structured output.
        """
        thinking_budget = int(agent_cfg.get("thinking_budget_tokens", 4000))
        max_output_tokens = int(agent_cfg.get(
            "max_output_tokens",
            agent_cfg.get("max_tokens", self.config.default_max_tokens),
        ))
        model: str = agent_cfg.get("model", self.config.default_model)

        # ── Pass 1: Think and plan ──────────────────────────────────────────
        if self.verbose:
            print(f"  → [{agent_id}] Pass 1 (think + plan)…")

        pass1_user_msg = (
            user_message
            + "\n\n## PASS 1 — ANALYSIS ONLY\n\n"
            "Do NOT produce file output yet. Instead produce a concise structured plan:\n"
            "1. Summarise the product from the intake file in 2-3 sentences\n"
            "2. List each output file with its key content decisions (3-5 bullets each)\n"
            "3. Flag any blockers or missing information\n"
            "Keep your plan under 1500 words. No FILE blocks."
        )
        # Pass 1 budget: thinking + small text for the plan
        pass1_api_tokens = thinking_budget + 2000

        async def _pass1() -> tuple[str, int]:
            raw = ""
            async with self.client.messages.stream(
                model=model,
                max_tokens=pass1_api_tokens,
                system=system,
                thinking={"type": "enabled", "budget_tokens": thinking_budget},
                messages=[{"role": "user", "content": pass1_user_msg}],
            ) as stream:
                async for text in stream.text_stream:
                    raw += text
                final = await stream.get_final_message()
                return raw, final.usage.output_tokens

        plan_output, pass1_tokens = await self._stream_call(_pass1, f"{agent_id}:pass1")

        # ── Pass 2: Generate output using plan as context ───────────────────
        if self.verbose:
            print(f"  → [{agent_id}] Pass 2 (generate output)…")

        pass2_user_msg = (
            user_message
            + f"\n\n## STRUCTURED PLAN (from analysis pass)\n\n{plan_output}\n\n"
            "## PASS 2 — GENERATE FILE OUTPUT\n\n"
            "Now produce the complete file output as specified in OUTPUT INSTRUCTIONS above. "
            "Follow your plan exactly. Use the FILE block format for every output file."
        )

        async def _pass2() -> tuple[str, int]:
            raw = ""
            async with self.client.messages.stream(
                model=model,
                max_tokens=max_output_tokens,
                system=system,
                messages=[{"role": "user", "content": pass2_user_msg}],
            ) as stream:
                async for text in stream.text_stream:
                    raw += text
                final = await stream.get_final_message()
                return raw, final.usage.output_tokens

        full_output, pass2_tokens = await self._stream_call(_pass2, f"{agent_id}:pass2")

        return full_output, pass1_tokens + pass2_tokens

    # ── Outcome Validation ─────────────────────────────────────────────────

    def _check_outcome(
        self,
        raw_output: str,
        output_files: list[str],
        agent_cfg: dict[str, Any],
        product_id: str,
    ) -> tuple[bool, str, str]:
        """
        Validate that agent produced meaningful output.
        Returns (ok, failure_reason, failure_type).

        failure_type values: "empty_output" | "missing_files" | "outcome_invalid" | ""
        """
        declared: list[str] = agent_cfg.get("output_files", [])
        outcome_cfg: dict = agent_cfg.get("outcome_validation", {})
        allow_empty: bool = outcome_cfg.get("allow_empty", False)

        if allow_empty:
            return True, "", ""

        # 1. Raw output effectively empty
        if len(raw_output.strip()) < _MIN_NONEMPTY_BYTES:
            return (
                False,
                f"Agent produced empty output ({len(raw_output)} bytes raw)",
                "empty_output",
            )

        # 2. Output files declared but none written
        if declared and not output_files:
            return (
                False,
                f"No output files written (expected {len(declared)}: {declared[:2]}…)",
                "missing_files",
            )

        # 3. Minimum file size check
        min_size: int = outcome_cfg.get("min_file_size_bytes", 0)
        if min_size > 0:
            base = self.config.base_dir
            for rel in output_files:
                abs_path = base / rel
                if abs_path.exists():
                    size = abs_path.stat().st_size
                    if size < min_size:
                        return (
                            False,
                            f"Output file {rel} too small ({size} < {min_size} bytes)",
                            "outcome_invalid",
                        )

        # 4. Required keys in first YAML output (supports dot-notation for nested keys)
        required_keys: list[str] = outcome_cfg.get("required_keys", [])
        if required_keys:
            import yaml
            base = self.config.base_dir
            for rel in output_files:
                if rel.endswith((".yaml", ".yml")):
                    abs_path = base / rel
                    if abs_path.exists():
                        try:
                            data = yaml.safe_load(abs_path.read_text()) or {}
                            missing = []
                            for k in required_keys:
                                parts = k.split(".")
                                node = data
                                for part in parts:
                                    if not isinstance(node, dict) or part not in node:
                                        missing.append(k)
                                        break
                                    node = node[part]
                            if missing:
                                return (
                                    False,
                                    f"Required keys missing in {rel}: {missing}",
                                    "outcome_invalid",
                                )
                        except Exception as e:
                            return False, f"YAML parse error in {rel}: {e}", "outcome_invalid"
                    break  # only check first yaml file

        # 5. Required content strings in HTML output files
        required_content: list[str] = outcome_cfg.get("required_content", [])
        if required_content:
            base = self.config.base_dir
            for rel in output_files:
                if rel.endswith(".html"):
                    abs_path = base / rel
                    if abs_path.exists():
                        text = abs_path.read_text()
                        missing_content = [s for s in required_content if s not in text]
                        if missing_content:
                            return (
                                False,
                                f"Required content missing in {rel}: {missing_content}",
                                "outcome_invalid",
                            )
                    break  # only check first html file

        return True, "", ""

    # ── Output file handling ───────────────────────────────────────────────

    def _write_output_files(
        self,
        raw_output: str,
        agent_cfg: dict[str, Any],
        product_id: str,
    ) -> list[str]:
        """Parse FILE blocks from raw_output, write them to disk, return paths."""
        written: list[str] = []
        base = self.config.base_dir

        for match in _FILE_BLOCK.finditer(raw_output):
            rel_path = match.group(1).strip()
            content = match.group(2)

            # Resolve {product_id} template in the path
            rel_path = rel_path.replace("{product_id}", product_id)

            abs_path = base / rel_path
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_text(content)
            written.append(rel_path)

        # Fallback: if no FILE blocks but there are declared output_files and
        # raw output looks like the correct format, write raw_output to first file.
        declared: list[str] = agent_cfg.get("output_files", [])
        if not written and declared and raw_output.strip():
            resolved = self.config.resolve_paths(declared[:1], product_id)
            if resolved:
                p = resolved[0]
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(raw_output)
                written.append(str(p.relative_to(base)))

        return written

    def _try_parse_yaml(
        self,
        raw_output: str,
        output_files: list[str],
        product_id: str,
    ) -> Optional[dict]:
        """Try to parse first .yaml output file; return dict or None."""
        import yaml

        for rel in output_files:
            if rel.endswith((".yaml", ".yml")):
                abs_path = self.config.base_dir / rel
                if abs_path.exists():
                    try:
                        return yaml.safe_load(abs_path.read_text())
                    except Exception:
                        pass
        return None
