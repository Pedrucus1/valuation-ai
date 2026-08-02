"""
consolidar_colonias_idx.py — Consolida colonias fragmentadas en cache_index.json y colonias_maestro.json.

Problema: el scraper guardó títulos de listings (en inglés o truncados) como nombres de colonia.
Ejemplo: "onia seattle", "terreno en seattle zapopan", "seattle neighborhood" → todos deberían
         ser la misma clave "seattle" en cache_index.json.

Estrategia:
  1. Regex para pre-filtrar candidatos obvios por patrón (NUNCA regex para decisión final).
  2. DeepSeek valida los casos ambiguos (tipo "X residential").
  3. Fusión conservadora: solo fusiona si la equivalencia es clara.

Uso:
  python consolidar_colonias_idx.py             -- dry-run
  python consolidar_colonias_idx.py --apply     -- aplica cambios
  python consolidar_colonias_idx.py --apply --skip-ai  -- salta validación AI (patrones obvios solo)
"""

import argparse
import json
import math
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests
from dotenv import load_dotenv

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
load_dotenv(_ROOT / ".env")

DEEPSEEK_KEY   = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL   = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

CACHE_IDX_PATH  = _HERE / "cache_index.json"
MAESTRO_PATH    = _HERE / "colonias_maestro.json"

# ── AMG municipios normalizados (para strip de sufijos) ──────────────────────
AMG_MUNIS_NORM = [
    "zapopan", "guadalajara", "tlaquepaque", "tonala",
    "tlajomulco", "tlajomulco de zuniga",
    "el salto", "juanacatlan", "ixtlahuacan de los membrillos",
    "puerto vallarta", "bahia de banderas", "chapala", "ajijic",
]
# Ordenar de más largo a más corto para strip correcto
AMG_MUNIS_NORM.sort(key=len, reverse=True)

# ── Patrones de extracción del nombre canónico ────────────────────────────────
# Regex SOLO para pre-filtrar, no como decisión final
RE_ONIA          = re.compile(r"^onia\s+(.+)$")
RE_COL_PREFIX    = re.compile(r"^col\s+(.+)$")
# Truncaciones del scraper (mismas que backend/core/colonias.py). Solo se quita
# la palabra cuando era GENÉRICA ('fraccionamiento', 'condominio'). Cuando era
# parte del nombre se RESTAURA: 'omos providencia' es Colomos Providencia, una
# colonia distinta de Providencia; 'inas de atemajac' es Colinas de Atemajac.
# 'condominio'/'coto'/'privada' quedan FUERA a propósito: son desarrollos con
# edad y producto propios dentro de la colonia, no decoradores del nombre.
RE_TRUNCADO      = re.compile(r"^(?:ionamiento|amiento)\s+(.+)$")
RE_TRUNC_NOMBRE  = re.compile(r"^(omos|inas)\s+(.+)$")
RESTAURA_TRUNC   = {"omos": "colomos", "inas": "colinas"}
RE_CASA_EN       = re.compile(r"^casa\s+en\s+(.+)$")
RE_TERRENO_EN    = re.compile(r"^terreno\s+en\s+(.+)$")
RE_LOTE_EN       = re.compile(r"^lote\s+en\s+(.+)$")
RE_PREDIO_EN     = re.compile(r"^predio\s+en\s+(.+)$")
RE_ENG_SUFFIX    = re.compile(r"^(.+?)\s+(residential|neighborhood|colony|condominium|condominiums|duplex)\s*$")
RE_COL_SUFFIX    = re.compile(r"^(.+?)\s+(colonia|fraccionamiento)\s*$")
RE_MUNI_SUFFIX   = re.compile(r"^(.+?)\s+(zapopan|guadalajara|tlaquepaque|tonala|tlajomulco(?:\s+de\s+zuniga)?|el\s+salto|puerto\s+vallarta|bahia\s+de\s+banderas|chapala|ajijic|juanacatlan)\s*$")


def strip_muni_suffix(s: str) -> str:
    """Elimina el nombre de municipio normalizado del final del string."""
    for muni in AMG_MUNIS_NORM:
        if s.endswith(" " + muni):
            return s[: -len(muni) - 1].strip()
        if s == muni:
            return ""
    return s


# Palabras que invalidan el canonical: indica que el texto sigue siendo un título de listing
_INVALID_CANON_WORDS = re.compile(
    r"\b(corner|lot|department|in\s+\w|for\s+sale|bedroom|sqm|mts|per\s+m2|"
    r"land\s+in|great|near|property|luxury|garden|ranch|unique|best|meet|"
    r"sale|rent|house|apartment|condo|plot|"
    # 'casa en venta' no deja la colonia 'venta'
    r"venta|renta|preventa|remate)\b",
    re.IGNORECASE,
)

