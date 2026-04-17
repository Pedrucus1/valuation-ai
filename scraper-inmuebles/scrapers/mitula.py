"""
scrapers/mitula.py — Scraper para mitula.com.mx
Usa requests + BeautifulSoup. Mitula es un portal agregador
con HTML relativamente estático.

NOTA SOBRE SELECTORES:
Mitula puede variar entre casas.mitula.mx y mitula.com.mx.
Si los selectores fallan, inspeccionar el HTML y actualizar SELECTORES.
"""

import base64
import re
import time
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping

# Mitula fue absorbida por Lamudi. Intentamos Mitula primero y si redirige
# a Lamudi usamos los selectores de Lamudi automáticamente.
BASE_URL = "https://casas.mitula.mx"
BASE_URL_LAMUDI = "https://www.lamudi.com.mx"

SELECTORES_MITULA = {
    "tarjeta": "article.listing-card",
    "titulo": "h2.item-title a, h2 a",
    "precio": "b.item-price, span.price, p.item-price",
    "tipo_propiedad": "span.item-type, span.type-badge",
    "colonia": "span.item-locality, p.location, span[class*=location]",
    "descripcion": "p.item-description, div.item-body",
    "link": "a[href*='/adform/'], a[href*='/ad/'], a[href*='/propiedad/'], h2.item-title a, a[href]",
    "paginacion": "a[rel='next'], a[data-cy='pagination-next'], li.pagination-next a",
    "total_resultados": "h1",
}

# Selectores de Lamudi.com.mx (estructura propia)
SELECTORES_LAMUDI = {
    "tarjeta": "div[class*=ListingCell], article[class*=listing], div[class*=listing-card]",
    "titulo": "h3, h2, span[class*=title]",
    "precio": "span[class*=price], div[class*=price], p[class*=price]",
    "tipo_propiedad": "span[class*=type], span[class*=badge]",
    "colonia": "span[class*=location], div[class*=address], p[class*=location]",
    "descripcion": "div[class*=description], p[class*=desc]",
    "link": "a[href*='/propiedad/'], a[href*='/inmueble/'], h3 a, h2 a, div[class*=listing] a",
    "paginacion": "a[rel='next'], a[aria-label='Next'], li.next a, button[aria-label*='siguiente']",
    "total_resultados": "h1, div[class*=results] span",
}

SELECTORES = SELECTORES_MITULA  # se sobreescribe si detectamos redirect a Lamudi

# Solo /casas/ responde 200 — los demás paths dan 404
_TIPOS_PATH = ["casas"]


