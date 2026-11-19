import type { Page } from '@playwright/test';
import { settings } from '../config/settings';

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigates and retries when the CDN bot protection answers with "Access Denied".
   * That page is served on cold sessions intermittently; a retry with the cookies it
   * just set normally succeeds. If it never does we fail with an explicit message
   * instead of a misleading "element not found" timeout later on.
   */
  async open(path: string): Promise<void> {
    const url = new URL(path, settings.baseUrl).toString();
    for (let attempt = 1; attempt <= settings.accessDeniedRetries; attempt++) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (!(await this.isBlocked())) return;
      await this.page.waitForTimeout(1_000 * attempt); // linear backoff, not a UI wait
    }
    throw new Error(
      `Blocked by bot protection ("Access Denied") on ${url} after ${settings.accessDeniedRetries} attempts. ` +
        'This is an environment/network problem, not a product bug.',
    );
  }

  /**
   * Closes the cookie notice (close button, not "accept") so it can't overlap the page bottom
   * where filters live. Best effort: the notice is not always rendered.
   */
  async dismissCookieNotice(): Promise<void> {
    const close = this.page.getByTestId(settings.testIds.cookieNoticeClose);
    if (await close.isVisible()) await close.click({ timeout: 3_000 }).catch(() => undefined);
  }

  private async isBlocked(): Promise<boolean> {
    return /access denied/i.test(await this.page.title());
  }
}
