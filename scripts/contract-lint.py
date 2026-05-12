#!/usr/bin/env python3
"""contract-lint — score a draft mission contract before the Orchestrator approves it.

Reads one ``.md`` contract path, parses its YAML frontmatter (the same
``assertions:`` block ``mcp/missions-server`` consumes), and prints a short
report. Exits non-zero on any error so the Orchestrator can gate approval on
a clean lint.

The most consequential check is the **gray-matter colon-space gotcha** —
a description value containing the literal substring ``: `` that isn't wrapped
in quotes will silently break gray-matter parsing, leaving the contract with
zero assertions and the validator passing on prose alone. The lesson is in
``.sheldon/brain/`` already; this script enforces it mechanically.

Standard library only — no third-party deps. No yaml package; the small
subset of YAML used in contracts is parsed by hand.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


KEBAB_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
ASSERTIONS_KEY_RE = re.compile(r"^assertions\s*:\s*$")
ITEM_START_RE = re.compile(r"^(?P<indent>\s*)-\s+id\s*:\s*(?P<id>.*?)\s*$")
KEY_RE = re.compile(r"^(?P<indent>\s+)(?P<key>[a-zA-Z_][\w-]*)\s*:\s*(?P<val>.*?)\s*$")


class Assertion:
    __slots__ = ("id", "description", "description_raw", "check", "manual", "lineno")

    def __init__(self, lineno: int) -> None:
        self.id: str | None = None
        self.description: str | None = None
        self.description_raw: str | None = None
        self.check: str | None = None
        self.manual: bool = False
        self.lineno = lineno


def split_frontmatter(raw: str) -> tuple[list[str] | None, int]:
    """Return (frontmatter_lines, offset) or (None, 0) if no frontmatter.

    offset is the 1-based line number where the frontmatter starts (after ---),
    used so we can attribute errors back to source lines.
    """
    lines = raw.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, 0
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return lines[1:i], 2  # frontmatter content starts at line 2
    return None, 0  # unclosed


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2:
        if (s[0] == s[-1]) and s[0] in ("'", '"'):
            return s[1:-1]
    return s


def _is_quoted(s: str) -> bool:
    s = s.strip()
    if len(s) < 2:
        return False
    return s[0] == s[-1] and s[0] in ("'", '"')


def parse_assertions(fm_lines: list[str], offset: int) -> tuple[list[Assertion], list[str]]:
    """Parse the ``assertions:`` block by walking the frontmatter line-by-line.

    Returns (assertions, parse_errors). parse_errors describes structural
    issues we can detect without a full YAML parser (e.g. assertions key
    missing).
    """
    errors: list[str] = []
    assertions: list[Assertion] = []

    in_assertions = False
    current: Assertion | None = None
    base_indent: int | None = None

    for idx, line in enumerate(fm_lines):
        source_lineno = offset + idx

        if not line.strip():
            continue

        # Top-level key entering or leaving the assertions block.
        if re.match(r"^\S", line):
            if ASSERTIONS_KEY_RE.match(line):
                in_assertions = True
                continue
            # Some other top-level key — leave the assertions block.
            in_assertions = False
            if current is not None:
                assertions.append(current)
                current = None
            continue

        if not in_assertions:
            continue

        m = ITEM_START_RE.match(line)
        if m:
            if current is not None:
                assertions.append(current)
            current = Assertion(lineno=source_lineno)
            current.id = _strip_quotes(m.group("id"))
            base_indent = len(m.group("indent")) + 2  # the dash + space
            continue

        if current is None:
            continue

        km = KEY_RE.match(line)
        if not km:
            continue
        key = km.group("key")
        val_raw = km.group("val")
        val = _strip_quotes(val_raw)

        if key == "description":
            current.description = val
            current.description_raw = val_raw
        elif key == "check":
            current.check = val
        elif key == "manual":
            current.manual = val.strip().lower() in ("true", "yes", "1")
        # other keys (timeout, etc.) — ignored by lint

    if current is not None:
        assertions.append(current)

    return assertions, errors


def has_unquoted_colon_space(value_raw: str | None) -> bool:
    """True iff value (as-written, before strip_quotes) contains ': ' and is not wholly quoted."""
    if not value_raw:
        return False
    s = value_raw.strip()
    if _is_quoted(s):
        return False
    return ": " in s


def lint_contract(path: Path) -> tuple[list[str], list[str], dict[str, int]]:
    """Lint ``path``. Returns (errors, warnings, summary)."""
    errors: list[str] = []
    warnings: list[str] = []
    summary: dict[str, int] = {"total": 0, "executable": 0, "manual": 0}

    if not path.exists():
        errors.append(f"contract not found: {path}")
        return errors, warnings, summary
    if not path.is_file():
        errors.append(f"contract path is not a file: {path}")
        return errors, warnings, summary

    raw = path.read_text(encoding="utf-8")
    fm_lines, offset = split_frontmatter(raw)
    if fm_lines is None:
        errors.append(
            "no YAML frontmatter detected. Contract must start with '---' and have a matching closing '---'."
        )
        return errors, warnings, summary

    if not any(ASSERTIONS_KEY_RE.match(l) for l in fm_lines):
        errors.append("no 'assertions:' key in frontmatter — validator will see zero assertions.")
        return errors, warnings, summary

    assertions, parse_errors = parse_assertions(fm_lines, offset)
    errors.extend(parse_errors)

    # Per-assertion checks
    seen_ids: set[str] = set()
    for a in assertions:
        # 1) Gray-matter colon-space gotcha (the headline lesson).
        if has_unquoted_colon_space(a.description_raw):
            errors.append(
                f"line {a.lineno}: assertion '{a.id}': description has an unquoted colon-space (': ') — "
                "this is the gray-matter gotcha. Wrap the value in single or double quotes, or rephrase to remove the second colon. "
                "Without quoting, gray-matter silently breaks parsing and the contract returns zero assertions."
            )

        # 2) Empty / missing description.
        if not a.description:
            errors.append(f"line {a.lineno}: assertion '{a.id}': missing description.")

        # 3) Missing id (shouldn't happen since we keyed on it, but be defensive).
        if not a.id:
            errors.append(f"line {a.lineno}: assertion has no id.")
            continue

        # 4) Duplicate ids.
        if a.id in seen_ids:
            errors.append(f"line {a.lineno}: duplicate assertion id '{a.id}'.")
        seen_ids.add(a.id)

        # 5) Kebab-case id (warning — schema enforces it but flag early).
        if a.id and not KEBAB_RE.match(a.id):
            warnings.append(
                f"line {a.lineno}: assertion id '{a.id}' is not kebab-case (lowercase letters/digits/hyphens, starting with letter or digit)."
            )

        # 6) No check and not explicitly manual — soft warning.
        if not a.check and not a.manual:
            warnings.append(
                f"line {a.lineno}: assertion '{a.id}' has no 'check:' and no 'manual: true' — "
                "validator will treat it as manual. Mark intent explicitly to avoid silent prose-only passes."
            )

    summary["total"] = len(assertions)
    summary["executable"] = sum(1 for a in assertions if a.check)
    summary["manual"] = sum(1 for a in assertions if not a.check)

    # 7) Whole-contract sanity — zero executable assertions is the worst case.
    if assertions and summary["executable"] == 0:
        errors.append(
            "no executable assertions (every entry is manual / prose-only). "
            "The validator will pass the mission on prose alone — almost certainly not what you want."
        )

    if not assertions:
        errors.append("'assertions:' block parsed but contains zero items.")

    return errors, warnings, summary


def render_report(path: Path, errors: list[str], warnings: list[str], summary: dict[str, int]) -> str:
    out: list[str] = []
    out.append(f"Contract lint: {path}")
    out.append("")
    out.append("Summary")
    out.append(f"  Total assertions:        {summary.get('total', 0)}")
    out.append(f"  Executable (check:):     {summary.get('executable', 0)}")
    out.append(f"  Manual / prose-only:     {summary.get('manual', 0)}")
    out.append("")

    if errors:
        out.append(f"Errors ({len(errors)})")
        for e in errors:
            out.append(f"  - {e}")
        out.append("")

    if warnings:
        out.append(f"Warnings ({len(warnings)})")
        for w in warnings:
            out.append(f"  - {w}")
        out.append("")

    if not errors and not warnings:
        out.append("OK — no errors, no warnings.")
    elif not errors:
        out.append(f"OK with {len(warnings)} warning(s) — contract is structurally sound.")
    else:
        out.append(
            f"FAIL — {len(errors)} error(s), {len(warnings)} warning(s). "
            "Fix the errors above before /sheldon:mission-approve."
        )

    return "\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="contract-lint",
        description="Lint a Sheldon mission contract (markdown with YAML frontmatter).",
    )
    p.add_argument("path", help="Path to the contract .md file (e.g. .missions/<id>/contract.md).")
    args = p.parse_args(argv)

    target = Path(args.path)
    errors, warnings, summary = lint_contract(target)
    sys.stdout.write(render_report(target, errors, warnings, summary))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
