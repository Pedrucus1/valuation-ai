"""
verificar_errores_enricher.py

Diagnostica la calidad de datos post-enrichment en MongoDB.
Reporta: colonias vacías/basura, precios imposibles, m2 inválidos, dead listings.
No modifica nada — solo lee y reporta.

Uso: python verificar_errores_enricher.py [--portal PROPIEDADES_COM] [--fix-dead]
  --portal X   limitar a un portal
  --fix-dead   marcar activo=False en registros con colonia claramente basura
               (SOLO si --fix-dead está explícito — por defecto solo reporta)
"""

import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from collections import Counter

PORTALES = ["PROPIEDADES_COM","CASAS_Y_TERRENOS","INMUEBLES24","PINCALI","VIVANUNCIOS","MITULA","NOCNOK"]

FIX_DEAD = '--fix-dead' in sys.argv
PORTAL_FILTRO = None
if '--portal' in sys.argv:
    idx = sys.argv.index('--portal')
    PORTAL_FILTRO = sys.argv[idx+1] if idx+1 < len(sys.argv) else None

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']

# ── Filtros de basura (mismo criterio que cleaner.py y build_cache_index.js) ─
BASURA_RE = re.compile(
    r'\b(venta|renta|sale|for rent|oportunidad|inversion|departamento|bodega|oficina|local'
    r'|downtown|center|centre|av\b|calle\b|blvd\b|carretera\b|km\b)\b',
    re.IGNORECASE
)

def colonia_invalida(col_val):
    if not col_val or str(col_val).strip() == '':
        return 'vacia'
    s = str(col_val).strip()
    if len(s) > 45:
        return 'muy_larga'
    if BASURA_RE.search(s):
        return 'basura_keywords'
    if re.search(r'\d{4,}', s):
        return 'contiene_numero_largo'
    return None

portales = [PORTAL_FILTRO] if PORTAL_FILTRO else PORTALES

print(f"\n{'='*70}")
print(f"  DIAGNÓSTICO POST-ENRICHMENT — MongoDB mercado_props")
print(f"{'='*70}\n")

resumen_global = Counter()
ids_colonia_basura = []

for portal in portales:
    q_base = {'portal_origen': portal, 'activo': {'$ne': False}}
    total = col.count_documents(q_base)
    if total == 0:
        continue

    # Contar por tipo de error
    dead_404   = col.count_documents({'portal_origen': portal, 'enrich_dead': '404'})
    sin_enrich = col.count_documents({**q_base, 'enrich_last_attempt': {'$exists': False}})
    enriq_sin_colonia = col.count_documents({
        **q_base,
        'enriched_at': {'$exists': True},
        '$or': [{'colonia': {'$exists': False}}, {'colonia': None}, {'colonia': ''}]
    })
    enriq_sin_m2c = col.count_documents({
        **q_base,
        'enriched_at': {'$exists': True},
        '$or': [{'m2_construccion': {'$in': [None, '', 0]}}, {'m2_construccion': {'$exists': False}}]
    })
    precio_cero = col.count_documents({
        **q_base,
        '$or': [{'precio': {'$lte': 0}}, {'precio': None}, {'precio': {'$exists': False}}]
    })

    # Colonias basura (muestra de 500 para análisis)
    muestra = list(col.find(
        {**q_base, 'enriched_at': {'$exists': True}},
        {'colonia': 1, 'id_unico': 1},
        limit=3000
    ))
    col_errores = Counter()
    col_basura_ids = []
    for doc in muestra:
        err = colonia_invalida(doc.get('colonia'))
        if err:
            col_errores[err] += 1
            col_basura_ids.append(doc['id_unico'])

    # Estimar sobre total (proporcional)
    ratio = total / max(len(muestra), 1)
    col_err_est = {k: int(v * ratio) for k, v in col_errores.items()}

    print(f"{'─'*60}")
    print(f"  Portal: {portal}  (total activos: {total:,})")
    print(f"{'─'*60}")
    print(f"  Sin enrichment:          {sin_enrich:>6,}")
    print(f"  Dead (404):              {dead_404:>6,}")
    print(f"  Enriq. sin colonia:      {enriq_sin_colonia:>6,}")
    print(f"  Enriq. sin m²C:          {enriq_sin_m2c:>6,}")
    print(f"  Precio ≤0/null:          {precio_cero:>6,}")
    if col_errores:
        print(f"  Colonia basura (muestra {len(muestra)}):")
        for tipo, cnt in col_errores.most_common():
            print(f"    {tipo:<30} {cnt:>4}  (~{col_err_est[tipo]:,} total)")
    else:
        print(f"  Colonias (muestra {len(muestra)}): OK ✓")

    resumen_global['total'] += total
    resumen_global['sin_enrich'] += sin_enrich
    resumen_global['dead_404'] += dead_404
    resumen_global['enriq_sin_colonia'] += enriq_sin_colonia
    resumen_global['enriq_sin_m2c'] += enriq_sin_m2c
    resumen_global['precio_cero'] += precio_cero
    ids_colonia_basura.extend(col_basura_ids[:100])  # cap para --fix-dead

# ── Ejemplos de colonias basura ───────────────────────────────────────────────
print(f"\n{'='*70}")
print(f"  RESUMEN GLOBAL")
print(f"{'='*70}")
for k, v in resumen_global.items():
    print(f"  {k:<30} {v:>8,}")

# Muestra de colonias basura reales
if ids_colonia_basura:
    print(f"\n── Ejemplos de colonias problemáticas ─────────────────────────────────")
    ejemplos = list(col.find(
        {'id_unico': {'$in': ids_colonia_basura[:30]}},
        {'colonia': 1, 'municipio': 1, 'portal_origen': 1, 'url_original': 1}
    ))
    for e in ejemplos[:20]:
        col_val = e.get('colonia', '(vacía)')
        muni = e.get('municipio', '')
        portal = e.get('portal_origen', '')
        url = e.get('url_original', '')[:60]
        print(f"  [{portal}] colonia='{col_val[:50]}' | muni={muni} | {url}")

# ── Fix-dead opcional ─────────────────────────────────────────────────────────
if FIX_DEAD:
    print(f"\n{'='*70}")
    print(f"  MODO --fix-dead: esta operación NO está implementada automáticamente.")
    print(f"  Para corregir colonias basura, ejecutar el enricher nuevamente:")
    print(f"    python enricher.py --portal X")
    print(f"  O actualizar manualmente con update_many en MongoDB Compass.")
    print(f"{'='*70}")

print()
