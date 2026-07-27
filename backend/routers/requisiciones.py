"""Bolsa de Requerimientos — un asesor publica los requisitos de un cliente,
el sistema busca coincidencias YA existentes en `mercado_props` y muestra el
contacto de quien la trae. Sin match, queda viva 15 días; el recálculo de
coincidencias nuevas es LAZY (se recorre `GET /requisiciones/mias`), no hay
trigger en los caminos de alta (scraper/Data Exchange/alta manual) ni cron."""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Request, HTTPException, Body

from core.db import db
from core.auth import require_auth
from core.requisiciones import (
    normalizar_criterios, buscar_matches, expira_en, resumen_publico, estado_actual,
)

router = APIRouter(prefix="/api/requisiciones")


@router.post("")
async def crear_requisicion(request: Request, payload: dict = Body(...)):
    user = await require_auth(request)
    try:
        criterios = normalizar_criterios(payload)
    except ValueError as e:
        raise HTTPException(400, str(e))

    matches = await buscar_matches(db, criterios)
    ahora = datetime.now(timezone.utc)
    doc = {
        **criterios,
        "user_id": user.user_id,
        "nombre_asesor": user.name,
        "empresa": user.company_name or user.empresa_afiliada,
        "foto_asesor": user.picture,
        "creado_en": ahora,
        "expira_en": expira_en(ahora),
        "estado": "activa",
        "matches_vistos": [m["id_unico"] for m in matches],
    }
    res = await db.requisiciones.insert_one(doc)
    return {"requisicion_id": str(res.inserted_id), "matches": matches}


@router.get("/mias")
async def mis_requisiciones(request: Request):
    user = await require_auth(request)
    docs = await db.requisiciones.find(
        {"user_id": user.user_id, "estado": {"$ne": "cerrada"}}
    ).sort("creado_en", -1).to_list(200)

    out = []
    for d in docs:
        estado = estado_actual(d)
        coincidencias_nuevas = []
        if estado == "activa":
            matches = await buscar_matches(db, d)
            vistos = set(d.get("matches_vistos", []))
            coincidencias_nuevas = [m for m in matches if m["id_unico"] not in vistos]
            if coincidencias_nuevas:
                nuevos_ids = [m["id_unico"] for m in matches]
                await db.requisiciones.update_one(
                    {"_id": d["_id"]}, {"$set": {"matches_vistos": nuevos_ids}})
        out.append({**resumen_publico(d), "estado": estado,
                    "coincidencias_nuevas": coincidencias_nuevas})
    return out


@router.get("")
async def feed_requisiciones(request: Request):
    await require_auth(request)
    ahora = datetime.now(timezone.utc)
    docs = await db.requisiciones.find(
        {"estado": "activa", "expira_en": {"$gt": ahora}}
    ).sort("creado_en", -1).to_list(200)
    return [resumen_publico(d) for d in docs]


@router.patch("/{requisicion_id}/cerrar")
async def cerrar_requisicion(requisicion_id: str, request: Request):
    user = await require_auth(request)
    try:
        oid = ObjectId(requisicion_id)
    except InvalidId:
        raise HTTPException(400, "id inválido")
    res = await db.requisiciones.update_one(
        {"_id": oid, "user_id": user.user_id}, {"$set": {"estado": "cerrada"}})
    if res.matched_count == 0:
        raise HTTPException(404, "Requisición no encontrada")
    return {"ok": True}
