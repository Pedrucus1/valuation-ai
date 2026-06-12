"""Diagnóstico: ¿de dónde salen los año=2026 escritos el 10-jun?"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from collections import Counter

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

q26 = {"enriched_at": {"$gte": "2026-06-10"}, "anio_construccion": 2026}
print("=== anio=2026 del 10-jun por portal ===")
por_portal = Counter(d["portal_origen"] for d in col.find(q26, {"portal_origen": 1}))
for p, n in por_portal.most_common():
    print(f"  {p}: {n}")

print("\n=== Muestra de 10 URLs con anio=2026 (para inspección manual) ===")
for d in col.find(q26, {"url_original": 1, "portal_origen": 1, "titulo": 1, "_id": 0}).limit(10):
    print(f"  [{d['portal_origen']}] {d.get('titulo','')[:60]}")
    print(f"     {d.get('url_original','')[:110]}")

print("\n=== Comparación: anio=2026 escritos ANTES del 10-jun (sesiones 04-09 jun, post-fix) ===")
q26b = {"enriched_at": {"$gte": "2026-06-04", "$lt": "2026-06-10"}, "anio_construccion": 2026}
por_portal_b = Counter(d["portal_origen"] for d in col.find(q26b, {"portal_origen": 1}))
tot_b = col.count_documents({"enriched_at": {"$gte": "2026-06-04", "$lt": "2026-06-10"}})
print(f"  total enriquecidos 04-09 jun: {tot_b}")
for p, n in por_portal_b.most_common():
    print(f"  {p}: {n}")

print("\n=== None explícito del 10-jun por portal ===")
qn = {"enriched_at": {"$gte": "2026-06-10"}, "anio_construccion": None}
por_portal_n = Counter(d["portal_origen"] for d in col.find(qn, {"portal_origen": 1}))
for p, n in por_portal_n.most_common():
    print(f"  {p}: {n}")
