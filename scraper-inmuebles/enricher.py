"""
enricher.py — Segunda pasada: obtiene m2_terreno y año_construccion
de las páginas de detalle de propiedades ya guardadas en Sheets.

Por qué existe:
  Las páginas de listado rara vez muestran m2_terreno ni año_construccion.
  Esta información sí aparece en la página de detalle de cada propiedad.
  El enricher busca en Sheets las propiedades activas con esos campos vacíos
  y hace una segunda descarga para completarlos.

Uso:
  python enricher.py                  — procesar todos los pendientes del portal
  python enricher.py --max 200        — limitar a 200 (útil para pruebas)
  python enricher.py --tab INMUEBLES24
  python enricher.py --tab CONSOLIDADO
  python enricher.py --dry-run        — ver cuántas hay sin enriquecer (sin fetch)

Flujo:
  1. Lee todas las filas activas del tab donde m2_terreno o año_construccion
     están vacíos.
  2. Descarga la página de detalle de cada propiedad.
  3. Extrae m2_terreno y año_construccion con patrones regex comunes.
  4. Actualiza las celdas correspondientes en Sheets.
"""

import argparse
import sys
import time
import random
import re
import zlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import json
import requests
from bs4 import BeautifulSoup
from loguru import logger
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

sys.path.insert(0, str(Path(__file__).parent))

import config
from utils.sheets import SheetsClient
from utils import antiblock
from utils.cleaner import normalizar_anio_construccion, limpiar_numero, limpiar_colonia

# Fuentes de colonia/edad que NUNCA pisa el scraper/enricher (#135b): las puso
# un humano o el crowdsource; una corrida mensual no debe borrar la corrección.
FUENTES_PROTEGIDAS = {"perito_correccion", "usuario_correccion", "perito_crowdsource"}

# ── Catálogo SEPOMEX para validar colonias del breadcrumb PINCALI (#135) ──────
# El último nodo del breadcrumb a veces es el municipio ("San Pedro"), no una
# colonia → degradaría buenas ("San Pedrito"). Solo aceptamos el nodo si valida
# como colonia real del municipio en SEPOMEX. Read-only, se carga 1 vez.
import unicodedata as _ud
from functools import lru_cache as _lru
_SEPOMEX_PATH = Path(__file__).resolve().parents[1] / "Modulo Drive IA" / "sepomex_v2.json"


def _norm_geo(s: str) -> str:
    s = _ud.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if _ud.category(c) != "Mn").strip()


@_lru(maxsize=1)
def _sepomex_colonias_por_muni() -> dict:
    """municipio_normalizado -> set(colonia_normalizada). {} si no carga."""
    idx: dict = {}
    try:
        data = json.loads(_SEPOMEX_PATH.read_text(encoding="utf-8"))
    except Exception:
        return idx
    for entradas in data.values():
        entradas = entradas if isinstance(entradas, list) else [entradas]
        for e in entradas or []:
            muni, nombre = _norm_geo(e.get("municipio")), _norm_geo(e.get("nombre"))
            if muni and nombre:
                idx.setdefault(muni, set()).add(nombre)
    return idx


def _colonia_valida_sepomex(colonia: str, municipio: str) -> bool:
    """True si `colonia` figura como colonia real del `municipio` en SEPOMEX.
    Rechaza nombres de municipio (no se listan como colonia de sí mismos)."""
    idx = _sepomex_colonias_por_muni()
    return _norm_geo(colonia) in idx.get(_norm_geo(municipio), set())

# ─────────────────────────────────────────
# Columnas en Sheets (índice 0-based)
# ─────────────────────────────────────────
COL_ID            = 0
COL_M2_CONST      = 11
COL_M2_TERRENO    = 12
COL_ANO_CONST     = 14
COL_URL           = 16
COL_NOMBRE_AGENTE = 17
COL_FECHA_PUB     = 18
COL_PORTAL        = 19
COL_ACTIVO        = 21

# Portales que requieren Playwright (JS rendering)
# CASAS_Y_TERRENOS y PINCALI exponen los datos vía requests simple (HTML/JSON
# embebido) — NO necesitan Playwright. INMUEBLES24 protegido (DataDome) → Playwright.
# VIVANUNCIOS: DataDome solo en listados, NO en páginas de detalle → requests funciona.
PORTALES_PLAYWRIGHT = {"PROPIEDADES_COM", "INMUEBLES24", "PINCALI"}

# Sin tope artificial — el enricher corre hasta agotar todos los pendientes.
# enrich_last_attempt garantiza que no se reprocese nada ya intentado (<30d).
DEFAULT_MAX = 999_999

# Pausa entre descargas de detalle (segundos) — legacy, usado como fallback
DELAY_MIN_REQUESTS  = 4    # portales con requests (Mitula, Vivanuncios, CasasYTerrenos)
DELAY_MAX_REQUESTS  = 10
DELAY_MIN_PLAYWRIGHT = 12  # portales JS (INMUEBLES24, PINCALI) — más tiempo entre páginas
DELAY_MAX_PLAYWRIGHT = 25

# Pausa larga cada N propiedades para no levantar alarmas
PAUSA_LARGA_CADA    = 20   # cada 20 propiedades
PAUSA_LARGA_MIN     = 30
PAUSA_LARGA_MAX     = 60

# ─────────────────────────────────────────
# Delay calibrado POR PORTAL según su nivel real de protección anti-bot.
# Formato: (delay_min, delay_max, pausa_cada_N, pausa_min, pausa_max)  — todo en segundos.
#   🟢 PINCALI / CASAS_Y_TERRENOS / MITULA: HTML/JSON plano vía requests, SIN antibot → rápido
#   🟡 PROPIEDADES_COM: Akamai (Node plain_fetch); el fetch ya tarda ~20s y espacia solo → delay corto
#   🟠 VIVANUNCIOS: detalle vía requests (sin DataDome en detalles) → moderado
#   🔴 INMUEBLES24: DataDome (Playwright) → conservador, no forzar
# ─────────────────────────────────────────
DELAYS_PORTAL = {
    "PINCALI":          (3.0, 6.0, 50, 15, 25),  # bajado de (1.5,3.5): tiró HTTP 503 (throttle leve)
    "CASAS_Y_TERRENOS": (2.0, 4.0, 50, 15, 25),
    "MITULA":           (2.0, 4.0, 50, 15, 25),
    "PROPIEDADES_COM":  (3.0, 6.0, 30, 25, 40),
    "VIVANUNCIOS":      (6.0, 12.0, 25, 25, 45),
    "INMUEBLES24":      (8.0, 16.0, 20, 30, 60),
}
DELAYS_DEFAULT = (4.0, 10.0, 20, 30, 60)

_RE_COLONIA_BASURA = re.compile(
    r".{46,}|jalisco|jal\.|san pedro|col\. |#\d|int\. |\d{4,}|"
    r"\b(en\s+venta|en\s+renta|casa\s+en|venta\s+de)\b",
    re.I
)

def _colonia_es_basura(col: str) -> bool:
    return bool(col and _RE_COLONIA_BASURA.search(col))


def aplicar_delay_portal(portal_real: str, idx: int, log) -> None:
    """Aplica el delay entre props + la pausa larga periódica, calibrados por portal."""
    dmin, dmax, cada, pmin, pmax = DELAYS_PORTAL.get(portal_real, DELAYS_DEFAULT)
    antiblock.delay_aleatorio(dmin, dmax)
    if idx > 1 and idx % cada == 0:
        pausa = random.uniform(pmin, pmax)
        log.info(f"  ⏸  Pausa de seguridad: {pausa:.0f}s (cada {cada} props)...")
        time.sleep(pausa)

# Archivo de checkpoint para retomar si se interrumpe
CHECKPOINT_FILE = Path(__file__).parent / "enricher_checkpoint.json"


# ─────────────────────────────────────────
# Extracción de datos en páginas de detalle
# ─────────────────────────────────────────

