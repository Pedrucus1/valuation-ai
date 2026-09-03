"""
ondemand_pipeline.py — Orquesta el scrape on-demand de una colonia cuando
generate_comparables (backend/server.py) se queda sin pool real (<3 comps).

Encadena piezas YA EXISTENTES, no las reinventa:
  1. buscar_comparables_browser.js (scrape por colonia)
  2. insertar_comparables_ondemand.py (insert con dedup, scheduler._guardar_en_mongo)
  3. enricher.enriquecer_mongo(..., min_id=cutoff) (rellena año/m²/colonia del lote)
  4. Validación de `colonia`: catálogo SEPOMEX primero (gratis); lo que no matchea
     se manda en un solo batch a DeepSeek (mismo prompt/formato que
     fix_colonias_pincali_deepseek.py) para detectar basura/mal-geolocalizado/
     ortografía rota. Nunca borra — marca activo:false + descarte_motivo.
  5. Marca comparables_job en la valuación: listo (si quedaron >=3 activos) o
     sin_datos.

Uso:
  <PY> ondemand_pipeline.py --valuation-id val_xxx --colonia "El Roble" \
       --municipio "El Arenal" --tipo casa --m2 100
"""
import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

HERE = Path(__file__).resolve().parent
MODULO_DRIVE_IA = HERE.parent / "Modulo Drive IA"
TEMP_JSON = MODULO_DRIVE_IA / "_comparables_browser_temp.json"

load_dotenv(HERE / ".env")           # MONGO_URL del scraper (prod cluster0)
load_dotenv(HERE.parent / ".env")    # DEEPSEEK_API_KEY del repo raíz

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = "propvalu"
SEPOMEX_PATH = MODULO_DRIVE_IA / "sepomex_v2.json"

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

ETA_MIN = 4  # estimado grueso: scrape + enrich + validación de un lote chico


def log(msg):
    print(msg, flush=True)


def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip()


def cargar_sepomex_municipio(municipio: str) -> list[str]:
    if not SEPOMEX_PATH.exists():
        return []
    with open(SEPOMEX_PATH, encoding="utf-8") as f:
        data = json.load(f)
    muni_key = _normalizar(municipio)
    nombres = []
    for entradas in data.values():
        if not isinstance(entradas, list):
            entradas = [entradas]
        for e in entradas:
            if _normalizar(e.get("municipio", "")) == muni_key:
                nombre = (e.get("nombre") or "").strip()
                if nombre:
                    nombres.append(nombre)
    return nombres


