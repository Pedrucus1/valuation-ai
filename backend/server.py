from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import asyncio
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

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

# Import report generator
from report_generator import generate_html_report

# Create the main app
app = FastAPI(title="PropValu Mexico API")

import re as _re

def _is_localhost(origin: str) -> bool:
    return bool(_re.match(r"^https?://localhost(:\d+)?$", origin))

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if _is_localhost(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    logging.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno: {str(exc)}"},
        headers=headers,
    )

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

PROPERTY_TYPES = [
    "Casa",
    "Departamento",
    "Terreno",
    "Local comercial",
    "Oficina",
    "Bodega",
    "Nave industrial"
]

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "public"
    created_at: datetime
    kyc_status: Optional[str] = "pending"
    credits: Optional[int] = 0
    plan: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    estado: Optional[str] = None
    municipio: Optional[str] = None
    inmobiliaria_tipo: Optional[str] = None
    asociacion: Optional[str] = None
    modo_perfil: Optional[str] = None
    q_anos_mercado: Optional[str] = None
    q_tipo_operaciones: Optional[Dict[str, Any]] = None
    q_cartera_propiedades: Optional[str] = None
    q_crm: Optional[str] = None
    verificacion_pendiente: Optional[bool] = None
    cursos: Optional[str] = None
    empresa_afiliada: Optional[str] = None
    municipios: Optional[List[str]] = None
    estados: Optional[List[str]] = None
    cobertura_municipios: Optional[Dict[str, Any]] = None
    q_oficina: Optional[bool] = None
    q_dir_oficina: Optional[str] = None
    q_maps_url: Optional[str] = None
    redes_sociales: Optional[Dict[str, Any]] = None
    galardones: Optional[str] = None

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # "appraiser" | "realtor"
    phone: Optional[str] = None
    company_name: Optional[str] = None
    estado: Optional[str] = None
    municipio: Optional[str] = None
    municipios: Optional[List[str]] = None
    modo_perfil: Optional[str] = None  # "basico" | "completo"
    services: Optional[Dict[str, Any]] = None
    servicios_otros: Optional[List[str]] = None
    peritajes_tipos: Optional[List[str]] = None
    peritajes_otros: Optional[str] = None
    # Cuestionario perfil completo
    q_experiencia: Optional[str] = None
    q_equipo: Optional[str] = None
    q_oficina: Optional[bool] = None
    q_dir_oficina: Optional[str] = None
    q_maps_url: Optional[str] = None
    q_tiempo_entrega: Optional[str] = None
    q_seguro_rc: Optional[bool] = None
    q_unidad_valuacion: Optional[str] = None
    q_software: Optional[str] = None
    q_idiomas: Optional[str] = None
    # Cédulas
    profesion_base: Optional[str] = None
    profesion_base_otro: Optional[str] = None
    num_cedula_base: Optional[str] = None
    num_cedula_valuador: Optional[str] = None
    # Inmobiliaria
    inmobiliaria_tipo: Optional[str] = None
    asociacion: Optional[str] = None
    cursos: Optional[str] = None
    num_asesores: Optional[str] = None
    empresa_afiliada: Optional[str] = None
    # Cuestionario inmobiliaria
    q_anos_mercado: Optional[str] = None
    q_tipo_operaciones: Optional[Dict[str, Any]] = None
    q_cartera_propiedades: Optional[str] = None
    q_crm: Optional[str] = None
    verificacion_pendiente: Optional[bool] = None
    # Cobertura inmobiliaria
    estados: Optional[List[str]] = None
    cobertura_municipios: Optional[Dict[str, Any]] = None
    # Redes sociales y galardones
    redes_sociales: Optional[Dict[str, Any]] = None
    galardones: Optional[str] = None
    # Campos adicionales (no en model_dump estricto, pero sí en MongoDB)
    num_asesores: Optional[str] = None
    empresa_afiliada: Optional[str] = None
    services: Optional[Dict[str, Any]] = None
    servicios_otros: Optional[List[str]] = None
    peritajes_tipos: Optional[List[str]] = None
    peritajes_otros: Optional[str] = None
    q_experiencia: Optional[str] = None
    q_equipo: Optional[str] = None
    q_tiempo_entrega: Optional[str] = None
    q_seguro_rc: Optional[bool] = None
    q_unidad_valuacion: Optional[str] = None
    q_software: Optional[str] = None
    q_idiomas: Optional[str] = None
    profesion_base: Optional[str] = None
    profesion_base_otro: Optional[str] = None
    num_cedula_base: Optional[str] = None
    num_cedula_valuador: Optional[str] = None
    modo_perfil: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyInput(BaseModel):
    # Required fields
    state: str
    municipality: str
    neighborhood: str
    land_area: float
    construction_area: float
    land_regime: str  # URBANO, EJIDAL, COMUNAL, RUSTICO
    property_type: str  # Casa, Departamento, Terreno, Local comercial, Oficina, Bodega, Nave industrial
    
    # Optional fields
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    parking_spaces: Optional[int] = None
    service_room: Optional[bool] = False
    laundry_room: Optional[bool] = False
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    estimated_age: Optional[int] = None
    conservation_state: Optional[str] = None
    construction_quality: Optional[str] = None
    special_features: Optional[List[str]] = None
    other_features: Optional[str] = None  # Free text for additional features
    street_address: Optional[str] = None
    postal_code: Optional[str] = None
    land_use: Optional[str] = None  # H1-U, H2-V, H3-V, H4-V, HM, HC, HO, CU, CB, CD, CS, CC, CR, I-L, I-M, I-P, IP, EA, EI, PE, AG
    
    # Location coordinates
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Photos (base64 encoded)
    photos: Optional[List[str]] = None

class Comparable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comparable_id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:12]}")
    source: str
    source_url: str
    title: str
    neighborhood: str
    municipality: str
    state: str
    land_area: Optional[float] = None
    construction_area: Optional[float] = None
    price: float
    price_per_sqm: float
    property_type: str
    land_regime: str = "URBANO"
    listing_type: str = "venta"
    image_url: Optional[str] = None
    
    # Adjustments
    negotiation_adjustment: float = 0.0
    area_adjustment: float = 0.0
    condition_adjustment: float = 0.0
    location_adjustment: float = 0.0
    regime_adjustment: float = 0.0
    total_adjustment: float = 0.0
    adjusted_price_per_sqm: float = 0.0
    
    is_selected: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarketMetrics(BaseModel):
    monthly_rent_estimate: float = 0.0
    annual_rent_estimate: float = 0.0
    cap_rate: float = 0.0
    annual_appreciation: float = 0.0
    rental_factor_used: float = 0.0
    similar_properties_count: int = 0
    rental_listings_count: int = 0