def extraer_datos_detalle(html: str, portal: str, url: str = None, session=None) -> dict:
    """
    Intenta extraer m2_terreno y año_construccion del HTML de detalle.
    Usa patrones regex comunes + selectores específicos por portal.

    Returns:
        dict con claves opcionales: 'm2_terreno', 'año_construccion'
    """
    soup = BeautifulSoup(html, "lxml")
    texto = soup.get_text(separator=" ", strip=True)

    resultado = {}

    # ── INMUEBLES24 / VIVANUNCIOS: misma plataforma Navent. La edad vive en el
    # JSON embebido, NO en el texto visible. feature CFT5:
    # {"label":"antigüedad","value":"30"} → 30 años | "A estrenar" → obra nueva
    if portal in ("INMUEBLES24", "VIVANUNCIOS"):
        from datetime import date
        m = re.search(r'"label"\s*:\s*"antig[üu]edad"[^}]*?"value"\s*:\s*"([^"]*)"', html, re.I)
        val = m.group(1).strip() if m else None
        if not val:  # fallback al meta-keyword "Antigüedad 30 años"
            m2 = re.search(r'antig[üu]edad\s+(\d+)\s*a[ñn]os', html, re.I)
            val = f"{m2.group(1)} años" if m2 else None
        if val:
            if re.search(r"estrenar|nuev[oa]|en\s+construcci[óo]n|preventa", val, re.I):
                # "A estrenar" / "En construcción" / "Preventa" → obra nueva = año actual
                resultado["año_construccion"] = date.today().year
            else:
                # value puede ser años de antigüedad (30) o un año directo (1998);
                # normalizar_anio_construccion distingue ambos. Sufijo "años" fuerza
                # el cálculo de antigüedad cuando es un número pequeño.
                ano = normalizar_anio_construccion(val if not val.isdigit() else f"{val} años")
                if ano:
                    resultado["año_construccion"] = ano
        # m2_construccion: Navent expone "superficie cubierta" / "m2 cubiertos" en label/value
        mc = re.search(
            r'"label"\s*:\s*"(?:superficie\s+(?:cubierta|construida?)|m[²2]\s*cubiertos?)"[^}]*?"value"\s*:\s*"([0-9][0-9,\.]*)"',
            html, re.I
        )
        if mc:
            try:
                val_mc = float(mc.group(1).replace(",", ""))
                if val_mc > 0:
                    resultado["m2_construccion"] = val_mc
            except ValueError:
                pass

        # teléfono: VIVANUNCIOS lo trae en el JSON ("whatsApp":"52 33..."),
        # INMUEBLES24 normalmente lo oculta tras API (no está en el HTML inicial)
        mt = re.search(r'"whatsApp"\s*:\s*"([0-9 +]{8,20})"', html)
        if mt:
            num = re.sub(r"\D", "", mt.group(1))
            if len(num) >= 10:
                resultado["telefono"] = num[-15:]

    # ── CasasYTerrenos: extraer directo del JSON de features ──────────────────
    # Hasta ago-2026 el sitio era Pages Router (__NEXT_DATA__ con todo el JSON).
    # Migró a App Router (RSC streaming, self.__next_f.push(...)) — ya NO existe
    # __NEXT_DATA__, pero el mismo objeto "features" (age/area/construction/
    # bathrooms/rooms/parking) sigue viajando, ahora escapado dentro del payload
    # RSC como \"features\":{...}. Fallback por regex cuando no hay __NEXT_DATA__.
    if portal == "CASAS_Y_TERRENOS":
        nd = soup.find("script", id="__NEXT_DATA__")
        prop = {}
        features = {}
        if nd:
            try:
                data = json.loads(nd.string)
                prop = data.get("props", {}).get("pageProps", {}).get("property", {})
                features = prop.get("features", {})
            except Exception:
                pass
        if not features:
            mfeat = re.search(r'\\"features\\":(\{[^{}]*\})', html)
            if mfeat:
                try:
                    features = json.loads(mfeat.group(1).replace('\\"', '"'))
                except Exception:
                    features = {}
        if features:
            try:

                # CYT: age es ANTIGÜEDAD en años. age=0 NO es "nuevo" sino el default
                # "sin dato" → producía año=2026 falso. Solo aceptar edad > 0.
                # Algunos agentes ponen el AÑO directo en age (2026 → "0 años" falso):
                # >1900 se interpreta como año de construcción.
                age = features.get("age")
                try:
                    age_n = int(float(age)) if age not in (None, "") else 0
                except (ValueError, TypeError):
                    age_n = 0
                from datetime import date
                if age_n > 1900:
                    if age_n <= date.today().year + 2:
                        resultado["año_construccion"] = age_n
                elif 0 < age_n < 150:
                    resultado["año_construccion"] = date.today().year - age_n

                area = features.get("area")
                if area and float(area) > 0:
                    resultado["m2_terreno"] = float(area)

                constr = features.get("construction")
                if constr and float(constr) > 0:
                    resultado["m2_construccion"] = float(constr)

                # recámaras / baños / estacionamientos (en el JSON, aunque la
                # página los muestre como iconos)
                rooms = features.get("rooms")
                if rooms not in (None, "") and int(rooms) > 0:
                    resultado["recamaras"] = int(rooms)
                baths = features.get("bathrooms")
                if baths not in (None, "") and float(baths) > 0:
                    resultado["banos"] = float(baths)
                parking = features.get("parking")
                if parking not in (None, "") and int(parking) >= 0:
                    resultado["estacionamientos"] = int(parking)

                contacto = prop.get("contactCard", {})
                nombre = contacto.get("name", "") or contacto.get("business_name", "")
                if nombre:
                    resultado["nombre_agente"] = nombre[:150]
                # inmobiliaria + teléfono (en background aunque esté oculto visualmente)
                if contacto.get("business_name"):
                    resultado["inmobiliaria"] = contacto["business_name"][:150]
                tel = (contacto.get("phones", {}) or {})
                tel = tel.get("mobile") or tel.get("whatsapp") or ""
                if tel and re.sub(r"\D", "", str(tel)):
                    resultado["telefono"] = re.sub(r"\D", "", str(tel))[:15]
                if contacto.get("email"):
                    resultado["email_agente"] = contacto["email"][:120]

                desc = prop.get("description", "")
                if desc:
                    resultado["descripcion"] = desc[:500]

                return resultado
            except Exception as e:
                logger.debug(f"CasasYTerrenos __NEXT_DATA__ parse error: {e}")
        # Si falla el JSON, continuar con extracción HTML normal

    # ── PropiedadesCom: extraer de __NEXT_DATA__ (size_ground, parking_num, age) ──
    if portal == "PROPIEDADES_COM":
        nd = soup.find("script", id="__NEXT_DATA__")
        if nd:
            try:
                data = json.loads(nd.string)
                results = (
                    data.get("props", {})
                    .get("pageProps", {})
                    .get("initialState", {})
                    .get("Property", {})
                    .get("property", {})
                    .get("results", {})
                )
                amenities = results.get("amenities", {})
                # colonia/municipio: propiedades.com NO los guarda en el scrape (colonia
                # vacía en sus docs) → extraerlos aquí desbloquea edadMedianaZona (#90/#91)
                inner = results.get("property", {})
                if inner.get("colony"):
                    resultado["colonia"] = str(inner["colony"]).strip()[:120]
                if inner.get("city"):
                    resultado["municipio"] = str(inner["city"]).strip()[:120]
                # Precio: real_price es numérico directo; price es string "$X MXN"
                real_price = inner.get("real_price")
                if real_price and float(real_price) > 0:
                    resultado["precio"] = float(real_price)
                size_ground = amenities.get("size_ground")
                if size_ground and float(size_ground) > 0:
                    resultado["m2_terreno"] = float(size_ground)

                # m2_construccion: vive en property.size_house, NO en amenities
                size_house = inner.get("size_house")
                if size_house:
                    try:
                        sh = float(size_house)
                        if sh > 0:
                            resultado["m2_construccion"] = sh
                    except (ValueError, TypeError):
                        pass

                parking = amenities.get("parking_num")
                if parking and int(parking) >= 0:
                    resultado["estacionamientos"] = int(parking)

                age_val = str(amenities.get("age", "")).strip().lower()
                from datetime import date
                if age_val == "nuevo":
                    # señal explícita de obra nueva → edad ~0
                    resultado["año_construccion"] = date.today().year
                elif age_val not in ("", "none", "n/d"):
                    try:
                        age_n = int(float(age_val))
                        # >1900 = el agente puso el AÑO directo, no la antigüedad
                        if age_n > 1900:
                            if age_n <= date.today().year + 2:
                                resultado["año_construccion"] = age_n
                        elif 0 < age_n < 150:
                            resultado["año_construccion"] = date.today().year - age_n
                    except ValueError:
                        pass

                # Agente: props.pageProps.results.profile
                profile = (
                    data.get("props", {})
                    .get("pageProps", {})
                    .get("results", {})
                    .get("profile", {})
                )
                nombre = (profile.get("name", "") + " " + profile.get("lastname", "")).strip()
                if nombre:
                    resultado["nombre_agente"] = nombre[:150]

                return resultado
            except Exception as e:
                logger.debug(f"PropiedadesCom __NEXT_DATA__ parse error: {e}")

    # ── m2_construccion ─────────────────────────────────────────────────────
    m2_const = None

    patrones_const = [
        r"(?:construcc[ió]n|construido|built|m[²2]\s+const\w*|superficie\s+(?:construida|habitable))[:\s]+([0-9][0-9,\.]*)\s*m[²2]?",
        r"([0-9][0-9,\.]*)\s*m[²2]\s*(?:de\s+)?(?:construcc\w*|construido|built)",
        r"(?:interior|living\s+area|floor\s+area)[:\s]+([0-9][0-9,\.]*)\s*m[²2]?",
    ]
    for pat in patrones_const:
        m = re.search(pat, texto, re.I)
        if m:
            val = m.group(1).replace(",", "")
            try:
                m2_const = float(val)
                break
            except ValueError:
                pass

    if m2_const is None:
        selectores_const = {
            "INMUEBLES24": [
                "[data-qa='surface-covered']",
                "li[data-qa*='const']",
                "span[class*='coveredSurface']",
                "li:contains('Construcción')",
                "li:contains('Cubierta')",
            ],
            "VIVANUNCIOS": [
                "li[class*='built']",
                "li:contains('m² const')",
                "li:contains('Construidos')",
            ],
            "CASAS_Y_TERRENOS": [
                "img[alt*='construction'] ~ span",
                "img[alt*='built'] ~ span",
                "img[alt*='cubierta'] ~ span",
            ],
            "PINCALI": [
                # Inglés (/en/home/ — URL canónica desde jun-2026)
                "li:contains('Construction')",
                "li:contains('Built')",
                "li:contains('Interior')",
                # Español (legacy, por si quedan URLs antiguas en DB)
                "li:contains('Construcción')",
                "li:contains('Construidos')",
                "li:contains('Construido')",
                "span:contains('Construcción')",
                "[class*='construcc']",
            ],
            "MITULA": [
                "li[class*='built']",
                "span[data-builtarea]",
            ],
        }
        for sel in selectores_const.get(portal, []):
            try:
                tag = soup.select_one(sel)
                if tag:
                    num = re.search(r"[\d,.]+", tag.get_text())
                    if num:
                        val = num.group().replace(",", "")
                        m2_const = float(val)
                        break
            except Exception:
                pass

    if m2_const is not None and m2_const > 0:
        resultado["m2_construccion"] = m2_const

    # ── m2_terreno ──────────────────────────────────────────────────────────
    # Patrones en orden de precisión:
    m2_terreno = None

    # 1. Buscar en toda la página con etiquetas explícitas
    patrones_terreno = [
        r"(?:terreno|lote|suelo|superficie\s+total|m[²2]\s+de\s+terreno)[:\s]+([0-9][0-9,\.]*)\s*m[²2]?",
        r"([0-9][0-9,\.]*)\s*m[²2]\s*(?:de\s+)?(?:terreno|lote|suelo|total)",
        r"(?:lot\s+size|land|terrain)[:\s]+([0-9][0-9,\.]*)\s*m[²2]?",
    ]
    for pat in patrones_terreno:
        m = re.search(pat, texto, re.I)
        if m:
            val = m.group(1).replace(",", "")
            try:
                m2_terreno = float(val)
                break
            except ValueError:
                pass

    # 2. Selectores específicos por portal
    if m2_terreno is None:
        selectores_terreno = {
            "INMUEBLES24": [
                "[data-qa='surface-land']",
                "li[data-qa*='terreno']",
                "span[class*='landSurface']",
                "li:contains('Terreno')",
            ],
            "VIVANUNCIOS": [
                "li[class*='land']",
                "span[data-vivanuncios*='land']",
                "li:contains('m² lote')",
            ],
            "CASAS_Y_TERRENOS": [
                "img[alt*='land'] ~ span",
                "img[alt*='surface'] ~ span",
            ],
            "PINCALI": [
                # Inglés (/en/home/ — URL canónica desde jun-2026)
                "li:contains('Land')",
                "li:contains('Lot')",
                "span[class*='lot']",
                # Español (legacy)
                "li:contains('Terreno')",
                "li:contains('Superficie de terreno')",
                "li:contains('Lote')",
                "span:contains('Terreno')",
                "[class*='terreno']",
            ],
            "PROPIEDADES_COM": [
                "[class*='terrain']",
                "[class*='terreno']",
                "[data-feature='landArea']",
            ],
            "MITULA": [
                "[data-landarea]",
                "[class*='land-area']",
                "[class*='landarea']",
                "[class*='terreno']",
            ],
        }
        for sel in selectores_terreno.get(portal, []):
            try:
                tag = soup.select_one(sel)
                if tag:
                    num = re.search(r"[\d,.]+", tag.get_text())
                    if num:
                        val = num.group().replace(",", "")
                        m2_terreno = float(val)
                        break
            except Exception:
                pass

    if m2_terreno is not None and m2_terreno > 0:
        resultado["m2_terreno"] = m2_terreno

    # ── año_construccion ────────────────────────────────────────────────────
    ano_const = None

    patrones_ano = [
        # "Año de construcción: 1999" — \w* abarca la cola "ión"; separador opcional
        r"a[ñn]o\s+de\s+construcc\w*[:\s]*(\d{4})",
        r"a[ñn]o\s+construcc\w*[:\s]*(\d{4})",
        r"(?:construido\s+en|built\s+in|year\s+built)[:\s]*(\d{4})",
        # "Antigüedad 30 años" / "Antigüedad: 1998"
        r"antig[üu]edad[:\s]*(\d+\s*a[ñn]os?|\d{4})",
        r"(\d+)\s*a[ñn]os?\s+de\s+(?:antig[üu]edad|construcc\w*|construido)",
    ]
    for pat in patrones_ano:
        m = re.search(pat, texto, re.I)
        if m:
            val = m.group(1).strip()
            ano = normalizar_anio_construccion(val)
            if ano:
                ano_const = ano
                break

    # Selectores específicos por portal
    if ano_const is None:
        selectores_ano = {
            "INMUEBLES24": [
                "[data-qa='postingKeyFeatures-feature-year_built']",
                "[data-qa='year-built']",
                "li[data-qa*='year']",
                "span[class*='yearBuilt']",
                "li:contains('Antigüedad')",
                "li:contains('Año de construcción')",
            ],
            "CASAS_Y_TERRENOS": [
                "img[alt*='year'] ~ span",
                "[class*='year-built']",
                "li:contains('Antigüedad')",
            ],
            "PINCALI": [
                # Inglés (/en/home/ — URL canónica desde jun-2026)
                "li:contains('Year Built')",
                "li:contains('Year built')",
                "li:contains('Age')",
                # Español (legacy)
                "li:contains('Antigüedad')",
                "li:contains('Año de construcción')",
                "li:contains('Año construcc')",
                "li:contains('Años de antigüedad')",
                "span:contains('Antigüedad')",
            ],
            "VIVANUNCIOS": [
                "li:contains('Antigüedad')",
                "li:contains('Años de antigüedad')",
                "span:contains('Antigüedad')",
                "li:contains('Age')",
                "li:contains('Year')",
                "[class*='age']",
                "[class*='year']",
            ],
            "PROPIEDADES_COM": [
                "[data-feature='yearBuilt']",
                "[data-feature='age']",
                "li:contains('Antigüedad')",
                "li:contains('Año de construcción')",
                "[class*='year']",
                "[class*='age']",
            ],
        }
        for sel in selectores_ano.get(portal, []):
            try:
                tag = soup.select_one(sel)
                if tag:
                    texto_tag = tag.get_text(strip=True)
                    ano = normalizar_anio_construccion(texto_tag)
                    if ano:
                        ano_const = ano
                        break
            except Exception:
                pass

    # Fallback obra nueva — SOLO buscar en descripción acotada del inmueble,
    # nunca en texto de página completa (los carruseles de similares + navegación
    # contienen "a Estrenar" de OTRAS propiedades → 21k PINCALI envenenados jun-2026).
    if ano_const is None:
        from datetime import date as _date
        _NUEVA_RE = re.compile(
            r"a\s+estrenar|obra\s+nueva|nuevo\s+desarrollo|en\s+construcci[oó]n\b"
            r"|preventa\b|brand[- ]new|new[- ]build|recién\s+construid",
            re.I
        )
        # Buscar solo en: (1) h1, (2) div/section de descripción del agente
        _desc_tag = soup.select_one('[class*="description"], [id*="description"]')
        _h1_tag = soup.find("h1")
        _desc_txt = " ".join([
            _h1_tag.get_text(" ", strip=True) if _h1_tag else "",
            _desc_tag.get_text(" ", strip=True) if _desc_tag else "",
        ])
        if _NUEVA_RE.search(_desc_txt):
            ano_const = _date.today().year

    if ano_const is not None:
        resultado["año_construccion"] = ano_const

    # ── PINCALI: colonia desde página de detalle ─────────────────────────────
    # La página /en/ tiene los nombres en el HTML-escaped JSON embebido:
    #   Neighborhood&quot;:&quot;La Estancia&quot;  (nombres propios, iguales en español)
    # El selector <li>Neighborhood</li> NO funciona — ese texto no existe como nodo.
    if portal == "PINCALI":
        pincali_col = None
        # 1. HTML-escaped JSON: Neighborhood&quot;:&quot;VALUE&quot;
        mneigh = re.search(
            r'Neighborhood(?:&quot;|"):\s*(?:&quot;|")([^&"]{3,60})(?:&quot;|")',
            html, re.I
        )
        if mneigh:
            pincali_col = mneigh.group(1).strip()
        # 2. BreadcrumbList ld+json — último nodo es la colonia/fraccionamiento
        if not pincali_col:
            crumb_m = re.search(
                r'"@type":\s*"BreadcrumbList".*?"itemListElement":\s*(\[.*?\])',
                html, re.S
            )
            if crumb_m:
                try:
                    items = json.loads(crumb_m.group(1))
                    crumb_names = [it.get("name", "") for it in items if isinstance(it, dict)]
                    if len(crumb_names) >= 5:
                        candidato = crumb_names[-1]     # colonia
                        municipio_crumb = crumb_names[-2]
                        # Guardia SEPOMEX (#135): el último nodo a veces es el
                        # municipio ("San Pedro") → degradaría "San Pedrito".
                        # Solo aceptar si valida como colonia real del municipio.
                        if (3 <= len(candidato) <= 60
                                and not re.search(
                                    r'for sale|for rent|en venta|en renta|jalisco',
                                    candidato, re.I)
                                and _colonia_valida_sepomex(candidato, municipio_crumb)):
                            pincali_col = candidato
                except Exception:
                    pass
        if pincali_col:
            # PREVENCIÓN (07-jul): rutar por el normalizador SEPOMEX/INEGI (antes se
            # brincaba → entraban fragmentos "seattle colony condominium" etc.).
            # Si el normalizador no rescata nada, conservar el crudo (no perder el coto).
            resultado["colonia"] = limpiar_colonia(pincali_col) or pincali_col

        # Estacionamiento: JSON embebido (HTML-escapado) "Parking Spaces":N — campo estructurado,
        # junto a Bedrooms/Bathrooms/Area M2 (autoritativo; la prosa del agente puede diferir).
        # El scraper de tarjeta lo deja None; aquí se rellena. Captura 0 = "no tiene" (explícito).
        if resultado.get("estacionamientos") is None:
            mpark = re.search(r'Parking Spaces(?:&quot;|")\s*:\s*(\d+)', html)
            if mpark:
                resultado["estacionamientos"] = int(mpark.group(1))

        # m²C autoritativo (bug 23-jul): la tarjeta de listado NO tiene campo
        # estructurado de área (solo el detalle) → su regex de prosa (primer
        # "N m²" del texto, sin ancla) a veces agarra un número ajeno (terraza,
        # rango "desde X m²", etc.) y guarda un m2c chico con precio de millones.
        # El detalle SÍ trae el área real en 2 lugares estructurados: JSON-LD
        # "floorSize":{"value":N} (más preciso) y el bloque escapado "Area M2":N.
        # Si el tipo no es terreno, este valor pisa el de tarjeta (autoritativo
        # > prosa, aunque m2_construccion ya viniera con algo).
        mptype = re.search(r'Property Type(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]{2,30})(?:&quot;|")', html)
        es_terreno = bool(mptype) and re.search(r'land|lot|terreno|lote', mptype.group(1), re.I)
        if not es_terreno:
            marea = re.search(r'"floorSize"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)', html)
            if not marea:
                marea = re.search(r'Area M2(?:&quot;|"):\s*([\d.]+)', html)
            if marea:
                try:
                    val = float(marea.group(1))
                    if val > 0:
                        resultado["m2_construccion"] = val
                except ValueError:
                    pass

        # Título en español (bug 23-jul, queja usuario): la página de listado que se
        # escanea es SIEMPRE inglesa (la ruta /propiedades/ española da 403 — no hay
        # forma de listar en español) → el "titulo" de tarjeta queda en inglés aunque
        # la regla del proyecto sea "PINCALI solo español". El detalle SÍ trae Property
        # Type / Operation Type estructurados (mismo bloque de Neighborhood/Area M2) ->
        # sintetizar un título limpio en español a partir de eso, pisando el de tarjeta.
        _TIPO_ES = {"house": "Casa", "apartment": "Departamento", "land": "Terreno",
                    "office": "Oficina", "commercial": "Local comercial"}
        _OP_ES = {"sale": "venta", "rent": "renta"}
        if mptype:
            tipo_es = _TIPO_ES.get(mptype.group(1).strip().lower(), mptype.group(1).strip())
            mop = re.search(r'Operation Type(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]{2,20})(?:&quot;|")', html)
            op_es = _OP_ES.get(mop.group(1).strip().lower(), "venta") if mop else "venta"
            col_tit = resultado.get("colonia")
            resultado["titulo"] = f"{tipo_es} en {op_es} en {col_tit}" if col_tit else f"{tipo_es} en {op_es}"

        # Año de construcción PINCALI — 07-Jul-2026:
        # PRIMARIO: "Year Built: YYYY" en feature-icon de /en/home/ (ya descargado, sin HTTP extra).
        #   Verificado: campo canónico cuando el agente lo publica; extrae directamente del HTML crudo
        #   (más robusto que soup.get_text() que puede tener ruido de encoding).
        # FALLBACK: página española /inmueble/ con "Año de construcción: YEAR|A estrenar".
        #   /inmueble/ puede devolver 422 intermitentemente (confirmado 06-Jul) → no depender de él.
        # Anclar SIEMPRE al label (la página lista "A estrenar" de OTRAS propiedades = envenenamiento).
        if resultado.get("año_construccion") is None and url and "/en/home/" in url:
            from datetime import date as _date_pincali
            # 1. Buscar "Year Built: YYYY" directamente en el HTML /en/home/ ya descargado
            myr_en = re.search(r'Year\s+Built\s*:\s*(\d{4})', html, re.I)
            # 1b. Categórico: "Year Built: New/Preventa/A estrenar" = obra nueva → año actual (edad 0).
            #     Anclado al label "Year Built:" para evitar "A estrenar" suelto de otras propiedades.
            myr_new = re.search(r'Year\s+Built\s*:\s*(?:New|Nuevo|Pre-?venta|A\s+estrenar)', html, re.I)
            if myr_en:
                resultado["año_construccion"] = int(myr_en.group(1))
            elif myr_new:
                resultado["año_construccion"] = _date_pincali.today().year
            # ponytail: fallback a /inmueble/ (ES) eliminado 24-ago — AWS WAF bloquea esa ruta
            # desde 17-ago (siempre 202 vacío), costaba un request completo por prop sin payoff.
            # Si PINCALI reabre /inmueble/, reintroducir el fallback con fetch_html_requests.

    # ── nombre_agente ────────────────────────────────────────────────────────
    nombre_agente = None

    selectores_agente = {
        "INMUEBLES24": [
            "[data-qa='publisher-name']",
            "[class*='publisher-name']",
            "[class*='agent-name']",
            "[class*='publisherName']",
        ],
        "PINCALI": [
            "[class*='agent-name']",
            "[class*='agentName']",
            "[class*='contact-name']",
            "div[class*='agent'] span",
        ],
        "VIVANUNCIOS": [
            "[class*='seller-name']",
            "[class*='sellerName']",
            "[class*='user-name']",
            "span[class*='userName']",
        ],
        "CASAS_Y_TERRENOS": [
            "[class*='agent-name']",
            "[class*='agentName']",
            "div[class*='contact'] span",
        ],
        "MITULA": [
            "[class*='agency-name']",
            "[class*='agent']",
        ],
    }
    for sel in selectores_agente.get(portal, []):
        try:
            tag = soup.select_one(sel)
            if tag:
                txt = tag.get_text(strip=True)
                if txt and len(txt) > 2:
                    nombre_agente = txt[:150]
                    break
        except Exception:
            pass

    # Fallback regex en texto plano
    if not nombre_agente:
        for pat in [
            r"(?:agente|asesor|vendedor|contacto|anunciante)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})",
            r"(?:agent|seller|contact)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        ]:
            m = re.search(pat, texto, re.I)
            if m:
                nombre_agente = m.group(1).strip()
                break

    if nombre_agente:
        resultado["nombre_agente"] = nombre_agente

    # ── fecha_publicacion ────────────────────────────────────────────────────
    fecha_pub = None

    selectores_fecha = {
        "INMUEBLES24": [
            "[data-qa='POSTING_DATE']",
            "span[class*='date']",
            "time[datetime]",
        ],
        "PINCALI": [
            "time[datetime]",
            "[class*='date']",
            "[class*='posted']",
        ],
        "VIVANUNCIOS": [
            "time[datetime]",
            "span[class*='date']",
            "[class*='posted-date']",
        ],
        "CASAS_Y_TERRENOS": [
            "time[datetime]",
            "[class*='date']",
            "[class*='createdAt']",
        ],
        "MITULA": [
            "time[datetime]",
            "[class*='date']",
        ],
    }
    for sel in selectores_fecha.get(portal, []):
        try:
            tag = soup.select_one(sel)
            if tag:
                # Preferir atributo datetime (ISO) sobre texto
                dt = tag.get("datetime", "")
                if dt:
                    fecha_pub = dt[:10]  # Solo YYYY-MM-DD
                    break
                txt = tag.get_text(strip=True)
                if txt and len(txt) > 3:
                    fecha_pub = txt[:50]
                    break
        except Exception:
            pass

    # Fallback regex — fechas en formato común
    if not fecha_pub:
        for pat in [
            r"publicad[oa]\s+(?:el\s+)?(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+)?\s*\d{4})",
            r"(?:posted|published|fecha)[:\s]+(\d{4}-\d{2}-\d{2})",
            r"(?:hace\s+\d+\s+(?:día|semana|mes|hora)s?)",
        ]:
            m = re.search(pat, texto, re.I)
            if m:
                fecha_pub = m.group(0) if "hace" in pat else m.group(1)
                fecha_pub = fecha_pub.strip()[:50]
                break

    if fecha_pub:
        resultado["fecha_publicacion"] = fecha_pub

    return resultado


# ─────────────────────────────────────────
# Descarga de páginas de detalle
# ─────────────────────────────────────────

def fetch_html_requests(url: str, session: requests.Session) -> Optional[str]:
    """Descarga el HTML de una URL usando requests con anti-bloqueo.
    Guarda el último status code en session.last_status para que el caller
    distinga 404 (muerto, marcar inactivo) de 503/timeout (transitorio, reintentar)."""
    try:
        session.headers.update(antiblock.get_headers(referer=url))
        resp = session.get(url, timeout=25)
        session.last_status = resp.status_code
        if resp.status_code == 200:
            return resp.text
        logger.warning(f"HTTP {resp.status_code} en {url}")
        return None
    except Exception as e:
        session.last_status = None
        logger.warning(f"Error requests en {url}: {e}")
        return None


def fetch_html_playwright(url: str, portal: str) -> Optional[str]:
    """Descarga el HTML de una URL usando Playwright con stealth máximo."""
    extra_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--lang=es-MX",
    ]
    if portal == "PROPIEDADES_COM":
        extra_args.append("--disable-http2")

    ua = antiblock.get_user_agent()
    viewport = antiblock.get_viewport()

    try:
        with sync_playwright() as p:
            _pw_proxy = {"server": config.PROXY_URL} if config.PROXY_URL else None
            browser = p.chromium.launch(headless=True, args=extra_args,
                                        **( {"proxy": _pw_proxy} if _pw_proxy else {}))
            ctx = browser.new_context(
                user_agent=ua,
                viewport=viewport,
                locale="es-MX",
                timezone_id="America/Mexico_City",
                extra_http_headers={
                    "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Upgrade-Insecure-Requests": "1",
                    "Cache-Control": "max-age=0",
                },
            )
            page = ctx.new_page()

            # Ocultar huellas de automatización
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['es-MX', 'es', 'en-US']});
                window.chrome = {runtime: {}};
                Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});
            """)

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                # Espera humana variable antes de hacer scroll
                page.wait_for_timeout(random.randint(2000, 5000))
                antiblock.simular_scroll_aleatorio(page)
                # Espera adicional a que cargue el contenido
                page.wait_for_timeout(random.randint(1000, 3000))
            except PlaywrightTimeout:
                pass  # Tomar lo que haya
            except Exception as e:
                logger.warning(f"Playwright error en {url}: {e}")
                browser.close()
                return None

            titulo = page.title()
            html = page.content()
            browser.close()

        if any(k in titulo.lower() for k in ("cloudflare", "just a moment", "access denied", "403", "captcha")):
            logger.warning(f"Bloqueado por bot-protection: {url}")
            return None

        return html if len(html) > 2000 else None

    except Exception as e:
        logger.warning(f"Playwright falló completamente en {url}: {e}")
        return None


_UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I
)


def _pincali_url_espanol(url: str) -> str:
    """
    Convierte una URL de detalle PINCALI en inglés a su versión en español.

    Inglés:  https://www.pincali.com/en/property/house-for-sale-...-{uuid}
    Español: https://www.pincali.com/inmueble/propiedad-{uuid}?locale_changed=true

    PINCALI identifica la propiedad por UUID; el slug es decorativo.
    La página española tiene etiquetas en español (Construcción, Terreno, Antigüedad)
    que coinciden con los patrones regex del enricher.
    Si ya es /inmueble/ se devuelve sin cambios.
    """
    if "/inmueble/" in url:
        return url
    m = _UUID_RE.search(url)
    if not m:
        return url
    uuid = m.group(0)
    return f"https://www.pincali.com/inmueble/propiedad-{uuid}?locale_changed=true"


def inferir_portal_por_url(url: str) -> Optional[str]:
    """Detecta el portal a partir del dominio de la URL."""
    if "propiedades.com" in url:
        return "PROPIEDADES_COM"
    if "inmuebles24.com" in url:
        return "INMUEBLES24"
    if "pincali.com" in url:
        return "PINCALI"
    if "vivanuncios.com" in url:
        return "VIVANUNCIOS"
    if "casasyterrenos.com" in url:
        return "CASAS_Y_TERRENOS"
    if "mitula" in url or "lamudi" in url:
        return "MITULA"
    return None


def fetch_html_cdp(url: str) -> Optional[str]:
    """Fetch via Chrome CDP (Node.js cdp_fetch.js). Para propiedades.com que bloquea Playwright."""
    import subprocess
    from pathlib import Path
    cdp_js = Path(__file__).parent / "scrapers" / "cdp_fetch.js"
    # Puerto del Chrome AISLADO del scraper (9333 por defecto), no el personal (9222).
    # Lanzar ese Chrome con lanzar_chrome_scraper.bat. (#105)
    cdp_port = str(getattr(config, "PROPIEDADES_CDP_PORT", 9333))
    try:
        result = subprocess.run(
            ["node", str(cdp_js), url, cdp_port],
            capture_output=True, text=True, encoding="utf-8", timeout=50,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),  # sin ventana de consola en Windows
        )
        html = result.stdout
        return html if len(html) > 5000 else None
    except Exception as e:
        logger.warning(f"CDP fetch error para {url}: {e}")
        return None


def fetch_html_node(url: str) -> Optional[str]:
    """Fetch HTTP simple via Node (plain_fetch.js) — pasa Akamai donde requests recibe tarpit TLS.
    Sin Chrome/CDP. El HTML va por archivo temporal (evita assertion de libuv en Windows)."""
    import subprocess, tempfile, os
    from pathlib import Path
    js = Path(__file__).parent / "scrapers" / "plain_fetch.js"
    fd, tmp = tempfile.mkstemp(suffix=".html", prefix="enr_pcom_")
    os.close(fd)
    try:
        r = subprocess.run(["node", str(js), url, tmp],
                           capture_output=True, text=True, encoding="utf-8", timeout=60,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))  # sin ventana en Windows
        # El HTML se escribe (sync) ANTES del exit de Node; un assertion de libuv al salir no
        # invalida el archivo → leerlo primero y validar por tamaño, no por returncode.
        try:
            with open(tmp, "r", encoding="utf-8") as f:
                html = f.read()
        except OSError:
            html = ""
        if len(html) > 5000:
            return html
        if r.returncode != 0:
            logger.warning(f"plain_fetch error para {url}: {r.stderr.strip()[:150]}")
        return None
    except Exception as e:
        logger.warning(f"plain_fetch excepción para {url}: {e}")
        return None
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass


def fetch_detalle(url: str, portal: str, session: requests.Session) -> Optional[str]:
    """Selecciona el método de descarga adecuado según el portal."""
    portal_real = portal if portal in PORTALES_PLAYWRIGHT or portal == "CASAS_Y_TERRENOS" else inferir_portal_por_url(url) or portal

    # PINCALI: NO convertir a español — /inmueble/ ya NO existe (404, confirmado 17-ago-2026).
    # Desde 17-ago: AWS WAF challenge en TODAS las páginas de detalle → requests plano
    # devuelve 202 vacío siempre. Requiere Playwright (ver PORTALES_PLAYWRIGHT).
    fetch_url = url

    # PROPIEDADES_COM: HTTP simple via Node (Akamai deja pasar el GET; el __NEXT_DATA__ trae `age`)
    if portal_real == "PROPIEDADES_COM":
        return fetch_html_node(fetch_url)

    if portal_real in PORTALES_PLAYWRIGHT:
        return fetch_html_playwright(fetch_url, portal_real)
    return fetch_html_requests(fetch_url, session)


# ─────────────────────────────────────────
# Lógica principal
# ─────────────────────────────────────────

def obtener_filas_sin_enriquecer(
    ws,
    max_filas: int,
) -> list[dict]:
    """
    Lee el worksheet y retorna las filas activas donde m2_terreno
    o año_construccion estén vacíos.

    Returns:
        lista de dicts con: {num_fila, id_unico, url, portal,
                              falta_m2_terreno, falta_ano_const}
    """
    todos = ws.get_all_values()
    if not todos or len(todos) < 2:
        return []

    pendientes = []
    for i, fila in enumerate(todos[1:], start=2):  # fila 1 = encabezados
        # Extender fila si tiene menos columnas de las esperadas
        while len(fila) <= COL_ACTIVO:
            fila.append("")

        activo = fila[COL_ACTIVO].strip().upper()
        if activo == "FALSE":
            continue

        url = fila[COL_URL].strip() if len(fila) > COL_URL else ""
        if not url:
            continue

        m2_const      = fila[COL_M2_CONST].strip()      if len(fila) > COL_M2_CONST      else ""
        m2_terr       = fila[COL_M2_TERRENO].strip()   if len(fila) > COL_M2_TERRENO    else ""
        ano           = fila[COL_ANO_CONST].strip()     if len(fila) > COL_ANO_CONST     else ""
        nombre_agente = fila[COL_NOMBRE_AGENTE].strip() if len(fila) > COL_NOMBRE_AGENTE else ""
        fecha_pub     = fila[COL_FECHA_PUB].strip()     if len(fila) > COL_FECHA_PUB     else ""

        falta_m2_const      = not m2_const
        falta_m2_terreno    = not m2_terr
        falta_ano           = not ano
        falta_nombre_agente = not nombre_agente
        falta_fecha_pub     = not fecha_pub

        if falta_m2_const or falta_m2_terreno or falta_ano or falta_nombre_agente or falta_fecha_pub:
            pendientes.append({
                "num_fila":           i,
                "id_unico":           fila[COL_ID],
                "url":                url,
                "portal":             fila[COL_PORTAL].strip() if len(fila) > COL_PORTAL else "",
                "falta_m2_const":     falta_m2_const,
                "falta_m2_terreno":   falta_m2_terreno,
                "falta_ano_const":    falta_ano,
                "falta_nombre_agente":falta_nombre_agente,
                "falta_fecha_pub":    falta_fecha_pub,
            })

        if len(pendientes) >= max_filas:
            break

    return pendientes


# ─────────────────────────────────────────
# Checkpoint — retomar si se interrumpe
# ─────────────────────────────────────────

def cargar_checkpoint() -> set:
    """Carga URLs ya procesadas del checkpoint local."""
    if CHECKPOINT_FILE.exists():
        try:
            data = json.loads(CHECKPOINT_FILE.read_text(encoding="utf-8"))
            return set(data.get("urls_procesadas", []))
        except Exception:
            pass
    return set()


def guardar_checkpoint(urls_procesadas: set):
    """Persiste las URLs procesadas en disco."""
    try:
        CHECKPOINT_FILE.write_text(
            json.dumps({"urls_procesadas": list(urls_procesadas)}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning(f"No se pudo guardar checkpoint: {e}")


def limpiar_checkpoint():
    """Borra el checkpoint (llamar al terminar un ciclo completo)."""
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()


# ─────────────────────────────────────────
# Lógica principal (mejorada)
# ─────────────────────────────────────────

def enriquecer_tab(sheets: SheetsClient, tab_name: str, max_filas: int, dry_run: bool,
                   urls_procesadas: set):
    """Enriquece una pestaña concreta de Google Sheets."""
    log = logger.bind(portal=tab_name)
    log.info(f"=== Enriqueciendo pestaña '{tab_name}' (max={max_filas}) ===")

    ws = sheets._get_ws(tab_name)
    pendientes = obtener_filas_sin_enriquecer(ws, max_filas * 3)  # leer más para filtrar ya procesadas

    # Filtrar URLs ya procesadas en sesiones anteriores (checkpoint)
    pendientes = [p for p in pendientes if p["url"] not in urls_procesadas][:max_filas]

    log.info(f"Propiedades pendientes: {len(pendientes)}")

    if dry_run or not pendientes:
        if dry_run:
            log.info("(dry-run: no se descargan páginas)")
        return {"tab": tab_name, "pendientes": len(pendientes), "enriquecidas": 0, "errores": 0}

    session = requests.Session()
    if config.PROXY_URL:
        session.proxies.update({"http": config.PROXY_URL, "https": config.PROXY_URL})
    enriquecidas = 0
    errores = 0

    for idx, prop in enumerate(pendientes, 1):
        url = prop["url"]
        portal = prop["portal"]
        num_fila = prop["num_fila"]
        # Inferir portal real si el valor guardado está corrupto
        portal_real = portal if portal in PORTALES_PLAYWRIGHT or portal == "CASAS_Y_TERRENOS" else inferir_portal_por_url(url) or portal
        log.info(f"[{idx}/{len(pendientes)}] {portal_real} fila {num_fila} — {url[:80]}")

        # Delay + pausa larga calibrados por portal (según protección anti-bot)
        aplicar_delay_portal(portal_real, idx, log)

        # Descarga
        html = fetch_detalle(url, portal, session)

        # Marcar como procesada aunque falle (para no reintentar en próxima corrida)
        urls_procesadas.add(url)
        guardar_checkpoint(urls_procesadas)

        if not html:
            log.warning(f"  Sin HTML para fila {num_fila}")
            errores += 1
            continue

        # Extracción
        datos = extraer_datos_detalle(html, portal, url, session)

        if not datos:
            log.debug(f"  Nada nuevo extraído para fila {num_fila}")
            continue

        # Actualizar Sheets — acumular en batch y flush cada 10
        actualizados = []
        try:
            updates = []  # (fila, col_1based, valor)

            if prop["falta_m2_const"] and "m2_construccion" in datos:
                updates.append((num_fila, COL_M2_CONST + 1, datos["m2_construccion"]))
                actualizados.append(f"m2_const={datos['m2_construccion']}")

            if prop["falta_m2_terreno"] and "m2_terreno" in datos:
                updates.append((num_fila, COL_M2_TERRENO + 1, datos["m2_terreno"]))
                actualizados.append(f"m2_terreno={datos['m2_terreno']}")

            if prop["falta_ano_const"] and "año_construccion" in datos:
                updates.append((num_fila, COL_ANO_CONST + 1, datos["año_construccion"]))
                actualizados.append(f"año_const={datos['año_construccion']}")

            if prop["falta_nombre_agente"] and "nombre_agente" in datos:
                updates.append((num_fila, COL_NOMBRE_AGENTE + 1, datos["nombre_agente"]))
                actualizados.append(f"agente={datos['nombre_agente'][:30]}")

            if prop["falta_fecha_pub"] and "fecha_publicacion" in datos:
                updates.append((num_fila, COL_FECHA_PUB + 1, datos["fecha_publicacion"]))
                actualizados.append(f"fecha_pub={datos['fecha_publicacion']}")

            for fila, col, val in updates:
                ws.update_cell(fila, col, val)

            if actualizados:
                log.info(f"  ✓ {', '.join(actualizados)}")
                enriquecidas += 1
            else:
                log.debug(f"  Datos encontrados pero ya estaban completos")

        except Exception as e:
            log.error(f"  Error al actualizar fila {num_fila}: {e}")
            errores += 1

    log.info(
        f"=== '{tab_name}' completado: "
        f"{enriquecidas} enriquecidas | {errores} errores ==="
    )
    return {"tab": tab_name, "pendientes": len(pendientes), "enriquecidas": enriquecidas, "errores": errores}


# ─────────────────────────────────────────
# Modo MongoDB nativo (Mongo es la base oficial; Sheets en pausa)
# ─────────────────────────────────────────

def _get_mongo_col():
    """Retorna la colección mercado_props. Misma conexión que scheduler.py."""
    import os
    from dotenv import load_dotenv
    from pymongo import MongoClient
    load_dotenv()
    client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"),
                         serverSelectionTimeoutMS=30000,
                         # CAUSA RAÍZ del cuelgue del enricher (30-jun): sin socketTimeoutMS, un
                         # read/write a Atlas que se estanca (blip de red) cuelga el proceso PARA
                         # SIEMPRE. serverSelectionTimeoutMS NO cubre sockets ya establecidos.
                         socketTimeoutMS=60000, connectTimeoutMS=30000,
                         retryReads=True, retryWrites=True)
    return client[os.getenv("DB_NAME", "propvalu")]["mercado_props"]


def obtener_props_mongo(col, portal: str, max_filas: int, urls_procesadas: set,
                        shard: tuple[int, int] | None = None, min_id=None) -> list[dict]:
    """
    Lee de mercado_props las props del portal a las que les falta anio_construccion
    (canónico, sin ñ) y/o m2. Retorna dicts {id_unico, url, portal, falta_*}.

    min_id: si se da (ObjectId), acota a docs insertados desde ese punto en adelante —
    para enriquecer solo un lote on-demand recién insertado sin barrer todo el backlog
    del portal (evita scraping masivo fuera de scope).
    """
    # Seleccionar docs a los que les falta edad O colonia (colonia vacía bloquea
    # edadMedianaZona; propiedades.com la deja vacía en el scrape → backfill).
    falta = {"$or": [{"anio_construccion": {"$exists": False}},
                     {"anio_construccion": None},
                     {"colonia": {"$in": [None, ""]}},
                     {"m2_construccion": {"$in": [None, ""]}},
                     # PCOM: precio=0 significa que el scraper no lo capturó — re-intentar
                     {"precio": {"$in": [0, 0.0]}},
                     # PINCALI: scraper guardó título como colonia — re-extraer siempre
                     {"portal_origen": "PINCALI"},
                     # PCOM/VIVANUNCIOS: colonia con basura (dirección larga) — re-extraer
                     {"portal_origen": {"$in": ["PROPIEDADES_COM", "VIVANUNCIOS"]},
                      "colonia": {"$regex": r".{46,}|jalisco|jal\.|san pedro|col\. |#\d|int\. |\d{4}",
                                  "$options": "i"}}]}
    # No re-fetchear props ya intentadas recientemente: si la página se descargó y
    # no traía el dato, volver a bajarla cada corrida es puro desperdicio. La marca
    # enrich_last_attempt se escribe en cada intento (parallel-safe, a diferencia
    # del checkpoint local que se pisa entre procesos). Reintento tras 30 días
    # (el anuncio pudo actualizarse).
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    # Venta Y renta (ambas se enriquecen). Activos + NO duplicados-secundarios
    # (ya depurados por fusionar_duplicados.py) → no re-procesar duplicados.
    # `duplicado` = dedup estricto cross-portal (12-jul): no enriquecer el duplicado,
    # su canónico (es_canonico) sí se enriquece. SINCRONIZADO con monitor_local.py.
    q = {"portal_origen": portal, "activo": {"$ne": False},
         "es_duplicado_secundario": {"$ne": True},
         "duplicado": {"$ne": True},
         "enrich_last_attempt": {"$not": {"$gte": cutoff}}, **falta}
    if min_id is not None:
        q["_id"] = {"$gte": min_id}
    proj = {"id_unico": 1, "url_original": 1, "portal_origen": 1,
            "anio_construccion": 1, "m2_terreno": 1, "m2_construccion": 1,
            "nombre_agente": 1, "fecha_publicacion": 1, "estacionamientos": 1,
            "recamaras": 1, "banos": 1, "telefono": 1, "inmobiliaria": 1,
            "colonia": 1, "municipio": 1, "colonia_fuente": 1, "edad_fuente": 1}
    pendientes = []
    cursor_limit = max_filas * 3 * (shard[1] if shard else 1)
    for d in col.find(q, proj).limit(cursor_limit):
        url = (d.get("url_original") or "").strip()
        if not url:
            continue
        # Partición determinista por URL: cada proceso --shard n/m toma solo
        # las URLs cuyo crc32 % m == n → varios procesos del mismo portal
        # en paralelo sin descargar la misma página dos veces.
        if shard is not None and zlib.crc32(url.encode("utf-8")) % shard[1] != shard[0]:
            continue
        # Sticky: no re-extraer/pisar lo corregido por perito/usuario/crowdsource
        # (#135b). colonia_fuente protege colonia; edad_fuente protege el año.
        prot_col = d.get("colonia_fuente") in FUENTES_PROTEGIDAS
        prot_edad = d.get("edad_fuente") in FUENTES_PROTEGIDAS
        pendientes.append({
            "id_unico":            d.get("id_unico"),
            "url":                 url,
            "portal":              d.get("portal_origen") or portal,
            "falta_m2_const":      not d.get("m2_construccion"),
            "falta_m2_terreno":    not d.get("m2_terreno"),
            "falta_ano_const":     not prot_edad and d.get("anio_construccion") in (None, "", 0),
            "falta_nombre_agente": not d.get("nombre_agente"),
            "falta_fecha_pub":     not d.get("fecha_publicacion"),
            "falta_recamaras":     not d.get("recamaras"),
            "falta_banos":         not d.get("banos"),
            "falta_estac":         not d.get("estacionamientos"),
            "falta_telefono":      not d.get("telefono"),
            "falta_inmobiliaria":  not d.get("inmobiliaria"),
            # PINCALI/PCOM/VIVANUNCIOS: forzar re-extracción si colonia es basura
            "falta_colonia":       not prot_col and (not d.get("colonia") or portal == "PINCALI"
                                   or (portal in ("PROPIEDADES_COM", "VIVANUNCIOS")
                                       and _colonia_es_basura(d.get("colonia", "")))),
            "falta_municipio":     not d.get("municipio"),
            "falta_precio":        not d.get("precio") or d.get("precio") == 0,
        })
        if len(pendientes) >= max_filas:
            break
    return pendientes


def enriquecer_mongo(col, portal: str, max_filas: int, dry_run: bool,
                     urls_procesadas: set, shard: tuple[int, int] | None = None, min_id=None):
    """Enriquece un portal leyendo y escribiendo DIRECTO en MongoDB (sin Sheets)."""
    log = logger.bind(portal=portal)
    log.info(f"=== [MONGO] Enriqueciendo '{portal}' (max={max_filas}, shard={shard}) ===")

    pendientes = obtener_props_mongo(col, portal, max_filas, urls_procesadas, shard=shard, min_id=min_id)
    log.info(f"Props pendientes de edad: {len(pendientes)}")

    if dry_run or not pendientes:
        if dry_run:
            log.info("(dry-run: no se descargan páginas)")
        return {"tab": portal, "pendientes": len(pendientes), "enriquecidas": 0, "errores": 0}

    session = requests.Session()
    if config.PROXY_URL:
        session.proxies.update({"http": config.PROXY_URL, "https": config.PROXY_URL})
    enriquecidas = errores = 0

    for idx, prop in enumerate(pendientes, 1):
        url = prop["url"]
        portal_real = portal if portal in PORTALES_PLAYWRIGHT or portal == "CASAS_Y_TERRENOS" else inferir_portal_por_url(url) or portal
        log.info(f"[{idx}/{len(pendientes)}] {portal_real} — {url[:80]}")

        # Delay + pausa larga calibrados por portal (según protección anti-bot)
        aplicar_delay_portal(portal_real, idx, log)

        session.last_status = None
        html = fetch_detalle(url, portal, session)
        urls_procesadas.add(url)
        guardar_checkpoint(urls_procesadas)
        col.update_one({"id_unico": prop["id_unico"]},
                       {"$set": {"enrich_last_attempt": datetime.now().isoformat()}})

        if not html:
            # 404 = anuncio eliminado del portal → marcar inactivo para no
            # reintentarlo en cada corrida (el filtro activo:{$ne:False} lo excluye).
            # 503/timeout/otros = transitorio → dejar para reintento futuro.
            if getattr(session, "last_status", None) == 404:
                col.update_one({"id_unico": prop["id_unico"]},
                               {"$set": {"activo": False, "enrich_dead": "404",
                                         "enrich_dead_at": datetime.now().isoformat()}})
                log.warning(f"  404 → marcado inactivo (no se reintentará)")
            else:
                log.warning(f"  Sin HTML")
            errores += 1
            continue

        datos = extraer_datos_detalle(html, portal, url, session)
        if not datos:
            continue

        # Construir $set solo con lo que falta. Mapear año_construccion (ñ) →
        # anio_construccion (canónico ascii que lee el motor).
        set_doc = {}
        actualizados = []
        if prop["falta_ano_const"] and "año_construccion" in datos:
            # Red de seguridad global: nunca escribir un año absurdo (0, 21, 3000…)
            # venga del handler que venga.
            _anio = datos["año_construccion"]
            if isinstance(_anio, (int, float)) and 1800 <= _anio <= datetime.now().year + 2:
                set_doc["anio_construccion"] = int(_anio)
                actualizados.append(f"anio={int(_anio)}")
            else:
                log.warning(f"  año descartado por inválido: {_anio!r}")
        # PINCALI: "m2_construccion" en datos viene del campo estructurado
        # autoritativo (floorSize/Area M2) → pisa lo que haya puesto la tarjeta
        # (regex de prosa sin ancla, ver comentario en extraer_datos_detalle).
        # Otros portales: solo rellenar si faltaba (comportamiento previo).
        if "m2_construccion" in datos and (prop["falta_m2_const"] or prop["portal"] == "PINCALI"):
            set_doc["m2_construccion"] = datos["m2_construccion"]
            actualizados.append(f"m2c={datos['m2_construccion']}")
        # PINCALI: título sintetizado en español (bug 23-jul) pisa siempre el de
        # tarjeta (inglés, la única página de listado que existe para escanear).
        if "titulo" in datos and prop["portal"] == "PINCALI":
            set_doc["titulo"] = datos["titulo"]
            actualizados.append("titulo=ES")
        if prop["falta_m2_terreno"] and "m2_terreno" in datos:
            set_doc["m2_terreno"] = datos["m2_terreno"]
            actualizados.append(f"m2t={datos['m2_terreno']}")
        if prop["falta_nombre_agente"] and "nombre_agente" in datos:
            set_doc["nombre_agente"] = datos["nombre_agente"]
            actualizados.append("agente")
        if prop["falta_fecha_pub"] and "fecha_publicacion" in datos:
            set_doc["fecha_publicacion"] = datos["fecha_publicacion"]
            actualizados.append("fecha_pub")
        if prop.get("falta_estac") and "estacionamientos" in datos:
            set_doc["estacionamientos"] = datos["estacionamientos"]
            actualizados.append(f"estac={datos['estacionamientos']}")
        if prop.get("falta_recamaras") and "recamaras" in datos:
            set_doc["recamaras"] = datos["recamaras"]
            actualizados.append(f"rec={datos['recamaras']}")
        if prop.get("falta_banos") and "banos" in datos:
            set_doc["banos"] = datos["banos"]
            actualizados.append(f"ban={datos['banos']}")
        if prop.get("falta_telefono") and "telefono" in datos:
            set_doc["telefono"] = datos["telefono"]
            actualizados.append("tel")
        if prop.get("falta_inmobiliaria") and "inmobiliaria" in datos:
            set_doc["inmobiliaria"] = datos["inmobiliaria"]
            actualizados.append("inmob")
        if prop.get("falta_colonia") and datos.get("colonia"):
            set_doc["colonia"] = datos["colonia"]
            actualizados.append(f"col={datos['colonia']}")
        if prop.get("falta_municipio") and datos.get("municipio"):
            set_doc["municipio"] = datos["municipio"]
            actualizados.append("muni")
        if prop.get("falta_precio") and datos.get("precio") and float(datos["precio"]) > 0:
            set_doc["precio"] = float(datos["precio"])
            set_doc["precio_m2"] = ""  # se recalcula en el motor; limpiar el 0 anterior
            actualizados.append(f"precio={datos['precio']}")
        if "email_agente" in datos:
            set_doc.setdefault("email_agente", datos["email_agente"])

        if set_doc:
            try:
                col.update_one({"id_unico": prop["id_unico"]},
                               {"$set": {**set_doc, "enriched_at": datetime.now().isoformat()}})
                log.info(f"  ✓ {', '.join(actualizados)}")
                enriquecidas += 1
            except Exception as e:
                log.error(f"  Error Mongo update: {e}")
                errores += 1

    log.info(f"=== [MONGO] '{portal}' completado: {enriquecidas} enriquecidas | {errores} errores ===")
    return {"tab": portal, "pendientes": len(pendientes), "enriquecidas": enriquecidas, "errores": errores}


def main():
    parser = argparse.ArgumentParser(description="Enriquecer propiedades con datos de páginas de detalle")
    parser.add_argument("--tab", default=None,
                        help=f"Pestaña a enriquecer. Por defecto: todas excepto LOG. "
                             f"Opciones: {', '.join(config.TODAS_LAS_TABS)}")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX,
                        help=f"Máximo de propiedades a procesar por pestaña (default: {DEFAULT_MAX})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Solo contar cuántas propiedades faltan, sin descargar nada")
    parser.add_argument("--mongo", action="store_true",
                        help="Modo oficial: lee y escribe DIRECTO en MongoDB (sin Sheets)")
    parser.add_argument("--shard", default=None,
                        help="Partición N/M para correr varios procesos del mismo portal "
                             "sin pisarse (ej. --shard 0/3, 1/3, 2/3). Solo modo --mongo.")
    args = parser.parse_args()

    shard = None
    if args.shard:
        n, m = (int(x) for x in args.shard.split("/"))
        assert 0 <= n < m, f"--shard inválido: {args.shard}"
        shard = (n, m)

    inicio = datetime.now()
    logger.info(f"Enricher iniciado — {inicio.strftime('%Y-%m-%d %H:%M')}")
    logger.info(f"Max por tab: {args.max} | Dry-run: {args.dry_run} | Mongo: {args.mongo}")

    # Portales reales (excluye tabs internas). En modo mongo no se toca Sheets.
    PORTALES_REALES = ["PROPIEDADES_COM", "CASAS_Y_TERRENOS", "INMUEBLES24",
                       "PINCALI", "VIVANUNCIOS", "MITULA"]
    if args.tab:
        tabs = [args.tab]
    elif args.mongo:
        tabs = PORTALES_REALES
    else:
        tabs = [t for t in config.TODAS_LAS_TABS if t not in (config.TAB_LOG, config.TAB_CONSOLIDADO)]

    # Cargar checkpoint de sesión anterior (si existe)
    urls_procesadas = cargar_checkpoint()
    if urls_procesadas:
        logger.info(f"Checkpoint cargado: {len(urls_procesadas)} URLs ya procesadas en sesiones anteriores")

    resultados = []
    if args.mongo:
        col = _get_mongo_col()
        for portal in tabs:
            try:
                r = enriquecer_mongo(col, portal, args.max, args.dry_run, urls_procesadas,
                                     shard=shard)
                resultados.append(r)
            except Exception as e:
                logger.error(f"Error procesando portal '{portal}': {e}")
    else:
        sheets = SheetsClient()
        for tab in tabs:
            try:
                r = enriquecer_tab(sheets, tab, args.max, args.dry_run, urls_procesadas)
                resultados.append(r)
            except Exception as e:
                logger.error(f"Error procesando tab '{tab}': {e}")

    # Limpiar checkpoint solo si terminó sin errores graves
    if not args.dry_run and all(r.get("errores", 0) == 0 for r in resultados):
        limpiar_checkpoint()
        logger.info("Checkpoint limpiado — ciclo completado exitosamente")

    # Resumen final
    duracion = (datetime.now() - inicio).total_seconds()
    total_enriquecidas = sum(r["enriquecidas"] for r in resultados)
    total_pendientes = sum(r["pendientes"] for r in resultados)

    logger.info("=" * 50)
    logger.info(f"RESUMEN ENRICHER")
    logger.info(f"  Tabs procesadas : {len(resultados)}")
    logger.info(f"  Total pendientes: {total_pendientes}")
    logger.info(f"  Enriquecidas    : {total_enriquecidas}")
    logger.info(f"  Duración        : {duracion:.0f}s")
    logger.info("=" * 50)

    if not args.dry_run and not args.mongo:
        # Log a Sheets (solo en modo Sheets; en modo mongo Sheets está en pausa)
        try:
            sheets.append_fila_log([
                datetime.now().isoformat(),
                "ENRICHER",
                "TODAS",
                0,
                total_pendientes,
                total_enriquecidas,
                0,
                sum(r.get("errores", 0) for r in resultados),
                round(duracion),
                "OK" if total_enriquecidas > 0 else "SIN_DATOS",
            ])
        except Exception as e:
            logger.warning(f"No se pudo escribir log en Sheets: {e}")


if __name__ == "__main__":
    main()
