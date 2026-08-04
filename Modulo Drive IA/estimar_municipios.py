"""
estimar_municipios.py

Ultimo recurso para las colonias que ninguna fuente local conoce: se le pregunta
a DeepSeek y a Google Maps por separado y solo se acepta el municipio cuando
AMBOS dicen lo mismo.

Medido contra 40 colonias de municipio conocido: coinciden en el 45% de los
casos y ahi aciertan 78%. O sea: 1 de cada 5 estimaciones queda mal. Por eso
se guardan como municipio_fuente="estimado" y municipio_estimado=true, nunca
como dato de padron, y no pisan nada que ya tenga fuente real.

Uso:
  python estimar_municipios.py --dry-run
  python estimar_municipios.py --apply
  python estimar_municipios.py --revertir    → borra todas las estimaciones
"""
import argparse, datetime, json, os, pathlib, shutil, sys, time

DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(DIR.parent / "backend"))
from core.colonias import norm_muni   # noqa: E402

import requests                        # noqa: E402
from dotenv import load_dotenv         # noqa: E402
load_dotenv(DIR.parent / ".env")

from rellenar_municipios import ZONA, CANON, preguntar_ia   # noqa: E402

FUENTE = "estimado"


def por_maps(nombre, key):
    """Geocodifica el nombre y luego pregunta por las coordenadas: el reverse
    si trae el municipio, el directo casi nunca."""
    try:
        r = requests.get("https://maps.googleapis.com/maps/api/geocode/json",
                         params={"address": f"colonia {nombre}, Jalisco, Mexico",
                                 "key": key, "language": "es"}, timeout=15).json()
        if not r.get("results"):
            return None
        loc = r["results"][0]["geometry"]["location"]
        rv = requests.get("https://maps.googleapis.com/maps/api/geocode/json",
                          params={"latlng": f"{loc['lat']},{loc['lng']}",
                                  "result_type": "administrative_area_level_2",
                                  "key": key, "language": "es"}, timeout=15).json()
        if not rv.get("results"):
            return None
        for c in rv["results"][0]["address_components"]:
            if "administrative_area_level_2" in c["types"]:
                m = norm_muni(c["long_name"])
                return CANON.get(m, m)
    except Exception:
        return None
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--revertir", action="store_true")
    args = ap.parse_args()

    ruta = DIR / "colonias_decada.json"
    dec = json.loads(ruta.read_text(encoding="utf-8"))

    if args.revertir:
        n = 0
        for v in dec.values():
            if v.get("municipio_fuente") == FUENTE:
                v["municipio"], v["municipio_fuente"] = None, None
                v.pop("municipio_estimado", None)
                n += 1
        ruta.write_text(json.dumps(dec, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"revertidas {n} estimaciones")
        return

    if not (args.dry_run or args.apply):
        ap.error("elige --dry-run, --apply o --revertir")

    faltan = [k for k, v in dec.items() if not v.get("municipio") and "|" not in k]
    print(f"sin municipio: {len(faltan)}")

    cache = DIR / "municipios_estimados.json"
    if cache.exists():
        acuerdos = json.loads(cache.read_text(encoding="utf-8"))
        print(f"estimaciones leidas de {cache.name}: {len(acuerdos)}")
    else:
        ia = preguntar_ia(faltan)
        print(f"DeepSeek contesto {len(ia)}; consultando Maps solo esas...")
        key = os.environ["GOOGLE_MAPS_API_KEY"]
        acuerdos = {}
        for i, k in enumerate(ia):                     # Maps solo donde la IA opino
            if por_maps(k, key) == ia[k]:
                acuerdos[k] = ia[k]
            if i % 25 == 0:
                print(f"  maps {i}/{len(ia)} — coinciden {len(acuerdos)}", end="\r")
            time.sleep(0.05)
        print()
        cache.write_text(json.dumps(acuerdos, ensure_ascii=False, indent=1), encoding="utf-8")

    acuerdos = {k: m for k, m in acuerdos.items() if k in dec and m in ZONA}
    print(f"\ncoinciden IA y Maps: {len(acuerdos)} de {len(faltan)} "
          f"({100*len(acuerdos)//max(1,len(faltan))}%)")
    print("esperado por la medicion: ~78% correctas, ~1 de cada 5 mal\n")
    for k, m in list(acuerdos.items())[:15]:
        print(f"   {k:38s} -> {m}")

    if args.apply:
        sello = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        bak = ruta.with_suffix(f".json.bak-{sello}-estimados")
        shutil.copy2(ruta, bak)
        for k, m in acuerdos.items():
            dec[k].update(municipio=m, municipio_fuente=FUENTE, municipio_estimado=True)
        ruta.write_text(json.dumps(dec, ensure_ascii=False, indent=1), encoding="utf-8")
        con = sum(1 for v in dec.values() if v.get("municipio"))
        print(f"\naplicado. con municipio: {con}/{len(dec)} ({100*con//len(dec)}%)")
        print(f"backup: {bak.name} | revertir: python estimar_municipios.py --revertir")
    else:
        print("\n(dry-run: no se toco el archivo)")


if __name__ == "__main__":
    main()
