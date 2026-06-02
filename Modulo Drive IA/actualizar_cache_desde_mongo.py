"""
actualizar_cache_desde_mongo.py — Construye cache_consolidado.json desde MongoDB
(mercado_props), el almacén PRIMARIO. Reemplaza la dependencia de Google Sheets
para el motor (Sheets queda solo como respaldo del scraper).

Replica EXACTAMENTE la lógica de actualizar_cache_desde_mongo (Sheets):
filtro venta+m2c>0+precio>=100k, mapeo a {p,c,t,tp,co,mu,re,ba,es,fs,an},
corrección terreno c→t, y dedup por contenido (colonia|area|pKey).

Uso:  python actualizar_cache_desde_mongo.py
Salida: cache_consolidado.json  (luego: node build_cache_index.js)
"""
import os, json, re, unicodedata
from datetime import datetime, timezone
from pathlib import Path
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / ".env")           # raíz del proyecto
load_dotenv(HERE.parent / "backend" / ".env")  # fallback: MONGO_URL/DB_NAME del backend
OUT = HERE / "cache_consolidado.json"

TIPOS_TERRENO = ["terreno", "lote", "predio", "solar"]


def clean_num(v):
    if v is None:
        return 0
    try:
        s = re.sub(r"[$,\s]", "", str(v))
        return float(s) if s else 0
    except (ValueError, TypeError):
        return 0


def norm_str(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip()


def main():
    client = MongoClient(os.environ["MONGO_URL"], tlsCAFile=certifi.where())
    db = client[os.environ["DB_NAME"]]
    col = db["mercado_props"]

    total_original = col.count_documents({})
    print(f"mercado_props total: {total_original:,}. Filtrando...")

    proj = {"_id": 0, "precio": 1, "m2_construccion": 1, "m2_terreno": 1,
            "tipo_propiedad": 1, "tipo_operacion": 1, "colonia": 1, "municipio": 1,
            "recamaras": 1, "banos": 1, "estacionamientos": 1, "fecha_scraping": 1,
            "anio_construccion": 1, "activo": 1}

    raw = []
    anio_now = datetime.now().year
    for r in col.find({}, proj):
        activo = str(r.get("activo", "")).lower()
        if activo in ("false", "0"):
            continue
        m2c = clean_num(r.get("m2_construccion"))
        precio = clean_num(r.get("precio"))
        tipo_op = str(r.get("tipo_operacion", "")).lower()
        if not (m2c > 0 and precio >= 100000 and "venta" in tipo_op):
            continue

        # año (el scraper ya convierte antigüedad→año). Solo guardar años plausibles.
        an = None
        an_raw = r.get("anio_construccion")
        if an_raw not in (None, "", 0):
            try:
                ai = int(float(str(an_raw)))
                if 1900 <= ai <= anio_now + 1:
                    an = ai
            except (ValueError, TypeError):
                an = None

        fs = r.get("fecha_scraping")
        if isinstance(fs, datetime):
            fs = fs.isoformat()[:10]
        elif fs:
            fs = str(fs)[:10]
        else:
            fs = None

        d = {
            "p": round(precio),
            "c": round(m2c),
            "t": round(clean_num(r.get("m2_terreno"))) or 0,
            "tp": str(r.get("tipo_propiedad", "")).lower(),
            "co": str(r.get("colonia", "")).lower(),
            "mu": str(r.get("municipio", "")).lower(),
            "re": clean_num(r.get("recamaras")) or None,
            "ba": clean_num(r.get("banos")) or None,
            "es": clean_num(r.get("estacionamientos")) or None,
            "fs": fs,
        }
        if an is not None:
            d["an"] = an
        raw.append(d)

    # Corrección terreno: c→t cuando t=0 y c>0 y tipo es terreno
    corregidos = 0
    for d in raw:
        if any(tt in d["tp"] for tt in TIPOS_TERRENO) and d["t"] == 0 and d["c"] > 0:
            d["t"] = d["c"]
            d["c"] = 0
            corregidos += 1
    if corregidos:
        print(f"Corrección terreno c→t: {corregidos:,}")

    # Dedup por contenido (idéntico a la versión Sheets): colonia|area|pKey
    seen = set()
    compacto = []
    for d in raw:
        coln = norm_str(d["co"])
        p_key = round(d["p"] / (max(d["p"], 1) * 0.01))  # ≡100 (mismo comportamiento que JS)
        area = d["c"] if d["c"] > 0 else d["t"]
        key = f"{coln}|{area}|{p_key}"
        if key in seen:
            continue
        seen.add(key)
        compacto.append(d)
    n_dups = len(raw) - len(compacto)
    if n_dups:
        print(f"Duplicados eliminados: {n_dups:,} ({round(100*n_dups/max(len(raw),1))}%)")

    con_an = sum(1 for d in compacto if d.get("an") is not None)
    meta = {
        "fecha_actualizacion": datetime.now(timezone.utc).isoformat(),
        "total_original": total_original,
        "total_cache": len(compacto),
        "fuente": "mongodb:mercado_props",
        "con_anio": con_an,
    }
    OUT.write_text(json.dumps({"meta": meta, "datos": compacto}), encoding="utf-8")
    print(f"cache_consolidado.json: {len(compacto):,} comps (con año: {con_an:,}) ← MongoDB")


if __name__ == "__main__":
    main()
