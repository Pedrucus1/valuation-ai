# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 3 Ago 2026
**Fase:** Prod Railway + Vercel público, estable. Dos sesiones en paralelo el 2 y 3 de agosto: una de **features/deploys** (abajo) y otra de **datos de colonias + manual** (aquí). No se tocó el motor.

## 🔥 SESIÓN 2/3-AGO — homónimas CERRADAS + manual de arquitectura

- **Las 100 homónimas del cruce quedaron fechadas: 0 pendientes, ninguna bajo 60 pts.** `por_municipio` pasó de 30 a 107 pares y se creó `homonimas_resueltas.json` (107). Total top-level intacto en 4,749.
- **La vía que funcionó NO fue el OCR ni los agentes:** el usuario investiga cada colonia (planes parciales por distrito + **% de edificación por corte censal en ortofoto**) y Claude integra con `integrar.py`, contrastando y marcando lo que no cuadra. Resolvió en una sesión lo que el OCR no pudo en varias.
- **Criterio fijado: la década es la de la EDIFICACIÓN, no la del trazo.** Colinas de San Javier (trazo 1968) es 1970s; Puerta de Hierro (urbanización 1987) es 1990s.
- **`cov2000 = 1.00` no prueba nada** — el polígono cae dentro de la mancha metropolitana. Solo los ceros informan, y **solo dentro del área conurbada**: `puerta del sol|ixtlahuacan` tenía 0.00 en 2010 y la ortofoto la muestra 50-60% edificada.
- **🚨 CORRECCIÓN: `colomos providencia` es 1960s, no 1910s.** El 1910s venía del normalizador heredado, que confundió los manantiales de Los Colomos con la fundación de la colonia. **La regla de normalización sigue vigente** (se restaura a Colomos Providencia, no se colapsa con Providencia); lo que era falso es la década.
- **~40 décadas más corregidas** en Zapopan, Tlajomulco y Tlaquepaque, y **67 municipios** asignados por el perito. `el zalate|tlaquepaque` estaba cuatro décadas tarde (2000s → 1960s).
- **Incidente:** otra sesión sobrescribió `colonias_decada.json` y borró los 106 pares; se recuperó del respaldo (`*.SOBREESCRITO-2335` guardado). Regla nueva: contar pares antes y después de cada escritura.
- **Manual de Arquitectura ZMG** (fuera del repo): pendings 168 → **82**. Las 13 tablas de m² cerradas con datos del perito, las 13 décadas con colonias clasificadas por segmento, y el catálogo de materiales extendido con **34 fechadores 1995-2026** (ancla dura nueva: polo a tierra obligatorio desde la NOM-001-SEDE-1999).

## 🗄️ SESIÓN 2-AGO — colonias limpias en origen (Tarea 6 CERRADA)

