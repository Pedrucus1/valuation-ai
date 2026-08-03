"""Pule las llaves de colonias_decada.json y les asigna municipio.

Por qué en el dato y no solo en la lectura: hay TRES normalizadores distintos
(normCol del motor JS, norm_col_key del backend, el de Codex) y ninguno entiende
las truncaciones del scraper ('ionamiento chapalita', 'omos providencia'). Se
arregla una vez en origen en vez de traducir en cada consumidor.

Solo toca colonias_decada.json. NO toca colonias_maestro.json: ahí las mismas
fusiones chocarían en `idx` (98 casos) y `nse` (62), que mueven el precio, y eso
exige validador offline antes/después.

Respaldo = git (el archivo está versionado). Dry-run por defecto; `--apply` escribe.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from core.colonias import norm_col_key, norm_muni, es_junk_colonia   # noqa: E402
import consolidar_colonias_idx as CONS               # noqa: E402

# Colas de anuncio EN INGLÉS que el scraper pegó al nombre: 'adamar residential',
# 'la rioja subdivision', 'chapalita on one floor'. extract_canonical no las quita
# porque fue escrito para sufijos de municipio y truncaciones, no para texto de
# anuncio. Solo inglés a propósito: 'residencial' o 'fraccionamiento' sí forman
# parte de nombres legítimos en español y quitarlos fusionaría colonias distintas.
_COLA_EN = re.compile(
    r"\s+(residential|subdivision|neighborhood|district|city|towers?|apartments?|"
    r"condos?|lofts?|houses?|homes?|lots?|land|for sale|for rent|on one floor)$",
    re.I)

_HERE = Path(__file__).resolve().parent
DECADA = _HERE / "colonias_decada.json"
MAESTRO = _HERE / "colonias_maestro.json"
CACHE_IDX = _HERE / "cache_index.json"
SEPOMEX = _HERE / "sepomex_v2.json"


def municipios_reales():
    """Padrón de municipios que existen de verdad, según SEPOMEX. El campo
    `municipio` del maestro trae basura ('valle dorado inn', '. tlaquepaque',
    'col miramar zapopan'): sin este filtro, una colonia de Zapopan con el
    municipio mal escrito parece 'fuera de la ZMG' y se borraría."""
    reales = set()
    for _, lst in json.loads(SEPOMEX.read_text(encoding="utf-8")).items():
        for e in lst:
            if e.get("municipio"):
                reales.add(norm_muni(e["municipio"]))
    return reales | ZMG


def nombres_sepomex():
    """Claves canónicas del catálogo postal. Sirve de indulto: lo que está aquí
    existe, por raro que se vea el nombre."""
    return {canonica(e["nombre"])
            for lst in json.loads(SEPOMEX.read_text(encoding="utf-8")).values()
            for e in lst if e.get("nombre")}


def municipios_por_colonia(maestro):
    """clave normalizada → {fuente: {municipios}}. Tres fuentes, de más a menos
    confiable: el maestro (curado), SEPOMEX (catálogo oficial) y cache_index
    (está literalmente indexado por municipio, pero lo llena el scraper)."""
    from collections import defaultdict
    mae, sep, idxm = defaultdict(set), defaultdict(set), defaultdict(set)
    for k, v in maestro.items():
        if (v or {}).get("municipio"):
            mae[canonica(k)].add(norm_muni(v["municipio"]))
    for _, lst in json.loads(SEPOMEX.read_text(encoding="utf-8")).items():
        for e in lst:
            if e.get("nombre") and e.get("municipio"):
                sep[canonica(e["nombre"])].add(norm_muni(e["municipio"]))
    idx = json.loads(CACHE_IDX.read_text(encoding="utf-8"))
    for muni, tipos in idx.items():
        if muni == "_meta":
            continue
        for _, celdas in (tipos or {}).items():
            for k in (celdas or {}):
                idxm[canonica(k)].add(norm_muni(muni))
    return mae, sep, idxm


# El dataset cubre la ZMG y la Ribera. Si un nombre existe en Zapopan y también
# en Manzanillo, la entrada es la de Zapopan: la ambigüedad es del catálogo
# nacional, no nuestra.
# Incluye las variantes con que aparecen escritos en los datos ('tlajomulco' a
# secas) y las localidades que se usan como si fueran municipio ('ajijic' es
# Chapala). Faltar una aquí significa borrar colonias buenas.
ZMG = {"guadalajara", "zapopan", "san pedro tlaquepaque", "tlaquepaque", "tonala",
       "tlajomulco de zuniga", "tlajomulco", "el salto", "juanacatlan", "zapotlanejo",
       "ixtlahuacan de los membrillos", "acatlan de juarez",
       # Ribera de Chapala
       "chapala", "ajijic", "san antonio tlayacapan", "jocotepec", "san juan cosala",
       "poncitlan", "tuxcueca", "tizapan el alto"}


def resolver_municipio(nk, mae, sep, idxm, reales):
    """(municipio, fuente, homonima_en).

    Primero busca dentro de la ZMG en las tres fuentes: si el maestro dice
    'puerta vallarta' pero SEPOMEX y el índice ubican el nombre en Zapopan, es
    de Zapopan ('las juntas' es Tlaquepaque, no Vallarta). Solo si NINGUNA
    fuente la pone en la ZMG se devuelve el municipio de fuera — y esa es la
    señal de que la entrada no pertenece a este dataset."""
    fuentes = (("maestro", mae), ("sepomex", sep), ("cache_index", idxm))

    # 1. ¿alguna fuente la ubica dentro de la ZMG, sin ambigüedad?
    for fuente, tabla in fuentes:
        dentro = (tabla.get(nk) or set()) & ZMG
        if len(dentro) == 1:
            return next(iter(dentro)), fuente, None

    # 2. varios candidatos DENTRO de la ZMG → homónima, nunca se descarta
    todas_zmg = set()
    for _, tabla in fuentes:
        todas_zmg |= (tabla.get(nk) or set()) & ZMG
    if todas_zmg:
        return None, None, sorted(todas_zmg)

    # 3. nadie la pone en la ZMG: si hay un municipio real de fuera, no pertenece
    for fuente, tabla in fuentes:
        munis = {m for m in (tabla.get(nk) or set()) if m in reales}
        if len(munis) == 1:
            return next(iter(munis)), fuente, None
    return None, None, None


def canonica(llave):
    """MISMO criterio que consolidar_colonias_idx.py, para que las llaves de los
    tres archivos coincidan. Ese script además quita el sufijo de municipio
    ('omos providencia guadalajara' → 'colomos providencia'); si no aplica ningún
    patrón suyo, cae al normalizador del backend.

    Antes de eso se despega la cola de anuncio en inglés, para que 'adamar
    residential', 'adamar subdivision' y 'adamar' sean UNA colonia y no tres."""
    for _ in range(2):                       # 'x residential tower' lleva dos
        limpia = _COLA_EN.sub("", str(llave or "").strip()).strip()
        if limpia == llave or len(limpia) < 3:
            break
        llave = limpia
    canon, tipo = CONS.extract_canonical(llave)
    if canon and tipo == "seguro" and (
            len(canon) < len(llave) or canon.split()[0] in CONS.RESTAURA_TRUNC.values()):
        return canon
    return norm_col_key(llave)


