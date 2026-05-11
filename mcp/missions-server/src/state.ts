import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { contractPath, ensureMissionDirs, missionsDir, missionDir, statePath } from "./paths.js";
import { canTransition, MissionState, MissionStateSchema, Phase } from "./schema.js";

export function loadMission(id: string): MissionState {
  const p = statePath(id);
  if (!existsSync(p)) throw new Error(`Mission ${id} not found at ${p}`);
  const raw = JSON.parse(readFileSync(p, "utf8"));
  return MissionStateSchema.parse(raw);
}

export function saveMission(state: MissionState): MissionState {
  const updated = { ...state, updated_at: new Date().toISOString() };
  MissionStateSchema.parse(updated);
  ensureMissionDirs(updated.id);
  writeFileSync(statePath(updated.id), JSON.stringify(updated, null, 2) + "\n");
  return updated;
}

export function listMissions(): MissionState[] {
  const dir = missionsDir();
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const out: MissionState[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sp = statePath(e.name);
    if (!existsSync(sp)) continue;
    try {
      out.push(MissionStateSchema.parse(JSON.parse(readFileSync(sp, "utf8"))));
    } catch {
      // Skip malformed entries silently — better than crashing the whole list.
    }
  }
  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

export function transitionPhase(state: MissionState, to: Phase): MissionState {
  if (!canTransition(state.phase, to)) {
    throw new Error(`Illegal phase transition: ${state.phase} → ${to}`);
  }
  return { ...state, phase: to };
}

export function readContract(id: string): string {
  const p = contractPath(id);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

export function writeContract(id: string, body: string): void {
  ensureMissionDirs(id);
  writeFileSync(contractPath(id), body.endsWith("\n") ? body : body + "\n");
}

export function writeHandoffSummary(id: string, n: number, body: string): string {
  const file = path.join(missionDir(id), "handoffs", `${String(n).padStart(3, "0")}.md`);
  ensureMissionDirs(id);
  writeFileSync(file, body.endsWith("\n") ? body : body + "\n");
  return file;
}

export function writeValidationFindings(id: string, n: number, body: string): string {
  const file = path.join(missionDir(id), "validations", `${String(n).padStart(3, "0")}.md`);
  ensureMissionDirs(id);
  writeFileSync(file, body.endsWith("\n") ? body : body + "\n");
  return file;
}
