"""
scrapers/pincali.py — Scraper para pincali.com
Usa Playwright (browser fresco por página para evitar bloqueos).

URL format confirmado: /en/properties/{type}-for-{op}-in-{city}-{state}
  Ej: /en/properties/houses-for-sale-in-guadalajara-jalisco
Paginación confirmada: ?page=N (desde página 2)
Selector confirmado:   li[class*='property']  (48 items/página)
Items por página:      48 (confirmado con 8 páginas sin bloqueo)
Delay entre páginas:   8-14s (probado estable hasta pág 8+)
"""

import re
from typing import Optional

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock

# ─────────────────────────────────────────
# Mapeo tipo interno → slug en URL pincali
# ─────────────────────────────────────────
TIPOS_URL = {
    "casas":               "houses",
    "departamentos":       "apartments",
    "terrenos":            "land",
    "locales-comerciales": "commercial",
    "oficinas":            "offices",
}

OPERACION_URL = {
    "venta": "sale",
    "renta": "rent",
}

BASE_URL = "https://www.pincali.com"

# Items por página confirmados en test real (2026-03-16, 8 páginas sin bloqueo)
ITEMS_POR_PAGINA = 48

# Candidatos de selector de tarjeta — confirmado primero, fallbacks después
CANDIDATOS_TARJETA = [
    "li[class*='property']",       # CONFIRMADO: 48 items/página
    "article",
    "[class*='PropertyCard']",
    "[class*='property-card']",
    "[class*='listing-card']",
    "[class*='ListingCard']",
    "div[class*='card'][class*='propert']",
    "li[class*='listing']",
    "[data-property-id]",
    "[data-id]",
    "div[class*='result-item']",
    "div[class*='search-result']",
]

# El precio viene como "$3,250,000 MXNFor Sale" — hay que limpiar el sufijo
_PRECIO_LIMPIO_RE = re.compile(r"((?:\$|MXN|USD)?\s*[\d,]+(?:\.\d+)?(?:\s*(?:MXN|USD))?)", re.I)


