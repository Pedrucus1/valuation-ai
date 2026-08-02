# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 1 Ago 2026
**Fase:** Prod Railway + Vercel público, estable. La sesión del 1-ago fue de **datos e investigación**, no de features: no se tocó código de la app. Narrativa del 28-jul (créditos, requisiciones, 5 bugs) → `BACKLOG_ARCHIVE.md`.

## 🔥 SESIÓN 1-AGO — colonias_decada.json auditado + manual de arquitectura

- **`colonias_decada.json` cerrado por Codex y auditado por Claude** (`d70b990`, pusheado): 5,018 registros, 127 alta / 1,013 media / 3,878 baja, `confianza_puntos` en todas, **cero errores de esquema**. Coincide exacto con el estado final que reportó Codex. Script de solo lectura: `Manual-Arquitectura-ZMG\auditar_colonias_lectura.py`.
- **Se borraron 56 respaldos** `colonias_decada.*.bak.json` tras comprobar llave por llave que **ninguno tenía datos únicos** (2 estaban versionados, 54 no).
- **🚨 HALLAZGO QUE BLOQUEA EL CABLEADO AL MOTOR:** hay **dos normalizadores que no se hablan**. Codex valida contra `colonias_maestro.json` y todo cuadra; pero contra `_norm_col_key()`/`_es_junk_colonia()` de `backend/routers/edades.py` (lo que la app ejecuta al buscar) salen **228 llaves que el motor no encuentra**, **770** que se descartarían y **112 décadas contradictorias**. Detalle y plan en la memoria `project_colonias_decada_estado.md`.
- **Manual de Arquitectura ZMG movido** de Downloads a `C:\Users\pedru\valuation-ai\Manual-Arquitectura-ZMG` (fuera del repo git a propósito: 108 MB son imágenes). Limpieza verificada: **485.8 → 145.3 MB**.

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **NO cablear `colonias_decada.json` al motor hasta resolver el conflicto de normalizadores.** Decisión acordada con Codex: mantener `colonias_maestro.json` como canónico y **traducir en la lectura** (índice `_norm_col_key` → clave canónica, con **municipio como parte de la identidad**), sin renombrar llaves masivamente. **NO aplicar `_es_junk_colonia()` al maestro** — esa función es solo para entradas crudas/scrapeadas.
- **El 77% del dataset sigue siendo `heuristica-anillo`** (estimación por distancia al centro), no investigación. Cobertura ≠ evidencia.
- **A4 EstateElite hoja 2: NO desplegar, rediseñar primero.** Hoja 1 aprobada y en producción.
- **Regla vigente:** bug de producción → verificar SIEMPRE contra `cluster0.9eliadx` (prod real), nunca asumir que el diagnóstico en staging aplica.
- Motor JS: sin tocar. PINCALI: re-enriquecimiento sigue bloqueado por soft-block.

## ⏳ Pendientes / decisiones abiertas
1. **Tarea 6 — alinear llaves de colonias con el normalizador de PropValu** (afecta al motor; ver `project_colonias_decada_estado.md` para el plan de 10 puntos con pruebas).
2. **Tarea 5 — desacoplar `colonias-confianza-web`** de `app\colonias-data.json` antes de decidir si se conserva el editor.
3. Resolver las **112 contradicciones**: dry-run hecho, 90 se resuelven solas por fuerza de fuente, 22 quedan en empate. **NO aplicado.**
4. Rediseñar hoja 2 del A4 EstateElite (pedir dirección de diseño antes de construir).
5. Anclas cliqueables en el PDF de EstateElite · letterbox del formato Facebook.
6. Verificar responsividad móvil real de `PromocionesTab` en teléfono físico.
7. Retomar re-enriquecimiento PINCALI (necesita proxy/backoff).
8. Meta tags Open Graph por propiedad en Promo Interactiva · contador de folio por presupuesto.
9. #29 Render respaldo gratis (pausa) · #34 SMTP (sin correo saliente).
10. ~337 colonias raras (Cancún/Toluca mal etiquetadas).
11. Exponer link de origen / remodelación en la plantilla de carga masiva de Data Exchange.
12. Migrar usuarios con `credits` int plano a ledger explícito (opcional).
13. Investigar por qué staging (`cluster1`) tiene datasets mucho más chicos que prod (La Calma: 29 vs 390).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging cluster1.avle5ez, bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente, sin cambios)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000`. Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **⚠️ El pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 23 routers. Deploy = `railway up --ci` manual.
- MongoDB: **prod real = `cluster0.9eliadx`**; backend local → `cluster1.avle5ez` (staging, bloqueado por IP allowlist).
- **Ads:** archivos en `backend/uploads/ads/` (volumen persistente confirmado).
- **Manual de Arquitectura ZMG:** `C:\Users\pedru\valuation-ai\Manual-Arquitectura-ZMG` — fuera del repo git. Alimenta el identificador de edad. Ver memoria `project_manual_arquitectura.md`.
