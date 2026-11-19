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
    await this.open(`${settings.searchPath}?s=${encodeURIComponent(term)}`);
    await this.waitForResults();
  }

  async waitForResults(): Promise<void> {
    await expect(this.cards.first()).toBeVisible();
  }

  /** Marca el checkbox de color y devuelve la respuesta XHR que usó el frontend para refrescar los resultados. */
  async filterByColor(color: string): Promise<Response> {
    const label = siteColorLabel(color);
    const option = this.page
      .locator('[data-testid*="colors-filter"] label')
      .filter({ hasText: new RegExp(`^\\s*${label}`, 'i') });
    await expect(option, `Color filter "${label}" must be offered`).toHaveCount(1);

    await this.dismissCookieNotice();
    const checkbox = option.locator('input');
    const filterId = (await checkbox.getAttribute('value')) ?? label;

    // Los clics hechos antes de que la página hidrate se pierden sin avisar (observado en Firefox y,
    // rara vez, en Chrome en CI). Se reintenta hasta que el filtro quede realmente aplicado. Solo se
    // hace clic si está sin marcar, para que un reintento nunca lo desactive, y solo se acepta el XHR
    // cuya petición lleva este filtro (no una llamada de fondo al mismo endpoint).
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
   * Ordena y devuelve la respuesta XHR que trae los resultados ordenados.
   * La respuesta se identifica por el cuerpo de la petición (sortOption) para no tomar
   * por error la respuesta anterior del filtro, que aún no estaba ordenada.
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

  /** Se resuelve cuando el DOM muestra el mismo primer producto que devolvió el API (la UI está sincronizada con la respuesta). */
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
      // Los productos con descuento muestran el precio vigente en un nodo "discounted" (el nodo
      // "original" es el tachado). Los productos sin descuento muestran el precio directo en el contenedor.
      const priceBox = card.locator('[data-testid$="-price"]').first();
      const discounted = priceBox.locator('[data-testid="discounted"]');
      const priceNode = (await discounted.count()) > 0 ? discounted.first() : priceBox;
      const priceText = (await priceNode.textContent()) ?? '';
      products.push({ id: testId.replace(/-card$/, ''), name, price: parsePrice(priceText) });
    }
    return products;
  }
}
