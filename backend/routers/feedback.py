"""Feedback / quejas: envío público + gestión admin."""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin
from core.ratelimit import limiter

router = APIRouter(prefix="/api")

TIPOS_FEEDBACK = {"general", "queja", "sugerencia", "bug", "reseña", "resena"}


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
@limiter.limit("5/minute")
async def submit_feedback(request: Request):
    body = await request.json()
    # Validación de input (S5): topes de tamaño y tipos para endpoint público.
    tipo = str(body.get("tipo", "general"))[:40]
    if tipo not in TIPOS_FEEDBACK:
        tipo = "general"
    descripcion = str(body.get("descripcion") or "").strip()[:3000]
    email = str(body.get("email") or "").strip()[:200]
    valuador_id = body.get("valuador_id")
    if valuador_id is not None:
        valuador_id = str(valuador_id)[:64]
    # Calificación: solo entero 1-5 o None (evita inflar ratings con valores arbitrarios).
    calificacion = body.get("calificacion")
    if calificacion is not None:
        try:
            calificacion = int(calificacion)
            if not (1 <= calificacion <= 5):
                calificacion = None
        except (ValueError, TypeError):
            calificacion = None
    doc = {
        "feedback_id": f"PV-FB-{uuid.uuid4().hex[:8].upper()}",
        "tipo": tipo,
        "descripcion": descripcion,
        "email": email,
        "valuador_id": valuador_id,
        "calificacion": calificacion,
        "estado": "recibido",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(doc)
    return {"ok": True, "folio": doc["feedback_id"]}
