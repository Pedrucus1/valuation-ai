"""CMS legal: lectura/edición de documentos legales por admin."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")

CMS_SLUGS = ["terminos_generales", "privacidad", "politica_anuncios", "codigo_etica"]


@router.get("/admin/cms/{slug}")
async def admin_cms_get(request: Request, slug: str):
    await require_admin(request)
    if slug not in CMS_SLUGS:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    doc = await db.cms.find_one({"slug": slug}, {"_id": 0})
    if doc:
        return doc
    return {"slug": slug, "contenido": "", "editado_por": "", "editado_at": ""}


@router.put("/admin/cms/{slug}")
async def admin_cms_put(slug: str, request: Request):
    admin = await require_admin(request)
    if slug not in CMS_SLUGS:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    body = await request.json()
    doc = {
        "slug": slug,
        "contenido": body.get("contenido", ""),
        "editado_por": admin.get("nombre", "Admin"),
        "editado_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cms.replace_one({"slug": slug}, doc, upsert=True)
    return {"ok": True}
