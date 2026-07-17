"""Gamificación de la verificación de zona: puntos y leaderboard.

Cada propiedad verificada por un perito/asesor en el panel de "verificación de
zona" estampa en mercado_props los campos `edad_estimador` (quién) y `edad_fecha`
(cuándo, ISO 8601 con timezone). Un "punto" = un doc con `edad_estimador` = ese
usuario. Estos endpoints leen ESE mismo rastro (no un contador aparte) para el
récord personal y el "concurso" entre compañeros/inmobiliarias.

Read-only sobre mercado_props (aggregation). No escribe nada."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request

from core.db import db
# Reutiliza EXACTAMENTE el criterio de identificación de edades.py (sesión de
# usuario perito/inmobiliaria O token de admin).
from routers.edades import _quien

router = APIRouter(prefix="/api")

_TZ = ZoneInfo("America/Mexico_City")
META = 150  # objetivo fijo de verificaciones

# Doc con verificación real: tiene estimador y una fecha string no vacía.
_BASE_MATCH = {
    "edad_estimador": {"$nin": [None, ""]},
    "edad_fecha": {"$type": "string", "$ne": ""},
}


def _hoy_mx() -> str:
    """Fecha local de México (YYYY-MM-DD) para comparar con la parte de fecha
    agrupada de edad_fecha (que también se agrupa en America/Mexico_City)."""
    return datetime.now(_TZ).strftime("%Y-%m-%d")


def _inicio_rango(rango: str):
    """Fecha de corte (datetime tz-aware México) para el leaderboard, o None si
    'historico'. mes/trimestre/anio = calendario natural en hora de México."""
    ahora = datetime.now(_TZ)
    if rango == "mes":
        return ahora.replace(month=ahora.month, day=1, hour=0, minute=0, second=0, microsecond=0).replace(day=1)
    if rango == "trimestre":
        q_ini_mes = ((ahora.month - 1) // 3) * 3 + 1   # 1,4,7,10
        return ahora.replace(month=q_ini_mes, day=1, hour=0, minute=0, second=0, microsecond=0)
    if rango == "anio":
        return ahora.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None  # historico


@router.get("/gamificacion/mis-puntos")
async def mis_puntos(request: Request):
    """Puntos del usuario actual: hoy, total histórico, récord de un día,
    historial por día (últimos 30) y progreso hacia la meta (150)."""
    usuario = await _quien(request)

    # Conteo por día local de México sobre TODAS las verificaciones del usuario.
    pipeline = [
        {"$match": {**_BASE_MATCH, "edad_estimador": usuario}},
        {"$group": {
            "_id": {"$dateToString": {
                "format": "%Y-%m-%d",
                "date": {"$toDate": "$edad_fecha"},
                "timezone": "America/Mexico_City",
            }},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    filas = await db.mercado_props.aggregate(pipeline).to_list(None)

    por_dia_map = {f["_id"]: f["count"] for f in filas if f.get("_id")}
    total = sum(por_dia_map.values())

    hoy_key = _hoy_mx()
    hoy = por_dia_map.get(hoy_key, 0)

    record_dia = {"fecha": None, "count": 0}
    if por_dia_map:
        f_max = max(por_dia_map, key=lambda k: por_dia_map[k])
        record_dia = {"fecha": f_max, "count": por_dia_map[f_max]}

    # Últimos 30 días (incluye hoy), rellenando ceros para el historial/gráfica.
    hoy_dt = datetime.now(_TZ).date()
    por_dia = []
    for i in range(29, -1, -1):
        d = (hoy_dt.toordinal() - i)
        fecha = datetime.fromordinal(d).strftime("%Y-%m-%d")
        por_dia.append({"fecha": fecha, "count": por_dia_map.get(fecha, 0)})

    return {
        "usuario": usuario,
        "hoy": hoy,
        "total": total,
        "record_dia": record_dia,
        "por_dia": por_dia,
        "meta": META,
        "progreso_meta": min(total, META),
    }


@router.get("/gamificacion/leaderboard")
async def leaderboard(request: Request, rango: str = "trimestre"):
    """Ranking de estimadores por número de verificaciones en el rango
    (mes|trimestre|anio|historico). Top 50 desc. Default: trimestre."""
    await _quien(request)  # requiere identidad válida (perito/inmobiliaria o admin)
    rango = (rango or "trimestre").strip().lower()
    if rango not in ("mes", "trimestre", "anio", "historico"):
        rango = "trimestre"

    match = dict(_BASE_MATCH)
    corte = _inicio_rango(rango)
    pipeline = [{"$match": match}]
    if corte is not None:
        # Comparar la fecha real (parseada) contra el corte tz-aware.
        pipeline.append({"$match": {"$expr": {
            "$gte": [{"$toDate": "$edad_fecha"}, corte]}}})
    pipeline += [
        {"$group": {"_id": "$edad_estimador", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$limit": 50},
    ]
    filas = await db.mercado_props.aggregate(pipeline).to_list(50)
    ranking = [{"estimador": f["_id"], "count": f["count"]} for f in filas if f.get("_id")]
    return {"rango": rango, "ranking": ranking, "total_estimadores": len(ranking)}
