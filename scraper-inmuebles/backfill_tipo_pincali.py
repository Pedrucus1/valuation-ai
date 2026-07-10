"""Backfill: corrige tipo_propiedad de PINCALI usando el slug de la URL.
El tipo venía de la página de categoría (no confiable → ~29% mal, todo 'local').
El slug ('departamento-en-renta-...') es la señal buena.

- Dry-run por defecto: cuenta y muestra ejemplos, NO escribe.
- `--apply` para escribir. Respeta correcciones humanas (tipo_fuente protegida).

Uso:
    python backfill_tipo_pincali.py            # dry-run
    python backfill_tipo_pincali.py --apply    # aplica
"""
import sys
from collections import Counter
from scheduler import _get_mongo_col, FUENTES_PROTEGIDAS
from utils.cleaner import tipo_por_slug

APPLY = "--apply" in sys.argv


def main():
    col = _get_mongo_col()
    q = {"portal_origen": "PINCALI"}
    proj = {"id_unico": 1, "url_original": 1, "tipo_propiedad": 1, "tipo_fuente": 1}
    cambios = Counter()          # (viejo -> nuevo)
    protegidos = revisados = escritos = 0
    ejemplos = []
    for d in col.find(q, proj):
        revisados += 1
        nuevo = tipo_por_slug(d.get("url_original"))
        viejo = d.get("tipo_propiedad")
        if not nuevo or nuevo == viejo:
            continue
        if d.get("tipo_fuente") in FUENTES_PROTEGIDAS:   # corrección humana: no tocar
            protegidos += 1
            continue
        cambios[f"{viejo} -> {nuevo}"] += 1
        if len(ejemplos) < 10:
            ejemplos.append((viejo, nuevo, (d.get("url_original") or "")[:75]))
        if APPLY:
            col.update_one({"id_unico": d["id_unico"]},
                           {"$set": {"tipo_propiedad": nuevo, "tipo_fuente": "slug_pincali"}})
            escritos += 1

    print(f"Revisados: {revisados} | protegidos (perito, sin tocar): {protegidos}")
    print(f"A corregir: {sum(cambios.values())}  {'(APLICADOS)' if APPLY else '(dry-run, sin escribir)'}")
    for k, v in cambios.most_common():
        print(f"  {v:6}  {k}")
    print("Ejemplos:")
    for viejo, nuevo, url in ejemplos:
        print(f"  {viejo:12} -> {nuevo:12}  {url}")
    if not APPLY:
        print("\n(dry-run) Para aplicar: python backfill_tipo_pincali.py --apply")


if __name__ == "__main__":
    main()
