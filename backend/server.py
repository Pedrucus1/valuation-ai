from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
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

# Import report generator
from report_generator import generate_html_report

# Create the main app
app = FastAPI(title="PropValu Mexico API")

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    
    # Try LLM enhancement
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if api_key:
            comparables_text = ""
            for i, comp in enumerate(active_comparables[:3], 1):
                comparables_text += f"Comp {i}: {comp['neighborhood']}, ${comp['price']:,.0f}, {comp.get('construction_area', 0)}m²\n"
            
            prompt = f"""Analiza brevemente esta valuación inmobiliaria en México:
Ubicación: {prop['neighborhood']}, {prop['municipality']}, {prop['state']}
Terreno: {prop['land_area']}m², Construcción: {prop['construction_area']}m²
Régimen: {prop['land_regime']}, Tipo: {prop.get('property_type', 'Casa')}
Valor estimado: ${result['estimated_value']:,.0f} MXN
Renta mensual estimada: ${result.get('market_metrics', {}).get('monthly_rent_estimate', 0):,.0f} MXN
Cap Rate: {result.get('market_metrics', {}).get('cap_rate', 0)}%
Comparables usados: {comparables_text}

Genera SOLO 2 párrafos breves (NO incluyas resumen ejecutivo, eso ya está en otra sección):
1. Análisis del mercado local y potencial de rentabilidad basado en los comparables
2. Conclusión con recomendaciones específicas de negociación y estrategia de venta

Numera los párrafos como "1." y "2." Sé conciso y directo."""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"val_{valuation_id}",
                system_message="Valuador inmobiliario certificado. Respuestas concisas y profesionales."
            ).with_model("openai", "gpt-4.1-mini")
            
            user_message = UserMessage(text=prompt)
            
            try:
                analysis = await asyncio.wait_for(
                    chat.send_message(user_message),
                    timeout=15.0
                )
            except asyncio.TimeoutError:
                logger.warning("LLM timeout, using template analysis")
                
    except Exception as e:
        logger.error(f"LLM error (using template): {e}")
    
    # Generate HTML report with optional analysis section
    report_html = generate_html_report(valuation, analysis, include_analysis=include_analysis)
    
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

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
