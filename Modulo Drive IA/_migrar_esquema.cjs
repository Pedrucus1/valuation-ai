const fs = require('fs');
const MAP = { p:'precio', c:'m2c', t:'m2t', tp:'tipo', co:'colonia', mu:'muni',
              re:'recamaras', ba:'banos', es:'estac', fs:'fecha', an:'anio', w:'web' };
function ren(o){ const n={}; for(const k in o){ n[MAP[k]!==undefined?MAP[k]:k]=o[k]; } return n; }

// cache_consolidado.json: { datos:[...] }
const consP='cache_consolidado.json';
const cons=JSON.parse(fs.readFileSync(consP,'utf8'));
cons.datos=cons.datos.map(ren);
fs.writeFileSync(consP, JSON.stringify(cons));
console.log('consolidado: '+cons.datos.length+' listings renombrados. Ej:', JSON.stringify(cons.datos[0]));

// cache_index.json: { _meta, [muni]:{ [tipo]:{ [col]:{ listings:[...], ... } } } }
const idxP='cache_index.json';
const idx=JSON.parse(fs.readFileSync(idxP,'utf8'));
let nL=0;
for(const muni of Object.keys(idx)){ if(muni==='_meta')continue;
  for(const tipo of Object.keys(idx[muni])){
    for(const col of Object.keys(idx[muni][tipo])){
      const cell=idx[muni][tipo][col];
      if(cell && Array.isArray(cell.listings)){ cell.listings=cell.listings.map(ren); nL+=cell.listings.length; }
    }
  }
}
fs.writeFileSync(idxP, JSON.stringify(idx));
console.log('index: '+nL+' listings renombrados.');
