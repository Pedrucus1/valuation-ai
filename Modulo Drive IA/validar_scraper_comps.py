#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""PRUEBA DE PRODUCCION: Metodo Perito sobre casas de lote grande recientes,
   pero usando los COMPARABLES DEL SCRAPER (cache_index.json), NO los del perito.
   Asi vemos si funciona con los datos que Remi consigue solo."""
import json, re, sys, unicodedata, statistics as st
sys.stdout.reconfigure(encoding='utf-8')
K_LAND=0.8  # descuento terreno excedente

def num(v):
    if v is None: return 0.0
    if isinstance(v,(int,float)): return float(v)
    s=re.sub(r'[^0-9.\-]','',str(v))
    try: return float(s) if s and s not in('-','.') else 0.0
    except: return 0.0
def norm(s):
    s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]','',s).strip()
def reciente(f):
    m=re.match(r'OPI-(\d+)-',f or ''); return bool(m) and 2000+int(m.group(1))>=2025
CAL={'BUENO':0.95,'REGULAR':0.89,'REMODELADO':0.90,'REMODELADA':0.90}
def cal(c):
    s=(c or '').upper()
    for k,v in CAL.items():
        if k in s: return v
    return 0.92
def pctl(v,p=0.3):
    v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else 0

cache=json.load(open('cache_index.json',encoding='utf-8'))
# indices por municipio
def listings(muni,tipo):
    mu=cache.get(muni) or {}
    out=[]
    for col,obj in (mu.get(tipo) or {}).items():
        for l in obj.get('listings',[]):
            out.append((norm(col),num(l.get('m2t')),num(l.get('m2c')),num(l.get('precio'))))
    return out
muni_keys={norm(k):k for k in cache if k!='_meta'}

def comps_scraper(muni, colonia, tipo, need_t=True):
    mk=muni_keys.get(norm(muni))
    if not mk: return []
    cn=norm(colonia)
    res=[]
    for c,t,cc,p in listings(mk,tipo):
        if p<=0: continue
        if need_t and t<=0: continue
        # match colonia: exacta o substring (>=5 chars)
        ok = (cn and len(cn)>=5 and (cn in c or c in cn))
        if ok: res.append((c,t,cc,p))
    return res

cer=json.load(open('cerebro_datos.json',encoding='utf-8'))
rows=[]; sin_comps=0
for x in cer:
    f=x.get('folio','')
    if not reciente(f): continue
    mC=num(x.get('m2Construccion')); mT=num(x.get('m2Terreno'))
    if mC<=0 or mT<=0 or mC/mT>=0.5: continue
    per=num(x.get('valorMercado'))
    if per<=0: continue
    muni=x.get('municipio',''); col=x.get('sujetoColonia','')
    casa=comps_scraper(muni,col,'casa',need_t=True)
    terr=comps_scraper(muni,col,'terreno',need_t=True)
    # pm2T: terreno de colonia; si no, terreno del municipio entero (p30)
    if not terr:
        mk=muni_keys.get(norm(muni))
        allt=[p/t for c,t,cc,p in listings(mk,'terreno') if t>0 and p>0] if mk else []
        pm2T=pctl(allt)
    else:
        pm2T=pctl([p/t for c,t,cc,p in terr])
    if len(casa)<3 or not pm2T:
        sin_comps+=1; continue
    cus_s=mC/mT; pus=[]
    for c,t,cc,p in casa:
        cus_c=cc/t
        pus.append((p/cc + K_LAND*pm2T*(1/cus_s-1/cus_c))*(cus_s/cus_c)**(1/6)*(mT/t)**(1/6))
    v=sum(pus)/len(pus)*mC*cal(x.get('estadoConservacion'))
    rows.append(dict(f=f,cus=mC/mT,per=per/1000,met=v/1000,e=(v/per-1)*100,n=len(casa),pm=pm2T))

print(f"Casas de lote grande recientes con comps del SCRAPER (>=3 casa c/m2T): {len(rows)}")
print(f"(sin comps suficientes del scraper: {sin_comps})\n")
print(f"{'FOLIO':<16}{'CUS':>5}{'nComps':>7}{'pm2T':>8}{'PERITO':>8}{'errMET':>9}")
for r in sorted(rows,key=lambda r:r['cus']):
    print(f"{r['f']:<16}{r['cus']:>5.2f}{r['n']:>7}{r['pm']:>8,.0f}{r['per']:>8,.0f}{r['e']:>+9.1f}")
if rows:
    ae=[abs(r['e']) for r in rows]
    print(f"\nMÉTODO (comps scraper) error abs prom: {st.mean(ae):.1f}%  mediana {st.median(ae):.1f}%  | ±10%: {sum(1 for a in ae if a<=10)}/{len(ae)}  ±15%: {sum(1 for a in ae if a<=15)}/{len(ae)}")
