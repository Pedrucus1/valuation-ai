"""Admin — usuarios: listado, estado, plan."""
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin
from core.creditos import establecer_creditos_mensuales, saldo_efectivo

router = APIRouter(prefix="/api")


@router.get("/admin/usuarios")
async def admin_usuarios(request: Request, skip: int = 0, limit: int = 50, q: str = "", tipo: str = "", estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if q:
        filtro["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if tipo:
        filtro["role"] = tipo
    if estado:
        filtro["cuenta_estado"] = estado
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).skip(skip).limit(limit).to_list(limit)
    for u in usuarios:
        u["credits"] = saldo_efectivo(u)  # saldo real (filtra expirados), no el int crudo
    total = await db.users.count_documents(filtro)
    return {"usuarios": usuarios, "total": total}

@router.patch("/admin/usuarios/{user_id}/estado")
async def admin_usuario_estado(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    nuevo_estado = body.get("estado")
    if nuevo_estado not in ("activo", "suspendido"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    await db.users.update_one({"user_id": user_id}, {"$set": {"cuenta_estado": nuevo_estado}})
    return {"ok": True}

@router.patch("/admin/usuarios/{user_id}/plan")
async def admin_usuario_plan(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    plan = body.get("plan")
    credits = body.get("credits", 0)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan requerido")
    await db.users.update_one({"user_id": user_id}, {"$set": {"plan": plan}})
    # Créditos del plan = "pago_mensual": expira fin de mes, no rueda (política confirmada).
    await establecer_creditos_mensuales(db, user_id, credits)
    return {"ok": True}
