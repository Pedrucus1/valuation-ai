# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 03 Sep 2026
**Fase:** Prod Railway + Vercel. Sesión centrada en el caso real "El Roble" (El Arenal, OPI
`val_908f730cbbf8` de pedrucus@gmail.com/inmobiliaria) que destapó varios bugs reales en cadena:
comparables inventados → scraper on-demand con 2 bugs de filtrado → índices del motor en 0 desde
hace tiempo. Todo probado en vivo contra producción (no solo staging), commits pusheados.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Comparables inventados — ELIMINADOS (#171, CERRADO).** `generate_comparables` ya no rellena
   con `random.uniform` cuando el pool real es corto. Si quedan <3 reales, dispara
   `ondemand_pipeline.py` en segundo plano (scrape → insert → enricher acotado → validación de
   colonia SEPOMEX+DeepSeek) sin bloquear la respuesta. `ComparablesPage.jsx` muestra aviso y se
   auto-refresca sola; campana de avisos real (antes local/KYC) en ambos dashboards. Ver #180.
2. **2 bugs reales en `buscar_comparables_browser.js` (#181, CERRADO), encontrados probando #180 en
   vivo.** (a) Filtraba m² 0.5x-1.5x del sujeto AL SCRAPEAR, tirando comps reales que sí sirven a
   `mercado_props` en general — ahora rango de cordura fijo 20-2000m². (b) `buscarEnCasasYTerrenos`
   nunca filtraba por tipo — pedir terreno devolvía casas mal etiquetadas. Ambos corregidos y
   probados: El Roble pasó de 0 a 4 casas + 8 terrenos reales insertados en prod.
3. **Bug viejo (no de hoy): `construir_idx_valoracion.js`/`construir_nse_v2.js` daban SIEMPRE 0
   colonias, sin error visible (#182, CERRADO).** Leían campos legacy (`c`/`p`/`t`/`fs`) que
   `build_cache_index.js` dejó de escribir hace tiempo (ahora `m2c`/`precio`/`m2t`/`fecha`).
   Confirmado además: el rebuild de índices del motor **no tiene cron, es 100% manual** — estaba
   22 días desactualizado. Tras el fix: `idx_valoracion` 0→1966 colonias, `colonias_nse_v2` 0→875.
   Nuevo `Modulo Drive IA/actualizar_indices_motor.js` encadena el pipeline Mongo-only completo.
   NO toca la capa "ganada" (`nse.v1`, calibración del perito) — 2 capas nunca se pisan, confirmado
   en `ARQUITECTURA_DATOS.md`.
4. **Flywheel de terreno confirmado por el perito (#183, CERRADO, consumo pendiente).** Campo
   "Terreno $/m² (opcional)" en `ComparablesPage.jsx`; si el perito lo llena, se guarda en
   `db.terreno_flywheel` (dato ganado/validado) en vez de fiarse del `land_value` calculado (puede
   salir absurdo en zonas sin comps reales — visto hoy $7.3M implícito en El Roble). Falta que
   `build_pm2t_semilla.py` lea esta colección (hoy solo lee `cerebro_datos.json`).
5. **Pendientes de hoy sin implementar, ver #184:** (a) ampliar scrape on-demand a TODA la zona/
   municipio, no solo la colonia pedida (`buscarEnCasasYTerrenos` ya trae ~100 hits municipio-wide
   y hoy descarta los que no son exactos — pedido explícito del usuario: "hay más propiedades
   alrededor en otros fraccionamientos"); (b) decidir builder canónico de `colonias_similares.json`
   (6+ candidatos, ninguno documentado); (c) automatizar el disparo de
   `actualizar_indices_motor.js` tras scrape mensual y on-demand (medir tiempo real primero); (d)
   revisar si clasificar NSE de terreno con la tabla de umbrales de casas tiene sentido
   metodológico — sin decidir. Plan completo: `C:\Users\pedru\.claude\plans\crystalline-sniffing-gizmo.md`.
6. **Bug "Continuar Reporte" (503) — CERRADO, verificado en prod.** Cadena de fallback del motor ya
   acumula comps entre fuentes en vez de pisarlos.
7. **Scraper/enricher consolidados en una sola carpeta — CERRADO.** Todo vive en
   `Pagina-Valuacion-con-Ai--main\scraper-inmuebles\`; la vieja quedó archivada.
8. **Corrida real de los 4 municipios nuevos — puede seguir en background desde el 02-sep.**
   Verificar avance con `/logs` — si el proceso murió, relanzar `python scheduler.py`.
9. **Spike de Lamudi — pendiente, no arrancado.** Ver #177.
10. **`enrich-stream` — endpoint que el frontend llama pero nunca existió en el backend.**
    `ComparablesPage.jsx:177`, 404 instantáneo. Ver #172.
11. **Log de actividad/errores para el admin — backend hecho, falta frontend `AdminActividad.jsx`.**
    Plan en `C:\Users\pedru\.claude\plans\adaptive-giggling-pixel.md`.
12. **Frontend con commits sin desplegar a Vercel** — sigue pendiente `vercel --prod` desde
    `frontend/` (requiere confirmación del usuario).

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-184).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app) — **desactualizado, falta `vercel --prod`**.
- **Backend API:** https://propvalu-backend-production.up.railway.app — Railway despliega automático desde push a `main` (confirmado hoy con varios commits).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
