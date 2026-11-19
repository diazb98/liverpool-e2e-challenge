import { getSearchCases, settings } from '../src/config/settings';
import { expect, test } from './fixtures';

const { term } = getSearchCases()[0];

test(`performance: results for "${term}" visible within budget`, async ({ page, resultsPage }) => {
  const start = Date.now();
  await resultsPage.gotoSearch(term); // includes first product card visible
  const visibleMs = Date.now() - start;

  // loadEventEnd is 0 until the load event has finished, so wait for it before reading timings.
  await page.waitForLoadState('load');
  const nav = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return { domContentLoaded: Math.round(entry.domContentLoadedEventEnd), load: Math.round(entry.loadEventEnd) };
  });

  console.log(
    `\nperf: results visible in ${visibleMs} ms (DCL ${nav.domContentLoaded} ms, load ${nav.load} ms) — budget ${settings.perfBudgetMs} ms`,
  );
  expect(visibleMs, 'time until first product card is visible').toBeLessThan(settings.perfBudgetMs);
});
