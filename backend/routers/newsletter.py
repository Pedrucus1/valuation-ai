"""Newsletter: suscripción pública + administración de suscriptores."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin
from core.ratelimit import limiter

router = APIRouter(prefix="/api")


@router.post("/newsletter/subscribe")
@limiter.limit("5/minute")
async def newsletter_subscribe(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()[:200]
    if not email or "@" not in email:
        raise HTTPException(400, "Email inválido")
    existing = await db["newsletter_subscribers"].find_one({"email": email})
    if existing:
        if not existing.get("activo", True):
            await db["newsletter_subscribers"].update_one({"email": email}, {"$set": {"activo": True}})
        return {"ok": True, "message": "Ya estás suscrito"}
    doc = {
        "subscriber_id": uuid.uuid4().hex,
        "email": email,
        "nombre": ((body.get("nombre") or "").strip()[:120] or None),
        "rol": str(body.get("rol", "public"))[:40],
        "activo": True,
        "fecha_suscripcion": datetime.now(timezone.utc).isoformat(),
    }
    await db["newsletter_subscribers"].insert_one(doc)
    return {"ok": True, "subscriber_id": doc["subscriber_id"]}


@router.post("/newsletter/unsubscribe")
async def newsletter_unsubscribe(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "Email requerido")
    await db["newsletter_subscribers"].update_one({"email": email}, {"$set": {"activo": False}})
    return {"ok": True}


@router.get("/admin/newsletter/subscribers")
async def admin_newsletter_subscribers(request: Request, skip: int = 0, limit: int = 50, activo: str = "", rol: str = ""):
    await require_admin(request)
    query = {}
    if activo == "true":
        query["activo"] = True
    elif activo == "false":
        query["activo"] = False
    if rol:
        query["rol"] = rol
    total = await db["newsletter_subscribers"].count_documents(query)
    docs = await db["newsletter_subscribers"].find(query, {"_id": 0}).sort("fecha_suscripcion", -1).skip(skip).limit(limit).to_list(limit)
    activos = await db["newsletter_subscribers"].count_documents({"activo": True})
    return {"total": total, "activos": activos, "items": docs}


@router.delete("/admin/newsletter/subscribers/{subscriber_id}")
async def admin_newsletter_unsubscribe(subscriber_id: str, request: Request):
    await require_admin(request)
    await db["newsletter_subscribers"].update_one({"subscriber_id": subscriber_id}, {"$set": {"activo": False}})
    return {"ok": True}