def _fuerza(entrada, llave):
    """Gana la mejor evidencia; a igualdad, la llave que ya está bien escrita."""
    return (entrada.get("confianza_puntos") or 0, canonica(llave) == llave)


def limpiar(decada, maestro):
    # Titulares de anuncio que el scraper metió en el campo de colonia
    # ('26 lots located in la providencia', '128 m apartment in cd granja 48') y
    # '_meta', que es una llave de metadatos colada como si fuera colonia.
    # Se descartan ANTES de agrupar: no son nombres y ensucian los grupos.
    # ...pero es_junk_colonia es una heurística de anuncios y tiene falsos
    # positivos sobre nombres legítimos: '2001' cae por la regla de 3+ dígitos y
    # 'san miguel de huentitan el alto 1a secc' por la de 34 caracteres, y las dos
    # son colonias reales. Estar en SEPOMEX es prueba de que el nombre existe, así
    # que gana sobre la heurística.
    oficiales = nombres_sepomex()
    basura = {k: v for k, v in decada.items()
              if k == "_meta" or (es_junk_colonia(k) and canonica(k) not in oficiales)}
    decada = {k: v for k, v in decada.items() if k not in basura}

    grupos = {}
    for k in decada:
        grupos.setdefault(canonica(k), []).append(k)

    salida, fusiones, intactos = {}, [], []
    for nk, llaves in grupos.items():
        munis = {norm_muni((maestro.get(k) or {}).get("municipio") or "") for k in llaves} - {""}
        if len(llaves) > 1 and len(munis) > 1:
            # Colonias homónimas de municipios distintos ('valle de san nicolas'
            # en Tonalá y en Zapopan): NO son la misma. Se separan POR MUNICIPIO
            # ('nombre|municipio'), no dejando una llave deformada como antes.
            for k in llaves:
                mk = norm_muni((maestro.get(k) or {}).get("municipio") or "")
                salida[f"{nk}|{mk}" if mk else k] = decada[k]
            intactos.append((nk, sorted(llaves), sorted(munis)))
            continue
        orden = sorted(llaves, key=lambda k: _fuerza(decada[k], k), reverse=True)
        if (len(orden) > 1
                and _fuerza(decada[orden[0]], orden[0]) == _fuerza(decada[orden[1]], orden[1])
                and decada[orden[0]]["decada_ref"] != decada[orden[1]]["decada_ref"]):
            # Misma evidencia, décadas distintas: probablemente son dos colonias
            # homónimas ('san antonio' 1910s y 1960s). No se inventa un ganador.
            for k in llaves:
                salida[k] = decada[k]
            intactos.append((nk, sorted(llaves), ["EMPATE " + "/".join(
                sorted({decada[k]["decada_ref"] for k in llaves}))]))
            continue
        gana = orden[0]
        salida[nk] = decada[gana]
        if len(llaves) > 1:
            fusiones.append((nk, gana, [k for k in llaves if k != gana],
                             sorted({decada[k]["decada_ref"] for k in llaves})))

    # El municipio es el discriminador de los homónimos: va EN el dato, no
    # implícito en que una llave haya quedado deformada.
    mae, sep, idxm = municipios_por_colonia(maestro)
    reales = municipios_reales()
    for k, v in salida.items():
        nombre, _, explicito = k.partition("|")
        if explicito:                       # llave 'nombre|municipio': ya resuelto
            v["municipio"], v["municipio_fuente"] = explicito, "maestro"
            v.pop("homonima_en", None)
            continue
        muni, fuente, ambiguo = resolver_municipio(canonica(nombre), mae, sep, idxm, reales)
        v["municipio"] = muni
        v["municipio_fuente"] = fuente
        if ambiguo:
            # El nombre existe en varios municipios y no sabemos en cuál cae esta
            # entrada: la década que traemos vale para UNO de ellos. Se marca en
            # vez de aplicarla a ciegas a los demás.
            v["homonima_en"] = ambiguo
        else:
            v.pop("homonima_en", None)

    # El dataset es ZMG + Ribera de Chapala. Lo que quedó ubicado FUERA no
    # pertenece aquí: se elimina. Solo cuando ninguna fuente la pone en la ZMG.
    fuera = {k: v for k, v in salida.items()
             if v.get("municipio") and v["municipio"] not in ZMG}
    for k in fuera:
        del salida[k]
    return dict(sorted(salida.items())), fusiones, intactos, fuera, basura


