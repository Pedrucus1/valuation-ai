"""
mongo_comparables.py — Búsqueda de comparables reales desde mercado_props (MongoDB).

Criterio de selección:
  1. Colonia exacta del sujeto + tipo + operación
  2. Si hay pocos, amplía a COLONIAS VECINAS REALES (geográficas, vía proximidad.py —
     centroides SEPOMEX/CP, no todo el municipio). Nunca mezcla con zonas lejanas
     aunque compartan municipio (bug reportado: Ixtepete traía comps de El Fortín a
     8km, Tesistán, etc. — verificado con Modulo Drive IA/_geo/proximidad.py).
  3. m2_construccion en rango ±40% (o ±60% si hay pocos resultados)
  4. precio > 0
  5. Ordenados por score de similitud (m2 y precio más cercanos primero)
"""
import logging
import sys
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

# proximidad.py vive en el módulo del motor (Node), no en backend/ — se importa por path.
_GEO_DIR = Path(__file__).parent.parent / "Modulo Drive IA" / "_geo"
if str(_GEO_DIR) not in sys.path:
    sys.path.insert(0, str(_GEO_DIR))
try:
    from proximidad import colonias_cercanas  # type: ignore
except Exception as _e:  # dataset no disponible → degradación sin romper el reporte
    log.warning(f"proximidad.py no disponible ({_e}); sin expansión a colonias vecinas")
    colonias_cercanas = None

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
    "rancho": "Rancho", "ranchos": "Rancho", "quinta": "Rancho", "hacienda": "Rancho",
}

CAMPOS_COMPARABLE = {
    "_id": 0,
    "id_unico": 1, "titulo": 1, "tipo_propiedad": 1, "tipo_operacion": 1,
    "municipio": 1, "colonia": 1, "estado": 1,
    "precio": 1, "moneda": 1, "precio_m2": 1,
    "m2_construccion": 1, "m2_terreno": 1,
    "recamaras": 1, "banos": 1, "estacionamientos": 1,
    "anio_construccion": 1, "portal_origen": 1, "url_original": 1, "calle_numero": 1,
    # Dedup cross-portal: el maestro trae en qué portales se anuncia (links del
    # reporte) y n_portales (corroboración para el score de confiabilidad).
    "n_portales": 1, "anuncios": 1, "fecha_publicacion": 1, "fecha_scraping": 1,
}


def _col_eq(a, b) -> bool:
    """Colonias 'iguales' de forma tolerante (mayúsculas, espacios, truncamientos del scraper)."""
    a = str(a or "").strip().lower()
    b = str(b or "").strip().lower()
    return bool(a) and bool(b) and (a in b or b in a)


def _ppm(c: dict) -> Optional[float]:
    p = c.get("precio")
    a = c.get("m2_construccion")
    return p / a if (p and a and a > 0) else None


def _similarity_score(candidate: dict, m2_ref: float, precio_ref: Optional[float],
                      colonia_ref: Optional[str] = None) -> float:
    """Score: más alto = más similar. Distancia normalizada de m2 y precio,
    con preferencia por misma colonia que el sujeto (proximidad, como el motor)."""
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
    # Misma colonia que el sujeto: sube al tope para no mezclar zonas dispares
    # (ej. un depto chico en Country Club vs uno en Ixtepete).
    if colonia_ref and _col_eq(candidate.get("colonia"), colonia_ref):
        score += 0.3
    return max(min(score, 1.3), 0.0)


async def _query_colonias(col, base_q: dict, nombres: list, m2_construccion, m2_range: float,
                           max_results: int) -> list[dict]:
    """Busca comps cuya colonia contenga alguno de los `nombres` (case-insensitive)."""
    import re as _re
    if not nombres:
        return []
    # Match EXACTO (anclado, case-insensitive) — no substring: nombres cortos genéricos
    # como "Del Sur" son substring de "Lomas del Sur" (otro municipio, a km reales de
    # distancia) y colaban comps de zonas lejanas por coincidencia de texto.
    q = {**base_q, "colonia": {"$in": [_re.compile(f"^{_re.escape(n)}$", _re.I) for n in nombres]}}
    if m2_construccion and m2_construccion > 0:
        q["m2_construccion"] = {
            "$gte": m2_construccion * (1 - m2_range),
            "$lte": m2_construccion * (1 + m2_range),
            "$ne":  None,
        }
    cursor = col.find(q, CAMPOS_COMPARABLE).limit(max_results * 2)
    return await cursor.to_list(length=max_results * 2)


