import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.mjs', fullyParallel: false,
  workers: 1, retries: 0, reporter: [['list'], ['json', { outputFile: 'work/browser-results.json' }]],
  outputDir: 'work/browser-artifacts',
  use: { browserName: 'chromium', headless: true, baseURL: 'http://127.0.0.1:4173',
    launchOptions: process.env.RURU_BROWSER_PATH ? { executablePath: process.env.RURU_BROWSER_PATH } : {},
  },
  webServer: { command: 'node scripts/preview.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
