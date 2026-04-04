# Script de datos demo para PropValu.
# Inserta inmobiliarias, valuadores y valuaciones de prueba en MongoDB.
#
# Uso:  cd backend && python seed_demo.py
# Flag: --limpiar  (elimina docs demo antes de insertar)
import os, sys, uuid, argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import certifi
import pymongo
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.environ["DB_NAME"]

client = pymongo.MongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEMO_DOMAIN = "@demo.propvalu.mx"
DEMO_PW = pwd_context.hash("Demo2026!")

def uid():
    return f"user_{uuid.uuid4().hex[:12]}"

def vid():
    return f"val_{uuid.uuid4().hex[:12]}"

def ts(days_ago=0):
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return dt.isoformat()

# ─── INMOBILIARIAS ──────────────────────────────────────────────────────────

INMOBILIARIAS = [
    {
        "company_name": "GDL Premium Inmobiliaria",
        "name":         "Alejandra Fuentes Vega",
        "email":        f"alejandra.fuentes{DEMO_DOMAIN}",
        "phone":        "3312345678",
        "municipio":    "Guadalajara",
        "estado":       "Jalisco",
        "asociacion":   "AMPI Guadalajara",
        "inmobiliaria_tipo": "Titular",
        "num_asesores": 8,
        "kyc_status":   "approved",
        "cuenta_estado":"activo",
        "credits":      15,
        "plan":         "inmobiliaria_pro20",
        "created_at":   ts(45),
    },
    {
        "company_name": "GDL Real Estate Group",
        "name":         "Carlos Mendoza Ibarra",
        "email":        f"carlos.mendoza{DEMO_DOMAIN}",
        "phone":        "3398765432",
        "municipio":    "Zapopan",
        "estado":       "Jalisco",
        "asociacion":   "AMPI Zapopan",
        "inmobiliaria_tipo": "Titular",
        "num_asesores": 4,
        "kyc_status":   "approved",
        "cuenta_estado":"activo",
        "credits":      8,
        "plan":         "inmobiliaria_lite10",
        "created_at":   ts(30),
    },
    {
        "company_name": "Century 21 Zona Metro",
        "name":         "Sofía Ramírez Torres",
        "email":        f"sofia.ramirez{DEMO_DOMAIN}",
        "phone":        "3356781234",
        "municipio":    "Zapopan",
        "estado":       "Jalisco",
        "asociacion":   "NAR México",
        "inmobiliaria_tipo": "Titular",
        "num_asesores": 22,
        "kyc_status":   "approved",
        "cuenta_estado":"activo",
        "credits":      22,
        "plan":         "inmobiliaria_premier",
        "created_at":   ts(90),
    },
    {
        "company_name": "Casas y Más Jalisco",
        "name":         "Jorge Navarro Castillo",
        "email":        f"jorge.navarro{DEMO_DOMAIN}",
        "phone":        "3343219876",
        "municipio":    "Tlaquepaque",
        "estado":       "Jalisco",
        "asociacion":   "",
        "inmobiliaria_tipo": "Titular",
        "num_asesores": 2,
        "kyc_status":   "pending",
        "cuenta_estado":"activo",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(3),
    },
    {
        "company_name": "Propiedades del Valle GDL",
        "name":         "Daniela Herrera López",
        "email":        f"daniela.herrera{DEMO_DOMAIN}",
        "phone":        "3387654321",
        "municipio":    "Guadalajara",
        "estado":       "Jalisco",
        "asociacion":   "AMPI Guadalajara",
        "inmobiliaria_tipo": "Asesor",
        "num_asesores": 1,
        "kyc_status":   "pending",
        "cuenta_estado":"activo",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(1),
    },
    {
        "company_name": "Inmobiliaria Tonalá & Tlaquepaque",
        "name":         "Ricardo Soto Mora",
        "email":        f"ricardo.soto{DEMO_DOMAIN}",
        "phone":        "3365432109",
        "municipio":    "Tonalá",
        "estado":       "Jalisco",
        "asociacion":   "",
        "inmobiliaria_tipo": "Titular",
        "num_asesores": 3,
        "kyc_status":   "rejected",
        "cuenta_estado":"suspendido",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(20),
    },
]

# ─── VALUADORES ─────────────────────────────────────────────────────────────

