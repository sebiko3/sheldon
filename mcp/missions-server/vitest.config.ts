import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Fork-per-test so process.env.SHELDON_REPO_ROOT overrides in one test
    // don't leak into the next. Module-level constants (e.g. REPO_ROOT in
    // paths.ts) are evaluated at import-time, so we need a fresh process.
    pool: "forks",
    poolOptions: { forks: { singleFork: false } },
  },
});
