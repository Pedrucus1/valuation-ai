"""Calculadora de viabilidad de flipping — guarda por usuario un cálculo de negociación
(precio de compra, deudas, remodelación, costos de venta/financiero/administración/cierre,
margen). El cálculo en sí (aritmética) vive en el frontend; aquí solo se persiste el
snapshot de inputs + outputs ya calculado."""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Request, HTTPException, Body

from core.db import db
from core.auth import require_auth

router = APIRouter(prefix="/api/flipping")


@router.post("/calculos")
async def crear_calculo(request: Request, payload: dict = Body(...)):
    user = await require_auth(request)
    doc = {
        "user_id": user.user_id,
        "valuation_id": payload.get("valuation_id"),
        "direccion": payload.get("direccion", ""),
        "inputs": payload.get("inputs", {}),
        "outputs": payload.get("outputs", {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.flipping_calcs.insert_one(doc)
    return {"calculo_id": str(res.inserted_id)}


@router.get("/calculos/mias")
async def mis_calculos(request: Request, valuation_id: str = None):
    user = await require_auth(request)
    query = {"user_id": user.user_id}
    if valuation_id:
        query["valuation_id"] = valuation_id
    docs = await db.flipping_calcs.find(query).sort("created_at", -1).to_list(200)
    for d in docs:
        d["calculo_id"] = str(d.pop("_id"))
    return docs


@router.get("/calculos/{calculo_id}")
async def obtener_calculo(calculo_id: str, request: Request):
    user = await require_auth(request)
    try:
        oid = ObjectId(calculo_id)
    except InvalidId:
        raise HTTPException(400, "id inválido")
    doc = await db.flipping_calcs.find_one({"_id": oid, "user_id": user.user_id})
    if not doc:
        raise HTTPException(404, "Cálculo no encontrado")
    doc["calculo_id"] = str(doc.pop("_id"))
    return doc


@router.patch("/calculos/{calculo_id}")
async def actualizar_calculo(calculo_id: str, request: Request, payload: dict = Body(...)):
    user = await require_auth(request)
    try:
        oid = ObjectId(calculo_id)
    except InvalidId:
        raise HTTPException(400, "id inválido")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for campo in ("direccion", "inputs", "outputs"):
        if campo in payload:
            update[campo] = payload[campo]
    res = await db.flipping_calcs.update_one(
        {"_id": oid, "user_id": user.user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Cálculo no encontrado")
    return {"ok": True}
