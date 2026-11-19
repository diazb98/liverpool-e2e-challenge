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

    await this.dismissCookieNotice();
    const checkbox = option.locator('input');
    const filterId = (await checkbox.getAttribute('value')) ?? label;

    // Clicks made before the page hydrates are silently lost (observed on Firefox and, rarely, Chrome
    // in CI). Retry until the filter is really applied. Only click when unchecked, so a retry can
    // never toggle the filter back off, and only accept the XHR whose request carries this filter
    // (not a stray background call to the same endpoint).
    let response: Response | undefined;
    await expect(async () => {
      if (!(await checkbox.isChecked())) {
        [response] = await Promise.all([
          this.page.waitForResponse(isSearchApiResponse(filterId), { timeout: 8_000 }),
          option.click({ timeout: 5_000 }),
        ]);
      }
      await expect(checkbox).toBeChecked({ timeout: 3_000 });
    }).toPass({ timeout: 40_000 });

    if (!response) throw new Error(`No search response captured after applying filter "${label}"`);
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
