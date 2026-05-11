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
   ```

   Omit empty sections.

3. If `count === 0`, print one line: `No matching brain entries. Use /sheldon:brain-learn or mcp__plugin_sheldon_missions__brain_observe to add some.`

Do NOT modify the brain in this command. Read-only.
