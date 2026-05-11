// touched.list: append-only log of file paths the active Worker subagent
// has written or edited. Maintained by the PostToolUse hook
// (scripts/hooks/post-tool-use.sh). The MCP server reads this on handoff
// to detect "scope discipline" violations — files modified in the working
// tree that the worker did NOT touch via Write/Edit are flagged as
// contamination and the handoff is refused.

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { missionDir } from "./paths.js";
import { repoRoot } from "./paths.js";

function touchedFile(mission_id: string): string {
  return path.join(missionDir(mission_id), "touched.list");
}

/**
 * Return the worker-touched paths as a Set of repo-relative POSIX paths.
 * Tolerates absolute paths in the file (the hook records what Claude Code
 * passes as tool_input.file_path, which is usually absolute) and normalises
 * everything to repo-relative for comparison with `git status`.
 */
export function readTouchedSet(mission_id: string): Set<string> {
  const f = touchedFile(mission_id);
  if (!existsSync(f)) return new Set();
  const root = repoRoot();
  const out = new Set<string>();
  for (const raw of readFileSync(f, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const rel = path.isAbsolute(line) ? path.relative(root, line) : line;
    // Normalise to POSIX separators for cross-comparison with git status.
    out.add(rel.split(path.sep).join("/"));
  }
  return out;
}

export function clearTouched(mission_id: string): void {
  try {
    unlinkSync(touchedFile(mission_id));
  } catch {
    // Already missing — that's fine.
  }
}
