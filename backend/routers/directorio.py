"""Directorio público de valuadores e inmobiliarias + reseñas."""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_auth
from core.ratelimit import limiter

router = APIRouter(prefix="/api")


@router.get("/directorio/valuadores")
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


@router.get("/directorio/inmobiliarias")
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


@router.post("/directorio/{tipo}/{perfil_id}/resena")
@limiter.limit("5/minute")
async def enviar_resena(tipo: str, perfil_id: str, request: Request):
    if tipo not in ("valuadores", "inmobiliarias"):
        raise HTTPException(400, "Tipo debe ser 'valuadores' o 'inmobiliarias'")
    body = await request.json()
    try:
        calificacion = int(body.get("calificacion", 0))
    except (ValueError, TypeError):
        raise HTTPException(400, "Calificación inválida")
    if not (1 <= calificacion <= 5):
        raise HTTPException(400, "Calificación debe ser entre 1 y 5")
    # Topes de tamaño (S5): endpoint público, evita payloads enormes.
    comentario = str(body.get("comentario") or "").strip()[:2000]
    nombre_cliente = (str(body.get("nombre_cliente") or "Anónimo").strip() or "Anónimo")[:100]
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


@router.get("/directorio/{tipo}/{perfil_id}/resenas")
async def obtener_resenas(tipo: str, perfil_id: str):
    docs = await db.resenas.find(
        {"perfil_id": perfil_id, "tipo": tipo},
    ).sort("created_at", -1).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@router.post("/directorio/{tipo}/{perfil_id}/resenas/{resena_id}/respuesta")
async def responder_resena(tipo: str, perfil_id: str, resena_id: str, request: Request):
    """La empresa dueña del perfil responde a una reseña."""
    # S7: usar el patrón estándar de sesión (user_sessions + expiry) vía require_auth,
    # en vez del lookup legacy por session_token en la colección users.
    user = await require_auth(request)
    # El perfil_id en el directorio se basa en el email del usuario (ver listados arriba).
    if user.email != perfil_id:
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
