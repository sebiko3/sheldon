---
description: "Dump everything Sheldon's brain has learned for this project, grouped by type."
---

# /sheldon:brain-list

1. Call `mcp__plugin_sheldon_missions__brain_list` (no arguments).
2. Print the summary first:

   ```
   Brain: <active> active entries (<total> total log lines)
     conventions: N    lessons: N    agent-improvements: N    proposals: N
   ```

3. Then list every entry, grouped by type and ordered newest-first within each group:

   ```
   ## Conventions
   - <topic> [confidence]
     <text first paragraph>
     (evidence: <evidence>)  ← only if present
   ```

4. End with a one-line pointer: `Digest: .sheldon/brain/README.md`.

Read-only. If you want to remove something, write a superseding entry via `mcp__plugin_sheldon_missions__brain_observe` with `supersedes: <id>`.
