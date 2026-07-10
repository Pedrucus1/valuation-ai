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

from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from fastapi.responses import Response

from core.db import db
from core.auth import require_auth
from core.data_exchange import (
    parse_upload, normalizar_fila, validar_fila, generar_plantilla_xlsx,
    id_unico_data_exchange, clave_direccion, descuento_por_calidad, ETIQUETA, COLUMNAS,
)

router = APIRouter(prefix="/api/inmobiliaria/data-exchange")

_TIPO_DISPLAY = {"casa": "Casa", "departamento": "Departamento", "terreno": "Terreno",
                 "local": "Local", "oficina": "Oficina", "bodega": "Bodega"}


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
    esta inmobiliaria al pool (mismo id) O ya en su CRM (misma dirección). Solo
    lo nuevo cuenta para el descuento y solo lo nuevo se ingiere. 2 queries."""
    ids = [id_unico_data_exchange(user_id, f["direccion"]) for f in validas]
    en_pool = set()
    if ids:
        docs = await db.mercado_props.find(
            {"id_unico": {"$in": ids}}, {"id_unico": 1, "_id": 0}).to_list(len(ids))
        en_pool = {d["id_unico"] for d in docs}
    crm = await db.propiedades_inmobiliaria.find(
        {"user_id": user_id}, {"direccion": 1, "_id": 0}).to_list(100000)
    dirs_crm = {clave_direccion(d.get("direccion")) for d in crm}
    nuevas, duplicadas = [], 0
    for f, uid in zip(validas, ids):
        if uid in en_pool or clave_direccion(f["direccion"]) in dirs_crm:
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
    anio_actual = datetime.now().year
    crm_docs, ingeridas_pool = [], 0
    for f in nuevas:
        # 1) CRM (propiedades_inmobiliaria) — nombres del CRM
        crm_docs.append({
            "user_id": user.user_id, "origen": "data_exchange",
            "direccion": f["direccion"], "tipo": _TIPO_DISPLAY.get(f["tipo"], f["tipo"]),
            "colonia": f["colonia"], "municipio": f["municipio"],
            "precio_oferta": f["precio"],
            "m2_construccion": f.get("m2_construccion"), "m2_terreno": f.get("m2_terreno"),
            "recamaras": f.get("recamaras"), "banos": f.get("banos"),
            "medio_banos": f.get("medios_banos"), "estacionamiento": f.get("estacionamientos"),
            "niveles": f.get("niveles"),
            "antiguedad": (anio_actual - f["anio"]) if f.get("anio") else None,
            "conservacion": f.get("conservacion"), "descripcion": f.get("descripcion"),
            "activo": True, "created_at": ahora, "updated_at": ahora,
        })
        # 2) Pool (mercado_props) — solo con datos de oro (precio + año)
        if f.get("precio") and f.get("anio"):
            uid = id_unico_data_exchange(user.user_id, f["direccion"])
            doc = {
                "id_unico": uid, "portal_origen": "DATA_EXCHANGE", "fuente": "data_exchange",
                "inmobiliaria_id": user.user_id, "colonia_fuente": "data_exchange",
                "tipo_propiedad": f["tipo"], "precio": f["precio"],
                "colonia": f["colonia"], "municipio": f["municipio"],
                "anio_construccion": f["anio"], "tipo_operacion": "venta",
                "m2_construccion": f.get("m2_construccion"), "m2_terreno": f.get("m2_terreno"),
                "recamaras": f.get("recamaras"), "banos": f.get("banos"),
                "estacionamientos": f.get("estacionamientos"),
                "activo": True, "fecha_scraping": ahora[:10], "mongo_ts": ahora,
            }
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
