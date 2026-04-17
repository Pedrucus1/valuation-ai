"""
scrapers/vivanuncios.py — Scraper para vivanuncios.com.mx
Usa Playwright porque el sitio (OLX) carga con JavaScript.

NOTA SOBRE SELECTORES:
Vivanuncios es parte del grupo OLX. Si los selectores fallan,
inspeccionar el HTML con DevTools y actualizar SELECTORES.
"""

import re
from typing import Optional

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock

# ─────────────────────────────────────────
# Selectores CSS
# ─────────────────────────────────────────
SELECTORES = {
    # CONFIRMADO 2026-03-16: OLX usa data-qa estables (más fiables que clases CSS)
    "tarjeta": "[data-qa='posting PROPERTY']",
    "precio": "[data-qa='POSTING_CARD_PRICE']",
    "titulo": "[data-qa='POSTING_CARD_TITLE']",
    "ubicacion": "[data-qa='POSTING_CARD_LOCATION']",
    "descripcion": "[data-qa='POSTING_CARD_DESCRIPTION']",
    "link": "a[href]",  # La tarjeta completa suele ser un <a>
    "paginacion": "a[data-qa='pagination-button-next']",
}

BASE_URL = "https://www.vivanuncios.com.mx"

# Mapeo de operación → segmento URL y código de categoría OLX
_OP_SLUG = {"venta": "venta-inmuebles", "renta": "renta-inmuebles"}
# Códigos de categoría OLX para inmuebles (confirmados en GDL 2026-03-16)
_OP_CAT = {"venta": "1097", "renta": "1098"}


