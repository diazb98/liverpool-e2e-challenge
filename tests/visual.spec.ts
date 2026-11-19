import { getSearchCases } from '../src/config/settings';
import { expect, test } from './fixtures';

const { term } = getSearchCases()[0];

// Baselines are rendered on Linux (the CI runner) with Chrome: font rasterisation differs per OS,
// so comparing a Windows/macOS render against them would fail for reasons that are not regressions.
// Regenerate with the "update_snapshots" input of the Tests workflow (see README).
test.skip(process.platform !== 'linux', 'Visual baselines are Linux-only (CI)');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', 'Visual baselines are Chrome-only');
});

test(`visual: layout of search results for "${term}"`, async ({ page, resultsPage }) => {
  await resultsPage.gotoSearch(term);

  // Prices, stock, banners and facet counters change daily: mask them and compare the page
  // *structure* (header, breadcrumb, sort bar, filter panel frame, grid layout).
  const dynamic = [
    resultsPage.cards.first().locator('xpath=ancestor::div[contains(@class,"grid")][1]'),
    page.getByText(/\d[\d,]*\s+art[ií]culos/),
    page.locator('[data-testid="plp-page-plp-filter"]'),
    page.locator('[class*="fixed"]'), // cookie banner and floating widgets
  ];

  await expect(page).toHaveScreenshot('search-results-layout.png', {
    mask: dynamic,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.03,
  });
});
