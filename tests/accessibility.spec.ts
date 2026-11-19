import AxeBuilder from '@axe-core/playwright';
import { getSearchCases, settings } from '../src/config/settings';
import { expect, test } from './fixtures';

const { term } = getSearchCases()[0];

test(`a11y: axe scan of search results for "${term}"`, async ({ page, resultsPage }, testInfo) => {
  await resultsPage.gotoSearch(term);

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }));
  console.log(`\naxe: ${violations.length} violation type(s) on the results page`);
  summary.forEach((v) => console.log(`  [${v.impact}] ${v.id} (${v.nodes} nodes) — ${v.help}`));

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  // Sitio de terceros: por defecto solo se reporta; falla únicamente si se pide de forma explícita.
  if (settings.a11yStrict) {
    const blocking = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(blocking.map((v) => v.id), 'serious/critical a11y violations').toEqual([]);
  }
});
