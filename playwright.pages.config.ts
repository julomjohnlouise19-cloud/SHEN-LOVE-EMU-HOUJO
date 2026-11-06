import { defineConfig } from '@playwright/test';
const basePath = process.env.VITE_BASE_PATH || '/SHEN-LOVE-EMU-HOUJO/';
const site = `http://127.0.0.1:4174${basePath}`;
export default defineConfig({
  testDir: './e2e', testMatch: '**/pages.spec.ts', workers: 1, timeout: 60_000,
  use: { baseURL: site, headless: true, reducedMotion: 'reduce', launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4174', url: site, env: { VITE_BASE_PATH: basePath }, reuseExistingServer: false },
});
