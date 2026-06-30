#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Compara per-OPI motor ORIGINAL (_orig_run.log) vs CON-CAMBIOS (_conca_run.log) para AFINAR
el umbral del gate CUS<0.40: ver caso por caso si el gate ayudó o no, segmentado por CUS."""
import json, re, sys, statistics as st
sys.stdout.reconfigure(encoding='utf-8')

def num(v):
    try: return float(re.sub(r'[^0-9.\-]','',str(v))) if v not in(None,'') else 0.0
    except: return 0.0

def parse_log(path):
    out={}
    for ln in open(path, encoding='utf-8', errors='replace'):
        m = re.search(r'(OPI-[\w-]+)', ln)
        dm = re.search(r'diff:\s*([+\-][\d.]+)%', ln)
        pm = re.search(r'pool:(\w+)', ln)
        if m and dm:
            out[m.group(1)] = (float(dm.group(1)), pm.group(1) if pm else '?')
    return out

orig = parse_log('_orig_run.log')
conca = parse_log('_conca_run.log')
cer = {x.get('folio'): x for x in json.load(open('cerebro_datos.json', encoding='utf-8'))}

rows = []
for f in set(orig) & set(conca):
    eo, _ = orig[f]; ec, poolc = conca[f]
    x = cer.get(f)
    if not x: continue
    mC = num(x.get('m2Construccion')); mT = num(x.get('m2Terreno'))
    cus = mC/mT if mT else 9
    rows.append(dict(f=f, cus=cus, eo=eo, ec=ec, pool=poolc, cambio=abs(eo-ec) > 0.05))

# casos que el gate/cambios tocaron
tocados = [r for r in rows if r['cambio']]
print(f"OPIs comparados: {len(rows)} | tocados por los cambios: {len(tocados)}\n")
print(f"{'FOLIO':<16}{'CUS':>5}{'origErr':>9}{'nuevoErr':>9}{'pool':>14}{'efecto':>9}")
for r in sorted(tocados, key=lambda r: r['cus']):
    efecto = 'MEJORÓ' if abs(r['ec']) < abs(r['eo']) else 'empeoró' if abs(r['ec']) > abs(r['eo']) else '='
    print(f"{r['f']:<16}{r['cus']:>5.2f}{r['eo']:>+8.1f}{r['ec']:>+8.1f}{r['pool']:>14}{efecto:>9}")

# segmentación por banda CUS — error abs antes/después (TODOS, para ver umbral)
print("\n── Error abs promedio por banda CUS (todos) ──")
def band(c): return '<0.35' if c<0.35 else '0.35-0.40' if c<0.40 else '0.40-0.50' if c<0.50 else '0.50-0.85' if c<0.85 else '>=0.85'
seg = {}
for r in rows:
    seg.setdefault(band(r['cus']), ([],[]))
    seg[band(r['cus'])][0].append(abs(r['eo'])); seg[band(r['cus'])][1].append(abs(r['ec']))
print(f"{'banda':<12}{'n':>4}{'orig':>9}{'nuevo':>9}")
for k in ['<0.35','0.35-0.40','0.40-0.50','0.50-0.85','>=0.85']:
    if k not in seg: continue
    o,c = seg[k]
    print(f"{k:<12}{len(o):>4}{st.mean(o):>8.1f}%{st.mean(c):>8.1f}%")
