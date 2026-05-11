// Parse the structured frontmatter of a mission's contract.md.
//
// Format:
//   ---
//   assertions:
//     - id: file-exists
//       description: src/foo.ts exists
//       check: test -s src/foo.ts      # optional
//       timeout: 30                    # optional (seconds, default 60)
//   ---
//   # markdown body, freeform
//
// The frontmatter is OPTIONAL — older missions without it still parse and
// surface as { assertions: [] }, so callers (validator) can fall back to
// manual verification.

import { existsSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { z } from "zod";
import { contractPath } from "./paths.js";

export const AssertionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "assertion id must be kebab-case (lowercase + digits + hyphens)"),
  description: z.string().min(1),
  check: z.string().min(1).optional(),
  timeout: z.number().int().positive().max(600).optional(),
});

export type Assertion = z.infer<typeof AssertionSchema>;

export const ContractDataSchema = z.object({
  assertions: z.array(AssertionSchema).default([]),
});

export interface ParsedContract {
  /** Parsed frontmatter (assertions array always present, possibly empty). */
  data: { assertions: Assertion[] };
  /** Markdown body after the frontmatter. */
  body: string;
  /** True when frontmatter was present and parsed without error. */
  hasFrontmatter: boolean;
  /** Any frontmatter validation errors (non-fatal — assertions will be empty). */
  errors: string[];
}

const DEFAULT_TIMEOUT_S = 60;

export function parseContractFromString(raw: string): ParsedContract {
  const errors: string[] = [];
  let body = raw;
  let hasFrontmatter = false;
  let assertions: Assertion[] = [];

  try {
    const parsed = matter(raw);
    body = parsed.content;
    const hasFmKeys = parsed.data && Object.keys(parsed.data).length > 0;
    if (hasFmKeys) {
      hasFrontmatter = true;
      const result = ContractDataSchema.safeParse(parsed.data);
      if (!result.success) {
        errors.push(`contract frontmatter validation failed: ${result.error.message}`);
      } else {
        assertions = result.data.assertions;
        // Detect duplicate ids
        const seen = new Set<string>();
        for (const a of assertions) {
          if (seen.has(a.id)) errors.push(`duplicate assertion id: ${a.id}`);
          seen.add(a.id);
        }
      }
    }
  } catch (err) {
    errors.push(`gray-matter parse error: ${(err as Error).message}`);
  }

  return { data: { assertions }, body, hasFrontmatter, errors };
}

export function parseContract(mission_id: string): ParsedContract {
  const p = contractPath(mission_id);
  if (!existsSync(p)) {
    return { data: { assertions: [] }, body: "", hasFrontmatter: false, errors: [] };
  }
  return parseContractFromString(readFileSync(p, "utf8"));
}

export function effectiveTimeout(a: Assertion): number {
  return a.timeout ?? DEFAULT_TIMEOUT_S;
}