def is_valid_canonical(s: str) -> bool:
    """Retorna True si el string parece un nombre de colonia válido."""
    if not s or len(s) < 3:
        return False
    words = s.split()
    if len(words) > 5:
        return False  # más de 5 palabras → sigue siendo junk
    if _INVALID_CANON_WORDS.search(s):
        return False
    # Rechazar si hay palabras repetidas (ej: "americana 1 americana")
    meaningful = [w for w in words if len(w) > 3]
    if len(meaningful) != len(set(meaningful)):
        return False
    if words[-1] in ("de", "del", "la", "las", "los", "el", "y"):
        return False  # strip_muni_suffix se comió el nombre ('brisas de chapala' → 'brisas de')
    return True


def extract_canonical(key: str) -> tuple[str, str]:
    """
    Retorna (canonical, tipo_patron) o ("", "") si no aplica ningún patrón.
    tipo_patron: 'seguro' = fusión obvia, 'ai' = necesita validación AI.
    """
    # 1. "onia X" → "X" (truncado de "colonia X")
    m = RE_ONIA.match(key)
    if m:
        canon = strip_muni_suffix(m.group(1).strip())
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 2. "col X" → "X"
    m = RE_COL_PREFIX.match(key)
    if m:
        canon = strip_muni_suffix(m.group(1).strip())
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 2b. "ionamiento X" / "condominio X" → "X" (palabra genérica truncada)
    m = RE_TRUNCADO.match(key)
    if m:
        canon = strip_muni_suffix(m.group(1).strip())
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 2c. "omos X" → "colomos X", "inas X" → "colinas X" (la palabra truncada
    #     era parte del nombre; quitarla inventaba otra colonia)
    m = RE_TRUNC_NOMBRE.match(key)
    if m:
        canon = RESTAURA_TRUNC[m.group(1).lower()] + " " + strip_muni_suffix(m.group(2).strip())
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 3. "casa en X [municipio]" → "X"
    m = RE_CASA_EN.match(key)
    if m:
        rest = m.group(1).strip()
        canon = strip_muni_suffix(rest)
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 4. "terreno en X [municipio]" → "X"
    m = RE_TERRENO_EN.match(key)
    if m:
        rest = m.group(1).strip()
        canon = strip_muni_suffix(rest)
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 5. "lote en X [municipio]" → "X"
    m = RE_LOTE_EN.match(key)
    if m:
        rest = m.group(1).strip()
        canon = strip_muni_suffix(rest)
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 6. "predio en X [municipio]" → "X"
    m = RE_PREDIO_EN.match(key)
    if m:
        rest = m.group(1).strip()
        canon = strip_muni_suffix(rest)
        if is_valid_canonical(canon):
            return canon, "seguro"

    # 7. "X residential/neighborhood/colony/etc" → "X" — necesita AI
    m = RE_ENG_SUFFIX.match(key)
    if m:
        canon = strip_muni_suffix(m.group(1).strip())
        if is_valid_canonical(canon):
            return canon, "ai"

    # 8. "X colonia/fraccionamiento" (sufijo español también — raro pero existe)
    m = RE_COL_SUFFIX.match(key)
    if m:
        canon = strip_muni_suffix(m.group(1).strip())
        if is_valid_canonical(canon):
            return canon, "seguro"

    return "", ""


# ── DeepSeek validation ───────────────────────────────────────────────────────

def llamar_deepseek(casos: list[dict]) -> dict:
    """
    casos = [{"frag": "...", "canon": "...", "muni": "..."}]
    Retorna {frag → True/False} donde True = fusionar.
    """
    if not DEEPSEEK_KEY:
        print("  [WARN] Sin DEEPSEEK_API_KEY — asumiendo False para todos los casos AI")
        return {c["frag"]: False for c in casos}

    items = "\n".join(
        f'{i+1}. fragment="{c["frag"]}" canonical="{c["canon"]}" municipio="{c["muni"]}"'
        for i, c in enumerate(casos)
    )
    prompt = (
        "Eres experto en colonias/fraccionamientos de Jalisco, México. "
        "Para cada par (fragment, canonical), decide si son la MISMA colonia real:\n"
        "- 'onia X' → probablemente truncado de 'Colonia X'\n"
        "- 'X residential/neighborhood/colony' → puede ser 'Colonia X' o ser un fraccionamiento DISTINTO\n"
        "REGLA: solo di True si estás SEGURO que es la misma colonia real. "
        "Si tienes duda, di False (conservador).\n"
        "Responde SOLO con JSON: [{\"frag\":\"...\", \"fusionar\":true/false}, ...]\n\n"
        + items
    )

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {DEEPSEEK_KEY}", "Content-Type": "application/json"}

    for attempt in range(4):
        try:
            resp = requests.post(DEEPSEEK_URL, json=payload, headers=headers, timeout=120)
            if resp.status_code == 429:
                wait = 20 * (2 ** attempt)
                print(f"    [429] Esperando {wait}s...")
                time.sleep(wait)
                continue
            if resp.status_code != 200:
                print(f"    [ERROR] HTTP {resp.status_code}: {resp.text[:200]}")
                time.sleep(5)
                continue
            texto = resp.json()["choices"][0]["message"]["content"].strip()
            texto = re.sub(r"^```(?:json)?\s*", "", texto)
            texto = re.sub(r"\s*```$", "", texto)
            data = json.loads(texto)
            if isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list):
                        data = v
                        break
            result = {}
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "frag" in item:
                        result[item["frag"]] = bool(item.get("fusionar", False))
            return result
        except Exception as e:
            print(f"    [EXCEPCION] {e}")
            time.sleep(5)

    return {c["frag"]: False for c in casos}


