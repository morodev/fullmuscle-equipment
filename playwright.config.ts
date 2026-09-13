import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome' } },
  ],
  webServer: {
    command: 'node dist/server/entry.mjs',
    url: 'http://127.0.0.1:4321/it/',
    env: { ...process.env, HOST: '127.0.0.1' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
