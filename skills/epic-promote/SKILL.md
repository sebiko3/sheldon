---
description: Promote an epic issue into a real Sheldon mission. The issue status flips to promoted and a new mission is created in the planning phase.
argument-hint: "<epic_id> <issue_id>"
---

# /sheldon:epic-promote

Arguments: **$ARGUMENTS**

You are the Orchestrator. The user has invoked `/sheldon:epic-promote` with the epic_id and issue_id above.

Parse the arguments: the first token is `epic_id`, the second is `issue_id` (integer).

1. Call `mcp__missions__epic_promote_issue({ epic_id: "<epic_id>", issue_id: <issue_id> })`.
2. This will:
   - Create a new Sheldon mission with the issue title as the goal
   - Flip the issue status from `proposed` to `promoted`
   - Return `{ mission_id, epic_id, issue_id }`
3. Report back to the user:
   - the new `mission_id`
   - the mission branch
   - instruction: run `/sheldon:mission-new` style steps to write a validation contract, or just use `/sheldon:mission-approve` once the auto-generated stub contract is ready
