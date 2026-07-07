"""
build_seg_anclas.py — Construye anclas de $/m²C segmentadas (viejo/nuevo) por colonia×tipo.

Lee cache_index.json y para cada colonia×tipo:
  1. Si hay ≥5 listings viejo (anio < CUR_YEAR-15) Y ≥5 nuevo (anio >= CUR_YEAR-15): usa split por edad.
  2. Si no hay suficiente cobertura de anio: usa k-means k=2 sobre pm2c.
     - Si ratio hi/lo ≥ 1.5 (bimodal) y ambos clusters n≥5 → guarda segmentado.
  3. Si no hay bimodalidad → no incluye (motor usa ancla blended normal).

Output: cache_seg_anclas.json
  { "municipio": { "tipo": { "colonia": {
        "method": "anio" | "kmeans",
        "viejo": { "medianaPm2c": int, "n": int },
        "nuevo": { "medianaPm2c": int, "n": int },
        "ratio": float  // nuevo/viejo
  } } } }

Uso: python build_seg_anclas.py [--threshold 1.5]
"""
import json, sys, math, pathlib, datetime, shutil

DIR = pathlib.Path(__file__).parent
IDX_PATH = DIR / "cache_index.json"
OUT_PATH = DIR / "cache_seg_anclas.json"

N_MIN = 5            # mínimo por cluster para activar
CUR_YEAR = datetime.date.today().year
EDAD_CORTE = 16      # viejo = anio <= CUR_YEAR - EDAD_CORTE

THRESHOLD = 1.5      # ratio mínimo hi/lo para considerar bimodal
for arg in sys.argv:
    if arg.startswith("--threshold="):
        THRESHOLD = float(arg.split("=")[1])

