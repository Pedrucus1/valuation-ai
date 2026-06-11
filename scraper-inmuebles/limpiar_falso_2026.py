"""
Limpieza de año=2026 falso escrito por el fallback de texto libre (jun-2026).

El fallback matcheaba "a Estrenar"/"preventa" en carruseles de propiedades
similares y navegación → ~30k docs envenenados con anio_construccion=2026.
Se hace $unset (NO destructivo: el dato es re-derivable re-enriqueciendo) y se
deja flag de auditoría anio_falso2026_limpiado con la fecha.

No distingue los pocos 2026 genuinos (obra nueva real): al re-enriquecer, los
handlers dedicados los vuelven a escribir correctamente.

Uso:  python limpiar_falso_2026.py [--dry-run]
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

dry = "--dry-run" in sys.argv

# Solo lo escrito por el enricher desde que existe el fallback (03-jun) hasta hoy.
# NOCNOK no usa enricher (API JSON directa) → excluido.
q = {"anio_construccion": 2026,
     "enriched_at": {"$gte": "2026-06-03"},
     "portal_origen": {"$in": ["PINCALI", "INMUEBLES24", "PROPIEDADES_COM",
                               "CASAS_Y_TERRENOS", "MITULA", "VIVANUNCIOS"]}}

n = col.count_documents(q)
print(f"Docs con anio=2026 sospechoso (enriquecidos desde 03-jun): {n}")

if dry:
    from collections import Counter
    print("Por portal:")
    for p, c in Counter(d["portal_origen"] for d in col.find(q, {"portal_origen": 1})).most_common():
        print(f"  {p}: {c}")
    sys.exit(0)

res = col.update_many(q, {
    "$unset": {"anio_construccion": ""},
    "$set": {"anio_falso2026_limpiado": datetime.now().isoformat()},
})
print(f"Limpiados: {res.modified_count}")
