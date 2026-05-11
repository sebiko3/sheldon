---
description: Abort an in-flight mission. Usage: /sheldon:mission-abort <mission_id> [reason]
---

# /sheldon:mission-abort

Args: **$ARGUMENTS**

1. Parse `$ARGUMENTS` — first token is `mission_id`, rest (if any) is the reason.
2. If `mission_id` is missing or empty, ask the user which mission to abort (call `mcp__missions__list({})` first to show candidates).
3. Confirm with the user before aborting — this is destructive (mission can't be resumed; you'd have to start a new one).
4. On confirmation, call `mcp__missions__abort({ mission_id, reason })`. Report success with the mission's final phase.
5. Do NOT delete the mission branch automatically. Leave that to the user — they may want to inspect or salvage commits.