def main():
    decada = json.loads(DECADA.read_text(encoding="utf-8"))
    maestro = json.loads(MAESTRO.read_text(encoding="utf-8"))
    salida, fusiones, intactos, fuera, basura = limpiar(decada, maestro)

    cambian = [k for k in decada if norm_col_key(k) != k]
    disc = [f for f in fusiones if len(f[3]) > 1]
    print(f"entradas............ {len(decada)} -> {len(salida)}")
    print(f"basura descartada... {len(basura)} (titulares de anuncio + _meta)")
    print(f"   ej: {list(basura)[:4]}")
    print(f"llaves mal escritas. {len(cambian)}")
    print(f"grupos fusionados... {len(fusiones)}  (con década contradictoria: {len(disc)})")
    con_muni = sum(1 for v in salida.values() if v.get("municipio"))
    homon = [k for k, v in salida.items() if v.get("homonima_en")]
    import collections
    porf = collections.Counter(v.get("municipio_fuente") for v in salida.values() if v.get("municipio"))
    print(f"con municipio....... {con_muni} de {len(salida)}  ({dict(porf)})")
    print(f"homónimas marcadas.. {len(homon)} (mismo nombre en 2+ municipios, década sin desambiguar)")
    print(f"   ej: {[(k, salida[k]['homonima_en'][:3]) for k in homon[:4]]}")
    import collections as _c
    print(f"ELIMINADAS fuera ZMG {len(fuera)}  {_c.Counter(v['municipio'] for v in fuera.values()).most_common(6)}")
    print(f"homónimos INTACTOS.. {len(intactos)} (municipios distintos, no se fusionan)")
    for nk, llaves, munis in intactos:
        print(f"   · {nk}: {llaves} en {munis}")
    print("\nejemplos de fusión con década contradictoria:")
    for nk, gana, perdedores, decs in disc[:8]:
        print(f"   · {nk}: gana '{gana}' ({decada[gana]['decada_ref']}, "
              f"{decada[gana]['fuente']} {decada[gana]['confianza_puntos']}pts) "
              f"sobre {perdedores} — décadas en disputa {decs}")

    # ninguna colonia se pierde: toda llave vieja debe seguir siendo alcanzable
    # Ninguna colonia se pierde por accidente: o sigue alcanzable, o se eliminó
    # a propósito por quedar fuera de la ZMG.
    alcanzable = (set(salida) | {k.partition("|")[0] for k in salida if "|" in k}
                  | set(fuera) | set(basura))
    perdidas = [k for k in decada
                if k not in basura and canonica(k) not in alcanzable and k not in alcanzable]
    assert not perdidas, perdidas[:5]

    if "--apply" in sys.argv:
        DECADA.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nESCRITO: {DECADA.name} ({len(salida)} entradas). Revertir: git checkout -- '{DECADA.name}'")
    else:
        print("\nDRY-RUN. Nada escrito. Para aplicar: --apply")


def grupos_de(decada, nk):
    return [k for k in decada if norm_col_key(k) == nk]


if __name__ == "__main__":
    main()
