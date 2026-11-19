# Test Strategy — Liverpool search flow

**Scope:** search → filter by color → sort by price → read top 5 → cross-check against the network response the frontend consumed.

## 1. What I would not automate, and why

- **Checkout, payment, login/OTP.** Gateways, 3DS and anti-fraud are non-deterministic, and tests must not create real orders on production. Use contract tests and a staging environment.
- **Exact catalogue/ranking.** Prices and stock change daily, so I assert *properties* (sorted ascending, UI = response, ≥3 of 5 present), never "the cheapest PS5 costs $X".
- **Pixel-perfect visual regression of the results page.** Rotating banners, prices and facet counters make full-page diffs noise. The visual test masks all dynamic regions and compares only the page *structure*, with Linux/CI baselines (fonts render differently per OS); I would not gate on it.
- **Cross-browser on every run.** It triples traffic against a third-party production site, so default is Chrome only; the full matrix is `BROWSERS=chrome,firefox,edge` (nightly/on demand).

## 2. If a CAPTCHA were added to search

I would not solve or bypass it from the test. In order: (1) run where it is disabled or in vendor test mode (staging, always-pass keys), or allow-list the CI egress IP at the WAF; (2) go below the UI with a pre-authorised `storageState` plus API-level checks of the search endpoint; (3) keep one smoke check that detects the CAPTCHA and **fails with a clear reason** ("blocked by anti-bot", not a product bug) instead of timing out, as `BasePage.open` does today for "Access Denied".

## 3. Flakiness risks and mitigations

| Risk (all observed while building) | Mitigation |
|---|---|
| WAF returns "Access Denied" to bundled headless Chromium, and sometimes to cold sessions | Real Chrome (`channel: 'chrome'`); bounded retry with backoff; explicit error if it persists |
| Hydration race: text typed or clicks made before React hydrates are lost (hit on Firefox in CI, rarely Chrome) | Idempotent retries in `expect().toPass()`: fill+Enter until the URL changes; click the color filter only if unchecked, accepting only the XHR that carries that filter |
| Reading the *filter* response instead of the *sort* response | `waitForResponse` matched on request body (`sortOption`); test waits until the DOM's first card equals the response's first product |
| Fixed sleeps | None for UI sync, only web-first assertions and response/URL waits |
| Price markup differs with/without discount; facets depend on term ("Blanco" absent for Nintendo Switch) | Page object handles both; unit tests on price parsing; color is data and a missing facet fails with a clear message |
| Shared-IP rate limiting | Capped workers in CI; retries only in CI so local failures stay visible |

## 4. Adding this to a CI pipeline with 50+ suites

- **Not a merge gate at first.** It hits a third-party production site behind a WAF; run it as a separate non-blocking/nightly job until its pass rate is proven.
- **Isolate and shard:** own job, `--shard` across runners, a fixed worker budget (no rate-limit trips, no starving other suites) and a dedicated egress IP allow-listed by the site owner.
- **Retries ≠ hiding:** few retries, report "passed on retry" separately, quarantine (not delete) tests above a flake threshold.
- **Fast feedback first:** unit tests (pure `crossValidate`/`parsePrice`) on every commit, E2E on merge/nightly; publish report and traces as artifacts.
- **Deterministic layer:** stub `/api/plp/search` for functional checks; keep this live test as a thin contract/smoke layer.
