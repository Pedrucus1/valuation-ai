"""
actualizar_cache_consolidado_mongo.py — Builder del caché del motor DESDE MongoDB.

Reemplaza a actualizar_cache_consolidado.js (que leía de Google Sheets). Mongo es ahora
la fuente única de verdad (más limpio, mejor cobertura de estac/año). Replica exactamente
el pipeline del JS legacy: filtro venta + m2c>0 + precio>=100k, corrección terreno c->t,
y dedup por colonia+área.

──────────────────────────────────────────────────────────────────────────────
FILTRO ANTI-BASURA (#121b)
──────────────────────────────────────────────────────────────────────────────
Excluye comps con $/m²C por debajo de 0.5 × ancla NSE de su colonia.
  - Si colonia está en colonias_nse.json → umbral = medianaPm2 × 0.5
  - Si no está                          → umbral = PISO_ABSOLUTO ($8,000)
Los terrenos (m2c==0 tras corrección) se pasan sin filtro.

EXCLUSIÓN MITULA (#121b — validado lab 07-Jul-2026):
  Portal MITULA (via Lamudi) tiene un bug documentado de datos corruptos que
  envenena el pool de comps (m2c×1000, precios no confiables). Se excluye
  COMPLETO al construir el caché — es más limpio que filtrar en el motor y
  aplica a todos los tipos de propiedad, no solo residencial.
  Lab: ±10 55.3→63.1 / ±15 63.1→69.9 / ±20 76.7→79.6 / errAbs 13.2→11.6 (103 OPIs).
──────────────────────────────────────────────────────────────────────────────

Solo LECTURA de Mongo. Salida: cache_consolidado.json
Uso:  python actualizar_cache_consolidado_mongo.py
"""
import json, os, unicodedata
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# MONGO_URL desde .env — NUNCA hardcodear (secret scanning). Busca en scraper y raíz del repo.
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / "scraper-inmuebles" / ".env")
load_dotenv(_ROOT / ".env")
MONGO_URL     = os.environ["MONGO_URL"]
OUT           = Path(__file__).parent / "cache_consolidado.json"
NSE_PATH      = Path(__file__).parent / "colonias_nse.json"
TIPOS_TERRENO = {"terreno", "lote", "predio", "solar"}
PISO_ABSOLUTO = 8_000    # $/m²C mínimo para colonias sin ancla NSE


def low(s):  return (s or "").lower().strip()

