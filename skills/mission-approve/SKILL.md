---
description: Approve a mission's validation contract and kick off the Worker→Validator loop. Usage: /sheldon:mission-approve [mission_id]. If no id given, picks the single mission currently in contract_review.
---

# /sheldon:mission-approve

User-supplied mission id (may be empty): **$ARGUMENTS**

You are the Orchestrator. Drive the approval and execution:

1. Resolve the target mission:
   - If `$ARGUMENTS` is non-empty, use it as the `mission_id`.
   - Otherwise, call `mcp__missions__list({ phase: "contract_review" })`. If exactly one mission is in that phase, use it. If zero or more than one, ask the user which one.
2. Call `mcp__missions__approve({ mission_id })`. Phase transitions `contract_review` → `implementing`.
3. **Spawn the Worker subagent** using the Agent tool:
   - `subagent_type`: `"worker"`
   - `description`: short, e.g. "Implement mission <id>"
   - `prompt`: a minimal prompt — just `mission_id`, the bare goal (1-2 sentences), and the instruction to read the contract via `mcp__missions__read({ mission_id })`. Do NOT paste the contract — make the worker read it via MCP so it's the single source of truth.
4. When the Worker returns its final message (the handoff summary), continue per your system prompt:
   - Call `mcp__missions__start_validation({ mission_id })`.
   - Spawn the Validator subagent (`subagent_type: "validator"`) with `mission_id` only.
5. When the Validator returns:
   - On `pass`: call `mcp__missions__merge({ mission_id })`. Tell the user "mission \<id\> shipped" with a brief summary of handoffs/validations.
   - On `fail`: call `mcp__missions__reopen({ mission_id })`. Re-spawn the Worker with the validator's findings included in the prompt verbatim. Loop back to step 4 when the Worker hands off again.

If at any point you hit an illegal state or repeated failures, abort the mission with `mcp__missions__abort({ mission_id, reason })` and surface to the user.
