import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

// active.ts uses paths.ts which reads SHELDON_REPO_ROOT at module load. Set
// the env var BEFORE importing.
const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-active-test-"));
mkdirSync(path.join(TMP, ".missions"), { recursive: true });
process.env.SHELDON_REPO_ROOT = TMP;

const active = await import("../active.js");

describe("active-mission mutex", () => {
  beforeEach(() => active.clearActive());

  it("read returns null when no marker exists", () => {
    expect(active.readActive()).toBeNull();
  });

  it("write/read round-trips the marker", () => {
    active.writeActive({ mission_id: "abc", role: "worker", started_at: "2026-01-01T00:00:00Z" });
    expect(active.readActive()).toEqual({
      mission_id: "abc",
      role: "worker",
      started_at: "2026-01-01T00:00:00Z",
    });
  });

  it("clearActive removes the marker", () => {
    active.writeActive({ mission_id: "abc", role: "worker", started_at: "x" });
    active.clearActive();
    expect(active.readActive()).toBeNull();
  });

  it("assertActiveMatchesOrUnset is a no-op when unset", () => {
    expect(() => active.assertActiveMatchesOrUnset("any")).not.toThrow();
  });

  it("assertActiveMatchesOrUnset is a no-op when the marker is for the same mission", () => {
    active.writeActive({ mission_id: "alpha", role: "worker", started_at: "x" });
    expect(() => active.assertActiveMatchesOrUnset("alpha")).not.toThrow();
  });

  it("assertActiveMatchesOrUnset throws when the marker is for a different mission", () => {
    active.writeActive({ mission_id: "alpha", role: "worker", started_at: "x" });
    expect(() => active.assertActiveMatchesOrUnset("beta")).toThrowError(
      /another mission is currently active/,
    );
  });
});
