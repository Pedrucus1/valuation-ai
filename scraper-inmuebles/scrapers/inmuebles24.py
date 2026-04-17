"""
scrapers/inmuebles24.py — Scraper para inmuebles24.com
Usa Playwright (browser fresco por página para evitar Cloudflare).

URL format verificado: /casas-en-venta-en-guadalajara.html
Paginación verificada: /casas-en-venta-en-guadalajara-pagina-2.html
Selector verificado:   [data-qa='posting PROPERTY']
"""

import re
from typing import Optional

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock

# ─────────────────────────────────────────
# Selectores verificados en pruebas reales
# ─────────────────────────────────────────
SELECTORES = {
    "tarjeta":        "[data-qa='posting PROPERTY']",
    "precio":         "[data-qa='POSTING_CARD_PRICE']",
    "titulo":         "[data-qa='POSTING_CARD_LOCATION']",
    "colonia":        "[data-qa='POSTING_CARD_LOCATION']",
    "tipo_propiedad": "[data-qa='POSTING_CARD_PROPERTY_TYPE']",
    # VERIFICADO: es un h3 con todo el texto concatenado, sin hijos li
    # Ejemplo: "1064 m² lote3 rec.4 baños11 estac."
    "atributos":      "[data-qa='POSTING_CARD_FEATURES']",
    "descripcion":    "[data-qa='POSTING_CARD_DESCRIPTION']",
    "link":           "a[href*='/propiedades/']",
}

BASE_URL = "https://www.inmuebles24.com"

# Tipos de propiedad soportados y su slug en URL
TIPOS_URL = {
    "casas":                    "casa",
    "departamentos":            "departamento",
    "terrenos":                 "terreno",
    "locales-comerciales":      "local",
    "oficinas":                 "oficina",
    "bodegas-comerciales":      "bodega",
}


