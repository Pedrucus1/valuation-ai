"""
fix_colonias_pincali_ia.py
Arregla colonias basura de PINCALI usando Gemini para extraer la colonia real
del título en inglés.

Uso:
  python fix_colonias_pincali_ia.py              -- modo real (escribe en Mongo)
  python fix_colonias_pincali_ia.py --dry-run    -- solo cuenta y muestra ejemplos
  python fix_colonias_pincali_ia.py --limit 200  -- limitar registros a procesar
"""

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path
from collections import defaultdict

import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo import UpdateOne

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG (todo desde .env, NUNCA hardcodeado — GitGuardian/GitHub secret scanning)
# ──────────────────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env")          # MONGO_URL del scraper
load_dotenv(_HERE.parent / ".env")   # GEMINI_API_KEY del repo raiz

MONGO_URL  = os.environ["MONGO_URL"]
DB_NAME    = "propvalu"
COL_NAME   = "mercado_props"
GEMINI_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL_PRIMARY  = "gemini-2.5-flash"
GEMINI_MODEL_FALLBACK = "gemini-2.0-flash"
BATCH_SIZE  = 120      # títulos ÚNICOS por llamada Gemini
DELAY_OK    = 4.0      # segundos entre llamadas exitosas
DELAY_429   = 30.0     # espera base en 429 (se dobla cada reintento)
MAX_RETRIES = 4

SEPOMEX_PATH = Path(__file__).parent.parent / "Modulo Drive IA" / "sepomex_v2.json"

# Regex para detectar colonia "basura" (título en inglés)
BASURA_REGEX = re.compile(
    r"for sale|for rent|house|luxury|beautiful|apartment|condo|property|\bsale\b|\brent\b",
    re.IGNORECASE,
)
BASURA_LARGA = 46  # también basura si >45 chars (títulos completos)

# Regex para descartar resultado inválido de Gemini
INVALIDO_REGEX = re.compile(
    r"venta|renta|sale|for sale|house|apartment|condo|property|luxury|beautiful|fraccionamiento\s*$|colonia\s*$",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────────────────────
# SEPOMEX: catálogo de colonias para match
# ──────────────────────────────────────────────────────────────────────────────
def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip()

def cargar_sepomex() -> dict[str, list[str]]:
    """Retorna {municipio_normalizado: [nombre_colonia, ...]}"""
    if not SEPOMEX_PATH.exists():
        return {}
    with open(SEPOMEX_PATH, encoding="utf-8") as f:
        data = json.load(f)
    catalog: dict[str, list[str]] = {}
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

def mejor_match_sepomex(colonia_ia: str, municipio: str, catalog: dict) -> str | None:
    """Devuelve el nombre canónico del catálogo si hay match exacto normalizado, else None."""
    if not catalog:
        return None
    muni_key = _normalizar(municipio or "")
    opciones = catalog.get(muni_key, [])
    if not opciones:
        # Buscar en todos los municipios
        for nombres in catalog.values():
            opciones.extend(nombres)
    target = _normalizar(colonia_ia)
    for nombre in opciones:
        if _normalizar(nombre) == target:
            return nombre
    return None

# ──────────────────────────────────────────────────────────────────────────────
# GEMINI
# ──────────────────────────────────────────────────────────────────────────────
def _gemini_url(model: str) -> str:
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={GEMINI_KEY}"
    )