# ── Funciones de merge de listings ───────────────────────────────────────────

def mediana(arr: list) -> float:
    if not arr:
        return 0
    s = sorted(arr)
    n = len(s)
    m = n // 2
    return s[m] if n % 2 else (s[m - 1] + s[m]) / 2


def recalcular_celda(listings: list, tipo: str) -> dict:
    """Recalcula mediana, count y edadMedianaZona a partir de listings raw."""
    # Dedup por precio±2% + m2c/m2t
    seen = set()
    deduped = []
    for l in listings:
        key = f"{round(l.get('precio', 0) / 1000)}_{l.get('m2c') or l.get('m2t')}"
        if key not in seen:
            seen.add(key)
            deduped.append(l)

    es_terreno = (tipo == "terreno")
    pm2cs = []
    for l in deduped:
        if es_terreno and l.get("m2t", 0) > 0:
            pm2cs.append(l["precio"] / l["m2t"])
        elif not es_terreno and l.get("m2c", 0) > 0:
            pm2cs.append(l["precio"] / l["m2c"])

    ANIO_ACTUAL = 2026
    edades = []
    for l in deduped:
        try:
            anio = int(l.get("anio") or 0)
            if 1900 < anio <= ANIO_ACTUAL:
                edades.append(ANIO_ACTUAL - anio)
        except (ValueError, TypeError):
            pass

    return {
        "listings": deduped,
        "medianaPm2c": round(mediana(pm2cs)) if pm2cs else None,
        "count": len(deduped),
        "edadMedianaZona": round(mediana(edades)) if len(edades) >= 3 else None,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--skip-ai", action="store_true", help="Solo patrones obvios, sin llamada AI")
    args = parser.parse_args()

    print("=== consolidar_colonias_idx.py ===")
    print(f"Modo: {'APLICAR' if args.apply else 'DRY-RUN'} | AI: {'SKIP' if args.skip_ai else 'ACTIVO'}")

    # ── Backups ───────────────────────────────────────────────────────────────
    if args.apply:
        bak_idx = CACHE_IDX_PATH.with_suffix(".consolidacion.bak.json")
        bak_mae = MAESTRO_PATH.with_suffix(".consolidacion.bak.json")
        if not bak_idx.exists():
            bak_idx.write_bytes(CACHE_IDX_PATH.read_bytes())
            print(f"  Backup: {bak_idx.name}")
        if not bak_mae.exists():
            bak_mae.write_bytes(MAESTRO_PATH.read_bytes())
            print(f"  Backup: {bak_mae.name}")

    # ── Cargar archivos ───────────────────────────────────────────────────────
    print("\n[1] Cargando archivos...")
    idx_raw = json.loads(CACHE_IDX_PATH.read_text(encoding="utf-8"))
    maestro = json.loads(MAESTRO_PATH.read_text(encoding="utf-8"))
    # Separar _meta del resto
    _meta = idx_raw.pop("_meta", None)
    idx = idx_raw
    total_celdas = sum(
        len(idx[m][t]) for m in idx for t in idx[m]
        if isinstance(idx[m], dict) and isinstance(idx[m].get(t), dict)
    )
    print(f"  cache_index: {total_celdas} celdas")
    print(f"  colonias_maestro: {len(maestro)} colonias")

    # ── Recolectar todas las claves únicas de cache_index ────────────────────
    print("\n[2] Analizando fragmentos...")
    # {frag_key → [(muni, tipo)]} donde existen en cache_index
    frag_locations: dict[str, list] = defaultdict(list)
    for muni in idx:
        if not isinstance(idx[muni], dict):
            continue
        for tipo in idx[muni]:
            if not isinstance(idx[muni][tipo], dict):
                continue
            for col in idx[muni][tipo]:
                frag_locations[col].append((muni, tipo))

    total_keys = len(frag_locations)
    print(f"  Total claves únicas en cache_index: {total_keys}")

    # ── Detectar candidatos ───────────────────────────────────────────────────
    candidatos_seguros: dict[str, str] = {}   # frag → canon
    candidatos_ai: list[dict] = []
    rechazados = 0

    for key in frag_locations:
        canon, tipo_patron = extract_canonical(key)
        if not canon or canon == key:
            rechazados += 1
            continue

        if tipo_patron == "seguro":
            candidatos_seguros[key] = canon
        elif tipo_patron == "ai" and not args.skip_ai:
            # Get representative municipio
            muni = frag_locations[key][0][0]
            candidatos_ai.append({"frag": key, "canon": canon, "muni": muni})

    print(f"  Candidatos seguros (no-AI): {len(candidatos_seguros)}")
    print(f"  Candidatos AI:              {len(candidatos_ai)}")
    print(f"  Sin patrón (ok):            {rechazados}")

    # ── Validación AI ─────────────────────────────────────────────────────────
    ai_aprobados: dict[str, str] = {}  # frag → canon
    if candidatos_ai and not args.skip_ai:
        print(f"\n[3] Validando {len(candidatos_ai)} casos con DeepSeek (lotes de 40)...")
        BATCH = 40
        for i in range(0, len(candidatos_ai), BATCH):
            lote = candidatos_ai[i:i + BATCH]
            n_batch = i // BATCH + 1
            n_total = math.ceil(len(candidatos_ai) / BATCH)
            print(f"  Lote {n_batch}/{n_total} ({len(lote)} casos)...")
            result = llamar_deepseek(lote)
            for caso in lote:
                if result.get(caso["frag"], False):
                    ai_aprobados[caso["frag"]] = caso["canon"]
            time.sleep(1.0)
        print(f"  AI aprobó: {len(ai_aprobados)}/{len(candidatos_ai)}")
    else:
        print("\n[3] AI: SKIP")

    # ── Mapa final de fusiones ─────────────────────────────────────────────────
    fusiones: dict[str, str] = {**candidatos_seguros, **ai_aprobados}

    # Filtro de seguridad: no fusionar si el canon es más largo que el fragmento
    # (indica extracción errónea)
    fusiones = {
        frag: canon
        for frag, canon in fusiones.items()
        # canon más corto = se quitó un decorador. La excepción son las
        # restauraciones ('omos X' → 'colomos X'), que sí alargan.
        if len(canon) < len(frag) or canon.split()[0] in RESTAURA_TRUNC.values()
    }

    print(f"\n[4] Total fusiones a aplicar: {len(fusiones)}")

    # Mostrar sample
    sample_by_pattern = defaultdict(list)
    for frag, canon in sorted(fusiones.items()):
        if frag.startswith("onia "):
            sample_by_pattern["onia"].append((frag, canon))
        elif frag.startswith("casa en "):
            sample_by_pattern["casa_en"].append((frag, canon))
        elif frag.startswith("terreno en "):
            sample_by_pattern["terreno_en"].append((frag, canon))
        elif "residential" in frag:
            sample_by_pattern["residential"].append((frag, canon))
        else:
            sample_by_pattern["otros"].append((frag, canon))

    for pat, items in sample_by_pattern.items():
        print(f"\n  Patrón '{pat}' ({len(items)} fusiones):")
        for frag, canon in items[:5]:
            locs = frag_locations.get(frag, [])
            total_comps = sum(
                idx.get(m, {}).get(t, {}).get(frag, {}).get("count", 0)
                for m, t in locs
            )
            print(f"    '{frag}' ({total_comps} comps) → '{canon}'")

    if not args.apply:
        # Estimar comps recuperables
        total_comps_frag = sum(
            idx.get(m, {}).get(t, {}).get(frag, {}).get("count", 0)
            for frag in fusiones
            for m, t in frag_locations.get(frag, [])
        )
        print(f"\n  Comps recuperables estimados: {total_comps_frag}")
        print("\n[DRY-RUN] No se aplicaron cambios. Usa --apply para escribir.")
        return

    # ── Aplicar fusiones en cache_index ──────────────────────────────────────
    print("\n[5] Aplicando fusiones en cache_index.json...")
    fusiones_aplicadas_idx = 0
    comps_recuperados = 0

    for frag, canon in fusiones.items():
        locs = frag_locations.get(frag, [])
        for muni, tipo in locs:
            celda_frag = idx.get(muni, {}).get(tipo, {}).get(frag)
            if not celda_frag:
                continue

            # Asegurar que existe la celda canónica
            if muni not in idx:
                idx[muni] = {}
            if tipo not in idx[muni]:
                idx[muni][tipo] = {}

            listings_frag = celda_frag.get("listings", [])
            comps_frag = len(listings_frag)

            if canon not in idx[muni][tipo]:
                # Canon no existe → renombrar
                idx[muni][tipo][canon] = recalcular_celda(listings_frag, tipo)
            else:
                # Canon existe → fusionar listings
                listings_canon = idx[muni][tipo][canon].get("listings", [])
                combined = listings_canon + listings_frag
                idx[muni][tipo][canon] = recalcular_celda(combined, tipo)

            # Eliminar fragmento
            del idx[muni][tipo][frag]
            fusiones_aplicadas_idx += 1
            comps_recuperados += comps_frag

    print(f"  Celdas fusionadas: {fusiones_aplicadas_idx}")
    print(f"  Comps recuperados: {comps_recuperados}")

    # ── Aplicar fusiones en colonias_maestro ──────────────────────────────────
    print("\n[6] Aplicando fusiones en colonias_maestro.json...")
    fusiones_aplicadas_mae = 0

    for frag, canon in fusiones.items():
        if frag not in maestro:
            continue  # fragmento no tiene entrada en maestro

        rec_frag = maestro[frag]

        if canon not in maestro:
            # Canon no existe en maestro → renombrar
            maestro[canon] = rec_frag
        else:
            rec_canon = maestro[canon]
            # Solo copiar campos que el canon no tiene
            for campo in ["municipio", "zona", "cp"]:
                if campo not in rec_canon and campo in rec_frag:
                    rec_canon[campo] = rec_frag[campo]
            # NSE: si canon no tiene v1 pero frag sí
            if "nse" in rec_frag and "nse" in rec_canon:
                frag_nse = rec_frag["nse"]
                for sub in ["v1", "perito", "v2"]:
                    if sub in frag_nse and sub not in rec_canon["nse"]:
                        rec_canon["nse"][sub] = frag_nse[sub]

        # Eliminar fragmento del maestro
        del maestro[frag]
        fusiones_aplicadas_mae += 1

    print(f"  Entradas de maestro fusionadas: {fusiones_aplicadas_mae}")

    # ── Guardar ───────────────────────────────────────────────────────────────
    print("\n[7] Guardando archivos...")
    # Restaurar _meta al escribir
    idx_out = idx
    if _meta is not None:
        idx_out = {"_meta": _meta, **idx}
    CACHE_IDX_PATH.write_text(json.dumps(idx_out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {CACHE_IDX_PATH.name} guardado")

    MAESTRO_PATH.write_text(json.dumps(maestro, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  {MAESTRO_PATH.name} guardado")

    # ── Verificación Seattle ──────────────────────────────────────────────────
    print("\n[8] Verificación canaria (Seattle, Zapopan):")
    for tipo in ["casa", "depto", "terreno"]:
        celda = idx.get("zapopan", {}).get(tipo, {}).get("seattle", {})
        count = celda.get("count", 0)
        mediana_pm2 = celda.get("medianaPm2c")
        print(f"  zapopan/{tipo}/seattle: count={count}, medianaPm2c={mediana_pm2}")

    # Verificar que no queden fragmentos "onia seattle", "terreno en seattle zapopan"
    for frag in ["onia seattle", "terreno en seattle zapopan", "seattle neighborhood"]:
        still_exists = any(
            frag in idx.get(m, {}).get(t, {})
            for m in idx
            for t in idx.get(m, {})
        )
        print(f"  Fragmento '{frag}' eliminado: {'NO (ERROR)' if still_exists else 'OK'}")

    print("\n=== DONE ===")
    print(f"Fusiones aplicadas: {fusiones_aplicadas_idx} celdas en cache_index, {fusiones_aplicadas_mae} entradas en maestro")
    print(f"Comps recuperados: {comps_recuperados}")
    print("Para revertir: cp cache_index.consolidacion.bak.json cache_index.json && cp colonias_maestro.consolidacion.bak.json colonias_maestro.json")


if __name__ == "__main__":
    main()
