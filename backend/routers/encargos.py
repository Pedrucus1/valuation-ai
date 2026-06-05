"""Encargos / Payouts: registro y pago de comisiones a valuadores."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin, require_auth

router = APIRouter(prefix="/api")


@router.post("/admin/encargos")
async def admin_crear_encargo(request: Request):
    await require_admin(request)
    body = await request.json()
    valuador_id = body.get("valuador_id")
    descripcion = (body.get("descripcion") or "").strip()
    precio_total = float(body.get("precio_total", 0))
    if not valuador_id or not descripcion or precio_total <= 0:
        raise HTTPException(400, "valuador_id, descripcion y precio_total son requeridos")
    config_comisiones = await db.config.find_one({"_id": "comisiones"})
    pct_val = 0.75
    pct_plat = 0.25
    if config_comisiones:
        pct_val = config_comisiones.get("porcentaje_valuador", 0.75)
        pct_plat = config_comisiones.get("porcentaje_plataforma", 0.25)

    doc = {
        "encargo_id": f"enc_{uuid.uuid4().hex[:12]}",
        "valuador_id": valuador_id,
        "descripcion": descripcion,
        "precio_total": precio_total,
        "comision_valuador": round(precio_total * pct_val, 2),
        "comision_propvalu": round(precio_total * pct_plat, 2),
        "estado": "completado",
        "fecha_completado": datetime.now(timezone.utc).isoformat(),
        "pago_realizado": False,
        "payout_id": None, # Null until grouped into a monthly payout
        "fecha_pago": None,
        "notas_admin": (body.get("notas_admin") or "").strip() or None,
    }
    await db["encargos"].insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "encargo": doc}


@router.get("/admin/encargos")
async def admin_listar_encargos(request: Request, skip: int = 0, limit: int = 50, valuador_id: str = "", pagado: str = ""):
    await require_admin(request)
    query = {}
    if valuador_id:
        query["valuador_id"] = valuador_id
    if pagado == "true":
        query["pago_realizado"] = True
    elif pagado == "false":
        query["pago_realizado"] = False
    total = await db["encargos"].count_documents(query)
    items = await db["encargos"].find(query, {"_id": 0}).sort("fecha_completado", -1).skip(skip).limit(limit).to_list(limit)
    # Enriquecer con nombre del valuador
    for enc in items:
        u = await db.users.find_one({"user_id": enc["valuador_id"]}, {"name": 1, "email": 1, "_id": 0})
        enc["valuador_nombre"] = u.get("name") if u else enc["valuador_id"]
    pendiente_total = await db["encargos"].aggregate([
        {"$match": {"pago_realizado": False}},
        {"$group": {"_id": None, "total": {"$sum": "$comision_valuador"}}}
    ]).to_list(1)
    return {"total": total, "pendiente": pendiente_total[0]["total"] if pendiente_total else 0, "items": items}


@router.put("/admin/encargos/{encargo_id}/pagar")
async def admin_pagar_encargo(encargo_id: str, request: Request):
    await require_admin(request)
    enc = await db["encargos"].find_one({"encargo_id": encargo_id})
    if not enc:
        raise HTTPException(404, "Encargo no encontrado")
    await db["encargos"].update_one(
        {"encargo_id": encargo_id},
        {"$set": {"pago_realizado": True, "fecha_pago": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


@router.get("/encargos/mis-encargos")
async def mis_encargos(request: Request):
    user = await require_auth(request)
    items = await db["encargos"].find({"valuador_id": user.user_id}, {"_id": 0}).sort("fecha_completado", -1).to_list(200)
    return {"items": items}


# ── Payouts (Lotes Mensuales) ──────────────────────────────────────────────────

@router.post("/admin/payouts/generar")
async def admin_generar_payouts(request: Request):
    """Agrupa todos los encargos completados y no pagados de cada valuador en un 'payout'."""
    await require_admin(request)
    
    # Buscar encargos completados, no pagados y no agrupados
    encargos = await db["encargos"].find({
        "estado": "completado", 
        "pago_realizado": False,
        "payout_id": None
    }).to_list(None)
    
    if not encargos:
        return {"ok": True, "message": "No hay encargos pendientes por agrupar."}
        
    # Agrupar por valuador
    por_valuador = {}
    for enc in encargos:
        vid = enc["valuador_id"]
        if vid not in por_valuador:
            por_valuador[vid] = []
        por_valuador[vid].append(enc)
        
    payouts_creados = 0
    mes_actual = datetime.now(timezone.utc).strftime("%Y-%m")
    
    for vid, lista_encargos in por_valuador.items():
        total_a_pagar = sum(e["comision_valuador"] for e in lista_encargos)
        encargos_ids = [e["encargo_id"] for e in lista_encargos]
        
        payout_id = f"pay_{uuid.uuid4().hex[:12]}"
        
        doc = {
            "payout_id": payout_id,
            "valuador_id": vid,
            "mes": mes_actual,
            "monto_total": round(total_a_pagar, 2),
            "cantidad_encargos": len(lista_encargos),
            "encargos": encargos_ids,
            "estado": "pendiente_revision",
            "fecha_creacion": datetime.now(timezone.utc).isoformat(),
            "fecha_pago": None
        }
        
        await db["payouts"].insert_one(doc)
        
        # Marcar los encargos con este payout_id
        await db["encargos"].update_many(
            {"encargo_id": {"$in": encargos_ids}},
            {"$set": {"payout_id": payout_id}}
        )
        payouts_creados += 1
        
    return {"ok": True, "payouts_creados": payouts_creados}


@router.get("/admin/payouts")
async def admin_listar_payouts(request: Request, skip: int = 0, limit: int = 50, estado: str = ""):
    await require_admin(request)
    query = {}
    if estado:
        query["estado"] = estado
        
    total = await db["payouts"].count_documents(query)
    items = await db["payouts"].find(query, {"_id": 0}).sort("fecha_creacion", -1).skip(skip).limit(limit).to_list(limit)
    
    for item in items:
        u = await db.users.find_one({"user_id": item["valuador_id"]}, {"name": 1, "email": 1, "_id": 0})
        item["valuador_nombre"] = u.get("name") if u else item["valuador_id"]
        item["valuador_email"] = u.get("email") if u else ""
        
    return {"total": total, "items": items}


@router.put("/admin/payouts/{payout_id}/pagar")
async def admin_pagar_payout(payout_id: str, request: Request):
    await require_admin(request)
    payout = await db["payouts"].find_one({"payout_id": payout_id})
    if not payout:
        raise HTTPException(404, "Payout no encontrado")
        
    if payout["estado"] == "pagado":
        return {"ok": True, "message": "Ya estaba pagado"}
        
    fecha_pago = datetime.now(timezone.utc).isoformat()
    
    await db["payouts"].update_one(
        {"payout_id": payout_id},
        {"$set": {"estado": "pagado", "fecha_pago": fecha_pago}}
    )
    
    # Marcar los encargos asociados como pagados
    await db["encargos"].update_many(
        {"payout_id": payout_id},
        {"$set": {"pago_realizado": True, "fecha_pago": fecha_pago}}
    )
    
    return {"ok": True}


@router.get("/payouts/mis-pagos")
async def mis_pagos(request: Request):
    """Para la pestaña Facturación del Valuador"""
    user = await require_auth(request)
    items = await db["payouts"].find({"valuador_id": user.user_id}, {"_id": 0}).sort("fecha_creacion", -1).to_list(200)
    return {"items": items}


# Accesos autorizados -> routers/access.py (#66.1)
