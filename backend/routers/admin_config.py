"""Configuración admin: precios, mantenimiento, blacklist y zonas de cobertura.
Todo se guarda en la colección `config` con _id por tipo."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin
from core.pricing import PRECIOS_DEFAULT

router = APIRouter(prefix="/api")

ZONAS_DEFAULT = [
    {"municipio": "Guadalajara",    "estado": "Jalisco", "scraper_activo": True,  "valuadores_activos": True,  "ads_disponible": True},
    {"municipio": "Zapopan",        "estado": "Jalisco", "scraper_activo": True,  "valuadores_activos": True,  "ads_disponible": True},
    {"municipio": "Tlaquepaque",    "estado": "Jalisco", "scraper_activo": True,  "valuadores_activos": True,  "ads_disponible": True},
    {"municipio": "Tonalá",         "estado": "Jalisco", "scraper_activo": True,  "valuadores_activos": False, "ads_disponible": False},
    {"municipio": "Tlajomulco",     "estado": "Jalisco", "scraper_activo": True,  "valuadores_activos": False, "ads_disponible": False},
    {"municipio": "El Salto",       "estado": "Jalisco", "scraper_activo": False, "valuadores_activos": False, "ads_disponible": False},
    {"municipio": "Juanacatlán",    "estado": "Jalisco", "scraper_activo": False, "valuadores_activos": False, "ads_disponible": False},
    {"municipio": "Ixtlahuacán",    "estado": "Jalisco", "scraper_activo": False, "valuadores_activos": False, "ads_disponible": False},
]


# ── Precios ──────────────────────────────────────────────────────────────────
@router.get("/admin/precios")
async def admin_precios_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "precios"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return PRECIOS_DEFAULT


@router.put("/admin/precios")
async def admin_precios_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "precios"}, {"_id": "precios", **body}, upsert=True)
    return {"ok": True}


@router.get("/precios")
async def precios_publicos():
    doc = await db.config.find_one({"_id": "precios"})
    if doc:
        return {k: v for k, v in doc.items() if k not in ("_id", "updated_at")}
    return PRECIOS_DEFAULT


# ── Mantenimiento ──────────────────────────────────────────────────────────────
@router.get("/admin/mantenimiento")
async def admin_mant_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "mantenimiento"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"activo": False}


@router.put("/admin/mantenimiento")
async def admin_mant_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "mantenimiento"}, {"_id": "mantenimiento", **body}, upsert=True)
    return {"ok": True}


@router.get("/mantenimiento")
async def mantenimiento_publico():
    doc = await db.config.find_one({"_id": "mantenimiento"})
    if doc and doc.get("activo"):
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"activo": False}


# ── Blacklist ──────────────────────────────────────────────────────────────────
@router.get("/admin/blacklist")
async def admin_blacklist_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "blacklist"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"palabras": [], "dominios": []}


@router.put("/admin/blacklist")
async def admin_blacklist_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "blacklist"}, {"_id": "blacklist", **body}, upsert=True)
    return {"ok": True}


# ── Zonas de cobertura ─────────────────────────────────────────────────────────
@router.get("/admin/zonas-cobertura")
async def admin_zonas_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "zonas_cobertura"})
    if doc:
        return {"zonas": doc.get("zonas", [])}
    return {"zonas": ZONAS_DEFAULT}


@router.put("/admin/zonas-cobertura")
async def admin_zonas_put(request: Request):
    await require_admin(request)
    body = await request.json()
    await db.config.replace_one(
        {"_id": "zonas_cobertura"},
        {"_id": "zonas_cobertura", "zonas": body.get("zonas", []), "updated_at": datetime.now(timezone.utc).isoformat()},
        upsert=True
    )
    return {"ok": True}