def validar_colonias_con_deepseek(pares: list[dict], municipio: str, estado: str) -> dict:
    """pares: [{id_unico, colonia}]. Retorna {id_unico: True/False} — True = colonia
    plausible para esa zona, False = basura/mal-geolocalizada/ilegible."""
    if not pares or not DEEPSEEK_KEY:
        return {}
    prompt = (
        f"Eres experto en geografia de Mexico. Te doy colonias/fraccionamientos "
        f"capturados por un scraper para el municipio de {municipio}, {estado}. "
        f"Para cada una, di si es un nombre de colonia PLAUSIBLE y bien escrito para "
        f"esa zona (true), o si es basura/esta mal geolocalizada (ej. una colonia de "
        f"otro estado/pais que no puede estar ahi), esta en otro idioma sin traducir, "
        f"o el texto esta roto/no es un nombre de lugar (false). "
        f"Responde SOLO un array JSON: [{{\"id\": \"...\", \"ok\": true|false}}, ...]\n\n"
    )
    for p in pares:
        prompt += f'id={p["id_unico"]} colonia="{p["colonia"]}"\n'

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {DEEPSEEK_KEY}", "Content-Type": "application/json"}
    try:
        resp = requests.post(DEEPSEEK_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        texto = resp.json()["choices"][0]["message"]["content"].strip()
        if texto.startswith("```"):
            texto = re.sub(r"^```(?:json)?\s*", "", texto)
            texto = re.sub(r"\s*```$", "", texto)
        data = json.loads(texto)
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), [])
        return {str(item["id"]): bool(item.get("ok")) for item in data if "id" in item}
    except Exception as e:
        log(f"  [DeepSeek] validación de colonias falló ({e}) — se dejan activas (no se descarta a ciegas)")
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--valuation-id", required=True)
    ap.add_argument("--colonia", required=True)
    ap.add_argument("--municipio", required=True)
    ap.add_argument("--tipo", default="casa")
    ap.add_argument("--m2", default="100")
    ap.add_argument("--lat", default=None)
    ap.add_argument("--lon", default=None)
    args = ap.parse_args()

    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=15000, socketTimeoutMS=60000)
    db = client[DB_NAME]
    col = db["mercado_props"]

    started_at = datetime.now(timezone.utc)
    db.valuations.update_one(
        {"valuation_id": args.valuation_id},
        {"$set": {"comparables_job": {
            "status": "corriendo", "started_at": started_at.isoformat(),
            "eta_min": ETA_MIN, "notified": False,
        }}},
    )
    cutoff = ObjectId.from_datetime(started_at)

    # 1-2. Scrape + insert (ya existen, tal cual). También terreno (aparte de casa/depto)
    # cuando el sujeto no es ya terreno: el motor de valuación de terreno (residual) necesita
    # comparables de solo-tierra de la misma zona, no solo los de construcción.
    tipos = [args.tipo] + (["terreno"] if args.tipo != "terreno" else [])
    cmd_base = ["node", str(MODULO_DRIVE_IA / "buscar_comparables_browser.js"),
                "--colonia", args.colonia, "--municipio", args.municipio, "--m2", args.m2]
    if args.lat is not None and args.lon is not None:
        cmd_base += ["--lat", str(args.lat), "--lon", str(args.lon)]
    for tipo in tipos:
        log(f"=== [1/4] Scraping {args.colonia}, {args.municipio} (tipo={tipo}) ===")
        subprocess.run(
            cmd_base + ["--tipo", tipo],
            cwd=str(MODULO_DRIVE_IA), timeout=300,
        )
        log(f"=== [2/4] Insertando en mercado_props (tipo={tipo}) ===")
        subprocess.run(
            [sys.executable, str(HERE / "insertar_comparables_ondemand.py"), str(TEMP_JSON)],
            cwd=str(HERE), timeout=60,
        )

    nuevos = list(col.find({"_id": {"$gte": cutoff}}, {"portal_origen": 1, "colonia": 1}))
    portales = {d["portal_origen"] for d in nuevos if d.get("portal_origen")}

    # 3. Enricher acotado al lote (min_id) — reusa la capacidad que ya tenía la función
    log(f"=== [3/4] Enriqueciendo {len(nuevos)} docs nuevos ({', '.join(portales) or 'ninguno'}) ===")
    if portales:
        sys.path.insert(0, str(HERE))
        import enricher
        for portal in portales:
            try:
                enricher.enriquecer_mongo(col, portal, max_filas=30, dry_run=False,
                                          urls_procesadas=set(), min_id=cutoff)
            except Exception as e:
                log(f"  [enricher] error en {portal}: {e}")

    # 4. Validación de colonia: SEPOMEX primero (gratis), DeepSeek para lo dudoso
    log("=== [4/4] Validando colonias (SEPOMEX + DeepSeek) ===")
    nuevos = list(col.find({"_id": {"$gte": cutoff}}, {"colonia": 1, "id_unico": 1}))
    catalogo_muni = cargar_sepomex_municipio(args.municipio)
    catalogo_norm = {_normalizar(n) for n in catalogo_muni}
    dudosas = []
    for d in nuevos:
        colonia = d.get("colonia") or ""
        if catalogo_norm and _normalizar(colonia) not in catalogo_norm:
            dudosas.append({"id_unico": d["id_unico"], "colonia": colonia})
    if dudosas:
        estado_doc = db.valuations.find_one({"valuation_id": args.valuation_id}, {"property_data.state": 1})
        estado = (estado_doc or {}).get("property_data", {}).get("state", "")
        veredictos = validar_colonias_con_deepseek(dudosas, args.municipio, estado)
        for id_unico, ok in veredictos.items():
            if not ok:
                col.update_one({"id_unico": id_unico},
                               {"$set": {"activo": False, "descarte_motivo": "colonia_invalida_ia"}})
                log(f"  descartado (colonia inválida): {id_unico}")

    # Cierre: contar reales activos que quedaron para esta colonia
    encontrados = col.count_documents({
        "colonia": {"$regex": re.escape(args.colonia), "$options": "i"},
        "municipio": {"$regex": f"^{re.escape(args.municipio)}$", "$options": "i"},
        "activo": {"$ne": False},
    })
    status = "listo" if encontrados >= 3 else "sin_datos"
    db.valuations.update_one(
        {"valuation_id": args.valuation_id},
        {"$set": {"comparables_job": {
            "status": status, "started_at": started_at.isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "encontrados": encontrados, "notified": False,
        }}},
    )
    log(f"=== FIN: {status} — {encontrados} comparables reales activos en {args.colonia} ===")


if __name__ == "__main__":
    main()
