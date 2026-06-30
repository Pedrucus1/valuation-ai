require('dotenv').config({ path: '../.env' });
const fs=require('fs');
const { valuarPropiedadCompleto } = require('./motor_remi_api');
const cer=JSON.parse(fs.readFileSync('cerebro_datos.json','utf8'));
const folios=['OPI-26-4-05-OF','OPI-26-3-12-OF','OPI-26-1-16-OF','OPI-26-3-10-OF'];
(async()=>{
 for(const fo of folios){
  const x=cer.find(o=>o.folio===fo); if(!x){console.log(fo,'no en cerebro');continue;}
  const num=v=>{const n=parseFloat(String(v).replace(/[^0-9.]/g,''));return isNaN(n)?0:n;};
  const prop={tipo:x.tipo||'CASA HABITACION',colonia:x.sujetoColonia,municipio:x.municipio,
    construccion:num(x.m2Construccion),terreno:num(x.m2Terreno),edad:num(x.edad),
    estadoConservacion:x.estadoConservacion||'regular_medio',esEjidal:false};
  try{
   const r=await valuarPropiedadCompleto(prop);
   console.log(`${fo} | ${x.sujetoColonia} | pool:${r.poolTipo} n:${r.nComps} valor:${Math.round((r.valor||0)/1000)}k perito:${Math.round(num(x.valorMercado)/1000)}k ${r.geminiComps?'[WEB:'+r.geminiComps.length+']':''}`);
  }catch(e){console.log(fo,'ERR',e.message);}
 }
})();
