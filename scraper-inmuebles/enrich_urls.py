"""enrich_urls.py — Enriquecimiento bajo demanda de URLs de comparables.

Uso (subprocess desde el backend):
    echo '["url1","url2",...]' | python enrich_urls.py [--deadline 25]

Lee una lista JSON de URLs por stdin, abre cada página de detalle (reusando el
extractor del enricher), y devuelve por stdout un JSON {url: {campos}} con los
datos extraíbles (anio_construccion, m2_*, recamaras, banos, estacionamientos,
telefono, inmobiliaria, nombre_agente, email_agente).

Diseño para uso INLINE en el avalúo:
- Portales rápidos (requests/node): PROPIEDADES_COM, CASAS_Y_TERRENOS, PINCALI, MITULA.
- Portales lentos (Playwright, protegidos): INMUEBLES24, VIVANUNCIOS — se procesan
  pero pueden no caber en el deadline; lo que no termina se omite (el backend usa
  el dato del snippet y el flywheel los completa después en background).
- Deadline duro global: nunca colgar el avalúo.

NO escribe en Mongo: el backend tiene el contexto del comparable (precio/colonia)
y decide el upsert a mercado_props.
"""
import sys
import json
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
from enricher import fetch_detalle, extraer_datos_detalle, inferir_portal_por_url, PORTALES_PLAYWRIGHT

CAMPOS_SALIDA = ["anio_construccion", "m2_construccion", "m2_terreno", "recamaras",
                 "banos", "estacionamientos", "telefono", "inmobiliaria",
                 "nombre_agente", "email_agente"]


def _enriquecer_una(url: str) -> tuple[str, dict]:
    """Abre una URL y devuelve (url, dict de campos extraídos). Nunca lanza."""
    try:
        portal = inferir_portal_por_url(url)
        if not portal:
            return url, {}
        session = requests.Session()
        html = fetch_detalle(url, portal, session)
        if not html:
            return url, {}
        datos = extraer_datos_detalle(html, portal) or {}
        out = {}
        # mapear año_construccion (ñ) → anio_construccion (canónico ascii)
        if datos.get("año_construccion") is not None:
            out["anio_construccion"] = datos["año_construccion"]
        for k in ("m2_construccion", "m2_terreno", "recamaras", "banos",
                  "estacionamientos", "telefono", "inmobiliaria",
                  "nombre_agente", "email_agente"):
            if datos.get(k) is not None:
                out[k] = datos[k]
        return url, out
    except Exception:
        return url, {}


def enriquecer(urls: list[str], deadline: float = 25.0) -> dict:
    """Enriquece URLs en paralelo con deadline global. Devuelve {url: {campos}}."""
    resultado = {}
    if not urls:
        return resultado
    # priorizar portales rápidos primero (los lentos van al final, por si no caben)
    rapidas = [u for u in urls if (inferir_portal_por_url(u) or "") not in PORTALES_PLAYWRIGHT]
    lentas = [u for u in urls if (inferir_portal_por_url(u) or "") in PORTALES_PLAYWRIGHT]
    ordenadas = rapidas + lentas

    with ThreadPoolExecutor(max_workers=5) as ex:
        futuros = {ex.submit(_enriquecer_una, u): u for u in ordenadas}
        try:
            for fut in as_completed(futuros, timeout=deadline):
                url, datos = fut.result()
                if datos:
                    resultado[url] = datos
        except TimeoutError:
            # se acabó el deadline; devolvemos lo que sí terminó
            pass
    return resultado


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deadline", type=float, default=25.0)
    args = parser.parse_args()
    try:
        urls = json.load(sys.stdin)
        if not isinstance(urls, list):
            urls = []
    except Exception:
        urls = []
    res = enriquecer([u for u in urls if isinstance(u, str) and u.startswith("http")], args.deadline)
    sys.stdout.write(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
