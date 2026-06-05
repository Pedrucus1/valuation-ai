"""Inmobiliaria (titular): equipo de asesores vinculados."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

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
