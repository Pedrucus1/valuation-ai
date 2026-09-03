# Archivo — scripts superados de colonias_similares

Movidos aquí el 2026-09-03: eran iteraciones viejas del pipeline de "colonias similares"
(pre-`generar_similares_sepomex.js`), sin lista de municipios genérica y/o dependientes de
Gemini/Sheets ya descontinuados. Nadie los había archivado formalmente — por eso costaba saber
cuál usar (8 candidatos en el directorio raíz).

**Pipeline canónico vigente** (no tocado, sigue en `Modulo Drive IA/`):
1. `generar_similares_sepomex.js` — genera `colonias_similares_enriquecido.json` desde
   `cache_index.json` (genérico, cualquier municipio nuevo que tenga datos entra solo).
2. `construir_maestro.js` — fusiona las 6 fuentes (nse v1/v2, idx, similares, perito) en
   `colonias_maestro.json`, el único archivo que lee el motor en producción.
3. `merge_simIA_a_maestro.js` — alternativa ADITIVA a (2) cuando se quiere sumar similares
   nuevos sin arriesgar perder ediciones manuales hechas directo sobre `colonias_maestro.json`
   (el rebuild completo de `construir_maestro.js` puede perder ese tipo de edición — medido
   una vez: -647 colonias con similares). Usar esta cuando aplique.
4. `resolver_similares_municipios.js` — resuelve el municipio de similares que SEPOMEX marca
   ambiguos (mismo nombre de colonia en varios municipios). Sigue vigente, no se tocó.

No se borró nada — si algún script archivado hace falta, sigue aquí.
