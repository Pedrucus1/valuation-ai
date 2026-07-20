"""Modelos Pydantic y constantes compartidas de PropValu."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

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
    billing_preference: Optional[str] = "ask_monthly"   # auto | manual | ask_monthly
    billing_status: Optional[str] = "active"             # active | pending_payment | blocked
    siglas: Optional[str] = None                         # iniciales para el folio (ej. "AA")
    folio_seq: Optional[int] = 0                          # consecutivo de avalúos del usuario

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

class PropiedadInmobiliaria(BaseModel):
    propiedad_id: str
    user_id: str
    origen: str = "manual"          # "manual" | "opi"
    direccion: str
    tipo: str                        # Casa, Departamento, Terreno, Local Comercial, Oficina
    colonia: Optional[str] = None
    municipio: Optional[str] = None
    estado_mx: Optional[str] = None
    precio_oferta: float
    m2_construccion: Optional[float] = None
    m2_terreno: Optional[float] = None
    recamaras: Optional[int] = None
    banos: Optional[float] = None
    medio_banos: Optional[int] = None
    estacionamiento: Optional[int] = None
    niveles: Optional[int] = None
    nivel_depto: Optional[int] = None
    antiguedad: Optional[int] = None
    conservacion: Optional[str] = None  # Excelente, Bueno, Regular
    fotos: List[str] = []
    url_recorrido: Optional[str] = None
    amenidades: List[str] = []
    instalaciones: List[str] = []
    espacios: List[str] = []
    descripcion: Optional[str] = None
    puntos_libres: List[str] = []        # hasta 2, texto libre del asesor
    puntos_propvalu: List[str] = []      # generados automáticamente
    fuera_de_mercado: bool = False
    activo: bool = True
    created_at: str
    updated_at: str

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
    id_unico: Optional[str] = None      # clave en mercado_props (para escribir edad de vuelta al pool)
    source: str
    source_url: str
    street_address: Optional[str] = None  # calle_numero del anuncio (el frontend ya lo lee)
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

    # Datos enriquecidos desde la página de detalle (cuando se abre el listing)
    anio_construccion: Optional[int] = None
    age: Optional[int] = None            # edad en años (año_actual - anio_construccion); lo que el frontend lee
    edad_fuente: Optional[str] = None    # p.ej. "perito_crowdsource" cuando la estima un perito
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    estacionamientos: Optional[int] = None
    telefono: Optional[str] = None
    inmobiliaria: Optional[str] = None
    enriched: bool = False

    # Dedup cross-portal: en qué portales se anuncia la misma propiedad (links del reporte)
    anuncios: list = Field(default_factory=list)        # [{"portal": str, "url": str}]
    portales_anunciado: list = Field(default_factory=list)
    n_portales: int = 1
    # Confiabilidad del comparable (0-100) y etiqueta — informativo, no cambia el valor
    confiabilidad: Optional[int] = None
    confiabilidad_label: Optional[str] = None

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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
