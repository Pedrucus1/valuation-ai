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


def _guardar_en_mercado(comps_ctx: list, enriched: dict):
    """Flywheel: upsert a mercado_props de los comps web ya enriquecidos.
    comps_ctx: lista de dicts con {url, precio, colonia, municipio, tipo, portal}.
    enriched: {url: {campos extraídos}}. Solo guarda los que se enriquecieron."""
    try:
        import os
        from datetime import datetime, timezone
        from dotenv import load_dotenv
        from pymongo import MongoClient
        from utils.cleaner import generar_id_unico
        load_dotenv()
        col = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"),
                          serverSelectionTimeoutMS=15000, retryWrites=True)[
                          os.getenv("DB_NAME", "propvalu")]["mercado_props"]
        n = 0
        for cx in comps_ctx:
            url = (cx.get("url") or "").strip()
            ed = enriched.get(url)
            if not (url.startswith("http") and ed):
                continue
            uid = generar_id_unico(url)   # mismo esquema que el scraper → sin duplicados
            # $set SOLO datos de detalle (hechos de la página, refrescables).
            set_doc = {k: v for k, v in ed.items() if v is not None}
            set_doc["enriched_at"] = datetime.now(timezone.utc).isoformat()
            # $setOnInsert: contexto del comp web — solo si es doc NUEVO; NUNCA pisa
            # colonia/precio de un doc de scrape existente.
            on_insert = {
                "id_unico": uid, "url_original": url,
                "portal_origen": (inferir_portal_por_url(url) or cx.get("portal") or "WEB"),
                "precio": cx.get("precio"), "colonia": cx.get("colonia"),
                "municipio": cx.get("municipio"), "tipo_propiedad": cx.get("tipo"),
                "tipo_operacion": "venta", "origen_dato": "web_enriquecido",
                "importado_at": datetime.now(timezone.utc).isoformat(), "activo": True,
            }
            on_insert = {k: v for k, v in on_insert.items() if v is not None}
            col.update_one({"id_unico": uid},
                           {"$set": set_doc, "$setOnInsert": on_insert}, upsert=True)
            n += 1
        return n
    except Exception:
        return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deadline", type=float, default=25.0)
    parser.add_argument("--save", action="store_true",
                        help="Hacer upsert de los comps enriquecidos a mercado_props (flywheel)")
    args = parser.parse_args()
    try:
        items = json.load(sys.stdin)
        if not isinstance(items, list):
            items = []
    except Exception:
        items = []
    # stdin acepta: lista de URLs (strings) o lista de objetos {url, precio, colonia, ...}
    comps_ctx = [it for it in items if isinstance(it, dict) and it.get("url")]
    if comps_ctx:
        urls = [it["url"] for it in comps_ctx]
    else:
        urls = [it for it in items if isinstance(it, str)]
    urls = [u for u in urls if isinstance(u, str) and u.startswith("http")]
    res = enriquecer(urls, args.deadline)
    if args.save and comps_ctx:
        _guardar_en_mercado(comps_ctx, res)
    sys.stdout.write(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
