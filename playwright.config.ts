import { defineConfig, devices, type Project } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Navegadores a ejecutar, separados por coma. Por defecto: solo chrome.
 * La protección anti-bot del sitio rechaza el Chromium headless que trae Playwright, así que
 * el proyecto "chrome" usa el canal de Google Chrome real.
 */
const requested = (process.env.BROWSERS ?? 'chrome').split(',').map((b) => b.trim());

const browserProjects: Record<string, Project> = {
  chrome: { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testIgnore: /unit\// },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /unit\// },
  edge: { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' }, testIgnore: /unit\// },
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
    // Headless por defecto. Para ver el navegador: `npm run test:headed` (o `--headed`).
    headless: true,
    locale: 'es-MX',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    // Se configuran aquí, nunca en el código de las pruebas:
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
