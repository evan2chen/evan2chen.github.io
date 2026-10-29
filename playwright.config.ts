import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'site', testMatch: 'site.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4323', launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } } },
    { name: 'editor', testMatch: 'editor.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4322' } },
  ],
  webServer: [
    {
      command: 'npx astro preview --port 4323',
      url: 'http://localhost:4323',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/editor-sandbox.mjs 4322',
      url: 'http://localhost:4322',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
