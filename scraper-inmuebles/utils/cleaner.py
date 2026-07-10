"""
utils/cleaner.py — Limpieza y normalización de datos extraídos.
Convierte strings crudos del HTML a tipos limpios y consistentes.
"""

import re
import hashlib
import json
import os
from datetime import datetime
from typing import Optional

# Catálogo de colonias conocidas (SEPOMEX/INEGI) — cargado lazy al primer uso
_COLONIAS_CATALOGO: list[str] | None = None

def _cargar_catalogo() -> list[str]:
    global _COLONIAS_CATALOGO
    if _COLONIAS_CATALOGO is not None:
        return _COLONIAS_CATALOGO
    ruta = os.path.join(os.path.dirname(__file__), "colonias_catalogo.json")
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            _COLONIAS_CATALOGO = json.load(f)
    else:
        _COLONIAS_CATALOGO = []
    return _COLONIAS_CATALOGO


# ─────────────────────────────────────────
# ID único
# ─────────────────────────────────────────

def generar_id_unico(url: str) -> str:
    """
    Genera un hash MD5 de la URL para identificar cada propiedad.
    Evita duplicados entre ejecuciones.
    """
    url_limpia = url.strip().lower().split("?")[0]  # Ignorar query params
    return hashlib.md5(url_limpia.encode()).hexdigest()


# ─────────────────────────────────────────
# Precio
# ─────────────────────────────────────────

def limpiar_precio(texto: Optional[str]) -> tuple[Optional[float], str]:
    """
    Extrae el valor numérico y la moneda de un string de precio.

    Returns:
        (precio_float, moneda)  donde moneda es "MXN" o "USD"
    """
    if not texto:
        return None, "MXN"

    texto = texto.strip()
    moneda = "USD" if "$" in texto and ("usd" in texto.lower() or "dls" in texto.lower()) else "MXN"

    # Detectar dólares por contexto
    if "USD" in texto.upper() or "DLS" in texto.upper() or "DÓLARES" in texto.upper():
        moneda = "USD"

    # Eliminar todo excepto dígitos y punto decimal
    numeros = re.sub(r"[^\d.]", "", texto.replace(",", ""))

    # Manejar múltiples puntos (ej: "1.500.000" → tomar el último como decimal o ignorar)
    partes = numeros.split(".")
    if len(partes) > 2:
        # Es separador de miles, no decimal
        numeros = "".join(partes)
    elif len(partes) == 2 and len(partes[1]) > 2:
        # Punto como separador de miles (ej: "1.500")
        numeros = "".join(partes)

    try:
        return float(numeros), moneda
    except (ValueError, TypeError):
        return None, moneda


# ─────────────────────────────────────────
# Tipo de operación
# ─────────────────────────────────────────

def normalizar_operacion(texto: Optional[str]) -> str:
    """Normaliza a 'venta' o 'renta'."""
    if not texto:
        return "venta"
    texto = texto.lower().strip()
    if any(p in texto for p in ["rent", "arrendam", "alquiler"]):
        return "renta"
    return "venta"


# ─────────────────────────────────────────
# Tipo de propiedad
# ─────────────────────────────────────────

_TIPOS_PROPIEDAD = {
    "casa": ["casa", "residencia", "chalet", "villa", "cabaña"],
    "departamento": ["departamento", "depa", "apartamento", "piso", "flat", "loft", "penthouse", "ph"],
    "terreno": ["terreno", "lote", "predio", "solar", "suelo"],
    "local": ["local", "comercial", "negocio", "tienda", "plaza"],
    "oficina": ["oficina", "corporativo", "despacho"],
    "bodega": ["bodega", "nave", "almacén", "almacen", "industrial"],
}


def normalizar_tipo_propiedad(texto: Optional[str]) -> str:
    """Normaliza al tipo de propiedad estándar."""
    if not texto:
        return "casa"
    texto = texto.lower().strip()
    for tipo, palabras_clave in _TIPOS_PROPIEDAD.items():
        if any(p in texto for p in palabras_clave):
            return tipo
    return "casa"  # Valor por defecto


def tipo_por_slug(url: Optional[str]) -> Optional[str]:
    """Deriva el tipo del SLUG de la URL (PINCALI). El slug empieza por el tipo
    en español ('departamento-en-renta-...', 'casa-en-venta-...') y es MUCHO más
    confiable que la página de categoría (la de 'commercial' devuelve mezclado →
    todo salía 'local'). Devuelve None si el slug no lo dice.

    Orden: primero el token INICIAL del slug (lo más confiable); si el tipo no va
    al inicio ('hermosa-casa-en-venta'), se busca por presencia con 'local' al
    final (era el cubo sobre-asignado) para no robarle casas/deptos.
    """
    if not url:
        return None
    slug = str(url).lower().split("/inmueble/")[-1].split("/en/home/")[-1]
    head = slug[:45]
    inicio = [
        ("casa",          ("casa", "residencia", "chalet", "villa")),
        ("departamento",  ("departamento", "depa", "penthouse", "loft", "estudio")),
        ("terreno",       ("terreno", "lote", "predio")),
        ("oficina",       ("oficina", "consultorio")),
        ("local",         ("local", "bodega", "nave")),
    ]
    for tipo, kws in inicio:
        if head.startswith(kws):
            return tipo
    for tipo, kws in inicio:                 # tipo no va al inicio del slug
        if any(k in head for k in kws):
            return tipo
    return None


