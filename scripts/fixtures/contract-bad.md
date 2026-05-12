---
assertions:
  - id: BadIdNotKebab
    description: src/foo.ts: this file should exist
    check: test -s src/foo.ts

  - id: another-bad
    description: tests pass: vitest is happy and CI is green
    check: npm test

  - id: orphan-prose
    description: implementation is correct
---

# Validation contract — intentionally-broken fixture

This contract exists ONLY as a fixture for `scripts/contract-lint.py`. It
exercises two failure modes the linter must catch:

1. The colon-space gotcha — the first two assertions have descriptions
   containing `: ` without quoting, which silently breaks gray-matter.
2. A non-kebab-case id (`BadIdNotKebab`) — the missions-server schema
   rejects this; the linter warns earlier.
3. The third assertion has no `check:` and no explicit `manual: true`,
   which usually indicates a forgotten command rather than a deliberate
   manual-only assertion.

Do not promote this file to a real mission contract.
