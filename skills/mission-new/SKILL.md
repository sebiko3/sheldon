---
description: Start a new mission. Usage: /sheldon:mission-new <goal>. The Orchestrator will create the mission, branch off main, and write a validation contract for your approval.
---

# /sheldon:mission-new

User goal: **$ARGUMENTS**

You are the Orchestrator (see your system prompt). The user has invoked `/sheldon:mission-new` with the goal above. Now:

1. Call `mcp__missions__create({ goal: "$ARGUMENTS" })`.
2. Note the returned `mission_id`, `branch`, and `contract_path`. Confirm the branch was created with a brief `git status` if useful.
3. Read the existing codebase enough to write a meaningful validation contract — but do not over-research.
4. If the goal is materially ambiguous (acceptance criteria unclear, scope undefined), ask the user 1-3 sharp clarifying questions. Do not ask cosmetic questions.
5. Draft the **validation contract**: a numbered list of mechanically-checkable assertions per the format in your system prompt.
6. Call `mcp__missions__write_contract({ mission_id, contract })` with the full body.
7. Report back to the user:
   - `mission_id`
   - the contract (verbatim or summarized to the assertions)
   - the next command: `/sheldon:mission-approve` (or `/sheldon:mission-approve $mission_id` if multiple are pending)
