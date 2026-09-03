from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
import logging
import json
import subprocess
from pathlib import Path

MOTOR_DIR = Path(__file__).parent.parent / "Modulo Drive IA"
MOTOR_SCRIPT = str(MOTOR_DIR / "motor_remi_api.js")
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
import time as _time
from datetime import datetime, timezone, timedelta
import httpx
import base64
import asyncio
from passlib.context import CryptContext

from core.cache import _cache_get, _cache_set, _mercado_cache


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
from core.db import client, db

# Import scraper (fallback)
from scraper import scrape_all_sources, get_rental_factor, calculate_market_metrics, ScrapedProperty

# Import AI comparables search (primary)
from ai_comparables import (
    search_comparables_with_ai,
    search_rental_comparables,
    calculate_rental_factor_from_ai,
    AIComparable
)
from sheets_comparables import search_comparables_from_sheets
from mongo_comparables import search_comparables_from_mongo

# Import report generator
from report_generator import generate_html_report

# Observabilidad opcional (Sentry). No-op si no hay SENTRY_DSN o si el paquete
# no está instalado. Para activar en prod: setear SENTRY_DSN (el DSN del proyecto
# de Sentry). Captura excepciones no manejadas automáticamente (auto-instrumenta FastAPI).
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=_sentry_dsn,
            environment=os.environ.get("RAILWAY_ENVIRONMENT_NAME", "production"),
            traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            send_default_pii=False,
        )
        logging.info("[startup] Sentry inicializado")
    except Exception as e:
        logging.error(f"[startup] Sentry no se pudo inicializar: {e}")

# Create the main app
app = FastAPI(title="PropValu Mexico API")

# Rate limiting (S4): limiter compartido + handler de 429.
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.ratelimit import limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

import re as _re
import calendar
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

_scheduler = AsyncIOScheduler()

def _is_localhost(origin: str) -> bool:
    return bool(_re.match(r"^https?://localhost(:\d+)?$", origin))

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if _is_localhost(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    # Detalle completo SOLO al log del servidor; al cliente, mensaje genérico
    # (evita filtrar rutas internas, mensajes de DB, etc.).
    logging.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Intenta de nuevo más tarde."},
        headers=headers,
    )

# Métricas básicas (#66.5): mide cada request (conteo, latencia, errores).
# Usa la ruta-plantilla (no la URL con IDs) para no explotar la cardinalidad.
from core import metrics as _metrics

class _MetricsMiddleware:
    """ASGI puro (no BaseHTTPMiddleware): mide cada request SIN buffear la respuesta.
    BaseHTTPMiddleware buffea el body completo y rompe el streaming de archivos grandes
    (los videos de /uploads se quedaban en readyState 0 = negro en el navegador)."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        _t0 = _time.perf_counter()
        status = {"code": 500}

        async def _send(message):
            if message["type"] == "http.response.start":
                status["code"] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, _send)
        finally:
            route = scope.get("route")
            path = getattr(route, "path", None) or scope.get("path", "")
            _metrics.record(
                scope.get("method", ""), path, status["code"], (_time.perf_counter() - _t0) * 1000.0
            )

app.add_middleware(_MetricsMiddleware)


class _ActivityLogMiddleware:
    """ASGI puro (mismo patrón que _MetricsMiddleware, sin buffear body en general —
    solo se acumula el body de la respuesta cuando status>=400, que siempre es JSON
    chico; nunca se toca el streaming de /uploads). Persiste a db.activity_log para
    que el admin vea errores sin depender de los logs de Railway."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        _t0 = _time.perf_counter()
        state = {"code": 200, "body": b"", "capture": False}

        async def _send(message):
            if message["type"] == "http.response.start":
                state["code"] = message["status"]
                state["capture"] = state["code"] >= 400
            elif message["type"] == "http.response.body" and state["capture"]:
                state["body"] += message.get("body", b"") or b""
            await send(message)

        try:
            await self.app(scope, receive, _send)
        finally:
            if state["code"] >= 400:
                route = scope.get("route")
                path = getattr(route, "path", None) or scope.get("path", "")
                try:
                    mensaje = state["body"][:500].decode("utf-8", errors="replace")
                except Exception:
                    mensaje = ""
                asyncio.create_task(_log_activity_error(
                    scope, path, state["code"], mensaje, (_time.perf_counter() - _t0) * 1000.0
                ))


async def _log_activity_error(scope, path, status_code, mensaje, duration_ms):
    """Fire-and-forget: nunca debe tumbar el request real si Mongo falla."""
    try:
        from starlette.requests import Request as _StarletteRequest
        from core.auth import get_current_user as _get_current_user
        req = _StarletteRequest(scope)
        email = None
        try:
            user = await _get_current_user(req)
            email = user.email if user else None
        except Exception:
            pass
        await db.activity_log.insert_one({
            "tipo": "error",
            "ts": datetime.now(timezone.utc).isoformat(),
            "method": scope.get("method", ""),
            "path": path,
            "status": status_code,
            "mensaje": mensaje,
            "email": email,
            "duration_ms": round(duration_ms, 1),
            "ip": scope.get("client", ["", 0])[0],
        })
    except Exception:
        pass


