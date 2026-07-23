"""Anuncios y anunciantes: moderación admin, auth/campañas/creatividades de
anunciantes, ads públicos (active/track) y analytics."""
import os
import uuid
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form

from core.db import db
from core.auth import require_admin, require_auth, pwd_context
from core.ratelimit import limiter
from core.config import ADS_DIR
from core.pricing import PRECIOS_DEFAULT

router = APIRouter(prefix="/api")

# Límites de creatividades (deben coincidir con SLOT_SPECS del frontend)
VIDEO_MAX_MB = {"slot1": 25, "slot2": 12, "slot3": 6}
IMAGE_MAX_MB = 10                  # imagen original (el front ya comprime a WebP)
MAX_VIDEOS_POR_ANUNCIANTE = 5
MAX_IMAGENES_POR_ANUNCIANTE = 25


def _compress_video(raw_bytes: bytes) -> bytes:
    """Recomprime a calidad web (720p, CRF 26) vía ffmpeg. Si falla o no
    hay ffmpeg, devuelve el archivo original sin tocar (nunca rompe el upload)."""
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.mp4")
        dst = os.path.join(tmp, "out.mp4")
        with open(src, "wb") as f:
            f.write(raw_bytes)
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", src, "-vf", "scale='min(1280,iw)':-2",
                 "-c:v", "libx264", "-crf", "26", "-preset", "veryfast",
                 "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dst],
                check=True, capture_output=True, timeout=120,
            )
            with open(dst, "rb") as f:
                compressed = f.read()
            return compressed if compressed and len(compressed) < len(raw_bytes) else raw_bytes
        except Exception:
            return raw_bytes


@router.post("/advertisers/anuncios")
async def crear_anuncio(request: Request):
    """Anunciante sube un anuncio nuevo, queda en estado 'pendiente'."""
    user = await require_auth(request)
    body = await request.json()
    doc = {
        "ad_id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "anunciante": user.name or user.email,
        "email": user.email,
        "tipo": body.get("tipo", "comparables_banner"),
        "titulo": body.get("titulo", ""),
        "descripcion": body.get("descripcion", ""),
        "imagen_url": body.get("imagen_url"),
        "link_web": body.get("link_web"),
        "link_wa": body.get("link_wa"),
        "zona": body.get("zona"),
        "estado": "pendiente",
        "flags": [],
        "motivo_rechazo": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Auto-flag de contenido sospechoso
    texto = f"{doc['titulo']} {doc['descripcion']}".upper()
    if sum(1 for c in texto if c.isupper()) / max(len(texto), 1) > 0.5:
        doc["flags"].append("mayusculas_exceso")
    for palabra in ["GARANTIZADO", "GARANTIZAMOS", "100% SEGURO", "SIN RIESGO"]:
        if palabra in texto:
            doc["flags"].append("garantias_absolutas")
            break
    await db.anuncios.insert_one(doc)
    return {"ok": True, "ad_id": doc["ad_id"]}

@router.get("/advertisers/mis-anuncios")
async def mis_anuncios(request: Request):
    user = await require_auth(request)
    items = await db.anuncios.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"anuncios": items}

# Mercado público -> routers/mercado.py (#66.1)

@router.get("/admin/anuncios")
async def admin_anuncios_list(request: Request, estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if estado:
        filtro["estado"] = estado
    items = await db.anuncios.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"anuncios": items, "total": len(items)}

