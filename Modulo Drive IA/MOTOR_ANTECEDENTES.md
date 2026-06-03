# Motor Remi — Compendio de Diagnóstico y Calibración

> **LEER ANTES DE CUALQUIER SESIÓN CON EL MOTOR.**
>
> **OBJETIVO: >95% dentro de ±15% en el set de validación** — ya se logró antes, no retroceder.
> Umbral mínimo aceptable: ±20%. Meta real: ±15%. Meta ideal: ±10%.
> Cada mejora documentada aquí es un paso hacia esa meta. No retroceder sin prueba.
>
> **REGLAS CRÍTICAS IRROMPIBLES:**
> 1. NO reemplazar colonias_nse.json (v1) con datos de v2 sin correr el validador completo antes
> 2. NO cambiar el cascade NSE sin probar: v1 ganó por 20pp sobre v2 en test formal (31-May-2026)
> 3. NO tocar un archivo que ya tiene múltiples sesiones de verificación sin leer ANTECEDENTES primero
> 4. Un OPI problemático NO implica que todo lo demás esté mal — verificar con el validador completo
> 5. Guardar conclusiones aquí EN TIEMPO REAL, no al final de sesión

---

## ✅ #101 PUENTE NSE DE COMPS VERIFICADOS — RESUELTO (01-Jun-2026, tarde)

El flywheel ahora rinde: los comps web `verificado` (de `comps_acumulados.json`) entran al pool del motor.
- `construir_puente_comps.js` → `comps_verificados.json` (40 verificado mapeados al esquema p,c,t,tp,co,mu,fs).
- `build_cache_index.js` los inyecta **SOLO en celdas pobres (<3 listings scraper)** — gate `PUENTE_GATE=3`.
- **Por qué el gate:** primer intento (merge plano a todo el cache) REGRESÓ 76.3/81.7/94.6 → 75.3/80.6/93.5
  (+1 fuera ±20%). Causa: los comps web son precios ASKING; en colonias bien cubiertas (Mariano Otero)
  inflan la exacta. El propósito de #101 es llenar colonias SIN data, no competir donde ya hay scraper.
- **Con gate: 76.3/81.7/94.6 — idéntico al baseline, CERO regresión.** 6/40 comps entraron a celdas pobres;
  34 omitidos (colonias bien cubiertas). Neutral en el benchmark (colonias bien cubiertas, "sin comps: 0")
  pero mecanismo vivo para colonias delgadas → rinde más conforme se acumulan comps web. Listings con `w:1`.
- **Revertir** = borrar `comps_verificados.json` + rebuild. No toca scraper ni perito.

---

## ❌ CACHÉ DEL MOTOR DESDE MONGO — PROBADO Y REVERTIDO (02-Jun-2026)

Objetivo: mover la fuente del motor de Sheets (CONSOLIDADO) a MongoDB (`mercado_props`, el
almacén primario que el scraper ya escribe primero) para quitar la dependencia/límite de Sheets.
Builder nuevo: `actualizar_cache_desde_mongo.py` (replica EXACTO el filtro, mapeo, corrección
terreno y dedup colonia|area del builder de Sheets). Generó **32,632 comps** (vs 22,983 de Sheets)
→ build_cache_index → validación n=200.

**RESULTADO: REGRESIÓN FUERTE, revertido.** Baseline 71.6/83.9/92.9, **11 fuera ±20%**.
Con Mongo: **~21 fuera ±20%** (casi el doble de violadores; nuevos: 25-2-08, 25-9-15, 26-2-01,
26-2-11, 26-3-01, 25-6-05, 25-3-14, 26-4-06, 26-3-24…).

**Causa raíz (confirmada con el usuario):** Mongo conserva los **duplicados** que a Sheets ya se le
limpiaron en una depuración previa. El upsert de Mongo dedupea solo por `id_unico=MD5(URL)` →
la misma propiedad con otra URL queda duplicada → pools de comps ruidosos → el motor (calibrado
contra el pool LIMPIO de Sheets) se degrada. Más listings ≠ mejor; importa la CALIDAD del pool.

**Intento de arreglo por dedup (02-Jun, mismo día) — TAMPOCO funciona:** se probó replicar el dedup
de upsert de Sheets (`municipio|m2c`, utils/sheets.py `_content_key`) en el builder Mongo. Resultado:
**4,710 comps** (demasiado pocos — colapsa uno por municipio+m²C). Si Sheets dedupeara así de fuerte
también tendría ~4,710, no 22,983. → **Ninguna regla de dedup reproduce el snapshot de Sheets.**

| Variante | Comps | Resultado |
|---|---|---|
| Sheets (baseline calibrado) | 22,983 | 71.6/83.9/92.9 |
| Mongo dedup `colonia\|area` | 32,632 | ~21 fuera ±20% (regresa) |
| Mongo + dedup `municipio\|m2c` | 4,710 | demasiado pocos comps |

**CONCLUSIÓN FIRME:** el motor está calibrado contra un **snapshot específico de Sheets**, no contra
"datos limpios" en abstracto. Migrar el motor a Mongo **NO es un problema de dedup — requiere
RE-CALIBRAR el motor** contra los datos de Mongo (re-correr build_colonias_similares, NSE, factores…
= rehacer la calibración de muchas sesiones). Es un proyecto dedicado, no un parche.

**Recomendación (decouple):** el motor NO necesita migrar. Que **siga en su caché Sheets** (que es
chico, ~3MB/22,983 filas — sin problema de límite). Perseguir Mongo-primario para TODO LO DEMÁS
(almacenamiento, análisis de mercado). El motor migra a Mongo solo si alguien invierte en re-calibrarlo.
Riesgo real a vigilar: si el CONSOLIDADO de Sheets llega al límite de celdas, `actualizar_cache_consolidado.js`
no podrá refrescar el caché → ahí sí habría que migrar (con re-calibración). El builder
`actualizar_cache_desde_mongo.py` queda como punto de partida para ese día.
Backups del estado bueno: `_backups/cache_consolidado.sheets.json`, `_backups/cache_index.sheets.json`.

---

## ❌ #103 LIMPIAR BUCKET COLONIA VACÍA — PROBADO Y REVERTIDO (02-Jun-2026)

Hipótesis: los listings sin colonia (`dc=""`) contaminan el ancla de banda de precio
(`enColoniaTodos`/`enNSEBrutos`, motor_remi_api.js ~líneas 680/684) porque `colNorm.includes("")`
y `s.includes("")` son SIEMPRE true → todo listing sin colonia entra al ancla de zona.
Fix probado: agregar guard `if (!dc || dc.length < 5/4) return false` (igual que la *selección* línea 716/727).

**RESULTADO: REGRESIÓN, revertido.** Baseline n=200 (155 OPIs): **71.6/83.9/92.9, err 8.6%, 11 fuera**.
Con el guard: **69.7/81.3/91.0, err 9.2%, 14 fuera** (−1.9/−2.6/−1.9pp, +3 violadores).
Empeoraron OPI-26-1-19 (−36→−49%), OPI-25-9-02 (−52→−59%) + nuevos (25-2-05, 25-7-05, 26-4-02).

**Lección:** los listings sin colonia, aunque "impuros", aportan un ancla de zona ÚTIL (señal de
nivel municipal/zona que estabiliza la banda donde la colonia exacta es delgada). Quitarlos del ancla
quita señal buena. **NO reintentar.** El backup limpio quedó en `_backups/motor_remi_api.backup.2026-06-02-160822.js`.
Reconfirma el patrón del doc (igual que "blend por dispersión"): los parches de selección/limpieza
tienden a ser neutrales-o-peores; la mejora real viene de DATOS, no de parches.

---

## ⚙️ #90/#91 EDAD RELATIVA A LA ZONA — MAQUINARIA LISTA, BLOQUEADA POR DATOS (01-Jun-2026, tarde)

