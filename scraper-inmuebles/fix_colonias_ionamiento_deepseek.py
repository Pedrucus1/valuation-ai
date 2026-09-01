"""
fix_colonias_ionamiento_deepseek.py
Repara colonias truncadas tipo "ionamiento X" (deberia ser "Fraccionamiento X" u
otro nombre real) en mercado_props. Bug: over-stripping de decoradores en
limpiar_colonia() de INMUEBLES24/VIVANUNCIOS -- NUNCA se repone "Fracc" con
string-matching (regla dura del proyecto, ver memoria feedback_no_regex).
En vez de eso: DeepSeek deriva el nombre real de colonia desde titulo+colonia
truncada+municipio, igual patron que fix_colonias_pincali_deepseek.py.

Uso:
  python fix_colonias_ionamiento_deepseek.py --dry-run
  python fix_colonias_ionamiento_deepseek.py
"""
import argparse
import json
import os
import re
import time
from pathlib import Path
from collections import defaultdict

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE.parent / "backend" / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "propvalu")
COL_NAME = "mercado_props"

DEEPSEEK_KEY = os.environ["DEEPSEEK_API_KEY"]
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
BATCH_SIZE = 60
DELAY_OK = 1.0
DELAY_429 = 20.0
MAX_RETRIES = 4

FUENTE_TAG = "ia_derivada_ionamiento_fix"


def llamar_deepseek(items: list) -> list:
    """items: lista de dicts {idx, titulo, colonia_truncada, municipio}."""
    prompt = (
        "Eres un experto en bienes raices de Jalisco, Mexico. Para cada anuncio te doy: "
        "el TITULO completo del anuncio, el nombre de COLONIA que quedo truncado por un bug "
        "(le falta el inicio, ej 'ionamiento X' deberia empezar con 'Fraccionamiento X', pero "
        "podria faltar mas texto del que parece), y el MUNICIPIO. "
        "Devuelve el nombre REAL y COMPLETO de la colonia/fraccionamiento, derivandolo del "
        "TITULO (fuente confiable e intacta), no asumas que solo falta la palabra 'Fraccionamiento'. "
        "Si el titulo no da suficiente informacion para estar seguro, responde null. "
        "Responde SOLO un array JSON:\n"
        '[{"idx": 1, "colonia_real": "...o null"}, ...]\n\n'
        "Casos:\n"
    )
    for it in items:
        prompt += (
            f'{it["idx"]}. TITULO: "{it["titulo"]}" | COLONIA_TRUNCADA: "{it["colonia_truncada"]}" '
            f'| MUNICIPIO: "{it["municipio"]}"\n'
        )

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {DEEPSEEK_KEY}", "Content-Type": "application/json"}

    delay = DELAY_429
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(DEEPSEEK_URL, json=payload, headers=headers, timeout=120)
            if resp.status_code == 429:
                wait = delay * (2 ** attempt)
                print(f"    [429] Rate limit. Esperando {wait:.0f}s...")
                time.sleep(wait)
                continue
            if resp.status_code != 200:
                print(f"    [ERROR] HTTP {resp.status_code}: {resp.text[:200]}")
                time.sleep(5)
                continue
            texto = resp.json()["choices"][0]["message"]["content"].strip()
            if texto.startswith("```"):
                texto = re.sub(r"^```(?:json)?\s*", "", texto)
                texto = re.sub(r"\s*```$", "", texto)
            data = json.loads(texto)
            if isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        return v
                return data
            return data
        except json.JSONDecodeError as e:
            print(f"    [PARSE ERROR] {e} -- texto: {texto[:200]}")
            return None
        except Exception as e:
            print(f"    [EXCEPCION] {e}")
            time.sleep(5)
    return None


