# -*- coding: utf-8 -*-
"""
dedup_estricto.py — Dedup cross-portal ESTRICTO (precio+m² EXACTOS + guarda título/agente).
Marca `duplicado=true` en los secundarios, `es_canonico=true` en el maestro (más completo,
preferencia a fuente verificada). NO toca activo, NO borra, NO sobreescribe otros campos.
Idempotente: al inicio limpia sus propias marcas (dedup_fuente=estricto_crossportal) y re-marca.

Correr DESPUÉS del enricher (la colonia enriquecida mejora el agrupado, sobre todo PINCALI).
Convención de campos = misma que dedup_seguimiento.py (duplicado/es_canonico/grupo_id/canonico_id).

Uso:  python dedup_estricto.py [--dry-run]
"""
import os, re, sys, hashlib, unicodedata, datetime, argparse
from collections import defaultdict
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

STOP = set("en de la el los las del y con para por un una que se renta venta m2 m² ".split())
def _norm(s): return unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()
def _toks(s): return {t for t in re.findall(r"[a-z0-9]+", _norm(s)) if t not in STOP and len(t) > 2}
def _jac(a, b): return len(a & b) / len(a | b) if a and b else 0.0
def _cp_valido(d): return bool(re.fullmatch(r"\d{5}", str(d.get("codigo_postal") or "").strip()))
def _es_perito(d):
    return ("perito" in str(d.get("edad_fuente") or "").lower()) or bool(d.get("conservacion_fuente")) \
        or bool(d.get("edad_estimador")) or d.get("edad_exacta") is True
def _score(d):
    s = 0
    if _es_perito(d): s += 100
    cf = str(d.get("colonia_fuente") or "").lower()
    if "perito" in cf: s += 8
    elif "ia_derivada" in cf: s += 4
    if _cp_valido(d): s += 3
    if d.get("anio_construccion") or d.get("año_construccion"): s += 5
    if (d.get("descripcion") or "").strip(): s += 2
    if d.get("lat") and d.get("lon"): s += 2
    if d.get("calle_numero"): s += 1
    if d.get("recamaras") is not None: s += 1
    if d.get("portal_origen") or d.get("portal"): s += 1
    return s
def _portal(d): return d.get("portal_origen") or d.get("portal")


def dedup_estricto(col, dry_run: bool = False) -> dict:
    if not dry_run:
        col.update_many({"dup_fuente": "estricto_crossportal"},  # limpieza legacy (marcas ad-hoc previas)
                        {"$unset": {"es_duplicado": "", "dup_de": "", "dup_fuente": "", "dup_fecha": ""}})
        col.update_many({"dedup_fuente": "estricto_crossportal"},
                        {"$unset": {"duplicado": "", "es_canonico": "", "grupo_id": "",
                                    "canonico_id": "", "n_portales_duplicado": "", "dedup_fuente": "", "dedup_fecha": ""}})

    sig = defaultdict(list)
    proj = {"id_unico": 1, "municipio": 1, "colonia": 1, "precio": 1, "m2_construccion": 1,
            "tipo_operacion": 1, "tipo_propiedad": 1, "portal": 1, "portal_origen": 1, "titulo": 1,
            "nombre_agente": 1, "codigo_postal": 1, "descripcion": 1, "lat": 1, "lon": 1,
            "calle_numero": 1, "fecha_scraping": 1, "anio_construccion": 1, "año_construccion": 1,
            "edad_fuente": 1, "conservacion_fuente": 1, "edad_estimador": 1, "edad_exacta": 1,
            "recamaras": 1, "colonia_fuente": 1}
    for d in col.find({"activo": {"$ne": False}, "precio": {"$gt": 0}, "m2_construccion": {"$gt": 0}}, proj):
        k = (_norm(d.get("municipio")), _norm(d.get("colonia")), round(float(d["precio"])),
             round(float(d["m2_construccion"])), _norm(d.get("tipo_operacion")), _norm(d.get("tipo_propiedad")))
        sig[k].append(d)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ops = []
    n_grupos = n_dups = 0
    for k, v in sig.items():
        if len({_portal(x) for x in v}) < 2:   # solo cross-portal
            continue
        v_sorted = sorted(v, key=lambda d: (_score(d), len(d.get("descripcion") or ""),
                                            str(d.get("fecha_scraping") or "")), reverse=True)
        keeper = v_sorted[0]
        kt, ka = _toks(keeper.get("titulo")), _norm(keeper.get("nombre_agente"))
        drops = []
        for d in v_sorted[1:]:
            if _es_perito(d):   # nunca marcar un doc con dato de perito
                continue
            if _jac(kt, _toks(d.get("titulo"))) >= 0.45 or (ka and _norm(d.get("nombre_agente")) == ka):
                drops.append(d)
        if not drops:
            continue
        n_grupos += 1
        gid = hashlib.md5(str(k).encode()).hexdigest()[:12]
        ops.append(UpdateOne({"id_unico": keeper["id_unico"]},
            {"$set": {"duplicado": False, "es_canonico": True, "grupo_id": gid,
                      "n_portales_duplicado": len({_portal(x) for x in v})}}))
        for d in drops:
            n_dups += 1
            ops.append(UpdateOne({"id_unico": d["id_unico"]},
                {"$set": {"duplicado": True, "es_canonico": False, "grupo_id": gid,
                          "canonico_id": keeper["id_unico"], "dedup_fuente": "estricto_crossportal",
                          "dedup_fecha": now}}))

    if ops and not dry_run:
        col.bulk_write(ops, ordered=False)
    return {"grupos": n_grupos, "duplicados": n_dups, "dry_run": dry_run}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="No escribe, solo cuenta")
    args = ap.parse_args()
    load_dotenv()
    col = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=20000)[
        os.environ.get("DB_NAME", "propvalu")]["mercado_props"]
    stats = dedup_estricto(col, dry_run=args.dry_run)
    print(f"dedup_estricto: grupos={stats['grupos']} duplicados_marcados={stats['duplicados']} dry_run={stats['dry_run']}")
