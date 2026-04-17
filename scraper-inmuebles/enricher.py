"""
enricher.py — Segunda pasada: obtiene m2_terreno y año_construccion
de las páginas de detalle de propiedades ya guardadas en Sheets.

Por qué existe:
  Las páginas de listado rara vez muestran m2_terreno ni año_construccion.
  Esta información sí aparece en la página de detalle de cada propiedad.
  El enricher busca en Sheets las propiedades activas con esos campos vacíos
  y hace una segunda descarga para completarlos.

Uso:
  python enricher.py                  — procesar max 50 propiedades
  python enricher.py --max 200        — procesar hasta 200
  python enricher.py --tab INMUEBLES24 --max 100
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
from datetime import datetime
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
from utils.cleaner import normalizar_anio_construccion, limpiar_numero

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
# CASAS_Y_TERRENOS usa __NEXT_DATA__ JSON vía requests — NO necesita Playwright
PORTALES_PLAYWRIGHT = {"PROPIEDADES_COM", "INMUEBLES24", "PINCALI", "VIVANUNCIOS"}

# Cuántas propiedades procesar por defecto
DEFAULT_MAX = 50

# Pausa entre descargas de detalle (segundos)
DELAY_MIN_REQUESTS  = 4    # portales con requests (Mitula, Vivanuncios, CasasYTerrenos)
DELAY_MAX_REQUESTS  = 10
DELAY_MIN_PLAYWRIGHT = 12  # portales JS (INMUEBLES24, PINCALI) — más tiempo entre páginas
DELAY_MAX_PLAYWRIGHT = 25

# Pausa larga cada N propiedades para no levantar alarmas
PAUSA_LARGA_CADA    = 20   # cada 20 propiedades
PAUSA_LARGA_MIN     = 30
PAUSA_LARGA_MAX     = 60

# Archivo de checkpoint para retomar si se interrumpe
CHECKPOINT_FILE = Path(__file__).parent / "enricher_checkpoint.json"


# ─────────────────────────────────────────
# Extracción de datos en páginas de detalle
# ─────────────────────────────────────────

def extraer_datos_detalle(html: str, portal: str) -> dict:
    """
    Intenta extraer m2_terreno y año_construccion del HTML de detalle.
    Usa patrones regex comunes + selectores específicos por portal.

    Returns:
        dict con claves opcionales: 'm2_terreno', 'año_construccion'
    """
    soup = BeautifulSoup(html, "lxml")
    texto = soup.get_text(separator=" ", strip=True)

    resultado = {}

    # ── CasasYTerrenos: extraer directo de __NEXT_DATA__ JSON ─────────────────
    if portal == "CASAS_Y_TERRENOS":
        nd = soup.find("script", id="__NEXT_DATA__")
        if nd:
            try:
                data = json.loads(nd.string)
                prop = data.get("props", {}).get("pageProps", {}).get("property", {})
                features = prop.get("features", {})

                age = features.get("age")
                if age is not None and age != "" and int(age) >= 0:
                    from datetime import date
                    ano = date.today().year - int(age)
                    resultado["año_construccion"] = ano

                area = features.get("area")
                if area and float(area) > 0:
                    resultado["m2_terreno"] = float(area)

                constr = features.get("construction")
                if constr and float(constr) > 0:
                    resultado["m2_construccion"] = float(constr)

                contacto = prop.get("contactCard", {})
                nombre = contacto.get("name", "") or contacto.get("business_name", "")
                if nombre:
                    resultado["nombre_agente"] = nombre[:150]

                desc = prop.get("description", "")
                if desc:
                    resultado["descripcion"] = desc[:500]

                return resultado
            except Exception as e:
                logger.debug(f"CasasYTerrenos __NEXT_DATA__ parse error: {e}")
        # Si falla el JSON, continuar con extracción HTML normal

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
                "li:contains('Construction')",
                "li:contains('Built')",
                "li:contains('Construcc')",
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
                "li:contains('Land')",
                "li:contains('Terreno')",
                "span[class*='lot']",
            ],
            "PROPIEDADES_COM": [
                "[class*='terrain']",
                "[class*='terreno']",
                "[data-feature='landArea']",
            ],
            "MITULA": [
                "li[class*='feature']:contains('m²')",
                "span[data-floorarea]",
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
        r"(?:año\s+de\s+construcc|construido\s+en|año\s+construcc|built\s+in|year\s+built)[:\s]+(\d{4}|\d+\s*años?)",
        r"(?:antigüedad|antiguedad|age)[:\s]+(\d+\s*años?|\d{4})",
        r"(\d{4})\s*(?:año\s+de\s+construcc|construcc\w*)",
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
                "[data-qa='year-built']",
                "li[data-qa*='year']",
                "span[class*='yearBuilt']",
            ],
            "CASAS_Y_TERRENOS": [
                "img[alt*='year'] ~ span",
                "[class*='year-built']",
            ],
            "PINCALI": [
                "li:contains('Year')",
                "li:contains('Built')",
                "li:contains('Construcc')",
            ],
            "PROPIEDADES_COM": [
                "[data-feature='yearBuilt']",
                "[class*='year']",
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

    if ano_const is not None:
        resultado["año_construccion"] = ano_const

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
    """Descarga el HTML de una URL usando requests con anti-bloqueo."""
    try:
        session.headers.update(antiblock.get_headers(referer=url))
        resp = session.get(url, timeout=25)
        if resp.status_code == 200:
            return resp.text
        logger.warning(f"HTTP {resp.status_code} en {url}")
        return None
    except Exception as e:
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
            browser = p.chromium.launch(headless=True, args=extra_args)
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


def inferir_portal_por_url(url: str) -> Optional[str]:
    """Detecta el portal a partir del dominio de la URL."""
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


def fetch_detalle(url: str, portal: str, session: requests.Session) -> Optional[str]:
    """Selecciona el método de descarga adecuado según el portal."""
    # Si el portal guardado en Sheets está corrupto, inferirlo por URL
    portal_real = portal if portal in PORTALES_PLAYWRIGHT or portal == "CASAS_Y_TERRENOS" else inferir_portal_por_url(url) or portal
    if portal_real in PORTALES_PLAYWRIGHT:
        return fetch_html_playwright(url, portal_real)
    return fetch_html_requests(url, session)


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
    enriquecidas = 0
    errores = 0

    for idx, prop in enumerate(pendientes, 1):
        url = prop["url"]
        portal = prop["portal"]
        num_fila = prop["num_fila"]
        # Inferir portal real si el valor guardado está corrupto
        portal_real = portal if portal in PORTALES_PLAYWRIGHT or portal == "CASAS_Y_TERRENOS" else inferir_portal_por_url(url) or portal
        usa_playwright = portal_real in PORTALES_PLAYWRIGHT

        log.info(f"[{idx}/{len(pendientes)}] {portal_real} fila {num_fila} — {url[:80]}")

        # Delay según tipo de portal
        if usa_playwright:
            antiblock.delay_aleatorio(DELAY_MIN_PLAYWRIGHT, DELAY_MAX_PLAYWRIGHT)
        else:
            antiblock.delay_aleatorio(DELAY_MIN_REQUESTS, DELAY_MAX_REQUESTS)

        # Pausa larga cada N propiedades
        if idx > 1 and idx % PAUSA_LARGA_CADA == 0:
            pausa = random.uniform(PAUSA_LARGA_MIN, PAUSA_LARGA_MAX)
            log.info(f"  ⏸  Pausa de seguridad: {pausa:.0f}s (cada {PAUSA_LARGA_CADA} props)...")
            time.sleep(pausa)

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
        datos = extraer_datos_detalle(html, portal)

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


def main():
    parser = argparse.ArgumentParser(description="Enriquecer propiedades con datos de páginas de detalle")
    parser.add_argument("--tab", default=None,
                        help=f"Pestaña a enriquecer. Por defecto: todas excepto LOG. "
                             f"Opciones: {', '.join(config.TODAS_LAS_TABS)}")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX,
                        help=f"Máximo de propiedades a procesar por pestaña (default: {DEFAULT_MAX})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Solo contar cuántas propiedades faltan, sin descargar nada")
    args = parser.parse_args()

    inicio = datetime.now()
    logger.info(f"Enricher iniciado — {inicio.strftime('%Y-%m-%d %H:%M')}")
    logger.info(f"Max por tab: {args.max} | Dry-run: {args.dry_run}")

    sheets = SheetsClient()

    # Determinar qué tabs procesar
    if args.tab:
        if args.tab not in config.TODAS_LAS_TABS:
            logger.error(f"Tab '{args.tab}' no reconocida. Opciones: {config.TODAS_LAS_TABS}")
            sys.exit(1)
        tabs = [args.tab]
    else:
        # Todas excepto LOG y CONSOLIDADO (el consolidado se enriquece via sus portales originales)
        tabs = [t for t in config.TODAS_LAS_TABS if t not in (config.TAB_LOG, config.TAB_CONSOLIDADO)]

    # Cargar checkpoint de sesión anterior (si existe)
    urls_procesadas = cargar_checkpoint()
    if urls_procesadas:
        logger.info(f"Checkpoint cargado: {len(urls_procesadas)} URLs ya procesadas en sesiones anteriores")

    resultados = []
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

    if not args.dry_run:
        # Log a Sheets
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
