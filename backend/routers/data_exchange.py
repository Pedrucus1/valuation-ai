"""Data Exchange (#133) — carga masiva de inventario de la inmobiliaria.

Una sola carga → dos destinos:
  1. CRM: `propiedades_inmobiliaria` (su inventario, base de DocuProp).
  2. Pool de comps: `mercado_props` (solo filas con precio + año; tag
     `fuente=data_exchange`, protegido por la guardia sticky #135b).
Al primer ingreso válido se activa la bandera de 50% en la cuenta.

/analizar hace preview (NO escribe); /confirmar re-parsea el mismo archivo y
escribe. El archivo es la única fuente de verdad (sin estado temporal server-side).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Body
from fastapi.responses import Response

from core.db import db
from core.auth import require_auth
from core.data_exchange import (
    parse_upload, normalizar_fila, validar_fila, generar_plantilla_xlsx,
    id_unico_data_exchange, clave_direccion, descuento_por_calidad, ETIQUETA, COLUMNAS,
    fila_a_doc_crm, fila_a_doc_pool, verificar_link,
)

router = APIRouter(prefix="/api/inmobiliaria/data-exchange")

MAX_FILAS_MANUAL = 3


def _procesar(contenido: bytes, filename: str):
    """Archivo → (validas, rechazadas). `validas` son filas normalizadas;
    `rechazadas` = [{fila, faltan}] con el número de fila (1 = primera de datos)."""
    filas = parse_upload(contenido, filename)   # puede lanzar ValueError
    validas, rechazadas = [], []
    for i, raw in enumerate(filas, start=1):
        fila = normalizar_fila(raw)
        faltan = validar_fila(fila)
        if faltan:
            rechazadas.append({"fila": i, "faltan": faltan})
        else:
            validas.append(fila)
    return validas, rechazadas


async def _dedup(user_id: str, validas: list):
    """Separa filas NUEVAS de DUPLICADAS (#142). Duplicada = ya subida antes por
    esta inmobiliaria al pool (mismo id), ya en su CRM (misma dirección), o su
    link de origen ya existe en el pool (evita recargar a mano algo ya scrapeado).
    Solo lo nuevo cuenta para el descuento y solo lo nuevo se ingiere."""
    ids = [id_unico_data_exchange(user_id, f["direccion"]) for f in validas]
    en_pool = set()
    if ids:
        docs = await db.mercado_props.find(
            {"id_unico": {"$in": ids}}, {"id_unico": 1, "_id": 0}).to_list(len(ids))
        en_pool = {d["id_unico"] for d in docs}
    links = [f["link"] for f in validas if f.get("link")]
    links_en_pool = set()
    if links:
        docs = await db.mercado_props.find(
            {"url_original": {"$in": links}}, {"url_original": 1, "_id": 0}).to_list(len(links))
        links_en_pool = {d["url_original"] for d in docs}
    crm = await db.propiedades_inmobiliaria.find(
        {"user_id": user_id}, {"direccion": 1, "_id": 0}).to_list(100000)
    dirs_crm = {clave_direccion(d.get("direccion")) for d in crm}
    nuevas, duplicadas = [], 0
    for f, uid in zip(validas, ids):
        if (uid in en_pool or clave_direccion(f["direccion"]) in dirs_crm
                or (f.get("link") and f["link"] in links_en_pool)):
            duplicadas += 1
        else:
            nuevas.append(f)
    return nuevas, duplicadas


@router.get("/plantilla")
async def descargar_plantilla(request: Request):
    await require_auth(request)
    xlsx = generar_plantilla_xlsx()
    return Response(
        content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="plantilla_data_exchange.xlsx"'},
    )


@router.post("/analizar")
async def analizar(request: Request, archivo: UploadFile = File(...)):
    """Preview: valida, deduplica y calcula el descuento por calidad. NO escribe."""
    user = await require_auth(request)
    try:
        validas, rechazadas = _procesar(await archivo.read(), archivo.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    nuevas, duplicadas = await _dedup(user.user_id, validas)
    al_pool = sum(1 for f in nuevas if f.get("precio") and f.get("anio"))
    preview = [{ETIQUETA[k]: f.get(k) for k, _ in COLUMNAS} for f in nuevas[:20]]
    return {
        "total": len(validas) + len(rechazadas),
        "aceptadas": len(validas),
        "nuevas": len(nuevas),
        "duplicadas": duplicadas,
        "rechazadas": rechazadas,
        "al_pool": al_pool,
        "descuento_pct": descuento_por_calidad(len(nuevas)),
        "preview": preview,
    }


@router.post("/confirmar")
async def confirmar(request: Request, archivo: UploadFile = File(...)):
    """Re-parsea, deduplica y escribe SOLO lo nuevo (CRM + pool). El descuento
    lo gana la calidad (filas nuevas) y es acumulable (máx histórico)."""
    user = await require_auth(request)
    try:
        validas, rechazadas = _procesar(await archivo.read(), archivo.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    nuevas, duplicadas = await _dedup(user.user_id, validas)
    if not nuevas:
        raise HTTPException(400, "No hay filas nuevas para importar (todas duplicadas o inválidas).")

    ahora = datetime.now(timezone.utc).isoformat()
    crm_docs, ingeridas_pool = [], 0
    for f in nuevas:
        crm_docs.append(fila_a_doc_crm(f, user.user_id, origen="data_exchange", ahora=ahora))
        # Pool (mercado_props) — solo con datos de oro (precio + año)
        if f.get("precio") and f.get("anio"):
            uid = id_unico_data_exchange(user.user_id, f["direccion"])
            doc = fila_a_doc_pool(f, uid, portal_origen="DATA_EXCHANGE", fuente="data_exchange",
                                   colonia_fuente="data_exchange", inmobiliaria_id=user.user_id, ahora=ahora)
            await db.mercado_props.update_one({"id_unico": uid}, {"$set": doc}, upsert=True)
            ingeridas_pool += 1

    if crm_docs:
        await db.propiedades_inmobiliaria.insert_many(crm_docs)
    # Descuento por calidad, acumulable: nunca baja del que ya tenía.
    gana = descuento_por_calidad(len(nuevas))
    udoc = await db.users.find_one({"user_id": user.user_id}, {"data_exchange_pct": 1, "_id": 0})
    pct = max(gana, (udoc or {}).get("data_exchange_pct", 0) or 0)
    await db.users.update_one({"user_id": user.user_id},
                              {"$set": {"data_exchange_pct": pct}})
    return {
        "ok": True, "al_crm": len(crm_docs), "al_pool": ingeridas_pool,
        "duplicadas": duplicadas, "rechazadas": len(rechazadas), "descuento_pct": pct,
    }


@router.post("/manual")
async def alta_manual(request: Request, payload: dict = Body(...)):
    """Alta visual de 1-3 propiedades (sin archivo) — mismo destino y reglas que
    /confirmar: CRM + pool, cuenta para el descuento por calidad."""
    user = await require_auth(request)
    filas_raw = payload.get("filas") or []
    if not filas_raw:
        raise HTTPException(400, "Manda al menos una propiedad")
    if len(filas_raw) > MAX_FILAS_MANUAL:
        raise HTTPException(400, f"Máximo {MAX_FILAS_MANUAL} propiedades por alta manual")

    validas, rechazadas = [], []
    for i, raw in enumerate(filas_raw, start=1):
        fila = normalizar_fila(raw)
        faltan = validar_fila(fila)
        if faltan:
            rechazadas.append({"fila": i, "faltan": faltan})
        else:
            validas.append(fila)

    nuevas, duplicadas = await _dedup(user.user_id, validas)
    ahora = datetime.now(timezone.utc).isoformat()
    crm_docs, ingeridas_pool = [], 0
    for f in nuevas:
        crm_docs.append(fila_a_doc_crm(f, user.user_id, origen="captura_manual_realtor", ahora=ahora))
        if f.get("precio") and f.get("anio"):
            link_ok = await verificar_link(f.get("link")) if f.get("link") else None
            uid = id_unico_data_exchange(user.user_id, f["direccion"])
            doc = fila_a_doc_pool(f, uid, portal_origen="DATA_EXCHANGE_MANUAL", fuente="captura_manual_realtor",
                                   colonia_fuente="data_exchange", inmobiliaria_id=user.user_id, ahora=ahora,
                                   link_verificado=link_ok)
            await db.mercado_props.update_one({"id_unico": uid}, {"$set": doc}, upsert=True)
            ingeridas_pool += 1

    if crm_docs:
        await db.propiedades_inmobiliaria.insert_many(crm_docs)
    gana = descuento_por_calidad(len(nuevas))
    udoc = await db.users.find_one({"user_id": user.user_id}, {"data_exchange_pct": 1, "_id": 0})
    pct = max(gana, (udoc or {}).get("data_exchange_pct", 0) or 0)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"data_exchange_pct": pct}})
    return {
        "ok": True, "creadas": len(crm_docs), "al_pool": ingeridas_pool,
        "duplicadas": duplicadas, "rechazadas": rechazadas, "descuento_pct": pct,
    }
