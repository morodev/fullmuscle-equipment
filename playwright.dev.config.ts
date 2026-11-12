import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/gf-dev.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 360_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir: 'test-results/dev-cache',
  use: {
    baseURL: 'http://127.0.0.1:4331',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'desktop-dev', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Keep this instance in the foreground without replacing the user's dev-server lock.
    command: 'npm run dev -- --host 127.0.0.1 --port 4331 --ignore-lock',
    url: 'http://127.0.0.1:4331/',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PUBLIC_SITE_READY: 'false',
      FULLMUSCLE_E2E_DEV: 'true',
      ASTRO_TELEMETRY_DISABLED: '1',
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
