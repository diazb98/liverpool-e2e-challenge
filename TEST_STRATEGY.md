# Estrategia de pruebas — flujo de búsqueda de Liverpool

**Alcance:** buscar → filtrar por color → ordenar por precio → leer los 5 primeros → contrastar contra la respuesta de red que consumió el frontend.

## 1. Qué no automatizaría y por qué

- **Checkout, pagos, login/OTP.** Las pasarelas, 3DS y antifraude no son deterministas, y las pruebas no deben crear pedidos reales en producción. Usaría pruebas de contrato y un entorno de staging.
- **Catálogo y ranking exactos.** Los precios y el stock cambian a diario, así que valido *propiedades* (orden ascendente, UI = respuesta, ≥3 de 5 presentes) y nunca "la PS5 más barata cuesta $X".
- **Comparaciones visuales al píxel.** Banners, precios y contadores de filtros convierten un diff de página completa en ruido. La prueba visual enmascara las zonas dinámicas, compara solo el layout, usa baselines de Linux/CI y yo no la usaría como bloqueo.
- **Multi-navegador en cada ejecución.** Triplica el tráfico hacia un sitio de producción de terceros: por defecto corre Chrome; la matriz completa (`BROWSERS=chrome,firefox,edge`) queda para la ejecución nocturna o bajo demanda.

## 2. Si se agregara un CAPTCHA

No intentaría resolverlo ni evadirlo desde la prueba. En orden: (1) ejecutar donde esté desactivado o en modo de pruebas del proveedor, o pedir que se permita la IP de salida del CI en el WAF; (2) bajar de capa con un `storageState` pre-autorizado más validaciones por API del endpoint de búsqueda; (3) mantener un smoke test que lo detecte y **falle con un motivo claro** ("bloqueado por anti-bot", no un bug del producto) en vez de agotar el tiempo, como hace hoy `BasePage.open` con "Access Denied".

## 3. Riesgos de flakiness y mitigaciones

| Riesgo (todos observados durante el desarrollo) | Mitigación |
|---|---|
| El WAF responde "Access Denied" al Chromium headless incluido en Playwright y, a veces, a sesiones nuevas | Canal de Chrome real; reintento acotado con backoff (la única espera fija); error explícito si persiste |
| Carrera de hidratación: el texto escrito o los clics hechos antes de que React hidrate se pierden (Firefox en CI, rara vez Chrome) | Reintentos idempotentes con `expect().toPass()`: rellenar y Enter hasta que cambie la URL; pulsar el filtro solo si está sin marcar |
| Capturar el XHR equivocado (filtro vs orden, o una llamada de fondo) | `waitForResponse` filtrado por el cuerpo de la petición; la prueba espera a que la primera tarjeta del DOM sea el primer producto de la respuesta |
| El marcado del precio cambia con/sin descuento; los filtros dependen del término | El page object maneja ambos casos; el color es un dato; un filtro ausente falla con un mensaje claro |
| Límite de peticiones por IP compartida | Workers limitados y reintentos solo en CI, para que las fallas locales sigan siendo visibles |

## 4. Integrarlo en un pipeline de CI con más de 50 suites

- **Sin bloquear merges al inicio.** Accede a un sitio de producción de terceros detrás de un WAF: correrlo como job separado, no bloqueante o nocturno, hasta demostrar su tasa de éxito.
- **Aislar y fragmentar:** job propio, `--shard`, presupuesto fijo de workers y una IP de salida dedicada y permitida por el dueño del sitio.
- **Reintentos ≠ ocultar problemas:** pocos reintentos, reportar aparte lo que "pasó al reintentar" y poner en cuarentena las pruebas que superen un umbral de inestabilidad.
- **Feedback rápido primero:** pruebas unitarias (`crossValidate` y `parsePrice`, puras) en cada commit, E2E en merge o nocturno; publicar reporte y trazas.
- **Capa determinista:** simular `/api/plp/search` para las validaciones funcionales y dejar esta prueba contra el sitio real como capa delgada de humo y contrato.