# ─────────────────────────────────────────
# Valores numéricos (recámaras, baños, m2)
# ─────────────────────────────────────────

def limpiar_numero(texto: Optional[str]) -> Optional[float]:
    """Extrae el primer número de un texto. Retorna None si no hay."""
    if not texto:
        return None
    texto = str(texto).strip()
    match = re.search(r"[\d]+(?:[.,]\d+)?", texto.replace(",", "."))
    if match:
        try:
            return float(match.group().replace(",", "."))
        except ValueError:
            return None
    return None


def limpiar_entero(texto: Optional[str]) -> Optional[int]:
    """Extrae el primer entero de un texto."""
    valor = limpiar_numero(texto)
    return int(valor) if valor is not None else None


# ─────────────────────────────────────────
# Texto
# ─────────────────────────────────────────

def limpiar_texto(texto: Optional[str], max_chars: int = 300) -> str:
    """Limpia espacios y trunca a max_chars."""
    if not texto:
        return ""
    # Normalizar espacios y saltos de línea
    limpio = " ".join(texto.split())
    return limpio[:max_chars]


def limpiar_titulo(texto: Optional[str]) -> str:
    """Limpia el título de la propiedad."""
    return limpiar_texto(texto, max_chars=200)


# ─────────────────────────────────────────
# Ubicación
# ─────────────────────────────────────────

def _extraer_colonia_de_basura(texto: str) -> str:
    """
    Intenta rescatar el nombre de colonia de un string largo/sucio.
    Estrategia 1: patrón explícito "Col. NOMBRE" / "Colonia NOMBRE".
    Estrategia 2: substring match contra catálogo SEPOMEX (más largo gana).
    """
    # Patrón explícito — el más confiable
    m = re.search(r"\b(?:col\.|colonia)\s+([A-Za-záéíóúÁÉÍÓÚüÜñÑ][A-Za-záéíóúÁÉÍÓÚüÜñÑ\s\d\-\.]{2,44}?)(?=\s*[,\.\d#]|$)", texto, re.I)
    if m:
        candidato = m.group(1).strip().rstrip(".,")
        if 3 <= len(candidato) <= 45:
            return candidato

    # Catálogo INEGI — buscar la colonia conocida más larga que aparezca en el texto
    texto_lower = texto.lower()
    mejor = ""
    for col in _cargar_catalogo():
        if len(col) > len(mejor) and col in texto_lower:
            mejor = col
    if mejor:
        # Capitalizar correctamente (el catálogo está en minúsculas)
        return mejor.title()

    return ""


def limpiar_colonia(texto: Optional[str]) -> str:
    """Limpia el nombre de la colonia. Si el texto es largo/sucio, intenta rescatar la colonia real."""
    if not texto:
        return ""
    # Strip prefijos solo con punto o espacio explícito — col. / colonia / fracc. / fraccionamiento
    texto = re.sub(r"^(col\.|colonia|fracc\.|fraccionamiento)\s*", "", texto.strip(), flags=re.IGNORECASE)
    texto = limpiar_texto(texto, max_chars=200)
    # Decoradores en inglés que el scraper PINCALI arrastra tras el nombre del coto
    # (fragmentación tipo "Seattle Colony Condominium"). Se quitan conservando el nombre
    # base ("Seattle Colony Condominium" → "Seattle"), no invalidan el registro.
    texto = re.sub(
        r"\s+(colony|condominium|residential|neighbou?rhood|duplex|"
        r"upper\s+floor|lower\s+floor|apartments?)\b.*$",
        "", texto, flags=re.IGNORECASE,
    ).strip()

    invalido = (
        len(texto) > 45
        or re.search(r"\b(en\s+venta|en\s+renta|for\s+sale|for\s+rent|oportunidad|inversion)\b", texto, re.I)
        or re.search(r"^(venta|renta|sale|casa\s+en)\b", texto, re.I)
        or re.search(r"\b(bodega|terreno|departamento|local|warehouse|apartment|house\s+for)\b", texto, re.I)
        or re.search(r"\b(downtown|center|centre)\b", texto, re.I)
        or re.search(r"\b(av\.|calle\s|blvd\.|carretera\s|km\s)\b", texto, re.I)
        or re.search(r"\d{4,}", texto)
        or re.search(r"\b(jalisco|jal\.|mexico|méxico)\b", texto, re.I)
    )
    if invalido:
        # Intentar rescatar la colonia real del texto sucio
        rescatada = _extraer_colonia_de_basura(texto)
        return rescatada
    return texto


