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


# La misma sección venía escrita de cinco maneras — 'providencia 1a secc',
# '... 1a seccion', '... 1ra', '... i' — y cada variante era una colonia distinta
# para la búsqueda. No es un detalle de forma: el archivo SÍ fecha las secciones
# una por una (175 entradas), y Providencia 1a es 1950s mientras la 5a es 1970s.
# Sin unificar la escritura, 345 anuncios se quedaban sin su década ESTANDO
# fechada su sección exacta. El paréntesis es el mismo caso: 'el alcazar (casa
# fuerte)' es la entrada 'el alcazar casa fuerte'.
#
# Ojo: esto unifica la ESCRITURA de una sección, no las secciones entre sí. Se
# resiste la tentación de colapsar 'providencia 1a' con 'providencia', que
# borraría veinte años de diferencia ya curados. Esa caída ocurre en `decada_de`
# y sale marcada como ambigua.
_ROMANO = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5"}
_PAREN_RE = re.compile(r"\s*\(([^)]*)\)")
_SECC_RE = re.compile(r"\b(secc?|secc?ion|secion|sec)\.?\b", re.I)
_ORDINAL_RE = re.compile(r"\b(\d+)\s*(?:a|ra|da|ta|va|era|do|ro)\b", re.I)
_SEC_NUM_RE = re.compile(r"\bseccion\s+([ivx]+|\d+)\b", re.I)
_ROM_RE = re.compile(r"\b([ivx]+)\b(?=\s*seccion|$)", re.I)
_NUM_FIN_RE = re.compile(r"\b(\d+)$")


def norm_seccion(s):
    """Deja una sola forma para el sufijo de sección: '<n> seccion'."""
    s = _PAREN_RE.sub(r" \1", s)
    s = _SECC_RE.sub("seccion", s)
    s = _ORDINAL_RE.sub(r"\1", s)             # '1a' / '1ra' → '1'
    s = _SEC_NUM_RE.sub(r"\1 seccion", s)     # 'seccion i' → 'i seccion'
    s = _ROM_RE.sub(lambda m: _ROMANO.get(m.group(1).lower(), m.group(1)), s)
    s = _NUM_FIN_RE.sub(r"\1 seccion", s)     # 'plutarco elias calles 1' → '... 1 seccion'
    return " ".join(s.split())


def norm_col_key(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = " ".join(s.split())
    return norm_seccion(_DECOR_RE.sub("", _restaura_trunc(s)))


def sin_seccion(s):
    """La colonia madre: 'providencia 1 seccion' → 'providencia'. Solo para el
    último intento de `decada_de`, nunca para identificar."""
    return _SEC_SUFIJO_RE.sub("", norm_col_key(s)).strip()


_SEC_SUFIJO_RE = re.compile(r"\s+(?:\d+\s+)?seccion\b.*$|\s+\d+$", re.I)


# El mismo municipio escrito de dos maneras se estaba tratando como dos, y
# `decada_de()` devolvía None creyendo que era una homónima de otro municipio.
# 'tlaquepaque' es el nombre corto de San Pedro Tlaquepaque; Ajijic es una
# localidad DENTRO de Chapala, no un municipio. Medido: 292 anuncios perdían la
# década por esto, sin que hubiera homónima ninguna.
_ALIAS_MUNI = {
    "tlaquepaque": "san pedro tlaquepaque",
    "ajijic": "chapala",
    "chapala jalisco": "chapala",
    "zapopan jalisco": "zapopan",
    "guadalajara jalisco": "guadalajara",
    "tlajomulco": "tlajomulco de zuniga",
    "ixtlahuacan": "ixtlahuacan de los membrillos",
    "acatlan": "acatlan de juarez",
}


def norm_muni(s):
    """Sin acentos + minúsculas (SEPOMEX y nuestros nombres difieren en acentos),
    y con los alias del mismo municipio colapsados — ver `_ALIAS_MUNI`."""
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").strip()
    return _ALIAS_MUNI.get(s, s)


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
        # Último intento: la sección no está fechada, pero la colonia madre sí.
        # 'lomas del paraiso 6 seccion' no existe; 'lomas del paraiso' sí. Da la
        # banda de la colonia, que es mejor que nada y peor que el dato — las
        # secciones se abren por etapas y pueden separarse una década. Sale
        # marcado ambiguo para que quien lo consuma baje la confianza.
        base = sin_seccion(nombre)
        if base and base != nk:
            llave = por_clave.get((muni, base)) or por_clave.get(("", base))
            if llave:
                return {**decada[llave], "_llave": llave, "_match": "colonia-madre",
                        "_ambiguo": True}
        return None

    v = decada[llave]
    propio = norm_muni(v.get("municipio") or "")
    if muni and propio and propio != muni:
        # Que el municipio no coincida NO significa siempre "otra colonia". Medido
        # contra 20,824 anuncios reales, el desacuerdo es de dos tipos distintos y
        # tratarlos igual costaba 440 anuncios que sí tenían su década:
        #
        #   a) HOMÓNIMA REAL — el nombre existe en los dos municipios y los dos
        #      polígonos están lejos (Chulavista Tlajomulco vs Chapala, 39 km).
        #      Son dos colonias. Devolver la década de una para la otra es inventar.
        #      Van listadas en `homonima_en`, verificado por coordenada de CP.
        #   b) DESACUERDO DE ETIQUETA — la colonia está a caballo del límite
        #      (Chapalita, Colomos Providencia) o el anuncio trae mal el municipio.
        #      Es la misma colonia y su década aplica; lo único honesto es marcar
        #      el margen, no negar el dato.
        #
        # `homonima_en` se calcula en `marcar_homonimas.py` (repo del manual) con
        # SEPOMEX + coordenadas, nunca a ojo. Ausente = caso (b): se contesta con
        # `_ambiguo`, que es lo que ya usa quien consume esto para bajar confianza.
        if muni in {norm_muni(x) for x in (v.get("homonima_en") or [])}:
            return None            # (a) otra colonia con el mismo nombre
        return {**v, "_llave": llave, "_match": "nombre-otro-municipio",
                "_ambiguo": True}  # (b) misma colonia, etiqueta en desacuerdo
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
