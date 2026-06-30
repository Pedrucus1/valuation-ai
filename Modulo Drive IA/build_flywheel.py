#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""FLYWHEEL: agrega los comparables curados del perito al pool (comps_verificados.json),
asignados a la colonia del SUJETO de cada avaluo (que esta limpia, 99%).
Los comps del perito son de venta vetada -> mejores que el asking del scraper.
Tambien corrige anomalias de colonia conocidas (ej. OPI-26-5-16 'lote 12' -> 'Nueva Santa Maria')."""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

def num(v):
    try: return float(re.sub(r'[^0-9.\-]','',str(v))) if v not in(None,'') else 0.0
    except: return 0.0
def basura(c):
    c=str(c or '').lower().strip()
    if len(c)<4: return True
    if re.match(r'^(lote|mz|manzana|l |m |s/n|calle)',c): return True
    if re.search(r'\b(cochera|recamar|rec.mara|ba.o|cocina|sala|comedor|planta|patio|nivel|terraza|estudio|habitacion)\b',c): return True
    if re.search(r'\d{3,}',c): return True
    return False

# correcciones manuales de colonia del sujeto (de las hojas del perito, campo AG74)
FIX_COLONIA = {
    'OPI-26-5-16-OF': ('Nueva Santa Maria', 'Tlaquepaque'),
}

cer=json.load(open('cerebro_datos.json',encoding='utf-8'))

# 1) aplicar correcciones a cerebro y guardarlo
ncorr=0
for x in cer:
    f=x.get('folio','')
    if f in FIX_COLONIA:
        col,mun=FIX_COLONIA[f]
        x['sujetoColonia']=col; x['municipio']=mun; ncorr+=1
json.dump(cer, open('cerebro_datos.json','w',encoding='utf-8'), ensure_ascii=False)
print(f"cerebro_datos.json: {ncorr} colonias de sujeto corregidas")

# 2) construir flywheel: comps de casa del perito -> colonia del sujeto
existentes=json.load(open('comps_verificados.json',encoding='utf-8'))
web=[c for c in existentes if c.get('fuente')!='perito_flywheel']  # conservar comps web previos
nuevos=[]; seen=set(); skip_suj=0
for x in cer:
    col=x.get('sujetoColonia',''); muni=x.get('municipio','')
    if basura(col) or not str(muni).strip(): skip_suj+=1; continue
    for c in x.get('comparables',[]):
        cc=num(c.get('construccion')); ct=num(c.get('terreno')); cp=num(c.get('precio'))
        if cc<=0 or cp<=0: continue   # solo casas (con construccion)
        key=(col.lower(),muni.lower(),round(cp/1000), round(cc), round(ct))  # dedup POR colonia
        if key in seen: continue
        seen.add(key)
        nuevos.append({'precio':cp,'m2c':cc,'m2t':ct,'colonia':col,'muni':muni,
                       'tipo':'casa','fecha':x.get('fecha'),'fuente':'perito_flywheel','folio':x.get('folio')})
salida=web+nuevos
json.dump(salida, open('comps_verificados.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"comps_verificados.json: {len(web)} web + {len(nuevos)} comps perito (flywheel) = {len(salida)} total")
print(f"  (avaluos saltados por colonia sujeto basura: {skip_suj})")
# muestra para OPI-26-5-16
ej=[c for c in nuevos if c.get('folio')=='OPI-26-5-16-OF']
print(f"  comps inyectados para Nueva Santa Maria (OPI-26-5-16): {len(ej)}")
for c in ej[:7]: print("    m2C=%.0f m2T=%.0f precio=%s -> %s/%s"%(c['m2c'],c['m2t'],format(int(c['precio']),','),c['colonia'],c['muni']))