app.add_middleware(_ActivityLogMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS (extraídos a models.py) ==============

from models import (
    PROPERTY_TYPES, User, RegisterRequest, LoginRequest, UserSession,
    PropertyInput, Comparable, MarketMetrics, ValuationResult, Valuation,
)

# ============== AUTH HELPERS (extraídos a core/auth.py) ==============

from core.auth import get_current_user, require_auth, require_admin, require_admin_or_job, pwd_context, new_admin_token_expiry
import hmac
from core.accesos import _acceso_estado
from core.pricing import PRECIOS_DEFAULT
from routers.access import router as access_router
from routers.newsletter import router as newsletter_router
from routers.cms import router as cms_router
from routers.feedback import router as feedback_router
from routers.admin_config import router as admin_config_router
from routers.admin_misc import router as admin_misc_router
from routers.admin_activity import router as admin_activity_router
from routers.admin_inmobiliarias import router as admin_inmobiliarias_router
from routers.admin_reportes import router as admin_reportes_router
from routers.directorio import router as directorio_router
from routers.auth import router as auth_router
from routers.admin_usuarios import router as admin_usuarios_router
from routers.kyc import router as kyc_router
from routers.admin_scraper import router as admin_scraper_router
from routers.mercado import router as mercado_router
from routers.ads import router as ads_router
from routers.encargos import router as encargos_router
from routers.inmobiliaria import router as inmobiliaria_router
from routers.mercado_accesos import router as mercado_accesos_router, _seed_mercado_accesos
from routers.reviews import router as reviews_router
from routers.edades import router as edades_router, _edad_efectiva as _edad_efectiva_ponderada
from routers.data_exchange import router as data_exchange_router
from routers.gamificacion import router as gamificacion_router
from routers.admin_auth import router as admin_auth_router
from routers.requisiciones import router as requisiciones_router
from routers.acabados import router as acabados_router
from routers.atlas_colonias import router as atlas_colonias_router
from routers.flipping import router as flipping_router

# Auth y sesión -> routers/auth.py (#66.1)

# ============== VALUATION ENDPOINTS ==============

@api_router.post("/valuations", response_model=dict)
@limiter.limit("30/hour")
async def create_valuation(request: Request, property_input: PropertyInput):
    user = await get_current_user(request)
    
    mode = "public"
    user_id = None
    
    if user:
        user_id = user.user_id
        if user.role == "appraiser":
            mode = "private"
    
    valuation = Valuation(
        user_id=user_id,
        mode=mode,
        property_data=property_input,
        status="draft"
    )
    
    doc = valuation.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    doc["consultation_date"] = doc["consultation_date"].isoformat()
    doc["property_data"]["special_features"] = doc["property_data"].get("special_features") or []
    doc["property_data"]["photos"] = doc["property_data"].get("photos") or []
    
    await db.valuations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/valuations", response_model=List[dict])
async def get_valuations(request: Request):
    user = await get_current_user(request)
    
    if not user:
        return []
    
    valuations = await db.valuations.find(
        {"user_id": user.user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return valuations

async def _puede_acceder_valuacion(request: Request, owner_id: str) -> bool:
    """True si el solicitante es el dueño, de la misma inmobiliaria, o admin.
    Las valuaciones sin user_id (flujo público anónimo) no pasan por aquí — se
    acceden por link (el valuation_id funciona como llave)."""
    admin_token = request.headers.get("X-Admin-Token", "")
    if admin_token and await db.admins.find_one({"token": admin_token, "activo": True}):
        return True
    user = await get_current_user(request)
    if not user:
        return False
    if user.user_id == owner_id or user.role == "super_admin":
        return True
    # Misma inmobiliaria: el titular y sus asesores comparten avalúos de la empresa
    ut = (user.company_name or user.empresa_afiliada or "").strip().lower()
    if ut:
        owner = await db.users.find_one(
            {"user_id": owner_id}, {"_id": 0, "company_name": 1, "empresa_afiliada": 1}
        )
        if owner:
            ot = (owner.get("company_name") or owner.get("empresa_afiliada") or "").strip().lower()
            if ot and ot == ut:
                return True
    return False


@api_router.get("/valuations/{valuation_id}")
async def get_valuation(valuation_id: str, request: Request):
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )

    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")

    # Control de acceso: valuaciones de un usuario registrado solo las ve el
    # dueño / su inmobiliaria / admin. Las anónimas (sin user_id) por link.
    owner_id = valuation.get("user_id")
    if owner_id and not await _puede_acceder_valuacion(request, owner_id):
        raise HTTPException(status_code=403, detail="No autorizado para ver esta valuación")

    # Al abrir la OPI se apaga el aviso de la campana del dashboard (comparables_job
    # ya listo/sin_datos y aún no visto).
    job = valuation.get("comparables_job")
    if job and job.get("status") in ("listo", "sin_datos") and not job.get("notified"):
        job["notified"] = True
        await db.valuations.update_one(
            {"valuation_id": valuation_id},
            {"$set": {"comparables_job.notified": True}}
        )

    return valuation

@api_router.post("/valuations/{valuation_id}/upload-photos")
async def upload_photos(
    valuation_id: str,
    photos: List[UploadFile] = File(...),
    request: Request = None
):
    """Upload photos for a valuation (max 16)"""
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")

    # Mismo control que la lectura: si pertenece a un usuario, solo dueño/inmobiliaria/admin.
    owner_id = valuation.get("user_id")
    if owner_id and not await _puede_acceder_valuacion(request, owner_id):
        raise HTTPException(status_code=403, detail="No autorizado para modificar esta valuación")

    if len(photos) > 16:
        raise HTTPException(status_code=400, detail="Máximo 16 fotos permitidas")
    
    photo_data = []
    for photo in photos[:16]:
        content = await photo.read()
        # Limit size to 5MB per photo
        if len(content) > 5 * 1024 * 1024:
            continue
        
        # Convert to base64
        b64 = base64.b64encode(content).decode('utf-8')
        content_type = photo.content_type or 'image/jpeg'
        photo_data.append(f"data:{content_type};base64,{b64}")
    
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "property_data.photos": photo_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": f"{len(photo_data)} fotos subidas", "count": len(photo_data)}

@api_router.post("/valuations/{valuation_id}/update-location")
async def update_location(valuation_id: str, request: Request):
    """Update property location coordinates"""
    body = await request.json()
    latitude = body.get("latitude")
    longitude = body.get("longitude")
    
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Coordenadas requeridas")
    
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "property_data.latitude": latitude,
                "property_data.longitude": longitude,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Ubicación actualizada"}


def _edad(anio) -> Optional[int]:
    """Edad en años a partir del año de construcción (None si no hay dato válido)."""
    try:
        anio = int(anio)
    except (TypeError, ValueError):
        return None
    edad = datetime.now(timezone.utc).year - anio
    return edad if 0 <= edad <= 200 else None


async def _enrich_comp_urls(urls: list, deadline: float = 22.0) -> dict:
    """Abre las páginas de detalle de comparables web (subprocess enrich_urls.py)
    y devuelve {url: {anio_construccion, m2_construccion, m2_terreno, recamaras,
    banos, estacionamientos, telefono, inmobiliaria, nombre_agente, email_agente}}.
    Nunca lanza: ante error/timeout devuelve {} y el avalúo sigue con el snippet."""
    urls = [u for u in (urls or []) if isinstance(u, str) and u.startswith("http")]
    if not urls:
        return {}
    python_exe = os.environ.get("SCRAPER_PYTHON", "python")
    proc = None
    try:
        proc = await asyncio.create_subprocess_exec(
            python_exe, "enrich_urls.py", "--deadline", str(deadline),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=str(SCRAPER_DIR),
        )
        stdout, _ = await asyncio.wait_for(
            proc.communicate(input=json.dumps(urls).encode()), timeout=deadline + 8
        )
        data = json.loads((stdout.decode() or "{}").strip() or "{}")
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logging.warning(f"[enrich_comps] enriquecimiento web no disponible (no crítico): {e}")
        try:
            if proc:
                proc.kill()
        except Exception:
            pass
        return {}


async def _guardar_comps_web_en_mercado(enriched_comps: list):
    """Flywheel: guarda en mercado_props los comparables web ya enriquecidos
    (con URL real) para no volver a buscarlos en internet la próxima vez."""
    import hashlib
    from datetime import datetime, timezone
    ops = 0
    for c in enriched_comps:
        url = c.get("source_url") or ""
        if not (url.startswith("http") and c.get("enriched")):
            continue
        try:
            uid = hashlib.md5(url.encode()).hexdigest()
            doc = {
                "id_unico": uid, "url_original": url,
                "portal_origen": (c.get("source") or "web").upper(),
                "titulo": c.get("title", ""), "precio": c.get("price"),
                "colonia": c.get("neighborhood", ""), "municipio": c.get("municipality", ""),
                "estado": c.get("state", ""), "tipo_propiedad": c.get("property_type", ""),
                "tipo_operacion": c.get("listing_type", "venta"),
                "m2_construccion": c.get("construction_area"), "m2_terreno": c.get("land_area"),
                "recamaras": c.get("bedrooms"), "banos": c.get("bathrooms"),
                "estacionamientos": c.get("estacionamientos"),
                "anio_construccion": c.get("anio_construccion"),
                "nombre_agente": c.get("nombre_agente"), "telefono": c.get("telefono"),
                "inmobiliaria": c.get("inmobiliaria"),
                "origen_dato": "web_enriquecido",
                "importado_at": datetime.now(timezone.utc).isoformat(),
                "activo": True,
            }
            doc = {k: v for k, v in doc.items() if v is not None}
            await db.mercado_props.update_one({"id_unico": uid}, {"$set": doc}, upsert=True)
            ops += 1
        except Exception as e:
            logging.warning(f"[flywheel] no se pudo guardar comp web: {e}")
    if ops:
        logging.info(f"[flywheel] {ops} comparables web enriquecidos guardados en mercado_props")


@api_router.post("/valuations/{valuation_id}/generate-comparables")
@limiter.limit("30/hour")
async def generate_comparables(valuation_id: str, request: Request, append: bool = False):
    """
    Generate comparables using AI search (OpenAI + Gemini) as primary method.
    Falls back to web scraping if AI fails, and simulated data as last resort.
    """
    import random
    
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    
    prop = valuation["property_data"]
    location = f"{prop['neighborhood']}, {prop['municipality']}, {prop['state']}"
    
    # Determine property type
    property_type_map = {
        "Habitacional unifamiliar": "Casa",
        "Departamento": "Departamento",
        "Comercial": "Local comercial",
        "Mixto": "Casa",
        "Solo terreno": "Terreno"
    }
    
    if prop.get("property_type") in PROPERTY_TYPES:
        search_type = prop["property_type"]
    else:
        search_type = property_type_map.get(prop.get("property_use", ""), "Casa")
    
    logger.info(f"Searching comparables for {location}, type: {search_type}")
    
    # Negotiation adjustment by property type
    negotiation_by_type = {
        "Casa": -5, "Departamento": -5, "Local comercial": -5,
        "Oficina": -5, "Bodega": -5, "Nave industrial": -5, "Terreno": -8
    }
    base_negotiation = negotiation_by_type.get(prop.get("property_type", "Casa"), -5)
    
    comparables = []
    rental_comparables = []
    rental_factor_data = {"factor": 0.005, "source": "default", "rental_listings_count": 0}
    search_method = "simulated"
    ai_providers_used = []

    # ============== 0. INTERNAL DB COMPARABLES (valuaciones previas de PropValu) ==============
    try:
        subj_area = prop.get("construction_area") or prop.get("land_area") or 100
        area_min = subj_area * 0.6
        area_max = subj_area * 1.4

        six_months_ago = (datetime.now(timezone.utc) - timedelta(days=180)).isoformat()
        cursor = db.valuations.find(
            {
                "status": "calculated",
                "valuation_id": {"$ne": valuation_id},
                "updated_at": {"$gte": six_months_ago},
                "property_data.municipality": {"$regex": prop["municipality"], "$options": "i"},
                "property_data.state": {"$regex": prop["state"], "$options": "i"},
            },
            {"_id": 0, "valuation_id": 1, "property_data": 1, "result": 1}
        ).sort("updated_at", -1).limit(40)

        internal_raw = await cursor.to_list(40)
        internal_found = 0

        for iv in internal_raw:
            if internal_found >= 6:
                break

            iprop = iv.get("property_data", {})
            iresult = iv.get("result", {})

            if not iresult.get("estimated_value"):
                continue

            # Filtrar por tipo de propiedad
            iprop_type = iprop.get("property_type") or property_type_map.get(iprop.get("property_use", ""), "")
            if iprop_type and iprop_type != search_type:
                continue

            # Filtrar por área de construcción ±40%
            iarea = iprop.get("construction_area") or iprop.get("land_area") or 0
            if iarea and (iarea < area_min or iarea > area_max):
                continue

            est_value = iresult["estimated_value"]
            est_ppsm = iresult.get("price_per_sqm") or (est_value / iarea if iarea else 0)

            area_adj = 0
            if iarea and subj_area:
                diff = (iarea - subj_area) / subj_area * 100
                area_adj = max(-5, min(5, -diff * 0.1))

            total_adj = base_negotiation + area_adj
            adjusted_ppsm = est_ppsm * (1 + total_adj / 100)

            comparables.append(Comparable(
                source="propvalu_db",
                source_url="",
                title=f"{search_type} valuado — {iprop.get('neighborhood', prop['neighborhood'])}",
                neighborhood=iprop.get("neighborhood", prop["neighborhood"]),
                municipality=iprop.get("municipality", prop["municipality"]),
                state=iprop.get("state", prop["state"]),
                land_area=iprop.get("land_area"),
                construction_area=iarea or None,
                price=round(est_value, 2),
                price_per_sqm=round(est_ppsm, 2),
                property_type=search_type,
                land_regime=iprop.get("land_regime", "URBANO"),
                listing_type="venta",
                negotiation_adjustment=base_negotiation,
                area_adjustment=round(area_adj, 2),
                condition_adjustment=0,
                location_adjustment=0,
                regime_adjustment=0,
                total_adjustment=round(total_adj, 2),
                adjusted_price_per_sqm=round(adjusted_ppsm, 2),
            ).model_dump())
            internal_found += 1

        if internal_found > 0:
            logger.info(f"Internal DB: {internal_found} valuaciones previas encontradas como comparables")
            search_method = "mixed"

    except Exception as e:
        logger.warning(f"Internal DB comparables error: {e}")

    # ============== 0.5. MERCADO_PROPS (comparables reales del scraper) ==============
    try:
        mongo_candidates = await asyncio.wait_for(
            search_comparables_from_mongo(
                db=db,
                municipio=prop["municipality"],
                tipo_propiedad=search_type,
                tipo_operacion="venta",
                m2_construccion=prop.get("construction_area"),
                precio_referencia=prop.get("value"),
                max_results=50,
                colonia=prop.get("neighborhood"),
            ),
            timeout=10.0,
        )
        if mongo_candidates:
            search_method = "mercado_props"
            for mc in mongo_candidates:
                area = mc.get("m2_construccion") or mc.get("m2_terreno") or prop["construction_area"]
                precio = mc.get("precio") or 0
                ppsm = precio / area if area and area > 0 else 0

                area_adj = 0
                if area and prop.get("construction_area"):
                    diff = (area - prop["construction_area"]) / prop["construction_area"] * 100
                    area_adj = max(-5, min(5, -diff * 0.1))

                regime_adj = 0
                if prop.get("land_regime") and prop["land_regime"] != "URBANO":
                    regime_adj = {"EJIDAL": -20, "COMUNAL": -25, "RUSTICO": -30}.get(prop["land_regime"], 0)

                total_adj = base_negotiation + area_adj + regime_adj
                adj_ppsm  = ppsm * (1 + total_adj / 100)

                # Dedup cross-portal: el maestro trae en qué portales se anuncia
                _anuncios = mc.get("anuncios") or [{"portal": mc.get("portal_origen", ""), "url": mc.get("url_original", "")}]
                _nport = mc.get("n_portales", 1) or 1
                # Confiabilidad del comparable (0-100, informativo — NO cambia el valor)
                _conf = 50
                _conf += min(_nport - 1, 2) * 15  # corroboración: mismo precio en N portales
                _conf += sum(8 for f in ("anio_construccion", "m2_terreno", "recamaras", "banos") if mc.get(f))
                if mc.get("colonia") and (mc.get("colonia") or "").strip().lower() == (prop.get("neighborhood") or "").strip().lower():
                    _conf += 10  # colonia exacta del sujeto
                try:
                    _fs = mc.get("fecha_scraping") or mc.get("fecha_publicacion") or ""
                    if _fs:
                        _dt = datetime.fromisoformat(str(_fs).replace("Z", "+00:00"))
                        if _dt.tzinfo is None:
                            _dt = _dt.replace(tzinfo=timezone.utc)
                        _dias = (datetime.now(timezone.utc) - _dt).days
                        _conf += 10 if _dias <= 90 else (5 if _dias <= 180 else 0)
                except Exception:
                    pass
                _conf = max(0, min(100, _conf))
                _conf_label = "Alta" if _conf >= 75 else ("Media" if _conf >= 50 else "Baja")

                comparables.append(Comparable(
                    source=mc.get("portal_origen", "mercado_props"),
                    source_url=mc.get("url_original", ""),
                    id_unico=mc.get("id_unico"),
                    street_address=mc.get("calle_numero"),
                    bedrooms=mc.get("recamaras"),
                    bathrooms=mc.get("banos"),
                    estacionamientos=mc.get("estacionamientos"),
                    anio_construccion=mc.get("anio_construccion"),
                    age=_edad(mc.get("anio_construccion")),
                    anuncios=_anuncios,
                    portales_anunciado=mc.get("portales_anunciado") or [mc.get("portal_origen", "")],
                    n_portales=_nport,
                    confiabilidad=_conf,
                    confiabilidad_label=_conf_label,
                    zona_tag=mc.get("_zona_tag"),
                    title=mc.get("titulo", f"{search_type} en {mc.get('municipio', '')}"),
                    neighborhood=mc.get("colonia") or prop["neighborhood"],
                    municipality=mc.get("municipio", prop["municipality"]),
                    state=mc.get("estado", prop["state"]),
                    land_area=mc.get("m2_terreno"),
                    construction_area=area,
                    price=precio,
                    price_per_sqm=round(ppsm, 2),
                    property_type=search_type,
                    land_regime=prop.get("land_regime", "URBANO"),
                    listing_type="venta",
                    negotiation_adjustment=base_negotiation,
                    area_adjustment=round(area_adj, 2),
                    condition_adjustment=0,
                    location_adjustment=0,
                    regime_adjustment=regime_adj,
                    total_adjustment=round(total_adj, 2),
                    adjusted_price_per_sqm=round(adj_ppsm, 2),
                ).model_dump())
            logger.info(f"mercado_props: {len(mongo_candidates)} comparables reales agregados")
    except asyncio.TimeoutError:
        logger.warning("mercado_props timeout")
    except Exception as e:
        logger.warning(f"mercado_props error: {e}")

    # ============== 1. BÚSQUEDA IA (OpenAI GPT-4o) — DESACTIVADA por defecto ==============
    # Proceso CANÓNICO: NO se usa ChatGPT. Los comps salen del pool real (mercado_props,
    # con banda $/m²) y la búsqueda web canónica (Tavily/Serper) vive en el MOTOR.
    # Este bloque (código legacy de feb-2026) queda gateado con USE_AI_COMPS=1 solo para pruebas.
    try:
        if os.environ.get("USE_AI_COMPS") == "1":
            logger.info("Starting AI-powered comparable search...")
            ai_result = await asyncio.wait_for(
                search_comparables_with_ai(
                    location=location,
                    property_type=search_type,
                    land_area=prop["land_area"],
                    construction_area=prop["construction_area"],
                    listing_type="venta",
                    max_results=15,
                    use_both_providers=True
                ),
                timeout=60.0
            )
        else:
            ai_result = {"success": False, "comparables": []}

        if ai_result.get("success") and ai_result.get("comparables"):
            ai_comparables = ai_result["comparables"]
            ai_providers_used = ai_result.get("providers_used", [])
            search_method = "ai"
            
            logger.info(f"AI search found {len(ai_comparables)} comparables via {ai_providers_used}")

            # ── Enriquecer comps web abriendo el listing real (edad/tel/estac/m²) ──
            # Antes de construir los comparables, para que lleven datos de detalle y
            # el ajuste/valuación sea más certero. Deadline duro; nunca cuelga.
            try:
                # NOTA: la búsqueda AI (OpenAI/Gemini) genera URLs alucinadas (no
                # resuelven) → no son enriquecibles. El enriquecimiento web REAL ocurre
                # en el motor (motor_remi_api.js, ruta Serper con URLs reales). Aquí queda
                # apagado por defecto; activar con ENRICH_WEB_COMPS_INLINE=1 solo si esta
                # ruta se migra a Serper.
                web_urls = ([c.get("source_url") for c in ai_comparables
                             if (c.get("source_url") or "").startswith("http")][:12]
                            if os.environ.get("ENRICH_WEB_COMPS_INLINE") == "1" else [])
                enriched_map = await _enrich_comp_urls(web_urls, deadline=22)
                for c in ai_comparables:
                    ed = enriched_map.get(c.get("source_url") or "")
                    if not ed:
                        continue
                    c["_enriched"] = True
                    if ed.get("anio_construccion") is not None:
                        c["anio_construccion"] = ed["anio_construccion"]
                    if ed.get("m2_construccion"):
                        c["construction_area"] = ed["m2_construccion"]
                    if ed.get("m2_terreno"):
                        c["land_area"] = ed["m2_terreno"]
                    if ed.get("recamaras"):
                        c["bedrooms"] = ed["recamaras"]
                    if ed.get("banos"):
                        c["bathrooms"] = ed["banos"]
                    for k in ("estacionamientos", "telefono", "inmobiliaria",
                              "nombre_agente", "email_agente"):
                        if ed.get(k) is not None:
                            c[k] = ed[k]
                if enriched_map:
                    logger.info(f"Enriquecidos {len(enriched_map)}/{len(web_urls)} comps web con datos de detalle")
            except Exception as e:
                logger.warning(f"Enriquecimiento de comps web falló (no crítico): {e}")

            # Convert AI results to Comparable format with adjustments
            comps_web_enriquecidos = []
            for ai_comp in ai_comparables:
                construction_area = ai_comp.get("construction_area") or ai_comp.get("land_area") or prop["construction_area"]
                price_per_sqm = ai_comp["price"] / construction_area if construction_area else 0
                
                # Calculate adjustments
                area_adj = 0
                if construction_area and prop["construction_area"]:
                    diff = (construction_area - prop["construction_area"]) / prop["construction_area"] * 100
                    area_adj = -diff * 0.1
                    area_adj = max(-5, min(5, area_adj))
                
                condition_adj = random.uniform(-2, 2)
                location_adj = random.uniform(-2, 2)
                
                regime_adj = 0
                if prop["land_regime"] != "URBANO":
                    regime_adj = {"EJIDAL": -20, "COMUNAL": -25, "RUSTICO": -30}.get(prop["land_regime"], 0)
                
                total_adj = base_negotiation + area_adj + condition_adj + location_adj + regime_adj
                adjusted_price_per_sqm = price_per_sqm * (1 + total_adj / 100)
                
                comparable = Comparable(
                    source=ai_comp.get("source", "ai_search"),
                    source_url=ai_comp.get("source_url", ""),
                    title=ai_comp.get("title", "Propiedad"),
                    neighborhood=ai_comp.get("neighborhood", prop["neighborhood"]),
                    municipality=ai_comp.get("municipality", prop["municipality"]),
                    state=ai_comp.get("state", prop["state"]),
                    land_area=ai_comp.get("land_area"),
                    construction_area=construction_area,
                    price=ai_comp["price"],
                    price_per_sqm=round(price_per_sqm, 2),
                    property_type=search_type,
                    land_regime=prop["land_regime"],
                    listing_type="venta",
                    image_url=ai_comp.get("image_url"),
                    anio_construccion=ai_comp.get("anio_construccion"),
                    age=_edad(ai_comp.get("anio_construccion")),
                    bedrooms=ai_comp.get("bedrooms"),
                    bathrooms=ai_comp.get("bathrooms"),
                    estacionamientos=ai_comp.get("estacionamientos"),
                    telefono=ai_comp.get("telefono"),
                    inmobiliaria=ai_comp.get("inmobiliaria"),
                    enriched=bool(ai_comp.get("_enriched")),
                    negotiation_adjustment=base_negotiation,
                    area_adjustment=round(area_adj, 2),
                    condition_adjustment=round(condition_adj, 2),
                    location_adjustment=round(location_adj, 2),
                    regime_adjustment=regime_adj,
                    total_adjustment=round(total_adj, 2),
                    adjusted_price_per_sqm=round(adjusted_price_per_sqm, 2)
                )
                comp_dict = comparable.model_dump()
                comparables.append(comp_dict)
                if comp_dict.get("enriched"):
                    comps_web_enriquecidos.append(comp_dict)
            
            # Flywheel: guardar los comps web enriquecidos en mercado_props para
            # no volver a buscarlos en internet (next time salen del scrape).
            if comps_web_enriquecidos:
                try:
                    await _guardar_comps_web_en_mercado(comps_web_enriquecidos)
                except Exception as e:
                    logger.warning(f"[flywheel] guardado de comps web falló (no crítico): {e}")

            # Try to get rental data with AI
            try:
                rental_ai = await asyncio.wait_for(
                    search_rental_comparables(location, search_type, prop["construction_area"], 6),
                    timeout=25.0
                )
                if rental_ai:
                    rental_factor_data = calculate_rental_factor_from_ai(
                        comparables, rental_ai, search_type
                    )
                    rental_factor_data["source"] = "ai_calculated"
            except Exception as e:
                logger.warning(f"AI rental search failed: {e}")
        
    except asyncio.TimeoutError:
        logger.warning("AI search timeout, falling back to scraping")
    except Exception as e:
        logger.error(f"AI search error: {e}, falling back to scraping")
    
    # ============== 1.5. GOOGLE SHEETS COMPARABLES (complementary) ==============
    try:
        sheets_results = await asyncio.wait_for(
            search_comparables_from_sheets(
                location=f"{prop['municipality']}, {prop['state']}",
                property_type=search_type,
                construction_area=prop["construction_area"],
                land_area=prop.get("land_area") or prop["construction_area"],
                listing_type="venta",
                max_results=8,
            ),
            timeout=15.0,
        )
        if sheets_results:
            logger.info(f"Google Sheets provided {len(sheets_results)} comparables")
            search_method = search_method if comparables else "sheets"
            for sc in sheets_results:
                area = sc.get("construction_area") or sc.get("land_area") or prop["construction_area"]
                price = sc.get("price") or 0
                if not price or price < 100000:
                    continue
                price_per_sqm = price / area if area else 0
                area_adj = 0
                if area and prop["construction_area"]:
                    diff = (area - prop["construction_area"]) / prop["construction_area"] * 100
                    area_adj = max(-5, min(5, -diff * 0.1))
                total_adj = base_negotiation + area_adj
                adjusted_ppsm = price_per_sqm * (1 + total_adj / 100)
                comparables.append(Comparable(
                    source=sc.get("source", "google_sheets"),
                    source_url=sc.get("source_url", ""),
                    title=sc.get("title", "Comparable de mercado"),
                    neighborhood=sc.get("neighborhood", prop["neighborhood"]),
                    municipality=sc.get("municipality", prop["municipality"]),
                    state=sc.get("state", prop["state"]),
                    land_area=sc.get("land_area"),
                    construction_area=area,
                    price=price,
                    price_per_sqm=round(price_per_sqm, 2),
                    property_type=search_type,
                    land_regime=prop["land_regime"],
                    listing_type="venta",
                    image_url=None,
                    negotiation_adjustment=base_negotiation,
                    area_adjustment=round(area_adj, 2),
                    condition_adjustment=0,
                    location_adjustment=0,
                    regime_adjustment=0,
                    total_adjustment=round(total_adj, 2),
                    adjusted_price_per_sqm=round(adjusted_ppsm, 2),
                ).model_dump())
    except asyncio.TimeoutError:
        logger.warning("Google Sheets search timeout")
    except Exception as e:
        logger.warning(f"Google Sheets search error: {e}")

    # ============== 2. FALLBACK: WEB SCRAPING ==============
    if len(comparables) < 5:
        logger.info("AI didn't find enough, trying web scraping...")
        
        try:
            scraped_sales = await asyncio.wait_for(
                scrape_all_sources(
                    location=f"{prop['neighborhood']} {prop['municipality']}",
                    property_type=search_type,
                    listing_type="venta",
                    land_area_range=(prop["land_area"] * 0.7, prop["land_area"] * 1.3) if prop["land_area"] else None,
                    construction_area_range=(prop["construction_area"] * 0.7, prop["construction_area"] * 1.3) if prop["construction_area"] else None
                ),
                timeout=25.0
            )
            
            logger.info(f"Scraped {len(scraped_sales)} listings")
            
            for scraped in scraped_sales[:15 - len(comparables)]:
                if not scraped.price or scraped.price < 100000:
                    continue
                
                construction_area = scraped.construction_area or scraped.land_area or prop["construction_area"]
                price_per_sqm = scraped.price / construction_area if construction_area else 0
                
                area_adj = 0
                if construction_area and prop["construction_area"]:
                    diff = (construction_area - prop["construction_area"]) / prop["construction_area"] * 100
                    area_adj = -diff * 0.1
                    area_adj = max(-5, min(5, area_adj))
                
                condition_adj = random.uniform(-3, 3)
                location_adj = random.uniform(-2, 2)
                regime_adj = 0 if prop["land_regime"] == "URBANO" else {"EJIDAL": -20, "COMUNAL": -25, "RUSTICO": -30}.get(prop["land_regime"], 0)
                total_adj = base_negotiation + area_adj + condition_adj + location_adj + regime_adj
                adjusted_price_per_sqm = price_per_sqm * (1 + total_adj / 100)
                
                comparable = Comparable(
                    source=scraped.source,
                    source_url=scraped.source_url or f"https://{scraped.source}",
                    title=scraped.title,
                    neighborhood=scraped.neighborhood,
                    municipality=scraped.municipality,
                    state=scraped.state or prop["state"],
                    land_area=scraped.land_area,
                    construction_area=construction_area,
                    price=scraped.price,
                    price_per_sqm=round(price_per_sqm, 2),
                    property_type=scraped.property_type,
                    land_regime=prop["land_regime"],
                    listing_type="venta",
                    image_url=scraped.image_url,
                    negotiation_adjustment=base_negotiation,
                    area_adjustment=round(area_adj, 2),
                    condition_adjustment=round(condition_adj, 2),
                    location_adjustment=round(location_adj, 2),
                    regime_adjustment=regime_adj,
                    total_adjustment=round(total_adj, 2),
                    adjusted_price_per_sqm=round(adjusted_price_per_sqm, 2)
                )
                comparables.append(comparable.model_dump())
            
            if len(comparables) > 0 and search_method == "simulated":
                search_method = "scraping"
                
        except Exception as e:
            logger.error(f"Scraping fallback error: {e}")
    
    # ponytail: relleno con datos random ELIMINADO (mostraba precios/URLs inventados
    # como si fueran comparables reales). Si el pool real queda corto, se avisa por log
    # y el frontend debe mostrar los que haya (aunque sean <10) en vez de fabricar.
    comparables_job = None
    if len(comparables) < 10:
        logger.warning(f"Pool de comparables reales corto: {len(comparables)} (se esperaban >=10) para {location}")
        if len(comparables) < 3:
            search_method = "sin_datos"
            comparables_job = {"status": "corriendo", "eta_min": 4, "notified": False}
            # Dispara el pipeline on-demand (scrape → insert → enricher → validación
            # de colonia) en segundo plano; no bloquea esta respuesta. Mismo patrón
            # fire-and-forget que admin_scraper.py (asyncio.create_task + subprocess).
            try:
                from core.config import SCRAPER_DIR
                python_exe = os.environ.get("SCRAPER_PYTHON", "python")
                asyncio.create_task(asyncio.create_subprocess_exec(
                    python_exe, "ondemand_pipeline.py",
                    "--valuation-id", valuation_id,
                    "--colonia", prop["neighborhood"],
                    "--municipio", prop["municipality"],
                    "--tipo", search_type,
                    "--m2", str(prop.get("construction_area") or 100),
                    cwd=str(SCRAPER_DIR),
                ))
                logger.info(f"ondemand_pipeline lanzado para {valuation_id} ({prop['neighborhood']}, {prop['municipality']})")
            except Exception as e:
                logger.warning(f"No se pudo lanzar ondemand_pipeline: {e}")

    comparables.sort(key=lambda c: c.get("confiabilidad") or 0, reverse=True)

    # "Buscar otros" (append=true): reemplazar los 15 que ya se veían por OTROS distintos
    # (el siguiente mejor bloque), excluyendo los que ya estaban. Si ya no quedan nuevos,
    # se conservan los actuales. Antes `append` no hacía nada (reconstruía lo mismo).
    if append:
        def _ckey(c):
            return (c.get("id_unico") or c.get("source_url")
                    or f"{c.get('neighborhood')}|{c.get('price')}|{c.get('construction_area')}")
        vistos = {_ckey(c) for c in (valuation.get("comparables") or [])}
        otros = [c for c in comparables if _ckey(c) not in vistos]
        comparables = (otros or comparables)[:15]
    else:
        # Solo los 15 mejores para seleccionar (antes se guardaban hasta ~50 de la búsqueda IA).
        comparables = comparables[:15]

    # Update valuation in database
    update_fields = {
        "comparables": comparables,
        "rental_comparables": rental_comparables,
        "rental_factor_data": rental_factor_data,
        "similar_properties_count": len(comparables),
        "search_method": search_method,
        "ai_providers_used": ai_providers_used,
        "status": "comparables_ready",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if comparables_job:
        update_fields["comparables_job"] = comparables_job
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {"$set": update_fields}
    )

    return {
        "comparables": comparables,
        "rental_comparables": rental_comparables,
        "count": len(comparables),
        "rental_count": len(rental_comparables),
        "rental_factor": rental_factor_data,
        "search_method": search_method,
        "ai_providers_used": ai_providers_used,
        "comparables_job": comparables_job
    }

@api_router.post("/valuations/{valuation_id}/select-comparables")
async def select_comparables(valuation_id: str, request: Request):
    body = await request.json()
    selected_ids = body.get("comparable_ids", [])
    custom_negotiation = body.get("custom_negotiation", None)
    
    if len(selected_ids) < 3:
        raise HTTPException(status_code=400, detail="Seleccione al menos 3 comparables")
    
    if len(selected_ids) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 comparables permitidos")
    
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    
    comparables = valuation.get("comparables", [])
    
    # If custom negotiation is provided, recalculate adjusted prices
    if custom_negotiation is not None:
        for comp in comparables:
            old_negotiation = comp.get("negotiation_adjustment", -5)
            other_adjustments = comp["total_adjustment"] - old_negotiation
            new_total = custom_negotiation + other_adjustments
            
            comp["negotiation_adjustment"] = custom_negotiation
            comp["total_adjustment"] = round(new_total, 2)
            comp["adjusted_price_per_sqm"] = round(
                comp["price_per_sqm"] * (1 + new_total / 100), 2
            )
            comp["is_selected"] = comp["comparable_id"] in selected_ids
    else:
        for comp in comparables:
            comp["is_selected"] = comp["comparable_id"] in selected_ids
    
    update_data = {
        "comparables": comparables,
        "selected_comparables": selected_ids,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if custom_negotiation is not None:
        update_data["custom_negotiation"] = custom_negotiation
    
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {"$set": update_data}
    )
    
    return {"message": "Comparables seleccionados", "selected_count": len(selected_ids)}

def _edad_efectiva_opi(prop: dict) -> float:
    """Edad a usar en la valuación: si hubo remodelación (grado+año), pondera con el
    mismo método del dictamen de mejoras que usa el verificador de zona (_edad_efectiva).
    Si no hay remodelación o falta el año, regresa la antigüedad declarada tal cual."""
    edad = prop.get("estimated_age") or 10
    grado = prop.get("remodelacion_grado")
    if not grado:
        return edad
    ahora_year = datetime.now(timezone.utc).year
    anio_construccion = ahora_year - int(edad)
    ee = _edad_efectiva_ponderada(anio_construccion, prop.get("remodelacion_anio"), grado, ahora_year)
    return ee if ee is not None else edad

# ============== LAB: depreciación física — port de motor_remi_api.js ==============
# Puesta en observación (04-ago, caso Escorpión 3518): la fórmula de producción de arriba
# (age_depreciation con tope) no reflejaba remodelación en propiedades viejas. El motor JS
# (Modulo Drive IA/motor_remi_api.js: getRH/FACTORES_CONSERVACION/calcEdadEfectiva) ya tiene
# una curva calibrada contra las OPIs reales del perito (validar_40_opis.js) y su getRH(54, 70)
# = 31.7% de valor restante, casi igual al 30.9-31.7% de la hoja "Ross Heideke" de opi_perito.xlsx.
# Este bloque solo CALCULA y guarda el resultado alterno en result_lab_rh — NO reemplaza
# estimated_value en producción hasta que se valide con más casos.
FACTORES_CONSERVACION_LAB = {
    "Nuevo": 1.05, "Muy Bueno": 1.05, "Bueno": 1.00,
    "Regular Bueno": 0.85, "Regular": 0.75, "Regular Malo": 0.65,
    "Malo": 0.55, "Muy Malo": 0.45,
}
GRADO_REMOD_A_JS = {"ligera": "menor", "basica": "menor", "intermedia": "intermedia", "completa": "completa"}
# Vida útil = 70 fija para todas las calidades. Antes se usaba 60 para calidades "medio bajo a bajo"
# asumiendo que solo Lujo/Superior/Medio Alto llegan a 70 -- INVALIDADO 24-ago: un avalúo SHF real
# (folio 26080015287, Interés Social) confirmó Fed=1-0.5*(x+x²) con vida=70 (edad=34 -> Fed=0.64,
# coincide exacto con el PDF). Ver MOTOR_ANTECEDENTES.md "RESULT_LAB_RH 24-Ago".

def _calc_edad_efectiva_lab(edad: float, grado: str | None) -> float:
    g = GRADO_REMOD_A_JS.get((grado or "").lower())
    if g == "menor":
        return edad - min(8, edad * 0.15)
    if g == "intermedia":
        return max(8, edad * 0.35)
    if g == "completa":
        return 5
    return edad

def _get_rh_lab(edad: float, vida: float = 70) -> float:
    if edad <= 0:
        return 1.0
    x = min(1, edad / vida)
    return max(0.20, 1 - 0.5 * (x + x * x))

def _depreciacion_lab(prop: dict) -> float:
    """Fracción de valor de construcción que se PIERDE (equivalente a total_depreciation arriba)."""
    edad = prop.get("estimated_age") or 10
    grado = prop.get("remodelacion_grado")
    conservation = prop.get("conservation_state") or "Bueno"
    edad_ef = _calc_edad_efectiva_lab(edad, grado)
    valor_restante = _get_rh_lab(edad_ef, 70) * FACTORES_CONSERVACION_LAB.get(conservation, 1.00)
    valor_restante = max(0.0, min(1.05, valor_restante))
    return 1 - valor_restante

@api_router.post("/valuations/{valuation_id}/calculate")
async def calculate_valuation(valuation_id: str, request: Request):
    """
    Calculate property value using improved methodology:
    - 80% weight on market comparables (more realistic)
    - 20% weight on physical/cost approach
    - Better depreciation handling
    - Proper land value estimation
    """
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    mode = valuation.get("mode", "public")
    prop = valuation["property_data"]
    
    # Filter comparables
    if mode == "private" and selected_ids:
        active_comparables = [c for c in comparables if c["comparable_id"] in selected_ids]
    else:
        active_comparables = comparables
    
    if not active_comparables:
        raise HTTPException(status_code=400, detail="No hay comparables disponibles")
    
    construction_area = prop["construction_area"]
    land_area = prop["land_area"]
    
    # ============== MÉTODO COMPARATIVO (80% del valor final) ==============
    # Use raw prices from comparables, not just adjusted
    raw_prices = [c["price_per_sqm"] for c in active_comparables]
    adjusted_prices = [c["adjusted_price_per_sqm"] for c in active_comparables]
    
    # Use weighted average: 60% adjusted + 40% raw (to avoid over-adjustment)
    weighted_prices = [
        adj * 0.6 + raw * 0.4 
        for adj, raw in zip(adjusted_prices, raw_prices)
    ]
    
    min_price = min(weighted_prices)
    max_price = max(weighted_prices)
    avg_price = sum(weighted_prices) / len(weighted_prices)
    
    # Use median for more stability against outliers
    sorted_prices = sorted(weighted_prices)
    n = len(sorted_prices)
    if n % 2 == 0:
        median_price = (sorted_prices[n//2 - 1] + sorted_prices[n//2]) / 2
    else:
        median_price = sorted_prices[n//2]
    
    # Final price per sqm: 70% median + 30% average (more robust)
    final_price_per_sqm = median_price * 0.7 + avg_price * 0.3
    
    comparative_min = min_price * construction_area
    comparative_max = max_price * construction_area
    comparative_avg = avg_price * construction_area
    comparative_weighted = final_price_per_sqm * construction_area
    
    # ============== MÉTODO FÍSICO (20% del valor final) ==============
    # Land value based on comparable prices (typically 30-50% of total value)
    # Use higher ratio for areas with expensive land
    land_ratio_by_state = {
        "Ciudad de México": 0.50,
        "Nuevo León": 0.45,
        "Jalisco": 0.40,
        "Quintana Roo": 0.45,
        "Estado de México": 0.35,
        "Querétaro": 0.40,
    }
    land_ratio = land_ratio_by_state.get(prop["state"], 0.38)
    
    # Land value per m² derived from comparable total values
    land_value_per_sqm = final_price_per_sqm * land_ratio
    land_value = land_value_per_sqm * land_area
    
    # Construction cost (updated 2025 values for Mexico). Escala unificada con
    # CONSTRUCTION_QUALITIES del frontend (ValuationForm.jsx) — antes este dict usaba
    # otras 5 llaves que el frontend nunca manda, así que siempre caía al default.
    quality_costs = {
        "Interés Social": 12000,
        "Económico": 14000,
        "Medio Bajo": 16000,
        "Medio Medio": 19000,     # Standard middle-class (default)
        "Medio Alto": 23000,
        "Superior": 30000,
        "Lujo": 45000,
    }

    quality = prop.get("construction_quality") or "Medio Medio"
    cost_per_sqm = quality_costs.get(quality, 19000)
    construction_new = cost_per_sqm * construction_area
    
    # Age-based depreciation (Ross-Heidecke method simplified). Si hubo remodelación
    # (grado+año), usa la edad efectiva ponderada en vez de la antigüedad cruda.
    age = _edad_efectiva_opi(prop)
    useful_life = 60  # years for residential
    
    # Conservation state affects remaining useful life
    conservation_factors = {
        "Nuevo": 1.0,
        "Muy Bueno": 1.0,   # No penalty
        "Excelente": 1.0,   # legacy alias
        "Bueno": 0.85,      # 15% penalty
        "Regular Bueno": 0.75,
        "Regular": 0.65,    # 35% penalty
        "Regular Malo": 0.52,
        "Malo": 0.40,       # 60% penalty
        "Muy Malo": 0.25,
        "Remodelación Menor": 0.80,
        "Remodelación Intermedia": 0.90,
        "Remodelación Completa": 1.0,
    }
    conservation = prop.get("conservation_state") or "Bueno"
    conservation_factor = conservation_factors.get(conservation, 0.85)
    
    # Calculate depreciation. Sin tope intermedio en age_depreciation: con el tope de 0.50
    # (30 años), una remodelación que baja la edad efectiva de 54 a 41 años no cambiaba nada
    # (ambas saturaban igual) — ver caso Escorpión 3518. El tope final (0.85) es el único límite.
    age_depreciation = age / useful_life
    total_depreciation = age_depreciation + (1 - conservation_factor) * 0.3
    total_depreciation = min(total_depreciation, 0.85)  # Max 85% depreciation física
    
    construction_depreciated = construction_new * (1 - total_depreciation)
    physical_total = land_value + construction_depreciated

    # LAB (observación, no afecta estimated_value): mismo blend 80/20 pero con la
    # depreciación calibrada de _depreciacion_lab() en vez de la fórmula de arriba.
    total_depreciation_lab = _depreciacion_lab(prop)
    construction_depreciated_lab = construction_new * (1 - total_depreciation_lab)
    physical_total_lab = land_value + construction_depreciated_lab

    # ============== VALOR FINAL ==============
    # Regime discount (affects both methods)
    regime_discounts = {
        "URBANO": 0,
        "EJIDAL": 0.20,    # Reduced from 0.25
        "COMUNAL": 0.25,   # Reduced from 0.30
        "RUSTICO": 0.30    # Reduced from 0.40
    }
    regime_discount = regime_discounts.get(prop["land_regime"], 0)
    
    # Final calculation: 80% comparative + 20% physical (comparables are more reliable)
    estimated_value = (comparative_weighted * 0.80 + physical_total * 0.20)
    estimated_value *= (1 - regime_discount)
    
    # Sanity check: ensure value is within reasonable range of comparables
    comparable_avg_total = sum(c["price"] for c in active_comparables) / len(active_comparables)
    
    # If our estimate is more than 30% below comparable average, adjust up
    if estimated_value < comparable_avg_total * 0.70:
        estimated_value = (estimated_value + comparable_avg_total * 0.70) / 2
    
    # If our estimate is more than 30% above comparable average, adjust down
    if estimated_value > comparable_avg_total * 1.30:
        estimated_value = (estimated_value + comparable_avg_total * 1.30) / 2

    # LAB: mismo blend + mismo sanity check, pero con physical_total_lab
    estimated_value_lab = (comparative_weighted * 0.80 + physical_total_lab * 0.20) * (1 - regime_discount)
    if estimated_value_lab < comparable_avg_total * 0.70:
        estimated_value_lab = (estimated_value_lab + comparable_avg_total * 0.70) / 2
    if estimated_value_lab > comparable_avg_total * 1.30:
        estimated_value_lab = (estimated_value_lab + comparable_avg_total * 1.30) / 2

    # Confidence level
    confidence = "MEDIO"
    if len(active_comparables) >= 5:
        confidence = "ALTO"
    elif len(active_comparables) < 3:
        confidence = "BAJO"
    
    # Get rental factor and calculate market metrics
    rental_factor_data = valuation.get("rental_factor_data", {"factor": 0.005})
    rental_factor = rental_factor_data.get("factor", 0.005)
    
    property_type = prop.get("property_type", "Casa")
    
    market_metrics = calculate_market_metrics(
        estimated_value=estimated_value,
        rental_factor=rental_factor,
        property_type=property_type,
        state=prop["state"]
    )
    
    market_metrics["similar_properties_count"] = valuation.get("similar_properties_count", len(comparables))
    market_metrics["rental_listings_count"] = rental_factor_data.get("rental_listings_count", 0)
    
    # Value range: +/- 10% but based on comparable spread
    price_spread = (max_price - min_price) / avg_price if avg_price > 0 else 0.20
    range_factor = max(0.08, min(0.15, price_spread / 2))  # 8-15% range
    
    result = ValuationResult(
        comparative_min_value=round(comparative_min, 2),
        comparative_avg_value=round(comparative_avg, 2),
        comparative_max_value=round(comparative_max, 2),
        comparative_weighted=round(comparative_weighted, 2),
        land_value=round(land_value, 2),
        construction_new_value=round(construction_new, 2),
        depreciation_percent=round(total_depreciation * 100, 1),
        construction_depreciated=round(construction_depreciated, 2),
        physical_total=round(physical_total, 2),
        estimated_value=round(estimated_value, 2),
        value_range_min=round(estimated_value * (1 - range_factor), 2),
        value_range_max=round(estimated_value * (1 + range_factor), 2),
        price_per_sqm=round(estimated_value / construction_area, 2),
        confidence_level=confidence,
        market_metrics=MarketMetrics(**market_metrics)
    )
    
    result_lab_rh = {
        "depreciation_percent": round(total_depreciation_lab * 100, 1),
        "construction_depreciated": round(construction_depreciated_lab, 2),
        "physical_total": round(physical_total_lab, 2),
        "estimated_value": round(estimated_value_lab, 2),
    }

    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "result": result.model_dump(),
                "result_lab_rh": result_lab_rh,
                "status": "calculated",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return result.model_dump()


def _physical_breakdown(prop: dict, comparative_ppsm: float) -> dict:
    """Enfoque físico (Costo de Reposición) — misma lógica del /calculate viejo:
    terreno por ratio del $/m² comparativo + construcción paramétrica (tipo CMIC) con
    depreciación Ross-Heidecke (edad + conservación). El motor comparativo no lo calcula."""
    land_ratio_by_state = {
        "Ciudad de México": 0.50, "Nuevo León": 0.45, "Jalisco": 0.40,
        "Quintana Roo": 0.45, "Estado de México": 0.35, "Querétaro": 0.40,
    }
    land_ratio = land_ratio_by_state.get(prop.get("state", ""), 0.38)
    land_area = float(prop.get("land_area") or 0)
    construction_area = float(prop.get("construction_area") or 0)
    land_value = comparative_ppsm * land_ratio * land_area

    quality_costs = {
        "Interés Social": 12000, "Económico": 14000, "Medio Bajo": 16000,
        "Medio Medio": 19000, "Medio Alto": 23000, "Superior": 30000, "Lujo": 45000,
    }
    cost_per_sqm = quality_costs.get(prop.get("construction_quality") or "Medio Medio", 19000)
    construction_new = cost_per_sqm * construction_area

    age = float(_edad_efectiva_opi(prop))
    conservation_factors = {
        "Nuevo": 1.0, "Muy Bueno": 1.0, "Excelente": 1.0, "Bueno": 0.85,
        "Regular Bueno": 0.75, "Regular": 0.65, "Regular Malo": 0.52,
        "Malo": 0.40, "Muy Malo": 0.25,
        "Remodelación Menor": 0.80, "Remodelación Intermedia": 0.90, "Remodelación Completa": 1.0,
    }
    conservation_factor = conservation_factors.get(prop.get("conservation_state") or "Bueno", 0.85)
    age_depreciation = age / 60.0
    total_depreciation = min(age_depreciation + (1 - conservation_factor) * 0.3, 0.85)
    construction_depreciated = construction_new * (1 - total_depreciation)
    physical_total = land_value + construction_depreciated
    return {
        "land_value": round(land_value, 2),
        "construction_new_value": round(construction_new, 2),
        "construction_depreciated": round(construction_depreciated, 2),
        "depreciation_percent": round(total_depreciation * 100, 1),
        "physical_total": round(physical_total, 2),
    }


def _motor_input_from_prop(prop: dict) -> dict:
    """Mapeo campos PropValu → motor Remi (reusado por calculate-remi y el ARV del mini-reporte)."""
    return {
        "tipo":              prop.get("property_type", "casa"),
        "construccion":      prop.get("construction_area", 0),
        "terreno":           prop.get("land_area", 0),
        "edad":              _edad_efectiva_opi(prop),
        "estadoConservacion": {
            "Muy Bueno":               "muy_bueno",
            "Excelente":               "muy_bueno",  # legacy
            "Bueno":                   "bueno",
            "Regular Bueno":           "regular_bueno",
            "Regular":                 "regular_medio",
            "Regular Malo":            "regular_malo",
            "Malo":                    "malo",
            "Muy Malo":                "muy_malo",
            "Remodelación Menor":      "remodelacion_menor",
            "Remodelación Intermedia": "remodelacion_intermedia",
            "Remodelación Completa":   "remodelacion_completa",
            "Nuevo":                   "nuevo",
        }.get(prop.get("conservation_state", "Bueno"), "bueno"),
        "recamaras":         prop.get("bedrooms", 0),
        "banos":             prop.get("bathrooms", 0),
        "municipio":         prop.get("municipality") or prop.get("city", ""),
        "colonia":           prop.get("neighborhood", ""),
    }


async def _run_motor(motor_input: dict) -> dict:
    """Invoca el motor Node (subprocess) y parsea su salida. Levanta HTTPException en error.
    Subprocess en thread (subprocess.run) en vez de asyncio.create_subprocess_exec:
    bajo el event loop de uvicorn en Windows el segundo lanza NotImplementedError.
    Así funciona igual en Windows (local) y Linux (prod)."""
    def _run_motor_sync():
        return subprocess.run(
            ["node", MOTOR_SCRIPT],
            input=json.dumps(motor_input).encode(),
            capture_output=True, cwd=str(MOTOR_DIR), timeout=45,
        )
    try:
        _loop = asyncio.get_running_loop()
        proc = await asyncio.wait_for(_loop.run_in_executor(None, _run_motor_sync), timeout=55)
    except subprocess.TimeoutExpired as e:
        partial = (e.stderr or b"").decode(errors="replace")[-2000:]
        logger.error(f"Motor timeout — stderr parcial capturado:\n{partial}")
        raise HTTPException(status_code=503, detail="Motor timeout")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Motor timeout")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Motor error: {str(e) or type(e).__name__}")

    # ponytail: debug temporal, ver marcadores MOTOR aunque el proceso salga bien (returncode 0)
    _stderr_txt = proc.stderr.decode(errors="replace")
    if "MOTOR" in _stderr_txt:
        logger.error(f"Motor stderr (markers):\n{_stderr_txt[-2000:]}")

    if proc.returncode != 0:
        raise HTTPException(status_code=503, detail=f"Motor error: {proc.stderr.decode()[:200] or ('exit ' + str(proc.returncode))}")

    try:
        # El motor imprime un banner (dotenvx) antes del JSON → tomar la última línea JSON.
        _lines = [l for l in proc.stdout.decode().splitlines() if l.strip().startswith("{")]
        return json.loads(_lines[-1]) if _lines else json.loads(proc.stdout.decode())
    except Exception:
        raise HTTPException(status_code=503, detail="Motor respuesta inválida")


@api_router.post("/valuations/{valuation_id}/calculate-remi")
async def calculate_remi(valuation_id: str, request: Request):
    """
    Calcula valor con motor Remi-Scraper (cache_index local, homologación directa $/m²C).
    No requiere comparables manuales — los busca automáticamente por colonia/municipio.
    """
    valuation = await db.valuations.find_one({"valuation_id": valuation_id}, {"_id": 0})
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")

    prop = valuation.get("property_data", {})
    motor_input = _motor_input_from_prop(prop)
    result = await _run_motor(motor_input)

    # Flywheel de terreno: si el perito confirma/ajusta un $/m² de terreno en pantalla
    # (ComparablesPage, junto a negociación), se guarda como dato GANADO (validado por
    # humano) — a diferencia del land_value calculado, que puede salir mal en zonas sin
    # comps reales. Alimenta a futuro pm2t_semilla.json (build_pm2t_semilla.py).
    try:
        body = await request.json()
    except Exception:
        body = {}
    terreno_pm2 = body.get("terreno_pm2_confirmado")
    if terreno_pm2 and float(terreno_pm2) > 0:
        await db.terreno_flywheel.insert_one({
            "valuation_id": valuation_id,
            "municipio": prop.get("municipality", ""),
            "colonia": prop.get("neighborhood", ""),
            "estado": prop.get("state", ""),
            "m2_terreno": prop.get("land_area"),
            "valor_m2": float(terreno_pm2),
            "fuente": "perito_dashboard",
            "fecha": datetime.now(timezone.utc).isoformat(),
        })

    if result.get("error") and result.get("valor", 0) == 0:
        raise HTTPException(status_code=422, detail=result["error"])

    # ── Flywheel: guardar comps Gemini en MongoDB ──────────────────────────────
    gemini_comps = result.pop("geminiComps", None)
    if gemini_comps:
        zona_pm2c = result.get("medPm2Zona", 0)
        seen_keys: set = set()
        docs_flywheel = []
        for c in gemini_comps:
            precio = c.get("precio", 0)
            m2c_v  = c.get("m2c", 0)
            if not precio or not m2c_v:
                continue
            if zona_pm2c > 0:
                pm2c_comp = precio / m2c_v
                if pm2c_comp < zona_pm2c * 0.4 or pm2c_comp > zona_pm2c * 1.6:
                    continue
            key = f"{c.get('colonia','').lower()}|{round(m2c_v)}|{round(precio / 10000)}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            docs_flywheel.append({
                "colonia":     c.get("colonia") or motor_input.get("colonia", ""),
                "municipio":   motor_input.get("municipio", ""),
                "precio":      precio,
                "m2c":         m2c_v,
                "m2t":         c.get("m2t", 0),
                "portal":      c.get("portal", "gemini"),
                "url":         c.get("url", ""),
                "fuente":      "gemini",
                "pool_tipo":   result.get("poolTipo", ""),
                "valuation_id": valuation_id,
                "fecha":       datetime.now(timezone.utc).isoformat(),
            })
        if docs_flywheel:
            try:
                await db.comps_gemini.insert_many(docs_flywheel)
                logger.info(f"Flywheel: {len(docs_flywheel)} comps guardados — {motor_input.get('colonia')}/{motor_input.get('municipio')}")
            except Exception as fw_e:
                logger.warning(f"Flywheel insert error: {fw_e}")
    # ──────────────────────────────────────────────────────────────────────────

    # ── Adaptar la salida del motor al `result` que consume el reporte ──
    # El motor devuelve {valor, confianza, cv, nComps, pm2cAvg, valorTerreno, valorConst...};
    # el reporte espera la forma ValuationResult. Reconstruimos TODO desde el `valor` del
    # motor (calculate_market_metrics deriva renta/cap_rate/plusvalía solo del valor).
    valor = float(result.get("valor") or 0)
    m2c = float(prop.get("construction_area") or 0) or 1
    cv = float(result.get("cv") or 0.10)
    rango = max(0.08, min(0.15, cv))  # ±8-15% guiado por el cv del motor
    conf_map = {"ALTA": "ALTO", "ALTO": "ALTO", "MEDIA": "MEDIO", "MEDIO": "MEDIO",
                "BAJA": "BAJO", "BAJO": "BAJO"}
    confianza = conf_map.get(str(result.get("confianza", "")).upper(), "MEDIO")
    # Enfoque físico: el motor no separa terreno/construcción → derivarlo (paramétrico + R-H).
    # Si el motor sí devolviera valorTerreno/valorConst, se respetan.
    phys = _physical_breakdown(prop, valor / m2c)
    land_v = float(result.get("valorTerreno") or phys["land_value"])
    const_v = float(result.get("valorConst") or phys["construction_new_value"])
    rfd = valuation.get("rental_factor_data") or {}
    mm = calculate_market_metrics(
        estimated_value=valor,
        rental_factor=rfd.get("factor", 0.005),
        property_type=prop.get("property_type", "Casa"),
        state=prop.get("state", ""),
    )
    mm["similar_properties_count"] = int(result.get("nComps") or 0)
    mm["rental_listings_count"] = rfd.get("rental_listings_count", 0)
    web_result = {
        "comparative_min_value": round(valor * (1 - rango), 2),
        "comparative_avg_value": round(valor, 2),
        "comparative_max_value": round(valor * (1 + rango), 2),
        "comparative_weighted": round(valor, 2),
        "land_value": round(land_v, 2),
        "construction_new_value": round(const_v, 2),
        "depreciation_percent": phys["depreciation_percent"],
        "construction_depreciated": phys["construction_depreciated"],
        "physical_total": round(land_v + phys["construction_depreciated"], 2),
        "physical_value": round(land_v + phys["construction_depreciated"], 2),
        "estimated_value": round(valor, 2),
        "value_range_min": round(valor * (1 - rango), 2),
        "value_range_max": round(valor * (1 + rango), 2),
        "price_per_sqm": round(valor / m2c, 2),
        "confidence_level": confianza,
        "market_metrics": mm,
    }

    # Guardar resultado del motor + el `result` para el reporte
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {"$set": {
            "remi_result": result,
            "result": web_result,
            "status": "calculated",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {**result, "result": web_result}

@api_router.post("/valuations/{valuation_id}/generate-mini-report")
@limiter.limit("20/hour")
async def generate_mini_report(valuation_id: str, request: Request):
    """Resumen de 1 página (solo venta) sobre un avalúo ya calculado.
    No consume créditos ni llama IA: es solo un render distinto del mismo resultado."""
    valuation = await db.valuations.find_one({"valuation_id": valuation_id}, {"_id": 0})
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    if not valuation.get("result"):
        raise HTTPException(status_code=400, detail="Primero calcule la valuación")

    # ARV (flipping): mismo proceso del motor pero tratando la propiedad como remodelada.
    arv_estimado = None
    try:
        arv_input = {**_motor_input_from_prop(valuation.get("property_data", {})), "estadoConservacion": "remodelacion_completa"}
        arv_result = await _run_motor(arv_input)
        if arv_result.get("valor"):
            arv_estimado = round(float(arv_result["valor"]), 2)
    except HTTPException:
        pass  # el mini-reporte no debe romperse si el ARV falla — se omite el bloque

    from report_generator import generate_mini_report_html
    mini_html = generate_mini_report_html(valuation, arv_estimado=arv_estimado)

    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {"$set": {"mini_report_html": mini_html, "arv_estimado": arv_estimado, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"report_html": mini_html, "arv_estimado": arv_estimado}


@api_router.post("/valuations/{valuation_id}/generate-report")
@limiter.limit("10/hour")
async def generate_report(valuation_id: str, request: Request, include_analysis: bool = True):
    """
    Generate AI-powered valuation report
    
    Args:
        include_analysis: If False, skip the AI analysis section in PDF export
    """
    
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    
    if not valuation.get("result"):
        raise HTTPException(status_code=400, detail="Primero calcule la valuación")

    # Consumo de acceso de cortesía / prueba (una sola vez por valuación, para no
    # descontar al regenerar el reporte). Solo aplica si el usuario logueado tiene
    # un acceso autorizado activo; los avalúos por cupo descuentan, los de acceso
    # total solo se marcan. No bloquea: el gate de UX vive en /access/status.
    if not valuation.get("cortesia_aplicada"):
        _user = await get_current_user(request)
        if _user and getattr(_user, "email", None):
            _acc = await db["authorized_access"].find_one(
                {"email": _user.email.lower().strip()}, {"_id": 0})
            if _acc and _acceso_estado(_acc) == "activo":
                if not _acc.get("acceso_total"):
                    await db["authorized_access"].update_one(
                        {"access_id": _acc["access_id"]}, {"$inc": {"usados": 1}})
                await db.valuations.update_one(
                    {"valuation_id": valuation_id},
                    {"$set": {"cortesia_aplicada": True,
                              "cortesia_modalidad": _acc.get("modalidad"),
                              "cortesia_categoria": _acc.get("categoria"),
                              "cortesia_email": _acc["email"]}})

    prop = valuation["property_data"]
    result = valuation["result"]
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    
    if selected_ids:
        active_comparables = [c for c in comparables if c["comparable_id"] in selected_ids]
    else:
        active_comparables = comparables[:6]

    # Generate analysis
    analysis = generate_analysis_text(prop, result, active_comparables)
    
    # Try LLM enhancement with Gemini
    ai_sections = {}
    try:
        import google.generativeai as _genai

        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            comparables_text = ""
            for i, comp in enumerate(active_comparables[:5], 1):
                comparables_text += f"Comp {i}: {comp['neighborhood']}, ${comp['price']:,.0f}, terreno {comp.get('land_area', 0)}m², const {comp.get('construction_area', 0)}m²\n"

            annual_appreciation = result.get('market_metrics', {}).get('annual_appreciation', 5.0)
            monthly_rent = result.get('market_metrics', {}).get('monthly_rent_estimate', 0)
            cap_rate = result.get('market_metrics', {}).get('cap_rate', 0)
            base_value = result['estimated_value']

            # Datos duros de oferta/posición de mercado — para que analisis_mercado y
            # oportunidades se basen en la oferta real de la zona, no en relleno genérico
            # (bug 07-ago: analisis_mercado citaba "Bosque Real" para una propiedad en
            # La Calma porque el prompt solo veía el texto de comparables, sin contexto
            # de cuántos son de zona exacta ni si el valor está arriba/abajo del promedio).
            n_zona_exacta = sum(1 for c in active_comparables if str(c.get('zona_tag', '')).startswith('Zona exacta'))
            n_vecina = len(active_comparables) - n_zona_exacta
            _sqm_vals = [c['price'] / c['construction_area'] for c in active_comparables if c.get('construction_area')]
            avg_zona_sqm = sum(_sqm_vals) / len(_sqm_vals) if _sqm_vals else 0
            subject_sqm = base_value / prop['construction_area'] if prop.get('construction_area') else 0
            if avg_zona_sqm:
                _diff_pct = (subject_sqm - avg_zona_sqm) / avg_zona_sqm * 100
                posicion_zona = f"{'arriba' if _diff_pct >= 0 else 'abajo'} del promedio de la zona por {abs(_diff_pct):.1f}%"
            else:
                posicion_zona = "sin referencia suficiente de zona"
            # Precompute projected values so f-string stays valid
            yr1 = base_value * (1 + annual_appreciation / 100) ** 1
            yr2 = base_value * (1 + annual_appreciation / 100) ** 2
            yr3 = base_value * (1 + annual_appreciation / 100) ** 3
            yr4 = base_value * (1 + annual_appreciation / 100) ** 4
            yr5 = base_value * (1 + annual_appreciation / 100) ** 5

            prompt = f"""Eres un valuador inmobiliario profesional certificado en México. Analiza la siguiente propiedad y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código markdown.

DATOS DE LA PROPIEDAD:
- Ubicación: {prop['neighborhood']}, {prop['municipality']}, {prop['state']}
- Terreno: {prop['land_area']} m², Construcción: {prop['construction_area']} m²
- Habitaciones: {prop.get('bedrooms', 3)}, Baños: {prop.get('bathrooms', 2)}
- Régimen: {prop['land_regime']}, Tipo: {prop.get('property_type', 'Casa')}
- Conservación: {prop.get('conservation_state', 'Bueno')}, Edad: {prop.get('estimated_age', 10)} años{f", con remodelación {prop.get('remodelacion_grado')} en {prop.get('remodelacion_anio')}" if prop.get('remodelacion_grado') else ""}
- Valor estimado: ${base_value:,.0f} MXN
- Renta mensual estimada: ${monthly_rent:,.0f} MXN
- Cap Rate: {cap_rate:.1f}%
- Plusvalía histórica zona: {annual_appreciation:.1f}% anual
- Comparables: {comparables_text}
- Comparables de la colonia exacta del sujeto: {n_zona_exacta} · de colonias vecinas: {n_vecina}
- $/m² construcción del sujeto vs promedio de los comparables usados: {posicion_zona}

Responde con este JSON (usa valores realistas para la zona, no inventes datos absurdos):
{{
  "analisis_mercado": "UN SOLO párrafo breve (máx 4-5 líneas), basado en los datos duros de arriba: cuántos comparables son de la colonia exacta vs vecinas, si el $/m² del sujeto está arriba o abajo del promedio de la zona y qué implica eso para oferta/demanda (más oferta que la absorbe el mercado presiona el precio a la baja; posición por debajo del promedio es ventaja competitiva para vender rápido; por arriba requiere justificar valor o negociar). Termina con una recomendación concreta de negociación/venta. NUNCA nombres una colonia distinta a {prop['neighborhood']} salvo que sea explícitamente una de las colonias vecinas listadas en Comparables. Conciso, sin relleno. Debe caber junto al cuadro de metodología en una hoja carta.",
  "plusvalia": {{
    "tasa_anual": {annual_appreciation:.1f},
    "anio1": {yr1:.0f},
    "anio2": {yr2:.0f},
    "anio3": {yr3:.0f},
    "anio4": {yr4:.0f},
    "anio5": {yr5:.0f},
    "comentario": "Una oración sobre perspectiva de plusvalía en la zona."
  }},
  "perfil_entorno": {{
    "seguridad": {{"score": 7, "texto": "Descripción breve de seguridad. NO nombres calles ni vías específicas."}},
    "movilidad": {{"score": 7, "texto": "Descripción breve de transporte y acceso EN GENERAL. NO inventes nombres de avenidas/calles específicas (no las conoces)."}},
    "educacion": {{"score": 8, "texto": "Descripción breve de oferta educativa cercana", "count": "12+", "nombres": "Nombre escuela 1, Nombre escuela 2, Nombre escuela 3"}},
    "salud": {{"score": 7, "texto": "Descripción breve de servicios de salud", "count": "8+", "nombres": "Nombre hospital 1, Nombre clínica 2"}},
    "comercio": {{"score": 8, "texto": "Descripción breve de comercio y servicios", "count": "15+", "nombres": "Supermercado 1, Tienda 2, Plaza 3"}},
    "recreacion": {{"score": 7, "texto": "Descripción breve de parques y áreas recreativas", "count": "10+", "nombres": "Parque 1, Parque 2, Área deportiva"}},
    "plazas": {{"score": 7, "texto": "Descripción breve de plazas comerciales", "count": "5+", "nombres": "Plaza 1, Centro comercial 2"}}
  }},
  "ventajas": [
    "Ventaja competitiva 1 específica de esta propiedad",
    "Ventaja competitiva 2",
    "Ventaja competitiva 3",
    "Ventaja competitiva 4"
  ],
  "oportunidades": [
    "Área de oportunidad o mejora 1 realista",
    "Área de oportunidad 2",
    "Área de oportunidad 3"
  ],
  "estrategia": {{
    "perfil_comprador": "Descripción del comprador ideal para esta propiedad",
    "precio_entrada": "Recomendación de precio de publicación",
    "canales": ["Canal 1", "Canal 2", "Canal 3"],
    "tips": ["Tip de marketing 1", "Tip 2", "Tip 3", "Tip 4"]
  }}
}}

IMPORTANTE: Devuelve SOLO el JSON. Los scores de perfil_entorno deben ser enteros del 1 al 10 según el tipo de zona. Deja "count" y "nombres" con los placeholders — se rellenan con datos REALES de Google Places, NO inventes nombres de establecimientos, calles o vías (si los pones serán de otra zona y estarán mal). En los "texto" describe la zona en general sin nombrar lugares específicos. Los valores de plusvalía son proyecciones ya calculadas, solo ajusta el comentario.

REGLA para "oportunidades": usa la Conservación, Edad y remodelación reales de arriba. Si Conservación es "Bueno"/"Muy Bueno"/"Excelente", O la Edad es menor a 15 años, O hay remodelación reportada, NO sugieras actualizar acabados/renovar/modernizar estilo — contradice el propio dato reportado (una remodelación reciente o poca edad ya cubre eso). En esos casos usa en su lugar la posición de mercado de arriba: si el sujeto está por ARRIBA del promedio de la zona con {n_zona_exacta+n_vecina} comparables activos, la oportunidad es que esa oferta compita por el mismo comprador y presione a bajar el precio de salida; si está por DEBAJO del promedio, es una ventaja competitiva a explotar en la negociación (mencionarlo así, sin inventar defectos). Fuera de esos casos, enfoca las oportunidades en algo verificable de los datos (tamaño de terreno vs zona, distribución, un solo baño, falta de cochera) — nunca inventes un defecto que el dato ya reportado contradiga."""

            _genai.configure(api_key=gemini_key)
            _sys = "Valuador inmobiliario certificado en México. Responde SOLO con JSON válido, sin markdown."

            import json as _json

            def _call_gemini(model_name: str):
                _m = _genai.GenerativeModel(model_name, system_instruction=_sys)
                # response_mime_type=json: modo JSON nativo de Gemini, reduce el
                # riesgo de que la respuesta salga truncada/mal formada a medio JSON.
                return _m.generate_content(prompt, generation_config={"response_mime_type": "application/json"})

            async def _call_deepseek(prompt: str, sys: str) -> str:
                """Respaldo real cuando Gemini falla — mismo proveedor/API que ya
                usa `Modulo Drive IA/motor_remi_api.js` (compatible OpenAI)."""
                key = os.environ.get("DEEPSEEK_API_KEY")
                if not key:
                    raise RuntimeError("DEEPSEEK_API_KEY no configurada")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    r = await client.post(
                        "https://api.deepseek.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {key}"},
                        json={
                            "model": "deepseek-chat",
                            "messages": [{"role": "system", "content": sys}, {"role": "user", "content": prompt}],
                            "response_format": {"type": "json_object"},
                        },
                    )
                    r.raise_for_status()
                    return r.json()["choices"][0]["message"]["content"]

            def _parse_raw(raw: str):
                raw = raw.strip()
                if raw.startswith("```"):
                    parts = raw.split("```")
                    raw = parts[1] if len(parts) > 1 else raw
                    if raw.startswith("json"):
                        raw = raw[4:]
                return _json.loads(raw.strip())

            try:
                _loop = asyncio.get_running_loop()
                try:
                    _gresult = await asyncio.wait_for(
                        _loop.run_in_executor(None, lambda: _call_gemini("gemini-2.5-flash")),
                        timeout=30.0
                    )
                    ai_sections = _parse_raw(_gresult.text)
                    analysis = ai_sections.get("analisis_mercado", analysis)
                    logger.info("Gemini AI sections generated (gemini-2.5-flash)")
                except Exception as _ge:
                    logger.warning(f"gemini-2.5-flash failed: {_ge}")
                    try:
                        _draw = await asyncio.wait_for(_call_deepseek(prompt, _sys), timeout=30.0)
                        ai_sections = _parse_raw(_draw)
                        analysis = ai_sections.get("analisis_mercado", analysis)
                        logger.info("DeepSeek AI sections generated (fallback)")
                    except Exception as _de:
                        logger.warning(f"DeepSeek fallback failed: {_de}")
            except asyncio.TimeoutError:
                logger.warning("Gemini timeout, using template analysis")

    except Exception as e:
        logger.error(f"LLM error (using template): {e}")

    # Datos REALES de POIs cercanos (Google Places) — reemplazan conteos Y NOMBRES
    # estimados por la IA (que inventaba establecimientos de otras zonas). Si Places
    # está deshabilitada o falla, se conservan los estimados de la IA (degradación).
    try:
        pe = ai_sections.get("perfil_entorno") if isinstance(ai_sections, dict) else None
        if pe:
            from nearby_places import nearby_by_category
            _loop = asyncio.get_running_loop()
            real = await _loop.run_in_executor(
                None,
                lambda: nearby_by_category(prop.get("latitude"), prop.get("longitude")),
            )
            if real:
                for _cat, _data in real.items():
                    if isinstance(pe.get(_cat), dict):
                        pe[_cat]["count"] = _data["count"]
                        # Nombres reales de la zona; si Places no devolvió ninguno, vaciar
                        # los inventados por la IA (no mostrar lugares de otra zona).
                        pe[_cat]["nombres"] = _data["nombres"]
                logger.info(f"Entorno con datos reales de Places: { {k: v['count'] for k, v in real.items()} }")
            else:
                # Places falló por completo (API caída/deshabilitada): los "count"/"nombres"
                # que quedan son INVENTADOS por Gemini (nombres de establecimientos que no
                # verificamos) — antes se mostraban como si fueran reales. Se limpian para
                # que el reporte muestre "sin datos verificados" en vez de un negocio falso.
                for _cat in pe.keys():
                    if isinstance(pe.get(_cat), dict):
                        pe[_cat]["count"] = ""
                        pe[_cat]["nombres"] = ""
                logger.warning("Places no disponible: se limpiaron nombres/conteos estimados por IA (no verificados)")
    except Exception as _pe:
        logger.warning(f"No se pudieron obtener datos reales de entorno: {_pe}")

    # Folio estable por avalúo (EST-YYMMDD-TIPO[-SIGLAS]-NN). Se calcula una vez y se
    # guarda; al regenerar el reporte se reutiliza el mismo folio. El consecutivo NN
    # incrementa el contador del usuario (pro); público usa NN estable del valuation_id.
    folio_val = valuation.get("folio")
    if not folio_val:
        from report_generator import build_folio, user_siglas
        _fu = await get_current_user(request)
        if _fu and (_fu.role or "").lower() in ("appraiser", "realtor", "super_admin"):
            _udoc = await db.users.find_one({"user_id": _fu.user_id}, {"_id": 0}) or {}
            _seq = int(_udoc.get("folio_seq") or 0) + 1
            _sig = _udoc.get("siglas") or user_siglas(_udoc.get("company_name") or _udoc.get("name") or "")
            folio_val = build_folio(_fu.role, _sig, _seq)
            await db.users.update_one({"user_id": _fu.user_id},
                                      {"$set": {"folio_seq": _seq, "siglas": _sig}})
        else:
            _num = ''.join(filter(str.isdigit, valuation_id[-4:])) or '01'
            folio_val = build_folio("public", "", int(_num[:2] or "1"))
        await db.valuations.update_one({"valuation_id": valuation_id}, {"$set": {"folio": folio_val}})
    valuation["folio"] = folio_val

    # Generate HTML report with optional analysis section
    report_html = generate_html_report(valuation, analysis, include_analysis=include_analysis, ai_sections=ai_sections)
    
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "report_html": report_html,
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "report_html": report_html,
        "analysis": analysis
    }

def generate_analysis_text(prop: dict, result: dict, comparables: list) -> str:
    """Generate template-based analysis text"""
    location = f"{prop['neighborhood']}, {prop['municipality']}, {prop['state']}"
    regime_note = ""
    if prop['land_regime'] != "URBANO":
        regime_note = f" Es importante considerar que el régimen de suelo {prop['land_regime'].lower()} implica restricciones legales que afectan la liquidez y el valor comercial del inmueble."
    
    num_comparables = len(comparables)
    confidence_text = {
        "ALTO": "alta confiabilidad debido a la disponibilidad de comparables similares",
        "MEDIO": "confiabilidad moderada, se recomienda complementar con avalúo formal",
        "BAJO": "confiabilidad limitada por escasez de comparables, usar con precaución"
    }.get(result['confidence_level'], "confiabilidad moderada")
    
    market_metrics = result.get('market_metrics', {})
    monthly_rent = market_metrics.get('monthly_rent_estimate', 0)
    cap_rate = market_metrics.get('cap_rate', 0)
    appreciation = market_metrics.get('annual_appreciation', 5)
    
    return f"""RESUMEN EJECUTIVO

El inmueble ubicado en {location} presenta características acordes al mercado de la zona. Con una superficie de terreno de {prop['land_area']} m² y {prop['construction_area']} m² de construcción, el análisis arroja un valor de mercado estimado de ${result['estimated_value']:,.0f} MXN.{regime_note}

ANÁLISIS DE MERCADO Y RENTABILIDAD

Se analizaron {num_comparables} inmuebles comparables en la zona. El precio unitario ajustado oscila entre ${result['comparative_min_value']/prop['construction_area']:,.0f}/m² y ${result['comparative_max_value']/prop['construction_area']:,.0f}/m².

La renta mensual estimada es de ${monthly_rent:,.0f} MXN, lo que representa un Cap Rate del {cap_rate:.1f}% anual. La plusvalía histórica de la zona es aproximadamente {appreciation:.1f}% anual.

El método comparativo (70%) arrojó ${result['comparative_weighted']:,.0f} MXN, mientras que el método físico (30%) estimó ${result['physical_total']:,.0f} MXN.

CONCLUSIONES Y RECOMENDACIONES

La estimación presenta {confidence_text}. El rango de valor sugerido es de ${result['value_range_min']:,.0f} a ${result['value_range_max']:,.0f} MXN.

Para una negociación efectiva:
- Precio de salida sugerido: ${result['value_range_max']:,.0f} MXN
- Precio mínimo aceptable: ${result['value_range_min']:,.0f} MXN
- Margen de negociación típico: 5-10%

AVISO: Esta estimación es orientativa. Los comparables fueron obtenidos de portales inmobiliarios públicos. NO constituye un avalúo oficial con validez legal o bancaria."""


# ============== STATS ENDPOINTS ==============

@api_router.get("/stats")
async def get_stats():
    total_valuations = await db.valuations.count_documents({})
    completed_valuations = await db.valuations.count_documents({"status": "completed"})
    total_users = await db.users.count_documents({})
    
    return {
        "total_valuations": total_valuations,
        "completed_valuations": completed_valuations,
        "total_users": total_users
    }

@api_router.get("/property-types")
async def get_property_types():
    """Get available property types"""
    return {"property_types": PROPERTY_TYPES}

# ============== BASIC ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "PropValu Mexico API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    # Liviano a propósito (Railway lo pega seguido): sin tocar DB.
    return {"status": "healthy", "uptime_seconds": _metrics.uptime_seconds()}

# ============== ADMIN AUTH ==============
from core.config import UPLOADS_DIR, KYC_DIR, ADS_DIR

# Admin auth (login / me) -> routers/admin_auth.py (#66.1)

# Admin usuarios -> routers/admin_usuarios.py (#66.1)

# KYC -> routers/kyc.py (#66.1)

# Admin scraper -> routers/admin_scraper.py (#66.1)

# Anuncios / anunciantes / ads -> routers/ads.py (#66.1)

# Inmobiliaria equipo -> routers/inmobiliaria.py (#66.1)

# Mercado accesos -> routers/mercado_accesos.py (#66.1)

# ─── Mercado: snapshots mensuales ────────────────────────────────────────────

async def _generar_snapshot_mes(mes: str | None = None):
    """Genera o reemplaza el snapshot del mes indicado (default: mes actual)."""
    if not mes:
        mes = datetime.now(timezone.utc).strftime("%Y-%m")
    col_props = db["mercado_props"]
    col_snap  = db["mercado_snapshots"]

    # total_real excluye es_duplicado_secundario (misma propiedad en varios portales)
    _no_dup = {"$cond": [{"$ne": ["$es_duplicado_secundario", True]}, 1, 0]}

    resumen = {}
    for tipo_op in ("venta", "renta"):
        total = await col_props.count_documents({"activo": True, "tipo_operacion": tipo_op})
        total_real = await col_props.count_documents(
            {"activo": True, "tipo_operacion": tipo_op, "es_duplicado_secundario": {"$ne": True}})
        por_tipo = await col_props.aggregate([
            {"$match": {"activo": True, "tipo_operacion": tipo_op}},
            {"$group": {"_id": "$tipo_propiedad", "total": {"$sum": 1}, "total_real": {"$sum": _no_dup}}},
            {"$sort": {"total": -1}},
        ]).to_list(10)
        por_municipio = await col_props.aggregate([
            {"$match": {"activo": True, "tipo_operacion": tipo_op, "precio": {"$gt": 0}}},
            {"$group": {"_id": "$municipio", "total": {"$sum": 1}, "total_real": {"$sum": _no_dup},
                        "precio_m2_avg": {"$avg": "$precio_m2"}}},
            {"$sort": {"total": -1}}, {"$limit": 10},
        ]).to_list(10)
        resumen[tipo_op] = {
            "total": total,                                    # bruto (compat retro)
            "total_bruto": total,
            "total_real": total_real,
            "pct_duplicadas": round(100 * (total - total_real) / total, 1) if total else 0,
            "por_tipo": [{"name": r["_id"], "total": r["total"], "total_real": r.get("total_real", r["total"])} for r in por_tipo],
            "por_municipio": [{"name": r["_id"], "total": r["total"], "total_real": r.get("total_real", r["total"]),
                               "precio_m2_avg": round(r.get("precio_m2_avg") or 0)} for r in por_municipio],
        }

    # Ranking de calidad por portal: % de docs activos con cada campo clave lleno
    _campos_calidad = ["anio_construccion", "m2_construccion", "m2_terreno",
                       "colonia", "recamaras", "banos", "precio", "telefono"]
    _lleno = lambda c: {"$sum": {"$cond": [
        {"$and": [{"$ne": [f"${c}", None]}, {"$ne": [f"${c}", ""]}, {"$ne": [f"${c}", 0]}]}, 1, 0]}}
    cal_raw = await col_props.aggregate([
        {"$match": {"activo": True}},
        {"$group": {"_id": "$portal_origen", "total": {"$sum": 1},
                    **{f"con_{c}": _lleno(c) for c in _campos_calidad}}},
        {"$sort": {"total": -1}},
    ]).to_list(20)
    calidad_portales = []
    for r in cal_raw:
        if not r.get("total") or not r["_id"]:
            continue
        pct = {c: round(100 * r.get(f"con_{c}", 0) / r["total"]) for c in _campos_calidad}
        calidad_portales.append({
            "portal": r["_id"], "total": r["total"],
            "score_calidad": round(sum(pct.values()) / len(_campos_calidad)),
            "campos_pct": pct,
        })
    calidad_portales.sort(key=lambda x: x["score_calidad"], reverse=True)

    await col_snap.update_one(
        {"mes": mes},
        {"$set": {
            "mes": mes,
            "resumen": resumen,
            "calidad_portales": calidad_portales,
            "total_props": resumen["venta"]["total"] + resumen["renta"]["total"],
            "total_props_real": resumen["venta"]["total_real"] + resumen["renta"]["total_real"],
            "generado_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return mes

@api_router.get("/mercado/snapshots")
async def mercado_snapshots():
    docs = await db["mercado_snapshots"].find(
        {}, {"_id": 0, "mes": 1, "total_props": 1, "generado_at": 1}
    ).sort("mes", -1).to_list(24)
    return {"snapshots": docs}

@api_router.post("/admin/mercado/generar-snapshot")
async def admin_generar_snapshot(request: Request):
    await require_admin_or_job(request)  # admin UI o cron externo (#66.3)
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    mes = body.get("mes") if isinstance(body, dict) else None
    mes_generado = await _generar_snapshot_mes(mes)
    return {"ok": True, "mes": mes_generado}

# ─── Sync Google Sheets → mercado_props ──────────────────────────────────────

async def _sync_sheets_to_mercado_props() -> dict:
    """
    Lee todas las tabs del Google Sheet del scraper y hace upsert en mercado_props.
    Usa id_unico como clave para evitar duplicados.
    Omite la tab CONSOLIDADO (es espejo de las demás).
    """
    from sheets_comparables import (
        fetch_sheet_tab, SHEET_TABS, SHEET_COLUMNS, SHEET_ID_DEFAULT,
        _cell, _parse_price, _parse_area, _parse_int, _parse_float,
    )
    from pymongo import UpdateOne as MongoUpdateOne

    sheet_id = os.environ.get("GOOGLE_SHEETS_ID", SHEET_ID_DEFAULT).strip()
    api_key  = os.environ.get("GOOGLE_SHEETS_API_KEY", "").strip()
    col      = db["mercado_props"]
    now      = datetime.now(timezone.utc).isoformat()

    tabs = [t for t in SHEET_TABS if t != "CONSOLIDADO"]
    total_new = total_updated = total_skipped = 0

    for tab_name in tabs:
        try:
            rows = await fetch_sheet_tab(tab_name, api_key, sheet_id)
        except Exception as exc:
            logging.warning(f"[sync_sheets] Error leyendo tab {tab_name}: {exc}")
            continue

        if not rows:
            logging.info(f"[sync_sheets] Tab {tab_name} vacía, omitida")
            continue

        ops = []
        for row in rows:
            raw = {name: _cell(row, i) for i, name in enumerate(SHEET_COLUMNS)}
            id_unico = raw.get("id_unico")
            if not id_unico:
                total_skipped += 1
                continue

            precio    = _parse_price(raw.get("precio"))
            m2_const  = _parse_area(raw.get("m2_construccion"))
            m2_terr   = _parse_area(raw.get("m2_terreno"))
            area_ref  = m2_const or m2_terr or 0
            precio_m2 = round(precio / area_ref, 2) if area_ref and precio else 0
            activo_raw = str(raw.get("activo") or "TRUE").strip().upper()
            activo = activo_raw not in ("FALSE", "0", "")

            doc = {
                "id_unico":         id_unico,
                "titulo":           raw.get("titulo") or "",
                "precio":           precio,
                "moneda":           raw.get("moneda") or "MXN",
                "tipo_operacion":   (raw.get("tipo_operacion") or "venta").lower(),
                "tipo_propiedad":   raw.get("tipo_propiedad") or "",
                "colonia":          raw.get("colonia") or "",
                "municipio":        raw.get("municipio") or "",
                "estado":           raw.get("estado") or "",
                "recamaras":        _parse_int(raw.get("recamaras")),
                "banos":            _parse_float(raw.get("banos")),
                "m2_construccion":  m2_const,
                "m2_terreno":       m2_terr,
                "precio_m2":        precio_m2,
                "estacionamientos": _parse_int(raw.get("estacionamientos")),
                "anio_construccion":raw.get("anio_construccion"),
                "descripcion":      raw.get("descripcion") or "",
                "url_original":     raw.get("url_original") or "",
                "nombre_agente":    raw.get("nombre_agente") or "",
                "fecha_publicacion":raw.get("fecha_publicacion") or "",
                "portal_origen":    raw.get("portal_origen") or tab_name,
                "portal_tab":       tab_name,
                "fecha_scraping":   raw.get("fecha_scraping") or "",
                "activo":           activo,
                "importado_at":     now,
            }
            ops.append(MongoUpdateOne({"id_unico": id_unico}, {"$set": doc}, upsert=True))

        if not ops:
            continue

        # Bulk upsert en lotes de 500
        batch_size = 500
        for i in range(0, len(ops), batch_size):
            result = await col.bulk_write(ops[i:i+batch_size], ordered=False)
            total_new     += result.upserted_count
            total_updated += result.modified_count

        logging.info(f"[sync_sheets] {tab_name}: {len(ops)} filas procesadas")

    # Limpiar cache de mercado para que refleje los datos nuevos
    for key in list(_mercado_cache.keys()):
        if key.startswith("colonias_") or key.startswith("stats_") or key.startswith("segmentos_"):
            _mercado_cache.pop(key, None)

    summary = {
        "nuevos": total_new,
        "actualizados": total_updated,
        "sin_id": total_skipped,
        "tabs": len(tabs),
        "ejecutado_at": now,
    }
    logging.info(f"[sync_sheets] Sync completo: {summary}")
    return summary


@api_router.post("/admin/mercado/sync-sheets")
async def admin_sync_sheets(request: Request):
    """Importa / actualiza mercado_props desde Google Sheets (upsert por id_unico)."""
    await require_admin_or_job(request)  # admin UI o cron externo (#66.3)
    summary = await _sync_sheets_to_mercado_props()
    return {"ok": True, **summary}


# Encargos / Payouts -> routers/encargos.py (#66.1)

async def _job_sync_sheets():
    """Job diario: sync Google Sheets → mercado_props."""
    logging.info("[scheduler] Iniciando sync diario Sheets → mercado_props")
    try:
        summary = await _sync_sheets_to_mercado_props()
        logging.info(f"[scheduler] Sync diario completado: {summary}")
    except Exception as exc:
        logging.error(f"[scheduler] Error en sync diario: {exc}")

# ─── Scheduler mensual ───────────────────────────────────────────────────────

PORTALES_IDS_SCHED = ["INMUEBLES24", "PINCALI", "VIVANUNCIOS", "MITULA", "CASAS_Y_TERRENOS", "PROPIEDADES_COM"]

async def _job_scrape_mensual():
    """Día 2 de cada mes: lanza 5 portales en paralelo desde SCRAPER_DIR, luego genera snapshot."""
    logging.info("[scheduler] Iniciando scrape mensual automático")
    scraper_path = Path(SCRAPER_DIR)
    if not scraper_path.exists():
        logging.error(f"[scheduler] SCRAPER_DIR no existe: {scraper_path} — abortando scrape mensual")
        return
    python_exe = os.environ.get("SCRAPER_PYTHON", "python")
    tasks = []
    for portal in PORTALES_IDS_SCHED:
        tasks.append(asyncio.create_subprocess_exec(
            python_exe, "scheduler.py", "--portal", portal,
            cwd=str(scraper_path),
        ))
    procs = await asyncio.gather(*tasks, return_exceptions=True)
    for p in procs:
        if hasattr(p, "wait"):
            await p.wait()
    logging.info("[scheduler] Scrape mensual terminado — sincronizando Sheets y generando snapshot")
    await _sync_sheets_to_mercado_props()
    mes = await _generar_snapshot_mes()
    logging.info(f"[scheduler] Snapshot generado: {mes}")

# ─── Startup / shutdown ───────────────────────────────────────────────────────

@api_router.get("/metrics")
async def metrics(request: Request):
    """Métricas básicas (#66.5). Admin-only. Incluye snapshot de requests/latencia,
    ping a Mongo y conteos de colecciones clave."""
    await require_admin(request)
    snap = _metrics.snapshot()
    # Ping a Mongo + conteos baratos (estimated = lee metadata, no escanea).
    db_ok, db_error = True, None
    try:
        await db.command("ping")
        snap["db"] = {
            "ok": True,
            "valuations": await db.valuations.estimated_document_count(),
            "users": await db.users.estimated_document_count(),
            "mercado_props": await db.mercado_props.estimated_document_count(),
        }
    except Exception as e:
        snap["db"] = {"ok": False, "error": str(e)}
    return snap

async def _ensure_indexes():
    """Índices para evitar full collection scans en las rutas calientes.
    create_index es idempotente (no-op si ya existe). No-únicos para no
    fallar si hubiera datos duplicados preexistentes."""
    await db.users.create_index("email")
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token")
    await db.user_sessions.create_index("expires_at")
    await db.valuations.create_index("valuation_id")
    await db.valuations.create_index("user_id")
    await db["authorized_access"].create_index("email")
    await db.admins.create_index("token")
    await db.admins.create_index("email")
    # #65 escalabilidad — mercado_props (~100k docs) solo tenía _id_ → COLLSCAN en
    # cada request de la página de mercado y en el dedup de data_exchange. Índices
    # sobre los filtros EXACTOS del hot path (colonia usa $regex, no se indexa).
    await db.mercado_props.create_index([("activo", 1), ("tipo_operacion", 1), ("tipo_propiedad", 1)])
    await db.mercado_props.create_index("id_unico")
    await db.mercado_props.create_index("inmobiliaria_id")
    await db.mercado_props.create_index([("municipio", 1), ("tipo_propiedad", 1)])
    await db.propiedades_inmobiliaria.create_index("user_id")
    await db.requisiciones.create_index("user_id")
    await db.requisiciones.create_index("expira_en")
    # Fase 4 federación (#atlas-colonias): espejo del feed público de clasificaciones
    await db.colonia_classifications_atlas.create_index("atlas_proposal_id", unique=True)
    await db.colonia_classifications_atlas.create_index([("municipio_norm", 1), ("colonia_norm", 1)])
    await db.classifier_profiles_atlas.create_index("atlas_profile_id", unique=True)
    await db.classifier_profiles_atlas.create_index("email")


@app.on_event("startup")
async def startup():
    try:
        await _ensure_indexes()
        logging.info("[startup] índices de MongoDB verificados")
    except Exception as e:
        logging.error(f"[startup] _ensure_indexes falló (continuando): {e}")
    try:
        await _seed_mercado_accesos()
    except Exception as e:
        logging.error(f"[startup] seed_mercado_accesos falló (continuando): {e}")
    # Scheduler embebido OPT-IN. Por defecto NO corre: en Railway el job de
    # scrape mensual falla (no existe scraper-inmuebles en el contenedor) y el
    # scrape ya lo maneja el Task Scheduler de Windows local. Para correr el
    # cron en algún entorno, setear ENABLE_SCHEDULER=1.
    if os.environ.get("ENABLE_SCHEDULER") == "1":
        try:
            _scheduler.add_job(
                _job_scrape_mensual,
                CronTrigger(day=2, hour=3, minute=0),
                id="scrape_mensual",
                replace_existing=True,
            )
            _scheduler.add_job(
                _job_sync_sheets,
                CronTrigger(day=3, hour=4, minute=30),
                id="sync_sheets_mensual",
                replace_existing=True,
            )
            _scheduler.start()
            logging.info("[scheduler] APScheduler iniciado (ENABLE_SCHEDULER=1)")
        except Exception as e:
            logging.error(f"[startup] scheduler falló (continuando): {e}")
    else:
        logging.info("[scheduler] deshabilitado (ENABLE_SCHEDULER!=1) — cron embebido no corre")

# Include router
app.include_router(api_router)
app.include_router(access_router)
app.include_router(newsletter_router)
app.include_router(cms_router)
app.include_router(feedback_router)
app.include_router(admin_config_router)
app.include_router(admin_misc_router)
app.include_router(admin_activity_router)
app.include_router(admin_inmobiliarias_router)
app.include_router(admin_reportes_router)
app.include_router(directorio_router)
app.include_router(auth_router)
app.include_router(admin_usuarios_router)
app.include_router(kyc_router)
app.include_router(admin_scraper_router)
app.include_router(mercado_router)
app.include_router(ads_router)
app.include_router(encargos_router)
app.include_router(inmobiliaria_router)
app.include_router(mercado_accesos_router)
app.include_router(reviews_router)
app.include_router(edades_router)
app.include_router(data_exchange_router)
app.include_router(gamificacion_router)
app.include_router(admin_auth_router)
app.include_router(requisiciones_router)
app.include_router(acabados_router)
app.include_router(atlas_colonias_router)
app.include_router(flipping_router)

# Serve uploaded files (ads, kyc) con soporte de HTTP Range (206).
# StaticFiles en este entorno responde 200 sin Accept-Ranges a peticiones Range, y
# Chromium EXIGE 206 para reproducir <video>/<audio> (si no → readyState 0 = negro).
# Esta ruta implementa Range para que los creativos de video funcionen.
import mimetypes as _mimetypes
from starlette.responses import StreamingResponse as _StreamingResponse

@app.get("/uploads/{file_path:path}")
async def serve_upload(file_path: str, request: Request):
    base = UPLOADS_DIR.resolve()
    full = (UPLOADS_DIR / file_path).resolve()
    if base not in full.parents or not full.is_file():
        raise HTTPException(status_code=404, detail="No encontrado")
    file_size = full.stat().st_size
    media_type = _mimetypes.guess_type(str(full))[0] or "application/octet-stream"
    range_header = request.headers.get("range", "")

    if range_header.startswith("bytes="):
        try:
            start_s, _, end_s = range_header[6:].partition("-")
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else file_size - 1
        except ValueError:
            start, end = 0, file_size - 1
        end = min(end, file_size - 1)
        start = max(0, min(start, end))
        length = end - start + 1

        def _iter_range():
            with open(full, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(262144, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return _StreamingResponse(_iter_range(), status_code=206, media_type=media_type, headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
        })

    def _iter_full():
        with open(full, "rb") as f:
            while True:
                chunk = f.read(262144)
                if not chunk:
                    break
                yield chunk

    return _StreamingResponse(_iter_full(), media_type=media_type, headers={
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
    })

# CORS restringido: localhost (dev), el alias de producción, los deploys de
# ESTA cuenta de Vercel (…-pedrucus-projects.vercel.app) y el dominio propio.
# Antes el regex aceptaba CUALQUIER *.vercel.app con credenciales — demasiado abierto.
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"^https?://(localhost(:\d+)?|frontend-rosy-six-74\.vercel\.app|[a-z0-9-]+-pedrucus-projects\.vercel\.app|([a-z0-9-]+\.)?propvalu\.mx)$",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