class Inmuebles24Scraper(BaseScraper):

    nombre_portal = "INMUEBLES24"
    tab_sheets    = config.TAB_INMUEBLES24

    # Tipos de propiedad a scrapear
    tipos_propiedad = list(TIPOS_URL.keys())  # puede filtrarse externamente

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        Formato verificado:
          Pág 1: /casas-en-venta-en-guadalajara.html
          Pág N: /casas-en-venta-en-guadalajara-pagina-N.html
        Se llama por tipo de propiedad desde _scrapear_zona_operacion.
        El tipo se pasa via zona['_tipo_actual'] (truco para reutilizar la firma).
        """
        tipo  = zona.get("_tipo_actual", "casas")
        slug  = zona.get("slug_inmuebles24", zona["municipio"].lower())
        op    = "venta" if operacion == "venta" else "renta"
        base  = f"{BASE_URL}/{tipo}-en-{op}-en-{slug}.html"
        if pagina > 1:
            return f"{BASE_URL}/{tipo}-en-{op}-en-{slug}-pagina-{pagina}.html"
        return base

    def obtener_total_paginas(self, html: str) -> int:
        """
        Calcula el total de páginas desde el conteo en el título.
        Ejemplo título: "1,072 Casas en venta en Guadalajara"
                        "182 Locales Comerciales en venta en Guadalajara"
        → ceil(total / 30) páginas.
        """
        # Método 1: contar desde el título (más confiable)
        # \w+(?:\s+\w+)* captura tipos de 1 o más palabras (ej. "Locales Comerciales")
        match = re.search(r"([\d,]+)\s+\w+(?:\s+\w+)*\s+en\s+(?:venta|renta)", html)
        if match:
            total_props = int(match.group(1).replace(",", ""))
            if total_props > 0:
                paginas = (total_props + 29) // 30  # ceil division
                return min(paginas, config.MAX_PAGINAS_POR_ZONA)

        # Método 2: links de paginación (solo como fallback)
        matches = re.findall(r"-pagina-(\d+)\.html", html)
        if matches:
            return min(max(int(m) for m in matches), config.MAX_PAGINAS_POR_ZONA)

        soup = BeautifulSoup(html, "lxml")
        return 1 if soup.select(SELECTORES["tarjeta"]) else 0

    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        tarjetas = soup.select(SELECTORES["tarjeta"])
        propiedades = []

        tipo_prop = TIPOS_URL.get(zona.get("_tipo_actual", "casas"), "casa")

        for tarjeta in tarjetas:
            try:
                prop = self._extraer_tarjeta(tarjeta, zona, operacion, tipo_prop)
                if prop and prop.get("url_original"):
                    propiedades.append(prop)
            except Exception as e:
                self.log.debug(f"Error extrayendo tarjeta: {e}")

        return propiedades

    def _extraer_tarjeta(self, tarjeta, zona: dict, operacion: str, tipo_prop: str) -> Optional[dict]:
        # URL
        link_tag = tarjeta.select_one(SELECTORES["link"])
        if not link_tag:
            link_tag = tarjeta.select_one("a[href]")
        if not link_tag:
            return None
        href = link_tag.get("href", "")
        url  = href if href.startswith("http") else BASE_URL + href

        # Precio
        precio_tag = tarjeta.select_one(SELECTORES["precio"])
        precio_raw = precio_tag.get_text(strip=True) if precio_tag else ""

        # Título y colonia (mismo selector — es la dirección)
        titulo_tag = tarjeta.select_one(SELECTORES["titulo"])
        titulo     = titulo_tag.get_text(strip=True) if titulo_tag else ""

        # Tipo de propiedad
        tipo_tag = tarjeta.select_one(SELECTORES["tipo_propiedad"])
        tipo_final = tipo_tag.get_text(strip=True) if tipo_tag else tipo_prop

        # Atributos
        recamaras, banos, m2_const, m2_terreno, estac = self._extraer_atributos(tarjeta)

        # Descripción
        desc_tag    = tarjeta.select_one(SELECTORES["descripcion"])
        descripcion = desc_tag.get_text(strip=True) if desc_tag else ""

        return {
            "titulo":          titulo,
            "precio_raw":      precio_raw,
            "tipo_operacion":  operacion,
            "tipo_propiedad":  tipo_final,
            "colonia":         titulo,   # en i24 el location es la dirección/colonia
            "municipio":       zona["municipio"],
            "estado":          zona["estado"],
            "recamaras":       recamaras,
            "banos":           banos,
            "m2_construccion": m2_const,
            "m2_terreno":      m2_terreno,
            "estacionamientos":estac,
            "descripcion":     descripcion,
            "url_original":    url,
        }

    def _extraer_atributos(self, tarjeta) -> tuple:
        """
        Parsea el h3 de atributos cuyo texto viene concatenado, ej:
        "1064 m² lote3 rec.4 baños11 estac."
        """
        recamaras = banos = m2_const = m2_terreno = estac = None

        feat_tag = tarjeta.select_one(SELECTORES["atributos"])
        if not feat_tag:
            return recamaras, banos, m2_const, m2_terreno, estac

        texto = feat_tag.get_text(separator=" ", strip=True).lower()

        # m² lote / terreno  →  m2_terreno
        m = re.search(r"([\d.]+)\s*m[²2]\s*(?:lote|terr)", texto)
        if m:
            m2_terreno = m.group(1)

        # m² construcción (si no es lote)
        m = re.search(r"([\d.]+)\s*m[²2]\s*(?:const|construc)", texto)
        if m:
            m2_const = m.group(1)
        elif not m2_terreno:
            # m² genérico → construcción
            m = re.search(r"([\d.]+)\s*m[²2]", texto)
            if m:
                m2_const = m.group(1)

        # recámaras
        m = re.search(r"([\d.]+)\s*rec", texto)
        if m:
            recamaras = m.group(1)

        # baños
        m = re.search(r"([\d.]+)\s*ba[ñn]", texto)
        if m:
            banos = m.group(1)

        # estacionamientos
        m = re.search(r"([\d.]+)\s*estac", texto)
        if m:
            estac = m.group(1)

        return recamaras, banos, m2_const, m2_terreno, estac

    # ─────────────────────────────────────────
    # Fetch secuencial (Cloudflare bloquea concurrencia)
    # ─────────────────────────────────────────

    def _scrapear_zona_operacion(self, zona: dict, operacion: str) -> list[dict]:
        """
        Override del método base: fetch estrictamente secuencial para evitar
        que Cloudflare detecte múltiples requests simultáneos de Playwright.
        """
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

            self.log.info(f"Total paginas: {total}")

            props_p1 = self.extraer_propiedades_pagina(html_p1, zona, operacion)
            propiedades_zona.extend(props_p1)
            self.log.info(f"Pag 1/{total} — {len(props_p1)} props")

            # Páginas restantes de forma SECUENCIAL
            for pag in range(2, total + 1):
                url = self.obtener_url_listado(zona, operacion, pagina=pag)
                try:
                    html = self._fetch_html(url)
                    props = self.extraer_propiedades_pagina(html, zona, operacion)

                    # Si 0 props dos veces seguidas, probablemente bloqueado
                    if len(props) == 0:
                        self.log.warning(f"Pag {pag}/{total} — 0 props (posible bloqueo, saltando)")
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

    # ─────────────────────────────────────────
    # Override ejecutar: itera también por tipo de propiedad
    # ─────────────────────────────────────────

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
        self.log.info(f"INMUEBLES24 completado: {len(todas)} props en {duracion:.1f}s")
        return {
            "portal":           self.nombre_portal,
            "tab_sheets":       self.tab_sheets,
            "propiedades":      todas,
            "total":            len(todas),
            "errores":          len(self._errores),
            "lista_errores":    self._errores,
            "duracion_segundos":duracion,
        }

    # ─────────────────────────────────────────
    # Playwright: browser fresco por página
    # ─────────────────────────────────────────

    def _fetch_html(self, url: str, referer: str = None) -> str:
        """Browser nuevo en cada llamada — evita detección de sesión por Cloudflare."""
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                with self._semaforo:
                    antiblock.delay_aleatorio()
                    return self._playwright_get(url)
            except PlaywrightTimeout:
                self.log.warning(f"Timeout i24 intento {intento}: {url}")
                antiblock.delay_aleatorio(min_seg=8, max_seg=15)
            except Exception as e:
                self.log.warning(f"Error i24 intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=8, max_seg=15)

        raise ErrorScraping(f"Inmuebles24 falló {config.MAX_RETRIES} veces: {url}")

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
            try:
                page.wait_for_selector(SELECTORES["tarjeta"], timeout=12000)
            except PlaywrightTimeout:
                pass  # Puede no haber resultados para ese tipo/zona
            antiblock.simular_scroll_aleatorio(page)
            titulo = page.title()
            html = page.content()
        finally:
            page.close()
            ctx.close()

        # Detectar bloqueo de Cloudflare
        if any(k in titulo for k in ("Just a moment", "Attention Required", "Cloudflare")):
            raise ErrorScraping(f"Cloudflare bloqueó la solicitud: {url}")

        return html
