import { describe, it, expect } from "vitest";
import { parseContractFromString } from "../contract.js";

describe("parseContractFromString", () => {
  it("parses a well-formed contract with assertions", () => {
    const raw = `---
assertions:
  - id: file-exists
    description: src/foo.ts exists
    check: test -s src/foo.ts
  - id: tests-pass
    description: vitest passes
    check: npm test
    timeout: 120
---

# Validation contract

Goal: example.
`;
    const out = parseContractFromString(raw);
    expect(out.hasFrontmatter).toBe(true);
    expect(out.errors).toHaveLength(0);
    expect(out.data.assertions).toHaveLength(2);
    expect(out.data.assertions[0]).toMatchObject({
      id: "file-exists",
      description: "src/foo.ts exists",
      check: "test -s src/foo.ts",
    });
    expect(out.data.assertions[1]?.timeout).toBe(120);
    expect(out.body).toContain("# Validation contract");
  });

  it("returns empty assertions when no frontmatter is present", () => {
    const raw = "# Just a markdown contract\n\n1. foo\n2. bar\n";
    const out = parseContractFromString(raw);
    expect(out.hasFrontmatter).toBe(false);
    expect(out.errors).toHaveLength(0);
    expect(out.data.assertions).toHaveLength(0);
    expect(out.body).toContain("Just a markdown contract");
  });

  it("flags duplicate assertion ids", () => {
    const raw = `---
assertions:
  - id: dup
    description: first
    check: "true"
  - id: dup
    description: second
    check: "true"
---

body
`;
    const out = parseContractFromString(raw);
    expect(out.errors.join(" ")).toMatch(/duplicate assertion id: dup/);
  });

  it("rejects invalid id casing", () => {
    const raw = `---
assertions:
  - id: BadCasing
    description: x
    check: "true"
---

body
`;
    const out = parseContractFromString(raw);
    expect(out.errors.length).toBeGreaterThan(0);
    expect(out.errors.join(" ")).toMatch(/kebab-case/);
  });

  it("accepts prose-only assertions (no check)", () => {
    const raw = `---
assertions:
  - id: judgment-call
    description: please reason about this manually
---

body
`;
    const out = parseContractFromString(raw);
    expect(out.errors).toHaveLength(0);
    expect(out.data.assertions[0]?.check).toBeUndefined();
  });
});
