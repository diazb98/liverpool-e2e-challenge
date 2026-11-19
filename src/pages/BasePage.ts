import type { Page } from '@playwright/test';
import { settings } from '../config/settings';

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navega y reintenta cuando la protección anti-bot del CDN responde "Access Denied".
   * Esa página se sirve de forma intermitente en sesiones nuevas; un reintento con las cookies
   * que acaba de recibir normalmente funciona. Si nunca funciona, falla con un mensaje explícito
   * en lugar de un timeout engañoso de "elemento no encontrado" más adelante.
   */
  async open(path: string): Promise<void> {
    const url = new URL(path, settings.baseUrl).toString();
    for (let attempt = 1; attempt <= settings.accessDeniedRetries; attempt++) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (!(await this.isBlocked())) return;
      await this.page.waitForTimeout(1_000 * attempt); // backoff lineal, no es una espera de UI
    }
    throw new Error(
      `Blocked by bot protection ("Access Denied") on ${url} after ${settings.accessDeniedRetries} attempts. ` +
        'This is an environment/network problem, not a product bug.',
    );
  }

  /**
   * Cierra el aviso de cookies (botón de cerrar, no "aceptar") para que no tape la parte inferior
   * de la página, donde están los filtros. Es un mejor esfuerzo: el aviso no siempre se muestra.
   */
  async dismissCookieNotice(): Promise<void> {
    const close = this.page.getByTestId(settings.testIds.cookieNoticeClose);
    if (await close.isVisible()) await close.click({ timeout: 3_000 }).catch(() => undefined);
  }

  private async isBlocked(): Promise<boolean> {
    return /access denied/i.test(await this.page.title());
  }
}
