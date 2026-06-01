# Patch: getSimilares() v2 — filtro por zona del sujeto

**No aplicar todavía.** Esperar a que termine validador para tener baseline.

## Cambios a `motor_remi_api.js`

### 1. Después de línea 53 — agregar carga de archivo enriquecido v2

```js
const COLONIAS_V2_PATH = path.join(__dirname, 'colonias_similares.enriquecido.v2.json');
const _simV2 = fs.existsSync(COLONIAS_V2_PATH)
    ? JSON.parse(fs.readFileSync(COLONIAS_V2_PATH, 'utf8')) : {};

// Mapeo municipio → zona (consistente con el script enriquecedor)
const ZONA_DE_MUNI = {
    'guadalajara':'AMG-Centro','zapopan':'AMG-NW',
    'tlaquepaque':'AMG-SE','san pedro tlaquepaque':'AMG-SE',
    'tonalá':'AMG-E','tonala':'AMG-E',
    'tlajomulco de zúñiga':'AMG-S','tlajomulco':'AMG-S',
    'el salto':'AMG-S','juanacatlán':'AMG-S','ixtlahuacán de los membrillos':'AMG-S',
    'chapala':'Chapala','jocotepec':'Chapala','poncitlán':'Chapala','ajijic':'Chapala',
    'puerto vallarta':'Costa-Sur','bahía de banderas':'Costa-Sur','compostela':'Costa-Sur',
    'manzanillo':'Costa-Colima','armería':'Costa-Colima',
};
function zonaDeMuni(muni) {
    if (!muni) return null;
    return ZONA_DE_MUNI[muni.toString().toLowerCase().trim()] || null;
}
```

### 2. Reemplazar `getSimilares()` (líneas 56-63) por versión enriquecida

```js
// Obtiene similares con filtro opcional por zona del sujeto.
// Si `sujetoMuni` se pasa Y existe data v2 con zona, filtra para devolver primero
// similares de la misma zona (evita cruces costa↔AMG, GDL↔Tonalá, etc.)
function getSimilares(colNorm, sujetoMuni = null) {
    // ── V2: con filtro por zona ──
    if (sujetoMuni && _simV2[colNorm]) {
        const zonaSuj = zonaDeMuni(sujetoMuni);
        const datos = _simV2[colNorm];
        if (zonaSuj && datos.similares && datos.similares.length) {
            const mismaZona = datos.similares.filter(s => s.zona === zonaSuj);
            const sinZonaConocida = datos.similares.filter(s => !s.zona);
            const otrasZonas = datos.similares.filter(s => s.zona && s.zona !== zonaSuj);

            // Si misma zona da >=3, usar solo esos + los "sin datos" (potencialmente válidos)
            if (mismaZona.length >= 3) {
                return [...mismaZona, ...sinZonaConocida]
                    .map(s => ({ colonia: s.colonia, menciones: s.menciones }));
            }
            // Si pocos en zona, complementar con sin-zona y luego otras zonas como último recurso
            const combinado = [...mismaZona, ...sinZonaConocida, ...otrasZonas];
            if (combinado.length) {
                return combinado.map(s => ({ colonia: s.colonia, menciones: s.menciones }));
            }
        }
    }

    // ── Legacy: comportamiento original ──
    const base = _sim[colNorm];
    if (base && base.length) return base;
    const ia = _simIA[colNorm];
    if (!ia || !ia.length) return [];
    return ia.map(x => typeof x === 'string' ? { colonia: x, menciones: 1 } : x);
}
```

### 3. Actualizar 2 call sites para pasar `prop.municipio`

**Línea 500:**
```js
// ANTES
const similaresBrutos = getSimilares(colNorm).slice(0, 8).map(x => normCol(x.colonia));

// DESPUÉS
const similaresBrutos = getSimilares(colNorm, prop.municipio).slice(0, 8).map(x => normCol(x.colonia));
```

**Línea 700:**
```js
// ANTES
const simFb = getSimilares(colNormFb).slice(0, 6).map(x => x.colonia);

// DESPUÉS
const simFb = getSimilares(colNormFb, prop.municipio).slice(0, 6).map(x => x.colonia);
```

## Comportamiento esperado

| Caso | Antes (v1) | Después (v2) |
|---|---|---|
| `las juntas` sujeto Tlaquepaque | Devuelve todas (incluye PV) | Solo SPT + zona AMG-SE |
| `emiliano zapata` sujeto Puerto Vallarta | Mixto (Zapopan/PV/Colima) | Solo Costa-Sur |
| `centro` sujeto Tlaquepaque | Sims GDL centro | Filtra por AMG-SE |
| Colonia sin data v2 (cualquiera) | Legacy `_sim` | Legacy `_sim` (idéntico) |
| Sujeto sin municipio | Legacy | Legacy |

## Backward compatibility

- `getSimilares(colNorm)` sin segundo arg → fallback a legacy → cero impacto
- Si `_simV2` no existe → fallback a legacy → cero impacto
- Si la key no está en `_simV2` → fallback a legacy
- Si la zona no se reconoce → fallback a legacy

## Pruebas sugeridas tras aplicar

```bash
# Comparar accuracy v1 vs v2
node validar_40_opis.js --n 200 --desde 2025-07   # baseline (ya pre-cleanup + post-cleanup)
# Aplicar patch ↑
node validar_40_opis.js --n 200 --desde 2025-07   # nuevo
```

Esperamos:
- Casos con cross-zone errors (Las Juntas, Emiliano Zapata) deberían mejorar significativamente
- Casos sin colisión de nombres: idéntico
- Cobertura total: mantenida (fallback siempre disponible)
