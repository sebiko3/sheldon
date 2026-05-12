#!/usr/bin/env python3
"""missions-gc — garbage-collect stale mission branches.

Lists (or deletes with --apply) ``mission/<id>`` branches whose corresponding
``.missions/<id>/state.json`` has a terminal phase (aborted or done) and an
``updated_at`` timestamp older than ``--days`` days.

Dry-run is the default. Pass ``--apply`` to perform actual ``git branch -D``
deletions. The currently checked-out branch is never deleted.

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


def current_branch(root: Path) -> str | None:
    import subprocess
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def list_mission_branches(root: Path) -> list[str]:
    import subprocess
    result = subprocess.run(
        ["git", "branch", "--list", "mission/*"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return []
    branches = []
    for line in result.stdout.splitlines():
        branch = line.strip().lstrip("* ").strip()
        if branch:
            branches.append(branch)
    return branches


def find_candidates(root: Path, cutoff: datetime) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    branches = list_mission_branches(root)
    for branch in branches:
        parts = branch.split("/", 1)
        if len(parts) != 2:
            continue
        mission_id = parts[1]
        state_path = root / ".missions" / mission_id / "state.json"
        if not state_path.is_file():
            continue
        try:
            with state_path.open("r", encoding="utf-8") as f:
                state = json.load(f)
        except (OSError, json.JSONDecodeError) as err:
            print(f"warn: skipping {state_path}: {err}", file=sys.stderr)
            continue
        phase = state.get("phase", "")
        if phase not in TERMINAL_PHASES:
            continue
        updated_at = parse_iso(state.get("updated_at", ""))
        if updated_at is None:
            continue
        if updated_at < cutoff:
            candidates.append((branch, phase))
    return candidates


def delete_branch(root: Path, branch: str) -> bool:
    import subprocess
    result = subprocess.run(
        ["git", "branch", "-D", branch],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"error: failed to delete {branch}: {result.stderr.strip()}", file=sys.stderr)
        return False
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="missions-gc",
        description=(
            "List or delete stale mission branches whose updated_at is older"
            " than --days days and whose phase is aborted or done."
            " Dry-run by default; use --apply to delete."
        ),
    )
    parser.add_argument(
        "--days",
        type=int,
        default=14,
        help="Age threshold in days (default: 14). Branches older than this are candidates.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        default=False,
        help="Actually delete the candidate branches (default: dry-run only).",
    )
    args = parser.parse_args(argv)

    root = resolve_root()
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    candidates = find_candidates(root, cutoff)

    if not candidates:
        print("No candidates found.")
        return 0

    checked_out = current_branch(root)

    for branch, phase in candidates:
        print(f"would delete: {branch} (phase={phase})")

    if args.apply:
        for branch, phase in candidates:
            if branch == checked_out:
                print(
                    f"warn: skipping current branch {branch} — cannot delete the currently checked-out branch",
                    file=sys.stderr,
                )
                continue
            delete_branch(root, branch)

    return 0


if __name__ == "__main__":
    sys.exit(main())
