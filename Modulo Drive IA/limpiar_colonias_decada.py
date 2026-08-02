"""Pule las llaves de colonias_decada.json dejándolas ya normalizadas.

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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from core.colonias import norm_col_key, norm_muni   # noqa: E402
import consolidar_colonias_idx as CONS               # noqa: E402

_HERE = Path(__file__).resolve().parent
DECADA = _HERE / "colonias_decada.json"
MAESTRO = _HERE / "colonias_maestro.json"


def canonica(llave):
    """MISMO criterio que consolidar_colonias_idx.py, para que las llaves de los
    tres archivos coincidan. Ese script además quita el sufijo de municipio
    ('omos providencia guadalajara' → 'colomos providencia'); si no aplica ningún
    patrón suyo, cae al normalizador del backend."""
    canon, tipo = CONS.extract_canonical(llave)
    if canon and tipo == "seguro" and (
            len(canon) < len(llave) or canon.split()[0] in CONS.RESTAURA_TRUNC.values()):
        return canon
    return norm_col_key(llave)


def _fuerza(entrada, llave):
    """Gana la mejor evidencia; a igualdad, la llave que ya está bien escrita."""
    return (entrada.get("confianza_puntos") or 0, canonica(llave) == llave)


def limpiar(decada, maestro):
    grupos = {}
    for k in decada:
        grupos.setdefault(canonica(k), []).append(k)

    salida, fusiones, intactos = {}, [], []
    for nk, llaves in grupos.items():
        munis = {norm_muni((maestro.get(k) or {}).get("municipio") or "") for k in llaves} - {""}
        if len(llaves) > 1 and len(munis) > 1:
            # Colonias homónimas de municipios distintos ('jardines del vergel' en
            # Tlajomulco y en Tlaquepaque): NO son la misma, no se fusionan.
            for k in llaves:
                salida[k] = decada[k]
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
    return dict(sorted(salida.items())), fusiones, intactos


def main():
    decada = json.loads(DECADA.read_text(encoding="utf-8"))
    maestro = json.loads(MAESTRO.read_text(encoding="utf-8"))
    salida, fusiones, intactos = limpiar(decada, maestro)

    cambian = [k for k in decada if norm_col_key(k) != k]
    disc = [f for f in fusiones if len(f[3]) > 1]
    print(f"entradas............ {len(decada)} -> {len(salida)}")
    print(f"llaves mal escritas. {len(cambian)}")
    print(f"grupos fusionados... {len(fusiones)}  (con década contradictoria: {len(disc)})")
    print(f"homónimos INTACTOS.. {len(intactos)} (municipios distintos, no se fusionan)")
    for nk, llaves, munis in intactos:
        print(f"   · {nk}: {llaves} en {munis}")
    print("\nejemplos de fusión con década contradictoria:")
    for nk, gana, perdedores, decs in disc[:8]:
        print(f"   · {nk}: gana '{gana}' ({decada[gana]['decada_ref']}, "
              f"{decada[gana]['fuente']} {decada[gana]['confianza_puntos']}pts) "
              f"sobre {perdedores} — décadas en disputa {decs}")

    # ninguna colonia se pierde: toda llave vieja debe seguir siendo alcanzable
    perdidas = [k for k in decada if canonica(k) not in salida and k not in salida]
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
