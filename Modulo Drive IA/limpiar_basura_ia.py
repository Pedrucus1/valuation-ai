"""
limpiar_basura_ia.py

Clasifica con DeepSeek las entradas de colonias_decada.json que NO estan en el
padron SEPOMEX y NO tienen un solo comp: sobrantes de scraper (titulares de
anuncio) mezclados con colonias reales mal escritas o traducidas al ingles.

DeepSeek solo propone; el padron decide. Si propone un nombre limpio se valida
contra sepomex_jalisco.json antes de aceptarlo.

Uso:
  python limpiar_basura_ia.py --dry-run              → propone sin tocar nada
  python limpiar_basura_ia.py --dry-run --limite 40  → muestra sobre una muestra
  python limpiar_basura_ia.py --apply                → aplica + backup
"""
import argparse, collections, json, os, pathlib, sys, time

DIR = pathlib.Path(__file__).parent
BACK = DIR.parent / "backend"
sys.path.insert(0, str(BACK))
from core.colonias import norm_col_key, norm_muni   # noqa: E402  fuente unica de normalizacion

from dotenv import load_dotenv                       # noqa: E402
from openai import OpenAI                            # noqa: E402

load_dotenv(DIR.parent / ".env")
LOTE = 25            # entradas por llamada
MODELO = "deepseek-chat"

SISTEMA = ("Clasificas nombres de colonias de la Zona Metropolitana de Guadalajara. "
           "Respondes SOLO con un array JSON valido, sin markdown ni explicaciones.")

PROMPT = """Cada linea es el valor que un scraper guardo en el campo "colonia" de un anuncio inmobiliario de la ZMG (Guadalajara, Zapopan, Tlaquepaque, Tonala, Tlajomulco, El Salto). Muchos no son colonias: son titulares de anuncio, nombres de torre o frases de marketing.

Clasifica cada uno:
- "basura": es un titular de anuncio o frase publicitaria, no un lugar ("apartments in presale opera", "invest in 1 min from la minerva", "the glorieta de la normal area").
- "renombrar": contiene el nombre de una colonia real pero deformado, traducido al ingles o con ruido pegado. Devuelve el nombre en espanol, limpio, en minusculas y sin acentos ("gardens of guadalupe" -> "jardines de guadalupe", "el vergel to" -> "el vergel").
- "colonia": ya es un nombre de colonia, fraccionamiento o coto valido tal cual ("bosques san gonzalo").

Ante la duda entre basura y renombrar, elige renombrar y da tu mejor nombre: el padron lo verifica despues.

{lista}

Responde SOLO con el array JSON, en el mismo orden y con el mismo "n":
[{{"n":1,"tipo":"basura|renombrar|colonia","nombre":""}}]"""


def candidatos(dec, sep_nk, uso):
    """Entradas fuera del padron y sin un solo comp encima."""
    out = []
    for k, v in dec.items():
        if v.get("fuente") != "heuristica-anillo" or v.get("confianza") != "baja":
            continue
        nombre, _, muni_llave = k.partition("|")
        nk = norm_col_key(nombre)
        if nk in sep_nk:
            continue
        muni = muni_llave or norm_muni(v.get("municipio") or "")
        if uso[(muni, nk)] or uso[("", nk)]:
            continue
        out.append(k)
    return out


