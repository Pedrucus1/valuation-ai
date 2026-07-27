"""Bolsa de Requerimientos — un asesor publica los requisitos de un cliente y el
sistema busca coincidencias en el pool `mercado_props` (subido por scraper, Data
Exchange y alta manual). Si no hay match, la requisición queda viva 15 días; el
recálculo de coincidencias nuevas es LAZY (al leer, como `core/creditos.py`), no
hay trigger en los caminos de alta ni cron en este stack."""
from __future__ import annotations
import logging
import re
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

log = logging.getLogger(__name__)

# proximidad.py vive en el módulo del motor (Node), no en backend/ — mismo patrón
# de import por path que mongo_comparables.py.
_GEO_DIR = Path(__file__).parent.parent.parent / "Modulo Drive IA" / "_geo"
if str(_GEO_DIR) not in sys.path:
    sys.path.insert(0, str(_GEO_DIR))
try:
    from proximidad import coords_de_colonia  # type: ignore
except Exception as _e:  # dataset no disponible → mapa sin puntos, no rompe el endpoint
    log.warning(f"proximidad.py no disponible ({_e}); mapa de zonas sin coordenadas")
    coords_de_colonia = None

VIGENCIA_DIAS = 15

TIPOS_VALIDOS = {"casa", "departamento", "terreno", "local", "oficina", "bodega"}


def expira_en(desde: datetime) -> datetime:
    return desde + timedelta(days=VIGENCIA_DIAS)


def _regex_exacto(valor: str):
    return re.compile(f"^{re.escape(valor.strip())}$", re.I)


def construir_query_match(criterios: dict) -> dict:
    """Criterios normalizados → filtro Mongo sobre `mercado_props`. Solo props
    con dueño identificable (`inmobiliaria_id`) sirven — sin eso no hay a quién
    contactar."""
    q: dict = {"activo": True, "inmobiliaria_id": {"$ne": None}}
    if criterios.get("tipo"):
        q["tipo_propiedad"] = criterios["tipo"]
    if criterios.get("municipio"):
        q["municipio"] = _regex_exacto(criterios["municipio"])
    if criterios.get("colonia"):
        q["colonia"] = _regex_exacto(criterios["colonia"])
    precio = {}
    if criterios.get("precio_min"):
        precio["$gte"] = criterios["precio_min"]
    if criterios.get("precio_max"):
        precio["$lte"] = criterios["precio_max"]
    if precio:
        q["precio"] = precio
    if criterios.get("recamaras_min"):
        q["recamaras"] = {"$gte": criterios["recamaras_min"]}
    if criterios.get("banos_min"):
        q["banos"] = {"$gte": criterios["banos_min"]}
    if criterios.get("m2_min"):
        q["m2_construccion"] = {"$gte": criterios["m2_min"]}
    return q


def normalizar_criterios(payload: dict) -> dict:
    """Valida/normaliza el body de creación. Lanza ValueError con mensaje en
    español si algo obligatorio falta o es inválido."""
    tipo = str(payload.get("tipo") or "").strip().lower()
    if tipo not in TIPOS_VALIDOS:
        raise ValueError(f"Tipo de propiedad inválido: '{payload.get('tipo')}'")
    municipio = str(payload.get("municipio") or "").strip()
    if not municipio:
        raise ValueError("Municipio es obligatorio")
    out = {"tipo": tipo, "municipio": municipio}
    colonia = str(payload.get("colonia") or "").strip()
    if colonia:
        out["colonia"] = colonia
    for campo in ("precio_min", "precio_max", "recamaras_min", "banos_min", "m2_min"):
        v = payload.get(campo)
        if v not in (None, ""):
            try:
                out[campo] = float(v)
            except (TypeError, ValueError):
                raise ValueError(f"'{campo}' debe ser numérico")
    notas = str(payload.get("notas") or "").strip()
    if notas:
        out["notas"] = notas[:500]
    return out


CAMPOS_MATCH = {
    "_id": 0, "id_unico": 1, "tipo_propiedad": 1, "precio": 1,
    "colonia": 1, "municipio": 1, "m2_construccion": 1, "m2_terreno": 1,
    "recamaras": 1, "banos": 1, "url_original": 1, "inmobiliaria_id": 1,
}

CAMPOS_CONTACTO = {"_id": 0, "user_id": 1, "name": 1, "phone": 1, "email": 1,
                   "company_name": 1, "empresa_afiliada": 1, "picture": 1}


def resolver_coords(colonia: str | None, municipio: str) -> tuple[float | None, float | None]:
    """Colonia+municipio → (lat, lon), o (None, None) si no hay dato. Nunca lanza."""
    if not coords_de_colonia or not colonia:
        return None, None
    try:
        coord = coords_de_colonia(colonia, municipio)
    except Exception:
        return None, None
    if not coord:
        return None, None
    return coord.get("lat"), coord.get("lon")


async def buscar_matches(db, criterios: dict, limite: int = 20) -> list[dict]:
    """Corre el match y devuelve los docs de `mercado_props` con el contacto de
    la inmobiliaria/asesor ya resuelto (o `None` si el usuario ya no existe)."""
    query = construir_query_match(criterios)
    props = await db.mercado_props.find(query, CAMPOS_MATCH).to_list(limite)
    if not props:
        return []
    ids = list({p["inmobiliaria_id"] for p in props})
    contactos_docs = await db.users.find(
        {"user_id": {"$in": ids}}, CAMPOS_CONTACTO).to_list(len(ids))
    contactos = {c["user_id"]: c for c in contactos_docs}
    for p in props:
        p["contacto"] = contactos.get(p["inmobiliaria_id"])
    return props


def resumen_publico(req_doc: dict) -> dict:
    """Requisición → shape reducido para el feed público (sin `matches_vistos`,
    que es interno). Incluye lat/lng (nullable) para el mapa de zonas."""
    lat, lng = resolver_coords(req_doc.get("colonia"), req_doc["municipio"])
    return {
        "id": str(req_doc["_id"]),
        "nombre_asesor": req_doc.get("nombre_asesor"),
        "empresa": req_doc.get("empresa"),
        "foto_asesor": req_doc.get("foto_asesor"),
        "tipo": req_doc["tipo"], "municipio": req_doc["municipio"],
        "colonia": req_doc.get("colonia"),
        "precio_min": req_doc.get("precio_min"), "precio_max": req_doc.get("precio_max"),
        "recamaras_min": req_doc.get("recamaras_min"), "banos_min": req_doc.get("banos_min"),
        "m2_min": req_doc.get("m2_min"), "notas": req_doc.get("notas"),
        "creado_en": req_doc["creado_en"].isoformat(),
        "expira_en": req_doc["expira_en"].isoformat(),
        "estado": estado_actual(req_doc),
        "lat": lat, "lng": lng,
    }


def estado_actual(req_doc: dict) -> str:
    if req_doc.get("estado") == "cerrada":
        return "cerrada"
    ahora = datetime.now(timezone.utc)
    expira = req_doc["expira_en"]
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)
    return "vencida" if ahora > expira else "activa"
