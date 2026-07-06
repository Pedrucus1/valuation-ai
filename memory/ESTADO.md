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

## 🔐 Seguridad (06-Jul) — incidente resuelto
- Fuga en commit `7e90cf1` (Gemini key + MONGO_URL prod hardcodeados). De-hardcodeado + **rotadas ambas keys** (Mongo pw + Gemini) en .env×2 + Railway. Pre-commit hook anti-secretos en `.githooks/`. Registro maestro de keys → memoria Claude `credentials_registry.md`.
- **Pendiente:** de-hardcodear 9 archivos más con el pw viejo (muerto): `investigar*.py`, `audit_basura*.py`, `backfill_estac_pincali.py`, `check_quality.py`.

## 🗺️ Índice del motor (NUEVO 06-Jul)
`Modulo Drive IA/INDICE_MOTOR.md` — leer ANTES de buscar/tocar algo del motor (qué es canónico vs experimento, dónde OPIs/comps/IDX/NSE). Enganchado en CLAUDE.md.

## 🧠 Motor (06-Jul) — baseline y diagnóstico
- Caché reconstruido con colonias PINCALI limpias (25,556 comps). **Baseline offline: ±20 75.7% / mediana −8.7 (subvalúa).**
- 4 palancas de fórmula probadas, NINGUNA mueve ±20 → cuello es DATO. `factorNeg=0.95` confirmado óptimo (NO tocar).
- **Diagnóstico 3-columnas: el MÉTODO es correcto; falla la SELECCIÓN de comps** (promedia nuevo+usado en vez del segmento del sujeto). Palanca real = segmentar comps por edad/subsegmento. `LAB_EDADSEG` codeada (+2 ±15). Todo en `MOTOR_ANTECEDENTES.md`.
- **Validador SIEMPRE offline** (`GEMINI_API_KEY= SERPER_API_KEY= DEEPSEEK_API_KEY= node validar_lab.js …`) o no es determinista.

## 🕐 Pendientes próximas sesiones

| # | Tarea | Notas |
|---|---|---|
| **#20** | **IPRoyal proxy sin saldo (402)** | Bloquea backfill. PINCALI no necesita proxy (HTTP simple) → correr proxy-free o recargar IPRoyal |
| **#21** | **Backfill año PINCALI** | Fix HECHO (`enricher.py`, ES `/inmueble/`). 25,492 docs ya con `enrich_last_attempt` limpio. Correr `enricher.py --tab PINCALI --mongo` cuando se destrabe #20 |
| **#22** | **Palanca motor: selección comps por segmento** | Edad + subsegmento de colonia; guardar subsegmento en la base. Ver MOTOR_ANTECEDENTES |
| #14 | Lanzar scraper mensual julio | Fecha: 7-Jul-2026 (bloqueado por #20) |
| #16 | Definir gancho de entrada de precios | Benchmark $80-$120/reporte — decisión usuario |
| #17 | Agregar Monopolio al scraper | CDP + login+JWT — deferred |
