"""Admin — inmobiliarias: listado, detalle, actividad, notas internas."""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")


@router.get("/admin/inmobiliarias")
async def admin_inmobiliarias_list(request: Request, q: str = "", estado: str = "", kyc: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"role": "realtor"}
    if q:
        filtro["$or"] = [
            {"company_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]
    if estado:
        filtro["cuenta_estado"] = estado
    if kyc:
        filtro["kyc_status"] = kyc
    realtors = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).to_list(200)
    # Agregar conteos de valuaciones por empresa
    now = datetime.now(timezone.utc)
    mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    for r in realtors:
        uid = r.get("user_id")
        r["total_avaluos"] = await db.valuations.count_documents({"user_id": uid}) if uid else 0
        r["avaluos_mes"]   = await db.valuations.count_documents({"user_id": uid, "created_at": {"$gte": mes_inicio}}) if uid else 0
        r["ads_activos"]   = await db.anuncios.count_documents({"user_id": uid, "estado": "aprobado"}) if uid else 0
        r["ads_pendientes"] = await db.anuncios.count_documents({"user_id": uid, "estado": "pendiente"}) if uid else 0
    total = await db.users.count_documents(filtro)
    return {"inmobiliarias": realtors, "total": total}


@router.get("/admin/inmobiliarias/{user_id}")
async def admin_inmobiliaria_detalle(user_id: str, request: Request):
    await require_admin(request)
    realtor = await db.users.find_one({"user_id": user_id, "role": "realtor"}, {"_id": 0, "hashed_password": 0})
    if not realtor:
        raise HTTPException(status_code=404, detail="Inmobiliaria no encontrada")
    # Últimas 20 valuaciones
    valuaciones = await db.valuations.find(
        {"user_id": user_id}, {"_id": 0, "valuation_id": 1, "property_data": 1, "status": 1, "created_at": 1, "final_value": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"inmobiliaria": realtor, "valuaciones": valuaciones}


@router.get("/admin/inmobiliarias-actividad")
async def admin_inmobiliarias_actividad(request: Request):
    await require_admin(request)
    # IDs de todos los realtors
    realtors = await db.users.find({"role": "realtor"}, {"user_id": 1, "company_name": 1, "email": 1}).to_list(500)
    uid_map = {r["user_id"]: r.get("company_name") or r.get("email", "") for r in realtors if "user_id" in r}
    if not uid_map:
        return {"valuaciones": []}
    valuaciones = await db.valuations.find(
        {"user_id": {"$in": list(uid_map.keys())}},
        {"_id": 0, "valuation_id": 1, "user_id": 1, "property_data": 1, "status": 1, "created_at": 1, "final_value": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    for v in valuaciones:
        v["empresa"] = uid_map.get(v.get("user_id"), "—")
    return {"valuaciones": valuaciones}


@router.post("/admin/inmobiliarias/{user_id}/notificar")
async def admin_inmobiliaria_notificar(user_id: str, request: Request):
    await require_admin(request)
    admin = await require_admin(request)
    body = await request.json()
    nota = {
        "nota_id": uuid.uuid4().hex,
        "user_id": user_id,
        "mensaje": body.get("mensaje", ""),
        "tipo": body.get("tipo", "info"),
        "creado_por": admin.get("nombre") or "Admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "leida": False,
    }
    await db.notas_internas.insert_one(nota)
    nota.pop("_id", None)
    return {"ok": True, "nota": nota}


@router.get("/admin/inmobiliarias/{user_id}/notas")
async def admin_inmobiliaria_notas(user_id: str, request: Request):
    await require_admin(request)
    notas = await db.notas_internas.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"notas": notas}