class VivanunciosScraper(BaseScraper):

    nombre_portal = "VIVANUNCIOS"
    tab_sheets = config.TAB_VIVANUNCIOS
    # Playwright: correr páginas secuencialmente para evitar multi-browser
    _usar_concurrencia = False

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        Formato OLX confirmado 2026-03-16:
        https://www.vivanuncios.com.mx/s-venta-inmuebles/guadalajara/v1c1097l10567p1
        - c{cat}  = código de categoría (1097=venta, 1098=renta)
        - l{loc}  = código de localidad OLX (opcional; si se desconoce se omite)
        - p{pag}  = número de página (siempre presente, incluso en página 1)
        """
        ciudad = zona.get("slug_vivanuncios", zona["municipio"].lower().replace(" ", "-"))
        op = _OP_SLUG.get(operacion, "venta-inmuebles")
        cat = _OP_CAT.get(operacion, "1097")
        loc = zona.get("vivanuncios_loc_code", "")
        loc_seg = f"l{loc}" if loc else ""
        return f"{BASE_URL}/s-{op}/{ciudad}/v1c{cat}{loc_seg}p{pagina}"

    def obtener_total_paginas(self, html: str) -> int:
        soup = BeautifulSoup(html, "lxml")
        try:
            # Buscar el botón de siguiente para ver si hay más páginas
            # O buscar el texto de resultados totales
            resultados_tag = soup.find(string=re.compile(r"\d+\s*(anuncio|resultado|propiedad)", re.I))
            if resultados_tag:
                match = re.search(r"([\d,]+)\s*(anuncio|resultado)", resultados_tag)
                if match:
                    total = int(match.group(1).replace(",", ""))
                    return min(total // 40 + 1, config.MAX_PAGINAS_POR_ZONA)

            # Si hay botón de siguiente página, al menos hay 2
            btn_siguiente = soup.select_one(SELECTORES["paginacion"])
            if btn_siguiente:
                return min(10, config.MAX_PAGINAS_POR_ZONA)  # Estimación conservadora

        except (ValueError, AttributeError):
            pass

        tarjetas = soup.select(SELECTORES["tarjeta"])
        return 1 if tarjetas else 0

    def extraer_propiedades_pagina(
        self, html: str, zona: dict, operacion: str
    ) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        tarjetas = soup.select(SELECTORES["tarjeta"])
        propiedades = []

        for tarjeta in tarjetas:
            try:
                prop = self._extraer_tarjeta(tarjeta, zona, operacion)
                if prop and prop.get("url_original"):
                    propiedades.append(prop)
            except Exception as e:
                self.log.debug(f"Error en tarjeta Vivanuncios: {e}")

        return propiedades

    def _extraer_tarjeta(self, tarjeta, zona: dict, operacion: str) -> Optional[dict]:
        # URL
        link_tag = tarjeta.select_one(SELECTORES["link"])
        if not link_tag:
            link_tag = tarjeta.select_one("a[href]")
        if not link_tag:
            return None

        href = link_tag.get("href", "")
        url = href if href.startswith("http") else BASE_URL + href
        if not url:
            return None

        # Título
        titulo_tag = tarjeta.select_one(SELECTORES["titulo"])
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""

        # Precio
        precio_tag = tarjeta.select_one(SELECTORES["precio"])
        precio_raw = precio_tag.get_text(strip=True) if precio_tag else ""

        # Ubicación (colonia + municipio)
        ubicacion_tag = tarjeta.select_one(SELECTORES["ubicacion"])
        ubicacion_texto = ubicacion_tag.get_text(strip=True) if ubicacion_tag else ""
        colonia = ubicacion_texto.split(",")[0].strip() if "," in ubicacion_texto else ubicacion_texto

        # Atributos — el texto de la tarjeta es texto libre; se parsea con regex
        texto_completo = tarjeta.get_text(separator=" ", strip=True).lower()
        recamaras = banos = m2_const = m2_terreno = estac = None

        m = re.search(r"(\d+)\s*(?:a\s*\d+)?\s*(?:rec|recámara|recamara|dorm|hab)\b", texto_completo)
        if m:
            recamaras = m.group(1)

        m = re.search(r"(\d+)\s*(?:baño|bano|bath)\b", texto_completo)
        if m:
            banos = m.group(1)

        # m² lote/terreno va separado de m² construcción
        m = re.search(r"([\d,]+)\s*m[²2]\s*(?:lote|terr|land)", texto_completo)
        if m:
            m2_terreno = m.group(1).replace(",", "")

        m = re.search(r"([\d,]+)\s*(?:a\s*[\d,]+)?\s*m[²2](?!\s*(?:lote|terr))", texto_completo)
        if m:
            m2_const = m.group(1).replace(",", "")

        m = re.search(r"(\d+)\s*(?:estac|garage|parking)\b", texto_completo)
        if m:
            estac = m.group(1)

        # Descripción
        desc_tag = tarjeta.select_one(SELECTORES["descripcion"])
        descripcion = desc_tag.get_text(strip=True) if desc_tag else ""

        # Tipo de propiedad desde título/descripción
        tipo = self._inferir_tipo(titulo + " " + descripcion)

        return {
            "titulo": titulo,
            "precio_raw": precio_raw,
            "tipo_operacion": operacion,
            "tipo_propiedad": tipo,
            "colonia": colonia,
            "municipio": zona["municipio"],
            "estado": zona["estado"],
            "recamaras": recamaras,
            "banos": banos,
            "m2_construccion": m2_const,
            "m2_terreno": m2_terreno,
            "estacionamientos": estac,
            "descripcion": descripcion,
            "url_original": url,
        }

    def _inferir_tipo(self, texto: str) -> str:
        t = texto.lower()
        if "depa" in t or "departamento" in t or "piso" in t:
            return "departamento"
        if "terreno" in t or "lote" in t:
            return "terreno"
        if "local" in t or "comercial" in t:
            return "local"
        if "oficina" in t:
            return "oficina"
        if "bodega" in t or "nave" in t:
            return "bodega"
        return "casa"

    def ejecutar(self) -> dict:
        import time as _time
        inicio = _time.time()
        self.log.info(f"=== Iniciando {self.nombre_portal} ===")
        todas = []

        with sync_playwright() as p:
            self._pw_browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            self.log.info("Browser Playwright iniciado — reutilizando por todas las páginas")
            try:
                for zona in config.ZONAS:
                    for operacion in config.TIPOS_OPERACION:
                        props = self._scrapear_zona_operacion(zona, operacion)
                        todas.extend(props)
            finally:
                self._pw_browser.close()
                self._pw_browser = None

        duracion = _time.time() - inicio
        self.log.info(f"VIVANUNCIOS completado: {len(todas)} props en {duracion:.1f}s")
        return {
            "portal":            self.nombre_portal,
            "tab_sheets":        self.tab_sheets,
            "propiedades":       todas,
            "total":             len(todas),
            "errores":           len(self._errores),
            "lista_errores":     self._errores,
            "duracion_segundos": duracion,
        }

    # Override con Playwright
    def _fetch_html(self, url: str, referer: str = None) -> str:
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                with self._semaforo:
                    antiblock.delay_aleatorio()
                    return self._playwright_get(url)
            except PlaywrightTimeout as e:
                self.log.warning(f"Timeout Vivanuncios intento {intento}: {url}")
                antiblock.delay_aleatorio(min_seg=5, max_seg=15)
            except Exception as e:
                self.log.warning(f"Error Vivanuncios intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=5, max_seg=15)

        raise ErrorScraping(f"Vivanuncios falló {config.MAX_RETRIES} veces: {url}")

    def _playwright_get(self, url: str) -> str:
        ctx_kwargs = dict(
            user_agent=antiblock.get_user_agent(),
            viewport=antiblock.get_viewport(),
            locale="es-MX",
            timezone_id="America/Mexico_City",
            extra_http_headers={
                "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
            },
        )
        if config.PROXY_URL:
            ctx_kwargs["proxy"] = {"server": config.PROXY_URL}
        ctx = self._pw_browser.new_context(**ctx_kwargs)
        page = ctx.new_page()
        try:
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]});
                window.chrome = {runtime: {}};
            """)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_selector(SELECTORES["tarjeta"], timeout=12000)
            except PlaywrightTimeout:
                pass
            antiblock.simular_scroll_aleatorio(page)
            html = page.content()
        finally:
            page.close()
            ctx.close()

        # Detectar si la zona no existe en el portal (OLX redirige a página genérica)
        if "No encontramos resultados" in html or "no hay anuncios" in html.lower():
            self.log.info(f"Vivanuncios: zona sin resultados para {url}")

        return html
