<!-- Thanks for the PR. A few prompts to keep reviews fast: -->

## Summary

<!-- One paragraph: what changes, and why. -->

## Mission link (if applicable)

If this PR is the merge of a Sheldon mission, paste the mission id and the path to the contract:

- Mission id: 
- Contract: `.missions/<id>/contract.md`

If it's a direct PR (no mission), say so — that's fine.

## Checklist

- [ ] `npm run build` is clean.
- [ ] `npm test` passes locally.
- [ ] Branch is rebased on the latest `main`.
- [ ] If new capability: README slash-commands table updated; CHANGELOG `[Unreleased]` updated.
- [ ] If touching protected surface (`mcp/missions-server/src/schema.ts`, exported handlers in `src/tools.ts`): changes are additive, not signature-breaking.

## Anything reviewers should look at first

<!-- Optional. A specific file, a tricky decision, a tradeoff you'd like a second opinion on. -->
