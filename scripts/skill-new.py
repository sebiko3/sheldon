#!/usr/bin/env python3
"""skill-new — scaffold a new Sheldon skill from a template.

Usage:

    python3 scripts/skill-new.py <kebab-name> --description "<one-sentence>"
                                              [--argument-hint "<hint>"]
                                              [--skills-dir <path>]

Writes ``<skills-dir>/<kebab-name>/SKILL.md`` from the template and then runs
``scripts/skill-lint.py`` on the result. Refuses if the target directory
already exists (no overwrites).

Standard library only — no third-party deps.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


KEBAB_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")

TEMPLATE = """---
description: {description}
{extra_frontmatter}---

# /sheldon:{name}

{title_summary}

## When to invoke

Trigger this skill when the user expresses one of these intents:

- (replace with concrete trigger phrases)

## Steps

1. (replace with concrete step-by-step instructions)
2. ...

## Notes

- Sheldon-local skill conventions:
  - One directory per skill (``skills/<kebab-name>/``) containing a single ``SKILL.md``.
  - YAML frontmatter between ``---`` fences; required key is ``description``.
  - Quote frontmatter values that contain the substring ``": "`` (gray-matter colon-space gotcha).
  - No emojis anywhere in the body.
  - No footer attribution (no ``Generated with Claude``, no ``Co-Authored-By``).
"""


def _quote_if_needed(value: str) -> str:
    """Wrap a frontmatter value in double quotes when it contains ': '.

    Mirrors the contract-lint gray-matter colon-space gotcha. If the value
    already has surrounding quotes, return it unchanged.
    """
    s = value.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        return s
    if ": " in s:
        # escape any embedded double-quotes
        return '"' + s.replace('"', '\\"') + '"'
    return s


def render_template(name: str, description: str, argument_hint: str | None) -> str:
    extra: list[str] = []
    if argument_hint:
        extra.append(f"argument-hint: {_quote_if_needed(argument_hint)}\n")
    extra_frontmatter = "".join(extra)

    title_summary = (
        "One-line summary of what this skill does and when the Orchestrator (or user) should reach for it."
    )

    return TEMPLATE.format(
        description=_quote_if_needed(description),
        extra_frontmatter=extra_frontmatter,
        name=name,
        title_summary=title_summary,
    )


def run_linter(skill_md: Path, repo_root: Path) -> int:
    """Run ``scripts/skill-lint.py`` on the freshly-written skill.

    Looks for the linter beside this script. Returns the linter's exit code
    (0 on clean).
    """
    linter = Path(__file__).resolve().parent / "skill-lint.py"
    if not linter.exists():
        sys.stderr.write(
            f"WARN: linter not found at {linter}; skipping post-scaffold lint.\n"
        )
        return 0
    proc = subprocess.run(
        [sys.executable, str(linter), str(skill_md)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    return proc.returncode


def scaffold(name: str, description: str, argument_hint: str | None, skills_dir: Path) -> int:
    if not KEBAB_RE.match(name):
        sys.stderr.write(
            f"ERROR: '{name}' is not kebab-case (lowercase letters/digits/hyphens, starting with letter or digit).\n"
        )
        return 2

    target_dir = skills_dir / name
    if target_dir.exists():
        sys.stderr.write(
            f"ERROR: target directory {target_dir} already exists; refusing to overwrite. "
            "Pick a different name or delete the existing directory first.\n"
        )
        return 2

    target_dir.mkdir(parents=True, exist_ok=False)
    target_file = target_dir / "SKILL.md"
    body = render_template(name=name, description=description, argument_hint=argument_hint)
    target_file.write_text(body, encoding="utf-8")

    sys.stdout.write(f"Wrote {target_file}\n")

    # Run the linter from the parent of skills/ so kebab-name detection works
    # whether the user invoked us from the repo root or elsewhere.
    repo_root = skills_dir.parent if skills_dir.name == "skills" else skills_dir.resolve()
    rc = run_linter(target_file, repo_root)
    if rc != 0:
        sys.stderr.write(
            "WARN: skill-lint reported errors on the freshly-scaffolded stub. "
            "Edit the SKILL.md to address them before committing.\n"
        )
    return rc


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="skill-new",
        description="Scaffold a new Sheldon skill from a template, then run skill-lint on the stub.",
    )
    p.add_argument("name", help="Kebab-case skill name (e.g. my-new-skill). Becomes skills/<name>/.")
    p.add_argument(
        "--description",
        required=True,
        help="One-sentence description for the frontmatter. Should name the user phrase that triggers the skill.",
    )
    p.add_argument(
        "--argument-hint",
        default=None,
        help="Optional argument-hint string for the frontmatter (e.g. '<mission_id>').",
    )
    p.add_argument(
        "--skills-dir",
        default="skills",
        help="Path to the skills/ directory (default: ./skills).",
    )
    args = p.parse_args(argv)

    skills_dir = Path(args.skills_dir)
    return scaffold(
        name=args.name,
        description=args.description,
        argument_hint=args.argument_hint,
        skills_dir=skills_dir,
    )


if __name__ == "__main__":
    sys.exit(main())
