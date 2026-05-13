#!/usr/bin/env python3
"""skill-lint — score a Sheldon skill SKILL.md against project-local conventions.

Reads one ``SKILL.md`` path and verifies:

- the file starts with a YAML frontmatter block (``---`` fenced)
- the frontmatter contains a non-empty ``description`` field, reasonably long
  and not the literal scaffold placeholder
- if the file lives inside a ``skills/<name>/`` directory, ``<name>`` is
  kebab-case (lowercase letters/digits/hyphens, starting with letter or digit)
- the file body contains no emoji characters (BMP misc symbols + dingbats and
  the supplemental planes most commonly used for emoji)
- the file contains no footer attribution lines (``Generated with Claude`` or
  ``Co-Authored-By:``)
- frontmatter values that contain the ``": "`` substring are wrapped in quotes
  (the gray-matter colon-space gotcha — mirrors ``contract-lint``)

Exits non-zero on any error so the Orchestrator and ``skill-new`` can gate on
a clean lint. Standard library only — no third-party deps.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


KEBAB_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
DESCRIPTION_KEY_RE = re.compile(r"^description\s*:\s*(?P<val>.*)$")
ANY_KEY_RE = re.compile(r"^(?P<key>[a-zA-Z_][\w-]*)\s*:\s*(?P<val>.*)$")
EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"  # supplemental symbols, pictographs, emoji
    "☀-➿"           # misc symbols + dingbats
    "]"
)
PLACEHOLDER_DESCRIPTIONS = {
    "TODO",
    "TODO: describe this skill",
    "describe this skill",
    "placeholder",
}
MIN_DESCRIPTION_LEN = 40


def split_frontmatter(raw: str) -> tuple[list[str] | None, str, int]:
    """Return (frontmatter_lines, body, body_offset) or (None, raw, 0) if absent.

    ``body_offset`` is the 1-based line number where the body starts (after
    the closing ``---``).
    """
    lines = raw.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, raw, 0
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body = "\n".join(lines[i + 1:])
            return lines[1:i], body, i + 2
    return None, raw, 0  # unclosed


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        return s[1:-1]
    return s


def _is_quoted(s: str) -> bool:
    s = s.strip()
    return len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"')


def has_unquoted_colon_space(value_raw: str) -> bool:
    s = value_raw.strip()
    if _is_quoted(s):
        return False
    return ": " in s


def parse_top_level(fm_lines: list[str]) -> dict[str, str]:
    """Parse top-level ``key: value`` pairs in the frontmatter.

    Nested structures (lists, maps) are ignored — skill frontmatter is flat by
    convention. Returns a dict of raw (unstripped) values keyed by name.
    """
    out: dict[str, str] = {}
    for line in fm_lines:
        if not line.strip() or line.lstrip() != line:
            # blank or indented — skip nested context
            continue
        m = ANY_KEY_RE.match(line)
        if m:
            out[m.group("key")] = m.group("val")
    return out


def kebab_name_from_path(path: Path) -> str | None:
    """If ``path`` lives inside a ``skills/<name>/`` directory, return ``<name>``."""
    parts = path.resolve().parts
    if "skills" in parts:
        idx = parts.index("skills")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return None


def lint_skill(path: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if not path.exists():
        errors.append(f"skill not found: {path}")
        return errors, warnings
    if not path.is_file():
        errors.append(f"skill path is not a file: {path}")
        return errors, warnings
    if path.name != "SKILL.md":
        warnings.append(f"file is not named SKILL.md (got {path.name})")

    raw = path.read_text(encoding="utf-8")
    fm_lines, body, _ = split_frontmatter(raw)
    if fm_lines is None:
        errors.append(
            "no YAML frontmatter detected. SKILL.md must start with '---' and have a matching closing '---'."
        )
        return errors, warnings

    fields = parse_top_level(fm_lines)

    # 1) description required and substantive.
    desc_raw = fields.get("description")
    if desc_raw is None:
        errors.append("frontmatter missing required 'description' field.")
    else:
        desc = _strip_quotes(desc_raw)
        if not desc:
            errors.append("frontmatter 'description' is empty.")
        elif desc.strip() in PLACEHOLDER_DESCRIPTIONS:
            errors.append(
                f"frontmatter 'description' is the placeholder '{desc.strip()}' — replace it with a real one-sentence description."
            )
        elif len(desc) < MIN_DESCRIPTION_LEN:
            errors.append(
                f"frontmatter 'description' is too short ({len(desc)} chars; need >= {MIN_DESCRIPTION_LEN}). "
                "A skill description should be a full sentence that names the user phrase that should trigger the skill."
            )

    # 2) Colon-space gotcha on any frontmatter value.
    for key, val_raw in fields.items():
        if has_unquoted_colon_space(val_raw):
            errors.append(
                f"frontmatter '{key}' has an unquoted colon-space (': ') — wrap the value in single or double quotes. "
                "(Gray-matter silently breaks on this pattern.)"
            )

    # 3) Kebab-case directory name when applicable.
    name = kebab_name_from_path(path)
    if name is not None and not KEBAB_RE.match(name):
        errors.append(
            f"skill directory name '{name}' is not kebab-case (lowercase letters/digits/hyphens, starting with letter or digit)."
        )

    # 4) No emojis anywhere in the file.
    m = EMOJI_RE.search(raw)
    if m:
        # locate line number for friendlier output
        offset = m.start()
        lineno = raw.count("\n", 0, offset) + 1
        errors.append(
            f"line {lineno}: emoji character {m.group(0)!r} detected. "
            "Sheldon skills do not use emojis (they degrade LLM skill-discovery signal)."
        )

    # 5) No footer attribution. We match start-of-line attribution lines so a
    #    skill that DOCUMENTS the rule by quoting it inline doesn't self-flag.
    #    Real attribution footers always begin a line.
    attribution_re = re.compile(
        r"^[\s>*\-]*(generated with claude|co-authored-by\s*:)",
        re.IGNORECASE | re.MULTILINE,
    )
    if attribution_re.search(raw):
        errors.append(
            "footer attribution line detected ('Generated with Claude' or 'Co-Authored-By:'). "
            "Sheldon skills do not carry attribution footers — move attribution to the project README."
        )

    return errors, warnings


def render_report(path: Path, errors: list[str], warnings: list[str]) -> str:
    out: list[str] = []
    out.append(f"Skill lint: {path}")
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
        out.append("OK - no errors, no warnings.")
    elif not errors:
        out.append(f"OK with {len(warnings)} warning(s) - skill is structurally sound.")
    else:
        out.append(
            f"FAIL - {len(errors)} error(s), {len(warnings)} warning(s). "
            "Fix the errors above before shipping the skill."
        )

    return "\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="skill-lint",
        description="Lint a Sheldon skill SKILL.md against project-local conventions.",
    )
    p.add_argument("path", help="Path to the SKILL.md file (e.g. skills/<name>/SKILL.md).")
    args = p.parse_args(argv)

    target = Path(args.path)
    errors, warnings = lint_skill(target)
    sys.stdout.write(render_report(target, errors, warnings))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
