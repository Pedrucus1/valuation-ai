"""
db_target.py — Conexión centralizada a MongoDB para los scripts de mantenimiento
(dedup, diagnóstico). Lee MONGO_URL / DB_NAME del entorno o del .env local.

Principio de staging (#66.4): los scripts NUNCA defaultean a producción.
- Si MONGO_URL no está en el entorno, se intenta cargar de scraper-inmuebles/.env.
- Si aun así falta, FALLA (fail-closed) en vez de pegarle a prod.
- Imprime a qué cluster/DB apunta en cada corrida (nunca silencioso).
- Si la URL es el cluster de PROD (host conocido) y APP_ENV != 'production', avisa.

Convención: en local, .env apunta a STAGING; en Railway (prod), las env vars apuntan a PROD.
"""
import os
import re
from pathlib import Path

# Host del cluster de PRODUCCIÓN — para advertir si un script local le apunta sin querer.
_PROD_HOST_HINT = "9eliadx.mongodb.net"


def _load_env_file():
    """Carga MONGO_URL/DB_NAME del .env vecino si no están en el entorno (sin dependencias)."""
    envf = Path(__file__).resolve().parent / ".env"
    if not envf.exists():
        return
    for line in envf.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        if k in ("MONGO_URL", "DB_NAME") and k not in os.environ:
            os.environ[k] = v.strip().strip('"').strip("'")


def get_db():
    """Retorna el objeto db de Mongo apuntando al target del entorno (NO default a prod)."""
    _load_env_file()
    url = os.environ.get("MONGO_URL")
    if not url:
        raise SystemExit(
            "Falta MONGO_URL. Define el target en el entorno o en scraper-inmuebles/.env "
            "(en local debe apuntar a STAGING, no a producción)."
        )
    db_name = os.environ.get("DB_NAME", "propvalu")

    # Visibilidad: a qué cluster/DB apunta esta corrida
    host = re.sub(r"^.*@", "", url).split("/")[0][:60]
    app_env = os.environ.get("APP_ENV", "").lower()
    if _PROD_HOST_HINT in url and app_env != "production":
        print(f"[!] ADVERTENCIA: apuntando al cluster de PRODUCCION ({host}) con APP_ENV='{app_env or 'sin definir'}'.")
        print("    En local deberias apuntar a STAGING. (APP_ENV=production para silenciar si es intencional.)")
    else:
        print(f"-> MongoDB target: {host} / db={db_name}")

    from pymongo import MongoClient
    return MongoClient(url)[db_name]


def get_mercado_props():
    return get_db()["mercado_props"]
