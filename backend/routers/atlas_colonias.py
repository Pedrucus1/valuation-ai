"""Fase 4 del plan de federación: PropValu como consumidor pull del feed público
de atlas-colonias (GET /api/sync/feed) -- guarda un espejo en Mongo y confirma
de vuelta (POST /api/sync/ack). No toca colonias_decada.json (fuente cacheada en
memoria por proceso, ver core/colonias.py) ni el lookup real de valuación --
eso es una fase separada, deliberadamente.

Fase 6: copia local de identidad -- jala GET /api/sync/profiles (perfiles de
clasificador aprobados/revocados en atlas-colonias) a classifier_profiles_atlas,
para que require_admin_or_credentialed_contributor (core/auth.py) autorice sin
llamar al Atlas en cada request. Sin ack: los perfiles no tienen un ciclo de
"aplicado" como las propuestas, solo se reemplaza el espejo local."""
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin_or_job
from core.colonias import norm_col_key, norm_muni

router = APIRouter(prefix="/api")

SYNC_STATUS_ID = "atlas_colonias"
PROFILES_SYNC_STATUS_ID = "atlas_colonias_profiles"


@router.post("/admin/atlas-colonias/sync")
async def atlas_colonias_sync(request: Request):
    await require_admin_or_job(request)  # admin UI o cron externo (mismo patrón que #66.3)

    feed_url = os.environ.get("ATLAS_COLONIAS_FEED_URL", "").rstrip("/")
    if not feed_url:
        return {"ok": False, "error": "ATLAS_COLONIAS_FEED_URL no configurada."}
    api_key = os.environ.get("ATLAS_COLONIAS_API_KEY", "")
    headers = {"x-api-key": api_key} if api_key else {}

    status_doc = await db.colonia_sync_status.find_one({"_id": SYNC_STATUS_ID})
    cursor = (status_doc or {}).get("last_after", 0)
    last_seen = cursor

    pulled = synced = failed = 0
    now = datetime.now(timezone.utc)

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            resp = await client.get(f"{feed_url}/api/sync/feed", params={"after": cursor, "limit": 200}, headers=headers)
            if resp.status_code != 200:
                return {"ok": False, "error": f"Feed respondió {resp.status_code}: {resp.text[:300]}"}
            data = resp.json()
            records = data.get("records", [])
            pulled += len(records)

            for record in records:
                colonia_norm = norm_col_key(record.get("colonyName", ""))
                municipio_norm = norm_muni(record.get("municipality", ""))
                try:
                    await db.colonia_classifications_atlas.update_one(
                        {"atlas_proposal_id": record["id"]},
                        {"$set": {**record, "colonia_norm": colonia_norm, "municipio_norm": municipio_norm, "synced_at": now.isoformat()}},
                        upsert=True,
                    )
                    ack_status, ack_note = "synced", None
                    synced += 1
                except Exception as exc:
                    ack_status, ack_note = "failed", str(exc)[:300]
                    failed += 1
                await client.post(f"{feed_url}/api/sync/ack", json={"id": record["id"], "status": ack_status, "consumer": "propvalu", "note": ack_note}, headers=headers)
                last_seen = record["id"]

            next_after = data.get("nextAfter")
            if not next_after:
                break
            cursor = next_after

    await db.colonia_sync_status.update_one(
        {"_id": SYNC_STATUS_ID},
        {"$set": {"last_after": last_seen, "last_run_at": now.isoformat(), "last_pulled": pulled, "last_synced": synced, "last_failed": failed}},
        upsert=True,
    )
    await db.colonia_sync_log.insert_one({
        "ts": now.strftime("%H:%M:%S"),
        "fecha": now.date().isoformat(),
        "msg": f"Sync atlas-colonias: {pulled} jaladas, {synced} aplicadas, {failed} fallidas",
        "nivel": "info" if not failed else "warning",
    })

    return {"ok": True, "pulled": pulled, "synced": synced, "failed": failed}


@router.post("/admin/atlas-colonias/sync-profiles")
async def atlas_colonias_sync_profiles(request: Request):
    await require_admin_or_job(request)

    feed_url = os.environ.get("ATLAS_COLONIAS_FEED_URL", "").rstrip("/")
    if not feed_url:
        return {"ok": False, "error": "ATLAS_COLONIAS_FEED_URL no configurada."}
    api_key = os.environ.get("ATLAS_COLONIAS_API_KEY", "")
    headers = {"x-api-key": api_key} if api_key else {}

    status_doc = await db.colonia_sync_status.find_one({"_id": PROFILES_SYNC_STATUS_ID})
    cursor = (status_doc or {}).get("last_after", 0)
    last_seen = cursor
    pulled = 0
    now = datetime.now(timezone.utc)

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            resp = await client.get(f"{feed_url}/api/sync/profiles", params={"after": cursor, "limit": 200}, headers=headers)
            if resp.status_code != 200:
                return {"ok": False, "error": f"Feed de perfiles respondió {resp.status_code}: {resp.text[:300]}"}
            data = resp.json()
            records = data.get("records", [])
            pulled += len(records)

            for record in records:
                email = (record.get("email") or "").strip().lower()
                if not email:
                    continue
                await db.classifier_profiles_atlas.update_one(
                    {"atlas_profile_id": record["id"]},
                    {"$set": {**record, "email": email, "synced_at": now.isoformat()}},
                    upsert=True,
                )
                last_seen = record["id"]

            next_after = data.get("nextAfter")
            if not next_after:
                break
            cursor = next_after

    await db.colonia_sync_status.update_one(
        {"_id": PROFILES_SYNC_STATUS_ID},
        {"$set": {"last_after": last_seen, "last_run_at": now.isoformat(), "last_pulled": pulled}},
        upsert=True,
    )
    return {"ok": True, "pulled": pulled}
