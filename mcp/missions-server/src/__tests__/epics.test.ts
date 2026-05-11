import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-epics-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync("git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", { cwd: TMP });
mkdirSync(path.join(TMP, ".missions"), { recursive: true });
mkdirSync(path.join(TMP, ".epics"), { recursive: true });
process.env.SHELDON_REPO_ROOT = TMP;

const { handleEpicCreate, handleEpicRead, handleEpicList, handleEpicPromoteIssue } = await import(
  "../tools.js"
);
const { saveEpic, readEpic } = await import("../epics.js");

function parseResult(result: { content: { type: string; text: string }[] }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe("epic tools — round-trip integration", () => {
  it("handleEpicCreate writes .epics/<id>/epic.md with valid frontmatter", async () => {
    const result = await handleEpicCreate({ brief: "improve sheldon by adding agents and tools" });
    const data = parseResult(result) as {
      epic_id: string;
      brief: string;
      created_at: string;
      issues: unknown[];
    };
    expect(data.epic_id).toBeTruthy();
    expect(data.brief).toBe("improve sheldon by adding agents and tools");
    expect(data.issues).toEqual([]);
    const epicFile = path.join(TMP, ".epics", data.epic_id, "epic.md");
    expect(existsSync(epicFile)).toBe(true);
  });

  it("handleEpicRead returns the epic after creation", async () => {
    const created = parseResult(
      await handleEpicCreate({ brief: "refactor TUI dashboard" }),
    ) as { epic_id: string };
    const read = parseResult(await handleEpicRead({ epic_id: created.epic_id })) as {
      id: string;
      brief: string;
      issues: unknown[];
    };
    expect(read.id).toBe(created.epic_id);
    expect(read.brief).toBe("refactor TUI dashboard");
    expect(read.issues).toEqual([]);
  });

  it("handleEpicList returns all epics", async () => {
    const created = parseResult(
      await handleEpicCreate({ brief: "add new analytics feature" }),
    ) as { epic_id: string };
    const listResult = parseResult(await handleEpicList({})) as {
      count: number;
      epics: { id: string }[];
    };
    expect(listResult.count).toBeGreaterThan(0);
    const ids = listResult.epics.map((e) => e.id);
    expect(ids).toContain(created.epic_id);
  });

  it("handleEpicPromoteIssue creates a mission and flips issue status to promoted", async () => {
    const created = parseResult(
      await handleEpicCreate({ brief: "build diagnostic doctor tool" }),
    ) as { epic_id: string };

    const epic = readEpic(created.epic_id);
    saveEpic({
      ...epic,
      issues: [
        {
          id: 1,
          title: "Mission Doctor diagnostic tool",
          rationale: "Detect orphaned mutex, stale missions, dangling branches",
          acceptance_sketch: [
            "mcp__missions__doctor returns structured findings",
            "/sheldon:mission-doctor skill present",
          ],
          status: "proposed",
          promoted_mission_id: null,
        },
      ],
    });

    const promoteResult = parseResult(
      await handleEpicPromoteIssue({ epic_id: created.epic_id, issue_id: 1 }),
    ) as { mission_id: string; epic_id: string; issue_id: number };

    expect(promoteResult.mission_id).toBeTruthy();
    expect(promoteResult.epic_id).toBe(created.epic_id);
    expect(promoteResult.issue_id).toBe(1);

    const stateFile = path.join(TMP, ".missions", promoteResult.mission_id, "state.json");
    expect(existsSync(stateFile)).toBe(true);

    const updatedEpic = readEpic(created.epic_id);
    const issue = updatedEpic.issues.find((i) => i.id === 1);
    expect(issue?.status).toBe("promoted");
    expect(issue?.promoted_mission_id).toBe(promoteResult.mission_id);
  });
});
