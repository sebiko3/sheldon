#!/usr/bin/env python3
"""audit-tool-descriptions — score sheldon's MCP tool descriptions against a
monotone-decreasing baseline.

Walks ``mcp/missions-server/src/index.ts``, extracts every
``server.registerTool("<name>", { description: "..." }, ...)`` registration
(including descriptions built from multi-line string concatenation with ``+``),
and classifies each against three violation categories:

  - noGuidance: description lacks any clause indicating *when to prefer this
    tool over the native Claude Code equivalent* (Bash, Read, Write, Edit,
    Task). Heuristic: case-insensitive match against a small lexicon of
    guidance markers (see GUIDANCE_RE below).
  - tooShort: ``len(description) < 80``. Forces a small amount of guidance
    prose even on terse tools.
  - duplicates: ``total_tools - distinct_descriptions``.

Exit codes:

  - 0: every observed counter is <= its baseline in
    ``verification/mcp-tool-baseline.json``.
  - 1: at least one counter exceeds baseline. Offender names are printed.

Flags:

  - ``--update-baseline``: overwrite the baseline file with the currently
    observed counts. This is the ONLY way to lower (or refresh) the baseline;
    normal runs never modify the file.
  - ``--help``: print this message.

Standard library only — no third-party deps. Mirrors ``scripts/contract-lint.py``
in tone and dependency profile.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_TS = REPO_ROOT / "mcp" / "missions-server" / "src" / "index.ts"
BASELINE_PATH = REPO_ROOT / "verification" / "mcp-tool-baseline.json"

MIN_DESCRIPTION_LEN = 80

# Match every server.registerTool("<name>", { description: <concatenated strings> ...
TOOL_RE = re.compile(
    r"registerTool\(\s*\"(?P<name>[^\"]+)\"\s*,\s*\{\s*description\s*:\s*"
    r"(?P<desc>(?:\"(?:[^\"\\]|\\.)*\"\s*\+?\s*)+)",
    re.DOTALL,
)
STRING_LITERAL_RE = re.compile(r"\"((?:[^\"\\]|\\.)*)\"")

# Heuristic: a description "answers when to prefer this tool over the native
# Claude Code equivalent" if it contains any of these markers. Tuned for the
# current 20-tool surface in mcp/missions-server/src/index.ts.
GUIDANCE_RE = re.compile(
    r"("
    r"prefer"
    r"|instead( of)?"
    r"|over (the )?native"
    r"|over (the )?builtin"
    r"|over (Bash|Read|Write|Edit|Task)"
    r"|caller\s*:"
    r"|use this"
    r"|use to"
    r"|helper for"
    r"|when to"
    r"|rather than"
    r"|routes through"
    r")",
    re.IGNORECASE,
)


def extract_tools(src: str) -> list[tuple[str, str]]:
    """Parse ``src`` and return ``[(tool_name, description), ...]``.

    Descriptions are reassembled from concatenated string literals — TypeScript
    splits long strings with ``"...\" +\\n  \"...\"`` which would otherwise show
    up as multiple lexical chunks.
    """
    tools: list[tuple[str, str]] = []
    for m in TOOL_RE.finditer(src):
        name = m.group("name")
        raw = m.group("desc")
        parts = [p for p in STRING_LITERAL_RE.findall(raw)]
        desc = "".join(parts)
        # Unescape the common escapes we actually emit. JSON-loads would handle
        # this rigorously but is overkill; we only need quote+backslash+newline.
        desc = desc.replace("\\\"", "\"").replace("\\\\", "\\").replace("\\n", "\n")
        tools.append((name, desc))
    return tools


def classify(tools: list[tuple[str, str]]) -> dict[str, list[str]]:
    """Return ``{"noGuidance": [names], "tooShort": [names], "duplicates": [names]}``.

    For duplicates the offender list contains every tool name involved in any
    duplicate group (not just the second occurrence); useful for the report.
    """
    no_guidance: list[str] = []
    too_short: list[str] = []
    desc_to_names: dict[str, list[str]] = {}

    for name, desc in tools:
        if not GUIDANCE_RE.search(desc):
            no_guidance.append(name)
        if len(desc) < MIN_DESCRIPTION_LEN:
            too_short.append(name)
        desc_to_names.setdefault(desc.strip(), []).append(name)

    duplicates: list[str] = []
    for _d, names in desc_to_names.items():
        if len(names) > 1:
            duplicates.extend(names)

    return {
        "noGuidance": no_guidance,
        "tooShort": too_short,
        "duplicates": duplicates,
    }


def counts(violations: dict[str, list[str]], total_tools: int) -> dict[str, int]:
    """Convert violation lists to the integer baseline shape.

    ``duplicates`` is special: per the contract it is ``total - distinct``,
    NOT the length of the offender list (which double-counts names inside the
    same equivalence class).
    """
    # Count distinct descriptions by reconstructing from the dup offender list
    # via the equivalence classes implied by the original classify() call.
    # Easier approach: re-derive from violation list length minus number of
    # distinct dup groups. But we don't track groups separately, so recount.
    # For correctness, fall back to a simple identity: caller must pass total.
    return {
        "noGuidance": len(violations["noGuidance"]),
        "tooShort": len(violations["tooShort"]),
        "duplicates": _duplicates_count(violations["duplicates"]),
    }


def _duplicates_count(offenders: list[str]) -> int:
    """Compute ``total_in_dup_groups - number_of_dup_groups``.

    Equivalent to ``total_tools - distinct_descriptions`` restricted to tools
    that actually have a duplicate sibling. ``offenders`` is the flat list of
    every tool involved in any dup group, with all members listed.
    """
    # We don't carry group identity here; treat the list as is and observe
    # that the contract's duplicates metric counts "extra copies" — i.e.
    # for a group of size k, contribute (k - 1). Summed across groups, this
    # equals (len(offenders) - number_of_groups). But without group identity
    # we can't compute number_of_groups from a flat list.
    #
    # Workaround: in classify() we built the equivalence classes; the caller
    # passes us only the flat offender list, so we recompute groups here by
    # treating offenders as already-grouped. A cleaner refactor lives in
    # main() where we have access to the full mapping.
    return 0  # superseded by inline computation in main()


def render_report(
    tools: list[tuple[str, str]],
    violations: dict[str, list[str]],
    observed: dict[str, int],
    baseline: dict[str, int],
) -> str:
    lines: list[str] = []
    lines.append(f"audit-tool-descriptions: {len(tools)} tools scanned")
    for key in ("noGuidance", "tooShort", "duplicates"):
        obs = observed[key]
        base = baseline.get(key, 0)
        marker = "" if obs <= base else "  <-- REGRESSION"
        lines.append(f"  {key:11s} {obs:3d}  (baseline {base}){marker}")
    lines.append("")
    if violations["noGuidance"]:
        lines.append(f"noGuidance offenders: {', '.join(violations['noGuidance'])}")
    if violations["tooShort"]:
        lines.append(f"tooShort   offenders: {', '.join(violations['tooShort'])}")
    if violations["duplicates"]:
        lines.append(f"duplicates offenders: {', '.join(violations['duplicates'])}")
    return "\n".join(lines) + "\n"


def load_baseline() -> dict[str, int]:
    if not BASELINE_PATH.exists():
        return {"noGuidance": 0, "tooShort": 0, "duplicates": 0}
    try:
        with BASELINE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return {"noGuidance": 0, "tooShort": 0, "duplicates": 0}
    return {
        "noGuidance": int(data.get("noGuidance", 0)),
        "tooShort": int(data.get("tooShort", 0)),
        "duplicates": int(data.get("duplicates", 0)),
    }


def write_baseline(observed: dict[str, int]) -> None:
    BASELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "noGuidance": observed["noGuidance"],
        "tooShort": observed["tooShort"],
        "duplicates": observed["duplicates"],
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with BASELINE_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def compute(tools: list[tuple[str, str]]) -> tuple[dict[str, list[str]], dict[str, int]]:
    """Return ``(violations, observed_counts)`` where the duplicates count is
    correctly computed against the equivalence classes."""
    # Re-derive equivalence classes for an accurate duplicates count.
    desc_to_names: dict[str, list[str]] = {}
    for name, desc in tools:
        desc_to_names.setdefault(desc.strip(), []).append(name)

    dup_groups = [names for names in desc_to_names.values() if len(names) > 1]
    dup_offenders = [n for grp in dup_groups for n in grp]
    duplicates_count = sum(len(grp) - 1 for grp in dup_groups)

    no_guidance = [n for n, d in tools if not GUIDANCE_RE.search(d)]
    too_short = [n for n, d in tools if len(d) < MIN_DESCRIPTION_LEN]

    violations = {
        "noGuidance": no_guidance,
        "tooShort": too_short,
        "duplicates": dup_offenders,
    }
    observed = {
        "noGuidance": len(no_guidance),
        "tooShort": len(too_short),
        "duplicates": duplicates_count,
    }
    return violations, observed


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="audit-tool-descriptions",
        description=(
            "Audit sheldon's MCP tool descriptions against a monotone-decreasing "
            "baseline. Counts noGuidance / tooShort / duplicates violations and "
            "fails when any exceeds the recorded floor in "
            "verification/mcp-tool-baseline.json."
        ),
    )
    p.add_argument(
        "--update-baseline",
        action="store_true",
        help="Overwrite the baseline file with the currently observed counts and exit 0.",
    )
    args = p.parse_args(argv)

    if not INDEX_TS.exists():
        sys.stderr.write(f"audit-tool-descriptions: cannot find {INDEX_TS}\n")
        return 2

    src = INDEX_TS.read_text(encoding="utf-8")
    tools = extract_tools(src)
    if not tools:
        sys.stderr.write(
            "audit-tool-descriptions: zero tool registrations found — parser regression?\n"
        )
        return 2

    violations, observed = compute(tools)

    if args.update_baseline:
        write_baseline(observed)
        sys.stdout.write(
            f"audit-tool-descriptions: baseline updated to "
            f"noGuidance={observed['noGuidance']} "
            f"tooShort={observed['tooShort']} "
            f"duplicates={observed['duplicates']}\n"
        )
        return 0

    baseline = load_baseline()
    sys.stdout.write(render_report(tools, violations, observed, baseline))

    regressed = any(observed[k] > baseline.get(k, 0) for k in ("noGuidance", "tooShort", "duplicates"))
    return 1 if regressed else 0


if __name__ == "__main__":
    sys.exit(main())
