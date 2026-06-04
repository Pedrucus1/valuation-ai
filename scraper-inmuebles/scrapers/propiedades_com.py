"""
scrapers/propiedades_com.py — Scraper para propiedades.com

ACCESO (verificado 2026-06-01):
- URL: https://propiedades.com/{slug}/{tipo}-{operacion}
- HTTP simple vía Node (plain_fetch.js): un GET con fetch nativo de Node da 200 con el
  __NEXT_DATA__ + tarjetas SSR. NO necesita Chrome/CDP ni proxy. El navegador headless era
  lo que disparaba el reto de Akamai; el `requests` de Python recibe tarpit por TLS, Node no.
- Selectores verificados con DevTools (propiedades.com Next.js).

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

# Helper Node.js que hace fetch HTTP simple (sin Chrome) — pasa Akamai donde requests no.
_PLAIN_FETCH_JS = Path(__file__).parent / "plain_fetch.js"
# (Legacy) Ruta al helper CDP — ya no se usa por defecto, se conserva por compatibilidad.
_CDP_FETCH_JS = Path(__file__).parent / "cdp_fetch.js"
CDP_PORT = getattr(config, "PROPIEDADES_CDP_PORT", 9333)  # Chrome aislado, no el personal 9222 (#105)

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

# Tipos de propiedad scrapeados (clave = valor URL, valor = label normalizado)
TIPOS_URL = {
    "casas":          "casa",
    "departamentos":  "departamento",
    "terrenos":       "terreno",
}


class PropiedadesComScraper(BaseScraper):

    nombre_portal = "PROPIEDADES_COM"
    tab_sheets = config.TAB_PROPIEDADES_COM
    _usar_concurrencia = False  # secuencial: gentil con el sitio (HTTP simple vía Node)
    tipos_propiedad = list(TIPOS_URL.keys())

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        URL formato: https://propiedades.com/{slug}/casas-venta
        Paginación:  https://propiedades.com/{slug}/casas-venta?page=2

        Usa _tipo_actual inyectado por el scheduler (mismo patrón que INMUEBLES24).
        """
        tipo = zona.get("_tipo_actual", "casas")
        slug = zona.get("slug_propiedades", zona["municipio"].lower().replace(" ", "-"))
        op = "venta" if operacion == "venta" else "renta"
        base = f"{BASE_URL}/{slug}/{tipo}-{op}"
        if pagina > 1:
            return f"{base}?page={pagina}"
        return base

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

        # Título — h2 con texto completo de la dirección
        titulo_tag = tarjeta.select_one(SELECTORES["titulo"])
        titulo = titulo_tag.get_text(separator=" ", strip=True) if titulo_tag else ""

        # Precio — div padre del span.currency
        currency_span = tarjeta.select_one("span.currency")
        precio_raw = ""
        if currency_span and currency_span.parent:
            precio_raw = currency_span.parent.get_text(separator="", strip=True).replace("MXN", "").strip()

        # Colonia — usar itemprop="streetAddress" que tiene el campo exacto
        # Ejemplo: "Av Circunvalación 870, Col. Jardines Alcalde"
        street_tag = tarjeta.select_one('[itemprop="streetAddress"]')
        colonia = ""
        if street_tag:
            street_text = street_tag.get("content", "") or street_tag.get_text(strip=True)
            # Extraer "Col. X" del string de dirección
            m_col = re.search(r'\bCol\.?\s+([^,\n]+)', street_text, re.I)
            colonia = m_col.group(1).strip() if m_col else street_text.split(",")[-1].strip()
        if not colonia:
            # Fallback: itemprop="addressLocality" = municipio, buscar en texto completo de tarjeta
            m_col = re.search(r'\bCol\.?\s+([^,\n]{3,40})', tarjeta.get_text(separator=" "), re.I)
            colonia = m_col.group(1).strip() if m_col else ""

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
    # Fetch via Node (plain_fetch.js) — HTTP simple, SIN Chrome/CDP
    # ─────────────────────────────────────────
    # propiedades.com responde 200 con el __NEXT_DATA__ + tarjetas SSR a un GET simple, PERO
    # el `requests` de Python recibe tarpit de Akamai por fingerprint TLS (read timeout). El fetch
    # nativo de Node sí pasa → se delega a plain_fetch.js por subprocess. Verificado 01-Jun-2026.
    # La antigüedad (`age`) vive en el __NEXT_DATA__ de cada página de DETALLE.

    def _fetch_html(self, url: str, referer: str = None) -> str:
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                antiblock.delay_aleatorio()
                return self._node_get(url)
            except ErrorScraping:
                raise
            except Exception as e:
                self.log.warning(f"propiedades.com intento {intento}: {e}")
                time.sleep(8)

        raise ErrorScraping(f"PropiedadesCom falló {config.MAX_RETRIES} veces: {url}")

    def _node_get(self, url: str) -> str:
        """Llama a plain_fetch.js (fetch nativo de Node) via subprocess. Sin Chrome ni CDP.
        El HTML se pasa por archivo temporal (no stdout) para evitar el assertion de libuv en Windows."""
        import tempfile, os
        fd, tmp = tempfile.mkstemp(suffix=".html", prefix="pcom_")
        os.close(fd)
        try:
            result = subprocess.run(
                ["node", str(_PLAIN_FETCH_JS), url, tmp],
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=60,
            )
            # El HTML se escribe (sync) ANTES del exit de Node. Un assertion de libuv al salir
            # (returncode != 0) NO invalida el archivo → leerlo primero y validar por tamaño.
            try:
                with open(tmp, "r", encoding="utf-8") as f:
                    html = f.read()
            except OSError:
                html = ""
            if len(html) >= 5000:
                return html
            if result.returncode != 0:
                raise ErrorScraping(f"plain_fetch error: {result.stderr.strip()[:200]}")
            raise ErrorScraping(f"plain_fetch respuesta muy corta ({len(html)} bytes): {url}")
        except subprocess.TimeoutExpired:
            raise ErrorScraping(f"plain_fetch timeout para {url}")
        finally:
            try:
                os.remove(tmp)
            except OSError:
                pass
