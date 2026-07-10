# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial de sesiones → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 10 Jul 2026
**Fase:** Plataforma estable en Railway+Vercel. Datos drenados. Motor en calibración por DATO (no fórmula).

## 🔥 Lo más caliente (qué sigue)
1. **#25 wirear el catálogo al motor** — `catalogo_cotos.json` YA construido (1,762 zonas, 2 niveles zona+conjunto). Falta conectarlo: validar/normalizar colonias + selección de comps por zona/conjunto. Data lista.
2. **#26** búsqueda dirigida en colonias similares para segmentos vacíos. ⚠️ NO usar Serper/Tavily masivo (quema créditos, ver `feedback_no_busqueda_masiva`).
3. **#7 / N4** pasarela de pagos (Stripe) — bloqueada por SAPI (N3).

## ✅ Hecho reciente (10 Jul)
- **#27 REDEPLOY Railway** — motor mejorado (73.8→~83.5% ±20) en prod (deployment `765fbc38`, healthcheck 200). **TAVILY_API_KEY** de Railway tenía un typo → corregida con la canónica del registro (validada 200). 41 commits pusheados a origin.
- **#133 Data Exchange PRUEBA EN VIVO PASADA** — e2e contra staging: analizar/confirmar escriben CRM+pool correctamente, terreno sin año no entra al pool, dedup OK, descuento 20%. Datos de prueba limpiados.
- **#25 catálogo de cotos CONSTRUIDO** — `Modulo Drive IA/catalogo_cotos.json` (1,762 zonas, 2 niveles: zona SEPOMEX + conjunto interior canonicalizado con DeepSeek). Falta wirearlo al motor. Hallazgo: el coto vive en `titulo` no en `colonia`; discriminador coto/oficial = SEPOMEX.
- **Docs de estado unificados**: `ESTADO.md` único archivo de arranque; snapshots viejos → `BACKLOG_ARCHIVE.md`; skill `end-session` arreglado (reescribe ESTADO.md).

## ✅ Hecho previo (09 Jul)
- **#134 "Edades por zona"** HECHO+verificado (captura edad/remodelación→edad efectiva/conservación/coto, cascada Estado→Muni→Colonia, corrección colonia SEPOMEX+CP, propagación a coto). Acceso valuador/inmobiliaria/admin.
- **Panel "Verificación de Datos"** (admin) + fixes tipo PINCALI+NOCNOK (`768d92b`).
- **#143 NOCNOK tipo_propiedad** normalizado a canónico + guardia sticky #135b + backfill (2441 → 0 no-canónico). CERRADO.
- **#135 enricher PINCALI** guardia SEPOMEX en breadcrumb (no degrada colonia). #135b: correcciones humanas (colonia/edad/tipo) son sticky en el write.
- **Colonias PINCALI** depuradas a español con DeepSeek (6,604 + 179). Dedup 76. **Regla dura: nunca regex sobre colonias.**

## 🧠 Motor (vigente)
- **±20 ~83.5%** (validador offline; cluster A edad-exacta → PROD, +1.9). **Techo de fórmula ~82-83% = falta DATO**, no fórmula.
- Palanca real = **selección de comps por segmento** (edad/subsegmento de colonia), no ajustes de fórmula (4 palancas probadas, ninguna mueve ±20). `factorNeg=0.95` óptimo (NO tocar).
- **MITULA fuera del caché** (dato corrupto m²c×1000). **Serper→Tavily** migrado (falta key en Railway).
- Reglas irrompibles: **NO** cambiar NSE v1→v2 · **NO** cazar atípicos · correr **validador_masivo OFFLINE** (keys en blanco) antes de cualquier cambio.

## 🏗️ Infra / datos (vigente)
- **Railway** (backend): `start.py`, scheduler off (`ENABLE_SCHEDULER=0`), monolito partido (17 routers). Auth `require_admin` / `require_admin_or_job`. Métricas `/api/metrics`.
- **Vercel** (frontend): último deploy `frontend-kcmu3se88`.
- **MongoDB**: prod cluster0, staging `cluster1.avle5ez`. Backend local → staging.
- **Cache motor: MongoDB fuente única** (`cache_consolidado.json` desde `mercado_props`, 33,483 comps). Sheets cortado.
- **Datos**: ~99,904 docs activos, portales drenados (PROPIEDADES_COM/INMUEBLES24/VIVANUNCIOS/CYT/PINCALI/MITULA/NOCNOK).
- **Seguridad**: incidente 06-Jul cerrado (keys Mongo+Gemini rotadas, pre-commit hook anti-secretos en `.githooks/`). Registro de keys → memoria `credentials_registry.md`.

## 🕐 Diseño parqueado (no construir aún)
- **#139/#140/#141** crowdsource edades: consenso ($push atómico, mediana, peso por rol, anti-gaming) → tokenización por calidad → paneles reputación. NO abrir canje sin anti-gaming.
- **#142** Data Exchange: descuento por calidad real (dedup+completitud construibles ya; enganche a carrito espera carrito).