def llamar_gemini(titulos: list[str], model: str = GEMINI_MODEL_PRIMARY) -> list[dict] | None:
    """
    Envía un lote de títulos ÚNICOS y devuelve lista de {titulo, colonia_es}.
    Retorna None si falla después de retries.
    """
    prompt = (
        "Eres un experto en bienes raíces en México (Jalisco). "
        "Para cada título de propiedad en inglés, extrae SOLO el nombre "
        "de la COLONIA o fraccionamiento en ESPAÑOL. "
        "Si el nombre está en inglés, tradúcelo (ej: 'City of the Sun'→'Ciudad del Sol', "
        "'North Capital'→'Capital Norte', 'Campo Real' ya es correcto). "
        "Si no hay colonia clara, responde null. "
        "NO incluyas palabras como 'venta', 'renta', 'casa', 'departamento'. "
        "Responde SOLO con un array JSON válido, sin explicación:\n"
        '[{"titulo": "...", "colonia_es": "...o null"}, ...]\n\n'
        "Títulos a procesar:\n"
    )
    for i, t in enumerate(titulos):
        prompt += f'{i+1}. {t}\n'

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 16384,
        }
    }

    delay = DELAY_429
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(_gemini_url(model), json=payload, timeout=90)
            if resp.status_code == 429:
                wait = delay * (2 ** attempt)
                print(f"    [429] Rate limit. Esperando {wait:.0f}s...")
                time.sleep(wait)
                continue
            if resp.status_code != 200:
                print(f"    [ERROR] HTTP {resp.status_code}: {resp.text[:200]}")
                if model == GEMINI_MODEL_PRIMARY:
                    print(f"    [FALLBACK] Intentando {GEMINI_MODEL_FALLBACK}...")
                    return llamar_gemini(titulos, GEMINI_MODEL_FALLBACK)
                return None

            data = resp.json()
            texto = data["candidates"][0]["content"]["parts"][0]["text"]
            texto = texto.strip()
            if texto.startswith("```"):
                texto = re.sub(r"^```(?:json)?\s*", "", texto)
                texto = re.sub(r"\s*```$", "", texto)
            resultado = json.loads(texto)
            return resultado

        except json.JSONDecodeError as e:
            print(f"    [PARSE ERROR] {e} — texto: {texto[:200]}")
            return None
        except Exception as e:
            print(f"    [EXCEPCION] {e}")
            time.sleep(5)

    return None

