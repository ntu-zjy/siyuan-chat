import { defineConfig } from "vitest/config";

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Vitest doesn't run in a React Server Component context, so
      // `server-only` would throw on import. Stub it to a no-op so we can
      // unit-test code that legitimately ships with that guard in prod.
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    // tests/ holds Playwright .spec.ts files (run via `pnpm test:e2e`); keep
    // vitest scoped to src/ to avoid cross-runner contamination.
    exclude: ["**/tests/**", "**/node_modules/**"],
  },
});