def clasificar(cli, llaves):
    lista = "\n".join(f"{i+1}. {k}" for i, k in enumerate(llaves))
    res = cli.chat.completions.create(
        model=MODELO, temperature=0.0, max_tokens=2000,
        messages=[{"role": "system", "content": SISTEMA},
                  {"role": "user", "content": PROMPT.format(lista=lista)}])
    txt = res.choices[0].message.content.strip()
    txt = txt[txt.find("["): txt.rfind("]") + 1]
    por_n = {r["n"]: r for r in json.loads(txt)}
    # ponytail: si la IA se salta una linea, esa entrada se queda como esta
    return [(k, por_n.get(i + 1, {"tipo": "colonia", "nombre": ""})) for i, k in enumerate(llaves)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limite", type=int, default=0, help="solo las primeras N (prueba)")
    ap.add_argument("--desde-archivo", action="store_true",
                    help="reusa basura_ia_veredictos.json en vez de volver a llamar a DeepSeek")
    args = ap.parse_args()
    if not (args.dry_run or args.apply):
        ap.error("elige --dry-run o --apply")

    ruta = DIR / "colonias_decada.json"
    dec = json.loads(ruta.read_text(encoding="utf-8"))
    sep = json.loads((DIR / "sepomex_jalisco.json").read_text(encoding="utf-8"))
    comps = json.loads((DIR / "cache_consolidado.json").read_text(encoding="utf-8"))["datos"]

    sep_nk = {norm_col_key(k) for k in sep}
    uso = collections.Counter()
    for c in comps:
        uso[(norm_muni(c.get("muni") or ""), norm_col_key(c.get("colonia") or ""))] += 1

    llaves = candidatos(dec, sep_nk, uso)
    print(f"candidatos: {len(llaves)}")
    if args.limite:
        llaves = llaves[:args.limite]
        print(f"limitado a {len(llaves)}")

    # la pasada por DeepSeek se guarda: aplicar despues no vuelve a pagarla
    cache = DIR / "basura_ia_veredictos.json"
    fallos = 0
    if args.desde_archivo:
        guardado = json.loads(cache.read_text(encoding="utf-8"))
        veredictos = [(k, r) for k, r in guardado if k in dec]
        print(f"veredictos leidos de {cache.name}: {len(veredictos)}")
    else:
        cli = OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"], base_url="https://api.deepseek.com/v1")
        veredictos = []
        for i in range(0, len(llaves), LOTE):
            lote = llaves[i:i + LOTE]
            try:
                veredictos += clasificar(cli, lote)
            except Exception as e:
                fallos += 1
                print(f"  lote {i//LOTE+1}: error ({e}) — se conserva tal cual")
                veredictos += [(k, {"tipo": "colonia", "nombre": ""}) for k in lote]
            print(f"  {min(i+LOTE, len(llaves))}/{len(llaves)}", end="\r")
            time.sleep(0.3)
        print()
        cache.write_text(json.dumps(veredictos, ensure_ascii=False, indent=1), encoding="utf-8")

    borrar, renombrar, rechazados, quedan = [], [], [], []
    for k, r in veredictos:
        tipo, prop = r.get("tipo"), norm_col_key(r.get("nombre") or "")
        if tipo == "basura":
            borrar.append(k)
        elif tipo == "renombrar" and prop and prop != k:
            # el nombre nuevo se acepta si el padron lo tiene o si ya es una llave
            # del archivo (cotos y privadas reales que SEPOMEX no registra)
            (renombrar if (prop in sep_nk or prop in dec) else rechazados).append((k, prop))
        else:
            quedan.append(k)

    print(f"\nbasura (borrar).......... {len(borrar)}")
    print(f"renombrar (validado)..... {len(renombrar)}")
    print(f"renombre rechazado....... {len(rechazados)}  (el nombre propuesto no esta en el padron)")
    print(f"se quedan como estan..... {len(quedan)}")
    if fallos:
        print(f"lotes fallidos........... {fallos} (sus entradas se conservan)")

    print("\n-- muestra basura --")
    for k in borrar[:15]:
        print("  ", k)
    print("\n-- renombrar --")
    for k, nuevo in renombrar[:15]:
        print(f"   {k}  ->  {nuevo}{'   (ya existe, se fusiona)' if nuevo in dec else ''}")
    print("\n-- renombre rechazado por el padron (se quedan tal cual) --")
    for k, nuevo in rechazados[:15]:
        print(f"   {k}  -/->  {nuevo}")

    if args.apply:
        import datetime, shutil
        sello = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        bak = ruta.with_suffix(f".json.bak-{sello}-basura-ia")
        shutil.copy2(ruta, bak)
        for k in borrar:
            dec.pop(k, None)
        for k, nuevo in renombrar:
            v = dec.pop(k, None)
            if v and nuevo not in dec:      # si ya existe gana el que ya estaba (tiene mas historia)
                dec[nuevo] = v
        ruta.write_text(json.dumps(dec, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\naplicado. entradas: {len(dec)} | backup: {bak.name}")
    else:
        print("\n(dry-run: no se toco el archivo)")


if __name__ == "__main__":
    main()
