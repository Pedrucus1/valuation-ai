"""Edad crowdsource (v1 interna): peritos/inmobiliarias estiman la edad de
propiedades sin año → se escribe al pool mercado_props para permear valores de
zona. Dos vertientes usan estos endpoints: la celda Edad del avalúo y el panel
"Edades por zona". Ver plan streamed-exploring-patterson.md."""
import json
import unicodedata
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Request, HTTPException

from core.db import db
from core.auth import get_current_user, require_admin
from mongo_comparables import TIPO_ALIAS

router = APIRouter(prefix="/api")

# Catálogo oficial SEPOMEX (read-only) para sugerir nombres de colonia unificados.
_SEPOMEX_PATH = Path(__file__).resolve().parents[2] / "Modulo Drive IA" / "sepomex_v2.json"


def _norm_muni(s):
    """Sin acentos + minúsculas (SEPOMEX y nuestros nombres difieren en acentos)."""
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


@lru_cache(maxsize=1)
def _sepomex_por_municipio():
    """municipio_normalizado -> {nombre_oficial: cp}. Se carga una vez (read-only)."""
    idx = {}
    try:
        data = json.loads(_SEPOMEX_PATH.read_text(encoding="utf-8"))
    except Exception:
        return idx
    for entradas in data.values():
        if isinstance(entradas, dict):
            entradas = [entradas]
        for e in entradas or []:
            muni = _norm_muni(e.get("municipio"))
            nombre = (e.get("nombre") or "").strip()
            if muni and nombre:
                idx.setdefault(muni, {}).setdefault(nombre, e.get("cp") or "")
    return idx


async def _quien(request: Request) -> str:
    """Acepta sesión de usuario (perito/inmobiliaria) O token de admin.
    Devuelve el id del estimador para trazabilidad. 401 si ninguno."""
    user = await get_current_user(request)
    if user:
        return user.user_id
    admin = await require_admin(request)   # lanza 401 si tampoco hay admin
    return f"admin:{admin.get('email', 'admin')}"

# Rangos finos (Ross-Heidecke: la depreciación es sensible temprano) → punto medio (años).
# El año se guarda como año_actual - midpoint.
RANGO_MIDPOINT = {
    "nuevo": 0, "1-5": 3, "6-10": 8, "11-15": 13, "16-20": 18, "21-25": 23,
    "26-30": 28, "31-35": 33, "36-40": 38, "41-45": 43, "46-50": 48,
    # Propiedades viejas: buckets de 10 años hasta los 40s.
    "51-60": 55, "61-70": 65, "71-80": 75, "80+": 88,
}

CAMPOS_SIN_EDAD = {
    "_id": 0, "id_unico": 1, "colonia": 1, "calle_numero": 1, "codigo_postal": 1,
    "tipo_propiedad": 1, "precio": 1, "m2_construccion": 1, "url_original": 1,
}

# Estado de conservación (escala, SIN remodelación — eso es un eje aparte que
# ajusta la edad efectiva). Alimenta el factor de conservación del motor.
TIPOS_CANON = {"casa", "departamento", "terreno", "local", "oficina", "bodega"}

CONSERVACION_VALIDAS = {
    "Nuevo", "Excelente", "Bueno", "Regular Bueno", "Regular",
    "Regular Malo", "Malo", "Muy Malo",
}

# Remodelación → fracción p de la construcción renovada (peso derivado de las
# partidas del dictamen del perito, versión conservadora). Con el año de
# remodelación se calcula la EDAD EFECTIVA (método del dictamen de mejoras):
#   edad_efectiva = edad_crono − p × (edad_crono − edad_de_mejoras)
GRADO_REMOD_P = {"ligera": 0.20, "basica": 0.35, "intermedia": 0.55, "completa": 0.95}


def _edad_efectiva(anio_construccion, anio_remodelacion, grado, ahora_year):
    """Edad efectiva ponderada por remodelación (None si no hay grado válido)."""
    p = GRADO_REMOD_P.get((grado or "").lower())
    if p is None or not anio_construccion:
        return None
    edad_crono = ahora_year - anio_construccion
    edad_mejoras = (ahora_year - anio_remodelacion) if anio_remodelacion else 0
    edad_ajustada = edad_crono - edad_mejoras
    return round(edad_crono - p * edad_ajustada, 1)