async def search_comparables_from_mongo(
    db,
    municipio: str,
    tipo_propiedad: str,
    tipo_operacion: str,
    m2_construccion: Optional[float] = None,
    precio_referencia: Optional[float] = None,
    max_results: int = 50,
    colonia: Optional[str] = None,
) -> list[dict]:
    """
    Retorna candidatos reales de mercado_props: colonia exacta del sujeto primero,
    y solo si faltan, colonias VECINAS GEOGRÁFICAS reales (proximidad.py, centroides
    SEPOMEX/CP). NUNCA se rellena con "todo el municipio" — eso mezclaba zonas a 8+ km
    de distancia con precios similares por casualidad (bug reportado en Villas del
    Ixtepete: traía comps de El Fortín/Tesistán, colonias que no son vecinas reales).
    """
    col = db["mercado_props"]
    # mercado_props guarda tipo en MINÚSCULA ("casa","departamento"...) y municipio a veces
    # con espacios. Sin normalizar, "Casa"/"Zapopan " => 0 resultados y la OPI caía a datos
    # SIMULADOS (bug histórico "inerte por casing"). Normalizamos para que el filtro empate.
    tipo_norm = TIPO_ALIAS.get(tipo_propiedad.lower().strip(), tipo_propiedad).lower().strip()
    municipio = (municipio or "").strip()
    op_norm   = "venta" if "venta" in tipo_operacion.lower() else "renta"

    base_q = {
        "tipo_propiedad": tipo_norm,
        "tipo_operacion": op_norm,
        "precio":         {"$gt": 0},
        # Dedup cross-portal: excluir secundarios para no contar la misma
        # propiedad 2-3 veces en la mediana $/m² (el maestro la representa).
        "es_duplicado_secundario": {"$ne": True},
        # NO filtrar `duplicado`/`es_remate` aquí: PROBADO 13-jul en el caché del motor =
        # NEGATIVO (encoge el pool, empeora ±10/±15). Los comps extra ayudan la mediana.
    }

    import re as _re

    # ── 1. Colonia exacta del sujeto ──
    colonia_comps = []
    if colonia:
        toks = [t for t in str(colonia).split() if len(t) >= 4]
        token = max(toks, key=len) if toks else ""
        if token:
            # municipio case-insensitive: property_data llega a veces en MAYÚSCULAS
            # (frontend), mercado_props lo guarda en Title Case → un match exacto
            # daba 0 resultados y tiraba directo al fallback de vecinas (bug real
            # 07-ago: "ZAPOPAN" vs "Zapopan" en La Calma, comps de zona equivocada).
            cq = {**base_q, "municipio": {"$regex": f"^{_re.escape(municipio)}$", "$options": "i"},
                  "colonia": {"$regex": _re.escape(token), "$options": "i"}}
            colonia_comps = await col.find(cq, CAMPOS_COMPARABLE).limit(max_results).to_list(length=max_results)
    for c in colonia_comps:
        c["_zona_tag"] = "Zona exacta"

    # ── 2. Colonias vecinas REALES (geografía, no "mismo municipio") ──
    vecina_comps = []
    if colonia and colonias_cercanas is not None and len(colonia_comps) < 8:
        vistos_ids = {c.get("id_unico") for c in colonia_comps if c.get("id_unico")}
        for km_max in (2.5, 5.0):
            cercanas = colonias_cercanas(colonia, municipio, km_max=km_max)
            if not cercanas:
                continue
            dist_by_nombre = {c["colonia"]: c["distancia_km"] for c in cercanas}
            candidatos = await _query_colonias(
                col, base_q, list(dist_by_nombre.keys()), m2_construccion, 0.40, max_results
            )
            for c in candidatos:
                uid = c.get("id_unico")
                if uid and uid in vistos_ids:
                    continue
                if uid:
                    vistos_ids.add(uid)
                col_norm = str(c.get("colonia", "")).strip().lower()
                dist = dist_by_nombre.get(col_norm)
                c["_zona_tag"] = f"Vecina ({dist:.1f} km)" if dist is not None else "Vecina"
                vecina_comps.append(c)
            if len(colonia_comps) + len(vecina_comps) >= 8:
                break

    results = colonia_comps + vecina_comps

    # Sanity check: descarta outliers de precio/m² claramente rotos (dato mal capturado),
    # NO para restringir zona (eso ya lo hizo la geografía arriba).
    ref_ppm = None
    if precio_referencia and m2_construccion and m2_construccion > 0:
        ref_ppm = precio_referencia / m2_construccion
    else:
        zona_ppm = sorted(x for x in (_ppm(c) for c in colonia_comps) if x)
        if zona_ppm:
            ref_ppm = zona_ppm[len(zona_ppm) // 2]
    if ref_ppm:
        sane = [c for c in results if not _ppm(c) or ref_ppm * 0.35 <= _ppm(c) <= ref_ppm * 2.5]
        if len(sane) >= 3:
            results = sane

    # Ordenar por similitud y recortar
    if m2_construccion:
        results.sort(
            key=lambda c: _similarity_score(c, m2_construccion, precio_referencia, colonia),
            reverse=True,
        )

    results = results[:max_results]
    log.info(
        f"mercado_props: {len(results)} candidatos ({len(colonia_comps)} zona exacta, "
        f"{len(vecina_comps)} vecinas) | {municipio}/{colonia} / {tipo_norm} / {op_norm}"
    )
    return results
