"""
actualizar_cache_consolidado_mongo.py — Builder del caché del motor DESDE MongoDB.

Reemplaza a actualizar_cache_consolidado.js (que leía de Google Sheets). Mongo es ahora
la fuente única de verdad (más limpio, mejor cobertura de estac/año). Replica exactamente
el pipeline del JS legacy: filtro venta + m2c>0 + precio>=100k, corrección terreno c->t,
y dedup por colonia+área — para que el resultado sea equivalente (validado neutral: ±15/±20
idénticos, errAbs 15.6->15.2 en 103 OPIs 2025-26).

Solo LECTURA de Mongo. Salida: cache_consolidado.json (mismo formato que el builder JS).
Uso:  python actualizar_cache_consolidado_mongo.py
"""
import json, unicodedata
from datetime import datetime
from pathlib import Path
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
OUT = Path(__file__).parent / "cache_consolidado.json"
TIPOS_TERRENO = {"terreno", "lote", "predio", "solar"}


def low(s):  return (s or "").lower().strip()
def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def main():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000, connectTimeoutMS=60000)
    col = cli["propvalu"]["mercado_props"]
    q = {"tipo_operacion": {"$regex": "venta", "$options": "i"}, "activo": {"$ne": False},
         "es_duplicado_secundario": {"$ne": True}, "m2_construccion": {"$gt": 0}, "precio": {"$gte": 100000}}
    proj = {"precio": 1, "m2_construccion": 1, "m2_terreno": 1, "tipo_propiedad": 1, "colonia": 1,
            "municipio": 1, "recamaras": 1, "banos": 1, "estacionamientos": 1, "fecha_scraping": 1, "anio_construccion": 1}

    raw = []
    for d in col.find(q, proj, batch_size=500):
        raw.append({
            "precio": round(d["precio"]), "m2c": round(d["m2_construccion"]), "m2t": round(d.get("m2_terreno") or 0),
            "tipo": low(d.get("tipo_propiedad")), "colonia": low(d.get("colonia")), "muni": low(d.get("municipio")),
            "recamaras": d.get("recamaras") or None, "banos": d.get("banos") or None, "estac": d.get("estacionamientos") or None,
            "fecha": (str(d.get("fecha_scraping") or ""))[:10] or None, "anio": d.get("anio_construccion") or None,
        })
    print(f"Crudos (filtro venta): {len(raw):,}")

    # Corrección terreno c->t (bug de fallback del scraper: área sin etiquetar cae en m2c)
    corr = 0
    for d in raw:
        if any(t in d["tipo"] for t in TIPOS_TERRENO) and d["m2t"] == 0 and d["m2c"] > 0:
            d["m2t"] = d["m2c"]; d["m2c"] = 0; corr += 1

    # Dedup: mismo colonia + área (el JS legacy usa pKey constante → dedup por colonia+área)
    seen, comp = set(), []
    for d in raw:
        area = d["m2c"] if d["m2c"] > 0 else d["m2t"]
        key = f"{norm(d['colonia'])}|{area}|100"
        if key in seen:
            continue
        seen.add(key); comp.append(d)

    meta = {"fecha_actualizacion": datetime.now().isoformat(), "total_cache": len(comp), "fuente": "MONGO mercado_props"}
    OUT.write_text(json.dumps({"meta": meta, "datos": comp}), encoding="utf-8")
    ce = sum(1 for d in comp if d["recamaras"] or d["banos"]); es = sum(1 for d in comp if d["estac"])
    print(f"terreno c->t: {corr:,} | dups eliminados: {len(raw)-len(comp):,}")
    print(f"cache_consolidado.json: {len(comp):,} comps | rec/baños {100*ce/len(comp):.0f}% | estac {100*es/len(comp):.0f}%")


if __name__ == "__main__":
    main()
