#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
validar_cus_homolog.py — Validacion de 3 metodologias sobre 20 OPIs estratificados.

Compara, contra el valor del perito (benchmark):
  1. Motor actual      — valor del motor en produccion (parseado de validar_40_opis.js)
  2. Propuesta (CUS)   — homologacion CUS del perito aplicada a los comps de casa del OPI
  3. Perito            — valorMercado (referencia, error 0)

Metodologia 2 (homologacion del perito, replicada fielmente):
  PASO 1 (igualar superficie/CUS): a cada comp se le agrega el terreno que necesitaria
          para tener el CUS del sujeto, valuado a pm2T:
              pu_homol = precio/m2C_comp + pm2T*(1/cus_subj - 1/cus_comp)
  PASO 2 (calificacion geometrica, lo automatizable):
              x (cus_subj/cus_comp)^(1/6)   # factor CUS amortiguado (evita +21% sobrevaluo)
              x (m2T_subj/m2T_comp)^(1/6)   # factor superficie sobre terreno
  Cierre: promedio de pu calificado x m2C_subj x factorConserv_subj
  pm2T: mediana de los comps de TERRENO (C=0) del propio OPI (como hace el perito).

NOTA: el PASO 2 del perito tambien lleva factores manuales (zona/ubicacion/acabados ~0.95
c/u) que no son automatizables por OPI. Se omiten; en su lugar se aplica el factor de
conservacion del SUJETO (tabla del motor) como proxy del "sujeto peor/mejor que comps".
"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

def num(v):
    if v is None: return 0.0
    if isinstance(v,(int,float)): return float(v)
    s=re.sub(r'[^0-9.\-]','',str(v))
    try: return float(s) if s and s not in('-','.') else 0.0
    except: return 0.0

# factor de conservacion del sujeto (misma tabla que el motor)
FACT_CONSERV = {'bueno':1.0,'regular_bueno':0.97,'regular_medio':0.93,
                'regular':0.93,'regular_bajo':0.88,'malo':0.82}

def dedup(comps):
    seen=set(); out=[]
    for c in comps:
        k=(num(c.get('terreno')),num(c.get('construccion')),num(c.get('precio')))
        if k[0]>0 and k[2]>0 and k not in seen:
            seen.add(k); out.append(c)
    return out

