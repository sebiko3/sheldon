import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface EpicIssue {
  id: number;
  title: string;
  rationale: string;
  acceptance_sketch: string[];
  status: "proposed" | "promoted" | "declined";
  promoted_mission_id: string | null;
}

export interface Epic {
  id: string;
  brief: string;
  created_at: string;
  issues: EpicIssue[];
}

export function epicsDir(repoRoot: string): string {
  return path.join(repoRoot, ".epics");
}

export function loadAllEpics(repoRoot: string): Epic[] {
  const dir = epicsDir(repoRoot);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const out: Epic[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const epicFile = path.join(dir, e.name, "epic.md");
    if (!existsSync(epicFile)) continue;
    try {
      const raw = readFileSync(epicFile, "utf8");
      const parsed = matter(raw);
      const data = parsed.data as Partial<Epic>;
      if (!data.id || !data.brief) continue;
      out.push({
        id: data.id,
        brief: data.brief,
        created_at: data.created_at ?? "",
        issues: Array.isArray(data.issues) ? (data.issues as EpicIssue[]) : [],
      });
    } catch {
      // Skip malformed entries silently.
    }
  }
  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}
