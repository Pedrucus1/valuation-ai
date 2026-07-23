"""
insertar_comparables_ondemand.py — Sube a mercado_props los comparables que encontró
Modulo Drive IA/buscar_comparables_browser.js (scraper on-demand por colonia).

Reusa el chokepoint real de guardado (scheduler._guardar_en_mongo): mismo dedup por
id_unico, mismo normalizar_tipo_propiedad, mismo respeto a campos "sticky" protegidos.
No reinventa el upsert.

Uso:
    <PY> insertar_comparables_ondemand.py "../Modulo Drive IA/_comparables_browser_temp.json"
"""
import json
import sys
from collections import defaultdict

from scheduler import _guardar_en_mongo


def main():
    if len(sys.argv) < 2:
        print("Uso: insertar_comparables_ondemand.py <archivo.json>")
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        docs = json.load(f)

    if not docs:
        print("Sin comparables en el archivo, nada que insertar.")
        return

    por_portal = defaultdict(list)
    for d in docs:
        por_portal[d.get("portal_origen", "DESCONOCIDO")].append(d)

    total_nuevas = total_actualizadas = 0
    for portal, props in por_portal.items():
        r = _guardar_en_mongo(props, portal)
        print(f"{portal}: {r['nuevas']} nuevas, {r['actualizadas']} actualizadas")
        total_nuevas += r["nuevas"]
        total_actualizadas += r["actualizadas"]

    print(f"\nTotal: {total_nuevas} nuevas, {total_actualizadas} actualizadas en mercado_props")


if __name__ == "__main__":
    main()
