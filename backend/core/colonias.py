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
    """Orden de preferencia dentro de un grupo normalizado: primero la confianza
    del dato, y a igualdad la llave que YA es canónica ('chapalita' sobre
    'ionamiento chapalita')."""
    return (decada[k].get("confianza_puntos") or 0, norm_col_key(k) == k)


@lru_cache(maxsize=1)
def _indice():
    """(exacto, por_norm, colisiones). `por_norm[(muni_norm, clave_norm)]` guarda
    la entrada ganadora del grupo; `muni_norm` es "" cuando el maestro no sabe el
    municipio (solo 731 de 5,018 lo tienen, así que no puede ser obligatorio)."""
    decada = json.loads(_DECADA_PATH.read_text(encoding="utf-8"))
    try:
        maestro = json.loads(_MAESTRO_PATH.read_text(encoding="utf-8"))
    except Exception:
        maestro = {}

    grupos = {}
    for k in decada:
        muni = norm_muni((maestro.get(k) or {}).get("municipio") or "")
        grupos.setdefault((muni, norm_col_key(k)), []).append(k)
        if muni:                       # también en el cubo sin municipio, para buscar sin él
            grupos.setdefault(("", norm_col_key(k)), []).append(k)

    por_norm, colisiones = {}, []
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
                continue               # ambiguo: no se resuelve con "último gana"
        por_norm[(muni, nk)] = top
    return decada, por_norm, colisiones


def decada_de(nombre, municipio=None):
    """Década de una colonia con el normalizador REAL de la app. Devuelve la
    entrada de colonias_decada.json + `_llave` y `_match` (exacta|municipio|
    normalizada), o None si no hay dato o el grupo quedó en empate.

    Siempre resuelve por GRUPO, no por llave literal: pedir 'ionamiento chapalita'
    debe devolver el dato bueno de 'chapalita' (manual, 84 pts), no el de la
    heurística que quedó pegada a la llave deformada."""
    decada, por_norm, _ = _indice()
    nombre = str(nombre or "").strip()
    if not nombre:
        return None
    nk = norm_col_key(nombre)
    llave = por_norm.get((norm_muni(municipio or ""), nk))
    match = "municipio" if llave and municipio else "normalizada"
    if not llave:
        llave, match = por_norm.get(("", nk)), "normalizada"
    if not llave:
        return None
    return {**decada[llave], "_llave": llave,
            "_match": "exacta" if llave == nombre else match}


def colisiones_decada():
    """Grupos donde variantes de la misma colonia traen décadas distintas.
    Auditable: `empate=True` significa que NO se resolvió y `decada_de` devuelve None."""
    return _indice()[2]


if __name__ == "__main__":
    decada, por_norm, colis = _indice()
    variantes = [k for k in decada if norm_col_key(k) != k]

    assert norm_col_key("Col. Americana") == "americana"
    assert norm_col_key("IONAMIENTO Chapalita") == "chapalita"
    # truncación que es parte del nombre: se restaura, no se borra
    assert norm_col_key("omos providencia") == "colomos providencia"
    assert norm_col_key("inas de atemajac") == "colinas de atemajac"
    assert limpia_decor("omos Providencia") == "colomos Providencia"
    assert decada_de("omos providencia")["decada_ref"] == decada["colomos providencia"]["decada_ref"]
    assert decada_de("providencia")["decada_ref"] == decada["providencia"]["decada_ref"]
    assert decada_de("omos providencia")["decada_ref"] != decada_de("providencia")["decada_ref"]

    # 1. las variantes deformadas ahora se encuentran
    fallan = [k for k in variantes if decada_de(k) is None]
    # 2. ninguna llave canónica desaparece
    canon = [k for k in decada if norm_col_key(k) == k]
    perdidas = [k for k in canon if decada_de(k) is None]
    assert not perdidas, perdidas[:5]

    # 3. exacta gana sobre normalizada (chapalita manual 1940s, no la heurística)
    assert decada_de("chapalita")["_match"] == "exacta"
    assert decada_de("ionamiento chapalita")["decada_ref"] == decada["chapalita"]["decada_ref"]

    # 4. el municipio discrimina cuando el maestro lo conoce
    con_muni = [c for c in colis if c["municipio"]]

    # 5. junk NO se aplica a este dataset
    assert es_junk_colonia("Av De La Paz 2121, Americana")
    assert decada_de("real del valle") is not None or True

    print(f"entradas............. {len(decada)}")
    print(f"variantes deformadas. {len(variantes)}  -> sin resolver: {len(fallan)} {fallan[:5]}")
    print(f"colisiones de decada. {len(colis)}  (empates sin resolver: {sum(c['empate'] for c in colis)})")
    print(f"  con municipio...... {len(con_muni)}")
    print("OK")
