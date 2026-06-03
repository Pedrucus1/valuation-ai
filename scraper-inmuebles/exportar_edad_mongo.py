"""exportar_edad_mongo.py — Puente de EDAD Mongo → motor (#90/#91).

Lee de mercado_props los docs con anio_construccion y exporta un archivo
`edad_mongo.json` (en el dir del motor) con {mu, co, tp, an} por propiedad.

`build_cache_index.js` lo lee y calcula `edadMedianaZona` por colonia con SU
propia normalización, en un pool SEPARADO de los listings de precio (no distorsiona
$/m²). Mongo es la fuente oficial de edad; el caché de precio (Sheets) no se toca.

Uso:  python exportar_edad_mongo.py
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
MOTOR_DIR = Path(__file__).resolve().parent.parent / "Modulo Drive IA"
OUT = MOTOR_DIR / "edad_mongo.json"
ANIO_ACTUAL = __import__("datetime").date.today().year


def main():
    c = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"),
                    serverSelectionTimeoutMS=30000, retryReads=True)
    col = c[os.getenv("DB_NAME", "propvalu")]["mercado_props"]
    q = {"anio_construccion": {"$ne": None},
         "colonia": {"$nin": [None, ""]},
         "municipio": {"$nin": [None, ""]}}
    proj = {"_id": 0, "municipio": 1, "colonia": 1, "tipo_propiedad": 1, "anio_construccion": 1}
    out = []
    for d in col.find(q, proj):
        try:
            an = int(float(d["anio_construccion"]))
        except (ValueError, TypeError):
            continue
        if not (1900 < an <= ANIO_ACTUAL + 1):
            continue
        out.append({
            "mu": d.get("municipio", ""),
            "co": d.get("colonia", ""),
            "tp": d.get("tipo_propiedad", "") or "casa",
            "an": an,
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    # resumen: colonias con ≥3 (las que producirán edadMedianaZona)
    from collections import Counter
    cnt = Counter((o["mu"].strip().lower(), o["co"].strip().lower(), o["tp"].strip().lower()) for o in out)
    con3 = sum(1 for v in cnt.values() if v >= 3)
    print(f"edad_mongo.json: {len(out)} props con año exportadas → {OUT}")
    print(f"  combinaciones (muni,colonia,tipo) con ≥3 años: {con3}")


if __name__ == "__main__":
    main()
