import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1676, height: 955 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1676, height: 955 } } }],
  webServer: [
    { command: "node tests/support/auth-service.mjs", url: "http://127.0.0.1:54331/health", reuseExistingServer: false },
    {
      command: "npm run build && npx --no-install next start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { TOPH_E2E: "1", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_only" },
    },
  ],
});
