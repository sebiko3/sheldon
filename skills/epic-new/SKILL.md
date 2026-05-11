---
description: Decompose a vague brief into 3–7 candidate sub-mission proposals. The Epic Planner agent will research the codebase and write a structured .epics/<id>/epic.md for your review.
argument-hint: "<brief>"
---

# /sheldon:epic-new

User brief: **$ARGUMENTS**

You are the Orchestrator (see your system prompt). The user has invoked `/sheldon:epic-new` with the brief above.

Spawn the epic-planner agent using the Agent tool with `subagent_type: "epic-planner"`. Pass:
- the brief: `$ARGUMENTS`
- instruction to follow the epic-planner system prompt exactly

The epic-planner will call `mcp__missions__epic_create`, research the codebase, write `.epics/<id>/epic.md`, and return a summary with the epic_id and proposed issues.

Report back to the user:
- the `epic_id`
- the table of proposed issues
- instructions: use `/sheldon:epic-promote <epic_id> <issue_id>` to promote any issue into a real mission
