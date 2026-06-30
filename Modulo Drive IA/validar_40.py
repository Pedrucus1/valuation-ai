#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Validacion 40 OPIs estratificados por banda de error del motor:
   MOTOR actual vs METODOLOGIA perito calibrada (homologacion CUS + sup + calibracion conservacion).
   pm2T proxy = percentil de comps de terreno del propio OPI (configurable)."""
import json, re, sys, statistics as st
sys.stdout.reconfigure(encoding='utf-8')
PM2T_PCTL = float(sys.argv[1]) if len(sys.argv)>1 else 0.30  # 0=min,0.5=mediana

def num(v):
    if v is None: return 0.0
    if isinstance(v,(int,float)): return float(v)
    s=re.sub(r'[^0-9.\-]','',str(v))
    try: return float(s) if s and s not in('-','.') else 0.0
    except: return 0.0

CAL={'BUENO':0.95,'REGULAR':0.89,'REMODELADO':0.90,'REMODELADA':0.90}
def cal_factor(c):
    s=(c or '').upper()
    for k,v in CAL.items():
        if k in s: return v
    return 0.92

def pctl(vals,p):
    if not vals: return 0
    vals=sorted(vals);
    if p<=0: return vals[0]
    i=min(len(vals)-1,int(p*len(vals)))
    return vals[i]

def dedup(comps):
    seen=set(); out=[]
    for c in comps:
        k=(num(c.get('terreno')),num(c.get('construccion')),num(c.get('precio')))
        if k[2]>0 and k not in seen: seen.add(k); out.append(c)
    return out

def metodo(opi):
    m2C=num(opi.get('m2Construccion')); m2T=num(opi.get('m2Terreno'))
    if m2C<=0 or m2T<=0: return None
    cus_s=m2C/m2T
    todos=dedup(opi.get('comparables',[]))
    casa=[c for c in todos if num(c.get('construccion'))>0 and num(c.get('terreno'))>0]
    terr=[c for c in todos if num(c.get('construccion'))==0 and num(c.get('terreno'))>0]
    if len(casa)<3: return None
    # pm2T: percentil de comps de terreno; si no hay, percentil del precio/terreno de comps casa *0.6 (proxy crudo)
    if terr:
        pm2T=pctl([num(c['precio'])/num(c['terreno']) for c in terr], PM2T_PCTL)
    else:
        return None
    pus=[]
    for c in casa:
        cc=num(c['construccion']); ct=num(c['terreno']); cp=num(c['precio'])
        cus_c=cc/ct; pu=cp/cc + pm2T*(1/cus_s-1/cus_c)
        pus.append(pu*(cus_s/cus_c)**(1/6)*(m2T/ct)**(1/6))
    val=sum(pus)/len(pus)*m2C*cal_factor(opi.get('estadoConservacion'))
    return val

# motor baseline
motor={}
for ln in open('motor_baseline.txt',encoding='utf-8',errors='replace'):
    m=re.search(r'(OPI-[\w-]+).*?perito:\s*([\d.]+)k\s+motor:\s*([\d.]+)k',ln)
    if not m: continue
    dm=re.search(r'([+-][\d.]+)%',ln)
    if not dm: continue
    pm=re.search(r'pool:(\w+)',ln); npm=re.search(r'n:\s*(\d+)',ln)
    pool=pm.group(1) if pm else '?'; ncomp=int(npm.group(1)) if npm else 0
    if num(m.group(3))>0: motor[m.group(1)]=(float(m.group(2)),float(m.group(3)),float(dm.group(1)),pool,ncomp)

cer={x.get('folio'):x for x in json.load(open('cerebro_datos.json',encoding='utf-8'))}
rows=[]
for f,(per_k,mot_k,diff,pool,ncomp) in motor.items():
    opi=cer.get(f)
    if not opi: continue
    v=metodo(opi)
    if v is None: continue
    per=num(opi.get('valorMercado'))
    if per<=0: continue
    cus=num(opi.get('m2Construccion'))/num(opi.get('m2Terreno'))
    rows.append(dict(f=f,cus=cus,per=per/1000,mot=mot_k,met=v/1000,em=diff,emet=(v/per-1)*100,pool=pool,nc=ncomp))

def banda(e):
    a=abs(e); return 0 if a<10 else 1 if a<15 else 2 if a<20 else 3
buckets={0:[],1:[],2:[],3:[]}
for r in sorted(rows,key=lambda r:abs(r['em'])): buckets[banda(r['em'])].append(r)
NB=['<10%','10-15%','15-20%','>20%']
print(f'\npm2T pctl={PM2T_PCTL} | candidatos {len(rows)} | seleccion 10/banda\n')
print(f"{'BANDA':<8}{'FOLIO':<16}{'CUS':>5}{'PERITO':>8}{'  errMOT':>9}{'  errMET':>9}{'  gana':>7}")
print('-'*62)
agg={}
sel=[]
for b in range(4):
    g=buckets[b]
    if b==3: g=sorted(g,key=lambda r:-abs(r['em']))
    sel+=[(NB[b],r) for r in g[:10]]
for nb,r in sel:
    gana='MET' if abs(r['emet'])<abs(r['em']) else 'mot'
    print(f"{nb:<8}{r['f']:<16}{r['cus']:>5.2f}{r['per']:>8,.0f}{r['em']:>+9.1f}{r['emet']:>+9.1f}{gana:>7}")
    agg.setdefault(nb,([],[])); agg[nb][0].append(abs(r['em'])); agg[nb][1].append(abs(r['emet']))
print(f"\n{'BANDA':<10}{'n':>4}{'MOTOR':>9}{'METODOLOGIA':>13}")
am=[];ae=[]
for nb in NB:
    if nb not in agg: continue
    m,e=agg[nb]; am+=m; ae+=e
    print(f"{nb:<10}{len(m):>4}{st.mean(m):>8.1f}%{st.mean(e):>12.1f}%")
if am: print(f"{'TOTAL':<10}{len(am):>4}{st.mean(am):>8.1f}%{st.mean(ae):>12.1f}%")
print(f"\nMETODOLOGIA gana en {sum(1 for nb,r in sel if abs(r['emet'])<abs(r['em']))}/{len(sel)} casos")

# ── GATES: hibrido sobre TODOS los candidatos ──────────────────────────────
print(f'\n=== HIBRIDOS GATEADOS (todos los {len(rows)} candidatos) ===')
gates={
 'motor solo':            lambda r: False,
 'metodologia sola':      lambda r: True,
 'pool debil(gen/atip)':  lambda r: r['pool'] in ('general','atipica'),
 'nc<4':                  lambda r: r['nc']<4,
 'pool debil O nc<4':     lambda r: r['pool'] in ('general','atipica') or r['nc']<4,
 'CUS<0.5':               lambda r: r['cus']<0.5,
 'pool debil O nc<5 O CUS<0.5': lambda r: r['pool'] in ('general','atipica') or r['nc']<5 or r['cus']<0.5,
}
def err_hib(gate):
    errs=[]; dmg=0; fix=0
    for r in rows:
        usa=gate(r)
        e=abs(r['emet']) if usa else abs(r['em'])
        errs.append(e)
        if usa and abs(r['em'])<10 and abs(r['emet'])>=10: dmg+=1   # daña un bueno
        if usa and abs(r['em'])>20 and abs(r['emet'])<abs(r['em']): fix+=1  # arregla un malo
    return st.mean(errs), st.median(errs), sum(1 for e in errs if e<=10), dmg, fix
print(f"{'gate':<32}{'errProm':>8}{'mediana':>8}{'<=10%':>7}{'daña':>6}{'arregla':>8}")
for name,g in gates.items():
    ep,md,within,dmg,fix=err_hib(g)
    print(f"{name:<32}{ep:>7.1f}%{md:>7.1f}%{within:>6}/{len(rows)}{dmg:>6}{fix:>8}")

# subconjunto CUS<0.5 (donde aplica el gate ganador)
sub=[r for r in rows if r['cus']<0.5]
print(f"\n=== Subconjunto CUS<0.5 (n={len(sub)}) — donde se aplica la metodologia ===")
print(f"{'FOLIO':<16}{'CUS':>5}{'errMOT':>8}{'errMET':>8}")
for r in sorted(sub,key=lambda r:r['cus']):
    print(f"{r['f']:<16}{r['cus']:>5.2f}{r['em']:>+8.1f}{r['emet']:>+8.1f}")
print(f"MOTOR  abs prom {st.mean([abs(r['em']) for r in sub]):.1f}%  | METODOLOGIA abs prom {st.mean([abs(r['emet']) for r in sub]):.1f}%")
