# Estado del Proyecto: PropValu

**Última Actualización:** 27 de Junio de 2026
**Fase Actual:** Datos enriquecidos, scraper al día, plataforma estable en Railway+Vercel.

## ✅ Estado de Enriquecimiento (27-Jun-2026)

Todos los portales drenados. Base: ~99,904 docs activos, 8,135 secundarios (dedup).

| Portal | Estado | Cobertura año |
|---|---|---|
| PROPIEDADES_COM | ✅ completo (10/10 hoy) | ~93% |
| INMUEBLES24 | ✅ completo | ~98% |
| VIVANUNCIOS | ✅ completo | ~93% |
| CASAS_Y_TERRENOS | ✅ 191/379 (27-Jun) | ~50% (rest. no expone) |
| PINCALI | ✅ techo real ~24.4% | portal no expone más |
| MITULA | ✅ completo | parcial |
| NOCNOK | ✅ completo (portal nuevo) | — |

## ✅ Infraestructura (vigente)

- **Railway** (backend): corriendo con `start.py`, `google-generativeai` en requirements.txt, healthcheck OK. Scheduler off (`ENABLE_SCHEDULER=0`). Monolito partido (-60%): 17 routers extraídos.
- **Vercel** (frontend): último deploy exitoso `frontend-9fd4er6s2-pedrucus-projects.vercel.app`.
- **MongoDB prod**: Atlas cluster0. Staging: cluster1.avle5ez.
- **Auth**: `require_admin` y `require_admin_or_job` (acepta `X-Job-Token`=`JOBS_SECRET`).
- **Métricas**: `core/metrics.py` + `/api/metrics` admin-only.
- **Proxy IPRoyal**: cableado en enricher (requests.Session + Playwright), no-op si PROXY_URL no seteado.

## ✅ Motor de Valuación (vigente)

- Score validador: ±15% ~86%, ±20% ~89.7% (post geoproximidad #114).
- **Cache: MongoDB (fuente única, 30-jun-2026).** Migrado Sheets→Mongo: `actualizar_cache_consolidado_mongo.py` construye `cache_consolidado.json` desde `mercado_props` (33,483 comps). Validado NEUTRAL vs Sheets (±15/±20 idénticos, errAbs 15.6→15.1). Google Sheets CORTADO (`config.ENABLE_SHEETS` off; motor ya no lee Sheets, scraper ya no escribe). `actualizar_cache_consolidado.js` deprecado.
- Reglas irrompibles: NO cambiar NSE v1→v2, NO cazar atípicos, correr validador_masivo antes de cambios.

## 🔄 En progreso

- **fill_similares_gemini.js**: batch 5/10 (~120 colonias), cuota Gemini → waits normales. Se completa solo.

## 🕐 Pendientes próximas sesiones

| # | Tarea | Notas |
|---|---|---|
| #9 | Migrar cache motor Sheets→Mongo | Proyecto de re-calibración completa, no un parche |
| #14 | Lanzar scraper mensual julio | Fecha: 7-Jul-2026 |
| #16 | Definir gancho de entrada de precios | Benchmark $80-$120/reporte — decisión usuario |
| #17 | Agregar Monopolio al scraper | CDP + login+JWT — deferred |
