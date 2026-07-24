"""Inmobiliaria (titular): equipo de asesores vinculados + propiedades manuales."""
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Request, HTTPException, UploadFile, File

import os
import google.generativeai as genai

from core.db import db
from core.auth import require_auth

router = APIRouter(prefix="/api")

@router.post("/inmobiliaria/promociones/generate-description")
async def generate_promocion_description(request: Request):
    await require_auth(request)
    body = await request.json()
    tipo = body.get("tipo", "")
    direccion = body.get("direccion", "")
    m2_terreno = body.get("m2_terreno", "")
    m2_construccion = body.get("m2_construccion", "")
    recamaras = body.get("recamaras", "")
    banos = body.get("banos", "")

    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash')

    system_instruction = "Eres un experto copywriter de bienes raíces. Genera una descripción de ventas rompedora, elegante y altamente persuasiva basándote en los datos dados. Omite saludos y explicaciones, entrega solo el texto publicitario en 1 o 2 párrafos."
    full_prompt = f"{system_instruction}\n\nDatos de la propiedad:\nTipo: {tipo}\nDirección: {direccion}\nM2 Terreno: {m2_terreno}\nM2 Construcción: {m2_construccion}\nRecámaras: {recamaras}\nBaños: {banos}"

    try:
        response = model.generate_content(full_prompt)
        return {"ok": True, "generated_text": response.text}
    except Exception as e:
        raise HTTPException(500, f"Error generating text: {str(e)}")

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


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

async def _calcular_puntos_propvalu(body: dict) -> tuple[list[str], bool]:
    """Genera chips verificados y flag fuera_de_mercado basados en datos de mercado."""
    puntos = []
    fuera_de_mercado = False

    colonia = (body.get("colonia") or "").lower().strip()
    municipio = (body.get("municipio") or "").lower().strip()
    tipo = body.get("tipo", "")
    precio = body.get("precio_oferta") or 0
    m2c = body.get("m2_construccion") or 0
    m2t = body.get("m2_terreno") or 0
    antiguedad = body.get("antiguedad")

    precio_m2 = precio / m2c if m2c > 0 else None

    # Consultar promedio de mercado para colonia+tipo
    filtro_mercado = {"tipo": tipo}
    if colonia:
        filtro_mercado["colonia"] = {"$regex": colonia, "$options": "i"}
    elif municipio:
        filtro_mercado["municipio"] = {"$regex": municipio, "$options": "i"}

    props_zona = await db.mercado_props.find(
        filtro_mercado,
        {"precio": 1, "m2_construccion": 1, "_id": 0}
    ).to_list(200)

    precios_m2_zona = [
        p["precio"] / p["m2_construccion"]
        for p in props_zona
        if p.get("precio") and p.get("m2_construccion") and p["m2_construccion"] > 0
    ]

    if precios_m2_zona and precio_m2:
        avg_m2 = sum(precios_m2_zona) / len(precios_m2_zona)
        ratio = precio_m2 / avg_m2

        if ratio < 0.85:
            puntos.append("Precio competitivo en la zona")
        elif 0.85 <= ratio <= 1.20:
            puntos.append("Precio acorde al mercado")
        elif ratio > 1.20:
            puntos.append("Precio premium justificado")

        if ratio < 0.75 or ratio > 1.50:
            fuera_de_mercado = True

        # Superficie vs promedio de zona
        m2c_zona = [p["m2_construccion"] for p in props_zona if p.get("m2_construccion")]
        if m2c_zona and m2c > 0:
            avg_m2c = sum(m2c_zona) / len(m2c_zona)
            if m2c > avg_m2c * 1.15:
                puntos.append("Superficie mayor al promedio de la zona")

    elif not precios_m2_zona and colonia:
        # Sin datos de esa colonia → sugiere OPI
        fuera_de_mercado = True

    # Antigüedad
    if antiguedad is not None and antiguedad < 4:
        puntos.append("Construcción reciente")

    # Terreno amplio vs construcción (indicador de potencial)
    if m2t > 0 and m2c > 0 and m2t > m2c * 1.5:
        puntos.append("Amplio terreno con potencial")

    return puntos, fuera_de_mercado


# ── Upload fotos ─────────────────────────────────────────────────────────────

@router.post("/inmobiliaria/upload-fotos")
async def upload_fotos(request: Request, fotos: List[UploadFile] = File(...)):
    """Convierte hasta 10 fotos a base64 data-URL y las devuelve."""
    await require_auth(request)
    if len(fotos) > 10:
        raise HTTPException(400, "Máximo 10 fotos")
    urls = []
    for foto in fotos[:10]:
        content = await foto.read()
        if len(content) > 8 * 1024 * 1024:
            raise HTTPException(400, f"'{foto.filename}' supera los 8 MB permitidos")
        ct = foto.content_type or "image/jpeg"
        urls.append(f"data:{ct};base64,{base64.b64encode(content).decode()}")
    return {"urls": urls}


# ── Endpoints Propiedades ─────────────────────────────────────────────────────

