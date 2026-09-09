# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 09 Sep 2026
**Fase:** Prod Railway + Vercel, ambos desplegados manualmente hoy (ver #7). Caso real
"El Roble" (`val_908f730cbbf8`) usado todo el día como caso de prueba end-to-end.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Motor de terreno completo (#186).** `sumaDePartes()` ya homologa $/m² de terreno por
   superficie (factor `^1/6`, mismo que construcción — no mezcla lotes de 300m² y 5000m² como
   directamente comparables). Reporte muestra la tabla de terrenos reales + desglose
   terreno/construcción cuando `poolTipo` es `suma_partes`/`lote_grande_*` (antes mostraba
   casas desconectadas del valor real y "Confianza Baja" sin sentido).
2. **Tabla de costos de construcción (`QUALITY_COSTS`) corregida (#186).** Estaba invertida
   (Económico > Interés Social) desde hace tiempo; ahora ordenada y anclada a rangos reales
   2026 (Económico $8k → Lujo $38k/m²). 3 archivos: `motor_remi_api.js`, `server.py` (2
   ocurrencias), `FlippingCalculatorPage.jsx`. `calidadConstruccion` de la OPI ahora manda
   sobre la inferencia por valor de terreno (fallaba en zonas rurales con terreno barato +
   construcción de nivel medio/alto encima, ej. El Roble).
3. **Renta y plusvalía editables (#186, nuevo hoy).** Factor de renta default bajó de 6%→4%
   anual. Override en `ComparablesPage.jsx` junto al de terreno $/m²: **renta solo la edita
   appraiser** (server-side, no solo oculto en frontend); **plusvalía la editan appraiser Y
   realtor** (tabla default es por estado, no capta zonas rurales). Reporte ahora muestra
   rango min/max de renta, no solo el punto.
4. **Vercel NO auto-desplegaba desde el 7-ago (95 commits atrás) — mismo bug que Railway
   (sesión 03-sep).** Deploy manual por CLI hecho hoy (`vercel --prod` desde `frontend/`) y
   confirmado en producción. **Pendiente real: reconectar el auto-deploy de verdad en AMBOS
   servicios** (revisar GitHub App de Railway reinstalada + integración git de Vercel) — si no,
   cada sesión futura va a necesitar el mismo deploy manual sin darse cuenta de que hace falta.
5. **BACKLOG #185 (nuevo, NO implementado):** bóveda de respaldo pagado para avalúo público al
   descargar (6/12/18/36 meses, $50/$80/$120/$190) — aviso + popup correo/checkout + email de
   confirmación. Requiere Stripe conectado (prerequisito N4, SAPI constituida).
6. **Bug real NO resuelto — colisión de NSE entre colonias homónimas de distinto municipio.**
   `colonias_maestro.json` indexa por nombre de colonia solo (sin municipio). El precio SÍ se
   corrige (guardia en `motor_remi_api.js` ~984-992), la clasificación NSE (nseIdx) no. No
   cuantificado cuántas colonias colisionan — sesión propia pendiente.
7. **Regex prohibido — violación real hoy, sin corregir.** `scraper-inmuebles/scrapers/
   vivanuncios_detalle.py` y el fallback de colonia en `Modulo Drive IA/
   scrapear_propiedades_com_urls.js` usan regex sobre texto libre para colonia/dirección
   (regla dura: SIEMPRE por IA, nunca regex — memoria `feedback_no_regex`). Pendiente migrar
   esa extracción a IA.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Log de actividad admin (#170): backend hecho, falta `AdminActividad.jsx`.
- #184: pendientes de scraping on-demand/similares.json de la sesión 03-sep, sin tocar hoy.
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-rosy-six-74.vercel.app — actualizado hoy (deploy manual, auto-deploy roto — ver #4).
- **Backend API:** https://propvalu-backend-production.up.railway.app — auto-deploy roto, deploy manual por CLI (`railway up`) — ver #4.
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
