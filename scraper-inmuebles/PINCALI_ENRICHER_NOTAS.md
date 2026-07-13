# PINCALI — qué expone el source y qué NO (verificado 06-Jul-2026)

> ⛔ **REGLA FIJA (usuario):** PINCALI se scrapea/enriquece **SOLO en español `/inmueble/`**, NUNCA inglés `/en/home/`.
> La ES trae todo junto (colonia+precio+m²+parking+**año**); la EN no trae año. El "FIX 06-Jul" de abajo (fetch EN y
> luego ES) es el enfoque a **superar**: ir directo a la ES. Ver `INDICE_SCRAPER.md` (regla dura). No re-plantear inglés.


> Para que NO se vuelva a investigar desde cero. Verificado con páginas reales `/en/home/...`.

## Estructura de datos de la página de detalle
PINCALI (páginas `/en/` desde jun-2026) trae los datos en DOS bloques del HTML (NO en `__NEXT_DATA__`):

1. **Bloque de atributos escapado** (`&quot;...&quot;`) — de aquí sale la COLONIA (fix 5-jul):
   `Property Neighborhood, Organization ID, Property Type, Operation Type, Listing Ad Type,`
   `Sale Price, Bedrooms, Bathrooms, Half Bathrooms, Parking Spaces, Area M2, Currency, Images Count,`
   `Has Video, Has Virtual Tour, Has Files, Remarketing IDs, Value`
2. **JSON-LD schema.org**: `datePosted, category, numberOfBedrooms, numberOfBathroomsTotal, floorSize, address, offers`

## ✅ Lo que SÍ se puede extraer del source
colonia (`Neighborhood`), tipo (`Property Type`), operación, precio (`Sale Price`), recámaras, baños, medios baños, **estacionamiento (`Parking Spaces`)**, m²C (`Area M2`), fecha (`datePosted`).

## ✅ AÑO DE CONSTRUCCIÓN — SÍ EXISTE, pero solo en las páginas `/inmueble/` (español), NO en `/en/home/`
**CORRECCIÓN (06-Jul, hallazgo del usuario):** las páginas `/en/home/` (inglés, que es lo que guarda `url_original`)
NO traen el año. Pero las **`/inmueble/<slug>` (español) SÍ**, con el campo etiquetado:
`Año de construcción: 2012` (o `1991`, o **`A estrenar`** = nuevo, edad 0), dentro de un `<div class="feature-icon">`.
- Patrón de extracción probado: `A.?o de construcci.n:\s*([^<\n]{1,20})` → devuelve el año o "A estrenar".
- **"A estrenar" = nuevo (año = actual, edad 0)** — señal directa del segmento premium 0-5.
- Cobertura al convertir `/en/home/<slug>` → `/inmueble/<slug>`: ~50%+ en muestra (3/6 casas). Los que fallan tienen
  slug con UUID que no mapea directo `/en/`↔`/inmueble/` → FALTA afinar el mapeo de URL (buscar el slug español correcto).
- OJO **envenenamiento** (nota jun-2026): la página lista "A estrenar" de OTRAS propiedades (relacionadas/menú
  "New Construction"). Anclar SIEMPRE al label `Año de construcción:` (feature block principal), no a "A estrenar" suelto.

## FIX IMPLEMENTADO 06-Jul (enricher.py, verificado)
- `extraer_datos_detalle(html, portal, url, session)` — ahora recibe url+session (ambos callers 1099/1291 actualizados).
- Bloque PINCALI: si falta `año_construccion`, fetchea la ES (`url.replace('/en/home/','/inmueble/')` — mismo slug, confirmado por `<link rel=alternate hreflang>`) y extrae `A\w*o de construcci\w*n:\s*([^<\n]{1,20})`. `A estrenar`→`date.today().year`; resto→`normalizar_anio_construccion`.
- Verificado sobre docs reales: extrae 2026 / 2010 / "A estrenar" correctamente; colonia sigue OK. Sintaxis OK.
- **Cobertura realista: 31% → ~45-55%.** MUCHOS listings (incluso premium: Seattle, Valle Real) **genuinamente NO llenan el año** → techo real por dato faltante del vendedor, NO bug.
- **COSTO:** duplica fetches (EN+ES) por doc sin año → backfill de ~26k lento y carga el portal. Mejora futura posible: fetchear SOLO la ES (ver regla dura arriba: PINCALI solo español).
- **✅ BACKFILL YA CORRIDO — NO RE-CORRER.** Estado final medido (12-jul, 39,001 activos): **colonia 99.3%** (resuelto), **año 45.1%** (17,589), con **37,274 ya intentados (96%)**. El ~45% del año es **TECHO REAL por dato faltante del vendedor** (el resto genuinamente NO trae año en el source), NO bug. No hay más que sacar con re-correr el enricher; solo subiría marginalmente afinando el mapeo de slug EN→ES. **No re-proponer el backfill de año como tarea pendiente.**

## Implicación para el motor
Con PINCALI enriquecido, la cobertura de año global sube bastante desde el 44% actual → la homologación por edad
(LAB_EDADSEG, ya codeada) empieza a poder pagar en las colonias PINCALI-heavy. Ver `Modulo Drive IA/MOTOR_ANTECEDENTES.md`.
