"""
actualizar_cache_consolidado_mongo_limpio.py

Igual que actualizar_cache_consolidado_mongo.py PERO excluye comps con
$/m²C por debajo de 0.5 × ancla NSE de su colonia.

Lógica:
  - pm2c = precio / m2c (precio por m² construido)
  - Si colonia está en colonias_nse.json: excluir si pm2c < 0.5 × medianaPm2
  - Si no está: excluir si pm2c < PISO_ABSOLUTO ($8,000)

NO escribe a Mongo. Salida: cache_consolidado_limpio.json
Uso: python actualizar_cache_consolidado_mongo_limpio.py
"""
import json, unicodedata
from datetime import datetime
from pathlib import Path
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
OUT       = Path(__file__).parent / "cache_consolidado_limpio.json"
NSE_PATH  = Path(__file__).parent / "colonias_nse.json"
TIPOS_TERRENO = {"terreno", "lote", "predio", "solar"}
PISO_ABSOLUTO = 8_000   # $/m²C mínimo para colonias sin ancla NSE


def low(s):
    return (s or "").lower().strip()

def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def main():
    # Cargar anclas NSE
    nse = {}
    if NSE_PATH.exists():
        nse = json.loads(NSE_PATH.read_text(encoding="utf-8"))
    print(f"NSE anclas cargadas: {len(nse)} colonias")

    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000, connectTimeoutMS=60000)
    col = cli["propvalu"]["mercado_props"]
    q = {
        "tipo_operacion": {"$regex": "venta", "$options": "i"},
        "activo": {"$ne": False},
        "es_duplicado_secundario": {"$ne": True},
        "m2_construccion": {"$gt": 0},
        "precio": {"$gte": 100000},
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

    # Corrección terreno c->t
    corr = 0
    for d in raw:
        if any(t in d["tipo"] for t in TIPOS_TERRENO) and d["m2t"] == 0 and d["m2c"] > 0:
            d["m2t"] = d["m2c"]; d["m2c"] = 0; corr += 1

    # ── Filtro NSE / piso absoluto ────────────────────────────────────────────
    excluidos = 0
    excl_por_portal = {}
    limpio = []
    for d in raw:
        m2c = d["m2c"]
        if m2c <= 0:          # terreno (ya corregido) → no tiene pm2c → pasar
            limpio.append(d)
            continue
        pm2c = d["precio"] / m2c
        col_norm = norm(d["colonia"])
        ancla = nse.get(col_norm, {}).get("medianaPm2", 0)
        if ancla > 0:
            umbral = ancla * 0.5
            razon = f"NSE ancla={ancla} umbral={umbral:.0f}"
        else:
            umbral = PISO_ABSOLUTO
            razon = f"piso absoluto {PISO_ABSOLUTO}"

        if pm2c < umbral:
            excluidos += 1
            portal = d.get("portal", "?")
            excl_por_portal[portal] = excl_por_portal.get(portal, 0) + 1
            continue
        limpio.append(d)

    print(f"Excluidos por filtro NSE/piso: {excluidos:,}")
    print(f"  Por portal: {dict(sorted(excl_por_portal.items(), key=lambda x: -x[1]))}")

    # Dedup
    seen, comp = set(), []
    for d in limpio:
        area = d["m2c"] if d["m2c"] > 0 else d["m2t"]
        key = f"{norm(d['colonia'])}|{area}|100"
        if key in seen:
            continue
        seen.add(key); comp.append(d)

    meta = {
        "fecha_actualizacion": datetime.now().isoformat(),
        "total_cache": len(comp),
        "fuente": "MONGO mercado_props — LIMPIO (filtro NSE 0.5×ancla)",
        "excluidos_basura": excluidos,
        "piso_absoluto": PISO_ABSOLUTO,
    }
    OUT.write_text(json.dumps({"meta": meta, "datos": comp}), encoding="utf-8")
    ce = sum(1 for d in comp if d["recamaras"] or d["banos"])
    es = sum(1 for d in comp if d["estac"])
    print(f"terreno c->t: {corr:,} | dups eliminados: {len(limpio)-len(comp):,}")
    print(f"cache_consolidado_limpio.json: {len(comp):,} comps | rec/baños {100*ce/len(comp) if comp else 0:.0f}% | estac {100*es/len(comp) if comp else 0:.0f}%")
    print(f"Reducción vs original: {excluidos:,} registros basura excluidos")


if __name__ == "__main__":
    main()