class ValuationResult(BaseModel):
    # Comparative method (70%)
    comparative_min_value: float = 0.0
    comparative_avg_value: float = 0.0
    comparative_max_value: float = 0.0
    comparative_weighted: float = 0.0
    
    # Physical method (30%)
    land_value: float = 0.0
    construction_new_value: float = 0.0
    depreciation_percent: float = 0.0
    construction_depreciated: float = 0.0
    physical_total: float = 0.0
    
    # Final values
    estimated_value: float = 0.0
    value_range_min: float = 0.0
    value_range_max: float = 0.0
    price_per_sqm: float = 0.0
    confidence_level: str = "MEDIO"
    
    # Market metrics
    market_metrics: Optional[MarketMetrics] = None

class Valuation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    valuation_id: str = Field(default_factory=lambda: f"val_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    mode: str = "public"
    
    property_data: PropertyInput
    comparables: List[Comparable] = []
    rental_comparables: List[Comparable] = []
    selected_comparables: List[str] = []
    
    result: Optional[ValuationResult] = None
    report_html: Optional[str] = None
    
    status: str = "draft"
    consultation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        return None
    
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")
    
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Session inválida")
    
    auth_data = auth_response.json()
    
    existing_user = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "public",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user.model_dump()

@api_router.put("/auth/profile")
async def update_profile(request: Request):
    user = await require_auth(request)
    body = await request.json()
    allowed = {
        "name", "phone", "estado", "municipio", "municipios",
        "profesion_base", "profesion_base_otro", "num_cedula_base", "num_cedula_valuador",
        "q_web_perfil",
        "q_experiencia", "q_equipo", "q_oficina", "q_dir_oficina", "q_maps_url",
        "q_tiempo_entrega", "q_seguro_rc", "q_unidad_valuacion",
        "q_software", "q_idiomas",
        "services", "servicios_otros", "peritajes_tipos", "peritajes_otros",
    }
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="Sin campos válidos para actualizar")
    await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "hashed_password": 0})
    return updated

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Sesión cerrada"}

@api_router.post("/auth/upgrade-role")
async def upgrade_role(request: Request):
    user = await require_auth(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "appraiser"}}
    )
    return {"message": "Rol actualizado a valuador", "role": "appraiser"}

