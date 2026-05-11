import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import matter from "gray-matter";
import { epicDir, epicFilePath, ensureEpicDir, epicsDir } from "./paths.js";
import { Epic, EpicIssue, EpicSchema } from "./schema.js";

function serialize(epic: Epic): string {
  const { id, brief, created_at, issues } = epic;
  const frontmatter = matter.stringify(`\n# Epic ${id}\n`, { id, brief, created_at, issues });
  return frontmatter;
}

function parse(raw: string): Epic {
  const parsed = matter(raw);
  return EpicSchema.parse(parsed.data);
}

export function createEpic(id: string, brief: string): Epic {
  ensureEpicDir(id);
  const epic: Epic = {
    id,
    brief,
    created_at: new Date().toISOString(),
    issues: [],
  };
  writeFileSync(epicFilePath(id), serialize(epic));
  return epic;
}

export function readEpic(id: string): Epic {
  const p = epicFilePath(id);
  if (!existsSync(p)) throw new Error(`Epic ${id} not found at ${p}`);
  return parse(readFileSync(p, "utf8"));
}

export function saveEpic(epic: Epic): void {
  ensureEpicDir(epic.id);
  writeFileSync(epicFilePath(epic.id), serialize(epic));
}

export function listEpics(): Epic[] {
  const dir = epicsDir();
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const out: Epic[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = epicFilePath(e.name);
    if (!existsSync(p)) continue;
    try {
      out.push(parse(readFileSync(p, "utf8")));
    } catch {
      // Skip malformed entries silently.
    }
  }
  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

export function promoteIssue(epicId: string, issueId: number, missionId: string): EpicIssue {
  const epic = readEpic(epicId);
  const issueIdx = epic.issues.findIndex((i) => i.id === issueId);
  if (issueIdx === -1) throw new Error(`Issue ${issueId} not found in epic ${epicId}`);
  const issue = epic.issues[issueIdx]!;
  const updated: EpicIssue = { ...issue, status: "promoted", promoted_mission_id: missionId };
  const updatedIssues = [...epic.issues];
  updatedIssues[issueIdx] = updated;
  saveEpic({ ...epic, issues: updatedIssues });
  return updated;
}
