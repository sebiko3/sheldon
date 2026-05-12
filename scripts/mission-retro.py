#!/usr/bin/env python3
"""mission-retro — one-paragraph narrative postmortem for a terminated mission.

Reads .missions/<id>/{state.json,contract.md,handoffs/*.md,validations/*.md}
and prints a 4-6 line markdown prose summary.  Exits non-zero when the mission
is not in a terminal phase or does not exist.

Standard library only — no third-party deps.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


TERMINAL_PHASES = {"done", "aborted", "validated", "rejected"}


def parse_iso(ts: str) -> datetime | None:
    if not ts:
        return None
    s = ts.rstrip("Z")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def fmt_duration(seconds: float) -> str:
    if seconds < 90:
        return f"{seconds:.0f}s"
    minutes = seconds / 60
    if minutes < 90:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    if hours < 36:
        return f"{hours:.1f}h"
    return f"{hours / 24:.1f}d"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def extract_frontmatter_body(text: str) -> tuple[str, str]:
    m = re.match(r"^---\n(.*?)\n---\n?(.*)", text, re.S)
    if m:
        return m.group(1), m.group(2).strip()
    return "", text.strip()


def count_assertions(contract_text: str) -> int:
    fm, _ = extract_frontmatter_body(contract_text)
    return len(re.findall(r"^\s*- id:", fm, re.M))


def extract_goal_from_contract(contract_text: str) -> str:
    _, body = extract_frontmatter_body(contract_text)
    m = re.search(r"Goal:\s*(.+)", body)
    if m:
        g = m.group(1).strip()
        g = re.sub(r"`", "", g)
        return g
    return ""


def summarise_handoffs(handoff_texts: list[str]) -> str:
    parts: list[str] = []
    for text in handoff_texts:
        first_para = text.strip().split("\n\n")[0].strip()
        if first_para:
            parts.append(" ".join(first_para.split()))
    if not parts:
        return "no worker handoff recorded"
    return parts[-1][:300]


def tally_validations(validation_runs: list[dict]) -> tuple[int, int, str]:
    passes = sum(1 for r in validation_runs if r.get("verdict") == "pass")
    fails = sum(1 for r in validation_runs if r.get("verdict") != "pass")
    final = (validation_runs[-1].get("verdict", "unknown") if validation_runs else "unknown")
    return passes, fails, final


def narrative_close(phase: str, passes: int, fails: int) -> str:
    if phase == "aborted":
        return "Mission was aborted before reaching a terminal validation."
    if fails == 0 and passes >= 1:
        return "Clean happy-path merge."
    if fails == 1 and passes >= 1:
        return "One rework loop resolved a missed assertion before final merge."
    if fails > 1:
        return f"{fails} rework loops were needed before the validator accepted the implementation."
    return "Mission completed."


def resolve_root() -> Path:
    import os
    env = os.environ.get("SHELDON_REPO_ROOT")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    return Path.cwd().resolve()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="mission-retro",
        description="Print a one-paragraph narrative postmortem for a terminated mission.",
    )
    parser.add_argument("mission_id", help="The mission ULID (e.g. 01KRDF1MCBK80KMCM2BXPSE9M3).")
    args = parser.parse_args(argv)

    root = resolve_root()
    mission_dir = root / ".missions" / args.mission_id

    state_path = mission_dir / "state.json"
    if not state_path.exists():
        print(f"error: mission '{args.mission_id}' not found at {mission_dir}", file=sys.stderr)
        return 1

    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        print(f"error: could not read state.json: {err}", file=sys.stderr)
        return 1

    phase = state.get("phase", "unknown")
    if phase not in TERMINAL_PHASES:
        print(
            f"error: mission '{args.mission_id}' is in phase '{phase}', "
            f"which is not terminal ({', '.join(sorted(TERMINAL_PHASES))}). "
            "Postmortem is only meaningful after the mission concludes.",
            file=sys.stderr,
        )
        return 1

    goal = state.get("goal", "")
    branch = state.get("branch", "")
    created_at = parse_iso(state.get("created_at", ""))
    updated_at = parse_iso(state.get("updated_at", ""))

    contract_text = read_text(mission_dir / "contract.md")
    if not goal:
        goal = extract_goal_from_contract(contract_text)
    assertion_count = count_assertions(contract_text)

    handoff_files = sorted((mission_dir / "handoffs").glob("*.md")) if (mission_dir / "handoffs").is_dir() else []
    handoff_texts = [read_text(f) for f in handoff_files]
    worker_summary = summarise_handoffs(handoff_texts)

    validation_runs: list[dict] = state.get("validation_runs", [])
    passes, fails, final_verdict = tally_validations(validation_runs)

    if created_at and updated_at:
        elapsed = fmt_duration((updated_at - created_at).total_seconds())
    else:
        elapsed = "unknown"

    close = narrative_close(phase, passes, fails)

    handoff_count = len([t for t in handoff_texts if t.strip()])
    validation_desc = (
        f"{passes} pass, {fails} fail" if (passes + fails) > 0 else "no validation runs recorded"
    )

    lines = [
        f"**Mission `{args.mission_id}`** — phase: `{phase}`, branch: `{branch}`.",
        f"Goal: {goal}." if goal and not goal.endswith('.') else f"Goal: {goal}",
        f"The worker submitted {handoff_count} handoff(s) covering: {worker_summary}",
        f"Contract had {assertion_count} assertion(s); validation results: {validation_desc} (final verdict: `{final_verdict}`).",
        f"Time from creation to terminal state: {elapsed}.",
        close,
    ]

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
