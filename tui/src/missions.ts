import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { MissionState } from "./types.js";

export interface MissionWithExtras {
  state: MissionState;
  contract: string;
  malformed?: false;
}

export interface MalformedMission {
  id: string;
  error: string;
  malformed: true;
}

export type LoadedMission = MissionWithExtras | MalformedMission;

export function missionsDir(repoRoot: string): string {
  return path.join(repoRoot, ".missions");
}

export function loadAllMissions(repoRoot: string): LoadedMission[] {
  const dir = missionsDir(repoRoot);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const out: LoadedMission[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const stateFile = path.join(dir, e.name, "state.json");
    if (!existsSync(stateFile)) continue;
    try {
      const state = JSON.parse(readFileSync(stateFile, "utf8")) as MissionState;
      const contractFile = path.join(dir, e.name, "contract.md");
      const contract = existsSync(contractFile) ? readFileSync(contractFile, "utf8") : "";
      out.push({ state, contract });
    } catch (err) {
      out.push({ id: e.name, error: (err as Error).message, malformed: true });
    }
  }
  out.sort((a, b) => {
    const ka = "state" in a ? a.state.created_at : "";
    const kb = "state" in b ? b.state.created_at : "";
    return kb.localeCompare(ka);
  });
  return out;
}

export function readHandoffSummary(repoRoot: string, summaryPath: string): string {
  // summary_path is stored as absolute when written by the server. Tolerate
  // both absolute and relative-to-repo paths.
  const p = path.isAbsolute(summaryPath) ? summaryPath : path.join(repoRoot, summaryPath);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}
