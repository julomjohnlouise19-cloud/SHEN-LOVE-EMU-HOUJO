import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testIgnore: '**/pages.spec.ts', fullyParallel: false, workers: 1, timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4173', headless: true, reducedMotion: 'reduce', launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
