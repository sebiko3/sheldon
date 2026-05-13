---
description: TODO
---

# /sheldon:bad-fixture

This SKILL.md is intentionally broken. It exists ONLY as a fixture for
`scripts/skill-lint.py` to verify the linter catches the conventions Sheldon
cares about.

It fails the linter on at least two grounds:

1. The frontmatter `description` is the literal placeholder string `TODO`, far
   below the minimum-length threshold and explicitly listed in the placeholder
   set.
2. (When the fixture is colocated under `skills/`, the directory name would
   also fail kebab-case checks; but the canonical home for this file is
   `scripts/fixtures/`, which skips that check by design.)

Do not promote this file to a real skill.
