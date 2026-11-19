# Prompt de referencia

> Este prompt fue **reconstruido a posteriori**: el trabajo original partió solo del enlace al enunciado. Incluye lo aprendido durante el desarrollo, para poder reproducir la solución desde cero.

```text
Actúa como un Sr. QA Automation Engineer con experiencia en Playwright, TypeScript, arquitectura de frameworks de pruebas y CI/CD. Prioriza decisiones de diseño y pensamiento crítico sobre la cantidad de código.

# CONTEXTO
Resuelve este Take Home Challenge: automatizar el flujo de búsqueda de https://www.liverpool.com.mx. Se evalúa: estrategia y pensamiento crítico (30%), diseño del framework (25%), fiabilidad (20%), CI/CD (15%) y validación UI contra red (10%). El pensamiento y el diseño pesan más que la ejecución.

# RESTRICCIONES TÉCNICAS
- Playwright con TypeScript. Prohibido Python y Selenium.
- Headless por defecto, con opción de modo headed.
- Sin valores hardcodeados: URLs, textos del sitio y umbrales van en un archivo de configuración con variables de entorno.
- Un framework mínimo y limpio que alguien nuevo entienda en 10 minutos.

# ENTREGABLES
## Parte 1: UI E2E
Navegar a Liverpool, buscar "playstation 5", filtrar por color White, ordenar por menor precio, extraer nombre y precio de los 5 primeros resultados e imprimirlos en consola.

## Parte 2: Interceptación y validación
1. Interceptar la respuesta de red que consume el frontend con los resultados.
2. Parsearla y extraer los productos.
3. Cruzar los productos de la UI contra la respuesta.
4. Afirmar que al menos 3 de los 5 aparecen en la respuesta.
5. Registrar las discrepancias de nombre y precio.
Extra: verifica también el orden y que los precios estén ascendentes. Separa la lógica de comparación en funciones puras con pruebas unitarias.

## Parte 3: Reporte y CI
- Reporte HTML de Playwright.
- Screenshots automáticos en fallo, configurados en el framework y no en el código de las pruebas.
- Workflow en .github/workflows/test.yml que instale dependencias, corra headless y suba el reporte como artifact. Debe pasar en una ejecución limpia.

## Parte 4: TEST_STRATEGY.md (máximo 1 página)
Responde con trade-offs y no solo con herramientas:
1. Qué no automatizarías y por qué.
2. Cómo manejarías un CAPTCHA.
3. Qué riesgos de flakiness existen y cómo los mitigaste.
4. Qué cambiarías al integrarlo en un CI con más de 50 suites.

## Bonus
Regresión visual, escaneo de accesibilidad con axe-core, aserción de rendimiento, ejecución en paralelo entre navegadores y pruebas parametrizadas por término de búsqueda.

# ARQUITECTURA ESPERADA
Page Object Model con clase base, fixtures de Playwright, capas separadas (config, pages, api, utils, tests), lógica pura testeable y datos en un JSON.

# PROCESO OBLIGATORIO
1. Antes de codificar, explora el sitio real: estructura del DOM, selectores estables (data-testid) y llamadas de red.
2. Verifica cada afirmación con evidencia; no supongas. Si algo no se pudo probar, dilo.
3. Después de cada cambio importante corre las pruebas, y repite la suite varias veces para medir estabilidad.
4. Valida en CI con una copia limpia del repo y, si procede, con una matriz de navegadores.
5. Al terminar, audita el resultado contra cada requisito del enunciado e informa con honestidad lo que cumple, lo que cumple a medias y lo que no.

# PROBLEMAS CONOCIDOS DEL SITIO (úsalos)
- Akamai devuelve "Access Denied" al Chromium headless de Playwright y a veces a sesiones nuevas: usa Chrome real (channel: 'chrome') con reintento y un mensaje de error explícito.
- Hay dos inputs de búsqueda (móvil oculto y escritorio visible).
- Carrera de hidratación: el texto escrito o los clics hechos antes de que React hidrate se pierden. Usa reintentos idempotentes con expect().toPass().
- El color White se llama "Blanco" en el sitio, y los filtros disponibles dependen del término de búsqueda.
- La primera carga de resultados viene en el HTML; los filtros y el orden llaman a POST /api/plp/search. Empareja esa respuesta por el cuerpo de la petición (sortOption) para no tomar una anterior.
- El precio mostrado es priceInfo.promoPrice.price.
- Las tarjetas sin descuento no tienen el nodo "discounted".

# ENTREGA
Código en un repositorio público de GitHub con README (instalación, headless y headed, y enlace a una ejecución en verde). No envíes correos ni publiques nada sin pedirme confirmación.
```
