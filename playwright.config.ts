import { defineConfig, devices, type Project } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Browsers to run, comma separated. Default: chrome only.
 * The site's bot protection rejects Playwright's bundled headless Chromium, so the
 * "chrome" project drives the real Google Chrome channel instead.
 */
const requested = (process.env.BROWSERS ?? 'chrome').split(',').map((b) => b.trim());

const browserProjects: Record<string, Project> = {
  chrome: { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testIgnore: /unit\// },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /unit\// },
  webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /unit\// },
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(isCI ? ([['github']] as const) : []),
  ],

  use: {
    // Headless by default. Run headed with `npm run test:headed` (or `--headed`).
    headless: true,
    locale: 'es-MX',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    // Configured here, never in test code:
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'unit', testMatch: /unit\/.*\.spec\.ts/ },
    ...requested.map((name) => {
      const project = browserProjects[name];
      if (!project) throw new Error(`Unknown browser "${name}". Use: ${Object.keys(browserProjects).join(', ')}`);
      return project;
    }),
  ],
});
