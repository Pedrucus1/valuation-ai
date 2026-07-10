"""Backfill: normaliza tipo_propiedad de NOCNOK a canónico minúscula.
NOCNOK guardaba "Casa"/"Local Comercial"/exóticos (salta el chokepoint) → el
motor no los matchea. Re-normaliza con el mismo normalizador del pipeline.

- Dry-run por defecto: cuenta y muestra, NO escribe.
- `--apply` para escribir. Respeta correcciones humanas (tipo_fuente protegida).

Uso:
    python backfill_tipo_nocnok.py            # dry-run
    python backfill_tipo_nocnok.py --apply
"""
import sys
from collections import Counter
from scheduler import _get_mongo_col, FUENTES_PROTEGIDAS
from utils.cleaner import normalizar_tipo_propiedad

APPLY = "--apply" in sys.argv


def main():
    col = _get_mongo_col()
    q = {"portal_origen": "NOCNOK"}
    proj = {"id_unico": 1, "tipo_propiedad": 1, "tipo_fuente": 1}
    cambios = Counter()
    protegidos = revisados = escritos = 0
    ejemplos = []
    for d in col.find(q, proj):
        revisados += 1
        viejo = d.get("tipo_propiedad")
        nuevo = normalizar_tipo_propiedad(viejo)
        if nuevo == viejo:
            continue
        if d.get("tipo_fuente") in FUENTES_PROTEGIDAS:
            protegidos += 1
            continue
        cambios[f"{viejo} -> {nuevo}"] += 1
        if len(ejemplos) < 10:
            ejemplos.append((viejo, nuevo))
        if APPLY:
            col.update_one({"id_unico": d["id_unico"]},
                           {"$set": {"tipo_propiedad": nuevo}})
            escritos += 1

    print(f"Revisados: {revisados} | protegidos (sin tocar): {protegidos}")
    print(f"A corregir: {sum(cambios.values())}  {'(APLICADOS)' if APPLY else '(dry-run)'}")
    for k, v in cambios.most_common():
        print(f"  {v:6}  {k}")
    if not APPLY:
        print("\n(dry-run) Para aplicar: python backfill_tipo_nocnok.py --apply")


if __name__ == "__main__":
    main()
