"""Inmobiliaria (titular): equipo de asesores vinculados."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_auth

router = APIRouter(prefix="/api")


@router.get("/inmobiliaria/equipo")
async def get_equipo_inmobiliaria(request: Request):
    """Asesores vinculados al titular autenticado por empresa_afiliada o company_name."""
    user = await require_auth(request)
    if user.role != "realtor":
        raise HTTPException(403, "Solo para inmobiliarias")

    company = user.company_name or user.name or ""
    if not company:
        return []

    # Buscar asesores que pusieron esta empresa en empresa_afiliada
    asesores = await db.users.find(
        {"role": "realtor", "inmobiliaria_tipo": "asesor", "empresa_afiliada": company},
        {"_id": 0, "hashed_password": 0, "session_token": 0}
    ).to_list(100)

    resultado = []
    for a in asesores:
        uid = a.get("user_id") or a.get("email", "")
        total_val = await db.valuations.count_documents({"user_id": uid})
        mes_actual = datetime.now(timezone.utc).strftime("%Y-%m")
        val_mes = await db.valuations.count_documents({
            "user_id": uid,
            "created_at": {"$regex": f"^{mes_actual}"}
        })
        resultado.append({
            "user_id": uid,
            "nombre": a.get("name", ""),
            "email": a.get("email", ""),
            "phone": a.get("phone", ""),
            "kyc_status": a.get("kyc_status", "pending"),
            "plan": a.get("plan"),
            "valuaciones_total": total_val,
            "valuaciones_mes": val_mes,
            "activo": a.get("kyc_status") in ("approved", "under_review"),
        })

    return resultado
