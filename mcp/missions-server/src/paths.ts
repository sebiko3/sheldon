import { mkdirSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.env.SHELDON_REPO_ROOT ?? process.cwd();

export function repoRoot(): string {
  return REPO_ROOT;
}

export function missionsDir(): string {
  return path.join(REPO_ROOT, ".missions");
}

export function missionDir(id: string): string {
  return path.join(missionsDir(), id);
}

export function statePath(id: string): string {
  return path.join(missionDir(id), "state.json");
}

export function contractPath(id: string): string {
  return path.join(missionDir(id), "contract.md");
}

export function handoffsDir(id: string): string {
  return path.join(missionDir(id), "handoffs");
}

export function validationsDir(id: string): string {
  return path.join(missionDir(id), "validations");
}

export function ensureMissionDirs(id: string): void {
  mkdirSync(missionDir(id), { recursive: true });
  mkdirSync(handoffsDir(id), { recursive: true });
  mkdirSync(validationsDir(id), { recursive: true });
}