VALUADORES = [
    {
        "company_name": "Avaluos y Arquitectura",
        "name":         "Miguel Torres Escobedo",
        "email":        f"miguel.torres{DEMO_DOMAIN}",
        "phone":        "3311223344",
        "municipio":    "Zapopan",
        "estado":       "Jalisco",
        "services":     ["avalúo comercial", "avalúo habitacional", "avalúo industrial"],
        "empresa_afiliada": "AMPI Zapopan",
        "kyc_status":   "approved",
        "cuenta_estado":"activo",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(120),
    },
    {
        "company_name": None,
        "name":         "Ing. Roberto Sánchez Valuaciones",
        "email":        f"roberto.sanchez{DEMO_DOMAIN}",
        "phone":        "3322334455",
        "municipio":    "Guadalajara",
        "estado":       "Jalisco",
        "services":     ["avalúo habitacional", "perito judicial"],
        "empresa_afiliada": "Colegio de Ingenieros Civiles de Jalisco",
        "kyc_status":   "approved",
        "cuenta_estado":"activo",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(60),
    },
    {
        "company_name": None,
        "name":         "Dra. Fernanda López Perito",
        "email":        f"fernanda.lopez{DEMO_DOMAIN}",
        "phone":        "3344556677",
        "municipio":    "Tlajomulco de Zúñiga",
        "estado":       "Jalisco",
        "services":     ["avalúo habitacional", "avalúo comercial"],
        "empresa_afiliada": "",
        "kyc_status":   "pending",
        "cuenta_estado":"activo",
        "credits":      0,
        "plan":         None,
        "created_at":   ts(2),
    },
]

# ─── VALUACIONES DEMO ───────────────────────────────────────────────────────

PROPIEDADES = [
    {"street": "Blvd. Puerta de Hierro 4965", "municipio": "Zapopan", "estado_prop": "Jalisco", "tipo": "Casa", "area_total": 320, "area_construida": 280, "recamaras": 4, "banos": 3, "estacionamientos": 2, "valor": 6200000},
    {"street": "Av. López Mateos Sur 3080",   "municipio": "Guadalajara", "estado_prop": "Jalisco", "tipo": "Departamento", "area_total": 95, "area_construida": 95, "recamaras": 2, "banos": 2, "estacionamientos": 1, "valor": 2850000},
    {"street": "Calle Niños Héroes 1455",     "municipio": "Guadalajara", "estado_prop": "Jalisco", "tipo": "Casa", "area_total": 180, "area_construida": 160, "recamaras": 3, "banos": 2, "estacionamientos": 2, "valor": 3900000},
    {"street": "Av. Mariano Otero 2963",      "municipio": "Zapopan", "estado_prop": "Jalisco", "tipo": "Departamento", "area_total": 72, "area_construida": 72, "recamaras": 2, "banos": 1, "estacionamientos": 1, "valor": 1750000},
    {"street": "Calle Reforma 210",           "municipio": "Tlaquepaque", "estado_prop": "Jalisco", "tipo": "Casa", "area_total": 140, "area_construida": 120, "recamaras": 3, "banos": 2, "estacionamientos": 1, "valor": 2200000},
    {"street": "Av. Vallarta 3233",           "municipio": "Guadalajara", "estado_prop": "Jalisco", "tipo": "Local Comercial", "area_total": 85, "area_construida": 85, "recamaras": 0, "banos": 1, "estacionamientos": 0, "valor": 3100000},
    {"street": "Calle Santa Fe 890",          "municipio": "Zapopan", "estado_prop": "Jalisco", "tipo": "Casa", "area_total": 250, "area_construida": 210, "recamaras": 4, "banos": 3, "estacionamientos": 2, "valor": 5400000},
    {"street": "Periférico Sur 8500",         "municipio": "Tlajomulco de Zúñiga", "estado_prop": "Jalisco", "tipo": "Departamento", "area_total": 68, "area_construida": 68, "recamaras": 2, "banos": 2, "estacionamientos": 1, "valor": 1650000},
]

