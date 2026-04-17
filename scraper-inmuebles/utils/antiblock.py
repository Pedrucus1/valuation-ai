"""
utils/antiblock.py — Técnicas anti-bloqueo para el scraper.
Maneja delays aleatorios, rotación de User-Agents y headers realistas.
"""

import random
import time
import asyncio
from typing import Optional
from loguru import logger

# ─────────────────────────────────────────
# Pool de User-Agents reales (Chrome, Firefox, Safari)
# ─────────────────────────────────────────
USER_AGENTS = [
    # Chrome en Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    # Chrome en Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # Firefox en Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    # Firefox en Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
    # Safari en Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    # Chrome en Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Viewports realistas (ancho x alto)
VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1366, "height": 768},
    {"width": 1280, "height": 800},
    {"width": 1280, "height": 1024},
]


def get_user_agent() -> str:
    """Retorna un User-Agent aleatorio del pool."""
    return random.choice(USER_AGENTS)


def get_viewport() -> dict:
    """Retorna dimensiones de pantalla aleatorias."""
    return random.choice(VIEWPORTS)


def get_headers(referer: Optional[str] = None) -> dict:
    """
    Construye headers HTTP realistas para requests.

    Args:
        referer: URL de referencia (simula navegación desde otro link)
    """
    ua = get_user_agent()
    es_firefox = "Firefox" in ua

    headers = {
        "User-Agent": ua,
        "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none" if not referer else "same-origin",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }

    if es_firefox:
        headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        headers["TE"] = "trailers"
    else:
        # Chrome
        headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        headers["sec-ch-ua"] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"'
        headers["sec-ch-ua-mobile"] = "?0"
        headers["sec-ch-ua-platform"] = '"Windows"'

    if referer:
        headers["Referer"] = referer

    return headers


def delay_aleatorio(min_seg: Optional[float] = None, max_seg: Optional[float] = None):
    """
    Pausa sincrónica con tiempo aleatorio entre requests.
    Usa los valores del .env si no se especifican.
    """
    import config
    min_s = min_seg if min_seg is not None else config.SCRAPING_DELAY_MIN
    max_s = max_seg if max_seg is not None else config.SCRAPING_DELAY_MAX
    espera = random.uniform(min_s, max_s)
    time.sleep(espera)


async def delay_aleatorio_async(min_seg: Optional[float] = None, max_seg: Optional[float] = None):
    """Versión asíncrona del delay aleatorio."""
    import config
    min_s = min_seg if min_seg is not None else config.SCRAPING_DELAY_MIN
    max_s = max_seg if max_seg is not None else config.SCRAPING_DELAY_MAX
    espera = random.uniform(min_s, max_s)
    await asyncio.sleep(espera)


def delay_por_error(codigo_http: int):
    """
    Espera extendida cuando el servidor devuelve 429 o 503.
    Entre 45 y 90 segundos, como indica la especificación.
    """
    if codigo_http in (429, 503):
        espera = random.uniform(45, 90)
        logger.warning(f"HTTP {codigo_http} recibido. Esperando {espera:.0f}s antes de reintentar...")
        time.sleep(espera)
    else:
        # Para otros errores, espera corta
        time.sleep(random.uniform(5, 15))


def simular_scroll_aleatorio(page) -> None:
    """
    Simula scroll humano en Playwright para activar lazy loading.
    Se llama después de cargar una página.

    Args:
        page: objeto Page de Playwright
    """
    # Scroll gradual hacia abajo
    for _ in range(random.randint(3, 6)):
        scroll_y = random.randint(300, 700)
        page.evaluate(f"window.scrollBy(0, {scroll_y})")
        time.sleep(random.uniform(0.3, 0.8))

    # Volver al inicio
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(random.uniform(0.2, 0.5))