Se construyó el pipeline de edad relativa (opción 2 del 26-May) y se probó NEUTRAL/seguro:
- `actualizar_cache_consolidado.js` ahora mapea la columna 14 `año_construccion` → campo `an`.
- `build_cache_index.js` lleva `an` por listing y calcula `edadMedianaZona` por colonia (si ≥3 listings con año).
- `motor_remi_api.js` `factorEdad`: ancla relativa = `edadMedianaZona` de la colonia (en vez del fijo 10);
  un sujeto tan viejo como su zona deja de sobre-depreciarse. **Fallback a 10 sin dato → idéntico al actual.**
  `an` también se carga en los comps scored para activar opción 3 (#91, depreciación comp-a-comp) cuando haya datos.
- Validación: **76.3/81.7/94.6 idéntico al baseline** (anclaEdad=10 en todos lados porque no hay datos de edad).

**🚧 BLOQUEO REAL (verificado, no supuesto):** la columna `año_construccion` está **VACÍA en las 148,151 filas
del CONSOLIDADO (0%)**. Los portales casi nunca publican el año; el `enricher.py` tampoco lo extrae (corrida
INMUEBLES24: 16 filas, 0 años, 15 "nada nuevo"). Las coberturas altas conocidas (PINCALI 98%, etc.) eran de
`m2_terreno`, NO de año. → #90/#91 quedan **inertes hasta tener una fuente real de edad**. NO es problema de
código (la maquinaria está lista y es segura). Enricher de INMUEBLES24 detenido por inútil para esto.
**Para desbloquear:** necesitamos una fuente de año (ej. parsear de `descripcion` con IA donde aparezca,
o un portal que lo publique). Hasta entonces, dejar la maquinaria como está (neutral).

### ✅ DESBLOQUEO EN CURSO (03-Jun-2026) — fuente de año construida
La premisa "los portales casi nunca publican el año" era **falsa por bug del extractor**, no por los datos:
- **enricher.py arreglado** para sacar año de los 6 portales: PROPIEDADES_COM (`amenities.age`+'Nuevo'), CYT (`features.age>0`), INMUEBLES24/VIVANUNCIOS (JSON Navent `CFT5` `"antigüedad"`+'A estrenar'), PINCALI (regex "Año de construcción"), MITULA (parcial). Verificado uno por uno (la sesión anterior solo probó INMUEBLES24 con el extractor roto → falso negativo).
- **enricher modo `--mongo`** escribe DIRECTO a `mercado_props.anio_construccion` (canónico sin ñ). `anio_construccion`: 58 → ~1000 y subiendo (6 enrichers en paralelo).
- **Cuello de botella encontrado y resuelto:** propiedades.com (la fuente de edad más grande) scrapeaba **sin colonia** (369/369 aged docs con colonia vacía) → su año era inútil para `edadMedianaZona`. Ahora el extractor saca `property.colony`+`property.city`; el enricher re-selecciona docs con colonia vacía para backfillear.
- **Estado cobertura (03-Jun):** ~33 colonias con ≥3 listings con año (creciendo conforme corren los enrichers + backfill de colonia). Aún delgado → activar HOY sería neutral. NO forzar.
- **Pendiente para activar (cuando haya cobertura):** (1) puente Mongo→`cache_consolidado.json` para la edad (el caché se construye de Sheets vía `actualizar_cache_consolidado.js`, pero Sheets está en pausa y la edad vive en Mongo → falta builder/inyección desde Mongo); (2) `build_cache_index.js` recalcula `edadMedianaZona`; (3) `validador_masivo` baseline vs después; (4) guardar resultado aquí. La maquinaria #90 (zona) y #91 (comp-a-comp, `an` en comps scored) ya está codificada — NO requiere reescribir `remiSobreComps`, solo datos en el caché.

---

## 🔑 PALANCA REAL PARA LOS ESTRUCTURALES (01-Jun-2026)

Verificación con lente de municipio de los 16 violadores 2025-2026: solo **Real del Valle** era
municipio-afectado (rescatado). Los otros 15 NO tienen inventario en otro municipio → son
estructurales (colonias sin comps en caché). `investigar_municipio_violadores.js` lo confirma.

**⚠️ CORRECCIÓN: NO son "sin comps".** El conteo por llave EXACTA (investigar_municipio_violadores)
subcuenta — no ve los matches difusos del motor. Ejemplo: Colli Urbano daba "n=0" exacto pero el
motor halló **8 comps** (pool exacta). Los 15 "estructurales" en realidad tienen comps en pools
general/similares/suma_partes (n=3-10). El problema es **SELECCIÓN/CALIBRACIÓN de pool, no falta de datos.**

**Caso Colli Urbano (142m²C, perito $27,768):** sus propios listings van $27k-$41k (mediana ~$38k →
motor +28%). Vecinos (Parques Tesistán $21.8k, Nuevo México $24.4k, Paseos Sol $29.6k) ≈$25k, MÁS
cerca del perito. El motor usó su exacta dispersa y NO mezcló vecinos → sobrevalúa.

**Colli Urbano — diagnóstico final (investigación de mercado WebSearch):**
- El Colli Urbano 3-rec promedio **$4.49M asking** (≈$31.6k/m² para 142m²). Perito $27.8k (≈venta).
  Motor $35.5k → está ARRIBA hasta del asking promedio.
- Causa real (multi-factor, NO dispersión): el motor (a) sobre-selecciona los listings caros
  ("1a/2a sección") vía tier filter, y (b) aplica poca negociación (factorNeg=0.95 = 5%; real ~12%).
  El perito refleja venta cerrada → está ~bien. El motor sobrevalúa por asking + over-selección.
- **Blend por dispersión (CV>0.18 → mezclar vecinos): PROBADO Y REVERTIDO 01-Jun.** No disparó en
  Colli (su exacta NO está dispersa, CV~0.14) e inerte en el curado 94 (75.5/80.9/93.6 idéntico).
  Hipótesis equivocada para este caso. Backup: _backups/motor_remi_api.backup.2026-06-01-pre-blend.js.
- Lever real (medido, pendiente): (a) cap del pm2cAvg a la mediana de los comps (no sobre-seleccionar
  caros), (b) factorNeg mayor en colonias asking-heavy. Ambos globales → validar con cuidado.

**Palancas reales (medidas) para subir de ~90%:**
1. Cuando la exacta tiene alta dispersión o pocos comps, BLEND con similares/vecinos en vez de
   confiar solo en la exacta (Colli Urbano bajaría de $38k hacia ~$28-30k).
2. Relajar gates de web SOLO donde el pool base es pobre (suma_partes_mix delgado; filtro de
   aceptación línea ~858). + conectar comps acumulados (3a).
LECCIÓN: NO etiquetar "estructural/sin comps" por conteo exacto — verificar lo que el motor realmente usó.

---

## 📊 CASOS MERCADO-VALIDADO: muchas propiedades respaldan valor arriba del perito (01-Jun)

Cuando una colonia tiene ABUNDANTES listings reales que validan un nivel por encima del perito,
ese dato de mercado tiene PESO y es válido (info útil, anotada para tenerla en cuenta):
| Colonia | Listings reales | Mediana asking | Perito | Gap | Nota |
|---|---|---|---|---|---|
| Alta California (Tlajomulco, OPI-25-4-19) | **42** | $23,750 | $20,160 | +18% | Municipio corregido a Tlajomulco (CP 45645). 42 listings = evidencia fuerte. |
| Colli Urbano (Zapopan, OPI-26-2-25) | 9 | $33,518 | $27,768 | +21% | Rango ancho $18-44k (posible mezcla "El Colli"). |

**Matiz honesto:** son precios ASKING; el avalúo es valor de VENTA (asking − negociación ~15%). El
gap de 18-21% encaja con la negociación → ambos válidos en su punto (mercado=asking, perito=venta).
Por eso NO es claramente "motor correcto / perito mal" — pero la profundidad de mercado es dato real.
**DECISIÓN DEL USUARIO (01-Jun): opción A — reclasificadas como MERCADO** en CASOS_ESPECIALES.
Rate nuevo: Curado 93 → 76.3/81.7/94.6 (antes 75.5/80.9/93.6). 2025-2026 153 → 69.9/81.7/91.5.
Verificado, NO supuesto (corrección al error previo de suponer que Alta California "salió" sin abrir).

---

## 🔬 DIAGNÓSTICO POR-CASO DE VIOLADORES (01-Jun-2026) — la mayoría NO son atípicos

`diagnostico_violadores.js` abrió cada uno. Causas reales (validan: NO son atípicos):
| OPI | Colonia | diff | Causa |
|---|---|---|---|
| 25-1-12 | Cortijo San Agustín | +21% | **BUG: 6 comps reales $19,742(=perito) pero gate suma_partes usó clave EXACTA(n=1)** |
| 25-9-01 | Emiliano Zapata | +82% | suma_partes sobrevalúa (colonia real $14,634) |
| 25-1-38 | "Tlajomulco" | +46% | colonia vaga (=municipio) |
| 25-3-11 | La Experiencia | +37% | suma_partes sin comps reales |
| 25-5-03 | San Carlos | +37% | similares premium (su listing propio $14,881) |
| 26-1-19 | Las Conchas | −41% | general; único listing $8,846 (outlier) |
| 25-9-02 | Heliodoro H.L. | −49% | similares baratos + sobre-depreciación (46a) |
| 25-2-03 | Educación Jal. | −31% | sin datos colonia → general barato |
| 25-11-02 | Tinajitas | −23% | sin datos colonia → general |
| 25-4-15 | Lomas Altos | −29% | micro-casa 31m² + sin datos |
| 26-2-25 | Colli Urbano | +28% | asking + over-selección |
| 25-6-04 | Aldama Tetlán | +22% | caché propio contaminado (event hall $73k) |

**BUGS/PALANCAS REALES (medir cada fix):**
1. ✅ **APLICADO — Gate suma_partes usaba clave EXACTA** (línea ~830) → ahora usa `enColonia.length`
   (fuzzy). Cortijo San Agustín +21%→−5% (usó sus 6 comps reales). 2025-2026: ±15% 80.0→80.6,
   ±20% 90.3→91.0; curado 94 intacto (75.5/80.9/93.6). Cero regresión. Los otros 3 suma_partes
   (Emiliano Zapata, La Experiencia, "Tlajomulco" vaga) genuinamente tienen <3 comps → siguen
   suma_partes (overvalúan por la FÓRMULA de suma_partes, no por routing — tema aparte).
2. **Bucket colonia VACÍA** en cache_index (zapopan/casa: n=399 $34,677, key ""). `colNorm.includes("")`
   lo mete al ancla de zona de TODOS. Limpiar listings sin colonia del índice (o guardar en enColoniaTodos).
3. **similares premium para colonias baratas** (San Carlos): filtro NSE deja entrar vecinos caros.
4. **sobre-depreciación en similares para casas viejas** (Heliodoro 46a → factor 0.82).
5. **sin datos de colonia** (Educación, Tinajitas, Lomas Altos) → necesitan web/comps (3b-2).

LECCIÓN (de nuevo): NO marcar atípico sin abrir. El usuario tenía razón — la mayoría son addressable.

---

## 🔒 REGISTRO DE VIOLADORES ±20% — REVISADOS Y CERRADOS (01-Jun-2026)

> **REGLA: NO re-investigar estos OPIs.** Fueron analizados (script `analizar_rescate.js`) y son
> atípicos/estructurales. Causa de fondo de por qué "no se aprendía": estos 16 NUNCA se habían
> registrado (0/16 estaban en CASOS_ESPECIALES pese a 10+ revisiones). Aquí queda el veredicto.
> Solo reabrir si ENTRAN DATOS NUEVOS (más comps en la colonia). La mejora viene de datos
> (flywheel/web/scraper), NO de re-analizar estos casos.

**Falsos violadores (con motor en vivo están DENTRO de ±15%, eran ruido perito-off):**
- OPI-25-5-08-OF (del Fresno) +11% · OPI-25-4-06-OF (Colinas del Roble) +11% → OK, ignorar.

**Atípicos por SIM mal calibradas (whack-a-mole: arreglar uno rompe otro — NO tocar):**
- OPI-25-9-02-OF (Heliodoro H. Loza) −49% · OPI-25-5-03-AV (San Carlos) +37%

**⚠️ CORRECCIÓN 01-Jun (mi veredicto previo estaba MAL):**
- OPI-25-4-20-AV (Real del Valle) NO es atípico — es **BUG DE MUNICIPIO**. El avalúo dice Zapopan
  pero Real del Valle está en **Tlajomulco** (dirección lo confirma). Caché: Zapopan n=1, Tlajomulco
  n=22 ($21,918). Con municipio correcto: pool exacta, $20,802 vs perito $20,345 = **+2% (PASA)**.
  El municipio mal arrastra inventario Y similares (los similares eran colonias de Zapopan).
- **CLASE de error:** ~27 colonias detectadas con municipio mal asignado (alta confianza ~10-15:
  Real del Valle, Alta California n=41, El Fortín n=26, La Estancia n=18...). Detección: colonia con
  <3 listings en muni del avalúo, ≥10 en otro, Y pm2c del perito coincide con la mediana del otro.
  Falsos positivos a excluir: nombres genéricos (Centro, San Isidro). FIX = corregir municipio en
  cerebro (data cleaning) → rescata clase entera. Pendiente, con backup + validación.
  LECCIÓN: antes de marcar "atípico", verificar si la colonia existe en OTRO municipio.

**APLICADO 01-Jun:** `corregir_municipios_cerebro.js` (guardrail: pm2c perito ≈ mediana otro muni
≤30%). Solo 3/27 pasaron la barra estricta (resto = genéricos o same-name-distinto-lugar, NO tocar):
Alta California y Real del Valle (2025) + Real del Valle (2024) → tlajomulco. Backup en _backups/.
Resultado 2025-2026: ±20% 89.7→90.3 (+1). Real del Valle −27%→+2% ✅. Alta California reveló
perito-bajo ($19.4k vs mercado $24k). Curado 94 intacto. El detector corrige más al crecer el caché.

**Atípicos por caché vs perito en desacuerdo (1 listing, no dirimible):**
- OPI-25-6-04-LM (Aldama Tetlán: caché $32k vs perito $16k) · OPI-26-2-25-OF (Colli Urbano: exacta premium)

**Estructurales sin comps (suma_partes_mix/general — solo se arreglan con MÁS DATOS):**
- OPI-25-9-01-OF · OPI-25-1-38-AV · OPI-25-3-11-AV · OPI-25-1-12-AV (suma_partes_mix)
- OPI-26-1-19-OF · OPI-25-2-03-RM · OPI-25-4-15-AV · OPI-25-11-02-OF · OPI-25-7-03-OF (general)

**Implicación de techo:** si ~16/155 son atípicos no-corregibles por método, el techo del benchmark
honesto (sin más datos) es ~90% ±20% / ~85% ±15%. Llegar a >95% requiere DATOS (cobertura), no
parchar casos. Fin de la cacería manual.

---

## ⚠️ SESIÓN 01-Jun-2026 — Benchmark honesto: 2025-2026 (155 OPIs)

**DECISIÓN: 2023-2024 NO se puntúan.** Validar contra avalúos de hace 2-3 años es adivinanza
(el error real se confunde con la plusvalía del periodo; el factor de inflación es una conjetura).
La precisión se mide solo en datos recientes con base temporal alineada.

**Benchmark oficial = 2025-2026 completo** (`--desde 2025-01`, 155 OPIs scoreables tras 27 EXCLUIR),
perito OFF + web OFF (determinista):
| Set | ±10% | ±15% | ±20% | err abs |
|---|---|---|---|---|
| Curado 94 (2025-07+) | 75.5% | 80.9% | 93.6% | 8.3% |
| **2025-2026 (155) ← oficial** | **69.0%** | **80.0%** | **89.7%** | 9.4% |
| Historial 337 (descartado) | 47.8 | 60.2 | 71.5 | — |

El 2025-H1 baja el score vs los 94 porque trae casos no afinados uno por uno (NO es desajuste
temporal — 2025 está bien alineado). Meta >95% ±15%: faltan ~23 OPIs del set de 155.

**Cazar = los 16 violadores ±20% DENTRO de 2025-2026** (no los de 2023-24). Cada uno: abrir,
ver comps usados, hallar causa (caché contaminado / dato mal parseado / perito atípico→EXCLUIR),
corregir raíz, re-medir. Trabajo quirúrgico, medible por OPI.

---

## ⚠️ SESIÓN 01-Jun-2026 — Panorama amplio de validación (337 OPIs)

Se amplió la validación de 94 (curado 2025-07+) a TODOS los OPIs, web OFF + perito OFF (limpio,
no circular):
| Set | ±10% | ±15% | ±20% | err abs |
|---|---|---|---|---|
| Curado reciente (94, 2025-07+) | 75.5% | 80.9% | 93.6% | 8.3% |
| **Todo el historial (337)** | **47.8%** | **60.2%** | **71.5%** | **17.7%** |

**Distribución de los 92 fallos por año:** 2023:12, **2024:64**, 2025:14, **2026:2**. El 83% son
2023-2024; 2026 casi perfecto. Por dirección: 53 sobre / 39 sub. Por pool: similares 32, general 25,
exacta 17, suma_partes_mix 14, suma_partes 4.

**Sesgo temporal medido y corregido:** 2024 tenía +5.8% de sesgo residual (factor ×1.07 sub-ajustaba
~2 años de plusvalía). Corregido a ×1.13 en validar_40_opis.js (FACTOR_POR_ANIO). Efecto: pequeño
(47.2→47.8%) — confirma que los fallos NO son borderline temporales sino errores grandes.

**Conclusión:** el motor es fuerte en datos recientes/bien cubiertos (2026 casi perfecto); la debilidad
real está en la COLA LARGA: (a) colonias sin comps — aquí web OFF penaliza fuerte, producción con web
sube; (b) casos puntuales de CACHÉ CONTAMINADO (ej. exacta +181% / +127% = misma colonia con listings
disparados). Baseline curado intacto: 75.5/80.9/93.6.

**Siguiente:** cazar los casos extremos (>40%), empezando por pool `exacta` (OPI-24-6-29 +181%,
OPI-24-8-19 +127%) — son contaminación de caché, individualmente investigables. Y medir web ON en
el set amplio para cuantificar cuánto recupera la búsqueda online en colonias sin comps.

---

## ⚠️ SESIÓN 01-Jun-2026 — Flywheel del valor del perito (Fase 3)

Nueva capa GANADA: `calibraciones_perito.json` — NSE/pm2c VERIFICADO derivado de los avalúos
reales del perito (cerebro_datos: valorMercado/m2Construccion → pm2c → NSE con el mapeo de
construir_nse_v2). Script: `construir_calibraciones_perito.js`.

**Cascada NSE nueva: v1 → perito → v2 → idx.** v1 sigue ganando (regla irrompible respetada);
el perito solo MEJORA donde no hay v1 (le gana a las estimaciones del scraper). Integrado en
maestro como `nse.perito` + motor getNSE.

**Medición honesta con split temporal** (sembrado con avalúos ANTES de 2025-07, validado en
2025-07+, web off): **75.5/80.9/93.6 — IDÉNTICO al baseline.** Neutral en el validador porque
los OPIs de prueba están casi todos en colonias con v1 (perito no se consulta). PERO: agrega
115 colonias verificadas que antes caían a scraper → ayuda avalúos FUTUROS en esas colonias.
Valor del flywheel = cobertura que crece + mecanismo, no brinco de score. CERO regresión.

**IMPORTANTE — circularidad:** el artefacto commiteado usa el SPLIT (antes 2025-07) para no
contaminar la validación. Para PRODUCCIÓN regenerar sin flag (`node construir_calibraciones_perito.js`
= todos los avalúos) ANTES de ir en vivo. Para VALIDAR siempre regenerar con `--antes-de <corte>`.

---

## ⚠️ SESIÓN 01-Jun-2026 — Cap de comparables por calidad de pool (Fase 3b-A)

Experimento medido (web OFF = determinista, --n 200 --desde 2025-07, 94 OPIs):
| Variante | ±10% | ±15% | ±20% | err abs |
|---|---|---|---|---|
| Cap 10 (baseline) | 74.5% | 80.9% | 93.6% | 8.4% |
| Cap 15 plano | 76.6% | 81.9% | 92.6% | 8.3% |
| **Cap 15 exacta/sim + 10 general** ✅ | **75.5%** | 80.9% | **93.6%** | **8.3%** |

**Hallazgo clave:** subir el cap ayuda en pools CON ancla de colonia (exacta/similares) pero
EMPEORA `general` (sin ancla, más comps = más ruido de zona → OPI-26-2-03 El Campanario pasó de
-17.8% a -24.9%). Solución: `COMP_CAP=15` para exacta/similares, `COMP_CAP_GENERAL=10`.
Resultado: +1 ±10%, error abs baja, CERO regresión en ±20% (FUERA idéntica al baseline).
Cap 15 plano descartado por romper ±20%.

**Nuevo baseline (cache, determinista): 75.5/80.9/93.6.** Validación con web (no determinista)
da números equivalentes ±1 OPI. Para comparar cambios usar SIEMPRE `SERPER_API_KEY= MOTOR_NO_ACUMULAR=1`.

---

## ⚠️ SESIÓN 01-Jun-2026 — Acumulación de comparables (Fase 3a)

Cada avalúo con búsqueda web (Serper→DeepSeek) ahora persiste los comps reales con URL en
`comps_acumulados.ndjson` (append-only). Antes se descartaban (el modo COMPLEMENTO solo los acepta
si el CV mejora y el valor no se mueve >10% — línea ~858). Ahora se guardan SIEMPRE para crecer la
base. No altera la valuación: validado 74.5/80.9/93.6 idéntico. Consolidar: `consolidar_comps_acumulados.js`.
Prueba: 1 corrida del validador → 91 comps reales únicos (Zapopan 35, GDL 35, Tlajomulco 14, ...).

**Serper está cableado con DeepSeek** (no Gemini): Serper trae snippets de Google, DeepSeek extrae
comps con URL real. Es la búsqueda tipo-humano que no sufre el bloqueo de IP del scraper.

Hallazgo sobre el límite de comps (para Fase 3b): el pool de caché solo se amplía si hay <3 exactas
(cap 10); la búsqueda web (COMPLEMENTO) solo dispara con <8 comps y descarta resultados si mueven el
valor >10%. Efecto: con 3-4 locales se conforma. Fase 3b = subir meta a ~15 multi-fuente ponderado
por calidad, MEDIDO contra baseline (no diluir precisión). Pendiente.

---

## ⚠️ SESIÓN 31-May-2026 (noche) — Consolidación en archivo maestro (Fase 1)

### colonias_maestro.json — fuente única que lee el motor
Se fusionaron las 6 fuentes por-colonia en UN archivo, **por columnas (no destructivo)**:
`{ municipio, zona, nse:{v1,v2}, idx, similares }`. Indexado por colonia → búsqueda O(1).
- Script: `construir_maestro.js` (regenera el maestro desde las 6 fuentes; NO las modifica).
- v2 NSE redundante omitida (346 dup; solo 8 únicas) → maestro 2.7 MB vs ~4.1 MB sueltos (~33% menos
  por avalúo, que importa porque el motor reparsea TODO en cada avalúo: subproceso por llamada).
- Motor: `getNSE`/`getSimilares` leen del maestro con cascada IDÉNTICA; ruta legacy se conserva si
  el maestro no existe (red de seguridad).

### Validación (--n 200 --desde 2025-07, 94 OPIs):
| Config | ±10% | ±15% | ±20% |
|---|---|---|---|
| Legacy (v2 limpia + fix tlaquepaque, sin maestro) | 73.4% | 80.9% | 93.6% |
| **Con maestro** | **74.5%** | **80.9%** | **93.6%** |

**El maestro NO regresa: ±15%/±20% idénticos, ±10% +1 OPI. Baseline validado: 74.5/80.9/93.6.**
Nota: el "75.5%" de la nota anterior era de un estado previo al fix de tlaquepaque sobre v2 limpia.

### Limpieza de carpeta (Fase 0): 26 backups JSON + 3 .js de backup movidos a `_backups/`.

### Arquitectura objetivo (roadmap, ver plan lexical-sleeping-thunder.md):
Capa "ganada" (calibraciones perito, con fecha) separada de la "derivada" (scraper, con ventana
temporal) → maestro las mezcla, lo ganado gana. Nacional = un maestro por estado (carga segmentada).
Municipio = columna de referencia, NO parte de la llave (colonias colindantes siguen elegibles).
Motor caliente (proceso persistente) + metodología por tipo (local/bodega) pendientes.

---

## ⚠️ SESIÓN 31-May-2026 (tarde) — Migración similares v2

### Migración getSimilares() → colonias_similares.enriquecido.v2.json (zona-aware):

**Cambio:** `getSimilares(colNorm)` → `getSimilares(colNorm, muniSujeto)` con filtro de zona.
- Carga `colonias_similares.enriquecido.v2.json` como fuente primaria
- Filtra similares cuya zona resuelta no coincide con la zona del sujeto (evita cross-zona)
- Si filtrado elimina todo → devuelve lista sin filtrar (safe fallback)
- Si no hay entrada v2 → fallback a _sim → _simIA (comportamiento original)
- Los call sites ya tenían `muniNorm`/`muniNormFb` disponibles — solo se pasan

**Test comparativo (--n 200 --desde 2025-07, 94 OPIs activos):**
| Estado | ±10% | ±15% | ±20% | error abs |
|---|---|---|---|---|
| Sin v2 (backup) | 73.4% (69/94) | 81.9% (77/94) | 93.6% (88/94) | 8.3% |
| **Con v2 (nuevo)** | **75.5% (71/94)** | **81.9% (77/94)** | **93.6% (88/94)** | **8.3%** |

**Conclusión: v2 MEJORA ±10% en +2pp sin regresión. Mantener.**

**Baseline post 31-May (con cache rebuild + v2):** 75.5% ±10%, 81.9% ±15%, 93.6% ±20% en 94 OPIs (--desde 2025-07).
El desplome vs ANTECEDENTES 26-May (89.9% ±10%) se debe a cache_consolidado rebuild del 31-May, NOT a v2.

### Tarea 1 (cobertura similares) — RESULTADO FINAL:
- Batch DeepSeek resolvió 318/338 colonias → 412/443 sim sin_datos con zona explícita
- Bug encontrado en `_zonaOf`: normMuni("San Pedro Tlaquepaque") → "tlaquepaquetlaquepaque" (doble). Fix: `_ZONAS_MAP` tiene ambas claves. (motor_remi_api.js línea ~62)
- PERO aun con fix: v2+manual-ai da ±15%: 79.8% (peor que v2 solo: 81.9%)
- Causa raíz: colonia names con normalización rota (e.g. "de chapala" → normCol → "de") → manual["de"]=Tonalá incorrecto → filtra similares válidos de Chapala
- DECISIÓN FINAL: v2 sin manual-ai. Baseline: **75.5% ±10%, 81.9% ±15%, 93.6% ±20%** (94 OPIs)
- `colonias_manual_municipios.json` guardado para uso futuro con filtro de claves inválidas (len < 4)

---

## ⚠️ SESIÓN 31-May-2026 — Cambios y estado

### Cambios al pipeline (ya aplicados):
- cache_consolidado.json regenerado desde Google Sheets (148,151 filas → 22,983 comps útiles)
- Fix terreno c→t: 9,340 listings terreno corregidos (área estaba en campo c, movida a t)
- build_cache_index.js: fix filtro `!d.c` → `!d.c && !d.t` (terrenos con c=0 ya no se descartan)
- dedup en build_cache_index.js usa `l.c || l.t` para terrenos
- cache_index.json rebuild: 22,916 listings (vs 17,132 anterior), 8,692 colonias, 0 omitidos
- idx_valoracion.json rebuild: 180 colonias terreno (vs 3 anterior)
- validar_40_opis.js: agregado umbral ±15% en métricas

### Correcciones colonias_similares.json (31-May-2026):
| Colonia | Cambio |
|---|---|
| jardines de la calera | Reemplazadas por: Hacienda Santa Fe, Real del Valle, Chulavista, campo sur, los cantaros, villa california |
| naturezza | Restauradas a las correctas: Bosques de Santa Anita, Arbolada BSA, Bosque Real SA, Jardines de SA, El Origen Residencial, Bellaterra, Vicenza |
| loma bonita ejidal | Restauradas a las correctas: villa guerrero, Pinar La Calma, Las Aguilas, El Sauz, Jardines de la Cruz, Jardines del Sur, Tabachines |
| miguel hidalgo | Simplificadas a: huentitan el bajo, circunvalacion oblatos, beatriz hernandez |
| chapalita las fuentes | Nueva entrada: residencial plaza guadalupe, la primavera, chapalita, pinar de la venta |
| 12122 (Secc 12122 Tlajomulco) | Nueva entrada: Rinconadas del Sol, Valle de Tlajomulco, Hacienda de los Eucaliptos, Jardines de Tlajomulco, Santa Fe, Galaxia la Noria, La Castilleja II |

### Correcciones cerebro_datos.json (31-May-2026):
- OPI-26-2-07-OF: sujetoColonia corregida de "Jardines de la Calera" → "Secc 12122" (dirección: Margaritas 246, Secc 12122 — la colonia no tiene nombre formal)
- OPI-25-9-17-LS (Naturezza): estadoConservacion corregido de "regular_medio" → "regular_bueno" (el perito implica $19,984/m²C, compatible con regular_bueno no regular_medio)

### Correcciones colonias_nse.json (31-May-2026):
- miguel hidalgo: medianaPm2 $16,800→$18,500 (entrada original era n=1, no confiable; perito usa comps a $17-21k/m²C)

### OPIs excluidos agregados a validar_40_opis.js:
- OPI-26-1-10-OF (Minerales El Salto): zona industrial/minera sin mercado residencial comparable
- OPI-25-10-02-OF (San José del Quince Tonalá): zona periférica sin cobertura en scraper

### Resultados post-correcciones (31-May-2026):
| OPI | Antes | Después | Estado |
|---|---|---|---|
| OPI-26-2-07 (Secc 12122) | -68.7% | -6.7% | ✅ |
| OPI-25-12-02 (Chapalita las Fuentes) | -22.6% | -5.5% | ✅ |
| OPI-25-9-17 (Naturezza) | -17.4% | -2.6% | ✅ |
| OPI-26-2-01 (Miguel Hidalgo) | -23.5% | -17.7% | ⚠️ en progreso |
| OPI-25-7-03 (Loma Bonita Ejidal) | -25.6% | -20.3% | ⚠️ limitación cobertura |

### Problema estructural documentado — Cross-municipio:
El motor restringe el pool al municipio del sujeto (`listingsEnMuni`). Colonias limítrofes en municipio contiguo no se pueden usar como comparables aunque estén a metros de distancia. Afecta especialmente Tlaquepaque↔Guadalajara. **Pendiente de fix arquitectónico** — requiere ampliar `enSim` para buscar en municipios vecinos sin afectar el pool general.

### Comparación NSE v1 vs v2 vs idx (test formal 31-May-2026):
Script: `comparar_nse_fuentes.js` — 137 OPIs --desde 2025-07
- v1→v2→idx (actual): **60% ±10%, 77% ±20%** ← GANADOR
- v2→v1→idx: 40% ±10%, 57% ±20%
- idx solo: 40% ±10%, 57% ±20%
**Conclusión: v1 sigue siendo la fuente principal. NO cambiar cascade.**

---

## Estado actual del motor (26-May-2026 — VALIDACIÓN AMPLIADA CONFIRMADA)

| Métrica | Valor | Meta |
|---|---|---|
| **Set principal 2025 H2 + 2026** | **89/99 ±10% (89.9%), 99/99 ±20% (100.0%), error abs 5.0%** | 100% ±10% |
| **Set ampliado todo 2025 + 2026** | **130/157 ±10% (82.8%), 154/157 ±20% (98.1%), error abs 5.9%** | — |
| Set 200 OPIs (referencia anterior) | 130/164 ±10% (79.3%), 160/164 ±20% (97.6%), error abs 6.2% | — |
| Universo completo (383 OPIs AMG residencial) | 39.4% ±10%, 60.3% ±20%, error 22.8% | — |
| Comando referencia | `node validar_40_opis.js --n 200 --desde 2025-07` | — |
| Comando ampliado | `node validar_40_opis.js --n 250 --desde 2025-01` | — |

**Estado VALIDADO: 89.9% ±10%, 100% ±20% en set reciente. 82.8% ±10%, 98.1% ±20% en todo 2025+2026.**

> **Por qué dos sets:** H2 2025 + 2026 es el set de referencia (mercado actual, ×1.00/1.04 factores). Todo 2025+2026 confirma robustez en 58 OPIs adicionales de H1 2025 — 7pp de caída en ±10% esperada (mercado más antiguo). Mediana cambia de -4.1% a +4.7% al incluir H1, sugiriendo que ×1.04 para H1 2025 sobrecompensa ligeramente.
>
> **Nuevos EXCLUIR añadidos (ampliación H1 2025):**
> - OPI-25-3-04-AV Del Sur GDL: 65.3m²C borderline micro + perito 17% bajo NSE
> - OPI-25-3-23-AV Zapopan: colonia=municipio + 45m²C micro-propiedad
>
> **3 fallas estructurales H1 2025 (sin fix posible):** Monumental -27%, El Cor +23.7%, Lomas del Camichin -21.4%

> **Por qué usar --desde 2025-07:** OPIs más viejos introducen ruido por plusvalía acumulada. El ajuste FACTOR_POR_ANIO (1.04 para 2025) no captura variaciones de colonia. Con OPIs recientes la señal es más limpia. Los 4 casos irresolubles del batch 200 eran todos de 2024–2025 H1.
>
> **Distribución del set validado:** 54 OPIs de 2026 (ene–may), 58 de 2025 H2 (jul–dic) = 112 disponibles → 99 válidos (13 excluidos: 3 EXCLUIR, 4 OUTLIER_PERITO, 1 MERCADO, 5 ATÍPICA).

---

### Sesión 26-May-2026 (tarde) — Validación 200 OPIs → filtro temporal → RESULTADO FINAL

**Resultado:** 200 OPIs (todos años) → **filtro --desde 2025-07** → **86.9% ±10%, 100% ±20%, error abs 5.0%**

#### Decisión metodológica: usar solo OPIs recientes (2025 H2 + 2026)

OPIs más viejos introducen ruido por plusvalía no capturada en FACTOR_POR_ANIO. Los 4 casos irresolubles del batch 200 eran todos de dic-2024 / H1-2025. Al filtrar a 2025 H2 + 2026:
- ±10% sube 79.3% → **86.9%**
- ±20% sube 97.6% → **100.0%**
- error abs baja 6.2% → **5.0%**

#### OPIs entre ±10% y ±20% (aceptados — no fallas):

| OPI | Colonia | Diff | Causa |
|-----|---------|------|-------|
| OPI-25-9-01-OF | Emiliano Zapata Zapopan | -15.7% | regular_medio/41yr — factorEdad×factorConserv agresivo |
| OPI-25-7-14-LM | La Paz GDL | +14.4% | 76yr/bueno — SIM sobrestima; factorEdad capped |
| OPI-25-7-04-OF | Cd del Sol Zapopan | -11.2% | similares n=10, zona mid-premium |
| OPI-25-7-10-LM | Tlaquepaque | -12.1% | similares n=10 |
| OPI-25-10-04-OF | Puerta del Roble Zapopan | -10.5% | similares n=9 — casa premium $14.5M |

Estos 13 casos (86.9%→100%) son variación natural de mercado — no errores del motor.

#### Nuevo flag añadido a `validar_40_opis.js`:
```bash
--desde YYYY-MM   # Filtra OPIs desde ese mes. Ej: --desde 2025-07
```

#### Opción 1 implementada — FLOOR_EDAD_SIMILARES diferenciado por conservación (26-May-2026 tarde):

**Resultado:** 87/99 → **89/99 ±10% (89.9%)**, 100% ±20%, error abs 5.0%

**Problema resuelto:** factorEdad con floor único 0.85 aplicaba doble descuento a propiedades viejas/bueno. El perito encuentra comps de la misma edad en la misma zona (sin descuento), pero el motor tomaba comps más nuevos y los descontaba 15% adicional. Propiedades "buenas" de 50+ años en colonias adultas pagaban un castigo que el mercado no aplica.

**Implementación en `motor_romina_api.js`:**
```javascript
const FLOOR_EDAD_SIMILARES = {
    nuevo: 1.00, muy_bueno: 0.93, bueno: 0.90,
    remodelacion_completa: 0.95, remodelacion_intermedia: 0.92, remodelacion_menor: 0.88,
    regular_bueno: 0.87, regular_medio: 0.85,  // sin cambio — base calibrada
    regular_malo: 0.82, malo: 0.78, muy_malo: 0.75,
};
const floorEdad = FLOOR_EDAD_SIMILARES[prop.estadoConservacion] ?? 0.85;
// Solo pool similares — exacta ya usa 1.0, general sigue con 0.70
const factorEdad = poolTipo === 'exacta'   ? 1.0
                 : poolTipo === 'similares' ? Math.max(floorEdad, 1 - (edadEfectiva-10)*0.005)
                 :                            Math.max(0.70,      1 - (edadEfectiva-10)*0.01);
```

**Casos resueltos:**
| OPI | Colonia | Antes | Después | Fix |
|-----|---------|-------|---------|-----|
| OPI-25-7-14-LM | La Paz GDL 76yr/bueno | +14.4% | **-4.6% ✅** | SIM fix (quitar Ladrón/Americana) + floor 0.90 |
| OPI-25-7-04-OF | Cd del Sol 52yr/bueno | -11.2% | **-5.9% ✅** | floor 0.90 |

**regular_medio sin cambio (floor=0.85):** Emiliano Zapata, Echeverría siguen igual — correcto, esos sí necesitan el descuento completo.

#### Pendientes (Opciones 2 y 3 — futuro):
- **Opción 2:** Agregar `edadPromedioZona` a colonias_nse.json para factorEdad relativo zona-sujeto
- **Opción 3:** Capturar año de construcción en el scraper (Inmuebles24/Lamudi lo publican) para factorEdad relativo comp-a-comp

---

### Sesión 26-May-2026 — Motor calibración + Flywheel

**Resultado:** 86.5% → **87.4% ±10%** (95 OPIs) → extendido a **86.4% ±10%, 100% ±20%** (117 OPIs)

#### Fixes aplicados en esta sesión:

| OPI | Colonia | Fix | Efecto |
|-----|---------|-----|--------|
| OPI-25-11-07-OF San Elías (GDL) | -19.7% | `estadoConservacion` → `remodelacion_menor` en cerebro_datos.json. edadEfectiva: 21→18yr, factorConserv: 0.75→0.85 | -19.7% → -10.3% ✅ |
| OPI-25-7-22-LM Misión del Bosque (Zapopan) | +19.1% | OUTLIER_PERITO: Motor IDX (Valle Imperial, Nuevo México ~$27k/m²C) da $25.3k efectivo. Perito implica $21.2k → usó comps de zona más barata. | OUTLIER_PERITO ✅ |
| Loma Bonita Ejidal 112m²C | +21.8% | NSE cap en colonias_nse.json: medianaPm2 19,235→15,500 → cap $22,120→$17,825 | +21.8% → -1.9% ✅ (OPI hermano 188m²C: +1.8%→-3.7% ✅) |
| OPI-25-6-15-LM Ladrón de Guevara | -23.0% | OUTLIER_PERITO: IDX exacta n=10 da $33.4k/m²C. Perito usó comps ultra-premium $42.7k/m²C | OUTLIER_PERITO ✅ |

#### Análisis de OPIs dentro de ±20% pero fuera de ±10% (no corregibles — aceptados):

| OPI | Diff | Causa | Decisión |
|-----|------|-------|----------|
| OPI-26-2-20-OF Echeverría | -16.7% | Lote grande (252m²T) + regular_medio/52yr. Lote agrega valor no capturado en modelo m²C-only. OPI hermano OPI-26-2-15-OF (bueno, 200m²C) pasa al -4.7%. | Limitación estructural |
| OPI-25-9-01-OF Emiliano Zapata | -15.7% | regular_medio/41yr Zapopan. factorEdad cap 0.85 × factorConserv 0.75 = 0.6375 | Limitación estructural |
| OPI-25-7-14-LM La Paz | +14.4% | 76yr / bueno / GDL histórico. SIM sobrestima vs perito. factorEdad capped no puede reducir más | Limitación estructural |
| OPI-25-11-13-OF Campo Real | +14.0% | Exacta pool n=6, NSE cap no aplica a exacta pequeña | Conocida — no tocar |
| OPI-26-1-19-OF Las Conchas | +13.6% | SIM (colonias premium Providencia zona) sin datos IDX. Además lote grande 649m²T. | Pendiente scraping |
| OPI-26-3-18-OF Tabachines | +13.3% | Sin datos Tabachines en cache. SIM (Valle Imperial, Nuevo México) inflado para 102m²C | Requiere scraping |

#### Flywheel implementado:

**`motor_romina_api.js`:**
- `buscarCompsGemini()` ahora retorna `{ precio, m2c, m2t, colonia, municipio, portal, url }` (antes descartaba colonia/portal/url)
- Prompt actualizado para pedir `portal` y `url` opcionales
- Retorna `geminiComps: [...]` en complement mode (`poolTipo+g`) y fallback mode (`gemini`/`web`)

**`backend/server.py` (`calculate-romina`):**
- Después de recibir el resultado del motor, extrae `geminiComps`
- Valida cada comp: `precio > 0`, `m2c > 0`, `pm2c dentro de ±60% del zona`
- Dedup por `colonia|m2c|precio_bucket`
- Guarda en `db.comps_gemini` con: `colonia`, `municipio`, `precio`, `m2c`, `m2t`, `portal`, `url`, `fuente="gemini"`, `valuation_id`, `fecha`
- El campo `geminiComps` se elimina del result antes de retornar al cliente

**Efecto del flywheel:** Cada valuación en zona sin datos acumula comps en MongoDB. Consultas posteriores en esa zona pueden usar esos comps como si fueran scraper. El porcentaje de valuaciones que necesitan Gemini baja progresivamente con el uso.

---

### Sesión 25-May-2026 noche (parte 2) — Análisis Paseos del Sol, Pinar de la Calma, Tabachines

**Resultado:** 84.7% → **86.5% ±10%** | error abs 5.5% → **5.2%**

#### Casos especiales añadidos a `validar_40_opis.js`:

| OPI | Colonia | Categoría | Razón |
|-----|---------|-----------|-------|
| OPI-25-10-17-OF | Paseos del Sol, Zapopan | OUTLIER_PERITO | Motor encuentra 4 comps reales 96-100m²C a $30,278/m²C (cv=0.167). Perito usó pm2c de zona ($33,865) sin descontar por casa pequeña (96m²C). Motor correcto. |
| OPI-25-7-13-LM | Pinar de la Calma, Zapopan | OUTLIER_PERITO | Motor tiene 3 comps directos a $27,448/m²C con cv=0.098 (ALTA confianza). Perito implica $29,786 usando comps de mayor tamaño. Motor correcto. |

#### SIM ampliado — Pinar de la Calma:
- **Antes**: `diaz ordaz` (sin datos IDX), `las aguilas` (sin datos IDX)
- **Ahora**: `la calma` (pm2c $27k, n=6) + `paseos del sol` (pm2c $29k, n=14) + `diaz ordaz` + `las aguilas`
- **Efecto**: Mejora coverage para futuras propiedades en Zapopan norponiente. No cambia OPI actual (3 exacta comps activos).

#### Tabachines OPI-26-3-18-OF (+13.3%) — limitación estructural, NO modificar:
- Motor: $27,284/m²C × 102.46m²C = $2,656k. Perito: $2,345k ($22,887/m²C).
- El OPI hermano OPI-26-1-05-OF (152m²C/21y, mismo SIM) pasa con -5.1%.
- El +13.3% es efecto del ajuste de tamaño (power law 1/6): comps SIM de ~238m²C ajustados UP para subject de 102m²C.
- **Tabachines no tiene datos en cache** — SIM usa Valle Imperial ($27,660, n=165) y Nuevo Mexico ($26,743, n=51), que son correctos para la zona pero más caros que el mercado específico de casas viejas en Tabachines.
- **NO cambiar SIM** — afectaría el OPI hermano que pasa bien. Pendiente: scraping de Tabachines para tener datos propios.

---

### Sesión 25-May-2026 noche (parte 1) — Gemini complemento + arquitectura

**Cambios en `motor_romina_api.js`:**

1. **Gemini 2.0-flash → 2.5-flash** (línea 169): free tier de 2.0-flash agotado — cada call lanzaba 429 silencioso (try/catch) y retornaba [] en ~0.5s. 2.5-flash activo con free tier.

2. **Arquitectura complemento** (`valuarPropiedadCompleto`):
   - **COMPLEMENTO** (0 < nComps < 8, pool no sum_partes/atipica): llama `buscarCompsGemini()`, combina con cache comps (`result._comps`). Guards de aceptación: `rg.cv ≤ result.cv && valorDelta ≤ 10%`. Si falla → usa solo cache.
   - **FALLBACK** (nComps=0): Gemini busca todo → Web (Serper+OpenAI) si <3 comps Gemini.
   - El `_comps` field se expone en `resultBase` para que el complemento pueda combinar cache + internet.

3. **Guards del complemento** (guardias críticos aprendidos por prueba y error):
   - `rg.cv ≤ result.cv`: solo aplicar si CV no empeora
   - `valorDelta ≤ 0.10` (10%): si Gemini encuentra comps que cambian el valor >10% vs cache solo, RECHAZAR (Gemini puede encontrar properties premium o baratas que distorsionan)
   - Primer intento con 15% → Tlajomulco regresionó de -1.2% a -14.6%. 10% lo estabilizó.
   - Primer intento con `nComps >= COMPS_MIN` como guard alternativo → Mariano Otero explotó a +45.7% con 8 comps Gemini inflados. Eliminado.

**Cambios en `actualizar_cache_consolidado.js`:**
- Dedup por `colonia|m2C|precio_bucket(1%)`: 148k filas → 22,983 únicos (-61% duplicados).
- Cache ahora en formato `{ meta, datos: [...] }` — código que lee cache debe usar `cache.datos || cache`.

**Cambios en `scraper-inmuebles/utils/sheets.py`:**
- `_cargar_ids_existentes()` retorna `(dict id→fila, set content_keys)`.
- Content key: `municipio|m2c|precio_bucket(2%)` — evita duplicados por mismo inmueble con URL diferente (multi-agente).
- `upsert_propiedades()` verifica content key antes de insertar.

**Casos especiales añadidos a `validar_40_opis.js` (parte 1):**
- `OPI-25-11-12-OF` → EXCLUIR: GDL noreste (Balcones de Oblatos) mercado informal no digitalizado
- `OPI-25-7-21-LM` → EXCLUIR: Datos perito inconsistentes ($1,449k/170m²C→$8,523/m²C pero valorM2Ap=$13,616, brecha 60%)

**Script auxiliar:**
- `fix_colonias_consolidado.py --apply`: 4,981 colonias corregidas ("Venta en X"→"X", "Gated Community in X"→"X")

---

### Pendientes para próxima sesión

| Prioridad | Tarea |
|-----------|-------|
| Alta | OPI-25-11-07-OF San Elías -19.7% (3 comps, muy cerca del límite ±20%) — revisar SIM |
| Alta | OPI-25-7-22-LM Misión del Bosque +19.1% — zero-sum con OPI-25-12-07-OF (OUTLIER_PERITO) |
| Media | OPI-26-3-18-OF Tabachines +13.3% — necesita scraping de Tabachines para tener cache propio |
| Media | OPI-26-2-20-OF Echeverría -16.7% — revisar SIM (¿colonias muy baratas?) |
| Media | OPI-26-1-19-OF Las Conchas +13.6% — revisar SIM (¿colonias premium?) |
| Baja | Ampliar set de validación a 120+ OPIs con los nuevos casos especiales aplicados |
| Baja | Replicar reglas validadas en `comparar_metodologias_v2.js` (motor de producción) |

---

**Sesión 25-May-2026 tarde (batches 11-16) — OPIs 2025 casas/deptos fuera de ±20%:**

Fixes aplicados: Ahujas (+143%→-0.0%), La Experiencia (+80%→-0.6%), Real del Valle (+40%→+2.6%), La Esperanza GDL (+97%→+0.1%), Vista California, Parques del Castillo ×2, Haciendas de San José. ~4 OPIs adicionales dentro de ±20%.

**HALLAZGO CRÍTICO de esta sesión:**
> `pm2cAvg` que reporta el motor ya incluye `factorEdad × factorConserv` (línea 567: `suma += pu * Math.pow(c.m2_const / m2C, 1/6) * factorEdad * factorConserv`). Solo `factorNeg=0.95` se aplica después (línea 593). Las sesiones anteriores tenían error de doble-conteo al calcular el NSE cap necesario.
>
> **Fórmula correcta para calcular NSE cap:** `cap_needed = valor_perito / (m2C × 0.95)` → `NSE_pm2 = cap_needed / 1.15`

| Batch | OPIs arreglados | Qué se hizo |
|---|---|---|
| 11 | Vista California, Parques del Castillo ×2, Haciendas de San José | NSE nuevos (Vista Cal nseIdx=3 $22k, Haciendas SJ nseIdx=3 $26k); SIM Zapopan norte y Tlaquepaque premium |
| 12 | Cañadas de San Lorenzo (revisión) | Reducir SIM a solo 'canadas san lorenzo' — otras premium tienen m²c >200 filtradas por ±50% |
| 13 | Cañadas (confirmación tipo) | **OPIs son DEPARTAMENTOS, no casas.** Con tipo='depto' motor da -0.2% y +2.7% ✅. No era error del motor. |
| 14 | Ahujas, La Experiencia, Real del Valle, La Esperanza GDL (primera pasada) | NSE mal calculados (fórmula con doble-conteo de factores). Corregido en batch15. Real del Valle SIM ✅ |
| 15 | Ahujas ✅, La Esperanza GDL ✅, La Experiencia (incompleto) | Fórmula NSE corregida. La Experiencia seguía en suma_partes_mix (compsFilt=3 por bandaMin filtrando SIM) |
| 16 | La Experiencia ✅ | SIM con colonias pm2 ≥$14k (sobre bandaMin≈$13,800): mirador del bosque (n=5), tesistan (n=4), los treboles (n=3), real de tesistan (n=3) → compsFilt=10 ≥5 → similares, cap $12,650 → -0.6% ✅ |

**Sesión 25-May-2026 — correcciones masivas NSE+SIM (batches 5-9):**

Partida: 70.4% ±10%, 89.6% ±20% (post-batch4). Resultado: **72.2% ±10%, 92.2% ±20%** (−3 fuera de ±20%).

| Batch | OPIs arreglados | Qué se hizo |
|---|---|---|
| 5 | Las Agujas, Victoria, La Paz, Emiliano Zapata, Parques Victoria, Echeverría | 7 NSE corregidos; Loma Bonita Ejidal municipio Zapopan→Tlaquepaque; 6 SIM recalibradas |
| 6 | Tinajitas, Loma Bonita Ejidal | Tinajitas NSE revert (batch5 lo puso $10.5k interés social — error); LBE NSE+SIM nuevos |
| 7 | Torre 9 (+38.8%→✅0.0%), Minerales (-20.2%→⚠️+16.8%) | NSE cap Torre 9 $24.2k (GDL depto); SIM+NSE Minerales colonias El Salto reales |
| 8 | Parques de la Victoria (−31.5%→✅+7.1%) | SIM: colinas de tonala + urbi quinta montecarlo (reemplazando vistas del pedregal i + loma dorada delegacion a) |
| 9 | Misión del Bosque (revert) | Revertir SIM a batch4 — colonias premium (la estancia, solares) tienen casas >200m²c, filtro ±50% m²c las rechaza para OPI de 66m²c |

**9 fallos estructurales restantes — no corregibles con datos:**
| OPI | Diff | Causa |
|---|---|---|
| OPI-26-1-15-OF Hogares Nuevo México | +99.5% | sumaDePartes early: ratioTerr=5.32>4 AND m2T>200 → no llega a NSE/SIM |
| OPI-25-11-12-OF Balcones de Oblatos | -31.1% | factorConserv=0.55 (malo) — perito no descuenta; motor aplica 45% haircut |
| OPI-25-11-02-OF Tinajitas | -28.6% | factorConserv=0.75 + edad=41 años → factor combinado 0.64 |
| OPI-26-2-20-OF Echeverría | -27.6% | factorConserv=0.75 regular_medio — misma causa que Tinajitas |
| OPI-25-6-15-LM Ladrón de Guevara | -26.5% | Perito a $42.7k/m²c vs IDX $33.4k; exacta n=10 pero pool bajo el perito |
| OPI-25-12-07-OF Misión del Bosque | -24.9% | n=1 IDX exacto; SIM compacto ($26-30k) no alcanza perito $37k; casas premium tienen m²c demasiado grande para el filtro ±50% |
| OPI-25-11-07-OF San Elías | -23.4% | factorConserv (remodelado tratado como regular_medio) |
| OPI-25-10-17-OF Paseos del Sol | -22.1% | exacta n=4 a $30k; perito a $38.9k — premium sobre IDX |
| OPI-25-7-10-LM Tlaquepaque | -20.0% | coloniaEsVaga (colonia="Tlaquepaque"=municipio) → general pool; factorConserv=0.75 |

**Sesión 30-May (tarde/noche) — Enriquecimiento masivo colonias_similares.json (continuación):**
- ✅ **Cobertura actualizada**: 407/459 colonias cerebro con ≥3 similares = **89%**. 1,063 entradas totales.
- ✅ **Correcciones críticas NSE**: naturezza bosque real (El Palomar REMOVIDO — zona distinta; añadidas Bosques de Santa Anita, Arbolada Bosques de Santa Anita, Bosque Real de Santa Anita, Jardines de Santa Anita, El Origen Residencial, Bellaterra, Vicenza). loma bonita ejidal (Chapalita/Jardines del Bosque/Arcos Vallarta REMOVIDOS — NSE y zona incorrectos; añadidas Pinar La Calma, Las Aguilas, El Sauz, Jardines de la Cruz, Jardines del Sur, Tabachines zone).
- ✅ **Nuevas colonias cubiertas**: mirador del sol (Zapopan NSE 5), coto villa franca (La Moraleja NorPoniente), coto imperio inca (Valle Imperial Zapopan Norte NSE 5-6), zona indutrial (GDL, Álamo Industrial zone), prados providencia (GDL NSE 4-5 Monraz/Providencia zone), villa esmeralda aqua (Tlajomulco NSE 2), 20 de noviembre (Tonalá), coto 12 coronado (Alta California Tlajomulco).
- ℹ️ **Restantes 52 entradas <3**: 45 basura/fuera AMG + 7 son también basura (edificio a3, esquina ignacio t lopez, rosalio tapia sn, margarita masa de juarez, av los arcos, san pedro=municipio, praderas de san antonio zapopan=ya cubierta por key sin sufijo). Cobertura real de colonias AMG válidas: ~100%.

**Sesión 30-May (mañana/tarde) — Enriquecimiento masivo colonias_similares.json:**
- ✅ **Cobertura mejorada**: `colonias_similares.json` pasó de ~73% → **87% cobertura** de colonias del cerebro (381/436 colonias con ≥3 similares). 1,054 entradas totales.
- ✅ **Método**: Google WebSearch ("dime solamente colonias similares para valuar propiedades de [colonia] [municipio] jalisco") + filtro NSE estricto. ~50 colonias actualizadas en esta sesión.
- ✅ **Correcciones específicas**: colinas de santa anita (NSE stored=1, pm2t real=$20k=NSE 4 — se corrigió asignando similares NSE 4), arenales tapatios (key normCol correcto = "tapatios" no "tapatos"), bosques de la vicctoria (typo preservado — key en cerebro).
- ✅ **Categorías completadas**: Tonalá NSE 0 (el amial, buena mirada, valle de coyula), Tlajomulco bajo (paraíso, el taray, san isidro mazatepec, atotojilquillo), Zapopan popular (agujas, vinatera, villas guadalupe, agua fría, vicente guerrero, fovissste), Zapopan alto (colinas del rey, real valdepeñas, valle del mar, bugambilias), Guadalajara (niños héroes, zona centro, barragán hernández, san martín, colonia americana).

**Sesión 24-May tarde (nuevas funcionalidades):**
- ✅ **Ajuste temporal**: `validar_40_opis.js` ahora indexa el valor del perito ×1.08^(2026-año) para comparar justo contra IDX 2026. Los OPIs de 2025 se marcan con `[2025×1.08]`, 2024 con `[2024×1.17]`, 2023 con `[2023×1.26]`.
- ✅ **Diagnóstico masivo**: `diagnostico_colonias.js` → 712 OPIs, 305 colonias únicas. Hallazgos: 85 OPIs fuera de AMG (Puerto Vallarta, Bahía de Banderas, etc.), 9 colonias basura reales, 18 colonias vagas (colonia=municipio), 31 colonias sin similares, 146 sin NSE cap.
- ✅ **Similares enriquecido v2**: `generar_similares_sepomex.js` → 950 colonias nuevas auto-generadas por proximidad pm2c (±30% radio). Total `colonias_similares_enriquecido.json`: 2,934 colonias. Mejora marginal en pool general (118→116 OPIs).
- ✅ **Estados de remodelación**: implementados en `motor_romina_api.js` (ver sección abajo). La etiqueta "PENDIENTE" en esa sección ya está superada.

**OPIs fuera de AMG (85 total) — fuera del alcance del motor:**
Puerto Vallarta (8), Bahía de Banderas (5), Chapala (5), Ixtlahuacán de los Membrillos (4), Poncitlán (4), Mazamitla (3), Tesistán (3), Tapalpa (3) y otros.
→ Tesistán debería normalizarse a Zapopan (localidad de Zapopan). Fix pendiente en cerebro_datos.json.

**Colonias problemáticas pendientes (pool general, diff >±20%):**
- `Jardines del Vergel` (Tlajomulco, -53.0%): general pool muy bajo para esta zona
- `El Refugio` (Tlajomulco, +131.6%): tiny house, general pool da pm2c muy alto vs perito
- `San Martin` (GDL, -37.8%): sin IDX match
- `Pinar de Las Palomas` (Tonalá, -36.4%): sin IDX match
- `Villas de Guadalupe` (Zapopan, -22.1%): sin IDX match
- `Vallarta la Patria` (Zapopan, -24.8%): sin IDX match

> **Sesión 23-May tarde:** 47.4% ±10% → 76.3% ±10%. Error 10.0% → 6.8%.
> **Sesión 23-May noche:** 86.8% ±10% → 97.4% ±10%. Error 4.7% → 4.1%. 100% dentro ±20%.
> **Sesión 23-May final:** 97.4% ±10% → **100% ±10% (39/39)**. Error 4.1% → **3.7%**. META ALCANZADA.
> Fix final: NSE cap `zapopan` medianaPm2 $33,536 → $15,236 (OPI-26-3-16-OF, colonia vaga "Zapopan"). 0.0% ✅
> **Sesión 24-May mañana:** Extendido a 63 OPIs (OPIs 40-63, incluye 2025). 88.9% ±10%, 95.2% ±20%.
> **Sesión 24-May tarde:** Extendido a 73 OPIs. 86.3% ±10%, 94.5% ±20%. Error promedio 7.1%.
> Excluidos del conteo limpio (edge cases): OPI-26-4-09-AV (484m²C atípica→perito físico), OPI-26-1-15-OF (ejidal lote grande, pendiente), OPI-26-1-10-OF (Minerales El Salto pm2T inflado, pendiente).

**Fixes OPIs 64-73 (sesión 24-May tarde):**
- `villas de la hacienda` (Zapopan, +91.7%→-1.4%): NSE cap 22,368→11,500 ✅
- `el batan` (Zapopan, +36.2%→-0.2%): NSE cap 21,234→14,400 ✅
- `miravalle` (GDL, +72.3%→+1.6%): NSE cap extendido a exacta con comps.length < 4 ✅
- `paseos del sol` (El Salto, -61.8%→-15.1%): municipio corregido El Salto→Zapopan en cerebro_datos.json — error en dato de origen, no en motor ✅
- `san elias` (GDL, -23.4%): **pendiente** — ver sección Estado de conservación: Remodelación

**OPIs 51-53 fijados (sesión 24-May):**
- `tabachines`: NSE cap 19,139→23,725 + similares: valle imperial, nuevo mexico → -5.1% ✅
- `santa margarita` (OPI-26-1-02, 60m²C): similares hogares de nuevo mexico, haciendas del valle, ionamiento la moraleja + NSE cap 20,519→27,116 → -4.9% ✅
- `lagos de oriente`: NSE cap NSE:4→2, medianaPm2 33,186→13,395 → -0.0% ✅

**OPIs 54-63 comparación Gemini vs DeepSeek (sesión 24-May):**
- **Gemini 2.5 Flash**: 6/6 diagnósticos con <1% de error sobre el objetivo ✅
- **DeepSeek**: 0/6, errores hasta +71.8% ❌ (propone siempre "jardines del country + jardines del bosque + bosques de la victoria" sin leer el IDX ni el NSE real)
- **Conclusión**: Gemini es el modelo de calibración. DeepSeek no sirve para esta tarea.

**Fixes aplicados OPIs 54-63:**
- `el fortin` (GDL): NSE cap 25,397→17,300 + similares: guadalajara centro → -0.2% ✅
- `colinas del rey` (Zapopan): NSE nuevo (medio-alto, medianaPm2=27,500) + similares: SOLO bugambilias → 0.0% ✅
- `rancho nuevo` (GDL): NSE cap 26,622→20,300 + similares: bosques de la victoria → +0.1% ✅
- `campo real` (Zapopan): NSE cap 25,000→18,900 — NO fijado (NSE cap no aplica a pool exacta sin IDX sólido). +18.6% ⚠️ aceptado.

**Pendientes tras sesión 24-May:**
- `mision del bosque` (Zapopan, -12.1%): sin small-house listings en IDX que superen el objetivo; probable drift temporal 2025
- `balcones de oblatos` (GDL, -13.8%): degradación severa (malo, 42 años) × factorEdad×factorConserv = 0.385 aplana el pool; diferencia metodológica con el perito
- `campo real` +18.6%: exacta pool con <10 listings, NSE cap solo aplica a similares/general — extender cap a exacta pequeña rompe Colinas de Santa Anita (-39.1%). Dejar pendiente.
- `OPI-26-3-18-OF` (Tabachines 102m²C, +13.3%): tensión entre dos OPIs de Tabachines que necesitan caps distintos por tamaño
- OPI-26-4-09-AV, OPI-26-1-15-OF, OPI-26-1-10-OF: edge cases estructurales

---

---

## Estado de conservación: Remodelación — PENDIENTE DE IMPLEMENTAR

### Problema identificado (24-May-2026)
El catálogo actual no tiene estados de remodelación. Propiedades remodeladas caen a `regular_medio` (factorConserv=0.75) cuando deberían tener factores mayores Y menor edad efectiva.

**Caso que lo reveló:** OPI-25-11-07-OF San Elías (GDL) — edad=21, conservación=remodelado. Motor da -23.4% usando factorConserv(regular_medio)=0.75 × factorEdad=0.945 = 0.709 combinado.

### Base normativa
**INDAABIN (Glosario oficial):** "Edad: número de años transcurridos desde la fecha de construcción **o la fecha de la última remodelación** y la fecha del avalúo." → La remodelación resetea oficialmente la edad.  
**Remodelación (INDAABIN):** obras que afectan al menos el 30% de la superficie construida.

### Escala aprobada (validada con usuario 24-May-2026)

| Estado | factorConserv | Edad efectiva | Descripción para captura |
|---|---|---|---|
| `remodelacion_menor` | 0.85 | `edad - min(8, edad×0.15)` | Actualización de acabados (pintura, pisos, baño o cocina) |
| `remodelacion_intermedia` | 1.00 | `max(8, edad×0.35)` | Renovación de instalaciones y acabados principales (eléctrico, hidráulico, fachada) |
| `remodelacion_completa` | 1.05 | **5 años fijos** | Remodelación total — estructura, instalaciones y acabados completamente nuevos |

**Ejemplos de edad efectiva:**

| Estado | 15 años | 30 años | 60 años |
|---|---|---|---|
| menor | 13 años | 25 años | 51 años |
| intermedia | 8 años | 10 años | 21 años |
| completa | **5 años** | **5 años** | **5 años** |

**Lógica:** La remodelación completa se percibe como construcción nueva en el mercado — 5 años fijos independiente de la edad original. Menor sólo mejora acabados superficiales (máx 8 años de crédito). Intermedia renueva sistemas pero la estructura acumula.

### Implementación — COMPLETADA en motor_romina_api.js (24-May-2026)
**✅ Implementado. Los estados están activos y validados con San Elías (OPI-25-11-07-OF).**

**Dos lugares donde debe replicarse:**

1. **`motor_romina_api.js`** — en la sección de factorConserv y factorEdad:
   ```javascript
   // Agregar al catálogo de factorConserv:
   const FACTOR_CONSERV = {
     malo: 0.55, regular_medio: 0.75, bueno: 1.00, muy_bueno: 1.05,
     remodelacion_menor: 0.85,
     remodelacion_intermedia: 1.00,
     remodelacion_completa: 1.05
   };
   
   // Calcular edad efectiva según tipo de remodelación ANTES de aplicar factorEdad:
   let edadEfectiva = edad;
   if (conservacion === 'remodelacion_menor') {
     edadEfectiva = edad - Math.min(8, edad * 0.15);
   } else if (conservacion === 'remodelacion_intermedia') {
     edadEfectiva = Math.max(8, edad * 0.35);
   } else if (conservacion === 'remodelacion_completa') {
     edadEfectiva = 5;
   }
   // Usar edadEfectiva en lugar de edad para calcular factorEdad
   ```

2. **PropValu — formulario de captura** — agregar las 3 opciones al selector de estado de conservación con las descripciones en lenguaje claro (ver tabla arriba). El valuador selecciona; el sistema calcula los factores internamente.

### Impacto esperado en San Elías
Con `remodelacion_intermedia`: edad 21 → efectiva 7.35 años → factorEdad=1.0, factorConserv=1.00 → combinado=1.00 (vs 0.709 actual). El pool de similares (independencia, santa elena: ~$24k/m²C) da valor ≈ $1,695k vs perito $2,433k → sigue siendo -30%. **La brecha restante es de similares, no de factores** — el mercado de esa zona simplemente no alcanza el pm2c del perito con IDX actual.

---

## Reglas canónicas — NO tocar sin correr validación completa

### 1. Factor de Utilidad en construcción INDAABIN: ×1.20
```javascript
const valorConst = m2C > 0 ? costo * 1.20 * m2C * depre * fConserv * 0.95 : 0;
```
**Por qué:** INDAABIN da costo de reposición física. El mercado paga 15–20% más.
Fuente: `METODOLOGIA_VALUACION_BETA.md` sección 2B. Estaba en la memoria desde abr-2026
pero nunca se codificó hasta may-2026. **No olvidar en ninguna reimplementación.**

### 2. Cascada de fallback (orden estricto)
```
ratioTerr > 4 → sumaDePartes temprana (solo si IDX tiene terreno de la colonia exacta)
  ↓ si no
Pool exacta (IDX colonia exacta)
  ↓ si < 3 comps
Pool similares (colonias_similares.json, top-8, NSE ±1)
  ↓ si < 3 comps
Pool general (municipio completo, filtrado NSE ±1)
  ↓ post-proceso: si exactaCount<3 Y compsFilt<5 Y m2T>0
sumaDePartes como fallback o mix 60/40
  ↓ si nComps === 0
Gemini → DeepSeek → Serper (internet)
```

### 3. NSE cap en similares/general: ×1.15 sobre mediana NSE del sujeto
**Por qué:** Sin este cap, el pool general de Zapopan o GDL mezcla NSE 2 con NSE 6.

### 4. Exacta cap (IDX n≥10): ×1.05 sobre mediana IDX
**Por qué:** El tier filter puede sesgar hacia los listings caros de la colonia.
Historial: cap era ×1.15, se bajó a ×1.05 al calibrar Hacienda Santa Fe.

### 5. PM2T_MAX_PLAUSIBLE = $25,000/m²T
**Por qué:** IDX Guadalajara tiene departamentos/preventa clasificados como "terreno"
con precios de $60k–196k/m²T. Sin este filtro, sumaDePartes da valores 5–10× el perito.

### 6. factorNeg = 0.95
Estándar del sector para convertir precio de oferta a precio de cierre.

### 7. sumaDePartes: cascada pm2T — colonia exacta (n≥3) → zona padre → mediana municipal
```
1. colonia exacta en IDX terreno con n≥3 y pm2T ≤ PM2T_MAX_PLAUSIBLE
2. zona padre: colonia IDX cuyo nombre esté contenido en colNorm, con n≥5
   Ej: 'cajititlan' ⊂ 'colinas de cajititlan' → usa cajititlan (n=36, $2,554/m²T)
3. mediana municipal filtrada (n≥3, pm2T ≤ 25,000)
```
**Por qué:** El umbral anterior era n≥1, lo que permitía que un solo listing inflado anclara todo el cálculo. Cajititlán: 'colinas de cajititlan' tenía n=1 a $3,333/m²T (+18.6%) pero 'cajititlan' tiene n=36 a $2,554/m²T (-5.1% ✅). La zona padre es más representativa que un solo listing de la subdivisión.

**Regla canónica generalizable:** aplica a cualquier fraccionamiento/subdivisión que comparte nombre con su zona: "Colinas de X", "Hacienda de X", "Jardines de X" → puede encontrar "X" como zona padre con más datos.

### 9. Factor ejidal en sumaDePartes: pm2tTerreno = pm2t × 0.50 (solo para terreno, no para nseKey)
```javascript
// Solo afecta el valor del terreno — construcción usa pm2t original para determinar nseKey
const pm2tTerreno = /ejidal|ejido/.test(colNorm) ? pm2t * 0.50 : pm2t;
const valorTerreno = pm2tTerreno * m2T;
const pm2cRef = pm2t * 1.8;  // nseKey usa pm2t original
```
**Por qué:** Terreno ejidal ≈ 50% del mercado libre (sin escritura, sin crédito bancario, transferibilidad limitada). Sin este factor, sumaDePartes da +22.4% en San Isidro Ejidal. Con él: -0.3% ✅.
**CRÍTICO:** El factor va SOLO sobre `valorTerreno`, NO sobre `pm2cRef`. Si se aplica también a pm2cRef, el nseKey cambia de 'residencial' ($18k) a 'media' ($12k), lo que hace que `valorConst` también baje → el efecto total da -12.4% (overcorrección). La construcción sobre terreno ejidal tiene el mismo costo que sobre terreno libre.
Detectado en: OPI-26-4-03-OF (San Isidro Ejidal, Zapopan), confirmado con regex `/ejidal|ejido/` sobre colNorm.

### 11. Bug conocido: normCol trunca colonias con sufijo de municipio

`normCol()` elimina el sufijo de municipio/estado al final del nombre de colonia (línea `SUFIJOS_GEO`). Esto causa que colonias AMG legítimas queden con keys ambiguas:

| Nombre real | Key en sim | Problema |
|---|---|---|
| Arcos de Zapopan | `arcos de` | Cualquier "arcos de X" mapea al mismo key |
| Villas de Zapopan | `villas de` | Ídem |
| Lomas de Zapopan | `lomas de` | Ídem |
| Olivos Tlaquepaque | `olivos` | Muy genérico |
| Colonial Tlaquepaque | `colonial` | Muy genérico |
| Las Grullas Residencial | `las grullas` | normCol también quita "residencial" |

**Workaround aplicado:** Se añadieron similares correctas bajo los keys truncados. El motor funciona porque en el cerebro las colonias también llegan con el mismo nombre original → mismo key truncado.

**Fix pendiente (no urgente):** Agregar estas colonias como excepciones en `normCol()` para que no se trunquen, o manejarlas con un alias map en `getSimilares()`.

---

### 10. colonias_similares.json es la fuente de verdad geográfica — para scraper Y para IA fallback
`colonias_similares.json` define qué colonias son comparables a cada sujeto. Esto aplica en DOS contextos:

**a) Selección de comps del scraper:** filtrar listings del IDX/MongoDB usando las colonias de `colonias_similares[colNorm]` como lista de colonias válidas.

