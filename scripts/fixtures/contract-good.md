---
assertions:
  - id: file-exists
    description: src/foo.ts exists and is non-empty
    check: test -s src/foo.ts

  - id: file-is-typescript
    description: src/foo.ts is a TypeScript module
    check: head -1 src/foo.ts | grep -q 'export'

  - id: tests-pass
    description: vitest suite passes for the foo module
    check: npm test --workspace mcp/missions-server -- foo

  - id: readme-updated
    description: README.md mentions the new capability
    check: grep -q 'foo' README.md

  - id: prose-only-design-note
    description: implementation follows the design doc in docs/foo-design.md
    manual: true
---

# Validation contract — example well-formed fixture

## Goal

Add a `foo` capability that does X.

## Surface

- `src/foo.ts` — new module
- `README.md` — one new row
- `docs/foo-design.md` — design rationale

## Out of scope

- Anything not listed above.
