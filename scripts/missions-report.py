#!/usr/bin/env python3
"""missions-report — quick health snapshot of a Sheldon mission loop.

Reads every ``.missions/*/state.json`` under the current working directory and
prints a human-readable report covering phase distribution, throughput,
time-to-merge percentiles, rework rate, abort rate, and recently merged
missions.

Standard library only — no third-party deps. Exits 0 even when the repo has
no missions yet (prints a header explaining the empty state).
"""
from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import textwrap
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

# Phases the missions server knows about. We list them explicitly so the
# breakdown is stable even when a phase has zero missions (better at-a-glance
# than a sparse table).
PHASES = (
    "planning",
    "contract_review",
    "implementing",
    "handed_off",
    "validating",
    "validated",
    "rejected",
    "done",
    "aborted",
)

TERMINAL = ("done", "aborted")
THROUGHPUT_DAYS = 14
RECENT_LIMIT = 5
GOAL_TRUNC = 72


def parse_iso(ts: str) -> datetime | None:
    """Parse an ISO 8601 timestamp. Returns None on failure."""
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


def load_missions(root: Path) -> list[dict[str, Any]]:
    """Load every ``state.json`` under ``root/.missions/<id>/``.

    Malformed files are skipped with a warning to stderr — better than
    crashing the report on a single bad mission.
    """
    base = root / ".missions"
    if not base.is_dir():
        return []
    missions: list[dict[str, Any]] = []
    for entry in sorted(base.iterdir()):
        if not entry.is_dir():
            continue
        state_path = entry / "state.json"
        if not state_path.is_file():
            continue
        try:
            with state_path.open("r", encoding="utf-8") as f:
                missions.append(json.load(f))
        except (OSError, json.JSONDecodeError) as err:
            print(f"warn: skipping {state_path}: {err}", file=sys.stderr)
    return missions


def truncate(s: str, n: int) -> str:
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def fmt_duration(seconds: float) -> str:
    """Format a non-negative duration in the most readable unit."""
    if seconds < 0:
        return "n/a"
    if seconds < 90:
        return f"{seconds:.0f}s"
    minutes = seconds / 60
    if minutes < 90:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    if hours < 36:
        return f"{hours:.1f}h"
    return f"{hours / 24:.1f}d"


def percentile(values: list[float], p: float) -> float:
    """Linear-interpolation percentile. ``p`` is 0..100. ``values`` need not be sorted."""
    if not values:
        return float("nan")
    if len(values) == 1:
        return values[0]
    s = sorted(values)
    k = (len(s) - 1) * (p / 100.0)
    lo = int(k)
    hi = min(lo + 1, len(s) - 1)
    frac = k - lo
    return s[lo] + (s[hi] - s[lo]) * frac


def section(title: str) -> str:
    return f"\n{title}\n{'-' * len(title)}"


def render_phase_breakdown(missions: list[dict[str, Any]]) -> list[str]:
    out = [section("Phase breakdown")]
    counts = Counter(m.get("phase", "?") for m in missions)
    total = sum(counts.values())
    if total == 0:
        out.append("(no missions)")
        return out
    width = max(len(p) for p in PHASES)
    for phase in PHASES:
        n = counts.get(phase, 0)
        pct = (n / total * 100) if total else 0
        out.append(f"  {phase:<{width}}  {n:3d}   {pct:5.1f}%")
    other = sum(v for k, v in counts.items() if k not in PHASES)
    if other:
        out.append(f"  {'(other)':<{width}}  {other:3d}")
    out.append(f"  {'TOTAL':<{width}}  {total:3d}")
    return out


def render_throughput(missions: list[dict[str, Any]]) -> list[str]:
    out = [section(f"Throughput (last {THROUGHPUT_DAYS} days)")]
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=THROUGHPUT_DAYS - 1)
    buckets: dict[Any, int] = defaultdict(int)
    for m in missions:
        created = parse_iso(m.get("created_at", ""))
        if not created:
            continue
        d = created.date()
        if d < start or d > today:
            continue
        buckets[d] += 1
    if not buckets:
        out.append("  (no missions created in the window)")
        return out
    # Render newest-first.
    for i in range(THROUGHPUT_DAYS):
        d = today - timedelta(days=i)
        n = buckets.get(d, 0)
        bar = "█" * n if n else "·"
        out.append(f"  {d.isoformat()}  {n:2d}  {bar}")
    return out


