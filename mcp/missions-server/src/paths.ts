import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

function resolveRepoRoot(): string {
  const raw = process.env.SHELDON_REPO_ROOT;
  // Treat unexpanded "${...}" placeholders (some MCP launchers leave these
  // literal) and non-existent paths as unset; fall back to cwd, which Claude
  // Code sets to the project directory when spawning MCP servers.
  if (!raw || /^\$\{[^}]+\}$/.test(raw) || !existsSync(raw)) {
    if (raw && !existsSync(raw)) {
      process.stderr.write(
        `[missions] SHELDON_REPO_ROOT=${JSON.stringify(raw)} does not exist; falling back to cwd=${process.cwd()}\n`,
      );
    }
    return process.cwd();
  }
  return raw;
}

const REPO_ROOT = resolveRepoRoot();
process.stderr.write(`[missions] repo root = ${REPO_ROOT}\n`);

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

export function epicsDir(): string {
  return path.join(REPO_ROOT, ".epics");
}

export function epicDir(id: string): string {
  return path.join(epicsDir(), id);
}

export function epicFilePath(id: string): string {
  return path.join(epicDir(id), "epic.md");
}

export function ensureEpicDir(id: string): void {
  mkdirSync(epicDir(id), { recursive: true });
}
