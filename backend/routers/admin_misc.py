"""Admin varios: configuración de alertas y stats del dashboard."""
from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")

ALERTAS_DEFAULT = [
    {"id": "pago_fallido",     "nombre": "Pagos fallidos",             "activa": True,  "canales": ["email", "inapp"], "umbral": 3,  "umbral_label": "pagos fallidos/día",      "ultima_activacion": None, "veces_hoy": 0},
    {"id": "valuador_inactivo","nombre": "Valuador inactivo",          "activa": True,  "canales": ["email"],          "umbral": 30, "umbral_label": "días sin actividad",       "ultima_activacion": None, "veces_hoy": 0},
    {"id": "scraper_caido",    "nombre": "Scraper caído",              "activa": True,  "canales": ["email", "inapp"], "umbral": 24, "umbral_label": "horas sin ejecutar",       "ultima_activacion": None, "veces_hoy": 0},
    {"id": "kyc_nuevo",        "nombre": "Nuevo KYC pendiente",        "activa": True,  "canales": ["inapp"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
    {"id": "campana_vencida",  "nombre": "Campaña de anuncio vencida", "activa": True,  "canales": ["email"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
    {"id": "queja_grave",      "nombre": "Acumulación de quejas graves","activa": True, "canales": ["email", "inapp"], "umbral": 3,  "umbral_label": "quejas en 30 días",        "ultima_activacion": None, "veces_hoy": 0},
    {"id": "registro_nuevo",   "nombre": "Nuevo usuario premium",      "activa": False, "canales": ["inapp"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
]


@router.get("/admin/alertas")
async def admin_alertas_get(request: Request):
    await require_admin(request)
    doc = await db.alertas_config.find_one({"_id": "config"}, {"_id": 0})
    if not doc:
        doc = {"alertas": ALERTAS_DEFAULT, "email_destino": "admin@propvalu.mx"}
        await db.alertas_config.insert_one({"_id": "config", **doc})
    return doc


@router.put("/admin/alertas")
async def admin_alertas_put(request: Request):
    await require_admin(request)
    body = await request.json()
    alertas = body.get("alertas", [])
    email_destino = body.get("email_destino", "admin@propvalu.mx")
    await db.alertas_config.update_one(
        {"_id": "config"},
        {"$set": {"alertas": alertas, "email_destino": email_destino}},
        upsert=True,
    )
    return {"ok": True}


@router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total_usuarios = await db.users.count_documents({})
    kyc_pendiente = await db.users.count_documents({"kyc_status": "pending"})
    total_valuaciones = await db.valuations.count_documents({})
    completadas = await db.valuations.count_documents({"status": "completed"})
    feedback_abierto = await db.feedback.count_documents({"estado": {"$in": ["recibido", "en_revision"]}})
    inmobiliarias_pendientes = await db.users.count_documents({"role": "realtor", "kyc_status": "pending"})
    return {
        "total_usuarios": total_usuarios,
        "kyc_pendiente": kyc_pendiente,
        "total_valuaciones": total_valuaciones,
        "valuaciones_completadas": completadas,
        "feedback_abierto": feedback_abierto,
        "inmobiliarias_pendientes": inmobiliarias_pendientes,
    }
