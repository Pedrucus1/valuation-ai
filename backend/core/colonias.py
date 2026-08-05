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
# El separador no siempre es espacio: el portal escribe 'omos-providencia' con
# guion y esa variante no se restauraba.
_TRUNC_RE = re.compile(r"^(omos|inas)[\s-]+", re.I)
_DECOR_RE = re.compile(r"^(onia|ionamiento|amiento|col\.?|colonia|fracc\.?|"
                       r"fraccionamiento)\s+", re.I)
# 'colonia' pegada al final es decoracion pura y se quita. 'fraccionamiento' NO:
# se probo y el catalogo lo desmiente igual que con 'residencial' —Altavista es
# 1980s y Altavista Fraccionamiento 1990s—, asi que esa cae en `decada_de`,
# marcada, y no en la identidad.
# El portal separa con guion lo que el catalogo separa con espacio
# ('azaleas-bugambilias'), asi que el guion se trata como espacio.
_DECOR_FIN_RE = re.compile(r"\s+(colonia|col\.?)$", re.I)
_GUION_RE = re.compile(r"[-–—_]+")


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
_PUNTO_ORD_RE = re.compile(r"(\d+)\.\s*")
# El punto de las siglas y abreviaturas no es parte del nombre, y venía de dos
# formas: el catálogo guarda 'colli ctm' y el scraper manda 'colli c.t.m.'. Sin
# quitarlo eran dos colonias distintas, igual que 'gral. real' contra 'gral real'.
# Se aplica DESPUÉS del ordinal, que necesita ver el punto de '1a.' para su regla.
_PUNTO_RE = re.compile(r"\.")
# 'Los Robles Residencial' y 'Residencial Provenza' son las mismas colonias que
# 'los robles' y 'provenza': el portal cuelga la palabra de un lado o del otro
# segun el anuncio. Costaba 250 anuncios. Va aparte de _DECOR_RE porque puede
# ir al final, no solo al principio.
#
# OJO: 'coto', 'condominio' y 'privada' NO entran aqui y no deben entrar. Un
# coto de 2010 dentro de una colonia de los 60 es otra edad y otro producto;
# 'residencial' en cambio no distingue nada, es decoracion del anuncio.
_RESIDENCIAL_RE = re.compile(r"^residencial\s+|\s+(residencial|fraccionamiento|fracc\.?)$", re.I)

# Copia de anuncio disfrazada de colonia. Cada alternativa es una FORMA, no una
# palabra suelta, para no tocar los nombres reales que usan las mismas palabras.
_ANUNCIO_RE = re.compile(
    r"^(sale|rent|venta|renta)\b"                     # 'Sale | Stadium Area'
    r"|^(department|dept|depto|ph)\b\s*(in|of|de|at)?\b"   # 'Department in Moderna'
    r"|\|"                                            # separador de plantilla
    r"|\b(model [a-z]\b|pre-?sale|for investment|block from|with (pool|tenant)|"
    r"excelente (inversion|trato)|ideal (house|para)|rural property)\b"
    r"|^local\b",                                     # 'Local with tenant in...'
    re.I)


def norm_seccion(s):
    """Deja una sola forma para el sufijo de sección: '<n> seccion'."""
    s = _PAREN_RE.sub(r" \1", s)
    s = _SECC_RE.sub("seccion", s)
    s = _ORDINAL_RE.sub(r"\1", s)             # '1a' / '1ra' → '1'
    # El punto del ordinal abreviado sobrevivía a la sustitución de arriba y
    # dejaba '1. seccion', que no casa con el '1 seccion' del archivo. Costaba
    # 148 anuncios (El Colli Urbano, Del Fresno, Jardines de la Cruz).
    s = _PUNTO_ORD_RE.sub(r"\1 ", s)
    s = _SEC_NUM_RE.sub(r"\1 seccion", s)     # 'seccion i' → 'i seccion'
    s = _ROM_RE.sub(lambda m: _ROMANO.get(m.group(1).lower(), m.group(1)), s)
    s = _NUM_FIN_RE.sub(r"\1 seccion", s)     # 'plutarco elias calles 1' → '... 1 seccion'
    return " ".join(_PUNTO_RE.sub("", s).split())