def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def main():
    # ── Cargar anclas NSE ─────────────────────────────────────────────────────
    nse = {}
    if NSE_PATH.exists():
        nse = json.loads(NSE_PATH.read_text(encoding="utf-8"))
    print(f"NSE anclas cargadas: {len(nse)} colonias")

    # ── Mongo ─────────────────────────────────────────────────────────────────
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000, connectTimeoutMS=60000)
    col = cli["propvalu"]["mercado_props"]
    q = {
        "tipo_operacion": {"$regex": "venta", "$options": "i"},
        "activo":                     {"$ne": False},
        "es_duplicado_secundario":    {"$ne": True},
        # NO filtrar `duplicado`/`es_remate` aquí: PROBADO 13-jul, encoge el pool y
        # empeora el motor (±10 −2.9, ±15 −3.0, ±20 flat, errAbs +0.9). Los comps extra
        # ayudan la mediana más de lo que estorban. Ver MOTOR_ANTECEDENTES.
        "m2_construccion":            {"$gt": 0},
        "precio":                     {"$gte": 100000},
    }
    proj = {
        "precio": 1, "m2_construccion": 1, "m2_terreno": 1, "tipo_propiedad": 1,
        "colonia": 1, "municipio": 1, "recamaras": 1, "banos": 1, "estacionamientos": 1,
        "fecha_scraping": 1, "anio_construccion": 1, "portal_origen": 1,
    }

    raw = []
    for d in col.find(q, proj, batch_size=500):
        raw.append({
            "precio":    round(d["precio"]),
            "m2c":       round(d["m2_construccion"]),
            "m2t":       round(d.get("m2_terreno") or 0),
            "tipo":      low(d.get("tipo_propiedad")),
            "colonia":   low(d.get("colonia")),
            "muni":      low(d.get("municipio")),
            "recamaras": d.get("recamaras") or None,
            "banos":     d.get("banos") or None,
            "estac":     d.get("estacionamientos") or None,
            "fecha":     (str(d.get("fecha_scraping") or ""))[:10] or None,
            "anio":      d.get("anio_construccion") or None,
            "portal":    d.get("portal_origen", ""),
        })
    print(f"Crudos (filtro venta): {len(raw):,}")

    # ── Corrección terreno c->t ───────────────────────────────────────────────
    corr = 0
    for d in raw:
        if any(t in d["tipo"] for t in TIPOS_TERRENO) and d["m2t"] == 0 and d["m2c"] > 0:
            d["m2t"] = d["m2c"]; d["m2c"] = 0; corr += 1

    # ── Exclusión MITULA: portal con datos corruptos (#121b) ──────────────────
    # Bug documentado: m2c viene ×1000, precios no confiables. Excluir completo.
    # Validado en lab 07-Jul-2026: ±20 76.7→79.6, cero regresión en 103 OPIs.
    n_antes_mitula = len(raw)
    raw = [d for d in raw if d.get("portal", "").upper() != "MITULA"]
    mitula_excluidos = n_antes_mitula - len(raw)
    print(f"MITULA excluidos del pool: {mitula_excluidos:,} (de {n_antes_mitula:,} crudos)")

    # ── Filtro anti-basura: NSE 0.5× ancla + piso absoluto ───────────────────
    excluidos = 0
    excl_por_portal = {}
    limpio = []
    for d in raw:
        m2c = d["m2c"]
        if m2c <= 0:
            # Terreno (ya corregido c->t) → sin $/m²C → pasar sin filtro
            limpio.append(d)
            continue
        pm2c = d["precio"] / m2c
        col_norm = norm(d["colonia"])
        ancla = nse.get(col_norm, {}).get("medianaPm2", 0)
        if ancla > 0:
            umbral = ancla * 0.5
        else:
            umbral = PISO_ABSOLUTO

        if pm2c < umbral:
            excluidos += 1
            portal = d.get("portal", "?")
            excl_por_portal[portal] = excl_por_portal.get(portal, 0) + 1
            continue
        limpio.append(d)

    print(f"Excluidos por filtro NSE/piso: {excluidos:,}")
    print(f"  Por portal: {dict(sorted(excl_por_portal.items(), key=lambda x: -x[1]))}")

    # ── Dedup: mismo colonia + área ───────────────────────────────────────────
    seen, comp = set(), []
    for d in limpio:
        area = d["m2c"] if d["m2c"] > 0 else d["m2t"]
        key = f"{norm(d['colonia'])}|{area}|100"
        if key in seen:
            continue
        seen.add(key); comp.append(d)

    meta = {
        "fecha_actualizacion":   datetime.now().isoformat(),
        "total_cache":           len(comp),
        "fuente":                "MONGO mercado_props — filtro anti-basura NSE 0.5×ancla + excl.MITULA (#121b)",
        "excluidos_basura":      excluidos,
        "piso_absoluto":         PISO_ABSOLUTO,
        "mitula_excluidos":      mitula_excluidos,
    }
    OUT.write_text(json.dumps({"meta": meta, "datos": comp}), encoding="utf-8")
    ce = sum(1 for d in comp if d["recamaras"] or d["banos"])
    es = sum(1 for d in comp if d["estac"])
    print(f"terreno c->t: {corr:,} | dups eliminados: {len(limpio)-len(comp):,}")
    print(f"cache_consolidado.json: {len(comp):,} comps | rec/baños {100*ce/len(comp) if comp else 0:.0f}% | estac {100*es/len(comp) if comp else 0:.0f}%")


if __name__ == "__main__":
    main()
