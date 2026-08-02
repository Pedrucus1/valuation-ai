"""Normalización de nombres de colonia (fuente única) + lectura de
`colonias_decada.json` traducida a ese normalizador.

Por qué existe: `colonias_decada.json` se construyó con las llaves crudas del
scraper ('col americana', 'ionamiento chapalita', 'omos providencia') mientras
que la app busca con `norm_col_key()`. Eran dos normalizadores que no se
hablaban: 237 llaves que existen pero el motor no encuentra.

Decisión (Tarea 6): NO renombrar llaves. El maestro sigue siendo el catálogo
canónico y aquí se traduce EN LA LECTURA, con municipio como parte de la
identidad y las colisiones reportadas, nunca resueltas con "último gana".

`es_junk_colonia()` es solo para entradas CRUDAS/scrapeadas (el selector de
edades). NUNCA se aplica al maestro ni a colonias_decada.
"""
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

_DRIVE_IA = Path(__file__).resolve().parents[2] / "Modulo Drive IA"
_DECADA_PATH = _DRIVE_IA / "colonias_decada.json"
_MAESTRO_PATH = _DRIVE_IA / "colonias_maestro.json"

# El scraper corta la primera palabra. Hay DOS casos y confundirlos borra colonias:
#
#   a) la palabra cortada era genérica ('colonia', 'fraccionamiento') → se quita.
#      'onia guadalajara centro' → 'guadalajara centro'
#   b) la palabra cortada era PARTE DEL NOMBRE → hay que restaurarla, no quitarla.
#      'omos providencia' es COLOMOS Providencia (1910s), NO Providencia (1960s):
#      son dos colonias distintas. 'inas de atemajac' es COLINAS de Atemajac;
#      quitarlo dejaba 'de atemajac', que no es nombre de nada.
# 'coto', 'condominio' y 'privada' NO se quitan: un coto de 2010 dentro de una
# colonia de los 60 es otra edad y otro producto ('coto del fresno' 2010s vs
# 'del fresno' 1960s). 'colonia' y 'fraccionamiento' sí son genéricos.
_RESTAURA = {"omos": "colomos", "inas": "colinas"}
_TRUNC_RE = re.compile(r"^(omos|inas)\s+", re.I)
_DECOR_RE = re.compile(r"^(onia|ionamiento|amiento|col\.?|colonia|fracc\.?|"
                       r"fraccionamiento)\s+", re.I)


def _restaura_trunc(s):
    return _TRUNC_RE.sub(lambda m: _RESTAURA[m.group(1).lower()] + " ", s)


def limpia_decor(s):
    s = _restaura_trunc(str(s or "").strip())
    return _DECOR_RE.sub("", s).strip()


