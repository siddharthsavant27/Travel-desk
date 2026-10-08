import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../e2e", testMatch: "concierge.spec.ts", workers: 1, retries: 0,
  reporter: "list", outputDir: "../test-results/concierge",
  use: { baseURL: process.env.CONCIERGE_BROWSER_ORIGIN ?? "http://127.0.0.1:3021", channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
});
