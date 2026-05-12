#!/usr/bin/env python3
"""brain-dedup — report near-duplicate entries in the Sheldon brain.

Reads .sheldon/brain/entries.jsonl, folds tombstones the same way brain.ts
does, then computes pairwise Jaccard overlap within same-type groups. Prints
one line per pair whose overlap meets --threshold.  Read-only — never writes
to the brain directory.

Standard library only — no third-party deps.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from itertools import combinations
from pathlib import Path


def resolve_root() -> Path:
    env = os.environ.get("SHELDON_REPO_ROOT")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    return Path.cwd().resolve()


def load_active_entries(entries_path: Path) -> list[dict]:
    latest: dict[str, dict] = {}
    with entries_path.open("r", encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            eid = entry.get("id")
            if eid:
                latest[eid] = entry
    return [e for e in latest.values() if not e.get("superseded_by")]


def tokenize(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t for t in tokens if len(t) >= 3}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="brain-dedup",
        description=(
            "Report near-duplicate entries in the Sheldon brain. "
            "Computes Jaccard overlap over word tokens within each type group. "
            "Read-only — never modifies brain data."
        ),
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.6,
        metavar="FLOAT",
        help="Minimum overlap to report a pair (default: 0.6, range 0.0-1.0).",
    )
    parser.add_argument(
        "--type",
        dest="entry_type",
        default=None,
        choices=["convention", "lesson", "proposal", "agent-improvement"],
        metavar="TYPE",
        help="Restrict to one entry type (convention|lesson|proposal|agent-improvement).",
    )
    args = parser.parse_args(argv)

    if not (0.0 <= args.threshold <= 1.0):
        parser.error(f"--threshold must be between 0.0 and 1.0, got {args.threshold}")

    root = resolve_root()
    entries_path = root / ".sheldon" / "brain" / "entries.jsonl"

    if not entries_path.exists():
        print(
            "No brain entries file found — nothing to deduplicate.",
            file=sys.stderr,
        )
        return 0

    active = load_active_entries(entries_path)

    groups: dict[str, list[dict]] = {}
    for entry in active:
        t = entry.get("type", "")
        if args.entry_type and t != args.entry_type:
            continue
        groups.setdefault(t, []).append(entry)

    for group_type, entries in sorted(groups.items()):
        for a, b in combinations(entries, 2):
            text_a = tokenize(a.get("topic", "") + " " + a.get("text", ""))
            text_b = tokenize(b.get("topic", "") + " " + b.get("text", ""))
            score = jaccard(text_a, text_b)
            if score >= args.threshold:
                print(
                    f"pair: {a['id']} | {b['id']}  type={group_type}  overlap={score:.2f}"
                )

    return 0


if __name__ == "__main__":
    sys.exit(main())