def norm_col_key(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = " ".join(s.split())
    return _DECOR_RE.sub("", _restaura_trunc(s))


def norm_muni(s):
    """Sin acentos + minúsculas (SEPOMEX y nuestros nombres difieren en acentos)."""
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def es_junk_colonia(v):
    """True si el 'nombre de colonia' es en realidad basura scrapeada: una dirección
    (con coma o número de calle) o 'CP + ciudad' ('44230 Guadalajara'). No debe salir
    en el selector. Deja pasar nombres reales tipo '18 de Marzo', '1 de Mayo'.
    Solo para entradas crudas — ver docstring del módulo."""
    if "," in v:
        return True                      # direcciones: "Av De La Paz 2121, Americana, GDL"
    if re.search(r"\d{3,}", v):
        return True                      # CP o número de calle (3+ dígitos): "44230 Guadalajara"
    if len(v) > 34:
        return True                      # nombres largos = títulos/descripciones, no colonias
    if re.search(r"\b(for sale|for rent|for pre-?sale|apartment|house|building|sale in|rent in|"
                 r"en renta|en venta|casa en|depto en|departamento en|se vende|se renta|dentro de|"
                 r"downtown|commercial|local in|zone|expo)\b", v.lower()):
        return True                      # frases de anuncio, no nombres de colonia
    return False


def _fuerza(decada, k):
    """Orden de preferencia dentro de un grupo: primero la confianza del dato, y
    a igualdad la llave que ya es canónica."""
    return (decada[k].get("confianza_puntos") or 0, norm_col_key(k) == k)


@lru_cache(maxsize=1)
def _indice():
    """(decada, por_clave, colisiones). `por_clave[(municipio, nombre_norm)]` →
    llave real. El municipio sale del propio dato (`municipio`, presente en 2,465
    de 4,808 entradas), no de un cruce contra el maestro. Las homónimas de verdad
    viven con llave 'nombre|municipio'."""
    decada = json.loads(_DECADA_PATH.read_text(encoding="utf-8"))

    grupos = {}
    for k, v in decada.items():
        nombre, _, muni_llave = k.partition("|")
        nk = norm_col_key(nombre)
        muni = muni_llave or norm_muni(v.get("municipio") or "")
        grupos.setdefault((muni, nk), []).append(k)
        if muni:                   # también sin municipio, para buscar sin él
            grupos.setdefault(("", nk), []).append(k)

    por_clave, colisiones = {}, []
    for (muni, nk), llaves in grupos.items():
        llaves = sorted(llaves, key=lambda k: _fuerza(decada, k), reverse=True)
        top = llaves[0]
        if len(llaves) > 1:
            decadas = {decada[k]["decada_ref"] for k in llaves}
            empate = len(decadas) > 1 and _fuerza(decada, top) == _fuerza(decada, llaves[1])
            if len(decadas) > 1:
                colisiones.append({
                    "municipio": muni, "clave": nk, "empate": empate,
                    "gana": None if empate else top,
                    "candidatos": [{"llave": k, "decada_ref": decada[k]["decada_ref"],
                                    "fuente": decada[k]["fuente"],
                                    "confianza_puntos": decada[k].get("confianza_puntos")}
                                   for k in llaves],
                })
            if empate:
                continue           # ambiguo: no se resuelve con "último gana"
        por_clave[(muni, nk)] = top
    return decada, por_clave, colisiones


def decada_de(nombre, municipio=None):
    """Década de una colonia. Devuelve la entrada + `_llave`, `_match`
    (municipio|nombre) y `_ambiguo`, o None.

    `_ambiguo=True` significa que el nombre existe en varios municipios y no se
    sabe a cuál corresponde esta década: sirve para no aplicarla a ciegas.
    Devuelve None cuando el municipio pedido contradice al de la entrada — ahí
    es otra colonia, no un dato faltante."""
    decada, por_clave, _ = _indice()
    nombre = str(nombre or "").strip()
    if not nombre:
        return None
    nk = norm_col_key(nombre)
    muni = norm_muni(municipio or "")

    llave = por_clave.get((muni, nk)) if muni else None
    match = "municipio"
    if not llave:
        llave, match = por_clave.get(("", nk)), "nombre"
    if not llave:
        return None

    v = decada[llave]
    propio = norm_muni(v.get("municipio") or "")
    if muni and propio and propio != muni:
        return None                # homónima de otro municipio: no es esta colonia
    return {**v, "_llave": llave, "_match": match,
            "_ambiguo": bool(v.get("homonima_en")) and not (muni and propio == muni)}


def colisiones_decada():
    """Grupos donde variantes de la misma colonia traen décadas distintas."""
    return _indice()[2]


if __name__ == "__main__":
    decada, por_clave, colis = _indice()

    # normalización: genérico se quita, nombre truncado se restaura
    assert norm_col_key("Col. Americana") == "americana"
    assert norm_col_key("IONAMIENTO Chapalita") == "chapalita"
    assert norm_col_key("omos providencia") == "colomos providencia"
    assert norm_col_key("inas de atemajac") == "colinas de atemajac"
    assert limpia_decor("omos Providencia") == "colomos Providencia"

    # Colomos Providencia y Providencia son colonias distintas
    assert decada_de("omos providencia")["decada_ref"] != decada_de("providencia")["decada_ref"]

    # las variantes deformadas siguen encontrándose tras consolidar el dato
    assert decada_de("ionamiento chapalita")["decada_ref"] == decada["chapalita"]["decada_ref"]
    assert decada_de("Col. Chapalita")["decada_ref"] == decada["chapalita"]["decada_ref"]

    # ninguna llave del archivo queda inalcanzable
    perdidas = [k for k in decada if decada_de(k.partition("|")[0],
                                               k.partition("|")[2] or None) is None]
    assert not perdidas, perdidas[:5]

    # el municipio discrimina las homónimas
    vsn_t = decada_de("valle de san nicolas", "Tonalá")
    vsn_z = decada_de("valle de san nicolas", "Zapopan")
    assert vsn_t["_llave"].endswith("|tonala") and vsn_z["_llave"].endswith("|zapopan")
    assert decada_de("valle de san nicolas", "Guadalajara") is None   # ahí no existe

    # nombre presente en varios municipios: se entrega marcado, no a ciegas
    amb = decada_de("altamira")
    assert amb["_ambiguo"] and "tonala" in amb["homonima_en"]
    assert not decada_de("chapalita")["_ambiguo"]

    assert es_junk_colonia("Av De La Paz 2121, Americana")

    con_muni = sum(1 for v in decada.values() if v.get("municipio"))
    homon = sum(1 for v in decada.values() if v.get("homonima_en"))
    print(f"entradas............. {len(decada)}")
    print(f"con municipio........ {con_muni}  ({100*con_muni//len(decada)}%)")
    print(f"homónimas marcadas... {homon}")
    print(f"colisiones sin resolver: {sum(c['empate'] for c in colis)}")
    print("OK")
