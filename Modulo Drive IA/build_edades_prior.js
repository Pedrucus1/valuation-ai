// edades_prior.json: mediana de EDAD REAL (perito, cerebro_datos) por municipio×tipo y
// por tipo (global). Fuente correcta (edades observadas, no declaradas por anuncios que
// sesgan a nuevo). Prior para anclaEdad cuando la colonia no tiene edadMedianaZona.
const fs = require('fs');
const c = JSON.parse(fs.readFileSync('cerebro_datos.json','utf8'));
const P = s => parseFloat((s||'').toString().replace(/[^\d.]/g,'')) || 0;
const norm = s => (s||'').toLowerCase();
const normMuni = s => norm(s).replace(/san pedro tlaquepaque/,'tlaquepaque').replace(/tlajomulco de z.?niga/,'tlajomulco').replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
function tipoOf(o){const t=norm(o.tipo);if(/depart|condom/.test(t))return 'depto';if(/oficina/.test(t))return 'oficina';if(/local|comercial/.test(t))return 'local';if(/terreno/.test(t))return 'terreno';return 'casa';}
const med = a => { const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2); };
const byTipo={}, byMuniTipo={};
for(const o of c){const e=P(o.edad);if(e<=0||e>120)continue;const t=tipoOf(o);
  (byTipo[t]=byTipo[t]||[]).push(e);
  (byMuniTipo[`${normMuni(o.municipio)}|${t}`]=byMuniTipo[`${normMuni(o.municipio)}|${t}`]||[]).push(e);
}
const out={_meta:{generado:new Date().toISOString(),fuente:'cerebro_datos.json (edad perito)'},tipo:{},muniTipo:{}};
for(const t in byTipo) out.tipo[t]={edad:med(byTipo[t]),n:byTipo[t].length};
for(const k in byMuniTipo) if(byMuniTipo[k].length>=5) out.muniTipo[k]={edad:med(byMuniTipo[k]),n:byMuniTipo[k].length};
fs.writeFileSync('edades_prior.json',JSON.stringify(out));
console.log('tipo:',JSON.stringify(out.tipo));
console.log('muniTipo(n>=5):',Object.keys(out.muniTipo).length);
console.log(Object.entries(out.muniTipo).map(([k,v])=>`${k}:${v.edad}a`).join('  '));
