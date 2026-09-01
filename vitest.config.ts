import { defineConfig } from "vitest/config";

const COVERAGE_REPORTERS = ["text", "html"] as const;
const TEST_FILE_PATTERNS = [
  "packages/**/*.test.ts",
  "packages/**/*.test.tsx",
] as const;

export default defineConfig({
  test: {
    coverage: {
      reporter: COVERAGE_REPORTERS,
    },
    include: TEST_FILE_PATTERNS,
  },
});
