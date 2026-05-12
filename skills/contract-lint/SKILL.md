---
description: Lint a draft mission contract before approval. Flags the gray-matter colon-space gotcha, missing executable assertions, non-kebab-case ids, and other authoring mistakes that would silently break the validator.
argument-hint: "<path-to-contract.md>"
---

# /sheldon:contract-lint

User args: **$ARGUMENTS**

Goal: catch contract authoring mistakes before `/sheldon:mission-approve` so
the validator never silently passes a contract that parsed to zero
assertions. The biggest landmine is the gray-matter colon-space gotcha
(a `description` value containing `: ` that isn't quoted) — gray-matter
silently fails and the validator sees an empty assertion list.

1. Run the linter on the contract path the user supplied. If no path was
   given, default to the most recently modified `.missions/*/contract.md`:

   ```
   python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/contract-lint.py $ARGUMENTS
   ```

   If `$ARGUMENTS` is empty, look up the latest contract first:

   ```
   ls -t .missions/*/contract.md | head -1
   ```

   Then run the linter on that path.

2. Show the captured report to the user verbatim inside a fenced code block
   so column alignment survives rendering.

3. If the linter exited non-zero, summarize the actionable fixes in one
   short follow-up sentence (e.g., "Quote the description on line 7, or
   rephrase to drop the second colon."). If it exited zero, say "contract
   is structurally sound — safe to approve."

4. Do NOT auto-edit the contract. The Orchestrator decides whether to
   re-draft.

The script is stdlib-only Python — no install step needed.