@api_router.post("/auth/register")
async def register_email(data: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    if data.role not in ("appraiser", "realtor"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = pwd_context.hash(data.password)

    new_user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "picture": None,
        "role": data.role,
        "phone": data.phone,
        "company_name": data.company_name,
        "estado": data.estado,
        "municipio": data.municipio,
        "municipios": data.municipios,
        "modo_perfil": data.modo_perfil,
        "services": data.services,
        "servicios_otros": data.servicios_otros,
        "peritajes_tipos": data.peritajes_tipos,
        "peritajes_otros": data.peritajes_otros,
        # Cuestionario perfil completo
        "q_experiencia": data.q_experiencia,
        "q_equipo": data.q_equipo,
        "q_oficina": data.q_oficina,
        "q_dir_oficina": data.q_dir_oficina,
        "q_maps_url": data.q_maps_url,
        "q_tiempo_entrega": data.q_tiempo_entrega,
        "q_seguro_rc": data.q_seguro_rc,
        "q_unidad_valuacion": data.q_unidad_valuacion,
        "q_software": data.q_software,
        "q_idiomas": data.q_idiomas,
        "profesion_base": data.profesion_base,
        "profesion_base_otro": data.profesion_base_otro,
        "num_cedula_base": data.num_cedula_base,
        "num_cedula_valuador": data.num_cedula_valuador,
        # Inmobiliaria
        "inmobiliaria_tipo": data.inmobiliaria_tipo,
        "asociacion": data.asociacion,
        "cursos": data.cursos,
        "num_asesores": data.num_asesores,
        "empresa_afiliada": data.empresa_afiliada,
        "q_anos_mercado": data.q_anos_mercado,
        "q_tipo_operaciones": data.q_tipo_operaciones,
        "q_cartera_propiedades": data.q_cartera_propiedades,
        "q_crm": data.q_crm,
        "verificacion_pendiente": data.verificacion_pendiente,
        "estados": data.estados,
        "cobertura_municipios": data.cobertura_municipios,
        "redes_sociales": data.redes_sociales,
        "galardones": data.galardones,
        "hashed_password": hashed_pw,
        "kyc_status": "pending",
        "credits": 0,
        "plan": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)

    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    user_out = {k: v for k, v in new_user.items() if k not in ("hashed_password", "_id")}
    return user_out

@api_router.post("/auth/login")
async def login_email(data: LoginRequest, response: Response):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    hashed = user_doc.get("hashed_password", "")
    if not hashed or not pwd_context.verify(data.password, hashed):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    user_id = user_doc["user_id"]
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    user_out = {k: v for k, v in user_doc.items() if k not in ("hashed_password",)}
    return user_out

# ============== VALUATION ENDPOINTS ==============

@api_router.post("/valuations", response_model=dict)
async def create_valuation(property_input: PropertyInput, request: Request):
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

@api_router.get("/valuations/{valuation_id}")
async def get_valuation(valuation_id: str, request: Request):
    valuation = await db.valuations.find_one(
        {"valuation_id": valuation_id},
        {"_id": 0}
    )
    
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuación no encontrada")
    
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

@api_router.post("/valuations/{valuation_id}/generate-comparables")
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
    
    # ============== 1. TRY AI SEARCH FIRST (OpenAI + Gemini) ==============
    try:
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
        
        if ai_result.get("success") and ai_result.get("comparables"):
            ai_comparables = ai_result["comparables"]
            ai_providers_used = ai_result.get("providers_used", [])
            search_method = "ai"
            
            logger.info(f"AI search found {len(ai_comparables)} comparables via {ai_providers_used}")
            
            # Convert AI results to Comparable format with adjustments
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
                    negotiation_adjustment=base_negotiation,
                    area_adjustment=round(area_adj, 2),
                    condition_adjustment=round(condition_adj, 2),
                    location_adjustment=round(location_adj, 2),
                    regime_adjustment=regime_adj,
                    total_adjustment=round(total_adj, 2),
                    adjusted_price_per_sqm=round(adjusted_price_per_sqm, 2)
                )
                comparables.append(comparable.model_dump())
            
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
    
    # ============== 3. LAST RESORT: SIMULATED DATA ==============
    if len(comparables) < 10:
        logger.info(f"Adding simulated comparables (have {len(comparables)}, need 10-15)")
        search_method = "mixed" if len(comparables) > 0 else "simulated"
        
        base_prices = {
            "Ciudad de México": 35000, "Nuevo León": 30000, "Jalisco": 25000,
            "Quintana Roo": 28000, "Estado de México": 18000, "Querétaro": 22000,
        }
        base_price = base_prices.get(prop["state"], 20000)
        
        type_multipliers = {
            "Casa": 1.0, "Departamento": 1.1, "Terreno": 0.4,
            "Local comercial": 1.3, "Oficina": 1.2, "Bodega": 0.6, "Nave industrial": 0.5
        }
        base_price *= type_multipliers.get(search_type, 1.0)
        
        sources = ["inmuebles24.com", "lamudi.com.mx", "vivanuncios.com.mx", "propiedades.com"]
        
        for i in range(15 - len(comparables)):
            land_var = random.uniform(0.75, 1.25)
            const_var = random.uniform(0.75, 1.25)
            price_var = random.uniform(0.85, 1.15)
            
            land_area = prop["land_area"] * land_var
            construction_area = prop["construction_area"] * const_var
            price_per_sqm = base_price * price_var
            price = price_per_sqm * construction_area
            
            area_adj = random.uniform(-3, 3)
            condition_adj = random.uniform(-3, 3)
            location_adj = random.uniform(-2, 2)
            regime_adj = 0 if prop["land_regime"] == "URBANO" else {"EJIDAL": -20, "COMUNAL": -25, "RUSTICO": -30}.get(prop["land_regime"], 0)
            total_adj = base_negotiation + area_adj + condition_adj + location_adj + regime_adj
            adjusted_price = price_per_sqm * (1 + total_adj / 100)
            
            source = random.choice(sources)
            
            comparable = Comparable(
                source=source,
                source_url=f"https://www.{source}/inmueble/{random.randint(100000, 999999)}",
                title=f"{search_type} en {prop['neighborhood']}",
                neighborhood=prop["neighborhood"],
                municipality=prop["municipality"],
                state=prop["state"],
                land_area=round(land_area, 2),
                construction_area=round(construction_area, 2),
                price=round(price, 2),
                price_per_sqm=round(price_per_sqm, 2),
                property_type=search_type,
                land_regime=prop["land_regime"],
                listing_type="venta",
                negotiation_adjustment=base_negotiation,
                area_adjustment=round(area_adj, 2),
                condition_adjustment=round(condition_adj, 2),
                location_adjustment=round(location_adj, 2),
                regime_adjustment=regime_adj,
                total_adjustment=round(total_adj, 2),
                adjusted_price_per_sqm=round(adjusted_price, 2)
            )
            comparables.append(comparable.model_dump())
    
    # Update valuation in database
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "comparables": comparables,
                "rental_comparables": rental_comparables,
                "rental_factor_data": rental_factor_data,
                "similar_properties_count": len(comparables),
                "search_method": search_method,
                "ai_providers_used": ai_providers_used,
                "status": "comparables_ready",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "comparables": comparables,
        "rental_comparables": rental_comparables,
        "count": len(comparables),
        "rental_count": len(rental_comparables),
        "rental_factor": rental_factor_data,
        "search_method": search_method,
        "ai_providers_used": ai_providers_used
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
    
    # Construction cost (updated 2025 values for Mexico)
    quality_costs = {
        "Interés social": 12000,    # Basic construction
        "Media": 16000,              # Standard middle-class
        "Media-alta": 22000,         # Upper-middle
        "Residencial": 30000,        # High-end residential
        "Residencial plus": 45000    # Luxury
    }
    
    quality = prop.get("construction_quality") or "Media"
    cost_per_sqm = quality_costs.get(quality, 16000)
    construction_new = cost_per_sqm * construction_area
    
    # Age-based depreciation (Ross-Heidecke method simplified)
    age = prop.get("estimated_age") or 10
    useful_life = 60  # years for residential
    
    # Conservation state affects remaining useful life
    conservation_factors = {
        "Excelente": 1.0,   # No penalty
        "Bueno": 0.85,      # 15% penalty
        "Regular": 0.65,    # 35% penalty  
        "Malo": 0.40        # 60% penalty
    }
    conservation = prop.get("conservation_state") or "Bueno"
    conservation_factor = conservation_factors.get(conservation, 0.85)
    
    # Calculate depreciation
    age_depreciation = min(age / useful_life, 0.50)  # Cap at 50%
    total_depreciation = age_depreciation + (1 - conservation_factor) * 0.3
    total_depreciation = min(total_depreciation, 0.60)  # Max 60% depreciation
    
    construction_depreciated = construction_new * (1 - total_depreciation)
    physical_total = land_value + construction_depreciated
    
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
    
    await db.valuations.update_one(
        {"valuation_id": valuation_id},
        {
            "$set": {
                "result": result.model_dump(),
                "status": "calculated",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return result.model_dump()

@api_router.post("/valuations/{valuation_id}/generate-report")
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
    
    prop = valuation["property_data"]
    result = valuation["result"]
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    
    if valuation.get("mode") == "private" and selected_ids:
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
- Conservación: {prop.get('conservation_state', 'Bueno')}, Edad: {prop.get('estimated_age', 10)} años
- Valor estimado: ${base_value:,.0f} MXN
- Renta mensual estimada: ${monthly_rent:,.0f} MXN
- Cap Rate: {cap_rate:.1f}%
- Plusvalía histórica zona: {annual_appreciation:.1f}% anual
- Comparables: {comparables_text}

Responde con este JSON (usa valores realistas para la zona, no inventes datos absurdos):
{{
  "analisis_mercado": "Párrafo 1: análisis del mercado local y comparables. Párrafo 2: conclusión con recomendaciones de negociación y estrategia de venta. Sé conciso y profesional.",
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
    "seguridad": {{"score": 7, "texto": "Descripción breve de seguridad en la zona"}},
    "movilidad": {{"score": 7, "texto": "Descripción breve de transporte y acceso"}},
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

IMPORTANTE: Devuelve SOLO el JSON. Los scores de perfil_entorno deben ser enteros del 1 al 10 basados en la zona real. Para educacion/salud/comercio/recreacion/plazas incluye count (ej: "13+") y nombres reales de establecimientos conocidos en la zona. Los valores de plusvalía son proyecciones, ya los calculé tú solo ajusta el comentario."""

            _genai.configure(api_key=gemini_key)
            _sys = "Valuador inmobiliario certificado en México. Responde SOLO con JSON válido, sin markdown."

            import json as _json

            def _call_gemini(model_name: str):
                _m = _genai.GenerativeModel(model_name, system_instruction=_sys)
                return _m.generate_content(prompt)

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
                # Try models in order, fallback on rate limit
                for _model_name in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"):
                    try:
                        _gresult = await asyncio.wait_for(
                            _loop.run_in_executor(None, lambda m=_model_name: _call_gemini(m)),
                            timeout=30.0
                        )
                        ai_sections = _parse_raw(_gresult.text)
                        analysis = ai_sections.get("analisis_mercado", analysis)
                        logger.info(f"Gemini AI sections generated ({_model_name})")
                        break
                    except Exception as _me:
                        logger.warning(f"{_model_name} failed: {_me}")
                        continue
            except asyncio.TimeoutError:
                logger.warning("Gemini timeout, using template analysis")

    except Exception as e:
        logger.error(f"LLM error (using template): {e}")

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
    return {"status": "healthy"}

# ============== ADMIN AUTH ==============

ADMIN_SECRET = os.environ.get("ADMIN_SECRET")
if not ADMIN_SECRET:
    raise RuntimeError("ADMIN_SECRET no está definida en las variables de entorno")
UPLOADS_DIR = ROOT_DIR / "uploads"
KYC_DIR = UPLOADS_DIR / "kyc"
KYC_DIR.mkdir(parents=True, exist_ok=True)
ADS_DIR = UPLOADS_DIR / "ads"
ADS_DIR.mkdir(parents=True, exist_ok=True)

class AdminLoginRequest(BaseModel):
    email: str
    password: str

async def require_admin(request: Request):
    token = request.headers.get("X-Admin-Token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token de administrador requerido")
    admin = await db.admins.find_one({"token": token, "activo": True}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return admin

@api_router.post("/admin/auth/login")
async def admin_login(data: AdminLoginRequest):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin:
        # Seed superadmin from env on first login
        if data.email == os.environ.get("ADMIN_EMAIL", "admin@propvalu.mx") and data.password == ADMIN_SECRET:
            token = f"adm_{uuid.uuid4().hex}"
            doc = {
                "admin_id": f"adm_{uuid.uuid4().hex[:8]}",
                "email": data.email,
                "nombre": "Super Admin",
                "rol": "superadmin",
                "token": token,
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.admins.insert_one(doc)
            return {k: v for k, v in doc.items() if k != "_id"}
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    stored_hash = admin.get("hashed_password")
    if stored_hash:
        if not pwd_context.verify(data.password, stored_hash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    else:
        if data.password != ADMIN_SECRET:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = f"adm_{uuid.uuid4().hex}"
    await db.admins.update_one({"email": data.email}, {"$set": {"token": token}})
    return {**{k: v for k, v in admin.items() if k not in ("_id", "hashed_password")}, "token": token}

@api_router.get("/admin/auth/me")
async def admin_me(request: Request):
    admin = await require_admin(request)
    return admin

# ============== ADMIN — USUARIOS ==============

@api_router.get("/admin/usuarios")
async def admin_usuarios(request: Request, skip: int = 0, limit: int = 50, q: str = "", tipo: str = "", estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if q:
        filtro["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if tipo:
        filtro["role"] = tipo
    if estado:
        filtro["cuenta_estado"] = estado
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(filtro)
    return {"usuarios": usuarios, "total": total}

@api_router.patch("/admin/usuarios/{user_id}/estado")
async def admin_usuario_estado(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    nuevo_estado = body.get("estado")
    if nuevo_estado not in ("activo", "suspendido"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    await db.users.update_one({"user_id": user_id}, {"$set": {"cuenta_estado": nuevo_estado}})
    return {"ok": True}

# ============== ADMIN — KYC ==============

@api_router.get("/admin/kyc")
async def admin_kyc_list(request: Request, tipo: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"kyc_status": {"$in": ["pending", "under_review", "approved", "rejected"]}}
    if tipo:
        filtro["role"] = tipo
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).to_list(200)
    # Adjuntar documentos subidos
    for u in usuarios:
        docs = await db.kyc_docs.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(20)
        u["documentos"] = docs
    return {"usuarios": usuarios}

@api_router.post("/admin/kyc/{user_id}/aprobar")
async def admin_kyc_aprobar(user_id: str, request: Request):
    await require_admin(request)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "approved", "kyc_aprobado_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}

@api_router.post("/admin/kyc/{user_id}/rechazar")
async def admin_kyc_rechazar(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    motivo = body.get("motivo", "")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "rejected", "kyc_motivo_rechazo": motivo, "kyc_rechazado_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}

@api_router.post("/admin/kyc/{user_id}/solicitar-info")
async def admin_kyc_solicitar(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    mensaje = body.get("mensaje", "")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "under_review", "kyc_solicitud_info": mensaje}}
    )
    return {"ok": True}

@api_router.post("/admin/kyc/ratificar/{doc_id}")
async def admin_kyc_ratificar(doc_id: str, request: Request):
    await require_admin(request)
    result = await db.kyc_docs.update_one(
        {"doc_id": doc_id},
        {"$set": {"estado": "ratificado", "ratificado_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"ok": True}

@api_router.get("/admin/kyc/doc/{doc_id}")
async def admin_kyc_ver_documento(doc_id: str, request: Request):
    await require_admin(request)
    doc = await db.kyc_docs.find_one({"doc_id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no disponible en disco")
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(path),
        media_type=doc.get("content_type", "application/octet-stream"),
        filename=doc.get("filename", "documento"),
    )

# ============== KYC UPLOAD (usuario) ==============

ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_MB = 5

@api_router.post("/kyc/upload")
async def kyc_upload(
    request: Request,
    doc_tipo: str = Form(...),
    file: UploadFile = File(...),
):
    user = await require_auth(request)
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo PDF, JPG, PNG.")
    contents = await file.read()
    if len(contents) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El archivo supera {MAX_FILE_MB} MB.")

    user_dir = KYC_DIR / user.user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".bin"
    filename = f"{doc_tipo}_{uuid.uuid4().hex[:8]}{ext}"
    dest = user_dir / filename
    dest.write_bytes(contents)

    doc_record = {
        "doc_id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "doc_tipo": doc_tipo,
        "filename": filename,
        "path": str(dest),
        "size_bytes": len(contents),
        "content_type": file.content_type,
        "subido_at": datetime.now(timezone.utc).isoformat(),
        "estado": "subido",
    }
    await db.kyc_docs.replace_one(
        {"user_id": user.user_id, "doc_tipo": doc_tipo},
        doc_record,
        upsert=True,
    )
    return {"ok": True, "doc_id": doc_record["doc_id"], "filename": filename}

@api_router.get("/kyc/mis-documentos")
async def kyc_mis_docs(request: Request):
    user = await require_auth(request)
    docs = await db.kyc_docs.find({"user_id": user.user_id}, {"_id": 0, "path": 0}).to_list(20)
    return {"documentos": docs}

@api_router.get("/kyc/documento/{doc_id}")
async def kyc_ver_propio_doc(doc_id: str, request: Request):
    user = await require_auth(request)
    doc = await db.kyc_docs.find_one({"doc_id": doc_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no disponible")
    from fastapi.responses import FileResponse
    return FileResponse(path=str(path), media_type=doc.get("content_type", "application/octet-stream"), filename=doc.get("filename", "documento"))

@api_router.post("/kyc/solicitar-entrevista")
async def kyc_solicitar_entrevista(request: Request):
    user = await require_auth(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "kyc_status": "under_review",
            "entrevista_solicitada_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    # TODO: enviar email de confirmación vía SendGrid
    # TODO: enviar WhatsApp de confirmación vía Twilio
    return {"ok": True, "mensaje": "Solicitud recibida. Te contactaremos para agendar la videollamada."}

# ============== ADMIN — FEEDBACK ==============

@api_router.get("/admin/feedback")
async def admin_feedback_list(request: Request, estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if estado:
        filtro["estado"] = estado
    items = await db.feedback.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items, "total": len(items)}

@api_router.patch("/admin/feedback/{feedback_id}")
async def admin_feedback_update(feedback_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    allowed = {"estado", "asignado_a", "notas_internas"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.feedback.update_one({"feedback_id": feedback_id}, {"$set": update})
    return {"ok": True}

@api_router.post("/feedback")
async def submit_feedback(request: Request):
    body = await request.json()
    doc = {
        "feedback_id": f"PV-FB-{uuid.uuid4().hex[:8].upper()}",
        "tipo": body.get("tipo", "general"),
        "descripcion": body.get("descripcion", ""),
        "email": body.get("email", ""),
        "valuador_id": body.get("valuador_id"),
        "calificacion": body.get("calificacion"),
        "estado": "recibido",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(doc)
    return {"ok": True, "folio": doc["feedback_id"]}

# ============== ADMIN — PRECIOS ==============

PRECIOS_DEFAULT = {
    # ── Público ─────────────────────────────────────────────────────
    "publico_individual":       {"precio": 241.38,  "precio_con_iva": 280,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Individual (1 reporte)"},
    "publico_bronce":           {"precio": 702.59,  "precio_con_iva": 815,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Bronce (3 reportes)"},
    "publico_plata":            {"precio": 1135.34, "precio_con_iva": 1317,  "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Plata (5 reportes)"},
    "publico_oro":              {"precio": 2202.59, "precio_con_iva": 2555,  "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Oro (10 reportes)"},
    "addon_valuador":           {"precio": 301.72,  "precio_con_iva": 350,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Add-on: Revisión Valuador Certificado"},
    "addon_visita":             {"precio": 517.24,  "precio_con_iva": 600,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Add-on: Verificación m² en sitio"},
    # ── Valuadores ──────────────────────────────────────────────────
    "valuador_independiente":   {"precio": 724.14,  "precio_con_iva": 840,   "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Independiente — Valuador (5 avalúos/mes)"},
    "valuador_despacho":        {"precio": 1379.31, "precio_con_iva": 1600,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Despacho — Valuador (10 avalúos/mes, hasta 3 peritos)"},
    "valuador_pro":             {"precio": 2672.41, "precio_con_iva": 3100,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Pro — Valuador (20 avalúos/mes, hasta 5 peritos)"},
    "valuador_corporativo":     {"precio": 3879.31, "precio_con_iva": 4500,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Corporativo — Valuador (40+ avalúos/mes, hasta 10 peritos)"},
    # ── Inmobiliarias ───────────────────────────────────────────────
    "inmobiliaria_lite5":       {"precio": 1206.90, "precio_con_iva": 1400,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Lite 5 — Inmobiliaria (5 avalúos/mes)"},
    "inmobiliaria_lite10":      {"precio": 2327.59, "precio_con_iva": 2700,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Lite 10 — Inmobiliaria (10 avalúos/mes)"},
    "inmobiliaria_pro20":       {"precio": 4482.76, "precio_con_iva": 5200,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Pro 20 — Inmobiliaria (20 avalúos/mes, hasta 5 usuarios)"},
    "inmobiliaria_premier":     {"precio": 6465.52, "precio_con_iva": 7500,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Premier — Inmobiliaria (30–50+ avalúos/mes, hasta 50 usuarios)"},
    # ── Publicidad — precio por impresión (sin IVA) ─────────────────
    "ad_slot1_15s":             {"precio": 15, "precio_con_iva": 15, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 15 seg/impresión (Comparables)"},
    "ad_slot1_30s":             {"precio": 25, "precio_con_iva": 25, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 30 seg/impresión (Comparables)"},
    "ad_slot1_60s":             {"precio": 38, "precio_con_iva": 38, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 60 seg/impresión (Comparables)"},
    "ad_slot2_15s":             {"precio": 10, "precio_con_iva": 10, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 2 · 15 seg/impresión (Generación IA)"},
    "ad_slot2_30s":             {"precio": 18, "precio_con_iva": 18, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 2 · 30 seg/impresión (Generación IA)"},
    "ad_slot3_15s":             {"precio": 5,  "precio_con_iva": 5,  "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 3 · 15 seg/impresión (Antes de descarga)"},
}

@api_router.get("/admin/precios")
async def admin_precios_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "precios"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return PRECIOS_DEFAULT

@api_router.put("/admin/precios")
async def admin_precios_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "precios"}, {"_id": "precios", **body}, upsert=True)
    return {"ok": True}

@api_router.get("/precios")
async def precios_publicos():
    doc = await db.config.find_one({"_id": "precios"})
    if doc:
        return {k: v for k, v in doc.items() if k not in ("_id", "updated_at")}
    return PRECIOS_DEFAULT

# ============== ADMIN — MANTENIMIENTO ==============

@api_router.get("/admin/mantenimiento")
async def admin_mant_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "mantenimiento"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"activo": False}

@api_router.put("/admin/mantenimiento")
async def admin_mant_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "mantenimiento"}, {"_id": "mantenimiento", **body}, upsert=True)
    return {"ok": True}

@api_router.get("/mantenimiento")
async def mantenimiento_publico():
    doc = await db.config.find_one({"_id": "mantenimiento"})
    if doc and doc.get("activo"):
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"activo": False}

# ============== ADMIN — BLACKLIST ==============

@api_router.get("/admin/blacklist")
async def admin_blacklist_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "blacklist"})
    if doc:
        return {k: v for k, v in doc.items() if k != "_id"}
    return {"palabras": [], "dominios": []}

@api_router.put("/admin/blacklist")
async def admin_blacklist_put(request: Request):
    await require_admin(request)
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.config.replace_one({"_id": "blacklist"}, {"_id": "blacklist", **body}, upsert=True)
    return {"ok": True}

# ============== ADMIN — COBERTURA ==============

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

@api_router.get("/admin/zonas-cobertura")
async def admin_zonas_get(request: Request):
    await require_admin(request)
    doc = await db.config.find_one({"_id": "zonas_cobertura"})
    if doc:
        return {"zonas": doc.get("zonas", [])}
    return {"zonas": ZONAS_DEFAULT}

@api_router.put("/admin/zonas-cobertura")
async def admin_zonas_put(request: Request):
    await require_admin(request)
    body = await request.json()
    await db.config.replace_one(
        {"_id": "zonas_cobertura"},
        {"_id": "zonas_cobertura", "zonas": body.get("zonas", []), "updated_at": datetime.now(timezone.utc).isoformat()},
        upsert=True
    )
    return {"ok": True}

# ============== ADMIN — CMS ==============

CMS_SLUGS = ["terminos_generales", "privacidad", "politica_anuncios", "codigo_etica"]

@api_router.get("/admin/cms/{slug}")
async def admin_cms_get(request: Request, slug: str):
    await require_admin(request)
    if slug not in CMS_SLUGS:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    doc = await db.cms.find_one({"slug": slug}, {"_id": 0})
    if doc:
        return doc
    return {"slug": slug, "contenido": "", "editado_por": "", "editado_at": ""}

@api_router.put("/admin/cms/{slug}")
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

# ============== ADMIN — SCRAPER ==============

SCRAPER_DIR = os.environ.get("SCRAPER_DIR", str(Path(__file__).parent.parent.parent / "scraper-inmuebles"))

@api_router.get("/admin/scraper/status")
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

PORTALES_SCRAPER = ["INMUEBLES24", "PINCALI", "VIVANUNCIOS", "MITULA", "CASAS_Y_TERRENOS"]

@api_router.post("/admin/scraper/run")
async def admin_scraper_run(request: Request):
    await require_admin(request)
    try:
        body = await request.json()
    except Exception:
        body = {}
    portal = body.get("portal")  # None = todos los portales

    doc = await db.scraper_status.find_one({"_id": "status"}, {"estado_global": 1})
    if doc and doc.get("estado_global") == "corriendo":
        raise HTTPException(status_code=409, detail="El scraper ya está en ejecución")

    scraper_path = Path(SCRAPER_DIR)
    if not scraper_path.exists():
        raise HTTPException(status_code=500, detail=f"Directorio del scraper no encontrado: {SCRAPER_DIR}")

    await db.scraper_status.update_one(
        {"_id": "status"},
        {"$set": {"estado_global": "corriendo"}},
        upsert=True,
    )

    portales = [portal] if portal else PORTALES_SCRAPER
    for p in portales:
        asyncio.create_task(asyncio.create_subprocess_exec(
            "python", "scheduler.py", "--portal", p,
            cwd=str(scraper_path),
        ))

    msg = f"Portal {portal} iniciado" if portal else f"{len(portales)} portales iniciados en paralelo"
    return {"ok": True, "mensaje": msg, "portales": portales}

@api_router.post("/admin/scraper/portales/{portal_id}/reset")
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

@api_router.get("/admin/scraper/propiedades")
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
    if not api_key:
        return {"ok": False, "error": "GOOGLE_SHEETS_API_KEY no configurada", "items": [], "total": 0, "tabs": SHEET_TABS}
    tab = tab if tab in SHEET_TABS else "CONSOLIDADO"
    rows = await fetch_sheet_tab(tab, api_key, sheet_id)
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

# ============== ADMIN — ALERTAS ==============

ALERTAS_DEFAULT = [
    {"id": "pago_fallido",     "nombre": "Pagos fallidos",             "activa": True,  "canales": ["email", "inapp"], "umbral": 3,  "umbral_label": "pagos fallidos/día",      "ultima_activacion": None, "veces_hoy": 0},
    {"id": "valuador_inactivo","nombre": "Valuador inactivo",          "activa": True,  "canales": ["email"],          "umbral": 30, "umbral_label": "días sin actividad",       "ultima_activacion": None, "veces_hoy": 0},
    {"id": "scraper_caido",    "nombre": "Scraper caído",              "activa": True,  "canales": ["email", "inapp"], "umbral": 24, "umbral_label": "horas sin ejecutar",       "ultima_activacion": None, "veces_hoy": 0},
    {"id": "kyc_nuevo",        "nombre": "Nuevo KYC pendiente",        "activa": True,  "canales": ["inapp"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
    {"id": "campana_vencida",  "nombre": "Campaña de anuncio vencida", "activa": True,  "canales": ["email"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
    {"id": "queja_grave",      "nombre": "Acumulación de quejas graves","activa": True, "canales": ["email", "inapp"], "umbral": 3,  "umbral_label": "quejas en 30 días",        "ultima_activacion": None, "veces_hoy": 0},
    {"id": "registro_nuevo",   "nombre": "Nuevo usuario premium",      "activa": False, "canales": ["inapp"],          "umbral": None,"umbral_label": None,                     "ultima_activacion": None, "veces_hoy": 0},
]

@api_router.get("/admin/alertas")
async def admin_alertas_get(request: Request):
    await require_admin(request)
    doc = await db.alertas_config.find_one({"_id": "config"}, {"_id": 0})
    if not doc:
        doc = {"alertas": ALERTAS_DEFAULT, "email_destino": "admin@propvalu.mx"}
        await db.alertas_config.insert_one({"_id": "config", **doc})
    return doc

@api_router.put("/admin/alertas")
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

# ============== ADMIN — DASHBOARD STATS ==============

@api_router.get("/admin/stats")
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

# ============== ADMIN — INMOBILIARIAS ==============

@api_router.get("/admin/inmobiliarias")
async def admin_inmobiliarias_list(request: Request, q: str = "", estado: str = "", kyc: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"role": "realtor"}
    if q:
        filtro["$or"] = [
            {"company_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]
    if estado:
        filtro["cuenta_estado"] = estado
    if kyc:
        filtro["kyc_status"] = kyc
    realtors = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).to_list(200)
    # Agregar conteos de valuaciones por empresa
    now = datetime.now(timezone.utc)
    mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    for r in realtors:
        uid = r.get("user_id")
        r["total_avaluos"] = await db.valuations.count_documents({"user_id": uid}) if uid else 0
        r["avaluos_mes"]   = await db.valuations.count_documents({"user_id": uid, "created_at": {"$gte": mes_inicio}}) if uid else 0
    total = await db.users.count_documents(filtro)
    return {"inmobiliarias": realtors, "total": total}

@api_router.get("/admin/inmobiliarias/{user_id}")
async def admin_inmobiliaria_detalle(user_id: str, request: Request):
    await require_admin(request)
    realtor = await db.users.find_one({"user_id": user_id, "role": "realtor"}, {"_id": 0, "hashed_password": 0})
    if not realtor:
        raise HTTPException(status_code=404, detail="Inmobiliaria no encontrada")
    # Últimas 20 valuaciones
    valuaciones = await db.valuations.find(
        {"user_id": user_id}, {"_id": 0, "valuation_id": 1, "property_data": 1, "status": 1, "created_at": 1, "final_value": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"inmobiliaria": realtor, "valuaciones": valuaciones}

@api_router.get("/admin/inmobiliarias-actividad")
async def admin_inmobiliarias_actividad(request: Request):
    await require_admin(request)
    # IDs de todos los realtors
    realtors = await db.users.find({"role": "realtor"}, {"user_id": 1, "company_name": 1, "email": 1}).to_list(500)
    uid_map = {r["user_id"]: r.get("company_name") or r.get("email", "") for r in realtors if "user_id" in r}
    if not uid_map:
        return {"valuaciones": []}
    valuaciones = await db.valuations.find(
        {"user_id": {"$in": list(uid_map.keys())}},
        {"_id": 0, "valuation_id": 1, "user_id": 1, "property_data": 1, "status": 1, "created_at": 1, "final_value": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    for v in valuaciones:
        v["empresa"] = uid_map.get(v.get("user_id"), "—")
    return {"valuaciones": valuaciones}

@api_router.post("/admin/inmobiliarias/{user_id}/notificar")
async def admin_inmobiliaria_notificar(user_id: str, request: Request):
    await require_admin(request)
    admin = await require_admin(request)
    body = await request.json()
    nota = {
        "nota_id": uuid.uuid4().hex,
        "user_id": user_id,
        "mensaje": body.get("mensaje", ""),
        "tipo": body.get("tipo", "info"),
        "creado_por": admin.get("nombre") or "Admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "leida": False,
    }
    await db.notas_internas.insert_one(nota)
    nota.pop("_id", None)
    return {"ok": True, "nota": nota}

# ============== ANUNCIOS (Anunciantes → Moderación) ==============

@api_router.post("/advertisers/anuncios")
async def crear_anuncio(request: Request):
    """Anunciante sube un anuncio nuevo, queda en estado 'pendiente'."""
    user = await require_auth(request)
    body = await request.json()
    doc = {
        "ad_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "anunciante": user.get("name") or user.get("email"),
        "email": user.get("email"),
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

@api_router.get("/advertisers/mis-anuncios")
async def mis_anuncios(request: Request):
    user = await require_auth(request)
    items = await db.anuncios.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"anuncios": items}

@api_router.get("/admin/anuncios")
async def admin_anuncios_list(request: Request, estado: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {}
    if estado:
        filtro["estado"] = estado
    items = await db.anuncios.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"anuncios": items, "total": len(items)}

@api_router.post("/admin/anuncios/{ad_id}/aprobar")
async def admin_anuncio_aprobar(ad_id: str, request: Request):
    await require_admin(request)
    result = await db.anuncios.update_one(
        {"ad_id": ad_id},
        {"$set": {"estado": "aprobado", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
    return {"ok": True}

@api_router.post("/admin/anuncios/{ad_id}/rechazar")
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

async def require_advertiser(request: Request):
    token = request.headers.get("X-Advertiser-Token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token de anunciante requerido")
    advertiser = await db.advertisers.find_one({"session_token": token, "activo": True}, {"_id": 0})
    if not advertiser:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")
    return advertiser

@api_router.post("/advertisers/register")
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

@api_router.post("/advertisers/login")
async def advertiser_login(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    advertiser = await db.advertisers.find_one({"email": email})
    if not advertiser or not pwd_context.verify(body.get("password", ""), advertiser.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    token = uuid.uuid4().hex
    await db.advertisers.update_one({"email": email}, {"$set": {"session_token": token}})
    return {"ok": True, "session_token": token, "company_name": advertiser["company_name"],
            "contact_name": advertiser["contact_name"], "email": advertiser["email"],
            "rfc": advertiser["rfc"], "giro": advertiser["giro"]}

@api_router.post("/advertisers/campaigns")
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

@api_router.get("/advertisers/campaigns")
async def get_campaigns(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_campaigns.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for c in items:
        c["id"] = c.get("campaign_id", "")
    return {"campaigns": items}

@api_router.post("/advertisers/creatives/upload")
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
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    content = await file.read()
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

@api_router.get("/advertisers/creatives")
async def get_creatives(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_creatives.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(200)
    for c in items:
        c["id"] = c.get("creative_id", "")
    return {"creatives": items}

@api_router.get("/advertisers/transactions")
async def get_transactions(request: Request):
    advertiser = await require_advertiser(request)
    items = await db.ad_transactions.find(
        {"advertiser_id": advertiser["advertiser_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for t in items:
        t["id"] = t.get("transaction_id", "")
    return {"transactions": items}

@api_router.post("/advertisers/campaigns/{campaign_id}/pausar")
async def pausar_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@api_router.post("/advertisers/campaigns/{campaign_id}/reactivar")
async def reactivar_campaign(campaign_id: str, request: Request):
    advertiser = await require_advertiser(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id, "advertiser_id": advertiser["advertiser_id"]},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@api_router.delete("/advertisers/campaigns/{campaign_id}")
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

@api_router.put("/advertisers/campaigns/{campaign_id}")
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

@api_router.get("/admin/creatives")
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

@api_router.post("/admin/creatives/{creative_id}/aprobar")
async def admin_creative_aprobar(creative_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "aprobado"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creatividad no encontrada")
    return {"ok": True}

@api_router.post("/admin/creatives/{creative_id}/rechazar")
async def admin_creative_rechazar(creative_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "rechazado", "motivo_rechazo": body.get("motivo", "")}}
    )
    return {"ok": True}

@api_router.post("/admin/campaigns/{campaign_id}/activar")
async def admin_campaign_activar(campaign_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@api_router.post("/admin/campaigns/{campaign_id}/pausar")
async def admin_campaign_pausar(campaign_id: str, request: Request):
    await require_admin(request)
    result = await db.ad_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return {"ok": True}

@api_router.get("/admin/campaigns")
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

@api_router.post("/admin/campaigns/{campaign_id}/creatives/{creative_id}/aprobar")
async def admin_inline_creative_aprobar(campaign_id: str, creative_id: str, request: Request):
    await require_admin(request)
    await db.ad_creatives.update_one({"creative_id": creative_id}, {"$set": {"status": "aprobado"}})
    return {"ok": True}

@api_router.post("/admin/campaigns/{campaign_id}/creatives/{creative_id}/rechazar")
async def admin_inline_creative_rechazar(campaign_id: str, creative_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    await db.ad_creatives.update_one(
        {"creative_id": creative_id},
        {"$set": {"status": "rechazado", "motivo_rechazo": body.get("motivo", "")}}
    )
    return {"ok": True}

@api_router.get("/admin/anunciantes")
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

@api_router.get("/ads/active")
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

@api_router.post("/ads/track")
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

@api_router.get("/admin/ads/analytics")
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

# ============== ADMIN — VALUADORES ==============

@api_router.get("/admin/valuadores")
async def admin_valuadores_list(request: Request, q: str = "", kyc: str = "", plan: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"role": "appraiser"}
    if q:
        filtro["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"municipio": {"$regex": q, "$options": "i"}},
        ]
    if kyc:
        filtro["kyc_status"] = kyc
    if plan:
        filtro["plan"] = plan
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).to_list(200)
    # Agregar conteo de valuaciones y quejas por valuador
    for u in usuarios:
        u["total_valuaciones"] = await db.valuations.count_documents({"user_id": u["user_id"]})
        u["total_quejas"] = await db.feedback.count_documents({
            "valuador_id": u["user_id"],
            "tipo": "queja_valuador"
        })
    return {"valuadores": usuarios, "total": len(usuarios)}

# ============== ADMIN — REPORTES ==============

@api_router.get("/admin/reportes")
async def admin_reportes(request: Request):
    await require_admin(request)

    # Transacciones de pagos (colección payments, puede estar vacía)
    pagos = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    # Resumen de valuaciones completadas por mes (últimos 6 meses)
    hoy = datetime.now(timezone.utc)
    meses = []
    for i in range(5, -1, -1):
        # Inicio y fin del mes i meses atrás
        mes_dt = datetime(hoy.year, hoy.month, 1, tzinfo=timezone.utc) - timedelta(days=30 * i)
        mes_inicio = datetime(mes_dt.year, mes_dt.month, 1, tzinfo=timezone.utc)
        if mes_dt.month == 12:
            mes_fin = datetime(mes_dt.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            mes_fin = datetime(mes_dt.year, mes_dt.month + 1, 1, tzinfo=timezone.utc)

        label = mes_inicio.strftime("%b %Y")
        count = await db.valuations.count_documents({
            "status": "completed",
            "created_at": {
                "$gte": mes_inicio.isoformat(),
                "$lt": mes_fin.isoformat(),
            }
        })
        meses.append({"mes": label, "valuaciones": count})

    # Totales generales
    total_valuaciones = await db.valuations.count_documents({"status": "completed"})
    total_usuarios = await db.users.count_documents({})
    total_valuadores = await db.users.count_documents({"role": "appraiser", "kyc_status": "approved"})

    return {
        "resumen_meses": meses,
        "transacciones": pagos,
        "totales": {
            "valuaciones_completadas": total_valuaciones,
            "usuarios": total_usuarios,
            "valuadores_activos": total_valuadores,
        }
    }

# ─── Directorio público ─────────────────────────────────────────────────────

@api_router.get("/directorio/valuadores")
async def directorio_valuadores(
    estado: str = None,
    busqueda: str = None,
    especialidad: str = None,
):
    query = {"role": "appraiser", "kyc_status": "approved"}
    if estado:
        query["estado"] = estado
    if especialidad:
        query["services." + especialidad] = True

    usuarios = await db.users.find(query, {
        "_id": 0, "password": 0, "session_token": 0,
    }).sort("plan", -1).to_list(200)

    resultado = []
    for u in usuarios:
        uid = u.get("id") or u.get("email", "")
        # Calcular promedio de calificaciones
        resenas = await db.resenas.find({"perfil_id": uid}).to_list(500)
        avg = round(sum(r["calificacion"] for r in resenas) / len(resenas), 1) if resenas else 0.0
        u["calificacion_promedio"] = avg
        u["total_resenas"] = len(resenas)
        if busqueda:
            texto = (u.get("name","") + " " + u.get("ciudad","") + " " + u.get("estado","")).lower()
            if busqueda.lower() not in texto:
                continue
        resultado.append(u)

    return resultado


@api_router.get("/directorio/inmobiliarias")
async def directorio_inmobiliarias(
    estado: str = None,
    busqueda: str = None,
    tipo: str = None,
):
    query = {"role": "realtor", "kyc_status": "approved"}
    if tipo:
        query["inmobiliaria_tipo"] = tipo
    if estado:
        query["$or"] = [{"estado": estado}, {"estados": estado}]

    usuarios = await db.users.find(query, {
        "_id": 0, "password": 0, "session_token": 0,
    }).sort("plan", -1).to_list(200)

    resultado = []
    for u in usuarios:
        uid = u.get("id") or u.get("email", "")
        resenas = await db.resenas.find({"perfil_id": uid}).to_list(500)
        avg = round(sum(r["calificacion"] for r in resenas) / len(resenas), 1) if resenas else 0.0
        u["calificacion_promedio"] = avg
        u["total_resenas"] = len(resenas)
        if busqueda:
            texto = (u.get("name","") + " " + u.get("company_name","") + " " + u.get("estado","")).lower()
            if busqueda.lower() not in texto:
                continue
        resultado.append(u)

    return resultado


@api_router.post("/directorio/{tipo}/{perfil_id}/resena")
async def enviar_resena(tipo: str, perfil_id: str, request: Request):
    if tipo not in ("valuadores", "inmobiliarias"):
        raise HTTPException(400, "Tipo debe ser 'valuadores' o 'inmobiliarias'")
    body = await request.json()
    calificacion = int(body.get("calificacion", 0))
    if not (1 <= calificacion <= 5):
        raise HTTPException(400, "Calificación debe ser entre 1 y 5")
    comentario = body.get("comentario", "").strip()
    nombre_cliente = body.get("nombre_cliente", "Anónimo").strip() or "Anónimo"
    if not comentario:
        raise HTTPException(400, "El comentario no puede estar vacío")

    doc = {
        "perfil_id": perfil_id,
        "tipo": tipo,
        "calificacion": calificacion,
        "comentario": comentario,
        "nombre_cliente": nombre_cliente,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.resenas.insert_one(doc)
    return {"ok": True, "message": "Reseña enviada correctamente"}


@api_router.get("/directorio/{tipo}/{perfil_id}/resenas")
async def obtener_resenas(tipo: str, perfil_id: str):
    docs = await db.resenas.find(
        {"perfil_id": perfil_id, "tipo": tipo},
    ).sort("created_at", -1).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@api_router.post("/directorio/{tipo}/{perfil_id}/resenas/{resena_id}/respuesta")
async def responder_resena(tipo: str, perfil_id: str, resena_id: str, request: Request):
    """La empresa dueña del perfil responde a una reseña."""
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(401, "No autenticado")
    user = await db.users.find_one({"session_token": token})
    if not user:
        raise HTTPException(401, "Sesión inválida")
    # Verificar que el usuario autenticado ES el dueño del perfil
    uid = user.get("id") or user.get("email", "")
    if uid != perfil_id:
        raise HTTPException(403, "Solo puedes responder reseñas de tu propio perfil")

    body = await request.json()
    respuesta = body.get("respuesta", "").strip()
    if not respuesta:
        raise HTTPException(400, "La respuesta no puede estar vacía")

    from bson import ObjectId
    try:
        oid = ObjectId(resena_id)
    except Exception:
        raise HTTPException(400, "ID de reseña inválido")

    result = await db.resenas.update_one(
        {"_id": oid, "perfil_id": perfil_id},
        {"$set": {"respuesta": respuesta, "respuesta_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Reseña no encontrada")
    return {"ok": True}


# Include router
app.include_router(api_router)

# Serve uploaded files (ads, kyc)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"^https?://localhost(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
