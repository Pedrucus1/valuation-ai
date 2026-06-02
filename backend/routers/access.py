"""Accesos autorizados (cortesía / pruebas).

Emails con acceso gratis: uso interno del equipo o pruebas a clientes
(valuador/inmobiliaria). Cada acceso da "acceso total" o un número de avalúos
gratis, con una modalidad de servicio (solo valuación / con servicio de
valuador = addon_valuador / con visita = addon_visita), y opcionalmente una
fecha de expiración. Se agota lo que ocurra primero (cupo o fecha).
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin, get_current_user
from core.accesos import (
    ACCESO_CATEGORIAS, ACCESO_MODALIDADES, _acceso_estado, _acceso_publico,
)

router = APIRouter(prefix="/api")


@router.get("/access/status")
async def access_status(email: str = "", request: Request = None):
    """Consulta si un email tiene acceso de cortesía/prueba. Lo usa el checkout."""
    correo = (email or "").lower().strip()
    if not correo and request is not None:
        u = await get_current_user(request)
        if u:
            correo = (u.email or "").lower().strip()
    if not correo:
        return {"autorizado": False, "estado": "sin_email"}
    doc = await db["authorized_access"].find_one({"email": correo}, {"_id": 0})
    if not doc:
        return {"autorizado": False, "estado": "no_registrado"}
    return _acceso_publico(doc)


@router.get("/admin/accesos")
async def admin_accesos_list(request: Request, categoria: str = "", q: str = ""):
    await require_admin(request)
    query: Dict[str, Any] = {}
    if categoria in ACCESO_CATEGORIAS:
        query["categoria"] = categoria
    if q:
        query["email"] = {"$regex": q, "$options": "i"}
    docs = await db["authorized_access"].find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["estado"] = _acceso_estado(d)
        if not d.get("acceso_total"):
            d["restantes"] = max(0, int(d.get("avaluos_gratis", 0)) - int(d.get("usados", 0)))
    activos = sum(1 for d in docs if d["estado"] == "activo")
    return {"items": docs, "total": len(docs), "activos": activos}


@router.post("/admin/accesos")
async def admin_acceso_crear(request: Request):
    admin = await require_admin(request)
    body = await request.json()
    correo = (body.get("email") or "").lower().strip()
    if not correo or "@" not in correo:
        raise HTTPException(status_code=400, detail="Email válido requerido")
    if await db["authorized_access"].find_one({"email": correo}):
        raise HTTPException(status_code=409, detail="Ya existe un acceso para ese email")
    cat = body.get("categoria")
    modalidad = body.get("modalidad")
    doc = {
        "access_id": str(uuid.uuid4()),
        "email": correo,
        "categoria": cat if cat in ACCESO_CATEGORIAS else "interno",
        "acceso_total": bool(body.get("acceso_total")),
        "avaluos_gratis": int(body.get("avaluos_gratis") or 0),
        "modalidad": modalidad if modalidad in ACCESO_MODALIDADES else "solo_valuacion",
        "fecha_expiracion": body.get("fecha_expiracion") or None,
        "nota": body.get("nota") or "",
        "activo": bool(body.get("activo", True)),
        "usados": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email") if admin else None,
    }
    await db["authorized_access"].insert_one(dict(doc))
    doc["estado"] = _acceso_estado(doc)
    return doc


@router.put("/admin/accesos/{access_id}")
async def admin_acceso_editar(access_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    cambios: Dict[str, Any] = {}
    for k in ("categoria", "acceso_total", "avaluos_gratis", "modalidad",
              "fecha_expiracion", "nota", "activo"):
        if k in body:
            cambios[k] = body[k]
    if "categoria" in cambios and cambios["categoria"] not in ACCESO_CATEGORIAS:
        cambios.pop("categoria")
    if "modalidad" in cambios and cambios["modalidad"] not in ACCESO_MODALIDADES:
        cambios.pop("modalidad")
    if "avaluos_gratis" in cambios:
        cambios["avaluos_gratis"] = int(cambios["avaluos_gratis"] or 0)
    if "acceso_total" in cambios:
        cambios["acceso_total"] = bool(cambios["acceso_total"])
    if "activo" in cambios:
        cambios["activo"] = bool(cambios["activo"])
    if "fecha_expiracion" in cambios:
        cambios["fecha_expiracion"] = cambios["fecha_expiracion"] or None
    if body.get("reset_usados"):
        cambios["usados"] = 0
    if not cambios:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = await db["authorized_access"].update_one({"access_id": access_id}, {"$set": cambios})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Acceso no encontrado")
    doc = await db["authorized_access"].find_one({"access_id": access_id}, {"_id": 0})
    if doc:
        doc["estado"] = _acceso_estado(doc)
    return doc or {"ok": True}


@router.delete("/admin/accesos/{access_id}")
async def admin_acceso_borrar(access_id: str, request: Request):
    await require_admin(request)
    await db["authorized_access"].delete_one({"access_id": access_id})
    return {"ok": True}
