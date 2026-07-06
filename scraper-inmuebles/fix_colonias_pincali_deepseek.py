"""
fix_colonias_pincali_deepseek.py
Igual que fix_colonias_pincali_ia.py pero usa DeepSeek-V3 (OpenAI-compatible)
en vez de Gemini para traducir colonias en ingles a espanol, en lotes.

Credenciales: NUNCA hardcodeadas.
  - DEEPSEEK_API_KEY -> .env raiz del repo (../.env)
  - MONGO_URL        -> scraper-inmuebles/.env

Uso:
  python fix_colonias_pincali_deepseek.py              -- modo real (escribe en Mongo)
  python fix_colonias_pincali_deepseek.py --dry-run    -- solo cuenta y muestra ejemplos
  python fix_colonias_pincali_deepseek.py --limit 200  -- limitar registros a procesar
"""

import argparse
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from collections import defaultdict

import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo import UpdateOne

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG (todo desde .env, nada hardcodeado)
# ──────────────────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env")              # MONGO_URL del scraper
load_dotenv(_HERE.parent / ".env")       # DEEPSEEK_API_KEY del repo raiz

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = "propvalu"
COL_NAME  = "mercado_props"

DEEPSEEK_KEY   = os.environ["DEEPSEEK_API_KEY"]
DEEPSEEK_URL   = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
BATCH_SIZE  = 120      # titulos UNICOS por llamada
DELAY_OK    = 1.0      # DeepSeek no tiene el rate limit agresivo de Gemini
DELAY_429   = 20.0
MAX_RETRIES = 4

SEPOMEX_PATH = _HERE.parent / "Modulo Drive IA" / "sepomex_v2.json"

