"""
scrapers/pincali.py — Scraper para pincali.com

URL confirmada (2026-06-12):
  /en/properties/{type}-for-{op}-in-{city}-{state}
  Ej: /en/properties/houses-for-sale-in-guadalajara-jalisco
  La ruta /propiedades/ (español) devuelve 403.

Fetch: requests simple (sin Playwright) — el portal no bloquea requests con UA real.
Selector de tarjeta: div.property__component  (42 items/página confirmados)
Paginación: ?page=N  (máx 1 enlace de última página en el HTML)
"""

import re
import time
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock
from utils.cleaner import normalizar_propiedad, tipo_por_slug

BASE_URL = "https://www.pincali.com"
ITEMS_POR_PAGINA = 42  # confirmado 2026-06-12

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

SESSION_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://www.pincali.com/",
}


class PincaliScraper(BaseScraper):

    nombre_portal = "PINCALI"
    tab_sheets    = config.TAB_PINCALI
    tipos_propiedad = list(TIPOS_URL.keys())

    def __init__(self):
        super().__init__()
        self._session = requests.Session()
        self._session.headers.update(SESSION_HEADERS)

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        tipo  = TIPOS_URL.get(zona.get("_tipo_actual", "casas"), "houses")
        op    = OPERACION_URL.get(operacion, "sale")
        mun   = zona["municipio"].lower().replace(" ", "-")
        est   = zona.get("estado", "jalisco").lower().replace(" ", "-")
        slug  = f"{mun}-{est}"
        url   = f"{BASE_URL}/en/properties/{tipo}-for-{op}-in-{slug}"
        if pagina > 1:
            url += f"?page={pagina}"
        return url

    def obtener_total_paginas(self, html: str) -> int:
        soup = BeautifulSoup(html, "lxml")
        titulo = soup.title.string if soup.title else ""
        m = re.match(r"([\d,]+)", titulo.strip())
        if m:
            total = int(m.group(1).replace(",", ""))
            if total > 0:
                return min((total + ITEMS_POR_PAGINA - 1) // ITEMS_POR_PAGINA,
                           config.MAX_PAGINAS_POR_ZONA)
        pages = re.findall(r"[?&]page=(\d+)", html)
        if pages:
            return min(max(int(p) for p in pages), config.MAX_PAGINAS_POR_ZONA)
        cards = BeautifulSoup(html, "lxml").select("div.property__component")
        return 1 if cards else 0

    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select("div.property__component")
        tipo_prop = zona.get("_tipo_actual", "casas")
        props = []
        for card in cards:
            try:
                p = self._extraer_tarjeta(card, zona, operacion, tipo_prop)
                if p and p.get("url_original"):
                    props.append(p)
            except Exception as e:
                self.log.debug(f"Error tarjeta: {e}")
        return props

    def _extraer_tarjeta(self, card, zona: dict, operacion: str, tipo_prop: str) -> Optional[dict]:
        # URL
        link = card.find("a", href=re.compile(r"/en/home/"))
        if not link:
            link = card.find("a", href=True)
        if not link:
            return None
        href = link.get("href", "")
        url  = href if href.startswith("http") else BASE_URL + href

        # El tipo real está en el slug de la URL ('departamento-en-renta-...'), NO
        # en la categoría scrapeada (la de 'commercial' devuelve mezclado → todo
        # salía 'local'). Slug manda; la categoría es fallback.
        tipo_final = tipo_por_slug(url) or tipo_prop

        texto = card.get_text(separator="|", strip=True)

        # Precio — div.price contiene "$3,200,000 MXNFor Sale" todo junto
        precio_raw = ""
        price_tag = card.select_one("div.price, [class='price'], [class*='price']")
        precio_texto = price_tag.get_text(strip=True) if price_tag else texto
        m = re.search(r"\$\s*([\d,]+(?:\.\d+)?)\s*(MXN|USD)?", precio_texto, re.I)
        if m:
            moneda = (m.group(2) or "MXN").upper()
            precio_raw = f"${m.group(1)} {moneda}"

        # m² — puede ser construcción o terreno
        m2_const = m2_terreno = None
        m2_match = re.search(r"([\d,]+(?:\.\d+)?)\s*m[²2]", texto, re.I)
        if m2_match:
            val = m2_match.group(1).replace(",", "")
            if tipo_final in ("terreno", "terrenos"):
                m2_terreno = val
            else:
                m2_const = val

        # Recámaras
        rec_m = re.search(r"(\d+)\s*(?:beds?|recámaras?|habitaciones?)", texto, re.I)
        recamaras = rec_m.group(1) if rec_m else None

        # Baños
        ban_m = re.search(r"(\d+)\s*(?:baths?|baños?)", texto, re.I)
        banos = ban_m.group(1) if ban_m else None

        # Colonia: la tarjeta en inglés no tiene este dato de forma fiable.
        # El enricher la extrae del HTML-escaped JSON de la página de detalle.
        colonia = ""
        partes = [p.strip() for p in texto.split("|") if p.strip()]

        # Título — última parte larga
        titulo = ""
        for parte in reversed(partes):
            if len(parte) > 20 and not re.search(r"^\$|^For |m[²2]|\d+\s*bed|\d+\s*bath", parte, re.I):
                titulo = parte
                break

        return {
            "titulo":           titulo,
            "precio_raw":       precio_raw,
            "tipo_operacion":   operacion,
            "tipo_propiedad":   tipo_final,
            "colonia":          colonia,
            "calle_numero":     "",
            "municipio":        zona["municipio"],
            "estado":           zona.get("estado", "Jalisco"),
            "recamaras":        recamaras,
            "banos":            banos,
            "m2_construccion":  m2_const,
            "m2_terreno":       m2_terreno,
            "estacionamientos": None,
            "descripcion":      "",
            "url_original":     url,
        }

    # ── Fetch con requests ────────────────────────────────────────────────────

    def _fetch_html(self, url: str) -> str:
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                r = self._session.get(url, timeout=20)
                if r.status_code == 404:
                    self.log.info(f"HTTP 404 (sin resultados): {url}")
                    return ""
                if r.status_code == 403:
                    raise ErrorScraping(f"HTTP 403 bloqueado: {url}")
                r.raise_for_status()
                if len(r.text) < 5000:
                    raise ErrorScraping(f"Respuesta corta ({len(r.text)}b): {url}")
                return r.text
            except ErrorScraping:
                raise
            except Exception as e:
                self.log.warning(f"Fetch intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=5, max_seg=10)
        raise ErrorScraping(f"PINCALI falló {config.MAX_RETRIES} veces: {url}")

    # ── Ejecución principal ───────────────────────────────────────────────────

    def _scrapear_zona_operacion(self, zona: dict, operacion: str) -> list[dict]:
        municipio = zona["municipio"]
        tipo      = zona.get("_tipo_actual", "casas")

        try:
            url_p1  = self.obtener_url_listado(zona, operacion, pagina=1)
            html_p1 = self._fetch_html(url_p1)
            total   = min(self.obtener_total_paginas(html_p1), config.MAX_PAGINAS_POR_ZONA)

            if total == 0:
                return []

            self.log.info(f"{municipio}/{operacion}/{tipo} → {total} páginas")
            props = self.extraer_propiedades_pagina(html_p1, zona, operacion)
            self.log.info(f"  Pag 1/{total} — {len(props)} props")

            for pag in range(2, total + 1):
                antiblock.delay_aleatorio(min_seg=3, max_seg=7)
                url  = self.obtener_url_listado(zona, operacion, pagina=pag)
                html = self._fetch_html(url)
                p    = self.extraer_propiedades_pagina(html, zona, operacion)
                if not p:
                    self.log.warning(f"  Pag {pag} devuelve 0 props — deteniendo")
                    break
                props.extend(p)
                self.log.info(f"  Pag {pag}/{total} — {len(p)} props | Acum: {len(props)}")

        except ErrorScraping as e:
            self.log.error(f"Error en {municipio}/{operacion}/{tipo}: {e}")
            self._errores.append(str(e))
            return []
        except Exception as e:
            self.log.error(f"Error inesperado: {e}")
            self._errores.append(str(e))
            return []

        normalizadas = []
        for raw in props:
            try:
                raw.setdefault("portal_origen", self.nombre_portal)
                raw.setdefault("fecha_scraping", datetime.now().isoformat())
                raw.setdefault("activo", True)
                normalizadas.append(normalizar_propiedad(raw))
            except Exception as e:
                self.log.warning(f"No se pudo normalizar: {e}")
        return normalizadas

    def ejecutar(self) -> dict:
        inicio = time.time()
        self.log.info(f"=== Iniciando {self.nombre_portal} ===")
        todas = []

        for zona in config.ZONAS:
            for operacion in config.TIPOS_OPERACION:
                for tipo in self.tipos_propiedad:
                    zona_con_tipo = {**zona, "_tipo_actual": tipo}
                    props = self._scrapear_zona_operacion(zona_con_tipo, operacion)
                    todas.extend(props)

        duracion = time.time() - inicio
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
