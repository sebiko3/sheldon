---
description: Print a quick health snapshot of the mission loop on the current repo — phase breakdown, throughput, time-to-merge percentiles, rework and abort rates, recently merged.
argument-hint: "[--repo-root <path>]"
---

# /sheldon:missions-report

User args (may be empty): **$ARGUMENTS**

Goal: surface a one-screen health view of the mission loop. Useful before
starting a new mission or planning a sprint, and as part of weekly
retros.

1. Run the helper script and capture its stdout:

   ```
   python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/missions-report.py $ARGUMENTS
   ```

   If `$ARGUMENTS` is empty, omit it — the script defaults to
   `SHELDON_REPO_ROOT` (set by the Sheldon plugin) or `cwd`.

2. Show the captured report to the user verbatim inside a fenced code
   block so the column alignment survives rendering.

3. After the table, add one short sentence of commentary calling out the
   most actionable signal — for example:

   - "Rework rate is 50%+ — consider a contract-quality pass on new missions."
   - "No missions in `validating` or `handed_off`; loop is idle."
   - "Throughput dropped to 0 for the last 3 days."
   - "Latest merged mission took >2h end-to-end; check for blockers."

   Skip the commentary if the repo has zero missions; just say "no
   missions tracked yet".

4. Do NOT propose follow-up missions automatically. The user can ask.

The script is stdlib-only Python — no install step needed.