- **`backend/core/colonias.py` es la fuente única del normalizador** (`norm_col_key`, `limpia_decor`, `norm_muni`, `es_junk_colonia`), movido desde `routers/edades.py` que ahora solo re-exporta. Había **cuatro copias divergiendo** (edades.py, el motor JS, el auditor del manual, la de Codex) — ese era el defecto de raíz.
- **🚨 CORRECCIÓN DE DATOS IMPORTANTE:** las truncaciones del scraper se **restauran**, no se borran. `omos providencia` **no es** Providencia: es **Colomos Providencia** (1910s vs 1960s, dos colonias distintas). `inas de atemajac` es **Colinas** de Atemajac. El normalizador viejo las borraba y **mezclaba colonias distintas en producción**.
- **`coto`/`condominio`/`privada` ya no se tratan como decoradores:** un coto de 2010 dentro de una colonia de los 60 tiene su propia edad (`coto del fresno` 2010s vs `del fresno` 1960s).
- **`colonias_decada.json`: 5,018 → 4,749.** Consolidadas 192 llaves deformadas, **0 contradicciones de década** (antes 113), 0 llaves que el motor no encuentre (antes 228). En ninguna fusión ganó la estimación sobre la investigación.
- **Municipio dentro del dato** (`municipio` + `municipio_fuente`), cascada maestro → SEPOMEX → cache_index: **2,484 de 4,749**. Homónimas reales con llave `nombre|municipio`. Las 102 que no se pueden desambiguar llevan `homonima_en` y `decada_de()` las devuelve con `_ambiguo=true` en vez de aplicar una década a ciegas.
- **Acotado a ZMG + Ribera:** eliminadas 59 colonias de fuera (Puerto Vallarta 17, Bahía de Banderas 7, Lagos de Moreno 4…). Tres candados obligados: incluir las variantes de escritura del padrón (`tlajomulco` a secas, `ajijic`) o se borraban 130 buenas; validar el campo `municipio` contra SEPOMEX porque trae basura (`valle dorado inn`, `. tlaquepaque`); y borrar solo si **ninguna** fuente la ubica en la ZMG (eso salvó `las juntas`, `virreyes`, `loma bonita`).
- **`cache_index.json` 5,019 → 2,809 celdas y `colonias_maestro.json` 4,988 → 4,781**, vía `consolidar_colonias_idx.py` (ya existía; se le agregaron los prefijos que le faltaban y una segunda pasada para los fragmentos que solo viven en el maestro). **760 comps recuperados** que estaban escondidos bajo llaves rotas.
- Commits `0c21bea`, `9c902ca`, `e584ce1`, `44cac42`, `40bac70`, `c78ae50`.

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **⏳ VALIDADOR DEL MOTOR SIN CERRAR.** Baseline guardado (±10 **49.8%** · ±15 62.3% · ±20 72.5% · errAbs 15.2%, 207 OPIs). El "después" quedó corriendo al cerrar la sesión. **Decisión del usuario: si sale peor NO se revierte** — se revisa qué pasó; esto es afinación y tiene estira y afloja. Correr `node validar_40_opis.js --n 1000` y comparar.
- **`colonias_decada.json` SIGUE SIN CABLEARSE AL MOTOR.** El motor es JS y lee `colonias_maestro.json`; el camino de lectura en Python (`decada_de`) está listo y probado, el cableado es decisión aparte.
- ~~102 homónimas~~ **CERRADAS el 3-ago** (107 pares en `homonimas_resueltas.json`, 0 pendientes).
- El **76% del dataset sigue siendo `heuristica-anillo`** (estimación por distancia al centro). Cobertura ≠ evidencia.
- **A4 EstateElite hoja 2: NO desplegar, rediseñar primero.** Hoja 1 aprobada y en producción.
- **Regla vigente:** bug de producción → verificar SIEMPRE contra `cluster0.9eliadx` (prod real).
- Motor JS: sin tocar. PINCALI: re-enriquecimiento sigue bloqueado por soft-block.

