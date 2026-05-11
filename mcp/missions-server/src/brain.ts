import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import path from "node:path";
import { ulid } from "ulid";
import { z } from "zod";
import { repoRoot } from "./paths.js";

export const BRAIN_TYPES = [
  "convention",
  "lesson",
  "proposal",
  "agent-improvement",
] as const;
export type BrainEntryType = (typeof BRAIN_TYPES)[number];

export const BRAIN_CONFIDENCE = ["low", "medium", "high"] as const;
export type BrainConfidence = (typeof BRAIN_CONFIDENCE)[number];

export const BrainEntrySchema = z.object({
  id: z.string(),
  type: z.enum(BRAIN_TYPES),
  topic: z.string().min(1),
  text: z.string().min(1),
  evidence: z.string().optional(),
  confidence: z.enum(BRAIN_CONFIDENCE).default("medium"),
  created_at: z.string(),
  superseded_by: z.string().optional(),
});
export type BrainEntry = z.infer<typeof BrainEntrySchema>;

function brainDir(): string {
  return path.join(repoRoot(), ".sheldon", "brain");
}

function entriesPath(): string {
  return path.join(brainDir(), "entries.jsonl");
}

function digestPath(): string {
  return path.join(brainDir(), "README.md");
}

function ensureBrainDir(): void {
  mkdirSync(brainDir(), { recursive: true });
}

export function listEntries(): BrainEntry[] {
  const p = entriesPath();
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8");
  const out: BrainEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(BrainEntrySchema.parse(JSON.parse(trimmed)));
    } catch {
      // Skip malformed lines silently — append-only log; corruption on one
      // line should not poison the rest.
    }
  }
  return out;
}

export function observe(input: {
  type: BrainEntryType;
  topic: string;
  text: string;
  evidence?: string;
  confidence?: BrainConfidence;
  supersedes?: string;
}): BrainEntry {
  ensureBrainDir();
  const entry: BrainEntry = {
    id: ulid(),
    type: input.type,
    topic: input.topic.trim(),
    text: input.text.trim(),
    evidence: input.evidence,
    confidence: input.confidence ?? "medium",
    created_at: new Date().toISOString(),
  };
  BrainEntrySchema.parse(entry);
  appendFileSync(entriesPath(), JSON.stringify(entry) + "\n");

  if (input.supersedes) {
    // Mark the superseded entry without rewriting the log: append a tombstone
    // record whose `superseded_by` references the new entry. Recall folds
    // these into the active set.
    const tombstone: BrainEntry & { tombstone: true } = {
      ...entry,
      id: input.supersedes,
      superseded_by: entry.id,
      tombstone: true,
    };
    appendFileSync(entriesPath(), JSON.stringify(tombstone) + "\n");
  }

  return entry;
}

function activeEntries(all: BrainEntry[]): BrainEntry[] {
  // Fold tombstones: the latest record for any given id wins. If the latest
  // record carries `superseded_by`, the entry is suppressed from recall.
  const latest = new Map<string, BrainEntry>();
  for (const e of all) {
    latest.set(e.id, e);
  }
  return [...latest.values()].filter((e) => !e.superseded_by);
}

export function recall(input?: {
  topic?: string;
  type?: BrainEntryType;
  limit?: number;
}): BrainEntry[] {
  const all = listEntries();
  const active = activeEntries(all);
  let filtered = active;
  if (input?.type) {
    filtered = filtered.filter((e) => e.type === input.type);
  }
  if (input?.topic) {
    const needle = input.topic.toLowerCase();
    const terms = needle.split(/\s+/).filter(Boolean);
    filtered = filtered.filter((e) => {
      const hay = (e.topic + " " + e.text).toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  filtered.sort((a, b) => {
    const byTime = b.created_at.localeCompare(a.created_at);
    if (byTime !== 0) return byTime;
    // Tie-breaker: ulid lexicographic order (later ulid sorts higher).
    return b.id.localeCompare(a.id);
  });
  if (input?.limit && input.limit > 0) {
    filtered = filtered.slice(0, input.limit);
  }
  return filtered;
}

export interface BrainSummary {
  total: number;
  active: number;
  by_type: Record<BrainEntryType, number>;
}

export function summarize(): BrainSummary {
  const all = listEntries();
  const active = activeEntries(all);
  const by_type = Object.fromEntries(BRAIN_TYPES.map((t) => [t, 0])) as Record<
    BrainEntryType,
    number
  >;
  for (const e of active) by_type[e.type]++;
  return { total: all.length, active: active.length, by_type };
}

export function regenerateDigest(): string {
  ensureBrainDir();
  const all = recall();
  const groups: Record<BrainEntryType, BrainEntry[]> = {
    convention: [],
    lesson: [],
    proposal: [],
    "agent-improvement": [],
  };
  for (const e of all) groups[e.type].push(e);

  const lines: string[] = [];
  lines.push("# Sheldon brain");
  lines.push("");
  lines.push(
    "Auto-generated from `.sheldon/brain/entries.jsonl`. Do not edit by hand — use the `brain_observe` MCP tool or `/sheldon:brain-learn`.",
  );
  lines.push("");
  const sections: { type: BrainEntryType; title: string; intro: string }[] = [
    {
      type: "convention",
      title: "Project conventions",
      intro:
        "Project-specific facts Sheldon has learned while working here (build tools, test runners, style rules, layout).",
    },
    {
      type: "lesson",
      title: "Lessons",
      intro:
        "Meta-rules distilled from past mission outcomes — apply these to future contracts and implementations.",
    },
    {
      type: "agent-improvement",
      title: "Agent improvements",
      intro:
        "Proposed or applied tweaks to `agents/*.md`. Workers/Validators should not auto-apply; the Orchestrator promotes these into missions.",
    },
    {
      type: "proposal",
      title: "Capability proposals",
      intro:
        "Net-new capabilities (skills, hooks, scripts, agents) the brain has identified as worth shipping. Fed into the cowork loop.",
    },
  ];

  for (const s of sections) {
    lines.push(`## ${s.title}`);
    lines.push("");
    lines.push(s.intro);
    lines.push("");
    if (groups[s.type].length === 0) {
      lines.push("_(none yet)_");
      lines.push("");
      continue;
    }
    for (const e of groups[s.type]) {
      const evidence = e.evidence ? ` _(evidence: ${e.evidence})_` : "";
      lines.push(`- **${e.topic}** [${e.confidence}]${evidence}`);
      for (const para of e.text.split("\n")) {
        lines.push(`  ${para}`);
      }
      lines.push("");
    }
  }

  const out = lines.join("\n");
  writeFileSync(digestPath(), out);
  return out;
}
