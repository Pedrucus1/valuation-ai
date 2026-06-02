"""Admin — scraper: estado, ejecución de portales, reset y propiedades (Sheets)."""
import os
import asyncio
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin
from core.config import SCRAPER_DIR

router = APIRouter(prefix="/api")

@router.get("/admin/scraper/status")
async def admin_scraper_status(request: Request):
    await require_admin(request)
    doc = await db.scraper_status.find_one({"_id": "status"}, {"_id": 0})
    logs = await db.scraper_logs.find({}, {"_id": 0}).sort("_id", -1).to_list(20)
    logs.reverse()
    if not doc:
        return {
            "ultima_ejecucion": None,
            "duracion_min": 0,
            "estado_global": "sin_datos",
            "portales": [],
            "total_propiedades": 0,
            "nuevas_hoy": 0,
            "log_reciente": logs,
        }
    doc["log_reciente"] = logs
    return doc

PORTALES_SCRAPER = ["INMUEBLES24", "PINCALI", "VIVANUNCIOS", "MITULA", "CASAS_Y_TERRENOS", "PROPIEDADES_COM"]

@router.post("/admin/scraper/run")
async def admin_scraper_run(request: Request):
    await require_admin(request)
    try:
        body = await request.json()
    except Exception:
        body = {}
    portal = body.get("portal")  # None = todos los portales
    force = body.get("force", False)  # True = ignorar estado_global

    # Solo bloquear "todos" si ya hay un ciclo global corriendo (no bloquear portales individuales)
    if not portal and not force:
        doc = await db.scraper_status.find_one({"_id": "status"}, {"estado_global": 1})
        if doc and doc.get("estado_global") == "corriendo":
            raise HTTPException(status_code=409, detail="El scraper ya está en ejecución. Usa force=true para forzar.")

    scraper_path = Path(SCRAPER_DIR)
    if not scraper_path.exists():
        raise HTTPException(status_code=500, detail=f"Directorio del scraper no encontrado: {SCRAPER_DIR}")

    portales = [portal] if portal else PORTALES_SCRAPER

    # Marcar portales en ejecución
    now_str = datetime.now(timezone.utc).isoformat()
    if portal:
        await db.scraper_status.update_one(
            {"_id": "status", "portales.id": portal},
            {"$set": {"portales.$.estado": "corriendo", "portales.$.ultima": now_str}},
        )
    else:
        await db.scraper_status.update_one(
            {"_id": "status"},
            {"$set": {"estado_global": "corriendo"}},
            upsert=True,
        )

    for p in portales:
        asyncio.create_task(asyncio.create_subprocess_exec(
            "python", "scheduler.py", "--portal", p,
            cwd=str(scraper_path),
        ))

    msg = f"Portal {portal} iniciado" if portal else f"{len(portales)} portales iniciados en paralelo"
    return {"ok": True, "mensaje": msg, "portales": portales}

@router.post("/admin/scraper/portales/{portal_id}/reset")
async def admin_scraper_reset_portal(portal_id: str, request: Request):
    await require_admin(request)
    await db.scraper_status.update_one(
        {"_id": "status", "portales.id": portal_id},
        {"$set": {"portales.$.errores": 0, "portales.$.estado": "ok"}},
    )
    await db.scraper_logs.insert_one({
        "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
        "msg": f"Portal {portal_id}: errores reseteados manualmente desde el panel admin",
        "nivel": "info",
    })
    return {"ok": True}

@router.get("/admin/scraper/propiedades")
async def admin_scraper_propiedades(
    request: Request,
    tab: str = "CONSOLIDADO",
    page: int = 1,
    limite: int = 50,
    busqueda: str = "",
):
    await require_admin(request)
    from sheets_comparables import fetch_sheet_tab, parse_sheet_row, SHEET_TABS, SHEET_ID_DEFAULT
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    sheet_id = os.environ.get("GOOGLE_SHEETS_ID", SHEET_ID_DEFAULT)
    tab = tab if tab in SHEET_TABS else "CONSOLIDADO"
    rows = await fetch_sheet_tab(tab, api_key, sheet_id)
    if rows is None:
        rows = []
    parsed = [parse_sheet_row(r, tab) for r in rows]
    if busqueda:
        q = busqueda.lower()
        parsed = [p for p in parsed if q in (p.get("title") or "").lower()
                  or q in (p.get("municipality") or "").lower()
                  or q in (p.get("state") or "").lower()
                  or q in (p.get("neighborhood") or "").lower()]
    total = len(parsed)
    offset = (page - 1) * limite
    items = parsed[offset: offset + limite]
    return {"ok": True, "tab": tab, "total": total, "page": page, "items": items, "tabs": SHEET_TABS}
