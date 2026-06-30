#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VALIDACION DE PRODUCCION: Remi solo vs Remi+Metodo (hibrido gateado a CUS<0.5).
El Metodo usa SOLO datos reales del motor: comps del scraper (cache colonia+similares),
pm2T de la SEMILLA (pm2t_semilla.json), tope NSE. 40 OPIs estratificados por banda de error de Remi.
Framing: Remi acierta X% en <10% vs perito; el hibrido cuanto cambia eso."""
import json, re, sys, unicodedata, statistics as st
sys.stdout.reconfigure(encoding='utf-8')
K_LAND=0.8; TOPE_NSE=1.30

def norm(s):
    s=unicodedata.normalize('NFD',str(s or '')).encode('ascii','ignore').decode().lower()
    s=re.sub(r'\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|coto|privada|conjunto)\b',' ',s)
    return re.sub(r'[^a-z0-9 ]',' ',s).replace('  ',' ').strip()
def nm(s):
    m=norm(s); m=re.sub(r'tlajomulco de zuniga','tlajomulco',m); m=re.sub(r'^san pedro.*','tlaquepaque',m)
    m=re.sub(r'^bahia de banderas.*','bahia de banderas',m); return m.strip()
def num(v):
    try: return float(re.sub(r'[^0-9.\-]','',str(v))) if v not in(None,'') else 0.0
    except: return 0.0
CAL={'BUENO':0.95,'REGULAR':0.89,'REMODELADO':0.90,'REMODELADA':0.90}
def cal(c):
    s=(c or '').upper()
    for k,v in CAL.items():
        if k in s: return v
    return 0.92

maestro=json.load(open('colonias_maestro.json',encoding='utf-8'))
cache=json.load(open('cache_index.json',encoding='utf-8'))
nse=json.load(open('colonias_nse.json',encoding='utf-8'))
semilla=json.load(open('pm2t_semilla.json',encoding='utf-8'))['zonas']
mk={norm(k):k for k in cache if k!='_meta'}

def col_match(muni,col,tipo):
    k=mk.get(nm(muni))
    if not k: return []
    cn=norm(col); out=[]
    if len(cn)<4: return []
    for c in (cache[k].get(tipo) or {}):
        if cn in norm(c) or norm(c) in cn: out+=cache[k][tipo][c].get('listings',[])
    return out
def zona_casa(muni,col):
    res=col_match(muni,col,'casa')
    for s in (maestro.get(norm(col),{}).get('similares') or []):
        res+=col_match(s.get('municipio') or muni, s.get('colonia',''), 'casa')
    return res
def pm2T_de(muni,col):
    key=f"{nm(muni)}|{norm(col)}"
    if key in semilla: return semilla[key]['pm2T']        # 1) semilla del perito
    for s in (maestro.get(norm(col),{}).get('similares') or []):  # 2) semilla de similar
        k2=f"{nm(s.get('municipio') or muni)}|{norm(s.get('colonia',''))}"
        if k2 in semilla: return semilla[k2]['pm2T']
    return 0

def metodo(x):
    mC=num(x.get('m2Construccion')); mT=num(x.get('m2Terreno'))
    if mC<40 or mT<=0: return None
    cus_s=mC/mT
    muni=x.get('municipio',''); col=x.get('sujetoColonia','')
    casa=[(l.get('m2t') or 0,l.get('m2c') or 0,l.get('precio') or 0) for l in zona_casa(muni,col) if (l.get('m2t') or 0)>0 and (l.get('m2c') or 0)>0 and (l.get('precio') or 0)>0]
    if len(casa)<3: return None
    pm=pm2T_de(muni,col)
    if not pm: return None
    pus=[]
    for t,c,p in casa[:15]:
        cc=c/t
        pus.append((p/c + K_LAND*pm*(1/cus_s-1/cc))*(cus_s/cc)**(1/6)*(mT/t)**(1/6))
    v=sum(pus)/len(pus)*mC*cal(x.get('estadoConservacion'))
    ne=nse.get(norm(col))
    if ne and ne.get('medianaPm2',0)>0:
        v=min(v, ne['medianaPm2']*TOPE_NSE*mC)
    return v

# Remi baseline
motor={}
for ln in open('motor_baseline_full.txt',encoding='utf-8',errors='replace'):
    m=re.search(r'(OPI-[\w-]+).*?perito:\s*([\d.]+)k\s+motor:\s*([\d.]+)k',ln); dm=re.search(r'([+-][\d.]+)%',ln)
    if m and dm and num(m.group(3))>0: motor[m.group(1)]=(float(m.group(2)),float(m.group(3)),float(dm.group(1)))
cer={x.get('folio'):x for x in json.load(open('cerebro_datos.json',encoding='utf-8'))}

rows=[]
for f,(per_k,mot_k,diff) in motor.items():
    x=cer.get(f)
    if not x: continue
    per=num(x.get('valorMercado'))
    if per<=0: continue
    mC=num(x.get('m2Construccion')); mT=num(x.get('m2Terreno')); cus=mC/mT if mT else 9
    mv=metodo(x) if 0<cus<0.5 else None       # gate: metodo solo lote grande
    hib_k = mv/1000 if mv else mot_k          # hibrido: metodo si aplica, si no Remi
    rows.append(dict(f=f,cus=cus,per=per_k,remi=mot_k,hib=hib_k,
                     er=abs(diff), eh=abs(hib_k/per_k-1)*100 if per_k else 0, uso='MET' if mv else 'remi'))

# ── overall: tasa de acierto Remi vs Hibrido ──
def tasa(rows,campo,umb): return sum(1 for r in rows if r[campo]<=umb)
n=len(rows)
print(f"=== TODOS los {n} avaluos (casas) — tasa de acierto vs perito ===")
print(f"{'':<14}{'<10%':>8}{'<15%':>8}{'<20%':>8}{'err prom':>10}")
print(f"{'Remi solo':<14}{tasa(rows,'er',10)*100//n:>7}%{tasa(rows,'er',15)*100//n:>7}%{tasa(rows,'er',20)*100//n:>7}%{st.mean([r['er'] for r in rows]):>9.1f}%")
print(f"{'Hibrido':<14}{tasa(rows,'eh',10)*100//n:>7}%{tasa(rows,'eh',15)*100//n:>7}%{tasa(rows,'eh',20)*100//n:>7}%{st.mean([r['eh'] for r in rows]):>9.1f}%")
usados=[r for r in rows if r['uso']=='MET']
print(f"\nEl metodo se aplico (CUS<0.5 con datos) en {len(usados)} de {n} casas ({len(usados)*100//n}%)")
if usados:
    print(f"  En esas: Remi err prom {st.mean([r['er'] for r in usados]):.1f}%  ->  Hibrido {st.mean([r['eh'] for r in usados]):.1f}%")
    print(f"  detalle:")
    for r in sorted(usados,key=lambda r:r['cus'])[:20]:
        print(f"    {r['f']:<16} CUS{r['cus']:.2f}  Remi {r['er']:>5.1f}%  Metodo {r['eh']:>6.1f}%")
