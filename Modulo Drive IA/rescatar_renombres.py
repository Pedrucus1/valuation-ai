"""
rescatar_renombres.py

Los renombres que propuso DeepSeek y el padron rechazo casi siempre fallaron por
ortografia del padron, no por ser falsos: SEPOMEX escribe "2a Seccion" donde la
IA escribe "segunda seccion". Aqui se reintenta el cruce con los ordinales y las
variantes normalizados, y solo se acepta lo que cae en un asentamiento real.

Uso:
  python rescatar_renombres.py --dry-run
  python rescatar_renombres.py --apply
"""
import argparse, datetime, json, pathlib, re, shutil, sys

DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(DIR.parent / "backend"))
from core.colonias import norm_col_key   # noqa: E402

ORDINALES = {
    "primera": "1a", "segunda": "2a", "tercera": "3a", "cuarta": "4a", "quinta": "5a",
    "sexta": "6a", "septima": "7a", "octava": "8a", "novena": "9a", "decima": "10a",
    "primer": "1a", "uno": "i", "dos": "ii", "tres": "iii", "cuatro": "iv",
}


def variantes(nombre):
    """Formas alternativas del mismo nombre para buscar en el padron."""
    base = norm_col_key(nombre)
    yield base
    pal = base.split()

    ord_ = " ".join(ORDINALES.get(p, p) for p in pal)
    yield ord_
    # "2a seccion" <-> "2da seccion" <-> sin "seccion"
    yield ord_.replace(" seccion", "")
    yield re.sub(r"\b(\d)a\b", r"\1", ord_)
    # el padron usa "de la/de los" donde el anuncio los come
    yield ord_.replace(" de ", " ")
    if pal[0] in ("el", "la", "los", "las"):
        yield " ".join(pal[1:])
    else:
        for art in ("el", "la", "los", "las"):
            yield f"{art} {base}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    if not (args.dry_run or args.apply):
        ap.error("elige --dry-run o --apply")

    ruta = DIR / "colonias_decada.json"
    dec = json.loads(ruta.read_text(encoding="utf-8"))
    sep = json.loads((DIR / "sepomex_jalisco.json").read_text(encoding="utf-8"))
    ver = json.loads((DIR / "basura_ia_veredictos.json").read_text(encoding="utf-8"))

    # el padron indexado por todas sus formas normalizadas
    padron = {}
    for k, v in sep.items():
        padron.setdefault(norm_col_key(k), k)
        padron.setdefault(norm_col_key(v.get("nombre") or k), k)

    rescatados, siguen = [], []
    for k, r in ver:
        if k not in dec or r.get("tipo") != "renombrar":
            continue
        prop = norm_col_key(r.get("nombre") or "")
        if not prop or prop == k or prop in padron or prop in dec:
            continue                      # ya se resolvio en la pasada anterior
        for cand in variantes(prop):
            if cand in padron:
                rescatados.append((k, prop, cand, padron[cand]))
                break
            if cand in dec and cand != k:
                rescatados.append((k, prop, cand, "(llave existente)"))
                break
        else:
            siguen.append((k, prop))

    print(f"rescatados: {len(rescatados)}   siguen sin cruce: {len(siguen)}")
    print("\n-- rescatados --")
    for k, prop, cand, real in rescatados:
        print(f"   {k}\n      IA: {prop}   ->  padron: {cand}  [{real}]")
    print("\n-- siguen sin cruce (se quedan como estan) --")
    for k, prop in siguen[:25]:
        print(f"   {k}  -/->  {prop}")

    if args.apply:
        sello = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        bak = ruta.with_suffix(f".json.bak-{sello}-rescate")
        shutil.copy2(ruta, bak)
        for k, prop, cand, real in rescatados:
            v = dec.pop(k, None)
            if v and cand not in dec:      # si el destino ya existe, gana el que ya estaba
                dec[cand] = v
        ruta.write_text(json.dumps(dec, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\naplicado. entradas: {len(dec)} | backup: {bak.name}")
    else:
        print("\n(dry-run: no se toco el archivo)")


if __name__ == "__main__":
    main()
