import { expect, type Locator, type Page } from '@playwright/test';
import { settings } from '../config/settings';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // El header renderiza dos inputs (móvil y escritorio); solo uno es visible según el viewport.
  private readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page
      .locator(`input[placeholder^="${settings.ui.searchPlaceholder}"]:visible`)
      .first();
  }

  async goto(): Promise<void> {
    await this.open(settings.homePath);
  }

  /**
   * El header se renderiza en el servidor y luego se hidrata. El texto escrito antes de la
   * hidratación se borra y Enter no hace nada, así que se reintenta rellenar y Enter hasta que
   * ocurra la navegación. Cada intento es idempotente (fill reemplaza el valor), por lo que
   * reintentar es seguro.
   */
  async search(term: string): Promise<void> {
    await expect(async () => {
      await this.searchInput.fill(term);
      await this.searchInput.press('Enter');
      await this.page.waitForURL(/[?&]s=/, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }
}