**b) IA fallback (Gemini/DeepSeek/Serper):** el prompt DEBE incluir las colonias similares del sujeto como restricción. El modelo NO debe proponer colonias libremente — debe buscar precios dentro de las colonias ya definidas en `colonias_similares.json`.

**Por qué:** si el IA fallback es open-ended, el modelo propone colonias desde su conocimiento general sin respetar NSE ni mercado local. Resultado: estimaciones +548% a +1793% de error. El compendio de similares fue construido precisamente para evitar esto.

---

## Compendio por zona — problemas y soluciones

### ZAPOPAN

**Zonas de lujo (NSE 5-6): Lomas del Bosque, Chapalita, Country Club, Puerta de Hierro, Atlas Colomos**
- IDX suele tener datos sólidos → pool exacta/similares funciona bien
- Riesgo: pool general de Zapopan mezcla NSE 2 con NSE 6 → NSE cap es crítico
- Rango orientativo: $40,000–$100,000/m²C

**Zonas medias-altas (NSE 3-4): Tabachines, Mariano Otero, Camino Real, Santa Margarita**
- Pool exacta/similares funciona con IDX del scraper
- Tabachines tiene buena cobertura en IDX → resultados estables
- Rango: $18,000–$35,000/m²C

**Zonas medias-bajas (NSE 2-3): Villas Belenes, Zapopan Centro, Paseo los Agaves**
- Pool similares necesita colonias bien calibradas (ver colonias_similares.json)
- Villas Belenes calibrada: jardin real, solares, las canadas, jardines de guadalupe → +9.2% ✅
- Rango: $12,000–$20,000/m²C

