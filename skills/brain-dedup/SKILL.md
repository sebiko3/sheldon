---
description: "Scan the Sheldon brain for near-duplicate entries within each type group and report candidate pairs above a configurable overlap threshold."
argument-hint: "[--threshold <float>] [--type <convention|lesson|proposal|agent-improvement>]"
---

# /sheldon:brain-dedup

User args (may be empty): **$ARGUMENTS**

Goal: identify near-duplicate brain entries that a human or orchestrator should consider retiring via `brain_observe`.

1. Run the helper script:

   ```
   python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/brain-dedup.py $ARGUMENTS
   ```

   If `$ARGUMENTS` is empty, omit it — the script defaults to `--threshold 0.6` and scans all type groups.

2. Print the script output verbatim.

3. For each reported pair, remind the user:
   "To retire a duplicate, observe a superseding entry with `supersedes: <id>` via `brain_observe`."

The script is read-only — it never writes or modifies `.sheldon/brain/`. Stdlib-only Python; no install step needed.
