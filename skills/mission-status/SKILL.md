---
description: Show status of a mission (or all missions if no id).
argument-hint: "[mission_id]"
---

# /sheldon:mission-status

User-supplied mission id (may be empty): **$ARGUMENTS**

1. If `$ARGUMENTS` is non-empty: call `mcp__missions__read({ mission_id: "$ARGUMENTS" })` and present:
   - `id`, `goal`, `phase`, `branch`, `current_role`
   - the latest 3 handoffs with timestamps
   - the contract (first 40 lines, including any YAML frontmatter)
   - the diff_stat
   - If there's at least one entry in `validation_runs`, also surface the most recent verdict + a one-line excerpt of the findings (read the `findings_path` file). If a sibling `<n>-checks.log` exists in the same `validations/` directory, include its summary line (e.g. "3 passed, 1 failed, 1 manual").
2. If empty: call `mcp__missions__list({})` and show a compact table of all missions: id, phase, goal (truncated), handoffs count, validation_runs count.

Be terse. The user can ask for more if they want it.
