"""
mongo_comparables.py — Búsqueda de comparables reales desde mercado_props (MongoDB).

Criterio de selección:
  1. Mismo municipio + tipo + operación
  2. m2_construccion en rango ±40% (o ±60% si hay pocos resultados)
  3. precio > 0
  4. Ordenados por score de similitud (m2 y precio más cercanos primero)
  5. Si hay pocos, amplía a municipios vecinos
"""
import logging
from typing import Optional

log = logging.getLogger(__name__)

MUNICIPIOS_VECINOS = {
    "Guadalajara":          ["Zapopan", "Tlaquepaque", "Tonalá"],
    "Zapopan":              ["Guadalajara", "Tlaquepaque", "Tlajomulco de Zúñiga"],
    "Tlaquepaque":          ["Guadalajara", "Zapopan", "Tonalá"],
    "Tonalá":               ["Guadalajara", "Tlaquepaque"],
    "Tlajomulco de Zúñiga": ["Zapopan", "Guadalajara"],
    "Chapala":              ["Ajijic"],
    "Ajijic":               ["Chapala"],
}

TIPO_ALIAS = {
    "casa": "Casa", "casas": "Casa", "house": "Casa", "houses": "Casa",
    "habitacional unifamiliar": "Casa",
    "departamento": "Departamento", "departamentos": "Departamento",
    "apartment": "Departamento", "apartments": "Departamento",
    "terreno": "Terreno", "terrenos": "Terreno", "land": "Terreno",
    "solo terreno": "Terreno",
    "local": "Local", "local comercial": "Local", "locales-comerciales": "Local",
    "comercial": "Local",
    "oficina": "Oficina", "oficinas": "Oficina", "office": "Oficina",
    "bodega": "Bodega", "nave industrial": "Bodega",
}

CAMPOS_COMPARABLE = {
    "_id": 0,
    "id_unico": 1, "titulo": 1, "tipo_propiedad": 1, "tipo_operacion": 1,
    "municipio": 1, "colonia": 1, "estado": 1,
    "precio": 1, "moneda": 1, "precio_m2": 1,
    "m2_construccion": 1, "m2_terreno": 1,
    "recamaras": 1, "banos": 1, "estacionamientos": 1,
    "año_construccion": 1, "portal_origen": 1, "url_original": 1,
}


def _similarity_score(candidate: dict, m2_ref: float, precio_ref: Optional[float]) -> float:
    """Score 0-1: más alto = más similar. Usa distancia normalizada de m2 y precio."""
    score = 1.0
    m2 = candidate.get("m2_construccion")
    if m2 and m2_ref:
        diff_m2 = abs(m2 - m2_ref) / m2_ref
        score -= min(diff_m2, 0.5) * 0.6  # m2 pesa 60%
    if precio_ref:
        precio = candidate.get("precio")
        if precio and precio > 0:
            diff_p = abs(precio - precio_ref) / precio_ref
            score -= min(diff_p, 0.5) * 0.4  # precio pesa 40%
    return max(score, 0.0)


async def search_comparables_from_mongo(
    db,
    municipio: str,
    tipo_propiedad: str,
    tipo_operacion: str,
    m2_construccion: Optional[float] = None,
    precio_referencia: Optional[float] = None,
    max_results: int = 50,
) -> list[dict]:
    """
    Retorna candidatos reales de mercado_props ordenados por similitud.
    Amplía a municipios vecinos o relaja filtro m2 si hay pocos resultados.
    """
    col = db["mercado_props"]
    tipo_norm = TIPO_ALIAS.get(tipo_propiedad.lower().strip(), tipo_propiedad)
    op_norm   = "venta" if "venta" in tipo_operacion.lower() else "renta"

    base_q = {
        "tipo_propiedad": tipo_norm,
        "tipo_operacion": op_norm,
        "precio":         {"$gt": 0},
    }

    async def _query(municipios: list, m2_range: float) -> list[dict]:
        q = {**base_q, "municipio": {"$in": municipios}}
        if m2_construccion and m2_construccion > 0:
            q["m2_construccion"] = {
                "$gte": m2_construccion * (1 - m2_range),
                "$lte": m2_construccion * (1 + m2_range),
                "$ne":  None,
            }
        cursor = col.find(q, CAMPOS_COMPARABLE).limit(max_results * 2)
        return await cursor.to_list(length=max_results * 2)

    # Intento 1: municipio exacto ±40% m2
    results = await _query([municipio], 0.40)

    # Intento 2: ampliar a vecinos si hay pocos
    if len(results) < 10:
        vecinos = MUNICIPIOS_VECINOS.get(municipio, [])
        if vecinos:
            results = await _query([municipio] + vecinos, 0.40)

    # Intento 3: relajar m2 a ±60%
    if len(results) < 5 and m2_construccion:
        vecinos = MUNICIPIOS_VECINOS.get(municipio, [])
        results = await _query([municipio] + vecinos, 0.60)

    # Intento 4: sin filtro m2 (último recurso)
    if len(results) < 3:
        q = {**base_q, "municipio": municipio}
        cursor = col.find(q, CAMPOS_COMPARABLE).limit(max_results)
        results = await cursor.to_list(length=max_results)

    # Ordenar por similitud y recortar
    if m2_construccion:
        results.sort(
            key=lambda c: _similarity_score(c, m2_construccion, precio_referencia),
            reverse=True,
        )

    results = results[:max_results]
    log.info(
        f"mercado_props: {len(results)} candidatos | "
        f"{municipio} / {tipo_norm} / {op_norm} / m2≈{m2_construccion}"
    )
    return results