class MitulaScraper(BaseScraper):

    nombre_portal = "MITULA"
    tab_sheets = config.TAB_MITULA

    def __init__(self):
        super().__init__()
        self._tipo_path = "casas"  # cambia dinámicamente en ejecutar()
        self._base_url_real = BASE_URL   # puede cambiar a Lamudi si hay redirect
        self._selectores = SELECTORES_MITULA
        self._redirect_detectado = False

    def _fetch_html(self, url: str, referer: str = None) -> str:
        """Override: detecta redirect a Lamudi y ajusta selectores automáticamente."""
        try:
            resp = self.session.get(url, timeout=20, allow_redirects=True)
            url_final = resp.url

            if not self._redirect_detectado and "lamudi" in url_final:
                self.log.warning(
                    f"Mitula redirige a Lamudi: {url_final}. "
                    f"Cambiando a selectores de Lamudi."
                )
                self._redirect_detectado = True
                self._base_url_real = BASE_URL_LAMUDI
                self._selectores = SELECTORES_LAMUDI

            resp.raise_for_status()
            return resp.text
        except Exception as e:
            raise ErrorScraping(f"Error fetch Mitula/Lamudi {url}: {e}")

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """
        URL ejemplo:
        https://casas.mitula.mx/casas/venta-guadalajara
        https://casas.mitula.mx/casas/venta-guadalajara-2
        También: /departamentos/venta-guadalajara, /terrenos/venta-guadalajara, etc.
        """
        slug = zona.get("slug_mitula", zona["municipio"].lower().replace(" ", "-"))
        op = "venta" if operacion == "venta" else "renta"
        if pagina > 1:
            return f"{BASE_URL}/{self._tipo_path}/{op}-{slug}-{pagina}"
        return f"{BASE_URL}/{self._tipo_path}/{op}-{slug}"

    def ejecutar(self) -> dict:
        """Override: itera sobre múltiples tipos de propiedad además de zonas/operaciones."""
        inicio = time.time()
        self.log.info(f"=== Iniciando {self.nombre_portal} ===")
        todas = []

        for tipo in _TIPOS_PATH:
            self._tipo_path = tipo
            self.log.info(f"--- Tipo: {tipo} ---")
            for zona in config.ZONAS:
                for operacion in config.TIPOS_OPERACION:
                    props = self._scrapear_zona_operacion(zona, operacion)
                    todas.extend(props)

        duracion = time.time() - inicio
        self.log.info(
            f"✅ {self.nombre_portal} completado: "
            f"{len(todas)} propiedades en {duracion:.1f}s"
        )

        return {
            "portal": self.nombre_portal,
            "tab_sheets": self.tab_sheets,
            "propiedades": todas,
            "total": len(todas),
            "errores": len(self._errores),
            "lista_errores": self._errores,
            "duracion_segundos": duracion,
        }

    def obtener_total_paginas(self, html: str) -> int:
        soup = BeautifulSoup(html, "lxml")
        sel = self._selectores

        try:
            total_tag = soup.select_one(sel["total_resultados"])
            if total_tag:
                match = re.search(r"([\d,]+)", total_tag.get_text())
                if match:
                    total = int(match.group(1).replace(",", ""))
                    if total > 0:
                        return min(total // 25 + 1, config.MAX_PAGINAS_POR_ZONA)

            btn = soup.select_one(sel["paginacion"])
            if btn:
                return min(15, config.MAX_PAGINAS_POR_ZONA)

        except (ValueError, AttributeError):
            pass

        tarjetas = soup.select(sel["tarjeta"])
        if not tarjetas:
            titulo_str = soup.title.string[:80] if soup.title else "N/A"
            # Dump primeras clases de elementos para encontrar el selector correcto
            clases = [
                f"{tag.name}.{' '.join(tag.get('class', []))[:40]}"
                for tag in soup.select("article, div[class*=card], div[class*=listing], div[class*=property]")[:5]
            ]
            self.log.warning(
                f"0 tarjetas. Título: '{titulo_str}'. "
                f"Elementos candidatos: {clases}"
            )
        return 1 if tarjetas else 0

    def extraer_propiedades_pagina(
        self, html: str, zona: dict, operacion: str
    ) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        tarjetas = soup.select(self._selectores["tarjeta"])
        propiedades = []

        if not tarjetas:
            titulo_str = soup.title.string[:80] if soup.title else "N/A"
            candidatos = [
                f"{t.name}[{' '.join(t.get('class', []))[:60]}]"
                for t in soup.select("article, li[class], div[class*=card], div[class*=listing], div[class*=result], div[class*=property]")[:6]
            ]
            links = [(a.get("href", ""))[:70] for a in soup.select("a[href]") if "/casa" in a.get("href","") or "/propiedad" in a.get("href","") or "/ad/" in a.get("href","")][:5]
            self.log.warning(
                f"0 tarjetas con '{self._selectores['tarjeta']}'. "
                f"Título: '{titulo_str}' | Candidatos: {candidatos} | Links prop: {links}"
            )

        for tarjeta in tarjetas:
            try:
                prop = self._extraer_tarjeta(tarjeta, zona, operacion)
                if prop and prop.get("url_original"):
                    propiedades.append(prop)
            except Exception as e:
                self.log.debug(f"Error en tarjeta Mitula/Lamudi: {e}")

        if tarjetas and not propiedades:
            self.log.warning(
                f"{len(tarjetas)} tarjetas encontradas pero 0 props extraídos. "
                f"HTML primera tarjeta: {str(tarjetas[0])[:400]}"
            )

        return propiedades

    def _extraer_tarjeta(self, tarjeta, zona: dict, operacion: str) -> Optional[dict]:
        sel = self._selectores
        base = self._base_url_real

        # URL — intentar selector CSS primero, luego data-clickdestination (base64)
        link_tag = tarjeta.select_one(sel["link"])
        if not link_tag:
            link_tag = tarjeta if tarjeta.name == "a" else None

        href = link_tag.get("href", "") if link_tag else ""
        url = urljoin(base, href) if href else ""

        # Fallback: data-clickdestination es el path codificado en base64
        if not url:
            dest = tarjeta.get("data-clickdestination", "")
            if dest:
                try:
                    # Añadir padding si hace falta
                    padding = 4 - len(dest) % 4
                    padded = dest + ("=" * padding) if padding != 4 else dest
                    path = base64.b64decode(padded).decode("utf-8").split("?")[0]
                    url = urljoin(base, path)
                except Exception as e:
                    self.log.debug(f"Error decodificando data-clickdestination: {e} | valor: {dest[:60]}")

        if not url:
            return None

        # Título
        titulo_tag = tarjeta.select_one(sel["titulo"])
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else (link_tag.get_text(strip=True) if link_tag else "")

        # Precio — preferir data-price (Mitula), luego selector CSS (Lamudi)
        precio_raw = ""
        if tarjeta.get("data-price"):
            moneda = tarjeta.get("data-currency", "MXN")
            precio_raw = f"${tarjeta['data-price']} {moneda}"
        else:
            precio_tag = tarjeta.select_one(sel["precio"])
            if precio_tag:
                precio_raw = precio_tag.get_text(strip=True)

        # m² — preferir data-floorarea (Mitula), luego texto
        m2_const = None
        if tarjeta.get("data-floorarea"):
            num = re.search(r"[\d.]+", tarjeta["data-floorarea"])
            if num:
                m2_const = num.group()

        # Tipo
        tipo_tag = tarjeta.select_one(sel["tipo_propiedad"])
        tipo = tipo_tag.get_text(strip=True) if tipo_tag else ""

        # Colonia — preferir data-location (Mitula), luego selector (Lamudi)
        colonia = tarjeta.get("data-location", "")
        if not colonia:
            col_tag = tarjeta.select_one(sel["colonia"])
            colonia = col_tag.get_text(strip=True) if col_tag else ""

        # Atributos desde lista (recámaras, baños, estac si data-floorarea no los tiene)
        recamaras = banos = estac = None
        texto_completo = tarjeta.get_text(separator=" ", strip=True).lower()

        m = re.search(r"(\d+)\s*(?:rec[aá]mara|dorm|hab|cuarto|bedroom)", texto_completo, re.I)
        if m:
            recamaras = m.group(1)

        m = re.search(r"(\d+)\s*(?:baño|bano|bathroom|bath)", texto_completo, re.I)
        if m:
            banos = m.group(1)

        m = re.search(r"(\d+)\s*(?:estac|garage|parking)", texto_completo, re.I)
        if m:
            estac = m.group(1)

        # Si no hay m2 de data-floorarea, buscar en texto
        if not m2_const:
            m = re.search(r"([\d,]+)\s*m[²2²]", texto_completo)
            if m:
                m2_const = m.group(1).replace(",", "")

        # Descripción
        desc_tag = tarjeta.select_one(SELECTORES["descripcion"])
        descripcion = desc_tag.get_text(strip=True) if desc_tag else ""

        return {
            "titulo": titulo,
            "precio_raw": precio_raw,
            "tipo_operacion": operacion,
            "tipo_propiedad": tipo or titulo,
            "colonia": colonia,
            "municipio": zona["municipio"],
            "estado": zona["estado"],
            "recamaras": recamaras,
            "banos": banos,
            "m2_construccion": m2_const,
            "m2_terreno": None,   # No disponible en listado
            "estacionamientos": estac,
            "descripcion": descripcion,
            "url_original": url,
        }
