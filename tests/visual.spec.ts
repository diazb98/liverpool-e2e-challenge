import { getSearchCases } from '../src/config/settings';
import { expect, test } from './fixtures';

const { term } = getSearchCases()[0];

// Las baselines se generan en Linux (el runner de CI) con Chrome: el renderizado de fuentes cambia
// según el sistema operativo, así que compararlas con un render de Windows/macOS fallaría por
// motivos que no son regresiones.
// Se regeneran con la entrada "update_snapshots" del workflow Tests (ver README).
test.skip(process.platform !== 'linux', 'Visual baselines are Linux-only (CI)');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', 'Visual baselines are Chrome-only');
});

test(`visual: layout of search results for "${term}"`, async ({ page, resultsPage }) => {
  await resultsPage.gotoSearch(term);

  // Precios, stock, banners y contadores de filtros cambian a diario: se enmascaran y se compara
  // solo la *estructura* de la página (header, breadcrumb, barra de orden, marco de filtros, grid).
  const dynamic = [
    resultsPage.cards.first().locator('xpath=ancestor::div[contains(@class,"grid")][1]'),
    page.getByText(/\d[\d,]*\s+art[ií]culos/),
    page.locator('[data-testid="plp-page-plp-filter"]'),
    page.locator('[class*="fixed"]'), // banner de cookies y widgets flotantes
  ];

  await expect(page).toHaveScreenshot('search-results-layout.png', {
    mask: dynamic,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.03,
  });
});
