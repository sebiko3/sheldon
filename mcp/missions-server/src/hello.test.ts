import { describe, it, expect } from "vitest";
import { greet } from "./hello.js";

describe("greet", () => {
  it("returns a string containing the given name", () => {
    expect(greet("World")).toContain("World");
  });
});
