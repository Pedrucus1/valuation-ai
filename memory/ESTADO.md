# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 09 Sep 2026
**Fase:** Prod Railway + Vercel. Última tanda: correcciones de costos de construcción y
homologación de terreno en el motor/reporte (09-sep), sobre la base del caso real "El Roble"
(El Arenal) trabajado el 03-sep — comparables reales, scrape on-demand ampliado, `enrich-stream`
construido, NSE de terreno con tabla propia. Todo commiteado y pusheado (`f6704cf`).

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Costos de construcción por calidad — CORREGIDOS 09-sep (#178).** Económico ahora es el más
   barato ($8k/m²), estaba mal ordenado arriba de Interés Social desde #149. Rangos reales 2026
   dados por el usuario. `server.py` (2 lugares) + `FlippingCalculatorPage.jsx`.
2. **Terreno: $/m² homologado por superficie (#177) + reporte muestra suma de partes cuando
   aplica (#176).** `sumaDePartes()` ya no mezcla $/m² crudo de lotes de tamaños muy distintos
   (economía de escala, mismo factor `^(1/6)` que construcción). El reporte deja de mostrar tabla
   de casas cuando el valor real vino de terreno+construcción.
3. **Caso real "El Roble" (El Arenal, OPI `val_908f730cbbf8`) — pool de casas 5→44+ comparables
   reales en prod (03-sep, #174).** Scrape on-demand ahora amplía a colonias cercanas reales
   (SEPOMEX o, si el nombre no está catalogado como esta colonia, fallback por lat/lon del
   sujeto). Propiedades.com pasó a leer el JSON-LD estructurado de la página (más completo que
   regex sobre HTML) y CasasYTerrenos ya no descarta resultados reales fuera del set calculado.
4. **`enrich-stream` construido y verificado end-to-end (#172, 03-sep).** De paso se arregló
   `SCRAPER_DIR` mal calculado que rompía en silencio TODO el enriquecimiento web, no solo este
   endpoint (desde la consolidación del scraper el 01-sep).
5. **NSE de terreno con tabla propia (#173, 03-sep) — correcto pero inerte hoy.** Medido: cero
   cambio en 202 OPIs porque `sumaDePartes()` usa el $/m² numérico directo, no la clasificación
   NSE. Sirve cuando se conecte a un futuro filtro de similares de terreno — no antes.
6. **Bug real encontrado y NO resuelto — colisión de NSE entre colonias homónimas de distinto
   municipio.** `colonias_maestro.json` indexa por nombre de colonia SOLO (sin municipio) — "El
   Roble" en Tonalá y en El Arenal comparten clave. SÍ existe una guardia anti-colisión en
   `motor_remi_api.js` (~984-992, de una sesión anterior) que corrige el ANCLA de precio con el
   caché indexado por municipio — verificado funcionando para El Roble. Pero la clasificación NSE
   (nseIdx/categoría, no el precio) sigue viniendo del municipio equivocado cuando hay colisión.
   No cuantificado cuántas colonias más colisionan — pendiente para sesión propia con calma.
7. **Frontend con commits sin desplegar a Vercel** — sigue pendiente `vercel --prod` desde
   `frontend/` (requiere confirmación del usuario).
8. **Vivanuncios y Monopolio.com.mx — inventario real de El Roble no capturado hoy.** Vivanuncios
   usa Playwright (excluido a propósito del scraper on-demand, que es fetch-nativo por velocidad).
   Monopolio.com.mx nunca se integró (0 investigación). Queda pendiente evaluar si vale la pena.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Log de actividad admin (#170): backend hecho, falta `AdminActividad.jsx`.
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app) — **desactualizado, falta `vercel --prod`**.
- **Backend API:** https://propvalu-backend-production.up.railway.app — Railway despliega automático desde push a `main`.
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
