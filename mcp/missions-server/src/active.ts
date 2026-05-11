// Active-mission mutex: a single `.missions/.active.json` file recording
// which mission currently owns the working tree. Written when the
// Orchestrator transitions a mission to `implementing` (worker active) or
// `validating` (validator active). Cleared on handoff completion, validate,
// abort, or merge. Cross-session concurrency guard.

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { missionsDir } from "./paths.js";

export interface ActiveMarker {
  mission_id: string;
  role: "worker" | "validator";
  started_at: string;
}

function activeFile(): string {
  return path.join(missionsDir(), ".active.json");
}

export function readActive(): ActiveMarker | null {
  const f = activeFile();
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
}

export function writeActive(m: ActiveMarker): void {
  mkdirSync(path.dirname(activeFile()), { recursive: true });
  writeFileSync(activeFile(), JSON.stringify(m, null, 2) + "\n");
}

export function clearActive(): void {
  try {
    unlinkSync(activeFile());
  } catch {
    // Already gone — that's fine.
  }
}

/**
 * Throws if the active mutex is held by a *different* mission.
 * Used by mutating tools to prevent cross-mission interference.
 */
export function assertActiveMatchesOrUnset(mission_id: string): void {
  const a = readActive();
  if (a && a.mission_id !== mission_id) {
    throw new Error(
      `sheldon: another mission is currently active (${a.mission_id}, role=${a.role}). ` +
        `Refusing to mutate mission ${mission_id} until the active one finishes ` +
        `(or call missions.abort on the active one).`,
    );
  }
}