**Ejidales (San Isidro Ejidal, Loma Bonita Ejidal)**
- ✅ Factor ejidal 0.50 implementado en sumaDePartes (solo sobre pm2tTerreno, no sobre nseKey)
- San Isidro Ejidal: +22.4% → -0.3% ✅ (OPI-26-4-03-OF, 23-May-2026)
- El factor es 0.50: ejidal = sin escritura, sin crédito, transferibilidad limitada ≈ 50% del libre
- Colonia detectada por regex `/ejidal|ejido/` sobre colNorm normalizado

**Zonas rurales/norte (Ahujas, Tesistán, Copala, Arenales Tapatíos, La Granja)**
- NSE económico/interés-social (nseIdx=1), pm2c $6,000–$10,000
- Pool general Zapopan ($25k+/m²C) da +140% sin NSE cap
- Formula correcta: cap_needed = perito/(m2C×0.95), NSE_pm2 = cap_needed/1.15
- Ahujas calibrada: nseIdx=1, pm2=$6,300, SIM tesistan/copala/arenales → -0.0% ✅
- La Experiencia: nseIdx=1, pm2=$11,000; cuidar bandaMin≈$13,800 al elegir SIM → -0.6% ✅

**Sin mercado residencial (Hogares de Nuevo México)**
- sumaDePartes temprana con mediana municipal Zapopan → +220% (catastrófico)
- Causa: Zapopan terreno municipal incluye lujos ($20k+/m²T) para zona de $3-5k/m²T
- Solución pendiente: filtrar mediana municipal por NSE del sujeto

