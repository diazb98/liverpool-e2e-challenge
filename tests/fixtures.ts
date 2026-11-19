import { test as base, expect } from '@playwright/test';
import { HomePage } from '../src/pages/HomePage';
import { SearchResultsPage } from '../src/pages/SearchResultsPage';

type Pages = {
  homePage: HomePage;
  resultsPage: SearchResultsPage;
};

export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  resultsPage: async ({ page }, use) => use(new SearchResultsPage(page)),
});

export { expect };
