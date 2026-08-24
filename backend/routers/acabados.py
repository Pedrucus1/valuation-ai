"""Propuestas de catalogo para el Identificador de Edad (Manual ZMG).

Fase 1 del plan de fuente unica (Manual-Arquitectura-ZMG/PLAN_Fuente_Unica_Datos.md):
reemplaza el Google Sheet original por Mongo + este router, mismo patron que
routers/access.py. Cualquiera propone una fila (elemento/opcion/decadas con
fuente), un admin/contenido la aprueba o rechaza; `aplicar_hallazgos_acabados.py`
(en el repo del Manual) lee las aprobadas via este API y las mergea a
acabados_master.json -- nunca se escribe el catalogo directo desde aqui.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import require_admin, require_admin_or_credentialed_contributor

router = APIRouter(prefix="/api")

DECADAS_VALIDAS = {
    "1900s", "1910s", "1920s", "1930s", "1940s", "1950s", "1960s", "1970s",
    "1980s", "1990s", "2000s", "2010s", "2020s",
}
ACCIONES_VALIDAS = {"agregar", "corregir", "eliminar"}
ESTADOS_VALIDOS = {"pendiente", "aprobado", "rechazado"}


@router.get("/admin/acabados/propuestas")
async def acabados_propuestas_list(request: Request, estado: str = ""):
    await require_admin(request)
    query: Dict[str, Any] = {}
    if estado in ESTADOS_VALIDOS:
        query["estado"] = estado
    docs = await db["acabados_propuestas"].find(query, {"_id": 0}).sort("fecha_captura", -1).to_list(500)
    # conteos son GLOBALES (para los KPIs), no del subconjunto filtrado --
    # si no, filtrar por "aprobado" mostraba "Pendientes: 0" incorrectamente.
    conteos = {e: await db["acabados_propuestas"].count_documents({"estado": e}) for e in ESTADOS_VALIDOS}
    return {"items": docs, "total": len(docs), "conteos": conteos}


@router.post("/admin/acabados/propuestas")
async def acabados_propuesta_crear(request: Request):
    # Fase 5 federación: admin O clasificador acreditado del Atlas de colonias
    # (colaboradores externos pueden proponer, solo un admin aprueba/mergea).
    admin = await require_admin_or_credentialed_contributor(request)
    body = await request.json()

    elemento = (body.get("elemento") or "").strip()
    opcion = (body.get("opcion") or "").strip()
    decadas: List[str] = body.get("decadas") or []
    accion = body.get("accion") or "agregar"
    if not elemento or not opcion:
        raise HTTPException(status_code=400, detail="elemento y opcion son requeridos")
    if accion not in ACCIONES_VALIDAS:
        raise HTTPException(status_code=400, detail=f"accion debe ser una de {sorted(ACCIONES_VALIDAS)}")
    decadas_malas = set(decadas) - DECADAS_VALIDAS
    if decadas_malas:
        raise HTTPException(status_code=400, detail=f"decadas invalidas: {sorted(decadas_malas)}")
    if accion != "eliminar" and not decadas:
        raise HTTPException(status_code=400, detail="decadas es requerido salvo accion=eliminar")

    doc = {
        "propuesta_id": str(uuid.uuid4()),
        "elemento": elemento,
        "opcion": opcion,
        "decadas": decadas,
        "accion": accion,
        "fuente_tipo": body.get("fuente_tipo") or "dictado_perito",
        "fuente_url": body.get("fuente_url") or "",
        "nota": body.get("nota") or "",
        "estado": "pendiente",
        "autor": admin.get("email") if admin else None,
        "fecha_captura": datetime.now(timezone.utc).isoformat(),
        "revisor": None,
        "fecha_revision": None,
    }
    await db["acabados_propuestas"].insert_one(dict(doc))
    return doc


@router.post("/admin/acabados/propuestas/{propuesta_id}/revisar")
async def acabados_propuesta_revisar(propuesta_id: str, request: Request):
    admin = await require_admin(request)
    body = await request.json()
    estado = body.get("estado")
    if estado not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="estado debe ser 'aprobado' o 'rechazado'")
    cambios = {
        "estado": estado,
        "revisor": admin.get("email") if admin else None,
        "fecha_revision": datetime.now(timezone.utc).isoformat(),
    }
    res = await db["acabados_propuestas"].update_one({"propuesta_id": propuesta_id}, {"$set": cambios})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    doc = await db["acabados_propuestas"].find_one({"propuesta_id": propuesta_id}, {"_id": 0})
    return doc or {"ok": True}


@router.delete("/admin/acabados/propuestas/{propuesta_id}")
async def acabados_propuesta_borrar(propuesta_id: str, request: Request):
    await require_admin(request)
    await db["acabados_propuestas"].delete_one({"propuesta_id": propuesta_id})
    return {"ok": True}


@router.get("/admin/acabados/propuestas/aprobadas-pendientes-aplicar")
async def acabados_aprobadas_pendientes_aplicar(request: Request):
    """Usado por aplicar_hallazgos_acabados.py (Manual-Arquitectura-ZMG). Devuelve
    las aprobadas que aun no se mergearon a acabados_master.json."""
    await require_admin(request)
    docs = await db["acabados_propuestas"].find(
        {"estado": "aprobado", "aplicada": {"$ne": True}}, {"_id": 0}
    ).to_list(500)
    return {"items": docs, "total": len(docs)}


@router.post("/admin/acabados/propuestas/marcar-aplicadas")
async def acabados_marcar_aplicadas(request: Request):
    """Llamado por aplicar_hallazgos_acabados.py tras mergear exitosamente a
    acabados_master.json -- evita reprocesar las mismas propuestas."""
    await require_admin(request)
    body = await request.json()
    ids = body.get("propuesta_ids") or []
    if not ids:
        raise HTTPException(status_code=400, detail="propuesta_ids requerido")
    res = await db["acabados_propuestas"].update_many(
        {"propuesta_id": {"$in": ids}}, {"$set": {"aplicada": True}}
    )
    return {"marcadas": res.modified_count}
