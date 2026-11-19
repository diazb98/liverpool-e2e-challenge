# Liverpool E2E challenge (Playwright + TypeScript)

Automates the Liverpool search flow and cross-validates the UI against the network response the frontend consumes.

**CI status:** [![Tests](https://github.com/diazb98/liverpool-e2e-challenge/actions/workflows/test.yml/badge.svg)](https://github.com/diazb98/liverpool-e2e-challenge/actions/workflows/test.yml)

Passing run: https://github.com/diazb98/liverpool-e2e-challenge/actions/runs/44625220166 (11 tests passed headless; HTML report uploaded as the `playwright-report` artifact).

## What it does

1. Opens Liverpool, searches **"playstation 5"**, filters color **White** (the site calls it *Blanco*), sorts by **lowest price**.
2. Extracts name + price of the first 5 results and prints them.
3. Intercepts the `POST /api/plp/search` response behind the sorted results, and asserts ≥ 3 of the 5 UI products are in it. Name/price differences, and ordering, are logged and attached to the report.

## Requirements

- Node.js 20+ (tested on 22/26)
- **Google Chrome installed.** Liverpool's bot protection rejects Playwright's bundled headless Chromium ("Access Denied"), so tests use the real Chrome channel. In CI this is installed by the workflow.

## Install

```bash
npm ci
npx playwright install chrome   # only if Chrome is not already installed
```

## Run

```bash
npm test                 # everything, headless (default)
npm run test:headed      # visible browser
npm run test:e2e         # browser tests only
npm run test:unit        # fast unit tests of the validation layer (no browser)
npm run report           # open the HTML report
```

Headless is the default (`headless: true` in `playwright.config.ts`); `--headed` (the `test:headed` script) overrides it.

### Data-driven / configuration

| Variable | Default | Purpose |
|---|---|---|
| `SEARCH_TERM` | from `data/search-cases.json` | Any search term, no code changes |
| `SEARCH_COLOR` | `White` | Color facet to apply (must exist for that term, e.g. Nintendo Switch has Black/Red but no White) |
| `TOP_N` / `MIN_MATCHES` | `5` / `3` | Products extracted / minimum found in the response |
| `PERF_BUDGET_MS` | `15000` | Performance budget for the results page |
| `A11Y_STRICT` | `false` | `true` makes serious/critical axe violations fail the test |
| `BROWSERS` | `chrome` | e.g. `chrome,firefox,webkit` runs the suite in parallel across browsers (all three pass in CI; the visual test is Chrome-only). In CI, use *Run workflow* → `browsers` input |
| `BASE_URL` | `https://www.liverpool.com.mx` | Target site |

Examples (bash):

```bash
SEARCH_TERM="nintendo switch" SEARCH_COLOR=Black npx playwright test tests/search.spec.ts
```

PowerShell: `$env:SEARCH_TERM="xbox series x"; npx playwright test`

## Reporting

- HTML report: `playwright-report/` (`npm run report`). Each run attaches `ui-vs-response.json`.
- Screenshots on failure and traces are configured in `playwright.config.ts` (`screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`), never in test code.
- CI: `.github/workflows/test.yml` installs dependencies, runs headless, and uploads the HTML report as an artifact.

## Layout

```
src/config/settings.ts      all tunables + data-driven cases
src/pages/                  BasePage (anti-bot retry), HomePage, SearchResultsPage
src/api/searchApi.ts        response types, interception predicate, parsing
src/utils/validation.ts     pure UI-vs-response cross-validation (unit tested)
tests/search.spec.ts        main flow (parts 1 + 2)
tests/accessibility.spec.ts axe-core scan (bonus)
tests/performance.spec.ts   load-time budget (bonus)
tests/unit/                 validation unit tests
TEST_STRATEGY.md            test strategy document
```

## Notes

- UI "price" is `priceInfo.promoPrice.price` in the response (the crossed-out price is `listPrice`).
- **Visual regression** (`tests/visual.spec.ts`) compares the page layout with dynamic regions masked. Baselines are Linux/Chrome renders produced in CI, so the test is skipped on other OSes. To regenerate them: Actions → Tests → *Run workflow* → tick `update_snapshots`, download the `visual-baselines` artifact into `tests/visual.spec.ts-snapshots/` and commit.