def _base_usables():
    """Filtro base de comps etiquetables: sin año, con precio, no duplicado y
    con colonia real (no el título del anuncio ni frases largas en inglés)."""
    return {
        "anio_construccion": None,
        "precio": {"$gt": 0},
        "es_duplicado_secundario": {"$ne": True},
        "$expr": {"$and": [
            {"$ne": ["$colonia", "$titulo"]},
            {"$lt": [{"$strLenCP": {"$ifNull": ["$colonia", ""]}}, 40]},
        ]},
    }


@router.get("/edad-zonas")
async def edad_zonas(request: Request, estado: str = "", municipio: str = ""):
    """Cascada de zonas alimentada por los datos reales (nivel nacional):
    sin params → estados; con estado → municipios; con estado+municipio → colonias.
    Solo cuenta propiedades etiquetables (base usables)."""
    await _quien(request)
    q = _base_usables()
    if municipio and estado:
        q.update({"estado": estado, "municipio": municipio})
        campo = "colonia"
    elif estado:
        q["estado"] = estado
        campo = "municipio"
    else:
        campo = "estado"
    vals = await db.mercado_props.distinct(campo, q)
    vals = sorted(v for v in vals if v and str(v).strip())
    return {"campo": campo, "valores": vals}


@router.get("/colonias-oficiales")
async def colonias_oficiales(request: Request, municipio: str = ""):
    """Colonias oficiales SEPOMEX de un municipio (nombre + CP) para unificar
    nombres. Read-only, no toca datos."""
    await _quien(request)
    idx = _sepomex_por_municipio()
    q = _norm_muni(municipio)
    m = dict(idx.get(q) or {})
    if not m and q:
        # "Tlaquepaque" ⊂ "san pedro tlaquepaque"; y prefijo limpio de 5 letras
        # para municipios con mojibake en SEPOMEX (Tlajomulco…Zúñiga, Tonalá).
        for k, v in idx.items():
            if q in k or k in q or (len(q) >= 5 and len(k) >= 5 and k[:5] == q[:5]):
                m.update(v)
    cols = sorted(({"nombre": n, "cp": cp} for n, cp in m.items()), key=lambda x: x["nombre"])
    return {"municipio": municipio, "colonias": cols, "total": len(cols)}


@router.get("/nombres-zona")
async def nombres_zona(request: Request, municipio: str = ""):
    """Nombres de colonia y coto/conjunto YA usados en ese municipio, para
    autocompletar y que los usuarios elijan uno existente en vez de inventar
    variantes ('Albaterra' vs 'Fracc. Albaterra'). Read-only (distinct)."""
    await _quien(request)
    if not municipio:
        return {"colonias": [], "conjuntos": []}
    q = {"municipio": municipio}
    colonias = await db.mercado_props.distinct("colonia", q)
    conjuntos = await db.mercado_props.distinct("conjunto", q)
    # Colonias: filtrar basura (títulos largos en inglés) por longitud.
    limpio_col = sorted({str(v).strip() for v in colonias
                         if v and 2 < len(str(v).strip()) <= 45})
    limpio_conj = sorted({str(v).strip() for v in conjuntos if v and str(v).strip()})
    return {"colonias": limpio_col, "conjuntos": limpio_conj}


@router.get("/comps-sin-edad")
async def comps_sin_edad(
    request: Request,
    estado: str = "",
    municipio: str = "",
    colonia: str = "",
    tipo: str = "",
    limit: int = 30,
):
    """Lote de propiedades de mercado_props sin año, para etiquetar (panel)."""
    await _quien(request)
    q = _base_usables()
    if estado:
        q["estado"] = estado
    if municipio:
        q["municipio"] = municipio
    if colonia:
        # Match parcial insensible: las colonias escrapeadas vienen en mayúsculas
        # y con variaciones, un match exacto casi nunca pega.
        import re as _re
        q["colonia"] = {"$regex": _re.escape(colonia.strip()), "$options": "i"}
    if tipo:
        q["tipo_propiedad"] = TIPO_ALIAS.get(tipo.lower().strip(), tipo)
    limit = max(1, min(limit, 100))
    items = await db.mercado_props.find(q, CAMPOS_SIN_EDAD).limit(limit).to_list(limit)
    return {"items": items, "count": len(items)}


