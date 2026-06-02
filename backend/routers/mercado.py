"""Mercado público: estadísticas, mapa, colonias y segmentos (desde mercado_props)."""
import re as _re

from fastapi import APIRouter, Request

from core.db import db
from core.cache import _cache_get, _cache_set

router = APIRouter(prefix="/api")

@router.get("/mercado/stats")
async def mercado_stats(request: Request, tipo_op: str = "venta"):
    """
    Estadísticas de mercado derivadas de mercado_props (importado del scraper).
    tipo_op: "venta" | "renta"
    """
    cached = _cache_get(f"stats_{tipo_op}")
    if cached:
        return cached

    col = db["mercado_props"]
    total = await col.count_documents({"activo": True, "tipo_operacion": tipo_op})
    if total == 0:
        return {"disponible": False, "total": 0}

    filtro = {"activo": True, "tipo_operacion": tipo_op, "precio": {"$gt": 0}}

    # Por municipio
    por_municipio = await col.aggregate([
        {"$match": filtro},
        {"$group": {
            "_id": "$municipio",
            "total": {"$sum": 1},
            "precio_avg": {"$avg": "$precio"},
            "precio_m2_avg": {"$avg": "$precio_m2"},
            "m2_avg": {"$avg": "$m2_construccion"},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10},
    ]).to_list(10)

    # Por tipo de propiedad
    por_tipo = await col.aggregate([
        {"$match": {"activo": True, "tipo_operacion": tipo_op}},
        {"$group": {"_id": "$tipo_propiedad", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": 8},
    ]).to_list(8)

    # Precio/m2 promedio por municipio (top 5)
    precio_m2 = await col.aggregate([
        {"$match": {**filtro, "precio_m2": {"$gt": 0, "$lt": 200000}}},
        {"$group": {
            "_id": "$municipio",
            "precio_m2_avg": {"$avg": "$precio_m2"},
            "total": {"$sum": 1},
        }},
        {"$match": {"total": {"$gte": 10}}},
        {"$sort": {"precio_m2_avg": -1}},
        {"$limit": 6},
    ]).to_list(6)

    # Tendencia por portal (volumen)
    por_portal = await col.aggregate([
        {"$match": {"activo": True}},
        {"$group": {"_id": "$portal_origen", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]).to_list(10)

    # Recámaras más comunes
    por_recamaras = await col.aggregate([
        {"$match": {"activo": True, "tipo_operacion": tipo_op, "recamaras": {"$gt": 0}}},
        {"$group": {"_id": "$recamaras", "total": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 6},
    ]).to_list(6)

    # Tipos por zona (para gráfica apilada municipio × tipo)
    tipos_por_zona_raw = await col.aggregate([
        {"$match": {"activo": True, "tipo_operacion": tipo_op}},
        {"$group": {
            "_id": {"municipio": "$municipio", "tipo": "$tipo_propiedad"},
            "total": {"$sum": 1},
        }},
        {"$sort": {"total": -1}},
    ]).to_list(200)

    # Pivotear: [{municipio, Casa, Departamento, ...}]
    tipos_pivot: Dict[str, Any] = {}
    for r in tipos_por_zona_raw:
        mun = r["_id"]["municipio"] or "Otro"
        tipo = r["_id"]["tipo"] or "Otro"
        if mun not in tipos_pivot:
            tipos_pivot[mun] = {"municipio": mun}
        tipos_pivot[mun][tipo] = r["total"]
    tipos_por_zona = sorted(tipos_pivot.values(), key=lambda x: sum(v for k, v in x.items() if k != "municipio"), reverse=True)[:8]

    def clean(lst):
        return [{"name": r["_id"] or "Otro", **{k: round(v, 2) if isinstance(v, float) else v
                 for k, v in r.items() if k != "_id"}} for r in lst if r.get("_id")]

    result = {
        "disponible": True,
        "total": total,
        "tipo_op": tipo_op,
        "por_municipio": clean(por_municipio),
        "por_tipo": clean(por_tipo),
        "precio_m2_por_zona": clean(precio_m2),
        "por_portal": clean(por_portal),
        "por_recamaras": [{"recamaras": int(r["_id"]), "total": r["total"]} for r in por_recamaras],
        "tipos_por_zona": tipos_por_zona,
    }
    _cache_set(f"stats_{tipo_op}", result)
    return result

@router.get("/mercado/mapa")
async def mercado_mapa(tipo_op: str = "venta", tipo_prop: str = ""):
    """
    Puntos de propiedades por colonia (geocodificadas). Cae en municipios si no hay geo.
    tipo_prop: filtro opcional (Casa, Departamento, Terreno, Local, Bodega, Oficina)
    """
    col_props = db["mercado_props"]
    col_geo   = db["mercado_geo"]

    filtro: Dict[str, Any] = {"activo": True, "tipo_operacion": tipo_op}
    if tipo_prop:
        filtro["tipo_propiedad"] = tipo_prop

    # 1. Contar por colonia + tipo para determinar tipo dominante
    pipeline = [
        {"$match": filtro},
        {"$group": {
            "_id": {"colonia": {"$toLower": "$colonia"}, "tipo": "$tipo_propiedad"},
            "municipio": {"$first": "$municipio"},
            "subtotal": {"$sum": 1},
            "precio_avg": {"$avg": "$precio"},
            "precio_m2_avg": {"$avg": "$precio_m2"},
        }},
        {"$sort": {"subtotal": -1}},
        {"$group": {
            "_id": "$_id.colonia",
            "municipio": {"$first": "$municipio"},
            "tipo_prop": {"$first": "$_id.tipo"},   # primer grupo = tipo dominante
            "total": {"$sum": "$subtotal"},
            "precio_avg": {"$avg": "$precio_avg"},
            "precio_m2_avg": {"$avg": "$precio_m2_avg"},
        }},
        {"$match": {"_id": {"$ne": None}, "total": {"$gte": 2}}},
        {"$sort": {"total": -1}},
        {"$limit": 800},
    ]
    filas = await col_props.aggregate(pipeline).to_list(800)

    # 2. Cargar coordenadas de mercado_geo
    colonias_ids = [r["_id"] for r in filas if r["_id"]]
    geo_docs = await col_geo.find(
        {"colonia_key": {"$in": colonias_ids}, "lat": {"$ne": None}},
        {"colonia_key": 1, "lat": 1, "lng": 1}
    ).to_list(800)
    geo_map = {d["colonia_key"]: (d["lat"], d["lng"]) for d in geo_docs}

    # 3. Fallback centroides por municipio
    CENTROIDES = {
        "Guadalajara":          (20.6597, -103.3496),
        "Zapopan":              (20.7214, -103.4016),
        "Tlaquepaque":          (20.6398, -103.3121),
        "Tonalá":               (20.6244, -103.2349),
        "Tlajomulco De Zúñiga": (20.4742, -103.4445),
        "Chapala":              (20.2944, -103.1946),
        "Ajijic":               (20.2986, -103.2833),
    }

    puntos = []
    for r in filas:
        colonia_key = r["_id"]
        mun = r["municipio"] or "Otro"
        if colonia_key and colonia_key in geo_map:
            lat, lng = geo_map[colonia_key]
        elif mun in CENTROIDES:
            lat, lng = CENTROIDES[mun]
        else:
            continue  # sin coordenadas, omitir

        puntos.append({
            "colonia": colonia_key,
            "municipio": mun,
            "tipo_prop": r.get("tipo_prop") or "Otro",
            "lat": lat,
            "lng": lng,
            "total": r["total"],
            "precio_avg": round(r["precio_avg"]) if r.get("precio_avg") else None,
            "precio_m2_avg": round(r["precio_m2_avg"]) if r.get("precio_m2_avg") else None,
        })

    return {"puntos": puntos, "total": len(puntos)}


@router.get("/mercado/colonias")
async def mercado_colonias(tipo_op: str = "venta", mes: str = ""):
    """
    Tabla de colonias con desglose por tipo de propiedad.
    Si se pasa mes (ej. '2026-04') y existe snapshot, devuelve datos del snapshot.
    """
    cache_key = f"colonias_{tipo_op}_{mes}" if mes else f"colonias_{tipo_op}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    # Si se pide un mes específico y hay snapshot, devolver resumen del snapshot
    if mes:
        snap = await db["mercado_snapshots"].find_one({"mes": mes})
        if snap and snap.get("resumen", {}).get(tipo_op):
            result = {"colonias": [], "total": 0, "tipos": [], "snapshot": True, "mes": mes,
                      "resumen": snap["resumen"][tipo_op]}
            _cache_set(cache_key, result)
            return result

    col = db["mercado_props"]
    TIPOS = ["Casa", "Departamento", "Terreno", "Local", "Bodega", "Oficina"]

    pipeline = [
        {"$match": {"activo": True, "tipo_operacion": tipo_op, "precio": {"$gt": 0}}},
        {"$group": {
            "_id": {"colonia": {"$toLower": "$colonia"}, "tipo": "$tipo_propiedad"},
            "municipio": {"$first": "$municipio"},
            "subtotal": {"$sum": 1},
            "precio_avg": {"$avg": "$precio"},
            # precio_m2: solo promedia donde precio_m2 > 0 y < 200000
            "precio_m2_sum": {"$sum": {"$cond": [
                {"$and": [{"$gt": ["$precio_m2", 0]}, {"$lt": ["$precio_m2", 200000]}]},
                "$precio_m2", 0
            ]}},
            "precio_m2_cnt": {"$sum": {"$cond": [
                {"$and": [{"$gt": ["$precio_m2", 0]}, {"$lt": ["$precio_m2", 200000]}]},
                1, 0
            ]}},
        }},
        {"$group": {
            "_id": "$_id.colonia",
            "municipio": {"$first": "$municipio"},
            "total": {"$sum": "$subtotal"},
            # Preservar precio_avg y precio_m2 por tipo para análisis granular
            "tipos": {"$push": {
                "tipo": "$_id.tipo",
                "count": "$subtotal",
                "precio_avg": "$precio_avg",
                "precio_m2_sum": "$precio_m2_sum",
                "precio_m2_cnt": "$precio_m2_cnt",
            }},
        }},
        {"$match": {"total": {"$gte": 3}}},
        {"$sort": {"total": -1}},
        {"$limit": 300},
    ]
    rows = await col.aggregate(pipeline).to_list(300)
    grand_total = sum(r["total"] for r in rows) or 1

    colonias = []
    for r in rows:
        # Limpiar nombre de colonia: quitar ", Municipio" si viene concatenado
        nombre_col = (r["_id"] or "—").split(",")[0].strip()

        # Construir mapa por tipo con count + precio_avg + precio_m2_avg
        tipos_data: Dict[str, Any] = {}
        for t in r.get("tipos", []):
            tipo = t.get("tipo")
            if not tipo:
                continue
            pm2_cnt = t.get("precio_m2_cnt") or 0
            pm2_avg = round(t["precio_m2_sum"] / pm2_cnt) if pm2_cnt > 0 else None
            precio_a = round(t["precio_avg"]) if t.get("precio_avg") else None
            tipos_data[tipo] = {"count": t["count"], "precio_avg": precio_a, "precio_m2_avg": pm2_avg}

        # Precio avg global ponderado (para filtros y segmento, no se muestra como columna)
        precio_sum = sum((d.get("precio_avg") or 0) * d.get("count", 0) for d in tipos_data.values())
        count_sum = sum(d.get("count", 0) for d in tipos_data.values() if d.get("precio_avg"))
        precio_avg_global = round(precio_sum / count_sum) if count_sum > 0 else None

        # Campos planos de count + precio_avg y precio_m2_avg por tipo
        flat: Dict[str, Any] = {}
        for tipo in TIPOS:
            d = tipos_data.get(tipo, {})
            flat[tipo] = d.get("count", 0)
            flat[f"{tipo}_pm2"] = d.get("precio_m2_avg")
            flat[f"{tipo}_pavg"] = d.get("precio_avg")

        mun_raw = r["municipio"] or "—"
        # Abreviar "Tlajomulco de Zuñiga" → "Tlajomulco"
        mun_clean = _re.sub(r'\s+de\s+Zú?[ñn]iga', '', mun_raw, flags=_re.IGNORECASE).strip() or mun_raw

        colonias.append({
            "colonia": nombre_col,
            "municipio": mun_clean,
            "total": r["total"],
            "pct": round(r["total"] / grand_total * 100, 1),
            "precio_avg": precio_avg_global,   # para segmento/filtros
            **flat,
        })

    result = {"colonias": colonias, "total": len(colonias), "tipos": TIPOS}
    _cache_set(cache_key, result)
    return result


@router.get("/mercado/segmentos")
async def mercado_segmentos(tipo_op: str = "venta", tipo_prop: str = "Casa"):
    """
    Distribución por segmento de precio (Bajo/Medio/Alto) por municipio.
    """
    cached = _cache_get(f"segmentos_{tipo_op}_{tipo_prop}")
    if cached:
        return cached

    col = db["mercado_props"]
    SEGMENTOS = [
        {"label": "Bajo",       "min": 0,          "max": 1_500_000},
        {"label": "Medio-bajo", "min": 1_500_000,  "max": 3_000_000},
        {"label": "Medio",      "min": 3_000_000,  "max": 6_000_000},
        {"label": "Medio-alto", "min": 6_000_000,  "max": 12_000_000},
        {"label": "Alto",       "min": 12_000_000, "max": 999_999_999},
    ]

    filtro_base: Dict[str, Any] = {
        "activo": True, "tipo_operacion": tipo_op,
        "tipo_propiedad": tipo_prop, "precio": {"$gt": 0},
    }
    if tipo_op == "renta":
        SEGMENTOS = [
            {"label": "Bajo",       "min": 0,       "max": 8_000},
            {"label": "Medio-bajo", "min": 8_000,   "max": 15_000},
            {"label": "Medio",      "min": 15_000,  "max": 30_000},
            {"label": "Medio-alto", "min": 30_000,  "max": 60_000},
            {"label": "Alto",       "min": 60_000,  "max": 999_999_999},
        ]

    municipios_pipeline = [
        {"$match": filtro_base},
        {"$group": {"_id": "$municipio", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}}, {"$limit": 7},
    ]
    municipios = [r["_id"] for r in await col.aggregate(municipios_pipeline).to_list(7) if r["_id"]]

    resultado = []
    for mun in municipios:
        row: Dict[str, Any] = {"municipio": mun.split(" ")[0]}  # abreviado para chart
        for seg in SEGMENTOS:
            count = await col.count_documents({
                **filtro_base, "municipio": mun,
                "precio": {"$gte": seg["min"], "$lt": seg["max"]},
            })
            row[seg["label"]] = count
        resultado.append(row)

    result = {"segmentos": resultado, "labels": [s["label"] for s in SEGMENTOS]}
    _cache_set(f"segmentos_{tipo_op}_{tipo_prop}", result)
    return result
