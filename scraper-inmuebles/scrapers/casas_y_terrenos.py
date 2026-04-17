"""
scrapers/casas_y_terrenos.py — Scraper para casasyterrenos.com
Usa la API interna de MeiliSearch (prod-search.casasyterrenos.com).
Sin Playwright — requests directo a la API de búsqueda.

Credenciales públicas embebidas en el JS del sitio.
Si dejan de funcionar: inspeccionar _app-*.js en /_next/static/chunks/pages/
y buscar "MeiliSearch" para obtener host y apiKey nuevos.
"""

import time
from typing import Optional

import requests

import config
from scrapers.base_scraper import BaseScraper, ErrorScraping
from utils import antiblock
from utils.cleaner import normalizar_propiedad

MEILISEARCH_HOST = "https://prod-search.casasyterrenos.com"
MEILISEARCH_KEY  = "3e245d64c60ffb41c81c6e9e36d92cb6da5c15b9c8c09719f3da3fd7a9dd384f"
MEILISEARCH_INDEX = "properties"
BASE_URL = "https://www.casasyterrenos.com"

# Resultados por página — máximo permitido por MeiliSearch es 1000 sin configuración extra
HITS_POR_PAGINA = 100


class CasasYTerrenosScraper(BaseScraper):

    nombre_portal = "CASAS_Y_TERRENOS"
    tab_sheets = config.TAB_CASAS_Y_TERRENOS
    _usar_concurrencia = True  # Ya no usa Playwright, puede correr en paralelo

    def __init__(self):
        super().__init__()
        self._ms_session = requests.Session()
        self._ms_session.headers.update({
            "Authorization": f"Bearer {MEILISEARCH_KEY}",
            "Content-Type": "application/json",
        })

    # ── Métodos requeridos por BaseScraper (no se usan con override de ejecutar) ──

    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        # No se usa — el scraper llama a MeiliSearch directamente
        return ""

    def obtener_total_paginas(self, html: str) -> int:
        return 1

    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        return []

    # ── Override principal ────────────────────────────────────────────────────

    def ejecutar(self) -> dict:
        inicio = time.time()
        self.log.info(f"=== Iniciando {self.nombre_portal} ===")
        todas = []

        for zona in config.ZONAS:
            for operacion in config.TIPOS_OPERACION:
                props = self._scrapear_zona(zona, operacion)
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

    def _scrapear_zona(self, zona: dict, operacion: str) -> list[dict]:
        municipio = zona["municipio"]
        self.log.info(f"Zona: {municipio} | Operación: {operacion}")

        filtro_op = "isSale = true" if operacion == "venta" else "isRent = true"
        filtros = [f'municipality = "{municipio}"', filtro_op]

        propiedades = []
        offset = 0
        pagina = 1
        total_estimado = None

        while True:
            hits, total_estimado = self._buscar_pagina(filtros, offset)

            if hits is None:
                break

            if total_estimado is not None and pagina == 1:
                paginas_estimadas = (total_estimado + HITS_POR_PAGINA - 1) // HITS_POR_PAGINA
                paginas_estimadas = min(paginas_estimadas, config.MAX_PAGINAS_POR_ZONA)
                self.log.info(
                    f"Total hits: {total_estimado} | "
                    f"Páginas estimadas: {paginas_estimadas}"
                )

            for hit in hits:
                raw = self._normalizar_hit(hit, zona, operacion)
                if raw:
                    propiedades.append(normalizar_propiedad(raw))

            self.log.info(f"Página {pagina} — {len(hits)} hits | Acum: {len(propiedades)}")

            if len(hits) < HITS_POR_PAGINA:
                break
            if total_estimado and offset + HITS_POR_PAGINA >= total_estimado:
                break
            if pagina >= config.MAX_PAGINAS_POR_ZONA:
                break

            offset += HITS_POR_PAGINA
            pagina += 1
            # Pausa normal entre páginas
            antiblock.delay_aleatorio(min_seg=2, max_seg=5)
            # Pausa larga cada 10 páginas
            if pagina % 10 == 0:
                self.log.debug(f"Pausa larga en página {pagina}...")
                antiblock.delay_aleatorio(min_seg=10, max_seg=20)

        return propiedades

    def _buscar_pagina(self, filtros: list, offset: int) -> tuple[Optional[list], Optional[int]]:
        payload = {
            "q": "",
            "filter": filtros,
            "limit": HITS_POR_PAGINA,
            "offset": offset,
        }
        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                r = self._ms_session.post(
                    f"{MEILISEARCH_HOST}/indexes/{MEILISEARCH_INDEX}/search",
                    json=payload,
                    timeout=15,
                )
                r.raise_for_status()
                d = r.json()
                return d.get("hits", []), d.get("estimatedTotalHits")
            except Exception as e:
                self.log.warning(f"Error MeiliSearch intento {intento}: {e}")
                antiblock.delay_aleatorio(min_seg=3, max_seg=8)

        self._errores.append(f"MeiliSearch falló {config.MAX_RETRIES} veces: offset={offset}")
        return None, None

    def _normalizar_hit(self, hit: dict, zona: dict, operacion: str) -> Optional[dict]:
        # URL
        slugs = hit.get("slugs", {})
        slug_path = slugs.get("venta" if operacion == "venta" else "renta", "") or hit.get("canonical", "")
        if not slug_path:
            return None
        url = BASE_URL + slug_path

        # Precio
        if operacion == "venta":
            precio_num = hit.get("priceSale", 0)
        else:
            precio_num = hit.get("priceRent", 0)
            try:
                precio_num = float(precio_num) if precio_num else 0
            except (ValueError, TypeError):
                precio_num = 0

        moneda = hit.get("currency", "MXN")
        precio_raw = f"${precio_num:,.0f} {moneda}" if precio_num else ""

        # m²
        m2_const = hit.get("construction") or None
        m2_terreno = hit.get("surface") or None
        if m2_const == 0.0:
            m2_const = None
        if m2_terreno == 0.0:
            m2_terreno = None

        return {
            "titulo": hit.get("name", ""),
            "precio_raw": precio_raw,
            "tipo_operacion": operacion,
            "tipo_propiedad": hit.get("type", "").lower() or "casa",
            "colonia": hit.get("neighborhood", ""),
            "municipio": zona["municipio"],
            "estado": zona["estado"],
            "recamaras": str(hit["rooms"]) if hit.get("rooms") else None,
            "banos": str(hit["bathrooms"]) if hit.get("bathrooms") else None,
            "m2_construccion": str(m2_const) if m2_const else None,
            "m2_terreno": str(m2_terreno) if m2_terreno else None,
            "estacionamientos": str(hit["parkingLots"]) if hit.get("parkingLots") else None,
            "descripcion": "",
            "url_original": url,
        }