@router.post("/edad-estimada")
async def edad_estimada(request: Request):
    """Guarda la edad estimada por el perito en mercado_props (por id_unico)."""
    estimador = await _quien(request)
    body = await request.json()

    id_unico = str(body.get("id_unico") or "").strip()
    rango = str(body.get("edad_rango") or "").strip()
    conjunto = body.get("conjunto")
    anio_exacto = body.get("anio_exacto")
    edad_exacta = body.get("edad_exacta")
    conservacion = str(body.get("conservacion") or "").strip()
    anio_remod = body.get("anio_remodelacion")
    grado_remod = str(body.get("grado_remodelacion") or "").strip().lower()
    colonia_fix = str(body.get("colonia") or "").strip()[:60]
    cp = str(body.get("cp") or "").strip()[:6]
    # Corrección de tipo de propiedad (si el scrapeo lo trae mal, ej. "local"
    # que en realidad es casa). Canónico en minúscula, como lo guarda el pool.
    tipo_fix = str(body.get("tipo") or "").strip()
    if tipo_fix:
        tipo_fix = TIPO_ALIAS.get(tipo_fix.lower(), tipo_fix).lower()
    # Anuncio retirado / ya no publicado: baja el comp (activo=False) sin borrarlo
    # (el precio sigue sirviendo al motor como comp de menor calidad).
    retirado = bool(body.get("retirado"))
    # Datos basura / información incorrecta: el anuncio tiene datos malos (precio,
    # m², colonia, etc. no confiables). Se excluye de comparables (activo=False)
    # con motivo propio, para que no meta ruido al motor.
    datos_basura = bool(body.get("datos_basura"))
    # Nivel/piso (campo NUEVO): importa en depto de torre y en local/oficina de
    # plaza (y el último nivel de edificios chicos sin elevador vale menos).
    nivel = body.get("nivel")
    nivel_val = None
    if nivel not in (None, ""):
        try:
            nivel_val = int(nivel)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Nivel inválido")
        if not (-5 <= nivel_val <= 200):
            raise HTTPException(status_code=400, detail="Nivel fuera de rango")

    if not id_unico:
        raise HTTPException(status_code=400, detail="Falta id_unico")
    if conservacion and conservacion not in CONSERVACION_VALIDAS:
        raise HTTPException(status_code=400, detail=f"Conservación inválida: {conservacion}")
    if grado_remod and grado_remod not in GRADO_REMOD_P:
        raise HTTPException(status_code=400, detail=f"Grado de remodelación inválido: {grado_remod}")
    if tipo_fix and tipo_fix not in TIPOS_CANON:
        raise HTTPException(status_code=400, detail=f"Tipo de propiedad inválido: {tipo_fix}")

    ahora = datetime.now(timezone.utc)
    update = {"edad_estimador": estimador, "edad_fecha": ahora.isoformat()}

    # Edad (opcional si viene conservación): exacto > rango.
    exacta = False
    tiene_edad = True
    if anio_exacto not in (None, ""):
        try:
            anio = int(anio_exacto)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Año inválido")
        if not (1900 <= anio <= ahora.year + 1):
            raise HTTPException(status_code=400, detail="Año fuera de rango")
        exacta = True
    elif edad_exacta not in (None, ""):
        try:
            e = int(edad_exacta)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Edad inválida")
        if not (0 <= e <= 200):
            raise HTTPException(status_code=400, detail="Edad fuera de rango")
        anio = ahora.year - e
        exacta = True
    elif rango in RANGO_MIDPOINT:
        anio = ahora.year - RANGO_MIDPOINT[rango]
    else:
        tiene_edad = False

    # Año de remodelación (opcional) — se valida si viene.
    anio_remod_val = None
    if anio_remod not in (None, ""):
        try:
            anio_remod_val = int(anio_remod)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Año de remodelación inválido")
        if not (1900 <= anio_remod_val <= ahora.year + 1):
            raise HTTPException(status_code=400, detail="Año de remodelación fuera de rango")

    if not tiene_edad and not conservacion and not grado_remod and not colonia_fix and not tipo_fix and not retirado and not datos_basura and nivel_val is None:
        raise HTTPException(status_code=400, detail="Falta edad, conservación, remodelación, colonia, tipo, nivel, retiro o reporte de datos incorrectos")

    if tiene_edad:
        update["anio_construccion"] = anio
        update["edad_fuente"] = "perito_crowdsource"
        update["edad_rango"] = rango if (rango in RANGO_MIDPOINT and not exacta) else None
        update["edad_exacta"] = exacta
    if conservacion:
        update["conservacion"] = conservacion
        update["conservacion_fuente"] = "perito_crowdsource"
    if grado_remod:
        update["grado_remodelacion"] = grado_remod
        if anio_remod_val:
            update["anio_remodelacion"] = anio_remod_val
        # Edad efectiva ponderada (método dictamen de mejoras). Usa el año de
        # construcción de este mismo request si vino, si no el que ya tenga el doc.
        anio_c = anio if tiene_edad else None
        if anio_c is None:
            doc = await db.mercado_props.find_one({"id_unico": id_unico}, {"_id": 0, "anio_construccion": 1})
            anio_c = (doc or {}).get("anio_construccion")
        ee = _edad_efectiva(anio_c, anio_remod_val, grado_remod, ahora.year)
        if ee is not None:
            update["edad_efectiva"] = ee
    if conjunto:
        update["conjunto"] = str(conjunto).strip()[:120]
    if colonia_fix:
        update["colonia"] = colonia_fix
        update["colonia_fuente"] = "perito_correccion"
        if cp:
            update["codigo_postal"] = cp
    if tipo_fix:
        update["tipo_propiedad"] = tipo_fix
        update["tipo_fuente"] = "perito_correccion"
    if retirado:
        update["activo"] = False
        update["baja_fuente"] = "perito_retirado"
        update["baja_fecha"] = ahora.isoformat()
    if datos_basura:
        update["activo"] = False
        update["baja_fuente"] = "perito_datos_basura"
        update["datos_basura"] = True
        update["baja_fecha"] = ahora.isoformat()
    if nivel_val is not None:
        update["nivel"] = nivel_val

    res = await db.mercado_props.update_one({"id_unico": id_unico}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    # Puntos (stub): contador por usuario real (admin no acumula), sin canje en v1.
    puntos = None
    if not estimador.startswith("admin:"):
        await db.users.update_one({"user_id": estimador}, {"$inc": {"puntos_edad": 1}})
        pdoc = await db.users.find_one({"user_id": estimador}, {"_id": 0, "puntos_edad": 1})
        puntos = (pdoc or {}).get("puntos_edad", 1)

    return {
        "ok": True,
        "anio_construccion": anio if tiene_edad else None,
        "edad_efectiva": update.get("edad_efectiva"),
        "puntos": puntos,
    }


if __name__ == "__main__":
    # Self-check de midpoints (offline, sin DB).
    assert RANGO_MIDPOINT["nuevo"] == 0 and RANGO_MIDPOINT["80+"] == 88
    assert list(RANGO_MIDPOINT)[:3] == ["nuevo", "1-5", "6-10"]
    vals = list(RANGO_MIDPOINT.values())
    assert vals == sorted(vals), "midpoints deben ir en orden creciente"
    assert len(RANGO_MIDPOINT) == 15
    # Edad efectiva ponderada — ejemplo del dictamen del perito:
    # construida 1960, remodelada 2020, grado completa (p=0.95), año 2026.
    ee = _edad_efectiva(1960, 2020, "completa", 2026)   # 66 − 0.95×60 = 9.0
    assert ee == 9.0, ee
    assert _edad_efectiva(1960, 2020, "intermedia", 2026) == round(66 - 0.55*60, 1)  # 33.0
    assert _edad_efectiva(1960, 2020, "basica", 2026) == round(66 - 0.35*60, 1)      # 45.0
    assert _edad_efectiva(1960, None, "completa", 2026) is not None                   # sin año remod → edad_mejoras=0
    assert _edad_efectiva(None, 2020, "completa", 2026) is None                       # sin año constr → None
    print("edades self-check OK")
