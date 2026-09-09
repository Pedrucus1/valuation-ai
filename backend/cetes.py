"""
Tasa CETES 28 días. Cascada de fuentes:
1) API SIE de Banxico (requiere token gratuito BANXICO_TOKEN: https://www.banxico.org.mx/SieAPIRest/service/v1/token)
2) Gemini (GEMINI_API_KEY) como fallback intermedio, con validación anti-alucinación
3) Valor de referencia fijo (misma UX de antes)
"""
import os
import re
import json
import time
import logging
import requests

logger = logging.getLogger(__name__)

BANXICO_TOKEN = os.getenv("BANXICO_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SERIE_CETES_28D = "SF43936"  # CETES 28 días, tasa de rendimiento
FALLBACK_RATE = 10.0
CACHE_TTL_SECONDS = 24 * 3600

# Rango plausible para CETES 28d en México (evita que una alucinación de la IA pase como dato real)
RATE_MIN, RATE_MAX = 3.0, 20.0

_cache = {"rate": None, "date": None, "live": False, "source": None, "fetched_at": 0}


def _fetch_banxico():
    """Devuelve (rate, date) o None si falla o no hay token."""
    if not BANXICO_TOKEN:
        return None
    try:
        url = (
            f"https://www.banxico.org.mx/SieAPIRest/service/v1/series/"
            f"{SERIE_CETES_28D}/datos/oportuno?token={BANXICO_TOKEN}"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        dato = resp.json()["bmx"]["series"][0]["datos"][0]
        rate = float(dato["dato"])
        fecha = dato["fecha"]  # ya viene DD/MM/YYYY
        return (rate, fecha)
    except Exception as e:
        logger.warning(f"CETES Banxico fetch falló: {e}")
        return None


def _fetch_gemini():
    """Pregunta a Gemini la tasa CETES 28d vigente. Devuelve (rate, date) o None si no es confiable."""
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction="Eres un asistente financiero que conoce las tasas de referencia de México."
        )
        prompt = (
            "¿Cuál es la tasa de rendimiento vigente de los CETES a 28 días en México? "
            "Responde ÚNICAMENTE con un JSON de la forma "
            '{"rate": <número, ej 10.45>, "date": "<fecha de la subasta más reciente que conozcas, DD/MM/YYYY, o null si no la sabes>"}. '
            "Si no tienes certeza del dato actual, pon tu mejor estimación reciente en rate y null en date. "
            "No agregues texto fuera del JSON."
        )
        result = model.generate_content(prompt)
        text = (result.text or "").strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            logger.warning(f"CETES Gemini: respuesta sin JSON parseable: {text[:200]}")
            return None
        data = json.loads(match.group(0))
        rate = float(data.get("rate"))
        fecha = data.get("date") or None

        if not (RATE_MIN <= rate <= RATE_MAX):
            logger.warning(f"CETES Gemini: rate fuera de rango plausible ({rate}), descartado")
            return None

        # Anti-alucinación de fecha: solo se usa como "dato con fecha" si parece reciente (año actual o anterior)
        if fecha:
            year_match = re.search(r"(\d{4})", fecha)
            current_year = time.gmtime().tm_year
            if not year_match or not (current_year - 1 <= int(year_match.group(1)) <= current_year):
                fecha = None

        return (rate, fecha)
    except Exception as e:
        logger.warning(f"CETES Gemini fetch falló: {e}")
        return None


def get_cetes_rate() -> dict:
    """Devuelve {rate, date, live, source}. `date` es la fecha del dato (DD/MM/YYYY) o None.
    `source` es "banxico" | "gemini" | "fallback"."""
    now = time.time()
    if _cache["rate"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return {"rate": _cache["rate"], "date": _cache["date"], "live": _cache["live"], "source": _cache["source"]}

    banxico = _fetch_banxico()
    if banxico is not None:
        rate, fecha = banxico
        _cache.update(rate=rate, date=fecha, live=True, source="banxico", fetched_at=now)
        return {"rate": rate, "date": fecha, "live": True, "source": "banxico"}

    gemini = _fetch_gemini()
    if gemini is not None:
        rate, fecha = gemini
        _cache.update(rate=rate, date=fecha, live=True, source="gemini", fetched_at=now)
        return {"rate": rate, "date": fecha, "live": True, "source": "gemini"}

    _cache.update(rate=FALLBACK_RATE, date=None, live=False, source="fallback", fetched_at=now)
    return {"rate": FALLBACK_RATE, "date": None, "live": False, "source": "fallback"}
