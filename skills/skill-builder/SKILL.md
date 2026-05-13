---
description: "Invoke when the user wants to create a new skill or scaffold skill for Sheldon: writes the SKILL.md stub, enforces local conventions, and runs the skill-lint check."
argument-hint: "<kebab-name>"
---

# /sheldon:skill-builder

User args: **$ARGUMENTS**

Goal: turn an idea for a new Sheldon skill (often a `proposal` entry promoted
out of the brain) into a real `skills/<kebab-name>/SKILL.md` that follows
Sheldon's local conventions. This skill plays the same role for skills that
`/sheldon:contract-lint` plays for mission contracts: a tight, mechanical
gate so authoring drift cannot accumulate silently.

## When to invoke

Reach for this skill when:

- the user says some variant of "create a new skill", "scaffold skill",
  "add a skill for X", or
- the Orchestrator is promoting a brain `proposal` entry into a real skill
  (see `skills/brain-learn/SKILL.md`), or
- you are about to hand-write a new `SKILL.md` and want the template +
  linter to do the boring parts for you.

Skip this skill when the user only wants to *edit* an existing skill — there
is nothing to scaffold; the linter alone (`python3 scripts/skill-lint.py`)
is enough.

## Sheldon-local skill conventions

A Sheldon skill is a single markdown file at
`skills/<kebab-name>/SKILL.md`. The conventions the linter enforces:

- **One directory per skill.** `skills/<kebab-name>/` contains exactly one
  `SKILL.md`. The directory name is **kebab-case** (lowercase letters,
  digits, and hyphens; starting with a letter or digit). Examples:
  `brain-recall`, `mission-new`, `epic-promote`.
- **YAML frontmatter** sits between `---` fences at the top of the file.
  Required key: `description` — one sentence, action-oriented, naming the
  user phrase that should trigger the skill. The description is what the
  LLM reads at discovery time, so make it specific.
- **Quote any frontmatter value containing the substring `": "`.** This is
  the gray-matter colon-space gotcha: a colon followed by a space inside an
  unquoted value silently breaks frontmatter parsing. Wrap the value in
  double quotes (or rephrase to drop the second colon).
- **No emojis anywhere in the body.** Sheldon's experience is that emojis
  in a SKILL.md compete for the LLM's attention with the instructions and
  measurably degrade skill discovery and adherence. The linter rejects them.
- **No footer attribution.** Sheldon skills do not carry `Generated with
  Claude` or `Co-Authored-By:` footers — attribution lives in the project
  README, not in skills.

Optional frontmatter keys you may see in existing skills: `argument-hint`
(a short string shown next to the command), `name` (an explicit skill name;
usually inferred from the directory). Both are flat strings.

## How to use this skill

### Scaffold a new skill

Run the scaffolder. It writes the stub, then runs the linter on it.

```
python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/skill-new.py <kebab-name> \
    --description "<one-sentence description that names the trigger phrase>" \
    [--argument-hint "<hint shown next to the command>"]
```

The script:

1. Refuses to overwrite an existing `skills/<kebab-name>/` directory.
2. Validates that `<kebab-name>` is kebab-case.
3. Writes `skills/<kebab-name>/SKILL.md` from a template with placeholder
   sections (`## When to invoke`, `## Steps`, `## Notes`).
4. Runs `scripts/skill-lint.py` on the freshly-written file and prints the
   report. A clean exit means the stub is ready to fill in.

Auto-quoting: if the `--description` value contains the substring `": "`,
the scaffolder wraps it in double quotes for you so gray-matter parses it.

### Lint an existing skill

```
python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/skill-lint.py skills/<name>/SKILL.md
```

The linter reports:

- missing or placeholder `description`
- description too short (under 40 chars)
- unquoted colon-space in any frontmatter value
- non-kebab-case directory name (when the path lives inside `skills/`)
- emoji characters anywhere in the file
- footer attribution lines

Exit 0 means the skill is structurally sound. Both scripts are stdlib-only
Python — no install step.

## Authoring checklist

After scaffolding, fill in the stub:

1. Replace the `## When to invoke` triggers with the specific user phrases
   that should activate the skill. Be concrete — the LLM matches on these.
2. Replace the `## Steps` placeholder with the actual procedure. Prefer
   numbered, executable steps over prose.
3. Add a `## Notes` section with anything load-bearing the LLM might miss
   (e.g. a HARD-GATE that prevents premature tool calls).
4. Re-run `scripts/skill-lint.py` to confirm the filled-in skill still
   passes the linter.

## Wiring to the rest of Sheldon

- If the new skill is the promotion target of a brain `proposal`, mark the
  proposal entry as promoted in `brain-learn` followups so it does not get
  re-proposed.
- If the skill needs access to MCP tools beyond the Orchestrator's default
  set, update `.claude/settings.json` allow-list — subagent MCP calls
  silently drop tool_use without an allow-list entry.
- Skills are auto-discovered from the `skills/` directory — no central
  registry update is required.
