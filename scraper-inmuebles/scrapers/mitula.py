"""
scrapers/mitula.py — Scraper para Lamudi.com.mx (reemplaza casas.mitula.mx)

casas.mitula.mx fue absorbida por Lamudi y devuelve 401 desde ~mayo 2026.
Lamudi expone los listings en JSON-LD (schema.org) directamente en el HTML:
  30 props por página con precio, m², recámaras, baños y dirección.

URL: https://www.lamudi.com.mx/{estado}/{municipio}/{tipo}/for-{op}/?page={n}

Portal guardado en Mongo como "MITULA" para no romper datos históricos.
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
from utils.cleaner import normalizar_propiedad

BASE_URL = "https://www.lamudi.com.mx"
ITEMS_POR_PAGINA = 30  # JSON-LD siempre devuelve 30

TIPOS_LAMUDI = {
    "casas":               "casa",
    "departamentos":       "departamento",
    "terrenos":            "terreno",
    "locales-comerciales": "local-comercial",
    "oficinas":            "oficina",
}

OPERACION_LAMUDI = {
    "venta": "for-sale",
    "renta": "for-rent",
}

# slug_lamudi: override del municipio en la URL cuando Lamudi usa nombre distinto
SLUG_LAMUDI = {
    "Tonalá":              "tonala-1",   # distingue de Tonalá Chiapas
    "Tlaquepaque":         "tlaquepaque",
    "Tlajomulco de Zúñiga": "tlajomulco-de-zuniga",
    "Guadalajara":         "guadalajara",
    "Zapopan":             "zapopan",
    "Chapala":             "chapala",
    "Ajijic":              "ajijic",
}

SESSION_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class MitulaScraper(BaseScraper):

    nombre_portal = "MITULA"
    tab_sheets    = config.TAB_MITULA
    tipos_propiedad = list(TIPOS_LAMUDI.keys())

    def __init__(self):
        super().__init__()
        self._session = requests.Session()
        self._session.headers.update(SESSION_HEADERS)

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        mun   = zona["municipio"]
        estado = zona.get("estado", "Jalisco").lower().replace(" ", "-")
        slug  = SLUG_LAMUDI.get(mun, mun.lower().replace(" ", "-").replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n"))
        tipo  = TIPOS_LAMUDI.get(zona.get("_tipo_actual", "casas"), "casa")
        op    = OPERACION_LAMUDI.get(operacion, "for-sale")
        url   = f"{BASE_URL}/{estado}/{slug}/{tipo}/{op}/"
        if pagina > 1:
            url += f"?page={pagina}"
        return url

    def _fetch_html(self, url: str) -> str:
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                r = self._session.get(url, timeout=20, allow_redirects=True)
                if r.status_code == 404:
                    raise ErrorScraping(f"HTTP 404: {url}")
                r.raise_for_status()
                if len(r.text) < 3000:
                    raise ErrorScraping(f"Respuesta corta ({len(r.text)}b): {url}")
                return r.text
            except ErrorScraping:
                raise
            except Exception as e:
                self.log.warning(f"Fetch intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=3, max_seg=7)
        raise ErrorScraping(f"LAMUDI falló {config.MAX_RETRIES} veces: {url}")

    def obtener_total_paginas(self, html: str) -> int:
        # El conteo numérico puede aparecer fuera del H1 ("2,057 Casas")
        m = re.search(r"(\d[\d,]+)\s+(?:Casas|Departamentos|Terrenos|inmuebles|propiedades)", html, re.I)
        if m:
            total = int(m.group(1).replace(",", ""))
            if total > 0:
                return min((total + ITEMS_POR_PAGINA - 1) // ITEMS_POR_PAGINA,
                           config.MAX_PAGINAS_POR_ZONA)
        # Fallback: si hay enlace a página 2 hay más páginas
        soup = BeautifulSoup(html, "lxml")
        if soup.select_one("a[href*='page=2']"):
            return min(10, config.MAX_PAGINAS_POR_ZONA)
        return 1 if self._extraer_jsonld(html) else 0

    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        items = self._extraer_jsonld(html)
        tipo_prop = zona.get("_tipo_actual", "casas")
        props = []
        for item in items:
            try:
                p = self._mapear_item(item, zona, operacion, tipo_prop)
                if p and p.get("url_original"):
                    props.append(p)
            except Exception as e:
                self.log.debug(f"Error item: {e}")
        return props

    def _extraer_jsonld(self, html: str) -> list[dict]:
        """Extrae ItemList de schema.org del JSON-LD embebido."""
        import json
        soup  = BeautifulSoup(html, "lxml")
        tag   = soup.select_one('script[type="application/ld+json"]')
        if not tag or not tag.string:
            return []
        try:
            data    = json.loads(tag.string)
            graphs  = data if isinstance(data, list) else [data]
            # Navegar @graph → mainEntity → ItemList → itemListElement
            for block in graphs:
                graph = block.get("@graph", [block])
                for node in graph:
                    main = node.get("mainEntity", [])
                    if not isinstance(main, list):
                        main = [main]
                    for entity in main:
                        if entity.get("@type") == "ItemList":
                            return [el["item"] for el in entity.get("itemListElement", []) if "item" in el]
        except Exception as e:
            self.log.warning(f"Error parseando JSON-LD: {e}")
        return []

    def _mapear_item(self, item: dict, zona: dict, operacion: str, tipo_prop: str) -> Optional[dict]:
        url = item.get("url") or item.get("@id", "")
        if not url:
            return None

        # Precio
        precio_raw = ""
        offers = item.get("offers", {})
        if isinstance(offers, dict) and offers.get("price"):
            moneda = offers.get("priceCurrency", "MXN")
            precio_raw = f"${offers['price']} {moneda}"

        # m²
        m2_const = m2_terreno = None
        fs = item.get("floorSize", {})
        if isinstance(fs, dict) and fs.get("value"):
            m2_const = str(fs["value"])
        ls = item.get("lotSize", {})
        if isinstance(ls, dict) and ls.get("value"):
            m2_terreno = str(ls["value"])
        if tipo_prop == "terrenos" and m2_const and not m2_terreno:
            m2_terreno, m2_const = m2_const, None

        # Recámaras / baños
        recamaras = str(item["numberOfBedrooms"]) if item.get("numberOfBedrooms") else None
        banos     = str(item["numberOfBathroomsTotal"]) if item.get("numberOfBathroomsTotal") else None

        # Dirección / colonia
        addr     = item.get("address", {})
        street   = addr.get("streetAddress", "") if isinstance(addr, dict) else ""
        colonia  = ""
        # streetAddress suele ser "Calle, Colonia, Municipio, Estado, País"
        partes = [p.strip() for p in street.split(",")]
        mun_lower = zona["municipio"].lower()
        for p in partes[1:]:  # primera parte es calle
            if p.lower() not in (mun_lower, "jalisco", "méxico", "mexico") and len(p) > 3:
                colonia = p
                break

        titulo = item.get("name", "")

        return {
            "titulo":           titulo,
            "precio_raw":       precio_raw,
            "tipo_operacion":   operacion,
            "tipo_propiedad":   tipo_prop,
            "colonia":          colonia,
            "calle_numero":     partes[0] if partes else "",
            "municipio":        zona["municipio"],
            "estado":           zona.get("estado", "Jalisco"),
            "recamaras":        recamaras,
            "banos":            banos,
            "m2_construccion":  m2_const,
            "m2_terreno":       m2_terreno,
            "estacionamientos": None,
            "descripcion":      item.get("description", ""),
            "url_original":     url,
        }

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
                antiblock.delay_aleatorio(min_seg=2, max_seg=5)
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
        self.log.info(f"=== Iniciando {self.nombre_portal} (via Lamudi) ===")
        todas = []

        for zona in config.ZONAS:
            for operacion in config.TIPOS_OPERACION:
                for tipo in self.tipos_propiedad:
                    zona_con_tipo = {**zona, "_tipo_actual": tipo}
                    props = self._scrapear_zona_operacion(zona_con_tipo, operacion)
                    todas.extend(props)

        duracion = time.time() - inicio
        self.log.info(f"MITULA/Lamudi completado: {len(todas)} props en {duracion:.1f}s")
        return {
            "portal":            self.nombre_portal,
            "tab_sheets":        self.tab_sheets,
            "propiedades":       todas,
            "total":             len(todas),
            "errores":           len(self._errores),
            "lista_errores":     self._errores,
            "duracion_segundos": duracion,
        }
