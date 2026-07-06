import os
from dotenv import load_dotenv; load_dotenv()
"""
backfill_estac_pincali.py — Backfill QUIRÚRGICO de estacionamiento en PINCALI.

Solo baja el detalle y escribe `estacionamientos` (del JSON embebido "Parking Spaces":N,
verificado 8/8). NO toca colonia/año/ningún otro campo → cero riesgo de dañar datos
(la memoria advierte que PINCALI/MITULA se dañaron por re-extracción ciega).

Uso:
  python backfill_estac_pincali.py --shard 0/3 --max 6000
  (lanzar 0/3, 1/3, 2/3 en paralelo para repartir sin pisarse)

Marca `estac_backfill_attempt` (ISO) en cada intento → no re-baja lo ya intentado.
"""
import argparse, re, time, random, zlib
from datetime import datetime
import requests
from pymongo import MongoClient

MONGO_URL = os.environ["MONGO_URL"]
PARK_RE = re.compile(r'Parking Spaces(?:&quot;|")\s*:\s*(\d+)')
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


def fetch(url):
    for intento in range(3):
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
            if r.status_code == 200 and len(r.text) > 5000:
                return r.text
            if r.status_code == 404:
                return ""  # anuncio caído
        except Exception:
            pass
        time.sleep(random.uniform(5, 10))
    return None  # fallo de red → reintentar en otra corrida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shard", default=None, help="n/m, ej 0/3")
    ap.add_argument("--max", type=int, default=20000)
    args = ap.parse_args()
    shard = tuple(int(x) for x in args.shard.split("/")) if args.shard else None
    tag = f"[shard {args.shard}]" if shard else "[full]"

    col = MongoClient(MONGO_URL)["propvalu"]["mercado_props"]
    q = {"portal_origen": "PINCALI", "activo": {"$ne": False},
         "es_duplicado_secundario": {"$ne": True},
         "tipo_propiedad": {"$in": ["casa", "departamento"]},
         "url_original": {"$regex": "pincali"},
         "estacionamientos": {"$in": [None, ""]},
         "estac_backfill_attempt": {"$exists": False}}
    proj = {"id_unico": 1, "url_original": 1}

    hechos = con_dato = sin_dato = errores = 0
    for d in col.find(q, proj).limit(args.max * (shard[1] if shard else 1) * 3):
        url = (d.get("url_original") or "").strip()
        if not url:
            continue
        if shard and zlib.crc32(url.encode()) % shard[1] != shard[0]:
            continue
        if hechos >= args.max:
            break

        html = fetch(url)
        now = datetime.now().isoformat()
        if html is None:
            errores += 1
            continue  # red caída: no marcar, reintentar luego
        upd = {"estac_backfill_attempt": now}
        m = PARK_RE.search(html) if html else None
        if m:
            upd["estacionamientos"] = int(m.group(1))
            con_dato += 1
        else:
            sin_dato += 1
        col.update_one({"_id": d["_id"]}, {"$set": upd})
        hechos += 1
        if hechos % 50 == 0:
            print(f"{tag} {hechos} hechos | con_dato={con_dato} sin_dato={sin_dato} err={errores}", flush=True)
        time.sleep(random.uniform(3, 6))  # throttle PINCALI (503 si más rápido)

    print(f"{tag} === FIN === hechos={hechos} con_dato={con_dato} sin_dato={sin_dato} errores={errores}", flush=True)


if __name__ == "__main__":
    main()