# Mojibake clásico: el portal guardó UTF-8 y alguien lo leyó como latin-1, así
# que 'í' quedó como 'ã­' y 'ó' como 'ã³'. Se deshace ANTES de quitar acentos —
# después ya no hay nada que recuperar—. Estas secuencias no existen en un nombre
# real, así que revertirlas no puede romper nada.
_MOJIBAKE = {"ã¡": "á", "ã©": "é", "ã­": "í", "ã³": "ó", "ãº": "ú", "ã±": "ñ", "ã¼": "ü"}
_MOJIBAKE_RE = re.compile("|".join(_MOJIBAKE), re.I)


def _des_mojibake(s):
    return _MOJIBAKE_RE.sub(lambda m: _MOJIBAKE[m.group(0).lower()], s)


def norm_col_key(s):
    s = _des_mojibake(str(s or "").lower())
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = " ".join(_GUION_RE.sub(" ", s).split())
    s = _DECOR_FIN_RE.sub("", _DECOR_RE.sub("", _restaura_trunc(s)))
    return norm_seccion(s.strip())


def sin_residencial(s):
    """'Los Robles Residencial' y 'Altavista Fraccionamiento' → el nombre pelado.
    NO va en `norm_col_key`: se probó
    y el propio archivo desmiente que sean lo mismo. San Andrés de Guadalajara es
    de los veinte y Residencial San Andrés de los sesenta; Tesistán 1990s contra
    Residencial Tesistán 2010s; Altavista 1980s contra Altavista Residencial
    2010s. La palabra distingue un desarrollo nuevo con el nombre del rumbo
    viejo, igual que 'coto' o 'privada'.

    Por eso vive en la cascada de `decada_de` y no en la identidad: sólo entra
    cuando el archivo NO tiene la variante propia, y sale marcada ambigua."""
    return _RESIDENCIAL_RE.sub("", norm_col_key(s)).strip()


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


# Los municipios que PropValu valúa. Fuera de aquí no se dictamina, así que una
# colonia de Lagos de Moreno o de Autlán no tiene por qué estar en el catálogo
# aunque sea de Jalisco: ensucia el diccionario y hace preguntar de más.
#
# Son los mismos tres bloques del diccionario impreso: la mancha continua, los
# anexados a la delimitación oficial que todavía no la tocan, y la Ribera de
# Chapala —que NO es ZMG y tiene mercado y cronología propios, pero sí se valúa—.
MUNICIPIOS_ZMG = (
    "guadalajara", "zapopan", "san pedro tlaquepaque", "tonala",
    "tlajomulco de zuniga", "el salto")
MUNICIPIOS_EXPANSION = (
    "juanacatlan", "ixtlahuacan de los membrillos", "zapotlanejo", "acatlan de juarez")
MUNICIPIOS_RIBERA = ("chapala", "poncitlan", "jocotepec", "tizapan el alto")
MUNICIPIOS_COBERTURA = frozenset(MUNICIPIOS_ZMG + MUNICIPIOS_EXPANSION + MUNICIPIOS_RIBERA)


