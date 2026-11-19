import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { isSearchApiResponse } from '../api/searchApi';
import { settings, siteColorLabel } from '../config/settings';
import { parsePrice, type UiProduct } from '../utils/validation';
import { BasePage } from './BasePage';

export class SearchResultsPage extends BasePage {
  readonly cards: Locator;
  private readonly sortButton: Locator;

  constructor(page: Page) {
    super(page);
    this.cards = page.locator('section[data-testid$="-card"]');
    this.sortButton = page.getByText(settings.ui.sortDropdown).first();
  }

  async gotoSearch(term: string): Promise<void> {
    await this.open(`/tienda?s=${encodeURIComponent(term)}`);
    await this.waitForResults();
  }

  async waitForResults(): Promise<void> {
    await expect(this.cards.first()).toBeVisible();
  }

  /** Ticks the color checkbox and returns the XHR response the frontend used to refresh results. */
  async filterByColor(color: string): Promise<Response> {
    const label = siteColorLabel(color);
    const option = this.page
      .locator('[data-testid*="colors-filter"] label')
      .filter({ hasText: new RegExp(`^\\s*${label}`, 'i') });
    await expect(option, `Color filter "${label}" must be offered`).toHaveCount(1);

    const [response] = await Promise.all([
      this.page.waitForResponse(isSearchApiResponse()),
      option.click(),
    ]);
    await expect(option.locator('input')).toBeChecked();
    return response;
  }

  /**
   * Sorts and returns the XHR response that carries the sorted results.
   * The response is matched on the request body (sortOption) so we never
   * grab the previous, unsorted filter response by mistake.
   */
  async sortBy(sort = settings.sort): Promise<Response> {
    await this.sortButton.click();
    const [response] = await Promise.all([
      this.page.waitForResponse(isSearchApiResponse(sort.id)),
      this.page.getByText(sort.label, { exact: true }).first().click(),
    ]);
    await expect(this.page).toHaveURL(/sort=/);
    return response;
  }

  /** Resolves once the DOM shows the same first product the API returned (UI is in sync with response). */
  async waitForFirstProduct(productId: string): Promise<void> {
    await expect(this.cards.first()).toHaveAttribute('data-testid', `${productId}-card`);
  }

  async getTopProducts(count = settings.topN): Promise<UiProduct[]> {
    await expect(this.cards.nth(count - 1)).toBeVisible();
    const products: UiProduct[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.cards.nth(i);
      const testId = (await card.getAttribute('data-testid')) ?? '';
      const name = (await card.locator('h3').first().innerText()).trim();
      // Discounted items expose the current price in a "discounted" node (the "original" node is the
      // crossed-out one). Items without discount render the price directly in the price container.
      const priceBox = card.locator('[data-testid$="-price"]').first();
      const discounted = priceBox.locator('[data-testid="discounted"]');
      const priceNode = (await discounted.count()) > 0 ? discounted.first() : priceBox;
      const priceText = (await priceNode.textContent()) ?? '';
      products.push({ id: testId.replace(/-card$/, ''), name, price: parsePrice(priceText) });
    }
    return products;
  }
}