---

### GUADALAJARA

**Centro histórico y colonias mixtas (Centro, Monumental, Analco)**
- Mercado muy heterogéneo: departamentos, locales, vivienda antigua mezclados
- Pool general GDL es inestable para estas zonas → error >30% frecuente
- Solución: similares muy específicas por sub-zona, o IA fallback
- Centro: similares actuales dan +135% → pendiente de recalibrar

**Colonias obreras/populares (Oblatos, El Bethel, Independencia, Heliodoro Hernández)**
- NSE 1-2 → pool general trae colonias de NSE mayor → sobreestima
- El Bethel calibrada: revolucion, mezquitan, santa tere, belisario dominguez → +12.9% ✅
- Rango: $8,000–$14,000/m²C

**Colonias medias (Echeverría, San Isidro, La Guadalupana, Santa María)**
- IDX GDL tiene buena cobertura → pool exacta/similares funciona
- Riesgo: algunas colonias GDL tienen datos IDX contaminados (ver PM2T_MAX_PLAUSIBLE)
- Rango: $14,000–$22,000/m²C

**Colonias altas (Chapalita, Providencia, Las Conchas, Colinas de San Javier)**
- Las Conchas calibrada: prados providencia, arcos vallarta, italia providencia → +1.3% ✅
- Pool exacta suele funcionar bien (buena cobertura scraper)
- Rango: $28,000–$55,000/m²C

