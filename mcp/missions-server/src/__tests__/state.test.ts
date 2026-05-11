import { describe, it, expect } from "vitest";
import { canTransition, PHASES, type Phase } from "../schema.js";

describe("state machine", () => {
  it("allows the canonical happy path", () => {
    const happy: Phase[] = [
      "planning",
      "contract_review",
      "implementing",
      "handed_off",
      "validating",
      "validated",
      "done",
    ];
    for (let i = 0; i < happy.length - 1; i++) {
      expect(canTransition(happy[i]!, happy[i + 1]!)).toBe(true);
    }
  });

  it("allows the rejection re-entry path", () => {
    expect(canTransition("validating", "rejected")).toBe(true);
    expect(canTransition("rejected", "implementing")).toBe(true);
  });

  it("allows abort from any non-terminal phase", () => {
    const nonTerminal: Phase[] = [
      "planning",
      "contract_review",
      "implementing",
      "handed_off",
      "validating",
      "validated",
      "rejected",
    ];
    for (const p of nonTerminal) {
      expect(canTransition(p, "aborted")).toBe(true);
    }
  });

  it("refuses skipping the contract phase", () => {
    expect(canTransition("planning", "implementing")).toBe(false);
    expect(canTransition("contract_review", "validating")).toBe(false);
  });

  it("refuses going backwards", () => {
    expect(canTransition("implementing", "planning")).toBe(false);
    expect(canTransition("validated", "implementing")).toBe(false);
  });

  it("terminal phases have no successors", () => {
    for (const to of PHASES) {
      expect(canTransition("done", to)).toBe(false);
      expect(canTransition("aborted", to)).toBe(false);
    }
  });
});
