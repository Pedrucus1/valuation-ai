"""Mercado — accesos por plan: qué planes tienen acceso al módulo de mercado,
con ventana de promoción opcional. Incluye el seed inicial (usado en startup)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")

PLANES_DEFAULT = [
    {"plan_id": "valuador_independiente", "label": "Valuador Independiente", "activo": False},
    {"plan_id": "valuador_despacho",      "label": "Valuador Despacho",      "activo": False},
    {"plan_id": "valuador_pro",           "label": "Valuador Pro",           "activo": True},
    {"plan_id": "valuador_corporativo",   "label": "Valuador Corporativo",   "activo": True},
    {"plan_id": "inmobiliaria_lite5",     "label": "Inmobiliaria Lite 5",    "activo": False},
    {"plan_id": "inmobiliaria_lite10",    "label": "Inmobiliaria Lite 10",   "activo": False},
    {"plan_id": "inmobiliaria_pro20",     "label": "Inmobiliaria Pro 20",    "activo": False},
    {"plan_id": "inmobiliaria_premier",   "label": "Inmobiliaria Premier",   "activo": True},
]


async def _seed_mercado_accesos():
    col = db["mercado_accesos"]
    for p in PLANES_DEFAULT:
        existing = await col.find_one({"plan_id": p["plan_id"]})
        if not existing:
            await col.insert_one({**p, "fecha_inicio": None, "fecha_fin": None, "nota": ""})


def _plan_tiene_acceso_hoy(doc: dict) -> bool:
    if not doc.get("activo"):
        return False
    hoy = datetime.now(timezone.utc).date()
    fi = doc.get("fecha_inicio")
    ff = doc.get("fecha_fin")
    if fi and hoy < datetime.fromisoformat(fi).date():
        return False
    if ff and hoy > datetime.fromisoformat(ff).date():
        return False
    return True


@router.get("/mercado/acceso")
async def mercado_acceso(plan_id: str = ""):
    if not plan_id:
        return {"acceso": False}
    doc = await db["mercado_accesos"].find_one({"plan_id": plan_id})
    if not doc:
        return {"acceso": False}
    acceso = _plan_tiene_acceso_hoy(doc)
    promo = acceso and doc.get("fecha_fin") is not None
    return {
        "acceso": acceso,
        "promo": promo,
        "fecha_fin": doc.get("fecha_fin"),
        "nota": doc.get("nota", ""),
    }


@router.get("/admin/mercado/accesos")
async def admin_mercado_accesos_get(request: Request):
    await require_admin(request)
    docs = await db["mercado_accesos"].find({}, {"_id": 0}).to_list(20)
    hoy = datetime.now(timezone.utc).date().isoformat()
    for d in docs:
        d["acceso_hoy"] = _plan_tiene_acceso_hoy(d)
    return {"accesos": docs, "hoy": hoy}


@router.put("/admin/mercado/accesos/{plan_id}")
async def admin_mercado_accesos_put(plan_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    update = {}
    for k in ("activo", "fecha_inicio", "fecha_fin", "nota"):
        if k in body:
            update[k] = body[k] if body[k] != "" else None
    if not update:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    await db["mercado_accesos"].update_one({"plan_id": plan_id}, {"$set": update}, upsert=True)
    return {"ok": True}