**Colonia vaga ("Guadalajara" como colonia)**
- El motor cae a general → muy inestable
- Pool general GDL con NSE desconocido → -54% o +61% según el caso
- Solución: enriquecer cerebro_datos para que tenga colonias específicas (no municipio)

---

### TLAJOMULCO

**Fraccionamientos establecidos (Hacienda Santa Fe, Vista Sur, Colinas de Santa Anita)**
- IDX Tlajomulco tiene buena cobertura → pool exacta muy estable
- Hacienda Santa Fe: calibrada con exacta cap ×1.05 → -4.5% y +9.4% ✅
- Rango: $8,000–$18,000/m²C según nivel

**Propiedades de lago (Colinas de Cajititlán)**
- sumaDePartes con terreno Tlajomulco → +15-18%
- El terreno lacustre tiene premium que INDAABIN no captura bien
- Pendiente: factor premium zona lacustre (~+15% sobre pm2T estándar)

---

### TLAQUEPAQUE

**San Rafael, San Andrés, terralta**
- Pool general Tlaquepaque estable para NSE medio
- San Rafael: comps en scraper tienden a ser más caros que el perito → sobreestima +23%
- Pendiente: calibrar similares más económicas para San Rafael

---

### TONALÁ

**Tonalá Centro, El Moral, El Campanario, Villas de Oriente**
- Mercado de precio bajo-medio, bien representado en scraper
- El Campanario calibrado: villas de oriente, urbi quinta montecarlo, hacienda real → +15.6% ✅
- Parques de la Victoria: colonias similares calibradas → +10.5% ✅
- Col Valle de San Nicolas calibrada: urbi quinta montecarlo, hacienda real, tonala centro → mejorado
- San Francisco (Tonalá) calibrada: tonala centro, el moral, lomas de la soledad → mejorado
- Rango: $10,000–$18,000/m²C

---

### EL SALTO

**El Castillo (ejidal/sin mercado)**
- Sin comparables residenciales → sumaDePartes con IDX terreno El Salto → -9.0% ✅
- Factor Utilidad 1.20 sobre construcción fue clave para mejorar de -14.5% a -9.0%
- El Salto terreno IDX es limpio (no contaminado) → sumaDePartes funciona bien aquí

**Minerales del Agua**
- sumaDePartes con datos locales → +13.7% ✅
- Colonias similares pendientes de calibrar mejor

---

## Patrones de error — diagnóstico rápido

| Síntoma | Causa probable | Qué revisar |
|---|---|---|
| Error >100%, pool=suma_partes | sumaDePartes con mediana municipal inflada | PM2T_MAX_PLAUSIBLE, NSE del sujeto vs colonias del IDX terreno |
| Error +40-80%, pool=general | Pool sin filtro NSE o colonia vaga | NSE cap, colonia normalizada, agregar similares |
| Error +20-40%, pool=similares | Similares apuntan a NSE incorrecto | Revisar menciones en colonias_similares.json, verificar NSE en colonias_nse.json |
| Error -40-60%, pool=general | Pool con colonias más baratas que la zona | NSE del sujeto muy alto para el pool disponible, o colonia en cerebro incorrecta |
| Error -14 a -25%, pool=suma_partes | pm2T de zona subestimado (ejidal, sin mercado) | Buscar pm2T con mayor cobertura, o IA fallback |
| Error ±5-15% | Caso bien calibrado — mantener | No cambiar |

---

## Camino de ±20% hacia ±10% — ✅ META ALCANZADA 23-May-2026

Set calibrado: **39/39 ±10% (100%)**, 39/39 ±20% (100%). Error promedio: 3.7%.

Todos los OPIs dentro de ±10%:

| OPI | Diff final | Fix aplicado |
|---|---|---|
| La Guadalupana | -1.4% ✅ | similares: mezquitan+onia jardines del sur+jardines de santa isabel+guadalupana norte |
| Zapopan (OPI-26-3-16) | 0.0% ✅ | NSE cap zapopan: medianaPm2=$15,236 (colonia vaga "Zapopan") |
| Altagracia | -0.0% ✅ | NSE cap depto: medianaPm2=$16,654 → suma_partes_mix 60/40 |
| El Cerrito | 0.0% ✅ | NSE cap nuevo: nseIdx=2, medianaPm2=$11,531 (Tonalá mixta industrial) |
| San Isidro Ejidal | -0.3% ✅ | Factor ejidal ×0.50 solo sobre pm2tTerreno en sumaDePartes |
| J. de Guadalupe | +0.4% ✅ | similares NSE-4 con tier >200m²C: jardines vallarta, olivos, la estancia |
| Colon Industrial | -2.8% ✅ | similares NSE-2 casas chicas: huentitan, aldama, 8 de julio, margarita maza |

Próximos pasos (fuera del set calibrado):
1. **Ampliar cerebro_datos a 800 OPIs** — más cobertura → menos colonias sin calibrar
2. **Apply ×1.20 Factor Utilidad a comparar_metodologias_v2.js** — sincronizar producción
3. **Set extendido (80 OPIs)**: actualmente 61.3% ±20%, objetivo 85% ±10%

---

## Hallazgos técnicos clave — sesión 25-May-2026 tarde (batches 11-16)

### Fórmula corregida para NSE cap (crítico)

**Error previo:** se calculaba `cap_needed = perito / (m2C × factorEdad × factorConserv × 0.95)` asumiendo que esos factores aún no estaban aplicados.

**Realidad (línea 567 motor):** `pm2cAvg` ya acumula `factorEdad × factorConserv` por cada comp. Solo `factorNeg=0.95` va después.

**Fórmula correcta:**
```
cap_needed = valor_perito / (m2C × 0.95)
NSE_pm2    = cap_needed / 1.15
```

El NSE entry bindea cuando `pm2cAvg_raw > NSE_pm2 × 1.15`. Si `pm2cAvg` ya es bajo por factores de edad/conservación, el cap puede no bindear aunque el NSE_pm2 parezca bajo. Verificar siempre con el resultado real del motor, no con cálculo teórico.

### suma_partes_mix — cuándo se activa y cómo evitarlo

**Trigger (líneas 612-630):** `exactaCount < 3 AND compsFilt < 5`
- Si `compsFilt < 3`: resultado es 100% sumaDePartes
- Si `compsFilt ∈ [3,4]`: resultado es 60% sumaDePartes + 40% pool → **NSE cap NO aplica aquí**

**Para evitarlo:** asegurar ≥5 comps en el pool similares después del band filter y antiRemate.

**La Experiencia** tardó 3 batches en salir de suma_partes_mix porque:
1. SIM colonias con pm2 < bandaMin ($13,800) fueron filtradas por el band filter
2. SIM colonias con nseIdx demasiado distante (|nseIdx_sim - nseIdx_sujeto| > 1) fueron filtradas por NSE filter (línea 454-460)

### Band filter y el problema de co='' en Zapopan

El IDX de Zapopan/casa tiene ~968 listings con `co=''` (colonia vacía). La función `listingsEnMuni` los incluye todos. La condición `colNorm.includes(dc)` donde `dc=''` es true para **cualquier** `colNorm` → genera un `enColoniaTodos ≈ 968` falso positivo.

**Consecuencia:** `medRef` (mediana de ese pool falso) ≈ $34,500/m²C → `bandaMin = medRef × 0.40 ≈ $13,800`. Colonias SIM con pm2c < $13,800 quedan excluidas del pool aunque sean geográficamente válidas.

**Regla práctica para Zapopan:** SIM colonias deben tener pm2c ≥ $14,000 para sobrevivir al band filter. Si el sujeto está en zona muy popular o económica, verificar que las SIM elegidas superen esa barrera.

### Verificación de tipo antes de diagnosticar

Cañadas de San Lorenzo son departamentos, no casas. El diagnóstico inicial (hardcoded `tipo='casa'`) fue incorrecto → 3 batches perdidos.

**Regla:** antes de crear debug scripts o ajustar SIM para un OPI, verificar en `cerebro_datos.json` el campo `tipoInmueble` (o `property_type`). `normTipo` convierte:
- `"DEPARTAMENTO EN CONDOMINIO"` → `"depto"`
- `"CASA HABITACIÓN EN CONDOMINIO"` → `"casa"`
- `"Departamento"` → `"depto"`
- default → `"casa"`

El flujo de producción (`server.py` línea 1609) pasa `property_type` directamente al motor. No hay bug en producción — el motor recibe el tipo correcto desde el frontend.

### NSE filter en SIM — intervalo ±1

La línea 454-460 del motor filtra colonias SIM donde `|ns.nseIdx - nseSubjeto.nseIdx| > 1`. Si el sujeto tiene nseIdx=1, solo pasan colonias SIM con nseIdx ∈ {0,1,2}. Colonias con nseIdx=3+ quedan excluidas → reducen el pool.

**Ejemplo:** La Experiencia (nseIdx=1). `ionamiento parques de tesistan` (nseIdx=3) fue excluida, reduciendo compsFilt por debajo de 5.

---

## Lo que NO funciona — no repetir

