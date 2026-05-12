#!/usr/bin/env python3
"""cowork-singleton-check — detect a concurrent Sheldon cowork run.

Scans ``.missions/*/state.json`` under cwd (or ``$SHELDON_REPO_ROOT`` if set)
and exits 2 if any mission is in a non-terminal phase and was created within
``--max-age-minutes`` of now.  Exits 0 when no such peer is found.

Exit codes:
  0 — no peer detected; the routine may proceed.
  2 — peer detected; the routine should skip with reason=concurrent-run.
  non-zero (not 2) — argument error or filesystem error.

Standard library only — no third-party deps.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

TERMINAL_PHASES = {"done", "aborted"}


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


def resolve_root() -> Path:
    env = os.environ.get("SHELDON_REPO_ROOT")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    return Path.cwd().resolve()


def find_peer(root: Path, max_age_minutes: int) -> bool:
    base = root / ".missions"
    if not base.is_dir():
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    for entry in sorted(base.iterdir()):
        if not entry.is_dir():
            continue
        state_path = entry / "state.json"
        if not state_path.is_file():
            continue
        try:
            with state_path.open("r", encoding="utf-8") as f:
                state = json.load(f)
        except (OSError, json.JSONDecodeError) as err:
            print(f"warn: skipping {state_path}: {err}", file=sys.stderr)
            continue
        phase = state.get("phase", "")
        if phase in TERMINAL_PHASES:
            continue
        created_at = parse_iso(state.get("created_at", ""))
        if created_at is None:
            continue
        if created_at >= cutoff:
            return True
    return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="cowork-singleton-check",
        description="Exit 2 if a concurrent non-terminal mission run is detected.",
    )
    parser.add_argument(
        "--max-age-minutes",
        type=int,
        default=10,
        dest="max_age_minutes",
        help="Missions created within this many minutes are considered active peers (default: 10).",
    )
    args = parser.parse_args(argv)
    root = resolve_root()
    if find_peer(root, args.max_age_minutes):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