def es_municipio_cubierto(m):
    """True si PropValu valúa ahí. Sin municipio devuelve True: la entrada podrá
    estar incompleta, pero no hay evidencia de que esté fuera y borrarla por
    omisión sería peor que dejarla."""
    m = norm_muni(m or "")
    return not m or m in MUNICIPIOS_COBERTURA


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
    # El largo se mide SIN el adorno y DESPUÉS de restaurar el truncado, no sobre
    # el crudo. Medido: 'fraccionamiento jardines de guadalupe' son 37 caracteres
    # y la colonia está fechada; 'ionamiento club de golf santa anita' es el mismo
    # caso con el truncado del scraper encima. Se descartaban 116 anuncios cuya
    # colonia el diccionario ya tenía, sólo por la palabra que sobra delante.
    #
    # Y el corte estaba en 34 cuando el propio catálogo llega a 47 ('rinconada del
    # sol por zona arqueologica ixtepec', 'san miguel de huentitan el alto 2
    # seccion'): descartaba 8 de sus propias entradas. 48 no deja fuera ninguna.
    if len(norm_col_key(v)) > 48:
        return True                      # nombres largos = títulos/descripciones, no colonias
    if re.search(r"\b(for sale|for rent|for pre-?sale|apartment|house|building|sale in|rent in|"
                 r"en renta|en venta|casa en|depto en|departamento en|se vende|se renta|dentro de|"
                 r"downtown|commercial|local in|zone|expo)\b", v.lower()):
        return True                      # frases de anuncio, no nombres de colonia
    # Lo anterior busca frases sueltas y por eso dejaba pasar 'Sale | Stadium Area
    # Jalisco', 'Department in Moderna', 'PH Country' y 'Artpark Amber Tower |
    # Model C Emotions': llegaron hasta la lista del perito.
    #
    # El criterio NO puede ser "esta en ingles". Atlas Country Club, Chapala
    # Country Club, Estrela Living y Villa California son colonias reales del
    # catalogo —89 entradas ya fechadas usan palabras en ingles— y filtrarlas por
    # idioma las borraria. Lo que delata al anuncio es la FORMA: empieza con el
    # tipo de propiedad o con un verbo de venta, trae separador de plantilla, o
    # describe el inmueble en vez de nombrar un lugar.
    if _ANUNCIO_RE.search(v.lower()):
        return True
    return False


@lru_cache(maxsize=1)
def _truncadas():
    """Nombres a los que el scraper les corto el principio, mapeados al del
    catalogo: 'l independencia' → 'colonial independencia'. Sale de
    `cerrar_residuo.py` (repo del manual), que solo acepta el caso en que el
    texto es sufijo de UNA entrada, y vive en archivo en vez de en el codigo
    porque crece con cada corrida del scraper, no con cada cambio de logica.

    Aparte de `_RESTAURA`, que resuelve los dos truncados fijos y conocidos
    ('omos'/'inas') dentro de la identidad. Este es una caida marcada, no una
    identidad: si el nombre completo existe, ese manda."""
    p = _DRIVE_IA / "colonias_truncadas.json"
    if not p.exists():
        return {}
    return {norm_col_key(k): norm_col_key(v)
            for k, v in json.loads(p.read_text(encoding="utf-8")).items()}


def _banda(v):
    """Las décadas que cubre una entrada. `decadas` es la banda; `decada_ref` es
    sólo su punto representativo, y compararlo solo hace ver contradicción donde
    hay distinta precisión."""
    return set(v.get("decadas") or []) or {v["decada_ref"]}


def _cruzan(decada, llaves):
    """True si todas las entradas comparten al menos una década: es la misma
    colonia contada con distinta finura, no dos fechas peleadas."""
    return bool(set.intersection(*(_banda(decada[k]) for k in llaves)))


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
            # Una colonia NO pertenece a una sola década: 1,852 de 3,001 entradas
            # abarcan varias, y por eso `decadas` es una banda. Comparar el
            # `decada_ref` —que es un punto— hacía ver como contradicción lo que
            # sólo era distinta precisión: 'insurgentes 1a' mide 1960s y
            # 'insurgentes 1a secc' dice 1970s con la banda ±1 por defecto, y
            # 1960s cae dentro de esa banda. No se contradicen.
            #
            # Regla: si las bandas se cruzan es la misma colonia contada con
            # distinta finura, y gana la más afilada. Medido sobre el archivo,
            # así se resuelven 10 de 11 choques sin preguntarle nada al perito.
            # Sólo cuando las bandas son DISJUNTAS hay conflicto de verdad.
            if len(decadas) > 1 and _cruzan(decada, llaves):
                por_clave[(muni, nk)] = min(llaves, key=lambda k: (len(_banda(decada[k])),
                                                                  -_fuerza(decada, k)[0]))
                continue
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
        for base, como in ((_truncadas().get(nk), "truncado-restaurado"),
                           (sin_residencial(nombre), "sin-residencial"),
                           (sin_seccion(nombre), "colonia-madre")):
            if not base or base == nk:
                continue
            llave = por_clave.get((muni, base)) or por_clave.get(("", base))
            if llave:
                return {**decada[llave], "_llave": llave, "_match": como,
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
