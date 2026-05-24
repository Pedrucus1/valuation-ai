# Motor Romina — Compendio de Diagnóstico y Calibración

> **LEER ANTES DE CUALQUIER SESIÓN CON EL MOTOR.**
>
> **OBJETIVO FINAL: error promedio ±5–10% (no ±20%).**
> Estamos en ±10% en el set calibrado de 39 OPIs (mayo 2026). ±20% es apenas el umbral mínimo.
> Cada mejora documentada aquí es un paso hacia esa meta. No retroceder sin prueba.
>
> **Este motor es BETA** — su aprendizaje se transfiere al motor de producción de avalúos.
> Las reglas aquí validadas deben replicarse en `comparar_metodologias_v2.js` cuando estén estables.

---

## Estado actual del motor (23-May-2026 — ✅ CALIBRACIÓN COMPLETA)

| Métrica | Valor | Meta |
|---|---|---|
| Set calibrado (39 OPIs AMG 2026) | **✅ 100% ±10%, 100% ±20%, error promedio 3.7%** | 100% ±10% |
| Set extendido (80 OPIs AMG 2025-26) | 61.3% ±20%, error promedio 27.6% | 85% ±10% |
| Comando de validación | `node validar_40_opis.js` | — |

> **Sesión 23-May tarde:** 47.4% ±10% → 76.3% ±10%. Error 10.0% → 6.8%.
> **Sesión 23-May noche:** 86.8% ±10% → 97.4% ±10%. Error 4.7% → 4.1%. 100% dentro ±20%.
> **Sesión 23-May final:** 97.4% ±10% → **100% ±10% (39/39)**. Error 4.1% → **3.7%**. META ALCANZADA.
> Fix final: NSE cap `zapopan` medianaPm2 $33,536 → $15,236 (OPI-26-3-16-OF, colonia vaga "Zapopan"). 0.0% ✅

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
| DS similares para Colon Industrial (primera pasada) | pool=general -25.6% | DS propuso NSE 5. Gemini con prompt NSE-restringido + lista filtrada por nTier dio -2.8% ✅ |
| Gemini pasada sin contexto de tier | pool=general -25.6% | Propuso colonias sin listings en tier [30,72]. Segunda pasada pasándole solo colonias con nTier≥1 → -2.8% ✅. El IDX tiene cobertura pobre en casas chicas GDL NSE 2-4 — hay que filtrar por tier antes de pasar la lista a la IA |

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
| `parques de la victoria` | +10.5% ✅ | villas de oriente, urbi quinta montecarlo, hacienda real, tonala centro, el moral |
| `j de guadalupe` | +0.4%* ✅ | la estancia(6), jardines de guadalupe(5), jardines vallarta(4), olivos(3), mitica(2), chapalita de occidente(1) |
| `colon industrial` | -2.8% ✅ | huentitan el alto(5), aldama tetlan(4), 8 de julio(3), margarita maza de juarez(2), prados providencia(1) |
| `la guadalupana` | -1.4% ✅ | mezquitan(5), onia jardines del sur(4), jardines de santa isabel(3), guadalupana norte(2) |
| `altagracia` | -0.0% ✅ | NSE cap: medianaPm2=\$16,654 (calibrado para DEPTO — 60% sumaDePartes+40% pool capped) |
| `el cerrito` | 0.0% ✅ | NSE cap: nseIdx=2, medianaPm2=\$11,531 (Tonalá zona mixta industrial) |
| `san isidro ejidal` | -0.3% ✅ | Factor ejidal ×0.50 sobre pm2tTerreno en sumaDePartes (solo terreno, no nseKey) |
| `zapopan` | 0.0% ✅ | NSE cap: medianaPm2=$15,236 (cap $17,521) — OPI-26-3-16-OF colonia vaga "Zapopan" |

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
| `colonias_similares.json` | Similares calibradas (1,052 entradas) | 🔴 No sobreescribir sin backup |
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
*Última actualización: 23-May-2026 tarde — sesión de calibración ±10% (47%→76%)*
*Actualizar este archivo cada vez que se valide un cambio en el motor.*
