---
description: "Print a one-paragraph narrative postmortem for a terminated mission: what was built, validator outcome, and time-to-terminal."
argument-hint: "<mission_id>"
---

# /sheldon:mission-retro

Mission id: **$ARGUMENTS**

Goal: produce a concise prose postmortem for the mission — what was built, how many assertions were in the contract, how many validation runs passed or failed, and how long it took from creation to terminal state.

1. Run the helper script and capture its output:

   ```
   python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/mission-retro.py $ARGUMENTS
   ```

2. Print the script's stdout verbatim.

3. If the script exits non-zero, surface its stderr clearly so the user knows why (e.g., mission not found, or mission is not yet in a terminal phase).

The script is stdlib-only Python — no install step needed.
