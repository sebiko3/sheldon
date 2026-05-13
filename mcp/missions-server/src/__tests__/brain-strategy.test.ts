import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-strategy-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync(
  "git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init",
  { cwd: TMP },
);
mkdirSync(path.join(TMP, ".missions"), { recursive: true });
process.env.SHELDON_REPO_ROOT = TMP;

const { handleBrainObserve, handleBrainRecall } = await import("../tools.js");
const brain = await import("../brain.js");

function parseResult(result: { content: { type: string; text: string }[] }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe("brain strategy entries", () => {
  it("accepts a strategy entry with a complete outcome and persists it", async () => {
    const result = await handleBrainObserve({
      type: "strategy",
      topic: "mcp-tooling",
      text: "Spike the schema first, then update tools.ts and index.ts together so the type enum stays in lockstep.",
      outcome: {
        validator_passes_first_try: true,
        rework_loops: 0,
        mission_id: "01TESTMISSION0000000000000",
      },
    });
    const data = parseResult(result) as {
      ok: boolean;
      entry: { type: string; outcome?: { mission_id: string } };
    };
    expect(data.ok).toBe(true);
    expect(data.entry.type).toBe("strategy");
    expect(data.entry.outcome?.mission_id).toBe("01TESTMISSION0000000000000");

    const jsonl = readFileSync(
      path.join(TMP, ".sheldon", "brain", "entries.jsonl"),
      "utf8",
    );
    expect(jsonl).toContain("\"type\":\"strategy\"");
    expect(jsonl).toContain("validator_passes_first_try");
  });

  it("rejects a strategy entry missing the outcome field with a recognisable error", async () => {
    await expect(
      handleBrainObserve({
        type: "strategy",
        topic: "no-outcome",
        text: "An approach with no recorded outcome.",
      } as Parameters<typeof handleBrainObserve>[0]),
    ).rejects.toThrow(/strategy|outcome/i);
  });

  it("rejects a strategy entry whose outcome is missing a sub-field", async () => {
    await expect(
      handleBrainObserve({
        type: "strategy",
        topic: "partial-outcome",
        text: "An approach with an incomplete outcome.",
        // @ts-expect-error intentionally malformed for the test
        outcome: { validator_passes_first_try: true },
      }),
    ).rejects.toThrow(/strategy|outcome/i);
  });

  it("recall(type=strategy) ranks first-try true before false, then lower rework_loops", async () => {
    // Fresh entries for this assertion. The earlier 'accepts a strategy entry'
    // test already wrote one strategy entry; we add three more with distinct
    // outcomes and check ordering across the four.
    await handleBrainObserve({
      type: "strategy",
      topic: "approach-a-failed-twice",
      text: "Approach A",
      outcome: {
        validator_passes_first_try: false,
        rework_loops: 2,
        mission_id: "01M2",
      },
    });
    await new Promise((r) => setTimeout(r, 5));
    await handleBrainObserve({
      type: "strategy",
      topic: "approach-b-clean-first-try",
      text: "Approach B",
      outcome: {
        validator_passes_first_try: true,
        rework_loops: 0,
        mission_id: "01M1",
      },
    });
    await new Promise((r) => setTimeout(r, 5));
    await handleBrainObserve({
      type: "strategy",
      topic: "approach-c-first-try-with-rework",
      text: "Approach C",
      outcome: {
        validator_passes_first_try: true,
        rework_loops: 1,
        mission_id: "01M3",
      },
    });

    const result = await handleBrainRecall({ type: "strategy" });
    const data = parseResult(result) as {
      count: number;
      entries: { topic: string; outcome?: { validator_passes_first_try: boolean; rework_loops: number } }[];
    };

    // Filter to the three approaches we care about for this ordering check.
    const filtered = data.entries.filter((e) => e.topic.startsWith("approach-"));
    const order = filtered.map((e) => e.topic);
    expect(order).toEqual([
      "approach-b-clean-first-try",
      "approach-c-first-try-with-rework",
      "approach-a-failed-twice",
    ]);
  });

  it("non-strategy recall ordering is unchanged (newest-first) and outcome is ignored", async () => {
    await handleBrainObserve({
      type: "convention",
      topic: "older-convention-bc",
      text: "old",
    });
    await new Promise((r) => setTimeout(r, 5));
    await handleBrainObserve({
      type: "convention",
      topic: "newer-convention-bc",
      text: "new",
    });
    const result = await handleBrainRecall({ type: "convention" });
    const data = parseResult(result) as { entries: { topic: string }[] };
    // The most recently inserted convention should be first.
    const ours = data.entries.filter((e) => e.topic.endsWith("-convention-bc"));
    expect(ours[0]!.topic).toBe("newer-convention-bc");
    expect(ours[1]!.topic).toBe("older-convention-bc");
  });

  it("brain.recall() direct (no type) still sorts newest-first across mixed types", async () => {
    const all = brain.recall();
    // No specific assertion about strategy vs convention positions; just
    // ensure recall returns something and times are monotone non-increasing.
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.created_at >= all[i]!.created_at).toBe(true);
    }
  });
});
