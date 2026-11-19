import cases from '../../data/search-cases.json';

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

/** Único lugar para todos los valores ajustables. Se pueden sobrescribir con variables de entorno. */
export const settings = {
  baseUrl: process.env.BASE_URL ?? 'https://www.liverpool.com.mx',
  homePath: '/tienda/home',
  /** URL directa de búsqueda: `${searchPath}?s=<término>`. */
  searchPath: '/tienda',
  searchApiPath: '/api/plp/search',

  /** Cuántos productos se extraen de la UI y se validan de forma cruzada. */
  topN: num(process.env.TOP_N, 5),
  /** Mínimo de productos de la UI que deben estar presentes en la respuesta interceptada. */
  minMatches: num(process.env.MIN_MATCHES, 3),

  /** Opción de orden tal como la expone el sitio (texto en la UI + id que se envía al API). */
  sort: { label: 'Menor precio', id: 'sortPrice|0' },

  /** Textos del sitio (en español) usados para ubicar elementos. Aquí, un cambio de texto se corrige en una línea. */
  ui: {
    searchPlaceholder: 'Buscar por producto',
    sortDropdown: 'Ordenar por:',
  },

  /** Test ids estables que usa el sitio. */
  testIds: {
    cookieNoticeClose: 'ml-cookie-consent-ml-cookie-consent-close-button',
  },

  /** Reintentos ante la página "Access Denied" de la protección anti-bot. */
  accessDeniedRetries: num(process.env.ACCESS_DENIED_RETRIES, 4),

  /** Presupuesto de rendimiento (ms) para que los resultados de búsqueda sean visibles. */
  perfBudgetMs: num(process.env.PERF_BUDGET_MS, 15_000),

  /** Accesibilidad: solo reporta por defecto; con A11Y_STRICT=true falla ante problemas serios o críticos. */
  a11yStrict: process.env.A11Y_STRICT === 'true',
};

/** El sitio está en español: traduce los nombres de color en inglés de los datos de prueba a los del sitio. */
export const COLOR_LABELS: Record<string, string> = {
  white: 'Blanco',
  black: 'Negro',
  blue: 'Azul',
  red: 'Rojo',
  gray: 'Gris',
  grey: 'Gris',
  green: 'Verde',
};

export const siteColorLabel = (color: string): string =>
  COLOR_LABELS[color.trim().toLowerCase()] ?? color;

export interface SearchCase {
  term: string;
  color: string;
}

/**
 * Casos parametrizados. `SEARCH_TERM` (+ `SEARCH_COLOR` opcional, por defecto White) reemplaza
 * a data/search-cases.json para poder ejecutar cualquier término sin tocar el código:
 *   SEARCH_TERM="xbox series x" npx playwright test
 */
export function getSearchCases(): SearchCase[] {
  if (process.env.SEARCH_TERM) {
    return [{ term: process.env.SEARCH_TERM, color: process.env.SEARCH_COLOR ?? 'White' }];
  }
  return cases as SearchCase[];
}