INVALIDO_REGEX = re.compile(
    r"venta|renta|sale|for sale|house|apartment|condo|property|luxury|beautiful|fraccionamiento\s*$|colonia\s*$",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────────────────────
# SEPOMEX
# ──────────────────────────────────────────────────────────────────────────────
def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip()

def cargar_sepomex() -> dict:
    if not SEPOMEX_PATH.exists():
        return {}
    with open(SEPOMEX_PATH, encoding="utf-8") as f:
        data = json.load(f)
    catalog: dict = {}
    for entradas in data.values():
        if not isinstance(entradas, list):
            entradas = [entradas]
        for e in entradas:
            muni = _normalizar(e.get("municipio", ""))
            nombre = e.get("nombre", "").strip()
            if nombre and muni:
                catalog.setdefault(muni, [])
                if nombre not in catalog[muni]:
                    catalog[muni].append(nombre)
    return catalog

def mejor_match_sepomex(colonia_ia: str, municipio: str, catalog: dict):
    if not catalog:
        return None
    muni_key = _normalizar(municipio or "")
    opciones = list(catalog.get(muni_key, []))
    if not opciones:
        for nombres in catalog.values():
            opciones.extend(nombres)
    target = _normalizar(colonia_ia)
    for nombre in opciones:
        if _normalizar(nombre) == target:
            return nombre
    return None

# ──────────────────────────────────────────────────────────────────────────────
# DEEPSEEK
# ──────────────────────────────────────────────────────────────────────────────
def llamar_deepseek(titulos: list) -> list:
    """Envia un lote de titulos UNICOS y devuelve lista de {titulo, colonia_es}."""
    prompt = (
        "Eres un experto en bienes raices en Mexico (Jalisco). "
        "Para cada titulo de propiedad en ingles, extrae SOLO el nombre "
        "de la COLONIA o fraccionamiento en ESPANOL. "
        "Si el nombre esta en ingles, traducelo (ej: 'City of the Sun'->'Ciudad del Sol', "
        "'North Capital'->'Capital Norte', 'Campo Real' ya es correcto). "
        "Si no hay colonia clara, responde null. "
        "NO incluyas palabras como 'venta', 'renta', 'casa', 'departamento'. "
        "Responde SOLO con un array JSON valido, sin explicacion:\n"
        '[{"titulo": "...", "colonia_es": "...o null"}, ...]\n\n'
        "Titulos a procesar:\n"
    )
    for i, t in enumerate(titulos):
        prompt += f'{i+1}. {t}\n'

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
            # response_format json_object puede envolver el array en una clave
            if isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        return v
                # o el dict mismo es titulo->colonia
                return data
            return data

        except json.JSONDecodeError as e:
            print(f"    [PARSE ERROR] {e} -- texto: {texto[:200]}")
            return None
        except Exception as e:
            print(f"    [EXCEPCION] {e}")
            time.sleep(5)

    return None

def es_valida(colonia_ia) -> bool:
    if not colonia_ia or str(colonia_ia).lower() in ("null", "none", ""):
        return False
    s = str(colonia_ia).strip()
    if len(s) > 45:
        return False
    if INVALIDO_REGEX.search(s):
        return False
    return True

# ──────────────────────────────────────────────────────────────────────────────
# QUERY basuras
# ──────────────────────────────────────────────────────────────────────────────
_BASURA_OR = [
    {"colonia": {"$regex": ".{46,}", "$options": "i"}},
    {"colonia": {"$regex": "for sale|for rent|house|luxury|beautiful|apartment|condo|property|\\bsale\\b|\\brent\\b", "$options": "i"}},
    {"colonia": {"$regex": "^[0-9]"}},
]

def obtener_basuras(col, limit):
    query = {"portal_origen": "PINCALI", "colonia_fix_ia": {"$exists": False}, "$or": _BASURA_OR}
    cursor = col.find(query, {"_id": 1, "colonia": 1, "municipio": 1}, batch_size=1000)
    return list(cursor.limit(limit) if limit else cursor)

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    print("=== fix_colonias_pincali_deepseek.py (DeepSeek-V3, dedup + lotes 120) ===")
    print(f"Modo: {'DRY-RUN (sin escritura)' if args.dry_run else 'REAL (escribe en Mongo)'}")

    print("\n[1] Conectando a MongoDB prod...")
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=30_000, socketTimeoutMS=60_000, connectTimeoutMS=30_000)
    col = client[DB_NAME][COL_NAME]

    print("[2] Cargando catalogo SEPOMEX...")
    catalog = cargar_sepomex()
    print(f"    {sum(len(v) for v in catalog.values()):,} colonias ({len(catalog)} municipios)")

    print("[3] Buscando colonias basura PINCALI...")
    docs = obtener_basuras(col, args.limit)
    total = len(docs)
    print(f"    {total:,} documentos con colonia basura")
    if total == 0:
        print("\nNo hay colonias basura. Nada que hacer.")
        return

    titulo_a_docs = defaultdict(list)
    for d in docs:
        titulo_a_docs[d["colonia"]].append((d["_id"], d.get("municipio", ""), d["colonia"]))
    titulos_unicos = list(titulo_a_docs.keys())
    n_unicos = len(titulos_unicos)
    n_llamadas = (n_unicos + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"    {n_unicos:,} titulos unicos -> {n_llamadas} llamadas DeepSeek (lotes de {BATCH_SIZE})")
    for t in titulos_unicos[:5]:
        s = titulo_a_docs[t]
        print(f"      [{s[0][1]}] {t[:80]}  ({len(s)} docs)")

    if args.dry_run:
        print("\n[DRY-RUN] Terminado. No se escribio nada.")
        return

    print(f"\n[4] Procesando {n_unicos:,} titulos en lotes de {BATCH_SIZE}...")
    mapa_titulo_colonia = {}
    ejemplos = []

    for i in range(0, n_unicos, BATCH_SIZE):
        lote = titulos_unicos[i:i + BATCH_SIZE]
        n_batch = i // BATCH_SIZE + 1
        print(f"\n  Llamada {n_batch}/{n_llamadas} ({i+1}-{i+len(lote)}/{n_unicos})...")
        resultado = llamar_deepseek(lote)
        if resultado is None:
            print("    [SKIP] Lote fallido.")
            time.sleep(DELAY_OK)
            continue

        exitos = 0
        for j, titulo in enumerate(lote):
            colonia_ia = None
            if isinstance(resultado, list) and j < len(resultado):
                item = resultado[j]
                colonia_ia = (item.get("colonia_es") or item.get("colonia")) if isinstance(item, dict) else item
            elif isinstance(resultado, dict):
                colonia_ia = resultado.get(titulo) or resultado.get(str(j + 1))
            if not es_valida(colonia_ia):
                continue
            colonia_ia = str(colonia_ia).strip()
            municipio_ref = titulo_a_docs[titulo][0][1]
            match = mejor_match_sepomex(colonia_ia, municipio_ref, catalog)
            colonia_final = match if match else colonia_ia
            mapa_titulo_colonia[titulo] = colonia_final
            exitos += 1
            if len(ejemplos) < 10:
                ejemplos.append({"antes": titulo, "despues": colonia_final,
                                 "municipio": municipio_ref, "sepomex": match is not None,
                                 "n_docs": len(titulo_a_docs[titulo])})
        print(f"    OK -- {exitos}/{len(lote)} titulos con colonia valida")
        time.sleep(DELAY_OK)

    print(f"\n[5] Aplicando mapa ({len(mapa_titulo_colonia)} titulos validos)...")
    arreglados = sum(len(titulo_a_docs[t]) for t in mapa_titulo_colonia)
    sin_colonia_docs = sum(len(titulo_a_docs[t]) for t in titulos_unicos if t not in mapa_titulo_colonia)

    ops, FLUSH = [], 500
    for titulo, colonia_final in mapa_titulo_colonia.items():
        for (doc_id, municipio, colonia_orig) in titulo_a_docs[titulo]:
            ops.append(UpdateOne({"_id": doc_id, "colonia_original": {"$exists": False}},
                                 {"$set": {"colonia_original": colonia_orig}}))
            ops.append(UpdateOne({"_id": doc_id},
                                 {"$set": {"colonia": colonia_final, "colonia_fix_ia": "2026-07"}}))
        if len(ops) >= FLUSH:
            col.bulk_write(ops, ordered=False); ops = []
    if ops:
        col.bulk_write(ops, ordered=False)
    print(f"    bulk_write completado -- {arreglados:,} docs actualizados")

    print("\n[6] Verificando muestra post-escritura...")
    for ej in ejemplos[:2]:
        v = col.find_one({"colonia": ej["despues"], "portal_origen": "PINCALI", "colonia_fix_ia": "2026-07"},
                         {"_id": 0, "colonia": 1, "colonia_original": 1, "colonia_fix_ia": 1, "municipio": 1})
        print(f"    ANTES:   {ej['antes'][:70]}")
        print(f"    DESPUES: {ej['despues']}")
        print(f"    Mongo:   {v}\n")

    restantes = col.count_documents({"portal_origen": "PINCALI", "colonia_fix_ia": {"$exists": False}, "$or": _BASURA_OR})
    total_pincali = col.count_documents({"portal_origen": "PINCALI"})
    pct = (restantes / total_pincali * 100) if total_pincali else 0

    print("\n" + "=" * 60)
    print("REPORTE FINAL")
    print("=" * 60)
    print(f"  Total PINCALI en Mongo:      {total_pincali:,}")
    print(f"  Docs con colonia basura:     {total:,}")
    print(f"  Titulos unicos procesados:   {n_unicos:,} en {n_llamadas} llamadas DeepSeek")
    print(f"  Titulos con colonia valida:  {len(mapa_titulo_colonia):,}")
    print(f"  Docs arreglados con IA:      {arreglados:,}")
    print(f"  Docs sin colonia clara:      {sin_colonia_docs:,}")
    print(f"  Colonias basura RESTANTES:   {restantes:,} ({pct:.1f}% del total PINCALI)")
    print("=" * 60)
    print("Reversion: db.mercado_props.updateMany({colonia_fix_ia:'2026-07'}, [{$set:{colonia:'$colonia_original'}}, {$unset:{colonia_fix_ia:1,colonia_original:1}}])")

if __name__ == "__main__":
    main()