def make_valuation(user_id, prop, days_ago, status="completed"):
    return {
        "valuation_id": vid(),
        "user_id":      user_id,
        "mode":         "private",
        "status":       status,
        "final_value":  prop["valor"] if status == "completed" else None,
        "created_at":   ts(days_ago),
        "updated_at":   ts(days_ago),
        "consultation_date": ts(days_ago),
        "property_data": {
            "street":          prop["street"],
            "municipio":       prop["municipio"],
            "estado":          prop["estado_prop"],
            "tipo_inmueble":   prop["tipo"],
            "area_total":      prop["area_total"],
            "area_construida": prop["area_construida"],
            "recamaras":       prop["recamaras"],
            "banos":           prop["banos"],
            "estacionamientos":prop["estacionamientos"],
            "special_features": [],
            "photos": [],
        },
    }

# ─── MAIN ───────────────────────────────────────────────────────────────────

def limpiar():
    r = db.users.delete_many({"email": {"$regex": DEMO_DOMAIN}})
    print(f"  Usuarios demo eliminados: {r.deleted_count}")
    # Limpiar valuaciones de IDs que ya no existen (approx: las que tienen user_id de demo)
    # No podemos filtrar por email directamente en valuations, se limpian por user_id conocido

def insertar():
    inserted_realtor_ids = []
    inserted_valuador_ids = []

    print("\n--- Inmobiliarias ---")
    for data in INMOBILIARIAS:
        existing = db.users.find_one({"email": data["email"]})
        if existing:
            print(f"  SKIP (ya existe): {data['email']}")
            inserted_realtor_ids.append(existing["user_id"])
            continue
        user_id = uid()
        doc = {
            "user_id":       user_id,
            "role":          "realtor",
            "hashed_password": DEMO_PW,
            "picture":       None,
            "cursos":        [],
            **data,
        }
        db.users.insert_one(doc)
        inserted_realtor_ids.append(user_id)
        print(f"  OK: {data['company_name']} ({data['kyc_status']}, {data['credits']} créditos)")

    print("\n--- Valuadores ---")
    for data in VALUADORES:
        existing = db.users.find_one({"email": data["email"]})
        if existing:
            print(f"  SKIP (ya existe): {data['email']}")
            inserted_valuador_ids.append(existing["user_id"])
            continue
        user_id = uid()
        doc = {
            "user_id":       user_id,
            "role":          "appraiser",
            "hashed_password": DEMO_PW,
            "picture":       None,
            "cursos":        [],
            **data,
        }
        db.users.insert_one(doc)
        inserted_valuador_ids.append(user_id)
        print(f"  OK: {data['name']} ({data['kyc_status']})")

    print("\n--- Valuaciones demo ---")
    # Asignar valuaciones a los realtors aprobados
    assignments = [
        # (user_id_index, prop_index, days_ago, status)
        (0, 0, 10, "completed"),
        (0, 1, 18, "completed"),
        (0, 7, 25, "completed"),
        (1, 2, 5,  "completed"),
        (1, 3, 14, "completed"),
        (2, 4, 2,  "completed"),
        (2, 5, 8,  "completed"),
        (2, 6, 15, "completed"),
        (2, 0, 22, "completed"),
        (2, 1, 30, "completed"),
    ]
    total_val = 0
    for uid_idx, prop_idx, days, status in assignments:
        if uid_idx >= len(inserted_realtor_ids):
            continue
        user_id = inserted_realtor_ids[uid_idx]
        prop    = PROPIEDADES[prop_idx % len(PROPIEDADES)]
        val_doc = make_valuation(user_id, prop, days, status)
        db.valuations.insert_one(val_doc)
        total_val += 1
    print(f"  {total_val} valuaciones insertadas para inmobiliarias")

    # Valuaciones para valuadores
    val_assignments = [
        (0, 3, 7,  "completed"),
        (0, 5, 20, "completed"),
        (1, 1, 12, "completed"),
    ]
    for uid_idx, prop_idx, days, status in val_assignments:
        if uid_idx >= len(inserted_valuador_ids):
            continue
        user_id = inserted_valuador_ids[uid_idx]
        prop    = PROPIEDADES[prop_idx % len(PROPIEDADES)]
        val_doc = make_valuation(user_id, prop, days, status)
        db.valuations.insert_one(val_doc)
    print(f"  3 valuaciones insertadas para valuadores")

    print("\nSeed completo.")
    print(f"  Credenciales demo: cualquier email @demo.propvalu.mx / Demo2026!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limpiar", action="store_true", help="Eliminar datos demo antes de insertar")
    args = parser.parse_args()

    if args.limpiar:
        print("Limpiando datos demo anteriores…")
        limpiar()

    insertar()