class PincaliScraper(BaseScraper):

    nombre_portal = "PINCALI"
    tab_sheets    = config.TAB_PINCALI

    tipos_propiedad = list(TIPOS_URL.keys())

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        Construye URL del listado.
        Ej pág 1: /en/properties/houses-for-sale-in-guadalajara-jalisco
        Ej pág 2: /en/properties/houses-for-sale-in-guadalajara-jalisco?page=2
        """
        tipo_en  = TIPOS_URL.get(zona.get("_tipo_actual", "casas"), "houses")
        op_en    = OPERACION_URL.get(operacion, "sale")
        slug     = zona.get("slug_pincali", zona["municipio"].lower().replace(" ", "-"))
        url = f"{BASE_URL}/en/properties/{tipo_en}-for-{op_en}-in-{slug}"
        if pagina > 1:
            url += f"?page={pagina}"
        return url

    def obtener_total_paginas(self, html: str) -> int:
        """
        Extrae total de propiedades del título de la página y calcula páginas.
        Títulos observados:
          "1,157 Casas en venta en Guadalajara, Jalisco"
          "1157 Houses for sale in Guadalajara, Jalisco"
        """
        soup = BeautifulSoup(html, "lxml")
        titulo = soup.title.string if soup.title else ""

        # Buscar número total al inicio del título
        m = re.match(r"([\d,]+)", titulo.strip())
        if m:
            total_props = int(m.group(1).replace(",", ""))
            if total_props > 0:
                paginas = (total_props + ITEMS_POR_PAGINA - 1) // ITEMS_POR_PAGINA
                return min(paginas, config.MAX_PAGINAS_POR_ZONA)

        # Fallback: buscar conteo en texto de la página
        m = re.search(r"([\d,]+)\s+(?:casas|departamentos|propiedades|houses|apartments|properties)",
                      html, re.I)
        if m:
            total_props = int(m.group(1).replace(",", ""))
            if total_props > 0:
                paginas = (total_props + ITEMS_POR_PAGINA - 1) // ITEMS_POR_PAGINA
                return min(paginas, config.MAX_PAGINAS_POR_ZONA)

        # Fallback: detectar links de paginación
        pages_found = re.findall(r"[?&]page=(\d+)", html)
        if pages_found:
            return min(max(int(p) for p in pages_found), config.MAX_PAGINAS_POR_ZONA)

        # Si hay tarjetas, al menos 1 página
        soup = BeautifulSoup(html, "lxml")
        return 1 if self._encontrar_tarjetas(soup) else 0

    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        tarjetas = self._encontrar_tarjetas(soup)
        propiedades = []

        tipo_prop = zona.get("_tipo_actual", "casas")

        for tarjeta in tarjetas:
            try:
                prop = self._extraer_tarjeta(tarjeta, zona, operacion, tipo_prop)
                if prop and prop.get("url_original"):
                    propiedades.append(prop)
            except Exception as e:
                self.log.debug(f"Error extrayendo tarjeta: {e}")

        return propiedades

    def _encontrar_tarjetas(self, soup: BeautifulSoup):
        """Prueba selectores candidatos y retorna el conjunto con más resultados."""
        mejor_sel = None
        mejor_n   = 0

        for sel in CANDIDATOS_TARJETA:
            try:
                items = soup.select(sel)
                # Filtrar elementos muy pequeños (probablemente no son tarjetas)
                items = [i for i in items if len(i.get_text(strip=True)) > 30]
                if len(items) > mejor_n:
                    mejor_n   = len(items)
                    mejor_sel = sel
            except Exception:
                continue

        if mejor_sel and mejor_n >= 1:
            self.log.debug(f"Selector tarjeta: '{mejor_sel}' ({mejor_n} elementos)")
            return soup.select(mejor_sel)

        return []

    def _extraer_tarjeta(self, tarjeta, zona: dict, operacion: str, tipo_prop: str) -> Optional[dict]:
        # ── URL ──────────────────────────────────────
        link_tag = tarjeta.select_one("a[href*='/en/property/'], a[href*='/propiedad/'], a[href*='/inmueble/']")
        if not link_tag:
            link_tag = tarjeta.select_one("a[href]")
        if not link_tag:
            return None
        href = link_tag.get("href", "")
        url  = href if href.startswith("http") else BASE_URL + href

        # ── Precio ───────────────────────────────────
        # El precio viene como "$3,250,000 MXNFor Sale" — extraemos solo el número
        precio_raw = ""
        for pat in ["[class*='price']", "[class*='Price']", "[class*='precio']"]:
            tag = tarjeta.select_one(pat)
            if tag:
                texto_precio = tag.get_text(strip=True)
                m = re.search(r"[\$]?\s*([\d,]+(?:\.\d+)?)\s*(MXN|USD)?", texto_precio, re.I)
                if m:
                    precio_raw = ("$" + m.group(1) + (" " + m.group(2).upper() if m.group(2) else " MXN")).strip()
                else:
                    precio_raw = texto_precio[:40]
                break
        if not precio_raw:
            m = re.search(r"\$\s*([\d,]+)\s*(MXN|USD)?", tarjeta.get_text(), re.I)
            if m:
                precio_raw = "$" + m.group(1) + (" " + m.group(2).upper() if m.group(2) else " MXN")

        # ── Título / Dirección ────────────────────────
        titulo = ""
        for pat in ["[class*='title']", "[class*='Title']", "[class*='address']",
                    "[class*='location']", "h2", "h3", "h4"]:
            tag = tarjeta.select_one(pat)
            if tag:
                titulo = tag.get_text(strip=True)
                break

        # ── Atributos ─────────────────────────────────
        recamaras, banos, m2_const, m2_terreno, estac = self._extraer_atributos(tarjeta)

        return {
            "titulo":           titulo,
            "precio_raw":       precio_raw,
            "tipo_operacion":   operacion,
            "tipo_propiedad":   tipo_prop,
            "colonia":          titulo,
            "municipio":        zona["municipio"],
            "estado":           zona["estado"],
            "recamaras":        recamaras,
            "banos":            banos,
            "m2_construccion":  m2_const,
            "m2_terreno":       m2_terreno,
            "estacionamientos": estac,
            "descripcion":      "",
            "url_original":     url,
        }

    def _extraer_atributos(self, tarjeta) -> tuple:
        recamaras = banos = m2_const = m2_terreno = estac = None
        texto = tarjeta.get_text(separator=" ", strip=True).lower()

        # m² terreno
        m = re.search(r"([\d,]+)\s*m[²2]\s*(?:lote|terr|land)", texto)
        if m:
            m2_terreno = m.group(1).replace(",", "")

        # m² construcción
        m = re.search(r"([\d,]+)\s*m[²2]\s*(?:const|construc|built)", texto)
        if m:
            m2_const = m.group(1).replace(",", "")
        if not m2_const and not m2_terreno:
            m = re.search(r"([\d,]+)\s*m[²2]", texto)
            if m:
                m2_const = m.group(1).replace(",", "")

        # Recámaras / bedrooms
        m = re.search(r"(\d+)\s*(?:rec[áa]mara|bedroom|bed|hab)", texto)
        if m:
            recamaras = m.group(1)

        # Baños / bathrooms
        m = re.search(r"(\d+)\s*(?:ba[ñn]|bathroom|bath)", texto)
        if m:
            banos = m.group(1)

        # Estacionamientos / parking
        m = re.search(r"(\d+)\s*(?:estac|parking|garage|coche)", texto)
        if m:
            estac = m.group(1)

        return recamaras, banos, m2_const, m2_terreno, estac

    # ─────────────────────────────────────────
    # Fetch: Playwright, browser fresco por página
    # ─────────────────────────────────────────

    def _scrapear_zona_operacion(self, zona: dict, operacion: str) -> list[dict]:
        """Fetch estrictamente secuencial (mismo patrón que inmuebles24)."""
        import traceback as _tb
        from datetime import datetime as _dt

        municipio = zona["municipio"]
        tipo      = zona.get("_tipo_actual", "casas")
        self.log.info(f"Zona: {municipio} | Op: {operacion} | Tipo: {tipo}")

        propiedades_zona = []

        try:
            url_p1  = self.obtener_url_listado(zona, operacion, pagina=1)
            html_p1 = self._fetch_html(url_p1)
            total   = min(self.obtener_total_paginas(html_p1), config.MAX_PAGINAS_POR_ZONA)

            if total == 0:
                self.log.info(f"Sin resultados: {municipio}/{operacion}/{tipo}")
                return []

            self.log.info(f"Total páginas estimadas: {total}")

            props_p1 = self.extraer_propiedades_pagina(html_p1, zona, operacion)
            propiedades_zona.extend(props_p1)
            self.log.info(f"Pag 1/{total} — {len(props_p1)} props")

            for pag in range(2, total + 1):
                url = self.obtener_url_listado(zona, operacion, pagina=pag)
                try:
                    html  = self._fetch_html(url)
                    props = self.extraer_propiedades_pagina(html, zona, operacion)

                    if len(props) == 0:
                        self.log.warning(f"Pag {pag}/{total} — 0 props, deteniendo")
                        break

                    propiedades_zona.extend(props)
                    self.log.info(f"Pag {pag}/{total} — {len(props)} props | Acum: {len(propiedades_zona)}")

                except ErrorScraping as e:
                    msg = f"Error en pag {pag}: {e}"
                    self.log.error(msg)
                    self._errores.append(msg)

        except Exception as e:
            msg = f"Error en {municipio}/{operacion}/{tipo}: {_tb.format_exc()}"
            self.log.error(msg)
            self._errores.append(msg)

        # Normalizar
        from utils.cleaner import normalizar_propiedad
        normalizadas = []
        for raw in propiedades_zona:
            try:
                raw.setdefault("portal_origen", self.nombre_portal)
                raw.setdefault("fecha_scraping", _dt.now().isoformat())
                raw.setdefault("activo", True)
                normalizadas.append(normalizar_propiedad(raw))
            except Exception as e:
                self.log.warning(f"No se pudo normalizar: {e}")

        return normalizadas

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
                        for tipo in self.tipos_propiedad:
                            zona_con_tipo = {**zona, "_tipo_actual": tipo}
                            props = self._scrapear_zona_operacion(zona_con_tipo, operacion)
                            todas.extend(props)
            finally:
                self._pw_browser.close()
                self._pw_browser = None

        duracion = _time.time() - inicio
        self.log.info(f"PINCALI completado: {len(todas)} props en {duracion:.1f}s")
        return {
            "portal":            self.nombre_portal,
            "tab_sheets":        self.tab_sheets,
            "propiedades":       todas,
            "total":             len(todas),
            "errores":           len(self._errores),
            "lista_errores":     self._errores,
            "duracion_segundos": duracion,
        }

    def _fetch_html(self, url: str, referer: str = None) -> str:
        """Browser nuevo en cada llamada."""
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                with self._semaforo:
                    antiblock.delay_aleatorio()
                    return self._playwright_get(url)
            except PlaywrightTimeout:
                self.log.warning(f"Timeout pincali intento {intento}: {url}")
                antiblock.delay_aleatorio(min_seg=8, max_seg=15)
            except Exception as e:
                self.log.warning(f"Error pincali intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=8, max_seg=15)

        raise ErrorScraping(f"Pincali falló {config.MAX_RETRIES} veces: {url}")

    def _playwright_get(self, url: str) -> str:
        ctx_kwargs = dict(
            user_agent=antiblock.get_user_agent(),
            viewport=antiblock.get_viewport(),
            locale="es-MX",
            timezone_id="America/Mexico_City",
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
            for sel in ["li[class*='property']", "article", "[class*='Card']", "[class*='listing']"]:
                try:
                    page.wait_for_selector(sel, timeout=8000)
                    break
                except PlaywrightTimeout:
                    continue
            antiblock.simular_scroll_aleatorio(page)
            titulo = page.title()
            html = page.content()
        finally:
            page.close()
            ctx.close()

        # Detectar bloqueo
        if any(k in titulo.lower() for k in ("cloudflare", "just a moment", "access denied", "403")):
            raise ErrorScraping(f"Pincali bloqueó la solicitud: {url}")

        return html