def metodo_cus(opi):
    m2C=num(opi.get('m2Construccion')); m2T=num(opi.get('m2Terreno'))
    if m2C<=0 or m2T<=0: return None,'sin m2 sujeto'
    cus_s=m2C/m2T
    todos=dedup(opi.get('comparables',[]))
    casa=[c for c in todos if num(c.get('construccion'))>0]
    terr=[c for c in todos if num(c.get('construccion'))==0]
    if len(casa)<3: return None,'<3 comps casa'
    # pm2T del propio OPI: comps de terreno; si no hay, no se puede homologar fielmente
    if terr:
        pm2t_list=sorted(num(c['precio'])/num(c['terreno']) for c in terr)
        pm2T=pm2t_list[len(pm2t_list)//2]
        fuente_pm2t='terreno-comps'
    else:
        return None,'sin comps terreno (no pm2T)'
    pus_b=[]; pus_a=[]
    for c in casa:
        cc=num(c['construccion']); ct=num(c['terreno']); cp=num(c['precio'])
        cus_c=cc/ct
        pu_raw=cp/cc
        # 2a: comparacion m2C simple (solo factor superficie de construccion), SIN homologacion CUS
        pus_a.append(pu_raw*(cc/m2C)**(1/6))
        # 2b: homologacion CUS del perito
        pu_homol=pu_raw + pm2T*(1/cus_s - 1/cus_c)          # paso 1
        fCUS=(cus_s/cus_c)**(1/6)                            # paso 2 CUS amortiguado
        fSup=(m2T/ct)**(1/6)                                 # paso 2 superficie (terreno)
        pus_b.append(pu_homol*fCUS*fSup)
    fConserv=FACT_CONSERV.get((opi.get('estadoConservacion') or '').lower(),0.93)
    v2a=sum(pus_a)/len(pus_a)*m2C*fConserv
    v2b=sum(pus_b)/len(pus_b)*m2C*fConserv
    return (v2a,v2b), f'{len(casa)}casa/{len(terr)}terr pm2T={pm2T:,.0f}'

# ── cargar baseline del motor ──────────────────────────────────────────────
motor={}  # folio -> (perito_k, motor_k, diff%)
for ln in open('motor_baseline.txt',encoding='utf-8',errors='replace'):
    m=re.search(r'(OPI-[\w-]+).*?perito:\s*([\d.]+)k\s+motor:\s*([\d.]+)k\s+diff:\s*([+\-N/A\d.%]+)',ln)
    if not m: continue
    f=m.group(1); per=float(m.group(2)); mot=float(m.group(3))
    dm=re.search(r'([+-][\d.]+)%',ln)
    diff=float(dm.group(1)) if dm else None
    if mot>0 and diff is not None: motor[f]=(per,mot,diff)

cer={x.get('folio'):x for x in json.load(open('cerebro_datos.json',encoding='utf-8'))}

# ── armar candidatos con las 3 metodologias ────────────────────────────────
rows=[]
for f,(per_k,mot_k,diff) in motor.items():
    opi=cer.get(f)
    if not opi: continue
    res,nota=metodo_cus(opi)
    if res is None: continue
    v2a,v2b=res
    per=num(opi.get('valorMercado'))
    if per<=0: continue
    err_mot=diff
    err_2a=(v2a/per-1)*100
    err_2b=(v2b/per-1)*100
    m2C=num(opi.get('m2Construccion')); m2T=num(opi.get('m2Terreno'))
    cus=m2C/m2T if m2T>0 else 0
    rows.append(dict(folio=f,muni=opi.get('municipio',''),cus=cus,m2T=m2T,m2C=m2C,
                     per=per/1000,mot=mot_k,v2a=v2a/1000,v2b=v2b/1000,
                     err_mot=err_mot,err_2a=err_2a,err_cus=err_2b,nota=nota))

# ── estratificar por |error motor|: 5 por banda ────────────────────────────
def banda(e):
    a=abs(e)
    return 0 if a<10 else 1 if a<15 else 2 if a<20 else 3
buckets={0:[],1:[],2:[],3:[]}
for r in sorted(rows,key=lambda r:abs(r['err_mot'])):
    buckets[banda(r['err_mot'])].append(r)
NOMB=['<10%','10-15%','15-20%','>20%']
sel=[]
for b in range(4):
    grupo=buckets[b]
    if b==3: grupo=sorted(grupo,key=lambda r:-abs(r['err_mot']))  # los peores primero
    sel.append((NOMB[b],grupo[:5]))

print(f'\nCandidatos: {len(rows)}   errores vs perito. errM=motor | err2a=comps perito s/CUS | err2b=comps perito +CUS\n')
print(f"{'BANDA':<8}{'FOLIO':<16}{'CUS':>5}{'m2T':>5}{'m2C':>5}{'PERITO':>8}"
      f"{'  errM':>8}{'  err2a':>8}{'  err2b':>8}")
print('-'*74)
ag={}  # banda -> (errMot, err2a, err2b) abs lists
for nb,grupo in sel:
    for r in grupo:
        print(f"{nb:<8}{r['folio']:<16}{r['cus']:>5.2f}{r['m2T']:>5.0f}{r['m2C']:>5.0f}{r['per']:>8,.0f}"
              f"{r['err_mot']:>+8.1f}{r['err_2a']:>+8.1f}{r['err_cus']:>+8.1f}")
        ag.setdefault(nb,([],[],[]))
        ag[nb][0].append(abs(r['err_mot'])); ag[nb][1].append(abs(r['err_2a'])); ag[nb][2].append(abs(r['err_cus']))
    print()

def line(lbl,n,a,b,c): print(f"{lbl:<12}{n:>4}{a:>9.1f}%{b:>11.1f}%{c:>11.1f}%")
print('── Error abs promedio por banda de error del MOTOR (20 estratificados) ──')
print(f"{'BANDA':<12}{'n':>4}{'MOTOR':>10}{'2a comps':>12}{'2b +CUS':>11}")
am=[];a2a=[];a2b=[]
for nb,_ in sel:
    if nb not in ag: continue
    ms,s2a,s2b=ag[nb]; am+=ms;a2a+=s2a;a2b+=s2b
    line(nb,len(ms),sum(ms)/len(ms),sum(s2a)/len(s2a),sum(s2b)/len(s2b))
if am: line('TOTAL',len(am),sum(am)/len(am),sum(a2a)/len(a2a),sum(a2b)/len(a2b))

# ── segmentacion por CUS sobre TODOS los candidatos ────────────────────────
print(f'\n── Error abs promedio por banda de CUS (los {len(rows)} candidatos) ──')
print(f"{'CUS':<12}{'n':>4}{'MOTOR':>10}{'2a comps':>12}{'2b +CUS':>11}")
def cusband(c):
    return '<0.40' if c<0.40 else '0.40-0.60' if c<0.60 else '0.60-0.85' if c<0.85 else '>=0.85'
seg={}
for r in rows:
    k=cusband(r['cus'])
    seg.setdefault(k,([],[],[]))
    seg[k][0].append(abs(r['err_mot']))
    seg[k][1].append(abs(r['err_2a']))
    seg[k][2].append(abs(r['err_cus']))
for k in ['<0.40','0.40-0.60','0.60-0.85','>=0.85']:
    if k not in seg: continue
    ms,s2a,s2b=seg[k]
    line(k,len(ms),sum(ms)/len(ms),sum(s2a)/len(s2a),sum(s2b)/len(s2b))
