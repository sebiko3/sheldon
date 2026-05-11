---
description: Approve a mission's validation contract and kick off the Worker→Validator loop. If no id given, picks the single mission currently in contract_review.
argument-hint: "[mission_id]"
---

# /sheldon:mission-approve

User-supplied mission id (may be empty): **$ARGUMENTS**

You are the Orchestrator. Drive the approval and execution:

1. Resolve the target mission:
   - If `$ARGUMENTS` is non-empty, use it as the `mission_id`.
   - Otherwise, call `mcp__plugin_sheldon_missions__list({ phase: "contract_review" })`. If exactly one mission is in that phase, use it. If zero or more than one, ask the user which one.
2. Call `mcp__plugin_sheldon_missions__approve({ mission_id })`. Phase transitions `contract_review` → `implementing`.
3. **Spawn the Worker subagent** using the Agent tool:
   - `subagent_type`: `"worker"`
   - `description`: short, e.g. "Implement mission <id>"
   - `prompt`: a minimal prompt — just `mission_id`, the bare goal (1-2 sentences), and the instruction to read the contract at `.missions/<mission_id>/contract.md` with the `Read` tool. Do NOT paste the contract — make the worker read it directly so it's the single source of truth.
   - When the Worker's final message arrives, extract the last fenced `intent` block from it (`JSON.parse` the content). The block will look like:
     ```intent
     {"action": "handoff", "summary": "<summary>"}
     ```
     Call `mcp__plugin_sheldon_missions__handoff({ mission_id, summary })` yourself with the extracted `summary`.
4. After the handoff, continue:
   - Call `mcp__plugin_sheldon_missions__start_validation({ mission_id })`.
   - Call `mcp__plugin_sheldon_missions__run_assertions({ mission_id })` to pre-fetch assertion results.
   - Call `mcp__plugin_sheldon_missions__diff({ mission_id })` to pre-fetch the diff.
   - Spawn the Validator subagent (`subagent_type: "validator"`) with:
     - `mission_id`
     - The stringified `run_assertions` results
     - The diff output
     - Instruction to read the contract at `.missions/<mission_id>/contract.md` and validate each assertion.
   - When the Validator's final message arrives, extract the last fenced `intent` block:
     ```intent
     {"action": "validate", "verdict": "pass", "findings": "<findings>"}
     ```
     Call `mcp__plugin_sheldon_missions__validate({ mission_id, verdict, findings })` yourself with the extracted fields.
5. After the validate call:
   - On `pass`: call `mcp__plugin_sheldon_missions__merge({ mission_id })`. Tell the user "mission \<id\> shipped" with a brief summary of handoffs/validations.
   - On `fail`: call `mcp__plugin_sheldon_missions__reopen({ mission_id })`. Re-spawn the Worker with the validator's findings included in the prompt verbatim. Loop back to step 3 when the Worker hands off again.

If at any point you hit an illegal state or repeated failures, abort the mission with `mcp__plugin_sheldon_missions__abort({ mission_id, reason })` and surface to the user.
