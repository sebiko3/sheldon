import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-resume-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync(
  "git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init",
  { cwd: TMP },
);
mkdirSync(path.join(TMP, ".missions"), { recursive: true });
process.env.SHELDON_REPO_ROOT = TMP;

const { handleResume } = await import("../tools.js");

function parseResult(result: { content: { type: string; text: string }[] }): unknown {
  return JSON.parse(result.content[0]!.text);
}

function seedMission(id: string, phase: string): string {
  const dir = path.join(TMP, ".missions", id);
  mkdirSync(dir, { recursive: true });
  const state = {
    id,
    goal: "test",
    phase,
    branch: `mission/${id}`,
    base_commit: "deadbeef",
    created_at: "2026-05-13T00:00:00Z",
    updated_at: "2026-05-13T00:00:00Z",
    current_role: phase === "implementing" ? "worker" : "orchestrator",
    contract_path: `.missions/${id}/contract.md`,
    handoffs: [],
    validation_runs: [],
  };
  writeFileSync(path.join(dir, "state.json"), JSON.stringify(state, null, 2));
  return dir;
}

describe("handleResume", () => {
  it("returns last_checkpoint=null and a next_action_hint when no checkpoints exist", async () => {
    const id = "01RESUMETEST0000000000000A";
    seedMission(id, "implementing");
    const result = await handleResume({ mission_id: id });
    const data = parseResult(result) as {
      mission_id: string;
      phase: string;
      last_checkpoint: unknown;
      next_action_hint: string;
    };
    expect(data.mission_id).toBe(id);
    expect(data.phase).toBe("implementing");
    expect(data.last_checkpoint).toBeNull();
    expect(data.next_action_hint).toMatch(/worker/i);
  });

  it("returns the highest-numbered checkpoint when several exist", async () => {
    const id = "01RESUMETEST0000000000000B";
    const dir = seedMission(id, "validating");
    const cps = path.join(dir, "checkpoints");
    mkdirSync(cps, { recursive: true });
    writeFileSync(
      path.join(cps, "001.json"),
      JSON.stringify({ mission_id: id, phase: "implementing", timestamp: "2026-05-13T00:00:01Z" }),
    );
    writeFileSync(
      path.join(cps, "002.json"),
      JSON.stringify({ mission_id: id, phase: "handed_off", timestamp: "2026-05-13T00:00:02Z" }),
    );
    writeFileSync(
      path.join(cps, "003.json"),
      JSON.stringify({
        mission_id: id,
        phase: "validating",
        timestamp: "2026-05-13T00:00:03Z",
        last_validator_verdict: "fail",
      }),
    );
    const result = await handleResume({ mission_id: id });
    const data = parseResult(result) as {
      phase: string;
      last_checkpoint: { phase: string; timestamp: string; last_validator_verdict?: string };
      next_action_hint: string;
    };
    expect(data.last_checkpoint.phase).toBe("validating");
    expect(data.last_checkpoint.timestamp).toBe("2026-05-13T00:00:03Z");
    expect(data.last_checkpoint.last_validator_verdict).toBe("fail");
    expect(data.next_action_hint).toMatch(/run_assertions|validator/i);
  });

  it("maps every defined phase to a non-empty next_action_hint", async () => {
    const phases = [
      "planning",
      "contract_review",
      "implementing",
      "handed_off",
      "validating",
      "validated",
      "rejected",
      "done",
      "aborted",
    ];
    for (const phase of phases) {
      const id = `01RESUMETEST${phase.padEnd(15, "X").slice(0, 15).toUpperCase()}`;
      seedMission(id, phase);
      const result = await handleResume({ mission_id: id });
      const data = parseResult(result) as { next_action_hint: string };
      expect(data.next_action_hint).toBeTruthy();
      expect(data.next_action_hint.length).toBeGreaterThan(0);
    }
  });
});
