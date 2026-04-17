"""
scrapers/propiedades_com.py — Scraper para propiedades.com
Usa Playwright (sitio Next.js/React con renderizado del lado del cliente).

NOTAS DE ACCESO (confirmado 2026-03-16):
- URL correcta: https://propiedades.com/{slug}/{tipo}-{operacion}
  Ej: https://propiedades.com/guadalajara/casas-venta
      https://propiedades.com/guadalajara/casas-renta
      https://propiedades.com/zapopan/departamentos-venta
- SIN el prefijo www ni la estructura /jalisco/{slug}/propiedades/en-venta
- El sitio usa Akamai Bot Manager — puede bloquear IPs directas.
  Requiere proxy residencial para acceso confiable (PROXY_URL en .env).
- El www.propiedades.com redirige a propiedades.com (sin www).
- ERR_HTTP2_PROTOCOL_ERROR: usar --disable-http2 en Playwright.

TIPOS DE PROPIEDAD en URL:
    casas, departamentos, terrenos, locales, oficinas, bodegas

SELECTORES (verificar con DevTools si el sitio actualiza su frontend):
- Site es Next.js App Router — las tarjetas cargan via hydration.
- Selector de tarjeta probable: article, div[class*='PropertyCard'], a[href*='/propiedad']
"""

import re
from typing import Optional

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock

# Tipos de propiedad que scrapear (genera URLs separadas por tipo)
TIPOS_PROP_URL = ["casas", "departamentos", "terrenos"]

SELECTORES = {
    # PENDIENTE DE VERIFICACIÓN — actualizar con DevTools cuando sea accesible
    # La estructura es Next.js; los cards son probablemente article o div con link
    "tarjeta": (
        "article[class*='property'], "
        "div[class*='PropertyCard'], "
        "div[class*='property-card'], "
        "li[class*='property'], "
        "a[href*='/propiedad/']"
    ),
    "titulo": "h2, h3, [class*='title'], [class*='Title']",
    "precio": "[class*='price'], [class*='Price'], [class*='monto']",
    "colonia": "[class*='location'], [class*='address'], [class*='colonia'], address",
    "recamaras": "[class*='bedroom'], [class*='rec'], [data-feature='bedrooms']",
    "banos": "[class*='bath'], [data-feature='bathrooms']",
    "m2": "[class*='area'], [class*='m2'], [data-feature='area']",
    "estac": "[class*='parking'], [class*='garage'], [data-feature='parking']",
    "descripcion": "[class*='description'], [class*='desc'], p",
    "paginacion": "a[aria-label*='iguiente'], button[class*='next'], a[class*='next']",
    "total_resultados": "h1, [class*='results-count'], [class*='total']",
}

BASE_URL = "https://propiedades.com"


