# Test Strategy — Liverpool search flow

**Scope:** search → filter by color → sort by price → read top 5 → cross-check against the network response the frontend consumed.

## 1. What I would not automate, and why

- **Checkout, payment, login/OTP.** Gateways, 3DS and anti-fraud are non-deterministic, and tests must not create real orders on production. Use contract tests and staging.
- **Exact catalogue and ranking.** Prices and stock change daily, so I assert *properties* (sorted ascending, UI = response, ≥3 of 5 present), never "the cheapest PS5 costs $X".
- **Pixel-perfect visual checks.** Banners, prices and facet counters make full-page diffs noise. The visual test masks dynamic regions, compares only the layout, uses Linux/CI baselines, and I would not gate on it.
- **Cross-browser on every run.** It triples traffic to a third-party production site: default is Chrome; the full matrix (`BROWSERS=chrome,firefox,edge`) is for nightly/on demand.

## 2. If a CAPTCHA were added

I would not solve or bypass it from the test. In order: (1) run where it is disabled or in vendor test mode, or allow-list the CI egress IP at the WAF; (2) go below the UI with a pre-authorised `storageState` plus API checks of the search endpoint; (3) keep one smoke check that detects it and **fails with a clear reason** ("blocked by anti-bot", not a product bug) instead of timing out, as `BasePage.open` does today for "Access Denied".

## 3. Flakiness risks and mitigations

| Risk (all observed while building) | Mitigation |
|---|---|
| WAF answers "Access Denied" to bundled headless Chromium and sometimes to cold sessions | Real Chrome channel; bounded retry with backoff (the only fixed wait); explicit error if it persists |
| Hydration race: text typed or clicks made before React hydrates are lost (Firefox in CI, rarely Chrome) | Idempotent `expect().toPass()` retries: fill+Enter until the URL changes; click the filter only if unchecked |
| Capturing the wrong XHR (filter vs sort, or a background call) | `waitForResponse` matched on request body; test waits until the first DOM card equals the response's first product |
| Price markup differs with/without discount; facets depend on the term | Page object handles both; color is data; a missing facet fails with a clear message |
| Shared-IP rate limiting | Capped workers and retries only in CI, so local failures stay visible |

## 4. Adding this to a CI pipeline with 50+ suites

- **Not a merge gate at first.** It hits a third-party production site behind a WAF; run it as a separate non-blocking/nightly job until its pass rate is proven.
- **Isolate and shard:** own job, `--shard`, fixed worker budget and a dedicated egress IP allow-listed by the site owner.
- **Retries ≠ hiding:** few retries, report "passed on retry" separately, quarantine tests above a flake threshold.
- **Fast feedback first:** unit tests (pure `crossValidate`/`parsePrice`) on every commit, E2E on merge/nightly; publish report and traces.
- **Deterministic layer:** stub `/api/plp/search` for functional checks; keep this live test as a thin smoke/contract layer.
