"""
fusionar_duplicados.py — Agrupación NO destructiva de duplicados cross-portal en mercado_props.

La misma propiedad física anunciada en varios portales (URLs distintas) queda como docs separados.
Este script los agrupa por firma de atributos y marca un MAESTRO (el doc más completo) + secundarios,
SIN borrar nada. Los consumidores (motor, reportes, stats) filtran es_duplicado_secundario.

Campos escritos:
  maestro:     es_maestro=True, grupo_id, n_portales, portales_anunciado=[...], anuncios=[{portal,url}]
  secundario:  es_duplicado_secundario=True, dup_de=<id_unico maestro>, grupo_id

Uso:
  python fusionar_duplicados.py            # agrupa y marca
  python fusionar_duplicados.py --reset    # limpia todos los campos de agrupación y sale
  python fusionar_duplicados.py --dry-run  # solo reporta, no escribe

Idempotente: cada corrida limpia las marcas previas y recalcula desde cero.
"""
import os, re, sys, unicodedata, hashlib
from collections import defaultdict

os.environ.setdefault(
    "MONGO_URL",
    "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0",
)
from pymongo import MongoClient, UpdateOne

col = MongoClient(os.environ["MONGO_URL"])["propvalu"]["mercado_props"]

# Campos de agrupación que este script administra (para limpiar en reset / idempotencia)
CAMPOS_GRUPO = ["es_maestro", "es_duplicado_secundario", "dup_de",
                "grupo_id", "n_portales", "portales_anunciado", "anuncios"]

# Ranking de calidad de portal — desempate cuando dos docs tienen igual completitud.
# (Orden = mejor info histórica primero; ajustable.)
PORTAL_RANK = {
    "PROPIEDADES_COM": 0, "INMUEBLES24": 1, "CASAS_Y_TERRENOS": 2,
    "VIVANUNCIOS": 3, "PINCALI": 4, "MITULA": 5,
}

# Campos que cuentan para "completitud" del doc (maestro = más llenos)
CAMPOS_COMPLETITUD = ["anio_construccion", "m2_construccion", "m2_terreno",
                      "recamaras", "banos", "colonia", "precio", "telefono"]


def norm(s):
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
    try:
        p = float(p)
        if p <= 0:
            return None
    except (TypeError, ValueError):
        return None
    paso = 50000 if op == "venta" else 1000
    return round(p / paso)


def completitud(d):
    return sum(1 for c in CAMPOS_COMPLETITUD if d.get(c) not in (None, "", 0))


def resetear():
    print("Limpiando campos de agrupación previos...")
    r = col.update_many({}, {"$unset": {c: "" for c in CAMPOS_GRUPO}})
    print(f"  {r.modified_count} docs limpiados.")


def main():
    reset = "--reset" in sys.argv
    dry = "--dry-run" in sys.argv

    if reset:
        resetear()
        return

    # Idempotencia: limpiar marcas previas antes de recalcular (salvo dry-run)
    if not dry:
        resetear()

    proj = {"id_unico": 1, "url_original": 1, "portal_origen": 1,
            "tipo_propiedad": 1, "tipo_operacion": 1, "municipio": 1, "colonia": 1,
            "m2_construccion": 1, "m2_terreno": 1, "precio": 1,
            "anio_construccion": 1, "recamaras": 1, "banos": 1, "telefono": 1}

    grupos = defaultdict(list)
    total = no_evaluable = 0
    for d in col.find({"activo": {"$ne": False}}, proj):
        total += 1
        muni = norm(d.get("municipio"))
        colo = norm(d.get("colonia"))
        tipo = norm(d.get("tipo_propiedad"))
        op = norm(d.get("tipo_operacion"))
        m2 = m2_bucket(d.get("m2_construccion")) or m2_bucket(d.get("m2_terreno"))
        pb = precio_bucket(d.get("precio"), op)
        # Firma estricta: requiere colonia + m² + precio (si falta algo, no se agrupa)
        if not (colo and tipo and m2 and pb is not None):
            no_evaluable += 1
            continue
        grupos[(muni, colo, tipo, op, m2, pb)].append(d)

    ops = []
    n_grupos_cross = 0
    n_secundarios = 0
    for firma, docs in grupos.items():
        portales = {d.get("portal_origen") for d in docs}
        # SOLO cross-portal (>=2 portales distintos) — intra-portal no se toca
        if len(portales) < 2:
            continue
        n_grupos_cross += 1
        grupo_id = hashlib.md5("|".join(map(str, firma)).encode()).hexdigest()[:16]
        # Maestro = más completo; desempate por ranking de portal, luego id estable
        maestro = max(docs, key=lambda d: (completitud(d),
                                           -PORTAL_RANK.get(d.get("portal_origen"), 9),
                                           d.get("id_unico", "")))
        anuncios = [{"portal": d.get("portal_origen"), "url": d.get("url_original")}
                    for d in docs]
        portales_ord = sorted(portales)
        ops.append(UpdateOne({"id_unico": maestro["id_unico"]}, {"$set": {
            "es_maestro": True, "grupo_id": grupo_id, "n_portales": len(portales),
            "portales_anunciado": portales_ord, "anuncios": anuncios,
        }, "$unset": {"es_duplicado_secundario": "", "dup_de": ""}}))
        for d in docs:
            if d["id_unico"] == maestro["id_unico"]:
                continue
            n_secundarios += 1
            ops.append(UpdateOne({"id_unico": d["id_unico"]}, {"$set": {
                "es_duplicado_secundario": True, "dup_de": maestro["id_unico"],
                "grupo_id": grupo_id,
            }, "$unset": {"es_maestro": "", "n_portales": "",
                          "portales_anunciado": "", "anuncios": ""}}))

    print(f"\nTotal docs activos:            {total}")
    print(f"No evaluables (sin colonia/m²/precio): {no_evaluable} ({100*no_evaluable/total:.1f}%)")
    print(f"Grupos cross-portal:           {n_grupos_cross}")
    print(f"Docs secundarios (se ocultan): {n_secundarios} ({100*n_secundarios/total:.1f}% del total)")
    print(f"Inventario real estimado:      {total - n_secundarios}")

    if dry:
        print("\n(dry-run: no se escribió nada)")
        return
    if ops:
        res = col.bulk_write(ops, ordered=False)
        print(f"\nEscrito: {res.modified_count} docs actualizados ({len(ops)} ops).")


if __name__ == "__main__":
    main()
