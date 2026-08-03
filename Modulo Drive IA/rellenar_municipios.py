"""
rellenar_municipios.py

Le pone municipio a las entradas de colonias_decada.json que no lo traen,
cruzando contra el padron (sepomex_v2.json) y, cuando el padron no la conoce,
contra los comps reales (cache_consolidado.json).

Cascada, en orden de autoridad:
  1. padron, un solo municipio          -> municipio_fuente = "sepomex"
  2. padron, varios municipios pero los comps apuntan a uno solo de esos
                                        -> municipio_fuente = "sepomex+comps"
  3. padron, varios y los comps no desempatan
                                        -> homonima_en = [...], municipio queda null
  4. fuera del padron, comps de un solo municipio
                                        -> municipio_fuente = "comps"

Uso:
  python rellenar_municipios.py --dry-run
  python rellenar_municipios.py --apply
"""
import argparse, collections, datetime, json, pathlib, shutil, sys

DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(DIR.parent / "backend"))
from core.colonias import norm_col_key, norm_muni   # noqa: E402


# El archivo cubre la ZMG y la ribera de Chapala. Un nombre que el padron solo
# encuentra en Toliman o Colotlan es un homonimo lejano, no esta colonia: sin
# este cerco, "cuauhtemoc" (Guadalajara) se iba a Toliman.
ZONA = {"guadalajara", "zapopan", "san pedro tlaquepaque", "tlaquepaque", "tonala",
        "tlajomulco de zuniga", "tlajomulco", "el salto", "juanacatlan",
        "ixtlahuacan de los membrillos", "zapotlanejo", "chapala", "poncitlan", "jocotepec"}


def cargar():
    dec = json.loads((DIR / "colonias_decada.json").read_text(encoding="utf-8"))
    sep = json.loads((DIR / "sepomex_v2.json").read_text(encoding="utf-8"))
    comps = json.loads((DIR / "cache_consolidado.json").read_text(encoding="utf-8"))["datos"]
    idx = json.loads((DIR / "cache_index.json").read_text(encoding="utf-8"))

    # padron: nombre normalizado -> municipios de la zona donde existe
    padron = collections.defaultdict(set)
    for k, filas in sep.items():
        for f in filas:
            m = norm_muni(f.get("municipio") or "")
            if (f.get("estado") or "").lower().startswith("jalisco") and m in ZONA:
                padron[norm_col_key(k)].add(m)
                padron[norm_col_key(f.get("nombre") or k)].add(m)

    # anuncios reales: nombre -> municipios vistos. cache_index (22,914 anuncios,
    # municipio -> tipo -> colonia) pesa mas que el cache de comps ya filtrado.
    vistos = collections.defaultdict(collections.Counter)
    for muni, tipos in idx.items():
        if muni == "_meta" or not isinstance(tipos, dict):
            continue
        m = norm_muni(muni)
        for colonias in tipos.values():
            if isinstance(colonias, dict):
                for col, datos in colonias.items():
                    n = len((datos or {}).get("listings") or []) or 1
                    vistos[norm_col_key(col)][m] += n
    for c in comps:
        m = norm_muni(c.get("muni") or "")
        if m:
            vistos[norm_col_key(c.get("colonia") or "")][m] += 1
    return dec, padron, vistos


def resolver(nk, padron, vistos):
    """-> (municipio, fuente, homonima_en). municipio None = no se pudo."""
    munis = {m for m in (padron.get(nk) or set()) if m}
    anuncios = vistos.get(nk) or collections.Counter()

    if len(munis) == 1:
        return next(iter(munis)), "sepomex", None
    if len(munis) > 1:
        # el padron duda: que los anuncios desempaten, pero solo entre sus candidatos
        entre = [m for m in anuncios if m in munis]
        if len(entre) == 1:
            return entre[0], "sepomex+anuncios", None
        return None, None, sorted(munis)
    # fuera del padron: los anuncios mandan si son de un solo municipio de la zona
    en_zona = [m for m in anuncios if m in ZONA]
    if len(en_zona) == 1:
        return en_zona[0], "anuncios", None
    if len(en_zona) > 1:
        # varios municipios, pero uno concentra al menos el 90% de los anuncios
        total = sum(anuncios[m] for m in en_zona)
        gana = max(en_zona, key=lambda m: anuncios[m])
        if anuncios[gana] >= 0.9 * total:
            return gana, "anuncios", None
        return None, None, sorted(en_zona)
    return None, None, None


PROMPT_IA = """Cada linea es el nombre que un anuncio inmobiliario uso como "colonia" en la zona metropolitana de Guadalajara y su ribera. Di a que municipio pertenece cada una.

Municipios validos (responde exactamente con una de estas cadenas):
guadalajara, zapopan, san pedro tlaquepaque, tonala, tlajomulco de zuniga, el salto, juanacatlan, ixtlahuacan de los membrillos, zapotlanejo, chapala, poncitlan, jocotepec

Reglas:
- Si es un coto, torre o fraccionamiento que si ubicas, da su municipio.
- Si el nombre no es un lugar (frase de anuncio, numero de lote, "solares soare 3") responde "".
- Si existe en varios municipios y no puedes distinguir cual, responde "".
- No adivines por parecido de nombre: preferimos "" a un municipio equivocado.

{lista}

Responde SOLO con el array JSON, mismo orden y mismo "n":
[{{"n":1,"municipio":""}}]"""


