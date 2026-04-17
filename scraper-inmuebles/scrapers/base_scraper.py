"""
scrapers/base_scraper.py — Clase base abstracta para todos los scrapers.
Implementa la lógica común: reintentos, delays, manejo de errores,
progreso y semáforo de concurrencia.
"""

import time
import threading
import traceback
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional

import requests
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random,
    retry_if_exception_type,
    before_sleep_log,
)
from loguru import logger as _logger

import config
from utils import antiblock
from utils.cleaner import normalizar_propiedad


class ErrorScraping(Exception):
    """Error genérico del scraper."""
    pass


class BaseScraper(ABC):
    """
    Clase base para todos los scrapers.
    Las subclases deben implementar:
    - nombre_portal: str
    - tab_sheets: str
    - obtener_url_listado(zona, operacion, pagina): str
    - extraer_propiedades_pagina(html, zona, operacion): list[dict]
    - obtener_total_paginas(html): int

    Atributos de clase opcionales para subclases:
    - _usar_concurrencia: bool — False para scrapers Playwright (evita multi-browser simultáneo)
    """

    nombre_portal: str = "BASE"
    tab_sheets: str = ""
    # Los scrapers que usan Playwright deben poner esto en False
    # para evitar lanzar múltiples browsers en paralelo con ThreadPoolExecutor.
    _usar_concurrencia: bool = True

    def __init__(self):
        self.log = _logger.bind(portal=self.nombre_portal)
        self.session = self._crear_sesion()
        # Semáforo para limitar requests concurrentes
        self._semaforo = threading.Semaphore(config.MAX_CONCURRENT)
        # Acumulador de propiedades de esta ejecución
        self._propiedades: list[dict] = []
        self._errores: list[str] = []

    def _crear_sesion(self) -> requests.Session:
        """Crea una sesión requests con headers base."""
        s = requests.Session()
        s.headers.update(antiblock.get_headers())
        return s

    # ─────────────────────────────────────────
    # Métodos abstractos que cada portal implementa
    # ─────────────────────────────────────────

    @abstractmethod
    def obtener_url_listado(self, zona: dict, operacion: str, pagina: int) -> str:
        """Construye la URL de la página de listado para una zona/operación/página."""

    @abstractmethod
    def extraer_propiedades_pagina(self, html: str, zona: dict, operacion: str) -> list[dict]:
        """
        Parsea el HTML de una página y retorna lista de dicts crudos.
        Cada dict debe tener al menos: titulo, precio_raw, url_original,
        tipo_operacion, tipo_propiedad, municipio, estado.
        """

    @abstractmethod
    def obtener_total_paginas(self, html: str) -> int:
        """Extrae el número total de páginas del listado desde el HTML."""

    # ─────────────────────────────────────────
    # Descarga de páginas con reintentos
    # ─────────────────────────────────────────

    def _fetch_html(self, url: str, referer: Optional[str] = None) -> str:
        """
        Descarga el HTML de una URL con anti-bloqueo.
        Maneja 429/503 con espera extendida.
        Lanza ErrorScraping si falla MAX_RETRIES veces.
        """
        ultimo_error = None

        for intento in range(1, config.MAX_RETRIES + 1):
            try:
                # Renovar headers con UA aleatorio en cada intento
                self.session.headers.update(antiblock.get_headers(referer=referer))

                with self._semaforo:
                    antiblock.delay_aleatorio()
                    resp = self.session.get(url, timeout=30)

                if resp.status_code == 404:
                    # 404 = ruta no existe en este portal para esta zona/tipo.
                    # No tiene sentido reintentar; devolver HTML vacío = 0 resultados.
                    self.log.info(f"HTTP 404 (sin resultados): {url}")
                    return ""

                if resp.status_code in (429, 503):
                    self.log.warning(
                        f"HTTP {resp.status_code} en {url} (intento {intento}/{config.MAX_RETRIES})"
                    )
                    antiblock.delay_por_error(resp.status_code)
                    continue

                resp.raise_for_status()
                return resp.text

            except requests.RequestException as e:
                ultimo_error = e
                self.log.warning(
                    f"Error en intento {intento}/{config.MAX_RETRIES} para {url}: {e}"
                )
                if intento < config.MAX_RETRIES:
                    antiblock.delay_aleatorio(min_seg=5, max_seg=15)

        raise ErrorScraping(f"Falló después de {config.MAX_RETRIES} intentos: {url} — {ultimo_error}")

    # ─────────────────────────────────────────
    # Scraping de una zona/operación completa
    # ─────────────────────────────────────────

    def _scrapear_zona_operacion(
        self, zona: dict, operacion: str
    ) -> list[dict]:
        """
        Scrapea todas las páginas de una zona y tipo de operación.
        Retorna lista de propiedades normalizadas.
        """
        municipio = zona["municipio"]
        self.log.info(f"Zona: {municipio} | Operación: {operacion}")

        propiedades_zona = []

        try:
            # Primera página para conocer el total de páginas
            url_pag1 = self.obtener_url_listado(zona, operacion, pagina=1)
            html_pag1 = self._fetch_html(url_pag1)
            total_paginas = min(
                self.obtener_total_paginas(html_pag1),
                config.MAX_PAGINAS_POR_ZONA
            )

            if total_paginas == 0:
                self.log.info(f"Sin resultados para {municipio}/{operacion}")
                return []

            self.log.info(f"Total páginas: {total_paginas}")

            # Extraer propiedades de la primera página
            props_p1 = self.extraer_propiedades_pagina(html_pag1, zona, operacion)
            propiedades_zona.extend(props_p1)
            self.log.info(f"Página 1/{total_paginas} — {len(props_p1)} props")

            # Páginas restantes: concurrentes (requests) o secuenciales (Playwright)
            if total_paginas > 1:
                urls_restantes = [
                    (pag, self.obtener_url_listado(zona, operacion, pagina=pag))
                    for pag in range(2, total_paginas + 1)
                ]

                if self._usar_concurrencia:
                    with ThreadPoolExecutor(max_workers=config.MAX_CONCURRENT) as executor:
                        futuros = {
                            executor.submit(self._fetch_html, url, url_pag1): (pag, url)
                            for pag, url in urls_restantes
                        }

                        for futuro in as_completed(futuros):
                            pag, url = futuros[futuro]
                            try:
                                html = futuro.result()
                                props = self.extraer_propiedades_pagina(html, zona, operacion)
                                propiedades_zona.extend(props)
                                self.log.info(
                                    f"Página {pag}/{total_paginas} — "
                                    f"{len(props)} props | "
                                    f"Acumulado: {len(propiedades_zona)}"
                                )
                            except ErrorScraping as e:
                                msg = f"❌ Error en página {pag}: {e}"
                                self.log.error(msg)
                                self._errores.append(msg)
                            except Exception as e:
                                msg = f"❌ Error inesperado en página {pag}: {e}"
                                self.log.error(msg)
                                self._errores.append(msg)
                else:
                    # Secuencial: un browser a la vez (scrapers Playwright)
                    for pag, url in urls_restantes:
                        try:
                            html = self._fetch_html(url, url_pag1)
                            props = self.extraer_propiedades_pagina(html, zona, operacion)
                            propiedades_zona.extend(props)
                            self.log.info(
                                f"Página {pag}/{total_paginas} — "
                                f"{len(props)} props | "
                                f"Acumulado: {len(propiedades_zona)}"
                            )
                        except ErrorScraping as e:
                            msg = f"❌ Error en página {pag}: {e}"
                            self.log.error(msg)
                            self._errores.append(msg)
                        except Exception as e:
                            msg = f"❌ Error inesperado en página {pag}: {e}"
                            self.log.error(msg)
                            self._errores.append(msg)

        except ErrorScraping as e:
            msg = f"❌ Error scrapeando {municipio}/{operacion}: {e}"
            self.log.error(msg)
            self._errores.append(msg)
        except Exception as e:
            msg = f"❌ Error inesperado en {municipio}/{operacion}: {traceback.format_exc()}"
            self.log.error(msg)
            self._errores.append(msg)

        # Normalizar y agregar portal_origen a cada propiedad
        normalizadas = []
        for raw in propiedades_zona:
            try:
                raw.setdefault("portal_origen", self.nombre_portal)
                raw.setdefault("fecha_scraping", datetime.now().isoformat())
                raw.setdefault("activo", True)
                normalizadas.append(normalizar_propiedad(raw))
            except Exception as e:
                self.log.warning(f"No se pudo normalizar propiedad: {e} | raw: {raw}")

        return normalizadas

    # ─────────────────────────────────────────
    # Punto de entrada principal
    # ─────────────────────────────────────────

    def ejecutar(self) -> dict:
        """
        Scrapea todas las zonas y operaciones configuradas.

        Returns:
            dict con estadísticas: portal, total, errores, duracion_segundos
        """
        inicio = time.time()
        self.log.info(f"=== Iniciando {self.nombre_portal} ===")
        todas = []

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