# ──────────────────────────────────────────────────────────────────────────────
# VALIDACIÓN de respuesta Gemini
# ──────────────────────────────────────────────────────────────────────────────
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
# QUERY: documentos con colonia basura de PINCALI
# ──────────────────────────────────────────────────────────────────────────────
def obtener_basuras(col, limit: int | None) -> list[dict]:
    """Extrae todos los PINCALI con colonia basura (sin colonia_fix_ia)."""
    query = {
        "portal_origen": "PINCALI",
        "colonia_fix_ia": {"$exists": False},
        "$or": [
            {"colonia": {"$regex": ".{46,}", "$options": "i"}},
            {"colonia": {"$regex": "for sale|for rent|house|luxury|beautiful|apartment|condo|property|\\bsale\\b|\\brent\\b", "$options": "i"}},
            {"colonia": {"$regex": "^[0-9]"}},
        ]
    }
    projection = {"_id": 1, "colonia": 1, "municipio": 1}
    cursor = col.find(query, projection, batch_size=1000)
    docs = list(cursor.limit(limit) if limit else cursor)
    return docs

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe en Mongo")
    parser.add_argument("--limit", type=int, default=None, help="Máx docs a procesar")
    args = parser.parse_args()

    print("=== fix_colonias_pincali_ia.py (v2 — dedup + lotes 120) ===")
    print(f"Modo: {'DRY-RUN (sin escritura)' if args.dry_run else 'REAL (escribe en Mongo)'}")

    # Conexión Mongo
    print("\n[1] Conectando a MongoDB prod...")
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=30_000, socketTimeoutMS=60_000, connectTimeoutMS=30_000)
    db = client[DB_NAME]
    col = db[COL_NAME]

    # Cargar catálogo SEPOMEX
    print("[2] Cargando catálogo SEPOMEX...")
    catalog = cargar_sepomex()
    total_colonias_sepomex = sum(len(v) for v in catalog.values())
    print(f"    {total_colonias_sepomex:,} colonias en catálogo ({len(catalog)} municipios)")

    # Obtener basuras
    print("[3] Buscando colonias basura PINCALI...")
    docs = obtener_basuras(col, args.limit)
    total = len(docs)
    print(f"    {total:,} documentos con colonia basura encontrados")

    if total == 0:
        print("\nNo hay colonias basura. Nada que hacer.")
        return

    # ── DEDUP: agrupar docs por título único ──────────────────────────────────
    # titulo_basura -> list of (doc_id, municipio, colonia_original)
    titulo_a_docs: dict[str, list[tuple]] = defaultdict(list)
    for d in docs:
        titulo_a_docs[d["colonia"]].append((d["_id"], d.get("municipio", ""), d["colonia"]))

    titulos_unicos = list(titulo_a_docs.keys())
    n_unicos = len(titulos_unicos)
    n_llamadas = (n_unicos + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"    {n_unicos:,} títulos únicos → {n_llamadas} llamadas Gemini (lotes de {BATCH_SIZE})")
    print("\n    Ejemplos de colonias basura:")
    for t in titulos_unicos[:5]:
        docs_sample = titulo_a_docs[t]
        muni = docs_sample[0][1]
        print(f"      [{muni}] {t[:80]}  ({len(docs_sample)} docs)")

    if args.dry_run:
        print("\n[DRY-RUN] Terminado. No se escribió nada.")
        return

    # ── PROCESAR títulos únicos en lotes de 120 ───────────────────────────────
    print(f"\n[4] Procesando {n_unicos:,} títulos únicos en lotes de {BATCH_SIZE}...")

    # mapa titulo -> colonia_final
    mapa_titulo_colonia: dict[str, str] = {}
    ejemplos_antes_despues = []

    for i in range(0, n_unicos, BATCH_SIZE):
        lote_titulos = titulos_unicos[i:i + BATCH_SIZE]
        n_lote = len(lote_titulos)
        n_batch = i // BATCH_SIZE + 1
        print(f"\n  Llamada {n_batch}/{n_llamadas} ({i+1}–{i+n_lote}/{n_unicos} títulos únicos)...")

        resultado = llamar_gemini(lote_titulos)
        if resultado is None:
            print(f"    [SKIP] Lote fallido, se omite.")
            time.sleep(DELAY_OK)
            continue

        # Construir mapa titulo->colonia_es para este lote
        exitos_lote = 0
        for j, titulo in enumerate(lote_titulos):
            colonia_ia = None
            if isinstance(resultado, list) and j < len(resultado):
                item = resultado[j]
                if isinstance(item, dict):
                    colonia_ia = item.get("colonia_es") or item.get("colonia")
                else:
                    colonia_ia = item
            elif isinstance(resultado, dict):
                colonia_ia = resultado.get(titulo) or resultado.get(str(j+1))

            if not es_valida(colonia_ia):
                continue

            colonia_ia = str(colonia_ia).strip()

            # Municipio más frecuente para este título (para SEPOMEX)
            docs_de_titulo = titulo_a_docs[titulo]
            municipio_ref = docs_de_titulo[0][1] if docs_de_titulo else ""
            match = mejor_match_sepomex(colonia_ia, municipio_ref, catalog)
            colonia_final = match if match else colonia_ia

            mapa_titulo_colonia[titulo] = colonia_final
            exitos_lote += 1

            if len(ejemplos_antes_despues) < 10:
                ejemplos_antes_despues.append({
                    "antes": titulo,
                    "despues": colonia_final,
                    "municipio": municipio_ref,
                    "sepomex": match is not None,
                    "n_docs": len(docs_de_titulo),
                })

        print(f"    OK — {exitos_lote}/{n_lote} títulos con colonia válida")
        time.sleep(DELAY_OK)

    # ── APLICAR MAPA: bulk_write a todos los docs ─────────────────────────────
    print(f"\n[5] Aplicando mapa a docs en Mongo ({len(mapa_titulo_colonia)} títulos con colonia válida)...")

    # Calcular cuántos docs se van a arreglar
    arreglados_docs = sum(len(titulo_a_docs[t]) for t in mapa_titulo_colonia)
    sin_colonia_titulos = n_unicos - len(mapa_titulo_colonia)
    sin_colonia_docs = sum(len(titulo_a_docs[t]) for t in titulos_unicos if t not in mapa_titulo_colonia)

    ops: list[UpdateOne] = []
    FLUSH_SIZE = 500

    for titulo, colonia_final in mapa_titulo_colonia.items():
        for (doc_id, municipio, colonia_orig) in titulo_a_docs[titulo]:
            # Setear colonia_original solo si no existe
            ops.append(UpdateOne(
                {"_id": doc_id, "colonia_original": {"$exists": False}},
                {"$set": {"colonia_original": colonia_orig}},
            ))
            # Setear colonia nueva y marca
            ops.append(UpdateOne(
                {"_id": doc_id},
                {"$set": {"colonia": colonia_final, "colonia_fix_ia": "2026-07"}},
            ))

        if len(ops) >= FLUSH_SIZE:
            col.bulk_write(ops, ordered=False)
            ops = []

    if ops:
        col.bulk_write(ops, ordered=False)

    print(f"    bulk_write completado — {arreglados_docs:,} docs actualizados")

    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICACIÓN POST-ESCRITURA (primeras 2 llamadas)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6] Verificando muestra post-escritura...")
    for ej in ejemplos_antes_despues[:2]:
        doc_verify = col.find_one(
            {"colonia": ej["despues"], "portal_origen": "PINCALI", "colonia_fix_ia": "2026-07"},
            {"_id": 0, "colonia": 1, "colonia_original": 1, "colonia_fix_ia": 1, "municipio": 1}
        )
        print(f"    ANTES:   {ej['antes'][:70]}")
        print(f"    DESPUÉS: {ej['despues']}")
        print(f"    Mongo:   {doc_verify}")
        print()

    # Contar basuras restantes
    restantes = col.count_documents({
        "portal_origen": "PINCALI",
        "colonia_fix_ia": {"$exists": False},
        "$or": [
            {"colonia": {"$regex": ".{46,}", "$options": "i"}},
            {"colonia": {"$regex": "for sale|for rent|house|luxury|beautiful|apartment|condo|property|\\bsale\\b|\\brent\\b", "$options": "i"}},
            {"colonia": {"$regex": "^[0-9]"}},
        ]
    })
    total_pincali = col.count_documents({"portal_origen": "PINCALI"})
    pct_restante = (restantes / total_pincali * 100) if total_pincali else 0

    # ──────────────────────────────────────────────────────────────────────────
    # REPORTE FINAL
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("REPORTE FINAL")
    print("="*60)
    print(f"  Total PINCALI en Mongo:          {total_pincali:,}")
    print(f"  Docs con colonia basura:         {total:,}")
    print(f"  Títulos únicos procesados:       {n_unicos:,} en {n_llamadas} llamadas Gemini")
    print(f"  Títulos con colonia válida:      {len(mapa_titulo_colonia):,}")
    print(f"  Docs arreglados con IA:          {arreglados_docs:,}")
    print(f"  Docs sin colonia clara:          {sin_colonia_docs:,}")
    print(f"  Colonias basura RESTANTES:       {restantes:,} ({pct_restante:.1f}% del total PINCALI)")
    print()
    print("  Ejemplos antes -> despues:")
    for ej in ejemplos_antes_despues[:10]:
        tag = "[SEPOMEX]" if ej["sepomex"] else "[IA]"
        print(f"    {tag} [{ej['municipio']}] ({ej['n_docs']} docs)")
        print(f"      ANTES:   {ej['antes'][:80]}")
        print(f"      DESPUÉS: {ej['despues']}")
    print("="*60)
    print("Reversión: db.mercado_props.updateMany({colonia_fix_ia:'2026-07'}, [{$set:{colonia:'$colonia_original'}}, {$unset:{colonia_fix_ia:1,colonia_original:1}}])")

if __name__ == "__main__":
    main()
