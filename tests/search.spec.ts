import { parseSearchResponse } from '../src/api/searchApi';
import { getSearchCases, settings } from '../src/config/settings';
import { crossValidate } from '../src/utils/validation';
import { expect, test } from './fixtures';

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

for (const { term, color } of getSearchCases()) {
  test(`search "${term}" → color ${color} → lowest price: UI matches network response`, async ({
    homePage,
    resultsPage,
  }, testInfo) => {
    await test.step('Navigate to Liverpool and search', async () => {
      await homePage.goto();
      await homePage.search(term);
      await resultsPage.waitForResults();
    });

    await test.step(`Filter by color "${color}"`, async () => {
      await resultsPage.filterByColor(color);
    });

    // The response consumed by the frontend for the final (filtered + sorted) state.
    const sortResponse = await test.step('Sort by price: lowest to highest (intercept results XHR)', () =>
      resultsPage.sortBy());

    const records = await parseSearchResponse(sortResponse);
    expect(records.length, 'Intercepted response should contain products').toBeGreaterThan(0);
    await resultsPage.waitForFirstProduct(records[0].productId);

    const uiProducts = await test.step(`Extract first ${settings.topN} results from the UI`, () =>
      resultsPage.getTopProducts());

    console.log(`\nTop ${settings.topN} for "${term}" (${color}, lowest price first):`);
    uiProducts.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} — ${money(p.price)}`));

    await test.step('Cross-validate UI against intercepted response', async () => {
      const result = crossValidate(uiProducts, records);

      if (result.discrepancies.length > 0) {
        console.log('\nDiscrepancies between UI and response:');
        result.discrepancies.forEach((d) => console.log(`  [${d.kind}] ${d.ui.name}: ${d.detail}`));
      } else {
        console.log('\nNo discrepancies between UI and response.');
      }

      await testInfo.attach('ui-vs-response.json', {
        body: JSON.stringify({ uiProducts, result }, null, 2),
        contentType: 'application/json',
      });

      expect(
        result.matched,
        `${result.matched}/${result.total} UI products found in response (need ≥ ${settings.minMatches})`,
      ).toBeGreaterThanOrEqual(settings.minMatches);

      // Stronger, non-blocking signals: consistency of data and ordering.
      expect.soft(result.discrepancies.filter((d) => d.kind === 'price'), 'price discrepancies').toEqual([]);
      expect.soft(result.orderMatches, 'UI order equals response order').toBe(true);
      const prices = uiProducts.map((p) => p.price);
      expect.soft(prices, 'prices sorted ascending').toEqual([...prices].sort((a, b) => a - b));
    });
  });
}