def preguntar_ia(llaves, lote=30):
    """DeepSeek propone municipio para lo que ninguna fuente local conoce."""
    import os, time
    from dotenv import load_dotenv
    from openai import OpenAI
    load_dotenv(DIR.parent / ".env")
    cli = OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"], base_url="https://api.deepseek.com/v1")

    out = {}
    for i in range(0, len(llaves), lote):
        trozo = llaves[i:i + lote]
        lista = "\n".join(f"{j+1}. {k}" for j, k in enumerate(trozo))
        try:
            res = cli.chat.completions.create(
                model="deepseek-chat", temperature=0.0, max_tokens=1500,
                messages=[{"role": "system", "content": "Conoces la geografia de la zona metropolitana de Guadalajara. Respondes SOLO con un array JSON valido."},
                          {"role": "user", "content": PROMPT_IA.format(lista=lista)}])
            txt = res.choices[0].message.content.strip()
            for r in json.loads(txt[txt.find("["): txt.rfind("]") + 1]):
                m = norm_muni(r.get("municipio") or "")
                if m in ZONA and 1 <= r.get("n", 0) <= len(trozo):
                    out[trozo[r["n"] - 1]] = m
        except Exception as e:
            print(f"  lote {i//lote+1}: error ({e})")
        print(f"  IA {min(i+lote, len(llaves))}/{len(llaves)}", end="\r")
        time.sleep(0.3)
    print()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--ia", action="store_true",
                    help="para lo que ninguna fuente local sabe, preguntarle a DeepSeek")
    args = ap.parse_args()
    if not (args.dry_run or args.apply):
        ap.error("elige --dry-run o --apply")

    dec, padron, vistos = cargar()
    faltan = [k for k, v in dec.items() if not v.get("municipio") and "|" not in k]
    print(f"entradas sin municipio: {len(faltan)}")

    puestos = collections.Counter()
    cambios, homonimas, sin_resolver = [], [], []
    for k in faltan:
        muni, fuente, homon = resolver(norm_col_key(k), padron, vistos)
        if muni:
            cambios.append((k, muni, fuente))
            puestos[fuente] += 1
        elif homon:
            homonimas.append((k, homon))
        else:
            sin_resolver.append(k)

    if args.ia:
        # la IA solo entra donde ninguna fuente local sabe; las homonimas incluidas,
        # porque ahi el padron da candidatos pero no decide
        cache = DIR / "municipios_ia_veredictos.json"
        pendientes = sin_resolver + [k for k, _ in homonimas]
        if cache.exists():
            prop = json.loads(cache.read_text(encoding="utf-8"))
            print(f"veredictos IA leidos de {cache.name}: {len(prop)}")
        else:
            print(f"preguntando a DeepSeek por {len(pendientes)}...")
            prop = preguntar_ia(pendientes)
            cache.write_text(json.dumps(prop, ensure_ascii=False, indent=1), encoding="utf-8")
        candidatos_homon = dict(homonimas)
        for k, m in prop.items():
            if k in candidatos_homon and m not in candidatos_homon[k]:
                continue          # la IA contradice al padron: gana el padron
            cambios.append((k, m, "deepseek"))
            puestos["deepseek"] += 1
        resueltos_ia = set(prop)
        homonimas = [(k, h) for k, h in homonimas if k not in resueltos_ia]
        sin_resolver = [k for k in sin_resolver if k not in resueltos_ia]

    print(f"\nresueltos: {len(cambios)}")
    for f, n in puestos.most_common():
        print(f"   por {f:14s} {n}")
    print(f"homonimas (varios municipios, sin desempate): {len(homonimas)}")
    print(f"sin resolver (ni padron ni comps): {len(sin_resolver)}")

    print("\n-- muestra resueltos --")
    for k, m, f in cambios[:15]:
        print(f"   {k:38s} -> {m:22s} [{f}]")
    print("\n-- homonimas --")
    for k, h in homonimas[:10]:
        print(f"   {k:38s} -> {', '.join(h)}")

    if args.apply:
        ruta = DIR / "colonias_decada.json"
        sello = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        bak = ruta.with_suffix(f".json.bak-{sello}-municipios")
        shutil.copy2(ruta, bak)
        for k, m, f in cambios:
            dec[k]["municipio"], dec[k]["municipio_fuente"] = m, f
        for k, h in homonimas:
            dec[k]["homonima_en"] = h          # marcada: el motor no la aplica a ciegas
        ruta.write_text(json.dumps(dec, ensure_ascii=False, indent=1), encoding="utf-8")
        con = sum(1 for v in dec.values() if v.get("municipio"))
        print(f"\naplicado. con municipio: {con}/{len(dec)} ({100*con//len(dec)}%) | backup: {bak.name}")
    else:
        print("\n(dry-run: no se toco el archivo)")


if __name__ == "__main__":
    main()