@router.post("/admin/anuncios/{ad_id}/aprobar")
async def admin_anuncio_aprobar(ad_id: str, request: Request):
    await require_admin(request)
    result = await db.anuncios.update_one(
        {"ad_id": ad_id},
        {"$set": {"estado": "aprobado", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
    return {"ok": True}

@router.post("/admin/anuncios/{ad_id}/rechazar")
async def admin_anuncio_rechazar(ad_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    motivo = body.get("motivo", "")
    result = await db.anuncios.update_one(
        {"ad_id": ad_id},
        {"$set": {
            "estado": "rechazado",
            "motivo_rechazo": motivo,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
    return {"ok": True}

# ============== ANUNCIANTES — AUTH, CAMPAÑAS, CREATIVIDADES ==============

# Vigencia del token de anunciante (S3). Token sin expiry (legacy) → re-login.
ADVERTISER_TOKEN_TTL_DAYS = 30


def _advertiser_token_expiry() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=ADVERTISER_TOKEN_TTL_DAYS)).isoformat()


async def require_advertiser(request: Request):
    token = request.headers.get("X-Advertiser-Token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token de anunciante requerido")
    advertiser = await db.advertisers.find_one({"session_token": token, "activo": True}, {"_id": 0})
    if not advertiser:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")
    exp = advertiser.get("session_expires_at")
    if not exp:
        raise HTTPException(status_code=401, detail="Sesión expirada, vuelve a iniciar sesión")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesión expirada, vuelve a iniciar sesión")
    return advertiser

@router.post("/advertisers/register")
@limiter.limit("10/minute")
async def advertiser_register(request: Request):
    try:
        body = await request.json()
        email = body.get("email", "").lower().strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email requerido")
        if await db.advertisers.find_one({"email": email}):
            raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
        token = uuid.uuid4().hex
        doc = {
            "advertiser_id": uuid.uuid4().hex,
            "company_name": body.get("company_name", ""),
            "contact_name": body.get("contact_name", ""),
            "email": email,
            "phone": body.get("phone", ""),
            "rfc": body.get("rfc", ""),
            "giro": body.get("giro", ""),
            "regimen_fiscal": body.get("regimen_fiscal", ""),
            "uso_cfdi": body.get("uso_cfdi", ""),
            "password_hash": pwd_context.hash(body.get("password", "")),
            "session_token": token,
            "session_expires_at": _advertiser_token_expiry(),
            "activo": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.advertisers.insert_one(doc)
        return {"ok": True, "session_token": token, "company_name": doc["company_name"],
                "contact_name": doc["contact_name"], "email": doc["email"],
                "rfc": doc["rfc"], "giro": doc["giro"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error en /advertisers/register: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al crear cuenta: {str(e)}")

@router.post("/advertisers/login")
@limiter.limit("10/minute")
async def advertiser_login(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    advertiser = await db.advertisers.find_one({"email": email})
    if not advertiser or not pwd_context.verify(body.get("password", ""), advertiser.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    token = uuid.uuid4().hex
    await db.advertisers.update_one(
        {"email": email},
        {"$set": {"session_token": token, "session_expires_at": _advertiser_token_expiry()}},
    )
    return {"ok": True, "session_token": token, "company_name": advertiser["company_name"],
            "contact_name": advertiser["contact_name"], "email": advertiser["email"],
            "rfc": advertiser["rfc"], "giro": advertiser["giro"]}

@router.post("/advertisers/campaigns")
async def create_campaign(request: Request):
    advertiser = await require_advertiser(request)
    body = await request.json()
    budget = float(body.get("budget", 0))
    campaign = {
        "campaign_id": uuid.uuid4().hex,
        "advertiser_id": advertiser["advertiser_id"],
        "company_name": advertiser["company_name"],
        "name": body.get("name", ""),
        "slot": body.get("slot", "slot1"),
        "ad_duration": int(body.get("ad_duration", 15)),
        "targeting": body.get("targeting", "Municipal"),
        "zone": body.get("zone", ""),
        "budget": budget,
        "budget_remaining": budget,
        "duration_type": body.get("duration_type", "agotar"),
        "start": body.get("start", ""),
        "end": body.get("end") or None,
        "link_type": body.get("link_type", "web"),
        "link_url": body.get("link_url", ""),
        "status": "pending",
        "impressions": 0,
        "spend": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ad_campaigns.insert_one(campaign)
    out = {k: v for k, v in campaign.items() if k != "_id"}
    out["id"] = out["campaign_id"]
    return {"ok": True, "campaign": out}

@router.get("/advertisers/campaigns")
async def get_campaigns(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_campaigns.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for c in items:
        c["id"] = c.get("campaign_id", "")
    return {"campaigns": items}

@router.post("/advertisers/creatives/upload")
async def upload_creative(
    request: Request,
    campaign_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
):
    token = request.headers.get("X-Advertiser-Token", "")
    advertiser = await db.advertisers.find_one({"session_token": token, "activo": True}, {"_id": 0})
    if not advertiser:
        raise HTTPException(status_code=401, detail="Token inválido")
    allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Formato no permitido")
    is_video = file.content_type == "video/mp4"

    # Slot de la campaña → límite de tamaño del video
    campaign = await db.ad_campaigns.find_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]},
        {"_id": 0, "slot": 1},
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    slot = campaign.get("slot", "slot1")

    # Tope de archivos por anunciante (no somos bodega de archivos)
    tope = MAX_VIDEOS_POR_ANUNCIANTE if is_video else MAX_IMAGENES_POR_ANUNCIANTE
    usados = await db.ad_creatives.count_documents({
        "advertiser_id": advertiser["advertiser_id"],
        "file_type": "video" if is_video else "image",
    })
    if usados >= tope:
        raise HTTPException(
            status_code=400,
            detail=f"Límite alcanzado: máximo {tope} {'videos' if is_video else 'imágenes'} "
                   "por anunciante. Elimina alguna creatividad para subir otra.",
        )

    content = await file.read()
    if is_video:
        content = _compress_video(content)
    # Tamaño máximo
    max_mb = VIDEO_MAX_MB.get(slot, 25) if is_video else IMAGE_MAX_MB
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El archivo excede el máximo de {max_mb} MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(ADS_DIR / filename, "wb") as f:
        f.write(content)
    creative = {
        "creative_id": uuid.uuid4().hex,
        "advertiser_id": advertiser["advertiser_id"],
        "campaign_id": campaign_id,
        "name": name,
        "file_url": f"/uploads/ads/{filename}",
        "file_type": "video" if file.content_type == "video/mp4" else "image",
        "size_bytes": len(content),
        "status": "pendiente_revision",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ad_creatives.insert_one(creative)
    out = {k: v for k, v in creative.items() if k != "_id"}
    out["id"] = out["creative_id"]
    return {"ok": True, "creative": out}

@router.get("/advertisers/creatives")
async def get_creatives(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_creatives.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(200)
    for c in items:
        c["id"] = c.get("creative_id", "")
    return {"creatives": items}

@router.get("/advertisers/transactions")
async def get_transactions(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_transactions.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for t in items:
        t["id"] = t.get("transaction_id", "")
    return {"transactions": items}

@router.post("/advertisers/campaigns/{campaign_id}/pausar")
async def pausar_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@router.post("/advertisers/campaigns/{campaign_id}/reactivar")
async def reactivar_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@router.delete("/advertisers/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    campaign = await db.ad_campaigns.find_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]}, {"_id": 0, "status": 1}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    if campaign["status"] not in ("pending",):
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar campañas pendientes de aprobación")
    await db.ad_campaigns.delete_one({"campaign_id": campaign_id})
    await db.ad_creatives.delete_many({"campaign_id": campaign_id})
    return {"ok": True}

@router.put("/advertisers/campaigns/{campaign_id}")
async def edit_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    campaign = await db.ad_campaigns.find_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]}, {"_id": 0, "status": 1}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    if campaign["status"] not in ("pending",):
        raise HTTPException(status_code=400, detail="Solo se pueden editar campañas pendientes de aprobación")
    body = await request.json()
    update = {
        "name": body.get("name"),
        "slot": body.get("slot"),
        "ad_duration": int(body.get("ad_duration", 15)),
        "targeting": body.get("targeting"),
        "zone": body.get("zone"),
        "budget": float(body.get("budget", 0)),
        "duration_type": body.get("duration_type"),
        "start": body.get("start"),
        "end": body.get("end") or None,
        "link_type": body.get("link_type"),
        "link_url": body.get("link_url", "").strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    update = {k: v for k, v in update.items() if v is not None}
    await db.ad_campaigns.update_one({"campaign_id": campaign_id}, {"$set": update})
    updated = await db.ad_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    updated["id"] = updated["campaign_id"]
    return {"ok": True, "campaign": updated}

@router.get("/admin/creatives")
async def admin_list_creatives(request: Request, status: str = "pendiente_revision"):
    await require_admin(request)
    query: Dict[str, Any] = {} if status == "todos" else {"status": status}
    items = await db.ad_creatives.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(100)
    for cr in items:
        cr["id"] = cr.get("creative_id", "")
        adv = await db.advertisers.find_one({"advertiser_id": cr["advertiser_id"]}, {"_id": 0})
        cr["company_name"] = adv.get("company_name", "") if adv else ""
        camp = await db.ad_campaigns.find_one({"campaign_id": cr["campaign_id"]}, {"_id": 0})
        cr["campaign_name"] = camp.get("name", "") if camp else ""
    return {"creatives": items}

@router.post("/admin/creatives/{creative_id}/aprobar")
async def admin_creative_aprobar(creative_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "aprobado"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creatividad no encontrada")
    return {"ok": True}

@router.post("/admin/creatives/{creative_id}/rechazar")
async def admin_creative_rechazar(creative_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "rechazado", "motivo_rechazo": body.get("motivo", "")}}
    )
    return {"ok": True}

@router.post("/admin/campaigns/{campaign_id}/activar")
async def admin_campaign_activar(campaign_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@router.post("/admin/campaigns/{campaign_id}/pausar")
async def admin_campaign_pausar(campaign_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@router.get("/admin/campaigns")
async def admin_campaigns_list(request: Request, status: str = "", advertiser_id: str = ""):
    await require_admin(request)
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if advertiser_id:
        query["advertiser_id"] = advertiser_id
    campaigns = await db.ad_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Cargar blacklist para detectar flags en URLs
    bl_cfg = await db.config.find_one({"key": "blacklist"}) or {}
    dominios_bl = [d.lower() for d in bl_cfg.get("dominios", [])]
    palabras_bl = [p.lower() for p in bl_cfg.get("palabras", [])]
    for c in campaigns:
        c["id"] = c.get("campaign_id", "")
        # Join advertiser info
        adv = await db.advertisers.find_one({"advertiser_id": c.get("advertiser_id")}, {"_id": 0, "company_name": 1, "email": 1, "contact_name": 1})
        c["advertiser"] = adv or {}
        # Creatives — incluir lista completa para previsualización y moderación inline
        creatives = await db.ad_creatives.find(
            {"campaign_id": c.get("campaign_id")}, {"_id": 0}
        ).sort("uploaded_at", 1).to_list(50)
        for cr in creatives:
            cr["id"] = cr.get("creative_id", "")
        c["creatives"] = creatives
        c["creatives_total"] = len(creatives)
        c["creatives_aprobadas"] = sum(1 for cr in creatives if cr.get("status") == "aprobado")
        c["creatives_pendientes"] = sum(1 for cr in creatives if cr.get("status") == "pendiente_revision")
        # Detección de flags de blacklist en URL y nombre
        flags = []
        link = (c.get("link_url") or "").lower()
        nombre = (c.get("name") or "").lower()
        for dom in dominios_bl:
            if dom and dom in link:
                flags.append(f"dominio_bl:{dom}")
        for pal in palabras_bl:
            if pal and pal in nombre:
                flags.append(f"palabra_bl:{pal}")
        c["flags"] = flags
    return {"campaigns": campaigns}

@router.post("/admin/campaigns/{campaign_id}/creatives/{creative_id}/aprobar")
async def admin_inline_creative_aprobar(campaign_id: str, creative_id: str, request: Request):
    await require_admin(request)
    await db.ad_creatives.update_one({"creative_id": creative_id}, {"$set": {"status": "aprobado"}})
    return {"ok": True}

@router.post("/admin/campaigns/{campaign_id}/creatives/{creative_id}/rechazar")
async def admin_inline_creative_rechazar(campaign_id: str, creative_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "rechazado", "motivo_rechazo": body.get("motivo", "")}}
    )
    return {"ok": True}

@router.get("/admin/anunciantes")
async def admin_anunciantes_list(request: Request, q: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if q:
        filtro["$or"] = [
            {"company_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"contact_name": {"$regex": q, "$options": "i"}},
        ]
    advertisers = await db.advertisers.find(filtro, {"_id": 0, "password_hash": 0, "session_token": 0}).sort("created_at", -1).to_list(200)
    for adv in advertisers:
        adv["id"] = adv.get("advertiser_id", "")
        camp_total = await db.ad_campaigns.count_documents({"advertiser_id": adv.get("advertiser_id")})
        camp_activas = await db.ad_campaigns.count_documents({"advertiser_id": adv.get("advertiser_id"), "status": "active"})
        total_spend = 0
        camps = await db.ad_campaigns.find({"advertiser_id": adv.get("advertiser_id")}, {"_id": 0, "spend": 1, "budget": 1}).to_list(100)
        total_budget = sum(c.get("budget", 0) for c in camps)
        total_spend = sum(c.get("spend", 0) for c in camps)
        adv["campaigns_total"] = camp_total
        adv["campaigns_activas"] = camp_activas
        adv["total_budget"] = total_budget
        adv["total_spend"] = total_spend
    return {"anunciantes": advertisers}

@router.get("/ads/active")
async def get_active_ad(slot: str = "slot1", zone: str = ""):
    """Devuelve un anuncio activo aprobado para el slot/zona. Endpoint público."""
    query: Dict[str, Any] = {"slot": slot, "status": "active"}
    if zone:
        query["$or"] = [{"zone": zone}, {"targeting": "Federal"}, {"targeting": "Estatal"}]
    campaigns = await db.ad_campaigns.find(query, {"_id": 0}).to_list(50)
    if not campaigns:
        return {"ad": None}
    campaign = sorted(campaigns, key=lambda c: c.get("impressions", 0))[0]
    creative = await db.ad_creatives.find_one(
        {"campaign_id": campaign["campaign_id"], "status": "aprobado"}, {"_id": 0}
    )
    if not creative:
        return {"ad": None}
    default_durations = {"slot1": 60, "slot2": 30, "slot3": 15}
    backend_url = os.environ.get("BACKEND_URL", "")
    file_url = creative["file_url"]
    if not file_url.startswith("http"):
        file_url = f"{backend_url}{file_url}"
    return {"ad": {
        "ad_id": campaign["campaign_id"],
        "creative_id": creative["creative_id"],
        "file_url": file_url,
        "file_type": creative["file_type"],
        "duration": campaign.get("ad_duration") or default_durations.get(slot, 15),
        "link_type": campaign.get("link_type", "web"),
        "link_url": campaign.get("link_url", ""),
        "company_name": campaign.get("company_name", ""),
    }}

# ============== ADS — TRACKING & ANALYTICS ==============

@router.post("/ads/track")
async def ads_track(request: Request):
    """Registra una impresión o click. Endpoint público, sin auth."""
    body = await request.json()
    ad_id = body.get("ad_id")
    tipo = body.get("tipo")  # "impresion" | "click"
    if not ad_id or tipo not in ("impresion", "click"):
        raise HTTPException(status_code=400, detail="ad_id y tipo requeridos")
    now = datetime.now(timezone.utc)
    await db.ad_events.insert_one({
        "ad_id": ad_id,
        "tipo": tipo,
        "fecha": now.strftime("%Y-%m-%d"),
        "ts": now.isoformat(),
    })
    # Incrementar en anuncios (sistema legado) y en ad_campaigns (nuevo sistema)
    field = "impresiones" if tipo == "impresion" else "clicks"
    await db.anuncios.update_one({"ad_id": ad_id}, {"$inc": {field: 1}})
    field_new = "impressions" if tipo == "impresion" else "clicks"
    spend_inc = {}
    if tipo == "impresion":
        campaign = await db.ad_campaigns.find_one({"campaign_id": ad_id}, {"_id": 0, "slot": 1, "ad_duration": 1})
        if campaign:
            config_doc = await db.config.find_one({"_id": "precios"})
            precios_cfg = config_doc if config_doc else PRECIOS_DEFAULT
            slot = campaign.get("slot", "slot3")
            dur = campaign.get("ad_duration", 15)
            key = f"ad_{slot}_{dur}s"
            entry = precios_cfg.get(key) or PRECIOS_DEFAULT.get(key, {})
            price = entry.get("precio", 5) if isinstance(entry, dict) else 5
            spend_inc = {"spend": price, "budget_remaining": -price}
    await db.ad_campaigns.update_one(
        {"campaign_id": ad_id},
        {"$inc": {field_new: 1, **spend_inc}}
    )
    return {"ok": True}

@router.get("/admin/ads/analytics")
async def admin_ads_analytics(request: Request):
    await require_admin(request)
    anuncios = await db.anuncios.find(
        {"estado": {"$nin": ["rechazado"]}}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    # Últimos 7 días para mini gráficas
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    last7 = [(today - timedelta(days=6 - i)).strftime("%Y-%m-%d") for i in range(7)]

    result = []
    for ad in anuncios:
        ad_id = ad["ad_id"]
        imp_total = ad.get("impresiones", 0)
        clk_total = ad.get("clicks", 0)
        ctr = round((clk_total / imp_total * 100), 1) if imp_total > 0 else 0.0

        # Agregado por día últimos 7 días
        events = await db.ad_events.find(
            {"ad_id": ad_id, "fecha": {"$in": last7}}, {"_id": 0, "tipo": 1, "fecha": 1}
        ).to_list(10000)

        imp_by_day = {d: 0 for d in last7}
        clk_by_day = {d: 0 for d in last7}
        for ev in events:
            if ev["tipo"] == "impresion":
                imp_by_day[ev["fecha"]] = imp_by_day.get(ev["fecha"], 0) + 1
            else:
                clk_by_day[ev["fecha"]] = clk_by_day.get(ev["fecha"], 0) + 1

        result.append({
            "id": ad_id,
            "anunciante": ad.get("anunciante", ""),
            "slot": ad.get("tipo", "comparables_banner"),
            "impresiones": imp_total,
            "clicks": clk_total,
            "ctr": ctr,
            "impresiones_semana": [imp_by_day[d] for d in last7],
            "clicks_semana": [clk_by_day[d] for d in last7],
            "estado": ad.get("estado", "pendiente"),
            "inicio": ad.get("created_at", "")[:10],
            "fin": ad.get("fin", ""),
            "presupuesto": ad.get("presupuesto", 0),
        })

    return {"anuncios": result}

# Admin valuadores + reportes -> routers/admin_reportes.py (#66.1)

# Directorio público -> routers/directorio.py (#66.1)
