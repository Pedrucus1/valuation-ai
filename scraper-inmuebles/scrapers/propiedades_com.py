"""
scrapers/propiedades_com.py — Scraper para propiedades.com

ACCESO (verificado 2026-04-20):
- URL: https://propiedades.com/{slug}/{tipo}-{operacion}
- Usa Chrome CDP (cdp_fetch.js) en lugar de Playwright porque Akamai bloquea
  browsers headless. El Chrome real en puerto 9222 ya tiene cookies válidas.
- Selectores verificados con DevTools en Chrome CDP.

TIPOS DE PROPIEDAD: casas, departamentos, terrenos
"""

import re
import subprocess
import time
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock

# Ruta al helper Node.js que hace fetch via Chrome CDP
_CDP_FETCH_JS = Path(__file__).parent / "cdp_fetch.js"
CDP_PORT = getattr(config, "PROPIEDADES_CDP_PORT", 9222)

# Tipos de propiedad que scrapear (genera URLs separadas por tipo)
TIPOS_PROP_URL = ["casas", "departamentos", "terrenos"]

SELECTORES = {
    # Verificado 2026-04-20 con DevTools en Chrome CDP (propiedades.com Next.js)
    "tarjeta": "section.pcom-property-card",
    # precio: div padre del span.currency → extraído en _extraer_tarjeta por lógica BS4
    "precio": "span.currency",  # marker — usado para localizar el div padre con el precio
    "colonia": ".pcom-property-card-body-main-info-street",
    "titulo": ".pcom-property-card-body-main-info-street h2",
    # amenities ordenados: recámaras, baños, m2_const; context por amenities-label
    "recamaras": "span.amenities-label",  # usado en _extraer_amenities
    "banos": "span.amenities-label",
    "m2": "span.amenities-count",  # usado en _extraer_amenities
    "estac": "span.amenities-label",
    "descripcion": "p",
    "paginacion": "a[aria-label*='iguiente'], a[aria-label*='página'], a[rel='next']",
    "total_resultados": "h1",
}

BASE_URL = "https://propiedades.com"


class PropiedadesComScraper(BaseScraper):

    nombre_portal = "PROPIEDADES_COM"
    tab_sheets = config.TAB_PROPIEDADES_COM
    _usar_concurrencia = False  # CDP: un tab a la vez

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
        # URL — buscar <a> dentro de la tarjeta (link al detalle)
        link = tarjeta.select_one("a.pcom-property-card-body-main-info-street, a[href*='/inmuebles/']")
        href = link.get("href", "") if link else ""
        if not href:
            # fallback: primer <a> con href a detalle
            for a in tarjeta.select("a[href]"):
                h = a.get("href", "")
                if "/inmuebles/" in h or "/propiedad/" in h:
                    href = h
                    break
        if not href:
            return None
        url = href if href.startswith("http") else BASE_URL + href

        # Título
        titulo_tag = tarjeta.select_one(SELECTORES["titulo"])
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""

        # Precio — el div padre del span.currency contiene el texto del precio
        currency_span = tarjeta.select_one("span.currency")
        precio_raw = ""
        if currency_span and currency_span.parent:
            precio_raw = currency_span.parent.get_text(separator="", strip=True).replace("MXN", "").strip()

        # Colonia — del elemento de dirección (contiene "Col. X")
        col_tag = tarjeta.select_one(SELECTORES["colonia"])
        colonia = col_tag.get_text(strip=True) if col_tag else ""

        # Amenities: recámaras, baños, m2, estacionamientos
        recamaras = banos = m2_const = m2_terreno = estac = None
        recamaras, banos, m2_const, estac = self._extraer_amenities(tarjeta)

        # Fallback: regex sobre texto completo
        texto_completo = tarjeta.get_text(separator=" ", strip=True).lower()
        if not recamaras:
            m = re.search(r"(\d+)\s*rec[aá]mara", texto_completo, re.I)
            if m:
                recamaras = m.group(1)
        if not banos:
            m = re.search(r"(\d+)\s*ba[ñn]o", texto_completo, re.I)
            if m:
                banos = m.group(1)
        if not m2_const:
            m = re.search(r"([\d,]+)\s*m[²2]", texto_completo)
            if m:
                m2_const = m.group(1).replace(",", "")
        if not m2_terreno:
            m = re.search(r"([\d,]+)\s*m[²2]\s*(?:lote|terr|total)", texto_completo)
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
            "calle_numero": "",
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

    def _extraer_amenities(self, tarjeta):
        """Extrae recámaras, baños, m2_const, estac usando los data-id de ícono.
        Verificado 2026-04-20: data-id estables en propiedades.com Next.js."""
        def _count_for_icon(icon_id: str) -> Optional[str]:
            icon = tarjeta.select_one(f'[data-id="{icon_id}"]')
            if not icon:
                return None
            li = icon.find_parent("li")
            if not li:
                return None
            count = li.select_one("span.amenities-count")
            return count.get_text(strip=True) if count else None

        recamaras = _count_for_icon("pcom-icon-rooms")
        banos     = _count_for_icon("pcom-icon-bathroom")
        m2_const  = _count_for_icon("pcom-icon-construction-size")
        estac     = _count_for_icon("pcom-icon-parking")
        return recamaras, banos, m2_const, estac

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
    # CDP override via Node.js (evita bloqueo Akamai)
    # ─────────────────────────────────────────

    def _fetch_html(self, url: str, referer: str = None) -> str:
        """Obtiene HTML via Chrome CDP (Node.js). Requiere Chrome con --remote-debugging-port=9222."""
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                antiblock.delay_aleatorio()
                return self._cdp_get(url)
            except ErrorScraping:
                raise
            except Exception as e:
                self.log.warning(f"CDP propiedades.com intento {intento}: {e}")
                time.sleep(8)

        raise ErrorScraping(f"PropiedadesCom CDP falló {config.MAX_RETRIES} veces: {url}")

    def _cdp_get(self, url: str) -> str:
        """Llama a cdp_fetch.js via subprocess para obtener HTML desde Chrome real."""
        try:
            result = subprocess.run(
                ["node", str(_CDP_FETCH_JS), url, str(CDP_PORT)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=45,
            )
        except subprocess.TimeoutExpired:
            raise ErrorScraping(f"CDP timeout para {url}")

        if result.returncode != 0:
            raise ErrorScraping(f"CDP error: {result.stderr.strip()[:200]}")

        html = result.stdout
        if len(html) < 5000:
            raise ErrorScraping(f"CDP respuesta muy corta ({len(html)} bytes): {url}")

        return html
