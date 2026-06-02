"""Inmobiliaria (titular): equipo de asesores vinculados."""
from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_auth

router = APIRouter(prefix="/api")

@router.get("/inmobiliaria/equipo")
async def get_equipo_inmobiliaria(request: Request):
    """Asesores vinculados al titular autenticado por empresa_afiliada o company_name."""
    user = await require_auth(request)
    if user.role != "realtor":
        raise HTTPException(403, "Solo para inmobiliarias")

    company = user.company_name or user.name or ""
    if not company:
        return []

    # Buscar asesores que pusieron esta empresa en empresa_afiliada
    asesores = await db.users.find(
        {"role": "realtor", "inmobiliaria_tipo": "asesor", "empresa_afiliada": company},
        {"_id": 0, "hashed_password": 0, "session_token": 0}
    ).to_list(100)

    resultado = []
    for a in asesores:
        uid = a.get("user_id") or a.get("email", "")
        total_val = await db.valuations.count_documents({"user_id": uid})
        mes_actual = datetime.now(timezone.utc).strftime("%Y-%m")
        val_mes = await db.valuations.count_documents({
            "user_id": uid,
            "created_at": {"$regex": f"^{mes_actual}"}
        })
        resultado.append({
            "user_id": uid,
            "nombre": a.get("name", ""),
            "email": a.get("email", ""),
            "phone": a.get("phone", ""),
            "kyc_status": a.get("kyc_status", "pending"),
            "plan": a.get("plan"),
            "valuaciones_total": total_val,
            "valuaciones_mes": val_mes,
            "activo": a.get("kyc_status") in ("approved", "under_review"),
        })

    return resultado


# ─── Mercado: accesos por plan ───────────────────────────────────────────────

PLANES_DEFAULT = [
    {"plan_id": "valuador_independiente", "label": "Valuador Independiente", "activo": False},
    {"plan_id": "valuador_despacho",      "label": "Valuador Despacho",      "activo": False},
    {"plan_id": "valuador_pro",           "label": "Valuador Pro",           "activo": True},
    {"plan_id": "valuador_corporativo",   "label": "Valuador Corporativo",   "activo": True},
    {"plan_id": "inmobiliaria_lite5",     "label": "Inmobiliaria Lite 5",    "activo": False},
    {"plan_id": "inmobiliaria_lite10",    "label": "Inmobiliaria Lite 10",   "activo": False},
    {"plan_id": "inmobiliaria_pro20",     "label": "Inmobiliaria Pro 20",    "activo": False},
    {"plan_id": "inmobiliaria_premier",   "label": "Inmobiliaria Premier",   "activo": True},
]

async def _seed_mercado_accesos():
    col = db["mercado_accesos"]
    for p in PLANES_DEFAULT:
        existing = await col.find_one({"plan_id": p["plan_id"]})
        if not existing:
            await col.insert_one({**p, "fecha_inicio": None, "fecha_fin": None, "nota": ""})

def _plan_tiene_acceso_hoy(doc: dict) -> bool:
    if not doc.get("activo"):
        return False
    hoy = datetime.now(timezone.utc).date()
    fi = doc.get("fecha_inicio")
    ff = doc.get("fecha_fin")
    if fi and hoy < datetime.fromisoformat(fi).date():
        return False
    if ff and hoy > datetime.fromisoformat(ff).date():
        return False
    return True
