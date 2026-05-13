---
description: "Recall what Sheldon has learned about this project — conventions, lessons, and proposals from past missions."
argument-hint: "[topic]"
---

# /sheldon:brain-recall

Optional topic filter: **$ARGUMENTS**

Sheldon's brain (`.sheldon/brain/entries.jsonl`) stores per-project knowledge that survives across missions. Call this at the start of a non-trivial mission to load relevant prior context before writing the contract or implementing.

1. Call `mcp__plugin_sheldon_missions__brain_recall` with:
   - `topic`: `"$ARGUMENTS"` if non-empty, otherwise omit
   - `limit`: 20

2. Group the returned entries by `type` and print as:

   ```
   ## Conventions (N)
   - <topic>  — <text>  [confidence]
   ## Lessons (N)
   - <topic>  — <text>  (evidence: <mission_id>)
   ## Agent improvements (N)
   - <topic>  — <text>
   ## Proposals (N)
   - <topic>  — <text>
   ## Strategies (N)
   - <topic>  — <text>  (outcome: first-try=<bool>, rework_loops=<n>, mission=<id>)
   ```

   Omit empty sections.

3. If `count === 0`, print one line: `No matching brain entries. Use /sheldon:brain-learn or mcp__plugin_sheldon_missions__brain_observe to add some.`

## Strategy ranking

When you call `brain_recall` with `type: "strategy"` (e.g., `/sheldon:brain-recall strategy mcp-tooling`), entries come back ranked by **first-try pass rate** rather than newest-first:

1. Entries with `outcome.validator_passes_first_try === true` come before those with `false`.
2. Within each group, lower `outcome.rework_loops` comes first (0 before 1 before 2...).
3. Created-at desc breaks remaining ties.

This means the top entries are the approaches that have empirically worked on the first worker round in this repo — the Orchestrator should mirror them when drafting contracts for similar work. Strategies are populated by `/sheldon:brain-learn` on missions that validated on the first round; missions that needed rework do not produce strategy entries (they yield lessons instead).

Do NOT modify the brain in this command. Read-only.
