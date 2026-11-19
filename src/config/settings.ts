import cases from '../../data/search-cases.json';

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

/** Single place for every tunable value. Override through environment variables. */
export const settings = {
  baseUrl: process.env.BASE_URL ?? 'https://www.liverpool.com.mx',
  homePath: '/tienda/home',
  searchApiPath: '/api/plp/search',

  /** How many products are extracted from the UI and cross-validated. */
  topN: num(process.env.TOP_N, 5),
  /** Minimum number of UI products that must be present in the intercepted response. */
  minMatches: num(process.env.MIN_MATCHES, 3),

  /** Sort option as exposed by the site (label shown in UI + id sent to the API). */
  sort: { label: 'Menor precio', id: 'sortPrice|0' },

  /** Site copy (Spanish) used to locate elements. Kept here so a copy change is a one-line fix. */
  ui: {
    searchPlaceholder: 'Buscar por producto',
    sortDropdown: 'Ordenar por:',
  },

  /** Retries for the bot-protection "Access Denied" page. */
  accessDeniedRetries: num(process.env.ACCESS_DENIED_RETRIES, 4),

  /** Performance budget (ms) for search results to be visible. */
  perfBudgetMs: num(process.env.PERF_BUDGET_MS, 15_000),

  /** Accessibility: report-only by default; set A11Y_STRICT=true to fail on serious/critical issues. */
  a11yStrict: process.env.A11Y_STRICT === 'true',
};

/** Site is in Spanish: map the English color names used in test data to the site's labels. */
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
 * Data-driven cases. `SEARCH_TERM` (+ optional `SEARCH_COLOR`, default White) overrides
 * data/search-cases.json so any term can be run without touching code:
 *   SEARCH_TERM="xbox series x" npx playwright test
 */
export function getSearchCases(): SearchCase[] {
  if (process.env.SEARCH_TERM) {
    return [{ term: process.env.SEARCH_TERM, color: process.env.SEARCH_COLOR ?? 'White' }];
  }
  return cases as SearchCase[];
}