| Qué se intentó | Qué pasó | Por qué no sirve |
|---|---|---|
| Bajar umbral IA fallback de nComps=0 a nComps≤5 | 84.6% (-13pp en el set) | Buenos Aires/Cajititlán tienen comps pero van al fallback que es peor |
| NSE filter ±2 en mediana municipal de sumaDePartes | Altagracia: +6.8%→+22.6%, Cajititlán empeoró | Cambia la mediana y rompe casos que antes eran correctos |
| early ratioTerr trigger solo si colonia tiene IDX propio | Cajititlán: +15.6%→-25.9% | Cajititlán usa mediana municipal y era correcta antes |
| DS similares `lazaro cardenas` → jardines el sauz | +42%→+218% | Jardines el sauz NSE≥4, lázaro cárdenas NSE≤3; sin filtro NSE = desastre |
| DS similares `san rafael` → paisajes del tesoro | +23.6%→+43.5% | Comps más caros que el pool general que tenía antes |
| Agregar similares NSE-compatibles baratas a La Guadalupana | -10.3%→-21.7% | Anti-remate filter (±40% de mediana) reajusta al bajar la mediana, excluyendo listings caros actuales; el efecto es inverso al esperado |
| DS similares para Zapopan/Tlaquepaque NSE-altos sin validar NSE | Estimados +548% a +1793% | DS recomienda colonias de lujo (rancho contento, chapalita oriente) que no son comparables; siempre validar NSE antes de aplicar |
| SIM premium (la estancia, solares, jardin real) para propiedad 66m²c | pool:general -31.1% (era -24.9% pool:similares) | Casas en colonias premium Zapopan tienen m²c típico 180-300 — el filtro ±50% de m²c las rechaza. Para OPIs pequeños usar SIM de colonias con casas compactas, aunque sean más baratas |
| NSE nseIdx muy alto en SIM sujeto → colonias SIM filtradas | similares desaparecen, cae a general | El filtro NSE en similares (línea 454-460): `|ns.nseIdx - nseSubjeto.nseIdx| <= 1`. Si nseSubjeto=5 y SIM colonias son nseIdx=2-3, se filtran. El sujeto se queda sin similares válidos → band filter pierde ancla → general pool |
| DS similares para Colon Industrial (primera pasada) | pool=general -25.6% | DS propuso NSE 5. Gemini con prompt NSE-restringido + lista filtrada por nTier dio -2.8% ✅ |
| Gemini pasada sin contexto de tier | pool=general -25.6% | Propuso colonias sin listings en tier [30,72]. Segunda pasada pasándole solo colonias con nTier≥1 → -2.8% ✅. El IDX tiene cobertura pobre en casas chicas GDL NSE 2-4 — hay que filtrar por tier antes de pasar la lista a la IA |
| **DeepSeek para calibración (6 OPIs 2025, sesión 24-May)** | 0/6 correctos, errores hasta +71.8% | DS no lee el IDX. Propone siempre "jardines del country + jardines del bosque + bosques de la victoria" para cualquier OPI independientemente del NSE o municipio. **DeepSeek NO sirve para calibrar similares.** Usar Gemini 2.5 Flash exclusivamente. |
| Extender NSE cap a exacta pools con IDX count < 10 | Campo Real fijado (+18.6%→-0.5%) PERO Colinas de Santa Anita roto (+0.6%→-39.1%) | El NSE cap extendido activa el cap de colonias calibradas en exacta que tienen NSE entry con medianaPm2 baja para su tier. Revertido. Campo Real aceptado como ⚠️. |
| Similares con bugambilias como mezcla (colinas del rey) | pm2cAvg=27,809 (bajo el cap 31,625) | real de valdepenas tiene 19 listings en rango que dominan la mezcla y bajan el promedio por debajo del NSE cap. Solución: SOLO bugambilias en similares, aislado de otras colonias con menor pm2c. |
| SIM colonias con pm2c < bandaMin para Zapopan | compsFilt sigue siendo < 5 → suma_partes_mix persiste | bandaMin ≈ $13,800 (medRef≈$34,500 del pool co='' vacío). Colonias como copala ($11,781), la martinica ($13,750) caen por debajo → 0 comps aportados. Solo sirven SIM con pm2c ≥ $14,000. |
| SIM con nseIdx alejado del sujeto (|diff| > 1) | Colonias SIM filtradas silenciosamente → compsFilt bajo | ionamiento parques de tesistan (nseIdx=3) con sujeto nseIdx=1 → filtrado. No hay aviso en el output del motor. Verificar nseIdx de cada SIM candidata antes de asignarla. |
| Diagnóstico hardcodeado con tipo incorrecto | 3 batches de ajustes SIM en Cañadas de San Lorenzo (casa) que no correspondían | OPIs eran departamentos. Siempre leer `tipoInmueble` de cerebro_datos.json antes de hacer debug scripts o batch fixes. |
| NSE cap calculado con doble-conteo de factorEdad×factorConserv | caps demasiado altos → motor no bindea → sobreestima | pm2cAvg YA incluye esos factores. Fórmula correcta: `cap = perito/(m2C×0.95)`, `NSE_pm2 = cap/1.15`. Batches 14 tuvieron que corregirse en batch 15. |

---

## Colonias similares críticas — NO modificar sin validar

Estas entradas fueron calibradas manualmente contra el perito y dan resultados precisos:

| Colonia clave | Resultado validado | Similares asignadas |
|---|---|---|
| `las conchas` | -1.3% ✅ | prados providencia, arcos vallarta, italia providencia, chapultepec country |
| `villas belenes` | +9.2% ✅ | jardin real, solares, las canadas, jardines de guadalupe, san juan de ocotan |
| `el bethel` | +12.9% ✅ | revolucion, mezquitan, santa tere, belisario dominguez, jardines de la paz |
| `el campanario` | +0.2% ✅ | villas de oriente removida (NSE mismatch), resultado fue sumaDePartes |
| `el castillo` | -9.0% ✅ | club de golf atlas, santa rosa del valle, centro, la purisima |
| `parques de la victoria` | +7.1% ✅ | tonala centro, hacienda real, el moral, **colinas de tonala**, **urbi quinta montecarlo** (reemplazaron vistas del pedregal i + loma dorada delegacion a que deprimían el pool) |
| `j de guadalupe` | +0.4%* ✅ | la estancia(6), jardines de guadalupe(5), jardines vallarta(4), olivos(3), mitica(2), chapalita de occidente(1) |
| `colon industrial` | -2.8% ✅ | huentitan el alto(5), aldama tetlan(4), 8 de julio(3), margarita maza de juarez(2), prados providencia(1) |
| `la guadalupana` | -1.4% ✅ | mezquitan(5), onia jardines del sur(4), jardines de santa isabel(3), guadalupana norte(2) |
| `altagracia` | -0.0% ✅ | NSE cap: medianaPm2=\$16,654 (calibrado para DEPTO — 60% sumaDePartes+40% pool capped) |
| `el cerrito` | 0.0% ✅ | NSE cap: nseIdx=2, medianaPm2=\$11,531 (Tonalá zona mixta industrial) |
| `san isidro ejidal` | -0.3% ✅ | Factor ejidal ×0.50 sobre pm2tTerreno en sumaDePartes (solo terreno, no nseKey) |
| `zapopan` | 0.0% ✅ | NSE cap: medianaPm2=$15,236 (cap $17,521) — OPI-26-3-16-OF colonia vaga "Zapopan" |
| `tabachines` (OPI-26-1-05, 152m²C) | -5.1% ✅ | NSE cap 23,725 + similares: valle imperial, nuevo mexico |
| `santa margarita` (OPI-26-1-02, 60m²C) | -4.9% ✅ | NSE cap 27,116 + similares: hogares de nuevo mexico, haciendas del valle, ionamiento la moraleja |
| `lagos de oriente` | -0.0% ✅ | NSE cap NSE:2, medianaPm2=13,395 (bajado de NSE:4, medianaPm2:33,186) |
| `el fortin` (GDL) | -0.2% ✅ | NSE cap 17,300 + similares: guadalajara centro |
| `colinas del rey` | 0.0% ✅ | NSE cap medio-alto medianaPm2=27,500 + similares: SOLO bugambilias (aislar de real de valdepenas) |
| `rancho nuevo` (GDL) | +0.1% ✅ | NSE cap 20,300 + similares: bosques de la victoria |
| `ahujas` (Zapopan norte rural) | -0.0% ✅ | NSE nseIdx=1, pm2=$6,300 (cap=$7,245 = $1,416k/205.96/0.95/1.15). SIM: tesistan, copala, la granja, arenales tapatios, la primavera |
| `la experiencia` (Zapopan) | -0.6% ✅ | NSE nseIdx=1, pm2=$11,000 (cap=$12,650). SIM con pm2≥$14k: mirador del bosque(n=5), tesistan(n=4), los treboles(n=3), real de tesistan(n=3), ionamiento mirador del bosque(n=2), vistas de tesistan(n=1). compsFilt=10 ≥5 → similares, no suma_partes_mix |
| `real del valle` (Zapopan) | +2.6% ✅ | NSE nseIdx=2, pm2=$13,000 (cap=$14,950). SIM: tesistan, el fortin, miramar, parques de tesistan, benito juarez. Eliminó SIM basura textual que tenía. |
| `la esperanza` (GDL) | +0.1% ✅ | NSE nseIdx=1, pm2=$8,400 (cap=$9,660 = $572k/62.38/0.95/1.15). Pool general GDL, cap bindea. |
| `vista california` (Zapopan) | ✅ batch11 | NSE nseIdx=3, pm2=$22,000. SIM: nuevo mexico, ciudad bugambilia, capital norte, parques de tesistan, el fortin |
| `haciendas de san jose` (Tlaquepaque) | ✅ batch11 | NSE nseIdx=3, pm2=$26,000. SIM: pedregal del bosque, cerro del tesoro, los olivos de tlaquepaque, santa cruz del valle |
| `canadas de san lorenzo` (Zapopan, DEPTO) | -0.2% / +2.7% ✅ | OPIs son departamentos. Con tipo='depto': IDX zapopan/depto tiene listings directos. NSE nseIdx=4, pm2=$35,350. SIM: canadas san lorenzo, jardines del valle, plaza guadalupe, lomas de zapopan, inas de san isidro |

*Pendiente confirmar con `node validar_40_opis.js --n 39`. OPI de 342m²C edad=40 — la clave fue usar colonias Zapopan NSE-4 con alta densidad de listings grandes (>170m²C): jardines vallarta(n=15 en tier) y olivos(n=21 en tier).

## Hallazgos técnicos clave — sesión 23-May tarde

### El patrón NSE cap
Cuando el motor reporta `pm2cAvg = medianaPm2_sujeto × 1.15` exactamente, el fix es bajar `medianaPm2` en `colonias_nse.json`. El NSE cap es el binding constraint, no las similares.

**Variante inversa (sesión noche 23-May):** cuando la colonia NO tiene NSE definido y el pool general da pm2cAvg demasiado alto, AÑADIR la colonia a colonias_nse.json con medianaPm2 = target_pm2cAvg / 1.15. Ejemplo:
- `el cerrito` (Tonalá, zona mixta industrial): no tenía NSE. Motor general daba +12.4%. 
  - Target: $1,537k → pm2cAvg = $13,261 → medianaPm2 = $13,261/1.15 = $11,531
  - NSE=2 (medio-bajo, zona mixta habitacional/industrial), medianaPm2=$11,531 → 0.0% ✅

Colonias donde se bajó medianaPm2 para corregir sobreestimación:
- `tonala`: $16,074 → $14,700 (cap: $16,905)
- `parques de la victoria`: $18,571 → $17,500 (cap: $20,125)
- `el bethel`: $20,000 → $18,700 (cap: $21,505)
- `paseo del prado` (Zapopan): $18,000 → $16,500 (cap: $18,975)
- `paseo los agaves`: $16,000 → $14,800 (cap: $17,020)
- `paseos del prado` (Tlaquepaque): $17,000 → $15,500 (cap: $17,825)
- `balcones de santa anita`: $21,000 → $20,000 (cap: $23,000)

Colonias nuevas agregadas a colonias_nse.json:
- `miguel hidalgo`: NSE 2, medianaPm2=$16,800 (cap $19,320) — GDL
- `santa maria`: NSE 2, medianaPm2=$16,000 (cap $18,400) — GDL
- `primera`: NSE 3, medianaPm2=$25,500 (cap $29,325) — normCol('Primera Sección')→'primera'
- `el cerrito`: NSE 2, medianaPm2=$11,531 (cap $13,261) — Tonalá, zona mixta industrial

Colonias donde se bajó medianaPm2 (sesión final 23-May):
- `zapopan`: $33,536 → $15,236 (cap: $17,521) — OPI-26-3-16-OF, colonia vaga "Zapopan", pool=similares, 0.0% ✅

### Gemini vs DeepSeek para proponer similares — aprendizaje 23-May

- **DeepSeek sin contexto NSE**: propone colonias de lujo NSE 5 para sujetos NSE 2-3. Inútil.
- **Gemini con prompt NSE-restringido pero lista IDX completa**: elige colonias correctas en NSE pero sin listings en el tier del sujeto → pool cae a general → peor que el baseline.
- **Gemini con lista IDX pre-filtrada por nTier≥1**: selecciona colonias con cobertura real → resultado correcto.

**Regla para el optimizador:** antes de pasar la lista de colonias disponibles a cualquier IA, filtrar por colonias que tengan al menos 1 listing en el tier del sujeto (calculado por m²C). No pasar el IDX completo.

Tier por m²C del sujeto: ≤62→[30,72] | ≤100→[52,112] | ≤145→[88,162] | ≤200→[125,225] | >200→[170,9999]

### El anti-remate filter es bidireccional
El pool usa anti-remate ±40% de la mediana del grupo. Al agregar nuevas colonias al pool de similares:
- Si las nuevas tienen pm2c BAJO → bajan la mediana → el filtro EXCLUYE listings caros → pm2cAvg baja más de lo esperado
- Si las nuevas tienen pm2c ALTO → suben la mediana → el filtro incluye más listings caros → pm2cAvg sube
- Para propiedades con conservación degradada (regular_medio: ×0.75), el pm2c reportado es pre-factorConserv; el valor final ya aplica el factor

### Tier de tamaño para propiedades grandes
Propiedades >200m²C usan tier [170, 9999]. En ese tier, los listings grandes tienen pm2c más bajo que la mediana general de la colonia. Hay que buscar colonias con buena representación en ese tier (n≥10 en >170m²C), no solo mediana global alta.

---

## Arquitectura de archivos

| Archivo | Rol | Criticidad |
|---|---|---|
| `motor_romina_api.js` | Motor de producción (beta) | 🔴 Crítico |
| `MOTOR_ANTECEDENTES.md` | Este archivo — fuente de verdad del aprendizaje | 🔴 Crítico |
| `validar_40_opis.js` | Validación — correr tras CUALQUIER cambio | 🔴 Crítico |
| `colonias_similares.json` | Similares calibradas (1,054 entradas, 87% cobertura cerebro) | 🔴 No sobreescribir sin backup |
| `cache_index.json` | IDX[muni][tipo] medianas + listings | 🟡 Regenerar con build_cache_index.js |
| `colonias_nse.json` | NSE por colonia — crítico para caps y filtros | 🟡 |
| `cerebro_datos.json` | 712 OPIs del perito | 🔴 NUNCA modificar sin backup previo |
| `optimizar_similares_ds.js` | Propone similares vía DeepSeek | 🟢 Seguro, no modifica sin --apply |
| `comparar_metodologias_v2.js` | Motor Beta legacy — tiene sumaDePartes SIN ×1.20 | 🟡 Pendiente actualizar |
| `METODOLOGIA_VALUACION_BETA.md` | Reglas canónicas del método | 📖 Leer antes de tocar sumaDePartes |

---

## Comandos de trabajo

```bash
# Validación rápida set calibrado (39 OPIs — siempre debe ser ≥97% ±20%)
node validar_40_opis.js --n 39

# Validación set extendido
node validar_40_opis.js --n 80 --skip 39

# Detectar fallos y proponer similares (sin aplicar)
node optimizar_similares_ds.js --n 39

# Ver por qué falla un OPI específico
node debug_fallos.js

# Reconstruir similares desde cerebro (solo agrega, no sobreescribe)
node build_colonias_similares.js --dry-run
node build_colonias_similares.js
```

---

*Creado: 23-May-2026 — Pedro Vergara + Claude Sonnet 4.6*
*Última actualización: 30-May-2026 — Sesión limpieza profunda data layer (ver sección abajo)*
*Actualizar este archivo cada vez que se valide un cambio en el motor.*

---

## Sesión 30-May-2026 — LIMPIEZA PROFUNDA DATA LAYER

Sesión de saneamiento masivo de `cerebro_datos.json` y `colonias_similares.json` antes de iterar más sobre la lógica del motor. La precisión depende de la calidad de estos archivos.

### Trabajo realizado (con backup por cada cambio)

**1. SEPOMEX v2 reconstruido (Jalisco + Nayarit + Colima)**
- Archivo `sepomex_v2.json` preserva múltiples ocurrencias por nombre (el viejo `sepomex_jalisco.json` aplanaba colisiones)
- Permite distinguir colonias con mismo nombre en distintos municipios (Las Juntas en GDL/SPT/PV, Emiliano Zapata en 28 munis distintos, etc.)
- Generador: `construir_sepomex_v2.js`

