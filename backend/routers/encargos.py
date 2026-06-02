"""Encargos / Payouts: registro y pago de comisiones a valuadores (80/20)."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin, require_auth

router = APIRouter(prefix="/api")


@router.post("/admin/encargos")
async def admin_crear_encargo(request: Request):
    await require_admin(request)
    body = await request.json()
    valuador_id = body.get("valuador_id")
    descripcion = (body.get("descripcion") or "").strip()
    precio_total = float(body.get("precio_total", 0))
    if not valuador_id or not descripcion or precio_total <= 0:
        raise HTTPException(400, "valuador_id, descripcion y precio_total son requeridos")
    doc = {
        "encargo_id": f"enc_{uuid.uuid4().hex[:12]}",
        "valuador_id": valuador_id,
        "descripcion": descripcion,
        "precio_total": precio_total,
        "comision_valuador": round(precio_total * 0.80, 2),
        "comision_propvalu": round(precio_total * 0.20, 2),
        "estado": "completado",
        "fecha_completado": datetime.now(timezone.utc).isoformat(),
        "pago_realizado": False,
        "fecha_pago": None,
        "notas_admin": (body.get("notas_admin") or "").strip() or None,
    }
    await db["encargos"].insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "encargo": doc}


@router.get("/admin/encargos")
async def admin_listar_encargos(request: Request, skip: int = 0, limit: int = 50, valuador_id: str = "", pagado: str = ""):
    await require_admin(request)
    query = {}
    if valuador_id:
        query["valuador_id"] = valuador_id
    if pagado == "true":
        query["pago_realizado"] = True
    elif pagado == "false":
        query["pago_realizado"] = False
    total = await db["encargos"].count_documents(query)
    items = await db["encargos"].find(query, {"_id": 0}).sort("fecha_completado", -1).skip(skip).limit(limit).to_list(limit)
    # Enriquecer con nombre del valuador
    for enc in items:
        u = await db.users.find_one({"user_id": enc["valuador_id"]}, {"name": 1, "email": 1, "_id": 0})
        enc["valuador_nombre"] = u.get("name") if u else enc["valuador_id"]
    pendiente_total = await db["encargos"].aggregate([
        {"$match": {"pago_realizado": False}},
        {"$group": {"_id": None, "total": {"$sum": "$comision_valuador"}}}
    ]).to_list(1)
    return {"total": total, "pendiente": pendiente_total[0]["total"] if pendiente_total else 0, "items": items}


@router.put("/admin/encargos/{encargo_id}/pagar")
async def admin_pagar_encargo(encargo_id: str, request: Request):
    await require_admin(request)
    enc = await db["encargos"].find_one({"encargo_id": encargo_id})
    if not enc:
        raise HTTPException(404, "Encargo no encontrado")
    await db["encargos"].update_one(
        {"encargo_id": encargo_id},
        {"$set": {"pago_realizado": True, "fecha_pago": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


@router.get("/encargos/mis-encargos")
async def mis_encargos(request: Request):
    user = await require_auth(request)
    items = await db["encargos"].find({"valuador_id": user.user_id}, {"_id": 0}).sort("fecha_completado", -1).to_list(200)
    return {"items": items}


# Newsletter -> routers/newsletter.py (#66.1)

# Accesos autorizados -> routers/access.py (#66.1)
