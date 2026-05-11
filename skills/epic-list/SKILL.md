---
description: List all epics and their proposed issues. Optionally filter by issue status (proposed, promoted, declined).
argument-hint: "[status]"
---

# /sheldon:epic-list

Optional status filter: **$ARGUMENTS**

You are the Orchestrator. The user has invoked `/sheldon:epic-list`.

1. Call `mcp__missions__epic_list({})` (or with `{ status: "$ARGUMENTS" }` if a status was provided).
2. Render a compact table for the user showing:
   - epic id (short), brief, created_at
   - counts: proposed / promoted / declined issues
3. For each epic with proposed issues, list the issue titles so the user can decide which to promote.
4. Remind the user: `/sheldon:epic-promote <epic_id> <issue_id>` to promote an issue into a mission.
