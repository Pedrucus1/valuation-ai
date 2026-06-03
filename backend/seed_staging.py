"""
seed_staging.py — Copia datos de PRODUCCIÓN → STAGING para tener un entorno de
pruebas realista (#66.4). NO destructivo en origen (solo lee de prod); escribe en target.

Requiere dos connection strings por entorno (NUNCA hardcodear):
  MONGO_URL_SOURCE  = cluster de PRODUCCIÓN (origen, solo lectura)
  MONGO_URL_TARGET  = cluster de STAGING    (destino)
  DB_NAME           = nombre de la base (default 'propvalu', igual en ambos)

Uso (PowerShell):
  $env:MONGO_URL_SOURCE = "<prod>"; $env:MONGO_URL_TARGET = "<staging>"
  python seed_staging.py                 # copia con muestreo de mercado_props (10k)
  python seed_staging.py --full          # copia mercado_props completo
  python seed_staging.py --solo mercado_props,users

Seguridad: aborta si SOURCE y TARGET son el mismo host (evita copiarse sobre prod).
"""
import os
import re
import sys
import certifi
import pymongo

# Colecciones a clonar (las necesarias para probar app + motor + dedup)
COLECCIONES = ["mercado_props", "mercado_snapshots", "users", "valuations",
               "admins", "authorized_access", "newsletter_subscribers"]
SAMPLE_DEFAULT = 10000  # docs de mercado_props si no es --full


def _host(url):
    return re.sub(r"^.*@", "", url or "").split("/")[0]


def main():
    src = os.environ.get("MONGO_URL_SOURCE")
    tgt = os.environ.get("MONGO_URL_TARGET")
    db_name = os.environ.get("DB_NAME", "propvalu")
    if not src or not tgt:
        sys.exit("Define MONGO_URL_SOURCE (prod) y MONGO_URL_TARGET (staging) en el entorno.")
    if _host(src) == _host(tgt):
        sys.exit(f"ABORTO: SOURCE y TARGET son el mismo host ({_host(src)}). Staging debe ser otro cluster.")

    full = "--full" in sys.argv
    solo = None
    if "--solo" in sys.argv:
        solo = set(sys.argv[sys.argv.index("--solo") + 1].split(","))

    sdb = pymongo.MongoClient(src, tlsCAFile=certifi.where())[db_name]
    tdb = pymongo.MongoClient(tgt, tlsCAFile=certifi.where())[db_name]
    print(f"SOURCE {_host(src)}  ->  TARGET {_host(tgt)}  (db={db_name})")

    for nombre in COLECCIONES:
        if solo and nombre not in solo:
            continue
        scol, tcol = sdb[nombre], tdb[nombre]
        n_src = scol.count_documents({})
        if n_src == 0:
            print(f"  {nombre:24} vacía en origen, skip")
            continue
        limite = None if (full or nombre != "mercado_props") else SAMPLE_DEFAULT
        cursor = scol.find({}).limit(limite) if limite else scol.find({})
        tcol.delete_many({})  # limpiar target (es staging, seguro)
        batch, copiados = [], 0
        for doc in cursor:
            batch.append(doc)
            if len(batch) >= 1000:
                tcol.insert_many(batch, ordered=False)
                copiados += len(batch); batch = []
        if batch:
            tcol.insert_many(batch, ordered=False); copiados += len(batch)
        print(f"  {nombre:24} {copiados:>7} copiados (de {n_src} en prod){' [muestra]' if limite else ''}")

    print("Seed de staging completo.")


if __name__ == "__main__":
    main()