class PropiedadesComScraper(BaseScraper):

    nombre_portal = "PROPIEDADES_COM"
    tab_sheets = config.TAB_PROPIEDADES_COM
    # Playwright: evitar browsers simultáneos con ThreadPoolExecutor
    _usar_concurrencia = False

    def ejecutar(self) -> dict:
        """Override: salta el portal si no hay proxy configurado (Akamai bloquea IPs directas)."""
        if not config.PROXY_URL:
            self.log.warning(
                "PROPIEDADES_COM saltado — PROXY_URL no configurado. "
                "Akamai Bot Manager bloquea IPs directas. "
                "Configura PROXY_URL en .env para activar este portal."
            )
            return {
                "portal": self.nombre_portal,
                "tab_sheets": self.tab_sheets,
                "propiedades": [],
                "total": 0,
                "errores": 0,
                "lista_errores": [],
                "duracion_segundos": 0,
            }
        return super().ejecutar()

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        URL formato: https://propiedades.com/{slug}/casas-venta
        Paginación:  https://propiedades.com/{slug}/casas-venta?page=2

        Esta implementación itera solo sobre 'casas' como tipo base.
        Para otros tipos (departamentos, terrenos) el orquestador puede
        llamar con operacion='venta/departamentos' etc. (ver _scrapear_zona_operacion).
        """
        slug = zona.get("slug_propiedades", zona["municipio"].lower().replace(" ", "-"))
        op = "venta" if operacion == "venta" else "renta"
        base = f"{BASE_URL}/{slug}/casas-{op}"
        if pagina > 1:
            return f"{base}?page={pagina}"
        return base

    def obtener_urls_por_tipo(self, zona: dict, operacion: str) -> list[str]:
        """
        Retorna una URL por cada tipo de propiedad para la zona+operación dada.
        Útil para scraping exhaustivo.
        """
        slug = zona.get("slug_propiedades", zona["municipio"].lower().replace(" ", "-"))
        op = "venta" if operacion == "venta" else "renta"
        return [f"{BASE_URL}/{slug}/{tipo}-{op}" for tipo in TIPOS_PROP_URL]

    def obtener_total_paginas(self, html: str) -> int:
        soup = BeautifulSoup(html, "lxml")

        try:
            total_tag = soup.select_one(SELECTORES["total_resultados"])
            if total_tag:
                match = re.search(r"([\d,]+)", total_tag.get_text())
                if match:
                    total = int(match.group(1).replace(",", ""))
                    if total > 0:
                        # propiedades.com muestra ~20 por página
                        return min(total // 20 + 1, config.MAX_PAGINAS_POR_ZONA)

            # Buscar botón de siguiente
            btn = soup.select_one(SELECTORES["paginacion"])
            if btn:
                return min(20, config.MAX_PAGINAS_POR_ZONA)

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
                self.log.debug(f"Error en tarjeta propiedades.com: {e}")

        return propiedades

    def _extraer_tarjeta(self, tarjeta, zona: dict, operacion: str) -> Optional[dict]:
        # URL — la tarjeta puede ser el <a> o contener un <a>
        href = tarjeta.get("href", "")
        if not href:
            link = tarjeta.select_one("a[href]")
            href = link.get("href", "") if link else ""
        if not href:
            return None
        url = href if href.startswith("http") else BASE_URL + href

        # Título
        titulo_tag = tarjeta.select_one(SELECTORES["titulo"])
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""

        # Precio
        precio_tag = tarjeta.select_one(SELECTORES["precio"])
        precio_raw = precio_tag.get_text(strip=True) if precio_tag else ""

        # Colonia
        col_tag = tarjeta.select_one(SELECTORES["colonia"])
        colonia = col_tag.get_text(strip=True) if col_tag else ""

        # Atributos — intentar tags específicos, si no, regex sobre texto completo
        texto_completo = tarjeta.get_text(separator=" ", strip=True).lower()

        recamaras = banos = m2_const = m2_terreno = estac = None

        # Intentar selectores específicos primero
        for sel, campo in [
            (SELECTORES["recamaras"], "rec"),
            (SELECTORES["banos"], "ban"),
            (SELECTORES["m2"], "m2"),
            (SELECTORES["estac"], "est"),
        ]:
            tag = tarjeta.select_one(sel)
            if tag:
                num = re.search(r"[\d.]+", tag.get_text())
                if num:
                    val = num.group()
                    if campo == "rec":
                        recamaras = val
                    elif campo == "ban":
                        banos = val
                    elif campo == "m2":
                        m2_const = val
                    elif campo == "est":
                        estac = val

        # Fallback: regex sobre texto completo
        if not recamaras:
            m = re.search(r"(\d+)\s*(?:rec[aá]mara|dorm|hab|cuarto|bedroom)", texto_completo, re.I)
            if m:
                recamaras = m.group(1)
        if not banos:
            m = re.search(r"(\d+)\s*(?:baño|bano|bathroom|bath)", texto_completo, re.I)
            if m:
                banos = m.group(1)
        if not estac:
            m = re.search(r"(\d+)\s*(?:estac|garage|parking)", texto_completo, re.I)
            if m:
                estac = m.group(1)
        if not m2_const:
            m = re.search(r"([\d,]+)\s*m[²2]\s*(?:const|construc|build)", texto_completo)
            if m:
                m2_const = m.group(1).replace(",", "")
        if not m2_terreno:
            m = re.search(r"([\d,]+)\s*m[²2]\s*(?:lote|terr|land|total)", texto_completo)
            if m:
                m2_terreno = m.group(1).replace(",", "")

        # Tipo desde URL
        tipo = self._inferir_tipo_url(href) or titulo

        # Descripción
        desc_tag = tarjeta.select_one(SELECTORES["descripcion"])
        descripcion = desc_tag.get_text(strip=True) if desc_tag else ""

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

    def _inferir_tipo_url(self, href: str) -> str:
        href = href.lower()
        if "terreno" in href or "lote" in href:
            return "terreno"
        if "depart" in href or "apartamento" in href:
            return "departamento"
        if "local" in href or "comercial" in href:
            return "local"
        if "oficina" in href:
            return "oficina"
        if "bodega" in href or "nave" in href:
            return "bodega"
        return "casa"

    # ─────────────────────────────────────────
    # Playwright override (necesario para Next.js SSR)
    # ─────────────────────────────────────────

    def _fetch_html(self, url: str, referer: str = None) -> str:
        """Override con Playwright. Fuerza HTTP/1.1 para evitar ERR_HTTP2_PROTOCOL_ERROR."""
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                with self._semaforo:
                    antiblock.delay_aleatorio()
                    return self._playwright_get(url, referer=referer)
            except PlaywrightTimeout:
                self.log.warning(f"Timeout propiedades.com intento {intento}: {url}")
                antiblock.delay_aleatorio(min_seg=8, max_seg=20)
            except ErrorScraping:
                raise
            except Exception as e:
                self.log.warning(f"Error propiedades.com intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=5, max_seg=15)

        raise ErrorScraping(f"PropiedadesCom falló {config.MAX_RETRIES} veces: {url}")

    def _playwright_get(self, url: str, referer: str = None) -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-http2"],
                proxy={"server": config.PROXY_URL} if config.PROXY_URL else None,
            )
            ctx = browser.new_context(
                user_agent=antiblock.get_user_agent(),
                viewport=antiblock.get_viewport(),
                locale="es-MX",
                proxy={"server": config.PROXY_URL} if config.PROXY_URL else None,
                extra_http_headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
                    **({"Referer": referer} if referer else {}),
                },
            )
            page = ctx.new_page()
            page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )

            # Visitar homepage primero para obtener cookies de Akamai
            try:
                page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(2000)
            except PlaywrightTimeout:
                pass

            # Ahora ir a la URL objetivo
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=35000)
            except PlaywrightTimeout:
                pass

            # Esperar que carguen las tarjetas (JS rendering)
            try:
                page.wait_for_selector(SELECTORES["tarjeta"], timeout=12000)
            except PlaywrightTimeout:
                pass

            antiblock.simular_scroll_aleatorio(page)
            titulo = page.title()
            html = page.content()
            browser.close()

        # Detectar bloqueos
        titulo_lower = titulo.lower()
        if any(k in titulo_lower for k in ("cloudflare", "just a moment", "access denied", "403", "blocked")):
            raise ErrorScraping(f"PropiedadesCom bloqueó la solicitud: {url}")

        if len(html) < 5000:
            raise ErrorScraping(f"PropiedadesCom respuesta demasiado corta ({len(html)} bytes): {url}")

        return html
