---
description: List all missions, optionally filtered by phase. Usage: /sheldon:mission-list [phase]
---

# /sheldon:mission-list

Optional phase filter: **$ARGUMENTS**

1. Call `mcp__missions__list({ phase: "$ARGUMENTS" || undefined })` — pass `phase` only if `$ARGUMENTS` is a valid phase name (`planning`, `contract_review`, `implementing`, `handed_off`, `validating`, `validated`, `rejected`, `done`, `aborted`).
2. Render a compact table:

```
ID            PHASE             GOAL                                  H  V  CREATED
01JK...       implementing      add user profile editing              1  0  2026-05-11T...
01JL...       done              add hello.ts greet function           3  1  2026-05-10T...
```

(H = handoffs count, V = validation_runs count.)

If empty, say so plainly.
