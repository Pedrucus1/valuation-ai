"""Admin — log de actividad: errores de backend (auto, via middleware en server.py)
y eventos clave de negocio (login, valuacion creada, reporte generado)."""
from typing import Optional

from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")


@router.get("/admin/activity-log")
async def admin_activity_log(
    request: Request,
    tipo: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
):
    await require_admin(request)
    limit = min(limit, 200)
    query: dict = {}
    if tipo in ("error", "evento"):
        query["tipo"] = tipo
    if q:
        query["$or"] = [
            {"path": {"$regex": q, "$options": "i"}},
            {"mensaje": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    total = await db.activity_log.count_documents(query)
    items = await db.activity_log.find(query, {"_id": 0}).sort("ts", -1).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": items}
