# Reto técnico E2E de Liverpool (Playwright + TypeScript)

Automatiza el flujo de búsqueda de Liverpool y valida de forma cruzada la UI contra la respuesta de red que consume el frontend.

**Estado del CI:** [![Tests](https://github.com/diazb98/liverpool-e2e-challenge/actions/workflows/test.yml/badge.svg)](https://github.com/diazb98/liverpool-e2e-challenge/actions/workflows/test.yml)

Ejecución en verde: https://github.com/diazb98/liverpool-e2e-challenge/actions/runs/44630568344 (14 pruebas pasaron en headless con Chrome; el reporte HTML se sube como artifact `playwright-report`).

Ejecución con Chrome + Firefox + Edge: https://github.com/diazb98/liverpool-e2e-challenge/actions/runs/44630826464 (24 pasaron, 2 omitidas: la prueba visual, que es solo de Chrome).

## Qué hace

1. Abre Liverpool, busca **"playstation 5"**, filtra por color **White** (el sitio lo llama *Blanco*) y ordena por **menor precio**.
2. Extrae el nombre y el precio de los 5 primeros resultados y los imprime en consola.
3. Intercepta la respuesta de `POST /api/plp/search` que alimenta los resultados ordenados y afirma que al menos 3 de los 5 productos de la UI están en ella. Las diferencias de nombre, precio y orden se registran y se adjuntan al reporte.

## Requisitos

- Node.js 20 o superior (probado con 22 y 26).
- **Google Chrome instalado.** La protección anti-bot de Liverpool rechaza el Chromium headless que trae Playwright ("Access Denied"), por eso las pruebas usan el canal de Chrome real. En CI lo instala el propio workflow.

## Instalación

```bash
npm ci
npx playwright install chrome   # solo si Chrome no está instalado
```

## Ejecución

```bash
npm test                 # todo, en headless (por defecto)
npm run test:headed      # con el navegador visible
npm run test:e2e         # solo las pruebas con navegador
npm run test:unit        # pruebas unitarias rápidas de la capa de validación (sin navegador)
npm run report           # abre el reporte HTML
```

Headless es el modo por defecto (`headless: true` en `playwright.config.ts`); `--headed` (el script `test:headed`) lo sustituye.

### Datos y configuración

| Variable | Valor por defecto | Para qué sirve |
|---|---|---|
| `SEARCH_TERM` | todos los casos de `data/search-cases.json` (playstation 5, xbox series x, nintendo switch) | Ejecuta un único término cualquiera, sin tocar el código |
| `SEARCH_COLOR` | `White` | Color a filtrar (debe existir para ese término; por ejemplo, Nintendo Switch ofrece Black y Red, pero no White) |
| `TOP_N` / `MIN_MATCHES` | `5` / `3` | Productos extraídos / mínimo que debe aparecer en la respuesta |
| `PERF_BUDGET_MS` | `15000` | Presupuesto de rendimiento de la página de resultados |
| `A11Y_STRICT` | `false` | Con `true`, las violaciones serias o críticas de axe hacen fallar la prueba |
| `BROWSERS` | `chrome` | Por ejemplo `chrome,firefox,edge` ejecuta la suite en paralelo entre navegadores (la prueba visual es solo de Chrome). En CI, usa *Run workflow* → entrada `browsers` |
| `BASE_URL` | `https://www.liverpool.com.mx` | Sitio objetivo |

Ejemplo (bash):

```bash
SEARCH_TERM="nintendo switch" SEARCH_COLOR=Black npx playwright test tests/search.spec.ts
```

PowerShell: `$env:SEARCH_TERM="xbox series x"; npx playwright test`

## Reportes

- Reporte HTML: `playwright-report/` (`npm run report`). Cada ejecución adjunta `ui-vs-response.json`.
- Los screenshots en fallo y las trazas se configuran en `playwright.config.ts` (`screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`), nunca en el código de las pruebas.
- CI: `.github/workflows/test.yml` instala dependencias, ejecuta en headless y sube el reporte HTML como artifact.

## Estructura

```
src/config/settings.ts      toda la configuración, textos del sitio y carga de casos de datos
src/pages/                  BasePage (reintento anti-bot), HomePage, SearchResultsPage
src/api/searchApi.ts        tipos de la respuesta, predicado de interceptación y parseo
src/utils/validation.ts     validación cruzada UI contra respuesta, pura (con pruebas unitarias)
data/search-cases.json      casos de término y color (agrega una línea para agregar un caso)
tests/fixtures.ts           fixtures de los page objects
tests/search.spec.ts        flujo principal, una prueba por caso (partes 1 y 2)
tests/accessibility.spec.ts escaneo con axe-core (bonus)
tests/performance.spec.ts   presupuesto de tiempo de carga (bonus)
tests/visual.spec.ts        comparación de screenshot del layout (bonus, Chrome/Linux)
tests/unit/                 pruebas unitarias de la validación
TEST_STRATEGY.md            documento de estrategia de pruebas
PROMPT.md                   prompt de referencia (reconstruido)
```

## Notas

- El "precio" de la UI corresponde a `priceInfo.promoPrice.price` en la respuesta (el precio tachado es `listPrice`).
- La **regresión visual** (`tests/visual.spec.ts`) compara el layout de la página con las zonas dinámicas enmascaradas. Las baselines son renders de Chrome en Linux generados en CI, por lo que la prueba se omite en otros sistemas operativos. Para regenerarlas: Actions → Tests → *Run workflow* → marca `update_snapshots`, descarga el artifact `visual-baselines` en `tests/visual.spec.ts-snapshots/` y haz commit.