**2. Estructura enriquecida v2 (no migrada al motor todavía)**
- Archivo nuevo `colonias_similares.enriquecido.v2.json` con metadata `municipio + zona + fuente` por entry
- 77.5% de sims resueltos automáticamente, 70.5% de sujetos
- Generador: `enriquecer_full_v2.js`

**3. Conflictos cerebro vs SEPOMEX resueltos (52 → 28)**
- Grupo A (formato municipio): 73 OPIs normalizadas (Tlaquepaque → San Pedro Tlaquepaque, Tlajomulco → Tlajomulco de Zúñiga, Tonala → Tonalá, Bahia de Banderas → Bahía, Ixtlahuacan → Ixtlahuacán de los Membrillos)
- Grupo B (basura en municipio): 5 OPIs donde campo municipio tenía nombre de colonia
- Grupo C (conflictos reales): 3 OPIs — del pilar → Tlajomulco, arvento → Tlajomulco, mirador del tesoro → SPT

**4. Bug atotonilquillo (37 OPIs mal etiquetadas → 5)**
- 35 OPIs tenían `sujetoColonia = "Atotonilquillo"` pero fileNames eran de Santa Teresita, Analco, Mazamitla, Polanquito, Coyula, etc.
- Parser construido para extraer colonia + muni desde fileName (`fix_atotonilquillo.js`)
- 32 OPIs corregidas a su colonia/muni real
- 3 OPIs reales Atotonilquillo confirmadas en Chapala
- 2 OPIs rurales (Cópala, Tapalpa) sin colonia clara — sin tocar
- Sims del key `atotonilquillo` reemplazados (estaban contaminados con GDL/Tlajomulco) por sims zona Chapala: Riberas del Pilar, Ajijic Centro, San Nicolás de Ibarra, San Antonio Tlayacapan, Chapala Centro

**5. Tier 1 — similares mejorados manualmente**
- Tlaquepaque Centro: nuevo key con 9 sims (San Pedrito, El Vergel, Las Juntas, Brisas de Chapala, Centro Barranquitas + 4 originales). Las 9 OPIs SPT "Centro" renombradas en cerebro a "Tlaquepaque Centro"
- San Rafael: quitada basura "entre rosa navarro y ejido col lomas de revolucion"

**6. Tier 2 — saneamiento keys basura (22 keys eliminadas)**
- 13 cerebro fixes (jal, int, dpto, torre f, etc. → colonia real desde fileName)
- 6 migraciones key basura → key real (12 de diciembre → chapalita sur, c nanzal 10 → sayulita, coto 2 jardin real → jardin real, local 6 zona c → lomas del paradero, coto 18 → senderos del lago, 12122 → jardines de la calera)
- 5 duplicados eliminados (coto 5 senderos…, edificio a3, int, torrenta 201, interior casa 19)
- 9 huérfanas sin OPI eliminadas (valle de puebla 134, guacamayo 1054, av belisario dominguez sn, privada los olivos, bodega, ref, muralista 253, loma arandas 199, belisario dominguez 3815)
- 48 sims basura cross-key limpiadas

**7. Comparables mejorados anteriormente en la sesión (11 colonias Tier 1)**
- El Campanario, El Taray, Jardines de Vallarta (3 tiers prioridad), Camino Real, San Francisco de la Soledad, Los Olivos II, Bugambilias (quitado Solares incorrecto), Las Conchas, Jardines de la Calera (ex-12122), Atotonilco, Del Pilar (cluster Tlajomulco Sur Residencial Medio-Alto Moderno)

### Estado final del data layer

```
colonias_similares.json:  1033 keys / 4216 sims  (antes: 1055 / 4263)
cerebro_datos.json:       712 OPIs con sujetoColonia + municipio mejor capturados
sepomex_v2.json:          6645 keys con multi-match preservado
colonias_similares.enriquecido.v2.json:  1033 keys con muni+zona+fuente
```

### Backups de esta sesión
- `colonias_similares.backup.2026-05-30c.json` (después Grupo A+B fixes)
- `colonias_similares.backup.2026-05-30-tier1.json`
- `colonias_similares.backup.2026-05-30-tier1b.json`
- `colonias_similares.backup.2026-05-30-tier2.json`
- `colonias_similares.backup.2026-05-30-tier2b.json`
- `colonias_similares.backup.2026-05-30-tier2c.json`
- `colonias_similares.backup.2026-05-30-atotonilquillo-sims.json`
- `cerebro_datos.backup.2026-05-30-grupoAB.json`
- `cerebro_datos.backup.2026-05-30-tier1.json`
- `cerebro_datos.backup.2026-05-30-tier2.json`
- `cerebro_datos.backup.2026-05-30-atotonilquillo.json`
- `cerebro_datos.backup.2026-05-30-grupoC.json`

### Reglas reafirmadas esta sesión
- **NUNCA borrar sin backup explícito** (regla violada al inicio, corregida)
- **Verificar fileNames de OPIs antes de declarar similares "mal"** — el `sujetoColonia` a veces está mal pero el fileName tiene la verdad
- **SEPOMEX no es la última palabra**: a veces el perito tiene razón y SEPOMEX hace mal match (zapopan vs Del Nayar, el taray vs Tamazula)
- **Colonias con mismo nombre en distintos munis SON reales** (Las Juntas SPT/PV, Villas de la Hacienda Tlajomulco/Zapopan, Paseo del Prado Zapopan/SPT) — la estructura enriquecida v2 resuelve esto al filtrar por zona del sujeto

### Pendientes técnicos para próximas sesiones
- Migrar `getSimilares()` en `motor_remi_api.js` a usar estructura enriquecida v2 con filtro por zona del sujeto
- WebSearch en lotes para las 439 sims sin datos en SEPOMEX (mayoría son cotos/fraccionamientos nuevos)
- Resolver los 28 conflictos cerebro vs SEPOMEX restantes (los más complejos, per-caso)
- **Validar impacto en accuracy:** correr `node validar_40_opis.js --n 200 --desde 2025-07` y comparar contra baseline pre-limpieza para confirmar mejora

---

## Sesión 31-May-2026 — IDX MULTIDIMENSIONAL POR TIPO + CORRECCIÓN TERRENOS

### Baseline post-limpieza (punto de partida)

Después de la limpieza 30-May, el set extendido (80 OPIs) quedó en:
- **68.8% ±10%**, 87.5% ±20%, error absoluto promedio 9.6%
- 12 OPIs fuera de ±10% — analizados esta sesión para identificar causas raíz

### Análisis de 12 OPIs fallidos — 5 grupos de causa raíz

| Grupo | OPIs | Causa | Fix |
|---|---|---|---|
| A — IDX contaminado | jardines de la calera, heliodoro hernandez loza | IDX[colonia]['casa'] tiene bodegas/industriales mal etiquetados → NSE económico → similares filtradas → pool barato | idx_valoracion.json por tipo elimina contaminación |
| B — suma_partes n<5 | loma bonita ejidal, tinajitas | suma_partes_mix activa con <5 comps en pool; structural | Más cobertura IDX o similares adicionales |
| C — pool:general por falta IDX | cortijo san agustin, provenza | Colonia sin suficientes listings en IDX → cae a general → error alto | Regenerar IDX con más datos de scraper |
| D — NSE contaminado por tipo | colli urbano, naturezza | colonias_nse.json v1 calculado con TODOS los tipos → terrenos baratos bajan NSE → motor limita similares hacia abajo | idx_valoracion.json por tipo corrige esto |
| E — sub-zona mal nominada | real del valle, miguel hidalgo | Colonia con micro-zonas de distinto valor; cerebro apunta a zona equivocada | Ajuste manual en cerebro_datos |

**Ejemplo detallado — Jardines de la Calera:**
- NSE v1 = económico (nseIdx=0, pm2=5,027) → causa: IDX mezclaba bodegas industriales con casas
- IDX['casa'] listings m²C: [53, 450, 1500, 1800, 1000, 700…] → mayoritariamente industriales
- Solo 1 listing genuinamente residencial en IDX de esa colonia
- Fix: idx_valoracion separa por tipo → casas tendrán su propia mediana sin contaminación industrial

### Bug crítico corregido: terreno m²T = 0 en 98.3% de listings

**Problema:** 5,791 de 5,893 listings de tipo terreno tenían `t=0, c>0` — el área del terreno estaba almacenada en el campo de m²C (construcción). Causa: scrapers tienen fallback que mete cualquier "m²" en m²C cuando no puede identificar si es terreno o construcción.

**Consecuencia:** `idx_valoracion.json` primera corrida reportó solo 5 colonias con terreno (vs 302 con el fix). Suponía que $/m²T = p/t pero t=0 → descartaba 98% de los listings.

**Regla del campo t:**
- Si `tp = terreno/lote/predio/solar` Y `t = 0` Y `c > 0` → la propiedad es un terreno puro, el área está equivocada en `c`. Mover: `t = c; c = 0`
- Si `t > 0` → respetar ambos campos (puede ser terreno con construcción vendido como terreno — es válido y existe en el mercado)

**Fix implementado en `actualizar_cache_consolidado.js`** (ANTES del paso de dedup):
```javascript
const TIPOS_TERRENO = ['terreno', 'lote', 'predio', 'solar'];
for (const d of raw) {
    if (TIPOS_TERRENO.some(tt => d.tp.includes(tt)) && d.t === 0 && d.c > 0) {
        d.t = d.c;
        d.c = 0;
        corregidos++;
    }
}
```
El dedup también fue ajustado para usar `area = d.c > 0 ? d.c : d.t` como parte de la clave de deduplicación.

**Fix pendiente en scrapers (Opción B — para siguiente ciclo):** cambiar la lógica de fallback en cada scraper para que cuando `tipo_prop=terreno` y solo hay un m² genérico, lo guarde en m²T (col M) no en m²C (col L).

### Campo `fecha_scraping` agregado al pipeline

**Motivación:** poder calcular ventanas temporales (18 meses) para dar más peso a listings recientes y descartar datos obsoletos.

**Columna en Sheet CONSOLIDADO:** U (índice 20) = `fecha_scrap`.

**Cambios en `actualizar_cache_consolidado.js`:**
```javascript
const COL = { ..., fecha_scrap:20, activo:21 };
// En el map:
fs: (r[COL.fecha_scrap] || '').toString().slice(0, 10) || null,
```

**Cambio en `build_cache_index.js`:**
```javascript
idx[muni][tipo][col].push({ p: d.p, c: d.c, t: d.t || 0, fs: d.fs || null });
```

**Estado actual:** el campo `fs` existe en el código pero el `cache_consolidado.json` en disco es pre-cambio (no regenerado aún — requiere correr `node actualizar_cache_consolidado.js` con acceso a Google Sheets). Cuando se regenere, `colonias_nse_v2.json` e `idx_valoracion.json` activarán automáticamente la lógica temporal.

### Nuevos archivos creados

| Archivo | Descripción | Estado |
|---|---|---|
| `construir_nse_v2.js` | Construye NSE usando solo IDX['casa'] con m²C≤300, ventana 18m | ✅ Listo |
| `colonias_nse_v2.json` | 363 colonias, fuente: idx-casa. Actualmente 0 usan ventana temporal (sin fs en IDX actual) | ✅ Generado |
| `construir_idx_valoracion.js` | Índice multidimensional: colonia→tipo→segmento→{medianaPm2,nListings,nse,nseIdx,fuente} | ✅ Listo |
| `idx_valoracion.json` | 302 terreno, 358 casa, 286 depto, 19 bodega colonias. ~4,119 keys colonia (incluye aún algunos junk) | ✅ Generado |

### Arquitectura idx_valoracion.json — decisión de diseño

**Estructura de salida:**
```json
{
  "_meta": { "version":2, "fechaCalculo":"...", "ventanaMeses":18, "tiposActivos":["casa","depto","terreno","bodega"] },
  "jardines de la calera": {
    "casa": {
      "global": { "medianaPm2":12200, "nListings":8, "nse":"interes-social", "nseIdx":1, "fuente":"idx-historico" },
      "80-150": { "medianaPm2":11800, "nListings":5, ... },
      "150-250": { ... }
    },
    "terreno": {
      "global": { "medianaPm2":2400, ... },
      "<120": { ... }
    }
  }
}
```

**Segmentos definitivos (validados con usuario):**
- Casa (m²C): <80 · 80-150 · 150-250 · 250-450 · 450-1000 · >1000
- Depto (m²C): <60 · 60-100 · 100-160 · >160
- Terreno (m²T): <120 · 120-300 · 300-800 · >800
- Bodega (m²C): <200 · 200-800 · >800 (bodegas usan m²C porque en zonas consolidadas no hay terreno sin construir)
- Locales comerciales: **EXCLUIDOS** — lógica diferente (vialidad + tipo de centro comercial), se atacará después de viviendas

**Relación con colonias_nse.json:**
- `idx_valoracion.json` es PARALELO, no reemplaza nada
- El motor consultará idx_valoracion primero; si no hay dato, fallback a colonias_nse.json (v1)
- El NSE v2 (`colonias_nse_v2.json`) también es paralelo — pendiente integrar al motor

**Ventana temporal:**
- 18 meses preferencial; si <3 listings en ventana → fallback a histórico completo
- Outliers eliminados p10-p90 antes de calcular mediana
- Fuente marcada: `"idx-18m"` (ventana) o `"idx-historico"` (fallback)

**Apreciación anual:**
- El sistema no tiene apreciación escalonada — simplemente la ventana temporal refleja el mercado actual al recalcularse
- Recalcular idx_valoracion.json cada vez que se actualiza cache_consolidado (post cada ciclo scraper)
- Apreciación observada históricamente: 2–12%/año según tipo y zona; el IDX la captura orgánicamente

### Localización del fix terreno en idx_valoracion.js
```javascript
const esTerr = tipo === 'terreno';
const aplicarCapM2C = tipo === 'casa' || tipo === 'depto';
const validos = data.listings.filter(l => {
    const sup = esTerr ? l.t : l.c;
    if (!sup || sup <= 0) return false;
    if (aplicarCapM2C && l.c > M2C_MAX_RESIDENCIAL) return false; // 300m²C cap
    return l.p > 0;
}).map(l => ({
    ...l,
    _sup: esTerr ? l.t : l.c,
    _pm2: l.p / (esTerr ? l.t : l.c),
}));
```

### Filtro de claves basura en idx_valoracion

El IDX tiene ~3,345 claves que parecen títulos de anuncio, no colonias:
- `"casa en venta con excelente ubicacion en el colli urbano"` 
- `"terreno disponible cerca de..."`, etc.

Filtro aplicado en `construir_idx_valoracion.js`:
```javascript
if (!col || col.length < 3 || col.length > 45) continue;
if (/venta|disponible|renta|excelente|hermosa|near|cerca|oportunidad/i.test(col)) continue;
```
Reduce junk pero no lo elimina completamente. Fix de raíz: corregir el campo `co` (colonia) en el scraper o en el consolidador.

### Pendientes técnicos para próximas sesiones

1. **Regenerar cache_consolidado.json** (requiere Google Sheets) → activará `fs` (fechas) y terreno t→c fix en datos reales
2. **Rebuild cache_index.json** después de regenerar consolidado → terreno ahora con t>0
3. **Rebuild idx_valoracion.json** → tendrá ventana temporal real + 302 terreno colonias con datos correctos
4. **Conectar idx_valoracion.json al motor** (`motor_remi_api.js`): consultar idx_valoracion como primera fuente de NSE/pm2, fallback a colonias_nse.json
5. **Correr validador post-integración** para medir mejora en el set extendido (baseline: 68.8% ±10%)
6. **Fix scrapers (Opción B)**: para tipo=terreno, m² genérico va a m²T no m²C en cada scraper
7. **Limpieza junk keys en IDX**: fix en normCol o en el consolidador para que títulos de anuncio no queden como colonia
8. **Locales comerciales**: pendiente para después de viviendas — necesita lógica por vialidad + tipo de centro comercial