def es_valida(colonia_real, colonia_truncada) -> bool:
    if not colonia_real or str(colonia_real).lower() in ("null", "none", ""):
        return False
    s = str(colonia_real).strip()
    if len(s) < 3 or len(s) > 80:
        return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    print("=== fix_colonias_ionamiento_deepseek.py ===")
    print(f"Modo: {'DRY-RUN' if args.dry_run else 'REAL (escribe en Mongo)'}")

    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=30_000)
    col = client[DB_NAME][COL_NAME]

    query = {"activo": {"$ne": False}, "colonia": {"$regex": "^ionamiento"}}
    docs = list(col.find(query, {"titulo": 1, "colonia": 1, "municipio": 1, "portal_origen": 1}))
    if args.limit:
        docs = docs[: args.limit]
    total = len(docs)
    print(f"Documentos afectados: {total}")
    if total == 0:
        return

    # Agrupar por (titulo, colonia_truncada, municipio) -- reduce llamadas si hay dups
    grupos = defaultdict(list)
    for d in docs:
        key = (d.get("titulo", ""), d.get("colonia", ""), d.get("municipio", ""))
        grupos[key].append(d["_id"])
    claves = list(grupos.keys())
    print(f"Combinaciones unicas (titulo+colonia+municipio): {len(claves)}")

    if args.dry_run:
        for k in claves[:8]:
            print(f"  TITULO: {k[0][:70]!r}  COLONIA: {k[1]!r}  MUNI: {k[2]!r}  docs={len(grupos[k])}")
        print("\n[DRY-RUN] No se escribio nada.")
        return

    mapa = {}  # key -> colonia_real
    n_llamadas = (len(claves) + BATCH_SIZE - 1) // BATCH_SIZE
    for i in range(0, len(claves), BATCH_SIZE):
        lote = claves[i : i + BATCH_SIZE]
        items = [
            {"idx": j + 1, "titulo": k[0], "colonia_truncada": k[1], "municipio": k[2]}
            for j, k in enumerate(lote)
        ]
        print(f"\nLlamada {i // BATCH_SIZE + 1}/{n_llamadas} ({len(lote)} casos)...")
        resultado = llamar_deepseek(items)
        if resultado is None:
            print("  [SKIP] Lote fallido.")
            continue
        exitos = 0
        for j, k in enumerate(lote):
            colonia_real = None
            if isinstance(resultado, list) and j < len(resultado):
                item = resultado[j]
                colonia_real = item.get("colonia_real") if isinstance(item, dict) else item
            elif isinstance(resultado, dict):
                colonia_real = resultado.get(str(j + 1))
            if es_valida(colonia_real, k[1]):
                mapa[k] = str(colonia_real).strip()
                exitos += 1
        print(f"  OK -- {exitos}/{len(lote)} con colonia valida")
        time.sleep(DELAY_OK)

    print(f"\nAplicando mapa ({len(mapa)}/{len(claves)} combinaciones resueltas)...")
    ops = []
    resueltos = sin_resolver = 0
    sin_resolver_ejemplos = []
    for k, ids in grupos.items():
        if k in mapa:
            colonia_real = mapa[k]
            for _id in ids:
                ops.append(UpdateOne(
                    {"_id": _id},
                    {"$set": {
                        "colonia": colonia_real,
                        "colonia_fuente": FUENTE_TAG,
                        "colonia_original_ionamiento": k[1],
                    }},
                ))
                resueltos += 1
        else:
            sin_resolver += len(ids)
            if len(sin_resolver_ejemplos) < 15:
                sin_resolver_ejemplos.append(k)

    if ops:
        for i in range(0, len(ops), 500):
            col.bulk_write(ops[i : i + 500], ordered=False)

    print("\n" + "=" * 60)
    print("REPORTE FINAL")
    print("=" * 60)
    print(f"  Docs actualizados:     {resueltos}")
    print(f"  Docs SIN resolver:     {sin_resolver} (dejados intactos, DeepSeek no tuvo confianza)")
    if sin_resolver_ejemplos:
        print("  Ejemplos sin resolver:")
        for k in sin_resolver_ejemplos:
            print(f"    TITULO: {k[0][:70]!r}  COLONIA: {k[1]!r}  MUNI: {k[2]!r}")
    print("=" * 60)
    print(f"Reversion: db.mercado_props.updateMany({{colonia_fuente:'{FUENTE_TAG}'}}, "
          f"[{{$set:{{colonia:'$colonia_original_ionamiento'}}}}, "
          f"{{$unset:{{colonia_fuente:1,colonia_original_ionamiento:1}}}}])")


if __name__ == "__main__":
    main()
