import { expect, type Locator, type Page } from '@playwright/test';
import { settings } from '../config/settings';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // The header renders two inputs (mobile + desktop); only one is visible per viewport.
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
   * The header is server-rendered and then hydrated. Text typed before hydration is
   * wiped and Enter does nothing, so we retry fill+Enter until the navigation happens.
   * Each attempt is idempotent (fill replaces the value), so retrying is safe.
   */
  async search(term: string): Promise<void> {
    await expect(async () => {
      await this.searchInput.fill(term);
      await this.searchInput.press('Enter');
      await this.page.waitForURL(/[?&]s=/, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }
}
