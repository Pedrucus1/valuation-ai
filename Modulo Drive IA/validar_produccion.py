#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""PRUEBA DE PRODUCCION REAL: Metodo Perito sobre casas de lote grande recientes,
usando SOLO datos que el motor consigue solo: comps del cache (colonia + similares del maestro)
+ pm2T LIMPIO (terreno filtrado a rango residencial). Sin usar comps del perito."""
import json, re, sys, unicodedata, statistics as st
sys.stdout.reconfigure(encoding='utf-8')
K_LAND=0.8; PM2T_MIN=2000; PM2T_MAX=20000

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

maestro=json.load(open('colonias_maestro.json',encoding='utf-8'))
cache=json.load(open('cache_index.json',encoding='utf-8'))
nse=json.load(open('colonias_nse.json',encoding='utf-8'))
mk={norm(k):k for k in cache if k!='_meta'}
TOPE_NSE=1.30  # el $/m2C total (constr+terreno) no debe pasar NSE_mediana x este factor

def col_match(muni,col,tipo):
    k=mk.get(nm(muni));
    if not k: return []
    cn=norm(col); out=[]
    if len(cn)<4: return []
    for c in (cache[k].get(tipo) or {}):
        if cn in norm(c) or norm(c) in cn:
            out+=cache[k][tipo][c].get('listings',[])
    return out
def zona_listings(muni,col,tipo):
    """colonia + similares del maestro"""
    res=col_match(muni,col,tipo)
    for s in (maestro.get(norm(col),{}).get('similares') or []):
        res+=col_match(s.get('municipio') or muni, s.get('colonia',''), tipo)
    return res
def muni_terreno(muni):
    k=mk.get(nm(muni));
    if not k: return []
    out=[]
    for c in (cache[k].get('terreno') or {}):
        out+=cache[k]['terreno'][c].get('listings',[])
    return out

def pm2T_limpio(muni,col):
    terr=zona_listings(muni,col,'terreno') or muni_terreno(muni)
    vals=[ (l.get('precio') or 0)/(l.get('m2t') or 1) for l in terr if (l.get('m2t') or 0)>0 and (l.get('precio') or 0)>0]
    vals=[v for v in vals if PM2T_MIN<=v<=PM2T_MAX]   # filtro residencial: quita premium/comercial
    return pctl(vals,0.3) if vals else 0

cer=json.load(open('cerebro_datos.json',encoding='utf-8'))
rows=[]; sincomp=0; sinpm=0
for x in cer:
    f=x.get('folio','')
    if not reciente(f): continue
    mC=num(x.get('m2Construccion')); mT=num(x.get('m2Terreno'))
    if mC<40 or mT<=0 or mC/mT>=0.5 or mC/mT<0.15: continue  # casa real de lote grande (no terreno)
    per=num(x.get('valorMercado'))
    if per<=0: continue
    muni=x.get('municipio',''); col=x.get('sujetoColonia','')
    casa=[(l.get('m2t') or 0,l.get('m2c') or 0,l.get('precio') or 0) for l in zona_listings(muni,col,'casa') if (l.get('m2t') or 0)>0 and (l.get('m2c') or 0)>0 and (l.get('precio') or 0)>0]
    if len(casa)<3: sincomp+=1; continue
    pm=pm2T_limpio(muni,col)
    if not pm: sinpm+=1; continue
    cus_s=mC/mT; pus=[]
    for t,c,p in casa[:15]:
        cus_c=c/t
        pus.append((p/c + K_LAND*pm*(1/cus_s-1/cus_c))*(cus_s/cus_c)**(1/6)*(mT/t)**(1/6))
    v=sum(pus)/len(pus)*mC*cal(x.get('estadoConservacion'))
    e_sincap=(v/per-1)*100
    # TOPE NSE del sujeto sobre el $/m2C TOTAL (incluye terreno) — extiende el cap del motor
    nse_e=nse.get(norm(col)); capado=False
    if nse_e and nse_e.get('medianaPm2',0)>0:
        techo=nse_e['medianaPm2']*TOPE_NSE*mC
        if v>techo: v=techo; capado=True
    rows.append(dict(f=f,cus=mC/mT,n=len(casa),pm=pm,per=per/1000,e=(v/per-1)*100,e0=e_sincap,cap=capado,nse=bool(nse_e)))

print(f"Casas lote grande recientes evaluadas con datos del SCRAPER: {len(rows)}")
print(f"(sin >=3 comps casa: {sincomp} | sin pm2T limpio: {sinpm})\n")
print(f"{'FOLIO':<16}{'CUS':>5}{'nC':>4}{'pm2T':>8}{'PERITO':>8}{'errMET':>9}")
for r in sorted(rows,key=lambda r:r['cus']):
    print(f"{r['f']:<16}{r['cus']:>5.2f}{r['n']:>4}{r['pm']:>8,.0f}{r['per']:>8,.0f}{r['e']:>+9.1f}")
if rows:
    ae0=[abs(r['e0']) for r in rows]; ae=[abs(r['e']) for r in rows]
    conNSE=[r for r in rows if r['nse']]
    print(f"\nSIN tope NSE:  error abs prom {st.mean(ae0):.1f}%  mediana {st.median(ae0):.1f}%")
    print(f"CON tope NSE:  error abs prom {st.mean(ae):.1f}%  mediana {st.median(ae):.1f}%  (capados: {sum(1 for r in rows if r['cap'])})")
    print(f"  ±10%: {sum(1 for a in ae if a<=10)}/{len(ae)}  ±15%: {sum(1 for a in ae if a<=15)}/{len(ae)}  ±20%: {sum(1 for a in ae if a<=20)}/{len(ae)}")
    if conNSE:
        a=[abs(r['e']) for r in conNSE]
        print(f"  Solo los {len(conNSE)} con NSE: prom {st.mean(a):.1f}% mediana {st.median(a):.1f}% | ±20%: {sum(1 for x in a if x<=20)}/{len(conNSE)}")
