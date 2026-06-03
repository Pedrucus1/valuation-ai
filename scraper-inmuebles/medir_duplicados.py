"""
medir_duplicados.py — Diagnóstico NO destructivo de duplicados cross-portal en mercado_props.

La misma propiedad física anunciada en varios portales (inmuebles24, vivanuncios,
propiedades.com…) tiene URLs distintas → id_unico distinto → docs separados.
Este script estima cuántos hay, agrupando por firma de atributos. NO borra ni modifica nada.

Uso:  python medir_duplicados.py
"""
import os, re, unicodedata
from collections import defaultdict, Counter

os.environ.setdefault(
    "MONGO_URL",
    "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0",
)
from pymongo import MongoClient

col = MongoClient(os.environ["MONGO_URL"])["propvalu"]["mercado_props"]


def norm(s):
    """minúsculas, sin acentos, sin espacios extra, sin ' de zuñiga'."""
    if not s:
        return ""
    s = str(s).lower().strip()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+de\s+zuniga", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def m2_bucket(v):
    try:
        v = float(v)
        return round(v) if v > 0 else None
    except (TypeError, ValueError):
        return None


def precio_bucket(p, op):
    """Bucket de precio: ±~2% para tolerar variaciones entre portales."""
    try:
        p = float(p)
        if p <= 0:
            return None
    except (TypeError, ValueError):
        return None
    paso = 50000 if op == "venta" else 1000
    return round(p / paso)


proj = {"portal_origen": 1, "tipo_propiedad": 1, "tipo_operacion": 1,
        "municipio": 1, "colonia": 1, "m2_construccion": 1, "m2_terreno": 1,
        "precio": 1, "recamaras": 1, "banos": 1, "url_original": 1}

q = {"activo": {"$ne": False}}
total = 0
no_evaluable = 0
# F1: estricta (incluye precio). F2: por specs físicas (sin precio).
f1 = defaultdict(list)
f2 = defaultdict(list)

for d in col.find(q, proj):
    total += 1
    muni = norm(d.get("municipio"))
    colo = norm(d.get("colonia"))
    tipo = norm(d.get("tipo_propiedad"))
    op = norm(d.get("tipo_operacion"))
    m2c = m2_bucket(d.get("m2_construccion"))
    m2t = m2_bucket(d.get("m2_terreno"))
    m2 = m2c or m2t
    pb = precio_bucket(d.get("precio"), op)
    portal = d.get("portal_origen", "")
    # Para evaluar duplicados necesitamos al menos colonia + tipo + m2
    if not (colo and tipo and m2):
        no_evaluable += 1
        continue
    rec = d.get("recamaras") or "?"
    ban = d.get("banos") or "?"
    item = (portal, d.get("url_original", ""))
    if pb is not None:
        f1[(muni, colo, tipo, op, m2, pb)].append(item)
    f2[(muni, colo, tipo, op, m2c or 0, m2t or 0, rec, ban)].append(item)


def analizar(grupos, nombre):
    grupos_dup = {k: v for k, v in grupos.items() if len(v) > 1}
    # cross-portal = grupo con docs de >=2 portales distintos
    cross = {k: v for k, v in grupos_dup.items() if len({p for p, _ in v}) >= 2}
    docs_en_dup = sum(len(v) for v in grupos_dup.values())
    docs_sobrantes = sum(len(v) - 1 for v in grupos_dup.values())  # cuántos colapsarían
    docs_cross = sum(len(v) for v in cross.values())
    sobrantes_cross = sum(len(v) - 1 for v in cross.values())
    print(f"\n===== {nombre} =====")
    print(f"  Grupos con >1 doc (duplicados):        {len(grupos_dup):>7}")
    print(f"  …de ellos cross-portal (>=2 portales): {len(cross):>7}")
    print(f"  Docs dentro de grupos duplicados:      {docs_en_dup:>7}")
    print(f"  Docs que colapsarían (sobrantes):      {docs_sobrantes:>7}  ({100*docs_sobrantes/total:.1f}% del total)")
    print(f"  Docs en grupos cross-portal:           {docs_cross:>7}")
    print(f"  Sobrantes solo cross-portal:           {sobrantes_cross:>7}")
    # Distribución de combinaciones de portales en grupos cross
    combos = Counter()
    for v in cross.values():
        portales = tuple(sorted({p for p, _ in v}))
        combos[portales] += 1
    if combos:
        print("  Top combinaciones de portales que se repiten:")
        for combo, n in combos.most_common(8):
            print(f"    {n:>5}×  {' + '.join(combo)}")
    # 3 ejemplos
    print("  Ejemplos cross-portal:")
    for k, v in list(cross.items())[:3]:
        print(f"    firma={k}")
        for p, u in v[:4]:
            print(f"       [{p}] {u[:75]}")
    return sobrantes_cross


print(f"Total docs activos:        {total}")
print(f"No evaluables (sin colonia/tipo/m2): {no_evaluable}  ({100*no_evaluable/total:.1f}%)")
s1 = analizar(f1, "F1 estricta (muni+colonia+tipo+op+m2+precio±)")
s2 = analizar(f2, "F2 por specs (muni+colonia+tipo+op+m2c+m2t+rec+ban, SIN precio)")
print(f"\n>>> Estimación de docs duplicados cross-portal: entre ~{s1} (estricta) y ~{s2} (specs)")