# ─────────────────────────────────────────
# Función principal de normalización
# ─────────────────────────────────────────

def normalizar_anio_construccion(valor: Optional[str]) -> Optional[int]:
    """
    Normaliza el año de construcción.
    Acepta:
      - Año directo: "2005", "1998"
      - Antigüedad en años: "20 años" → año_actual - 20
      - None si no hay dato
    """
    if not valor:
        return None
    texto = str(valor).strip()

    # Año directo (4 dígitos entre 1900 y año actual+1)
    m = re.search(r"\b(19[0-9]{2}|20[0-9]{2})\b", texto)
    if m:
        anio = int(m.group(1))
        if 1900 <= anio <= datetime.now().year + 1:
            return anio

    # Antigüedad en años → calcular año aproximado
    m = re.search(r"(\d+)\s*(?:año|year|yr)", texto, re.I)
    if m:
        antiguedad = int(m.group(1))
        if 0 <= antiguedad <= 120:
            return datetime.now().year - antiguedad

    return None


def normalizar_propiedad(raw: dict) -> dict:
    """
    Toma un dict con datos crudos del scraper y retorna
    un dict limpio con todos los campos estándar.

    Args:
        raw: dict con campos sin procesar del HTML

    Returns:
        dict con todos los campos de config.HEADERS_PROPIEDADES
    """
    url = raw.get("url_original", "")
    precio_raw = raw.get("precio_raw", "")
    precio, moneda = limpiar_precio(precio_raw)

    tipo_prop = normalizar_tipo_propiedad(raw.get("tipo_propiedad"))
    m2c = limpiar_numero(raw.get("m2_construccion"))
    m2t = limpiar_numero(raw.get("m2_terreno"))

    # Fix terreno: scrapers meten el área en m2_construccion cuando no saben si es T o C.
    # Si el tipo es terreno/lote/predio y m2_terreno está vacío pero m2_construccion tiene valor
    # → mover a m2_terreno (mantener m2_construccion si también tiene valor propio).
    _TIPOS_TERRENO = {"terreno", "lote", "predio", "solar"}
    if tipo_prop in _TIPOS_TERRENO and m2t is None and m2c is not None:
        m2t = m2c
        m2c = None

    return {
        "id_unico": generar_id_unico(url),
        "titulo": limpiar_titulo(raw.get("titulo")),
        "precio": precio,
        "moneda": moneda,
        "tipo_operacion": normalizar_operacion(raw.get("tipo_operacion")),
        "tipo_propiedad": tipo_prop,
        "colonia": limpiar_colonia(raw.get("colonia")),
        "municipio": limpiar_texto(raw.get("municipio"), 100),
        "estado": limpiar_texto(raw.get("estado"), 100),
        "recamaras": limpiar_entero(raw.get("recamaras")),
        "banos": limpiar_numero(raw.get("banos")),
        "m2_construccion": m2c,
        "m2_terreno": m2t,
        "estacionamientos": limpiar_entero(raw.get("estacionamientos")),
        "año_construccion": normalizar_anio_construccion(raw.get("año_construccion")),
        "descripcion": limpiar_texto(raw.get("descripcion"), 300),
        "url_original": url.strip(),
        "nombre_agente": limpiar_texto(raw.get("nombre_agente"), 150),
        "fecha_publicacion": raw.get("fecha_publicacion", ""),
        "portal_origen": raw.get("portal_origen", ""),
        "fecha_scraping": raw.get("fecha_scraping", datetime.now().isoformat()),
        "activo": raw.get("activo", True),
        "calle_numero": limpiar_texto(raw.get("calle_numero"), 150),
    }


def propiedad_a_fila(prop: dict) -> list:
    """Convierte un dict normalizado en lista para Google Sheets (orden de HEADERS_PROPIEDADES)."""
    return [
        prop["id_unico"],
        prop["titulo"],
        prop["precio"] if prop["precio"] is not None else "",
        prop["moneda"],
        prop["tipo_operacion"],
        prop["tipo_propiedad"],
        prop["colonia"],
        prop["municipio"],
        prop["estado"],
        prop["recamaras"] if prop["recamaras"] is not None else "",
        prop["banos"] if prop["banos"] is not None else "",
        prop["m2_construccion"] if prop["m2_construccion"] is not None else "",
        prop["m2_terreno"] if prop["m2_terreno"] is not None else "",
        prop["estacionamientos"] if prop["estacionamientos"] is not None else "",
        prop["año_construccion"] if prop.get("año_construccion") is not None else "",
        prop["descripcion"],
        prop["url_original"],
        prop.get("nombre_agente", ""),
        prop.get("fecha_publicacion", ""),
        prop["portal_origen"],
        prop["fecha_scraping"],
        "TRUE" if prop["activo"] else "FALSE",
        prop.get("calle_numero", ""),
    ]
