# PropValu — Estado actual (snapshot de arranque)

> Único archivo a leer al iniciar sesión. Para detalle: `BACKLOG.md` (tablas, grep por #tarea), `MOTOR_ANTECEDENTES.md` (motor, grep), `BACKLOG_ARCHIVE.md` (historia).
> **Actualizar este archivo al cerrar sesión** (no acumular narrativa — sobrescribir el estado).

## Stack y rutas
- Backend FastAPI `backend/server.py` (monolito en extracción, ~1786 líneas; routers en `backend/routers/`, fundación en `backend/core/`). Frontend React. Mongo Atlas. Motor IA en `Modulo Drive IA/` (`motor_remi_api.js`).
- Python Windows: `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe` (nunca `python`).
- Backend local → **staging** (`backend/.env`, cluster `cluster1.avle5ez`). Scraper → **prod**. Deploy backend prod = Railway (`railway up`, branch-agnóstico).

## Git (al 03-Jun noche)
- Rama `main`. **26 commits adelante de `origin/main`, SIN pushear.** Push dispara deploy Railway (incluye cambios de avalúos) → validar un avalúo antes.
- Rama `feature/dedup-cross-portal` ya mergeada a main (existe aún).

## Lo más caliente / próximos pasos
1. **Push `main`→origin** cuando se valide un avalúo real (smoke-test). Despliega 26 commits de golpe.
2. **Config #66.3:** setear `JOBS_SECRET` (GitHub secret + Railway env) o el cron mensual no autentica. También #62 `PROPVALU_BACKEND_URL`.
3. **Enrichers**: si terminaron, **re-correr `fusionar_duplicados.py`** (baja el 19.6% no-evaluables) + considerar rebuild cache.
4. Motor (cuando suba cobertura `an`): #101(a) per-comp edad (hoy BLOQUEADO: 0% `an` en caché), #102 suma_partes sobrevalúa, #104 similares premium/baratos.
5. Producto: #7 pasarela de pagos, #34/#35 notificaciones (SendGrid/Twilio), #65 sync-sheets inicial.

## Gotchas vigentes
- **#107 migración cache motor Sheet→Mongo: REGRESA, NO activar.** Es proyecto de re-calibración, no swap. Ver MOTOR_ANTECEDENTES.
- **#66.1 valuations** deferido (core avalúos bajo calibración) — no extraer aún.
- Motor en techo ~90% sin más datos: NO perseguir OPIs atípicos; mejora viene de DATOS. Correr validador completo antes de tocar fórmulas. Guardar conclusiones en MOTOR_ANTECEDENTES en tiempo real.
- Gemini: 1 llamada por vez (2ª consecutiva = 429). Modelo `gemini-2.5-flash`.
