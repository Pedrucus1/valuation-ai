#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Analiza TODAS las casas de lote grande (CUS<0.5) recientes (2025-2026):
   Metodo Perito calibrado vs Motor (donde haya), y diagnostica como mejorar."""
import json, re, sys, statistics as st
sys.stdout.reconfigure(encoding='utf-8')

def num(v):
    if v is None: return 0.0
    if isinstance(v,(int,float)): return float(v)
    s=re.sub(r'[^0-9.\-]','',str(v))
    try: return float(s) if s and s not in('-','.') else 0.0
    except: return 0.0
def reciente(f):
    m=re.match(r'OPI-(\d+)-',f or '');
    return bool(m) and 2000+int(m.group(1))>=2025
CAL={'BUENO':0.95,'REGULAR':0.89,'REMODELADO':0.90,'REMODELADA':0.90}
def cal(c):
    s=(c or '').upper()
    for k,v in CAL.items():
        if k in s: return v
    return 0.92
def pctl(vals,p=0.3):
    vals=sorted(vals)
    return vals[min(len(vals)-1,int(p*len(vals)))] if vals else 0
def dedup(cs):
    seen=set(); o=[]
    for c in cs:
        k=(num(c.get('terreno')),num(c.get('construccion')),num(c.get('precio')))
        if k[2]>0 and k not in seen: seen.add(k); o.append(c)
    return o

cer=json.load(open('cerebro_datos.json',encoding='utf-8'))
# pm2T por municipio (p30 de TODOS los comps de terreno de la base) como respaldo
muni_terr={}
for x in cer:
    mu=(x.get('municipio') or '').strip().lower()
    for c in x.get('comparables',[]):
        if num(c.get('construccion'))==0 and num(c.get('terreno'))>0 and num(c.get('precio'))>0:
            muni_terr.setdefault(mu,[]).append(num(c['precio'])/num(c['terreno']))
muni_pm2t={k:pctl(v,0.3) for k,v in muni_terr.items() if len(v)>=3}

# motor baseline
motor={}
for ln in open('motor_baseline_full.txt',encoding='utf-8',errors='replace'):
    m=re.search(r'(OPI-[\w-]+).*?perito:\s*([\d.]+)k\s+motor:\s*([\d.]+)k',ln)
    dm=re.search(r'([+-][\d.]+)%',ln)
    if m and dm and num(m.group(3))>0: motor[m.group(1)]=(float(m.group(3)),float(dm.group(1)))

def metodo(opi):
    m2C=num(opi.get('m2Construccion')); m2T=num(opi.get('m2Terreno'))
    if m2C<=0 or m2T<=0: return None,None
    cus_s=m2C/m2T
    todos=dedup(opi.get('comparables',[]))
    casa=[c for c in todos if num(c.get('construccion'))>0 and num(c.get('terreno'))>0]
    terr=[c for c in todos if num(c.get('construccion'))==0 and num(c.get('terreno'))>0]
    if len(casa)<3: return None,None
    if terr:
        pm2T=pctl([num(c['precio'])/num(c['terreno']) for c in terr]); src='comp'
    else:
        mu=(opi.get('municipio') or '').strip().lower()
        pm2T=muni_pm2t.get(mu,0); src='muni'
        if not pm2T: return None,None
    pus=[]
    for c in casa:
        cc=num(c['construccion']); ct=num(c['terreno']); cp=num(c['precio'])
        cus_c=cc/ct; pu=cp/cc+pm2T*(1/cus_s-1/cus_c)
        pus.append(pu*(cus_s/cus_c)**(1/6)*(m2T/ct)**(1/6))
    return sum(pus)/len(pus)*m2C*cal(opi.get('estadoConservacion')), src

rows=[]
for x in cer:
    f=x.get('folio','')
    if not reciente(f): continue
    m2C=num(x.get('m2Construccion')); m2T=num(x.get('m2Terreno'))
    if m2C<=0 or m2T<=0 or m2C/m2T>=0.5: continue
    per=num(x.get('valorMercado'))
    if per<=0: continue
    v,src=metodo(x)
    if v is None: continue
    mot=motor.get(f)
    rows.append(dict(f=f,cus=m2C/m2T,m2T=m2T,m2C=m2C,per=per/1000,met=v/1000,
                     emet=(v/per-1)*100, emot=mot[1] if mot else None, src=src,
                     cons=(x.get('estadoConservacion') or '')[:9]))

print(f"Casas de lote grande (CUS<0.5) 2025-26 analizadas: {len(rows)}")
print(f"{'FOLIO':<16}{'CUS':>5}{'m2T':>5}{'m2C':>5}{'pmT':>4}{'PERITO':>8}{'errMOT':>8}{'errMET':>8}{'cons':>10}")
for r in sorted(rows,key=lambda r:r['cus']):
    em='   —  ' if r['emot'] is None else f"{r['emot']:>+7.1f}"
    print(f"{r['f']:<16}{r['cus']:>5.2f}{r['m2T']:>5.0f}{r['m2C']:>5.0f}{r['src']:>4}{r['per']:>8,.0f}{em:>8}{r['emet']:>+8.1f}{r['cons']:>10}")

ae=[abs(r['emet']) for r in rows]
conmot=[r for r in rows if r['emot'] is not None]
print(f"\nMÉTODO error abs prom: {st.mean(ae):.1f}%  mediana {st.median(ae):.1f}%  | dentro ±10%: {sum(1 for a in ae if a<=10)}/{len(ae)}  ±15%: {sum(1 for a in ae if a<=15)}/{len(ae)}")
if conmot:
    print(f"En las {len(conmot)} con motor: MOTOR {st.mean([abs(r['emot']) for r in conmot]):.1f}%  vs  MÉTODO {st.mean([abs(r['emet']) for r in conmot]):.1f}%")
# diagnostico: peores casos
print("\nPeores del MÉTODO (para mejorar):")
for r in sorted(rows,key=lambda r:-abs(r['emet']))[:6]:
    print(f"  {r['f']} CUS{r['cus']:.2f} err{r['emet']:+.0f}% pm2T-src={r['src']} cons={r['cons']}")
