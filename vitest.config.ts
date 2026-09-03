import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // The default "forks" pool can't spawn child processes in some sandboxed
    // dev environments (this one included); "threads" works everywhere.
    pool: "threads",
    // Playwright owns everything under e2e/ — without this exclude, Vitest's
    // default *.spec.ts glob picks those files up too and tries to run them
    // against Playwright's incompatible `test` fixtures.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