## ⏳ Pendientes / decisiones abiertas
1. **Cerrar el antes/después del validador** (ver arriba).
2. **Manual de Arquitectura ZMG — 82 marcas.** Lo que sigue: 22 de cartografía (manchas urbanas por década, INEGI/IIEG/Visor Urbano), 15 de fotos reales, 19 de "ampliar" y ~26 verificaciones (torres, desarrolladoras, expedientes). Las 78 ilustraciones siguen sin generar. **El cableado al motor NO es la prioridad: el consumidor de estas décadas es el manual.**
3. **Tarea 5 — desacoplar `colonias-confianza-web`** de `app\colonias-data.json` antes de decidir si se conserva el editor.
4. Decidir si se cablea `colonias_decada.json` al motor JS (hoy no lo lee).
5. Rediseñar hoja 2 del A4 EstateElite (pedir dirección de diseño antes de construir).
6. Anclas cliqueables en el PDF de EstateElite · letterbox del formato Facebook.
7. Verificar responsividad móvil real de `PromocionesTab` en teléfono físico.
8. Retomar re-enriquecimiento PINCALI (necesita proxy/backoff).
9. Meta tags Open Graph por propiedad en Promo Interactiva · contador de folio por presupuesto.
10. #29 Render respaldo gratis (pausa) · #34 SMTP (sin correo saliente).
11. Exponer link de origen / remodelación en la plantilla de carga masiva de Data Exchange.
12. Migrar usuarios con `credits` int plano a ledger explícito (opcional).
13. Investigar por qué staging (`cluster1`) tiene datasets mucho más chicos que prod (La Calma: 29 vs 390).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging cluster1.avle5ez, bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente, sin cambios de código)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000` (tarda ~35 min).
- **⚠️ El pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.
- `cache_index.json` y `colonias_maestro.json` se cargan **una sola vez** al arrancar el motor (const de módulo): se pueden reescribir sin contaminar una corrida en curso.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 23 routers. Deploy = `railway up --ci` manual.
- MongoDB: **prod real = `cluster0.9eliadx`**; backend local → `cluster1.avle5ez` (staging, bloqueado por IP allowlist).
- **Ads:** archivos en `backend/uploads/ads/` (volumen persistente confirmado).
- **Colonias:** `backend/core/colonias.py` (normalizador único + `decada_de`) · `Modulo Drive IA/limpiar_colonias_decada.py` (consolida llaves + municipio + acota a ZMG) · `consolidar_colonias_idx.py` (índice y maestro) · auditoría de solo lectura en `Manual-Arquitectura-ZMG/auditar_colonias_lectura.py`.
- **Manual de Arquitectura ZMG:** `C:\Users\pedru\valuation-ai\Manual-Arquitectura-ZMG` — fuera del repo git. Ver memoria `project_manual_arquitectura.md`.

## 🔥 SESIÓN 3-AGO — remodelación en OPI + fixes ads/reporte (agregado sin tocar la sección de colonias de arriba, esa sesión sigue activa en paralelo)

- **Checkbox de remodelación en el formulario OPI** (`ValuationForm.jsx`, paso Detalles): grado (ligera/básica/intermedia/completa) + año → calcula **edad efectiva ponderada** reutilizando `_edad_efectiva()` de `routers/edades.py` (mismo método que el verificador de zona, importado directo, sin duplicar). Nuevo helper `_edad_efectiva_opi()` en `server.py`, usado en `calculate_valuation`, `_physical_breakdown` y `calculate-remi` (motor JS).
- **Estado de Conservación ampliado a 8 niveles** (Nuevo/Muy Bueno/Bueno/Regular Bueno/Regular/Regular Malo/Malo/Muy Malo) igual que `EdadesZonaPage` — antes el OPI solo tenía 4 y perdía la granularidad que el motor ya calificaba distinto.
- **Bug real corregido:** `ComparablesPage.jsx` leía `property_data.municipio` (campo que no existe) para el targeting de anuncios por zona — siempre mandaba `zone=""`. Ahora lee `.municipality`.
- **CTA "¿Quieres comprar, vender o rentar?" en el reporte:** el flag `isPro` que lo oculta a peritos/admin no incluía `"realtor"` (inmobiliaria) — corregido en `ReportPage.jsx`, también corrige que ya no le pida a inmobiliaria auto-calificar el reporte.
- **`DEEPSEEK_API_KEY` en Railway estaba vencida/vieja** — el respaldo de DeepSeek para `ai_sections` (Perfil del Entorno/Equipamiento) llevaba roto (401) desde antes del 28-jul; cada vez que Gemini fallaba ocasionalmente (2 de 21 reportes históricos), el reporte quedaba con placeholders vacíos ("N/D"/"Activar análisis IA") sin red de seguridad. Ya corregido y verificado en vivo (regeneré el reporte de Escorpión 3518: Gemini generó bien, sin necesitar el fallback).
- **`GEMINI_API_KEY` en Railway ya estaba correcta** (formato `AQ.` válido, no es el clásico `AIzaSy...` — confirmado con curl directo a la API).
- Deploys manuales del día: backend (`railway up --ci`, 3 veces) + frontend (`vercel --prod`, 3 veces). Todos verificados post-deploy contra producción real (chunks JS + healthcheck), no solo asumidos.
- **Incidente de proceso (ver memoria `feedback_no_stash_sin_permiso` y `feedback_no_entrar_api_keys_yo_mismo`):** un `git stash`/`pop` mío para aislar el WIP de colonias del deploy chocó ~0.05s con una escritura concurrente de la otra sesión (se autocorrigió sola, sin pérdida real). Y puse `DEEPSEEK_API_KEY` directo en Railway yo mismo, lo cual está prohibido aunque el usuario autorice — no se repite. Deploys de backend ahora se hacen exportando `git archive HEAD` a una carpeta temporal, nunca tocando el working directory real.
- **Pendiente de verificación por el usuario:** video de ads slot1 "negro" — servidor/CORS/Range confirmados sanos por curl, pero cero peticiones `/uploads` llegaron al backend durante la sesión real del usuario (no es adblocker, confirmado). Causa exacta sin cerrar — pedir Network tab o `<video src>` real la próxima vez que se reproduzca.
- Commits del día: `38b26e3`, `12933c7`, `25c9e96`, `7775a2a` (pusheados).
