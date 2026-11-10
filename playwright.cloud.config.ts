import { defineConfig } from "@playwright/test";
const base = "/SHEN-LOVE-EMU-HOUJO/";
const site = `http://127.0.0.1:4175${base}`;
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/cloud.spec.ts", "**/*.cloud.spec.ts"],
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: site,
    headless: true,
    reducedMotion: "reduce",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4175",
    url: site,
    reuseExistingServer: false,
    env: {
      VITE_BASE_PATH: base,
      VITE_BACKEND_MODE: "supabase",
      VITE_SUPABASE_URL: "https://cozy-backend-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public_fixture_123456789",
    },
  },
});
