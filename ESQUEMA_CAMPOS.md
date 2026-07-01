# ESQUEMA DE CAMPOS — Diccionario único (FUENTE DE VERDAD)

> **LEER ANTES DE TOCAR cualquier campo de datos del mercado/comparables.**
> Este archivo es la ÚNICA fuente de verdad de cómo se llama cada dato en cada capa.
> Si un script usa un nombre distinto a los de aquí, está MAL — corregir el script, no agregar otro alias.
>
> Regla de oro: **un concepto = un nombre largo canónico (Mongo/Sheets) + una abreviación de caché.**
> No inventar variantes por archivo. No mezclar unidades (año-calendario ≠ edad-en-años).

---

## Tabla maestra

| Concepto | Canónico (Mongo / Sheets) | Abreviación caché (.json) | Motor (comp `d.`) | Motor (sujeto `prop.`) | Unidad / notas |
|---|---|---|---|---|---|
| Precio | `precio` | `precio` | `d.precio` | — | MXN entero |
| m² construcción | `m2_construccion` | `m2c` | `d.m2c` | `prop.construccion` | m² |
| m² terreno | `m2_terreno` | `m2t` | `d.m2t` | `prop.terreno` | m² |
| Tipo de propiedad | `tipo_propiedad` | `tipo` | `d.tipo` | `prop.tipo` | casa/depto/terreno/local/bodega |
| Tipo de operación | `tipo_operacion` | — (filtro) | — | — | venta/renta |
| Colonia | `colonia` | `colonia` | `d.colonia` | — | lowercase |
| Municipio | `municipio` | `muni` | `d.muni` | — | lowercase |
| Recámaras | `recamaras` | `recamaras` | — | — | entero |
| Baños | `banos` | `banos` | — | — | entero |
| Estacionamientos | `estacionamientos` | `estac` | — | — | entero |
| Fecha de scraping | `fecha_scraping` | `fecha` | `d.fecha` | — | ISO `YYYY-MM-DD` |
| Fecha de publicación | `fecha_publicacion` | — | — | — | ISO |
| **Año de construcción** | **`anio_construccion`** | **`anio`** | `d.anio` | — | **AÑO-CALENDARIO** (ej. 2011) |
| **Edad** (derivada) | — (NO se almacena) | — | — | `prop.edad` | **AÑOS** = añoActual − `anio_construccion` |
| Agente | `nombre_agente` | — | — | — | texto |
| URL | `url_original` | — | — | — | string |
| Título | `titulo` | — | — | — | string |
| Descripción | `descripcion` | — | — | — | string |

---

## Criterio UNIFICADO — normalización en el guardado (30-jun-2026)

Todo se normaliza en UN solo punto: `scheduler.py::_guardar_en_mongo` (chokepoint por donde pasa TODO portal).
Así ningún scraper ni automatización puede meter variantes.

1. **`tipo_propiedad` SIEMPRE minúscula canónica** — 6 valores únicos: `casa · departamento · terreno · local · oficina · bodega`.
   Se aplica `normalizar_tipo_propiedad()` del cleaner en el guardado (idempotente). NUNCA capitalizado.
   (NOCNOK metía `"Casa"`/`"Local Comercial"` por fallback al valor crudo del API → causaba queries fallidas. Migrado 30-jun.)
   Al LEER: usar siempre minúscula. `canonTipo()` del motor ya minuscula defensivamente — mantener esa defensa.
2. **`estacionamientos` en residencial (casa/departamento): >10 → `None`.** Una vivienda no tiene >10 cajones propios;
   valores 20-4000 eran el total del EDIFICIO/PLAZA mal capturado por la fuente (CYT/INM24/PINCALI comerciales). Capado en el guardado.
   Rango válido residencial: 1-10. Datos históricos limpiados 30-jun (reversibles: `estac_original_basura`, `tipo_original`).

## Reglas críticas de la EDAD (origen de errores recurrentes)

1. **El campo canónico es `anio_construccion` (SIN ñ).** Guarda el AÑO de construcción (2011), no la edad.
2. **`año_construccion` (CON ñ) está PROHIBIDO** — era un alias legacy 99.96% vacío. Se elimina. NO leer ni escribir ahí.
3. **Edad NO se almacena**: se deriva siempre como `añoActual − anio_construccion` en el punto de uso.
   - El sujeto del avalúo (`prop.edad`) llega ya en años desde el formulario; los COMPS llevan `an` (año) y
     el motor convierte a edad cuando lo necesita (#91 comp-a-comp).
4. **El scraper/enricher convierte la "antigüedad" del portal (N años) → año** = `añoActual − N`, y escribe
   SOLO en `anio_construccion`.
5. **Todo constructor de caché lee `anio_construccion`** (sin ñ) desde Mongo y lo mapea a `an`. La columna 14
   de Sheets (`ano`) es legacy y queda en pausa con Sheets — no es fuente de edad.

---

## Capas físicas (dónde vive cada cosa)

- **Mongo `mercado_props`** (cluster0, prod): almacén primario. Nombres canónicos largos.
- **Sheets CONSOLIDADO**: legacy en pausa. Builders leen por ÍNDICE de columna (ver `actualizar_cache_consolidado.js` `COL`), no por nombre.
- **Caché del motor** (`cache_consolidado.json` / `cache_index.json`, en `Modulo Drive IA`): abreviaciones de esta tabla. El motor relee todo en cada avalúo → por eso son cortas.
- **Motor** (`motor_remi_api.js`): comps con `d.<abrev>`; sujeto con `prop.<campo>`.

## Constructores de caché (lectores) y qué deben leer
- `actualizar_cache_mongo.cjs` — Mongo → caché. Lee `anio_construccion`. ✅ regla correcta.
- `actualizar_cache_desde_mongo.py` — Mongo → caché (variante Python).
- `actualizar_cache_consolidado.js` — Sheets → caché (legacy, col 14).
- `build_cache_index.js` — caché → índice; calcula `edadMedianaZona` (necesita ≥3 comps con `an`).

---

## Cómo verificar cobertura (cualquiera puede correrlo)
Comando: `node verificar_esquema.cjs` (en `Modulo Drive IA`). Imprime, por capa, el % de registros
con cada dato usando los NOMBRES CANÓNICOS. No modifica nada. Si un campo sale 0% donde debería
tener datos → hay un desajuste de nombre, revisar este archivo.

## Estado al 03-Jun-2026 (medido con verificar_esquema.cjs)
- **Esquema UNIFICADO y validado.** Renombre puro de claves (mín→legible): el validador
  (`validar_40_opis.js --n 200 --desde 2025-07`) da IDÉNTICO antes/después: ±10% 69.2% · ±15% 76.6% ·
  ±20% 88.8%. Cero cambio de valor; solo nombres legibles. Backups en `_backups_esquema/`.
- **Edad: cuello de botella real.** `anio` en el caché de precios = 0% (viene de Sheets, que no trae
  año). La edad solo entra por overlay Mongo (`edad_mongo.json`, ~696 props) → `edadMedianaZona` en
  **24/8,693 colonias**. #90 prácticamente inerte hasta subir cobertura de año en Mongo (campo
  `anio_construccion` sin ñ; el campo con ñ está 99.96% vacío = NO usar).
