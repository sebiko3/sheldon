---
description: "Garbage-collect stale mission branches: list or delete aborted/done mission/<id> branches whose updated_at is older than --days days (default 14). Dry-run by default; pass --apply to delete."
argument-hint: "[--days <N>] [--apply]"
---

# /sheldon:missions-gc

User args (may be empty): **$ARGUMENTS**

Goal: clean up stale `mission/<id>` branches from terminated missions that are
older than the configured threshold.

1. Run the helper script:

   ```
   python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/missions-gc.py $ARGUMENTS
   ```

   If `$ARGUMENTS` is empty, omit it — the script defaults to `--days 14` and
   dry-run mode.

2. Show the output to the user verbatim.

3. If running in dry-run mode (no `--apply` in arguments), remind the user:
   "Pass `--apply` to actually delete these branches."

4. If `--apply` was passed, confirm how many branches were deleted.

Safety notes:
- The currently checked-out branch is never deleted — the script detects and
  skips it with a warning.
- Only branches in terminal phases (`aborted` or `done`) are candidates.
- Dry-run is the default — no deletions happen without `--apply`.

The script is stdlib-only Python — no install step needed.
