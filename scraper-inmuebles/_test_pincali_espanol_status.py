"""
Prueba puntual: ¿la URL española de PINCALI (/inmueble/propiedad-{uuid}) ya
responde 200 en vez del 422 que forzó el fix a inglés en jun-2026?
No modifica nada, solo reporta status+idioma del HTML por muestra real de Mongo.
"""
import os
import re
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def url_espanol(url_en: str) -> str | None:
    m = re.search(
        r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
        url_en.rstrip("/"),
    )
    if not m:
        return None
    uuid_full = m.group(1)
    return f"https://www.pincali.com/inmueble/propiedad-{uuid_full}?locale_changed=true"


def es_espanol(html: str) -> bool:
    return "Año de construcción" in html or "Recámaras" in html or "recámaras" in html.lower()


def main():
    col = MongoClient(MONGO_URL)["propvalu"]["mercado_props"]
    docs = list(
        col.find(
            {"portal_origen": "PINCALI", "url_original": {"$regex": "/en/(home|property)/"}},
            {"url_original": 1},
        ).limit(15)
    )
    if not docs:
        print("No se encontraron URLs PINCALI en inglés para probar.")
        return

    resultados = []
    for d in docs:
        url_en = d["url_original"]
        url_es = url_espanol(url_en)
        if not url_es:
            continue
        try:
            r_es = requests.get(url_es, headers=HEADERS, timeout=15, allow_redirects=True)
            ok = r_es.status_code == 200 and es_espanol(r_es.text)
            resultados.append((url_es, r_es.status_code, ok))
            print(f"{r_es.status_code}  {'OK-ES' if ok else 'FALLA'}  {url_es}")
        except Exception as e:
            resultados.append((url_es, "ERROR", False))
            print(f"ERROR  {e}  {url_es}")

    n_ok = sum(1 for _, _, ok in resultados if ok)
    print(f"\n{n_ok}/{len(resultados)} URLs españolas responden 200 con contenido en español.")
    if n_ok == 0:
        print("CONCLUSIÓN: el 422 en /inmueble/ sigue vigente. No cambiar el enricher a español todavía.")
    elif n_ok == len(resultados):
        print("CONCLUSIÓN: el español ya funciona en TODAS las muestras. Se puede revertir el fix a español.")
    else:
        print("CONCLUSIÓN: mixto — verificar caso por caso antes de revertir el fix.")


if __name__ == "__main__":
    main()
