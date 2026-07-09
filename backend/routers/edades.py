"""Edad crowdsource (v1 interna): peritos/inmobiliarias estiman la edad de
propiedades sin año → se escribe al pool mercado_props para permear valores de
zona. Dos vertientes usan estos endpoints: la celda Edad del avalúo y el panel
"Edades por zona". Ver plan streamed-exploring-patterson.md."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_auth
from mongo_comparables import TIPO_ALIAS

router = APIRouter(prefix="/api")

# Rangos finos (Ross-Heidecke: la depreciación es sensible temprano) → punto medio (años).
# El año se guarda como año_actual - midpoint.
RANGO_MIDPOINT = {
    "nuevo": 0, "1-5": 3, "6-10": 8, "11-15": 13, "16-20": 18, "21-25": 23,
    "26-30": 28, "31-35": 33, "36-40": 38, "41-45": 43, "46-50": 48, "50+": 55,
}

CAMPOS_SIN_EDAD = {
    "_id": 0, "id_unico": 1, "colonia": 1, "calle_numero": 1,
    "tipo_propiedad": 1, "precio": 1, "m2_construccion": 1, "url_original": 1,
}


@router.get("/comps-sin-edad")
async def comps_sin_edad(
    request: Request,
    municipio: str = "",
    colonia: str = "",
    tipo: str = "",
    limit: int = 30,
):
    """Lote de propiedades de mercado_props sin año, para etiquetar (panel)."""
    await require_auth(request)
    q = {
        "anio_construccion": None,
        "precio": {"$gt": 0},
        "es_duplicado_secundario": {"$ne": True},
    }
    if municipio:
        q["municipio"] = municipio
    if colonia:
        q["colonia"] = colonia
    if tipo:
        q["tipo_propiedad"] = TIPO_ALIAS.get(tipo.lower().strip(), tipo)
    limit = max(1, min(limit, 100))
    items = await db.mercado_props.find(q, CAMPOS_SIN_EDAD).limit(limit).to_list(limit)
    return {"items": items, "count": len(items)}


@router.post("/edad-estimada")
async def edad_estimada(request: Request):
    """Guarda la edad estimada por el perito en mercado_props (por id_unico)."""
    user = await require_auth(request)
    body = await request.json()

    id_unico = str(body.get("id_unico") or "").strip()
    rango = str(body.get("edad_rango") or "").strip()
    conjunto = body.get("conjunto")
    anio_exacto = body.get("anio_exacto")
    edad_exacta = body.get("edad_exacta")

    if not id_unico:
        raise HTTPException(status_code=400, detail="Falta id_unico")

    ahora = datetime.now(timezone.utc)
    exacta = False
    # Valor exacto tiene prioridad sobre el rango.
    if anio_exacto not in (None, ""):
        try:
            anio = int(anio_exacto)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Año inválido")
        if not (1900 <= anio <= ahora.year + 1):
            raise HTTPException(status_code=400, detail="Año fuera de rango")
        exacta = True
    elif edad_exacta not in (None, ""):
        try:
            e = int(edad_exacta)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Edad inválida")
        if not (0 <= e <= 200):
            raise HTTPException(status_code=400, detail="Edad fuera de rango")
        anio = ahora.year - e
        exacta = True
    elif rango in RANGO_MIDPOINT:
        anio = ahora.year - RANGO_MIDPOINT[rango]
    else:
        raise HTTPException(status_code=400, detail="Falta edad (rango o valor exacto)")

    update = {
        "anio_construccion": anio,
        "edad_fuente": "perito_crowdsource",
        "edad_rango": rango if (rango in RANGO_MIDPOINT and not exacta) else None,
        "edad_exacta": exacta,
        "edad_estimador": user.user_id,
        "edad_fecha": ahora.isoformat(),
    }
    if conjunto:
        update["conjunto"] = str(conjunto).strip()[:120]

    res = await db.mercado_props.update_one({"id_unico": id_unico}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    # Puntos (stub): contador por usuario, sin canje en v1.
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"puntos_edad": 1}})
    puntos_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "puntos_edad": 1})

    return {"ok": True, "anio_construccion": anio, "puntos": (puntos_doc or {}).get("puntos_edad", 1)}


if __name__ == "__main__":
    # Self-check de midpoints (offline, sin DB).
    assert RANGO_MIDPOINT["nuevo"] == 0 and RANGO_MIDPOINT["50+"] == 55
    assert list(RANGO_MIDPOINT)[:3] == ["nuevo", "1-5", "6-10"]
    # Monotónico creciente (rangos ordenados de menor a mayor edad).
    vals = list(RANGO_MIDPOINT.values())
    assert vals == sorted(vals), "midpoints deben ir en orden creciente"
    assert len(RANGO_MIDPOINT) == 12
    print("edades self-check OK")