# ── helpers ──────────────────────────────────────────────────────────────────
def median(vals):
    s = sorted(v for v in vals if v and v > 0)
    if not s: return 0
    n = len(s)
    return (s[n//2] if n % 2 else (s[n//2-1]+s[n//2])/2)

def kmeans2(vals, iters=20):
    """K-means k=2. Retorna (centroide_lo, centroide_hi, indices_lo, indices_hi)."""
    if len(vals) < 2*N_MIN:
        return None
    s = sorted(vals)
    c1 = s[len(s)//4]    # Q1
    c2 = s[3*len(s)//4]  # Q3
    g1, g2 = [], []
    for _ in range(iters):
        g1 = [v for v in vals if abs(v-c1) <= abs(v-c2)]
        g2 = [v for v in vals if abs(v-c2) < abs(v-c1)]
        if not g1 or not g2:
            return None
        n1 = sum(g1)/len(g1)
        n2 = sum(g2)/len(g2)
        if abs(n1-c1) < 1 and abs(n2-c2) < 1:
            c1, c2 = n1, n2
            break
        c1, c2 = n1, n2
    lo, hi = (c1, c2) if c1 <= c2 else (c2, c1)
    lo_vals = [v for v in vals if abs(v-lo) <= abs(v-hi)]
    hi_vals = [v for v in vals if abs(v-hi) < abs(v-lo)]
    return lo, hi, lo_vals, hi_vals

# ── main ─────────────────────────────────────────────────────────────────────
print(f"Leyendo {IDX_PATH} ...")
with open(IDX_PATH, encoding="utf-8") as f:
    idx = json.load(f)

result = {}
stats = {"bimodal_anio": 0, "bimodal_kmeans": 0, "skip_pequeño": 0, "skip_uniforme": 0}

for muni, tipos in idx.items():
    if muni == "_meta" or not isinstance(tipos, dict):
        continue
    for tipo, colonias in tipos.items():
        if not isinstance(colonias, dict):
            continue
        for col, data in colonias.items():
            listings = data.get("listings", [])
            if len(listings) < 2*N_MIN:
                stats["skip_pequeño"] += 1
                continue

            pm2c_all = []
            viejo_pm2c = []
            nuevo_pm2c = []

            for lst in listings:
                m2c = lst.get("m2c") or 0
                precio = lst.get("precio") or 0
                anio = lst.get("anio")
                if m2c <= 0 or precio <= 0:
                    continue
                pm2 = precio / m2c
                if pm2 <= 0:
                    continue
                pm2c_all.append(pm2)
                if isinstance(anio, (int, float)) and anio > 1900:
                    if (CUR_YEAR - anio) >= EDAD_CORTE:
                        viejo_pm2c.append(pm2)
                    else:
                        nuevo_pm2c.append(pm2)

            if not pm2c_all:
                continue

            seg_viejo = None
            seg_nuevo = None
            method = None

            # Estrategia 1: split por anio (más confiable)
            if len(viejo_pm2c) >= N_MIN and len(nuevo_pm2c) >= N_MIN:
                med_v = median(viejo_pm2c)
                med_n = median(nuevo_pm2c)
                if med_v > 0 and med_n > 0:
                    lo_med = min(med_v, med_n)
                    hi_med = max(med_v, med_n)
                    ratio = hi_med / lo_med if lo_med > 0 else 1.0
                    if ratio >= THRESHOLD:
                        seg_viejo = {"medianaPm2c": int(med_v), "n": len(viejo_pm2c)}
                        seg_nuevo = {"medianaPm2c": int(med_n), "n": len(nuevo_pm2c)}
                        method = "anio"
                        stats["bimodal_anio"] += 1

            # Estrategia 2: k-means (cuando no hay suficiente anio)
            if not seg_viejo:
                km = kmeans2(pm2c_all)
                if km:
                    lo_c, hi_c, lo_v, hi_v = km
                    if len(lo_v) >= N_MIN and len(hi_v) >= N_MIN and lo_c > 0:
                        ratio = hi_c / lo_c
                        if ratio >= THRESHOLD:
                            seg_viejo = {"medianaPm2c": int(median(lo_v)), "n": len(lo_v)}
                            seg_nuevo = {"medianaPm2c": int(median(hi_v)), "n": len(hi_v)}
                            method = "kmeans"
                            stats["bimodal_kmeans"] += 1
                        else:
                            stats["skip_uniforme"] += 1
                else:
                    stats["skip_pequeño"] += 1

            if seg_viejo and seg_nuevo and method:
                if muni not in result: result[muni] = {}
                if tipo not in result[muni]: result[muni][tipo] = {}
                ratio = seg_nuevo["medianaPm2c"] / seg_viejo["medianaPm2c"]
                result[muni][tipo][col] = {
                    "method": method,
                    "viejo": seg_viejo,
                    "nuevo": seg_nuevo,
                    "ratio": round(ratio, 2)
                }

# Backup si existe
if OUT_PATH.exists():
    bak = OUT_PATH.with_suffix(".json.bak")
    shutil.copy2(OUT_PATH, bak)
    print(f"Backup: {bak}")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, separators=(",", ":"))

total = sum(len(cols) for tipos in result.values() for cols in tipos.values())
print(f"\nResultado: {total} colonias con ancla segmentada")
print(f"  Por anio: {stats['bimodal_anio']} | Por k-means: {stats['bimodal_kmeans']}")
print(f"  Skip (pool pequeño): {stats['skip_pequeño']} | Skip (uniforme): {stats['skip_uniforme']}")
print(f"Output: {OUT_PATH}")

# Preview de algunos casos interesantes
interesantes = ["seattle", "jardines de la cruz", "las bovedas", "lomas san agustin", "el vergel"]
print("\nCasos de interés:")
for muni, tipos in result.items():
    for tipo, cols in tipos.items():
        for col, v in cols.items():
            if any(k in col for k in interesantes):
                print(f"  {muni}/{tipo}/{col}: viejo={v['viejo']['medianaPm2c']:,} (n={v['viejo']['n']}) nuevo={v['nuevo']['medianaPm2c']:,} (n={v['nuevo']['n']}) ratio={v['ratio']} method={v['method']}")
