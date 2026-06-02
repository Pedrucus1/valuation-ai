"""Feedback / quejas: envío público + gestión admin."""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")


@router.get("/admin/feedback")
async def admin_feedback_list(request: Request, estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if estado:
        filtro["estado"] = estado
    items = await db.feedback.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items, "total": len(items)}


@router.patch("/admin/feedback/{feedback_id}")
async def admin_feedback_update(feedback_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    allowed = {"estado", "asignado_a", "notas_internas"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.feedback.update_one({"feedback_id": feedback_id}, {"$set": update})
    return {"ok": True}


@router.post("/feedback")
async def submit_feedback(request: Request):
    body = await request.json()
    doc = {
        "feedback_id": f"PV-FB-{uuid.uuid4().hex[:8].upper()}",
        "tipo": body.get("tipo", "general"),
        "descripcion": body.get("descripcion", ""),
        "email": body.get("email", ""),
        "valuador_id": body.get("valuador_id"),
        "calificacion": body.get("calificacion"),
        "estado": "recibido",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(doc)
    return {"ok": True, "folio": doc["feedback_id"]}
