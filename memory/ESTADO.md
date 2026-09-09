# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 09 Sep 2026 (tarde-noche)
**Fase:** Vercel auto-deploy reconectado de verdad (GitHub App + git link, ya no manual).
Railway auto-deploy dejado **staged** (repo/root/start command listos, falta que el
usuario apruebe el deploy en su dashboard — no se tocó en vivo por riesgo a prod).

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Railway: aprobar el deploy staged.** `railway/connect-service-source` +
   `update-service` (root `backend`, start `uvicorn server:app --host 0.0.0.0 --port $PORT`,
   reemplaza el placeholder `echo HELLO_FROM_RAILWAY`) quedaron preparados sin aplicar.
   El usuario tiene que darle "Deploy" en el dashboard de Railway para que el auto-deploy
   quede realmente activo.
2. **CETES real, cascada Banxico → Gemini → fijo (#187, cerrado y verificado en vivo).**
   `backend/cetes.py` nuevo: Banxico SIE API (necesita `BANXICO_TOKEN`, el usuario no lo
   tiene todavía) → si falla, le pregunta a Gemini con anti-alucinación (rango 3-20%,
   fecha del año actual/anterior) → si también falla, 10% fijo (mismo comportamiento de
   antes). Corrida real: `{rate: 11.0, source: 'gemini'}`, caché 24h confirmado. Reporte
   muestra footnote con la fuente real. Pendiente del usuario: sacar token gratis en
   banxico.org.mx/SieAPIRest y ponerlo en Railway si quiere la fuente oficial en vez de IA.
3. **AdminActividad.jsx construida y verificada en vivo (#170, cerrado).** Tabla de
   `activity_log` con filtro tipo/buscador/expandir stack trace. Login admin, backend
   local, 4 filas reales en staging — todo confirmado con screenshot, no solo por código.
4. **#184 casi cerrado (a/b/c/e; solo falta d).**
   - (a) NOCNOK ya no descarta resultados fuera de colonias objetivo (mismo bug ya resuelto
     en CasasYTerrenos/Propiedades.com). Pincali sigue sin cubrir todo el municipio — su URL
     es por-colonia, cambio estructural mayor, no trivial.
   - (b) Era falsa alarma: el pipeline canónico de `colonias_similares` ya estaba resuelto
     desde el 3-sep, solo faltaba documentarlo — hecho en `INDICE_MOTOR.md`.
   - (c) Medido en vivo primero (regla del proyecto): pipeline completo de 7 pasos tarda
     4m1s contra Mongo real. Wireado: `scheduler.py` lo dispara al final de cualquier
     corrida (bloqueante, ya es un batch de horas); `ondemand_pipeline.py` lo dispara en
     background (`Popen`, no alarga la espera del usuario en el dashboard).
   - (d) NSE de terreno con la misma tabla que casas — sigue sin decidir, es pregunta
     metodológica, no código, no urgente.
   - (e) `build_pm2t_semilla.py` ya lee `db.terreno_flywheel` (solo lectura), verificado
     corriendo en vivo — colección vacía hoy, degrada limpio a cerebro/AC108.
5. **Bug real NO resuelto — colisión de NSE entre colonias homónimas de distinto municipio.**
   `colonias_maestro.json` indexa por nombre de colonia solo (sin municipio). El precio SÍ se
   corrige (guardia en `motor_remi_api.js` ~984-992), la clasificación NSE (nseIdx) no. No
   cuantificado cuántas colonias colisionan — sesión propia pendiente.
6. **Regex prohibido — violación real, sin corregir.** `scraper-inmuebles/scrapers/
   vivanuncios_detalle.py` y el fallback de colonia en `Modulo Drive IA/
   scrapear_propiedades_com_urls.js` usan regex sobre texto libre para colonia/dirección
   (regla dura: SIEMPRE por IA, nunca regex — memoria `feedback_no_regex`). Pendiente migrar
   esa extracción a IA.
7. **BACKLOG #185 (NO implementado):** bóveda de respaldo pagado para avalúo público al
   descargar (6/12/18/36 meses, $50/$80/$120/$190). Requiere Stripe conectado (N4, SAPI).

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Pincali sin cubrir municipio completo (ver #184-a arriba).
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-rosy-six-74.vercel.app — auto-deploy RECONECTADO hoy (GitHub App + git link en proyecto "frontend" de Vercel).
- **Backend API:** https://propvalu-backend-production.up.railway.app — auto-deploy STAGED (falta aprobar en dashboard, ver punto 1).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
