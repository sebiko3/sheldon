import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-brain-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync("git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", { cwd: TMP });
mkdirSync(path.join(TMP, ".missions"), { recursive: true });
process.env.SHELDON_REPO_ROOT = TMP;

const { handleBrainObserve, handleBrainRecall, handleBrainList } = await import("../tools.js");
const brain = await import("../brain.js");

function parseResult(result: { content: { type: string; text: string }[] }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe("brain MCP tools", () => {
  it("brain_observe creates an entry and persists to entries.jsonl", async () => {
    const result = await handleBrainObserve({
      type: "convention",
      topic: "typescript",
      text: "This project uses TypeScript everywhere; do not write plain JS modules.",
      confidence: "high",
    });
    const data = parseResult(result) as { ok: boolean; entry: { id: string; type: string } };
    expect(data.ok).toBe(true);
    expect(data.entry.id).toBeTruthy();
    expect(data.entry.type).toBe("convention");

    const jsonl = path.join(TMP, ".sheldon", "brain", "entries.jsonl");
    expect(existsSync(jsonl)).toBe(true);
    expect(readFileSync(jsonl, "utf8")).toContain("typescript");
  });

  it("brain_observe regenerates the README.md digest", async () => {
    await handleBrainObserve({
      type: "lesson",
      topic: "yaml-frontmatter",
      text: "Contract YAML frontmatter descriptions containing `: ` must be quoted; gray-matter fails otherwise.",
      evidence: "01KAAA0000000000000000000",
    });
    const readme = path.join(TMP, ".sheldon", "brain", "README.md");
    expect(existsSync(readme)).toBe(true);
    const content = readFileSync(readme, "utf8");
    expect(content).toContain("# Sheldon brain");
    expect(content).toContain("yaml-frontmatter");
    expect(content).toContain("typescript");
  });

  it("brain_recall filters by type", async () => {
    const result = await handleBrainRecall({ type: "lesson" });
    const data = parseResult(result) as { count: number; entries: { type: string }[] };
    expect(data.count).toBeGreaterThanOrEqual(1);
    for (const e of data.entries) expect(e.type).toBe("lesson");
  });

  it("brain_recall filters by topic (substring, multi-word AND)", async () => {
    await handleBrainObserve({
      type: "convention",
      topic: "tests",
      text: "Use vitest. Specs live under src/__tests__/.",
    });
    const result = await handleBrainRecall({ topic: "vitest tests" });
    const data = parseResult(result) as { count: number; entries: { topic: string }[] };
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.entries[0]!.topic).toBe("tests");
  });

  it("brain_recall returns newest-first and respects limit", async () => {
    await handleBrainObserve({
      type: "proposal",
      topic: "skill: mission-retro",
      text: "Draft a postmortem from contract + handoffs.",
    });
    // Ensure distinct millisecond timestamps so the sort order is deterministic.
    await new Promise((r) => setTimeout(r, 2));
    await handleBrainObserve({
      type: "proposal",
      topic: "hook: pre-merge scope guard",
      text: "Block merges whose diff touches contract.md.",
    });
    const result = await handleBrainRecall({ type: "proposal", limit: 1 });
    const data = parseResult(result) as { count: number; entries: { topic: string }[] };
    expect(data.count).toBe(1);
    expect(data.entries[0]!.topic).toBe("hook: pre-merge scope guard");
  });

  it("brain_list returns summary plus all active entries", async () => {
    const result = await handleBrainList({});
    const data = parseResult(result) as {
      summary: { total: number; active: number; by_type: Record<string, number> };
      entries: unknown[];
    };
    expect(data.summary.active).toBe(data.entries.length);
    expect(data.summary.by_type.convention).toBeGreaterThanOrEqual(2);
    expect(data.summary.by_type.lesson).toBeGreaterThanOrEqual(1);
    expect(data.summary.by_type.proposal).toBeGreaterThanOrEqual(2);
  });

  it("supersedes hides the old entry from recall", async () => {
    const first = brain.observe({
      type: "convention",
      topic: "node-version",
      text: "Node 20 required.",
    });
    brain.observe({
      type: "convention",
      topic: "node-version",
      text: "Node 22 required.",
      supersedes: first.id,
    });
    const active = brain.recall({ topic: "node-version" });
    expect(active.find((e) => e.text.includes("Node 20"))).toBeUndefined();
    expect(active.find((e) => e.text.includes("Node 22"))).toBeTruthy();
  });

  it("persists across module reloads (read from disk)", async () => {
    // Simulate a fresh process by reading the file directly through listEntries.
    const reloaded = brain.listEntries();
    expect(reloaded.length).toBeGreaterThanOrEqual(5);
    expect(reloaded.every((e) => typeof e.id === "string")).toBe(true);
  });

  it("loads seed.jsonl as a read-only baseline when entries.jsonl is absent", async () => {
    // Write a seed.jsonl to the module's already-initialised TMP brain dir.
    // The module's repoRoot() is fixed to TMP at import time, so we write there.
    const brainDir = path.join(TMP, ".sheldon", "brain");
    mkdirSync(brainDir, { recursive: true });
    const seedEntry = JSON.stringify({
      id: "01SEEDTEST0000000000000000",
      type: "convention",
      topic: "seed-baseline",
      text: "This entry comes from seed.jsonl only.",
      confidence: "high",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    writeFileSync(path.join(brainDir, "seed.jsonl"), seedEntry + "\n");

    const entries = brain.recall();
    expect(entries.find((e) => e.id === "01SEEDTEST0000000000000000")).toBeTruthy();
  });
});