def render_time_to_merge(missions: list[dict[str, Any]]) -> list[str]:
    out = [section("Time to merge (done missions)")]
    durations: list[float] = []
    for m in missions:
        if m.get("phase") != "done":
            continue
        start = parse_iso(m.get("created_at", ""))
        end = parse_iso(m.get("updated_at", ""))
        if not (start and end):
            continue
        durations.append((end - start).total_seconds())
    if not durations:
        out.append("  (no merged missions yet)")
        return out
    out.append(f"  count : {len(durations)}")
    out.append(f"  p50   : {fmt_duration(percentile(durations, 50))}")
    out.append(f"  p90   : {fmt_duration(percentile(durations, 90))}")
    out.append(f"  max   : {fmt_duration(max(durations))}")
    out.append(f"  mean  : {fmt_duration(statistics.fmean(durations))}")
    return out


def render_rates(missions: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    done = [m for m in missions if m.get("phase") == "done"]
    aborted = [m for m in missions if m.get("phase") == "aborted"]
    terminal = done + aborted

    out.append(section("Rework rate"))
    if not done:
        out.append("  (no merged missions yet)")
    else:
        rework = [m for m in done if len(m.get("validation_runs", [])) > 1]
        pct = len(rework) / len(done) * 100
        out.append(
            f"  {len(rework)}/{len(done)} merged missions needed >1 validation run  ({pct:.1f}%)"
        )

    out.append(section("Abort rate"))
    if not terminal:
        out.append("  (no terminal-phase missions yet)")
    else:
        pct = len(aborted) / len(terminal) * 100
        out.append(
            f"  {len(aborted)}/{len(terminal)} terminal-phase missions aborted  ({pct:.1f}%)"
        )
    return out


def render_recent(missions: list[dict[str, Any]]) -> list[str]:
    out = [section(f"Recently merged (last {RECENT_LIMIT})")]
    done = [m for m in missions if m.get("phase") == "done"]
    done.sort(key=lambda m: m.get("updated_at", ""), reverse=True)
    if not done:
        out.append("  (no merged missions yet)")
        return out
    out.append(f"  {'ID':<26}  {'H':>2} {'V':>2}  {'MERGED':<20}  GOAL")
    for m in done[:RECENT_LIMIT]:
        ts = m.get("updated_at", "")[:19]
        out.append(
            f"  {m.get('id', '?'):<26}  "
            f"{len(m.get('handoffs', [])):2d} "
            f"{len(m.get('validation_runs', [])):2d}  "
            f"{ts:<20}  {truncate(m.get('goal', ''), GOAL_TRUNC)}"
        )
    return out


def build_report(missions: list[dict[str, Any]], root: Path) -> str:
    lines: list[str] = []
    header = f"sheldon missions report — {root}"
    lines.append(header)
    lines.append("=" * len(header))
    if not missions:
        lines.append("")
        lines.append("No missions yet — .missions/ is empty or missing.")
        lines.append("")
        lines.append("Phase breakdown")
        lines.append("---------------")
        lines.append("(no missions)")
        lines.append("")
        lines.append("Time to merge (done missions)")
        lines.append("-----------------------------")
        lines.append("(no merged missions yet)")
        lines.append("")
        lines.append("Rework rate")
        lines.append("-----------")
        lines.append("(no merged missions yet)")
        lines.append("")
        lines.append("Abort rate")
        lines.append("----------")
        lines.append("(no terminal-phase missions yet)")
        lines.append("")
        lines.append("Recently merged")
        lines.append("---------------")
        lines.append("(no merged missions yet)")
        return "\n".join(lines)
    lines.append(f"  total missions tracked : {len(missions)}")
    lines.extend(render_phase_breakdown(missions))
    lines.extend(render_throughput(missions))
    lines.extend(render_time_to_merge(missions))
    lines.extend(render_rates(missions))
    lines.extend(render_recent(missions))
    return "\n".join(lines)


def resolve_root(arg: str | None) -> Path:
    if arg:
        return Path(arg).resolve()
    env = os.environ.get("SHELDON_REPO_ROOT")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    return Path.cwd().resolve()


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="missions-report",
        description=textwrap.dedent(
            """
            Print a quick health snapshot of a Sheldon mission loop:
            phase breakdown, throughput (last 14 days), time-to-merge
            percentiles, rework rate, abort rate, and recently merged
            missions.
            """
        ).strip(),
    )
    parser.add_argument(
        "--repo-root",
        dest="repo_root",
        default=None,
        help="Path to repo root (defaults to $SHELDON_REPO_ROOT or cwd).",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)
    root = resolve_root(args.repo_root)
    missions = load_missions(root)
    print(build_report(missions, root))
    return 0


if __name__ == "__main__":
    sys.exit(main())