@router.post("/inmobiliaria/propiedades")
async def crear_propiedad(request: Request):
    """Crea una propiedad manual y calcula puntos PropValu + background check."""
    user = await require_auth(request)
    body = await request.json()

    puntos_propvalu, fuera_de_mercado = await _calcular_puntos_propvalu(body)

    doc = {
        "propiedad_id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "origen": "manual",
        "direccion": body.get("direccion", "").strip(),
        "tipo": body.get("tipo", "Casa"),
        "colonia": body.get("colonia"),
        "municipio": body.get("municipio"),
        "estado_mx": body.get("estado_mx"),
        "precio_oferta": float(body.get("precio_oferta", 0)),
        "m2_construccion": body.get("m2_construccion"),
        "m2_terreno": body.get("m2_terreno"),
        "recamaras": body.get("recamaras"),
        "banos": body.get("banos"),
        "medio_banos": body.get("medio_banos"),
        "estacionamiento": body.get("estacionamiento"),
        "niveles": body.get("niveles"),
        "nivel_depto": body.get("nivel_depto"),
        "antiguedad": body.get("antiguedad"),
        "conservacion": body.get("conservacion"),
        "fotos": body.get("fotos", [])[:10],
        "url_recorrido": body.get("url_recorrido"),
        "amenidades": body.get("amenidades", []),
        "instalaciones": body.get("instalaciones", []),
        "espacios": body.get("espacios", []),
        "descripcion": body.get("descripcion"),
        "puntos_libres": body.get("puntos_libres", [])[:2],
        "puntos_propvalu": puntos_propvalu,
        "fuera_de_mercado": fuera_de_mercado,
        "activo": True,
        "created_at": _now(),
        "updated_at": _now(),
    }

    if not doc["direccion"]:
        raise HTTPException(400, "La dirección es requerida")

    await db.propiedades_inmobiliaria.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "propiedad": doc}


@router.get("/inmobiliaria/propiedades")
async def listar_propiedades(request: Request):
    """Lista las propiedades activas del usuario."""
    user = await require_auth(request)
    props = await db.propiedades_inmobiliaria.find(
        {"user_id": user.user_id, "activo": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"propiedades": props}


@router.put("/inmobiliaria/propiedades/{propiedad_id}")
async def actualizar_propiedad(propiedad_id: str, request: Request):
    """Actualiza una propiedad y recalcula puntos PropValu."""
    user = await require_auth(request)
    body = await request.json()

    prop = await db.propiedades_inmobiliaria.find_one(
        {"propiedad_id": propiedad_id, "user_id": user.user_id}
    )
    if not prop:
        raise HTTPException(404, "Propiedad no encontrada")

    merged = {**prop, **body}
    puntos_propvalu, fuera_de_mercado = await _calcular_puntos_propvalu(merged)

    update = {k: v for k, v in body.items() if k not in ("propiedad_id", "user_id", "_id")}
    update["puntos_propvalu"] = puntos_propvalu
    update["fuera_de_mercado"] = fuera_de_mercado
    update["updated_at"] = _now()
    if "puntos_libres" in update:
        update["puntos_libres"] = update["puntos_libres"][:2]

    await db.propiedades_inmobiliaria.update_one(
        {"propiedad_id": propiedad_id},
        {"$set": update}
    )
    updated = await db.propiedades_inmobiliaria.find_one(
        {"propiedad_id": propiedad_id}, {"_id": 0}
    )
    return {"ok": True, "propiedad": updated}


@router.delete("/inmobiliaria/propiedades/{propiedad_id}")
async def eliminar_propiedad(propiedad_id: str, request: Request):
    """Soft delete: marca activo=False."""
    user = await require_auth(request)
    result = await db.propiedades_inmobiliaria.update_one(
        {"propiedad_id": propiedad_id, "user_id": user.user_id},
        {"$set": {"activo": False, "updated_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Propiedad no encontrada")
    return {"ok": True}


# Campos de la propiedad seguros para la promo pública (whitelist — nunca exponer user_id/internos)
_PROMO_CAMPOS = (
    "propiedad_id", "direccion", "tipo", "colonia", "municipio", "estado_mx",
    "precio_oferta", "m2_construccion", "m2_terreno", "recamaras", "banos",
    "medio_banos", "estacionamiento", "niveles", "antiguedad", "fotos",
    "amenidades", "instalaciones", "espacios", "descripcion",
)


@router.get("/inmobiliaria/propiedades/{propiedad_id}/promo-publica")
async def promo_publica(propiedad_id: str):
    """PÚBLICO (sin auth): datos de la propiedad + asesor para el reel interactivo.
    Solo devuelve un subconjunto seguro; nunca user_id ni datos internos/del usuario."""
    prop = await db.propiedades_inmobiliaria.find_one(
        {"propiedad_id": propiedad_id, "activo": True}
    )
    if not prop:
        raise HTTPException(404, "Promo no encontrada")

    propiedad = {k: prop.get(k) for k in _PROMO_CAMPOS if prop.get(k) is not None}

    # Asesor: solo nombre, foto y teléfono del dueño de la propiedad
    asesor = {}
    owner_id = prop.get("user_id")
    if owner_id:
        u = await db.users.find_one(
            {"user_id": owner_id},
            {"_id": 0, "name": 1, "picture": 1, "foto_url": 1, "phone": 1, "telefono": 1, "company_name": 1},
        )
        if u:
            asesor = {
                "nombre": u.get("name") or u.get("company_name") or "",
                "foto": u.get("picture") or u.get("foto_url"),
                "telefono": u.get("phone") or u.get("telefono"),
            }

    return {"propiedad": propiedad, "asesor": asesor}
