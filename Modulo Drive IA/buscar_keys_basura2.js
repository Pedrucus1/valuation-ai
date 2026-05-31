const fs = require('fs');
const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

// Búsquedas con fragmentos más cortos
const buscar = [
  { key: 'muralista 253 int 147', frags: ['muralista', '253'] },
  { key: 'loma arandas 199',      frags: ['loma arandas', 'arandas 199', 'arandas'] },
  { key: 'valle de puebla 134',   frags: ['valle de puebla', 'puebla 134'] },
  { key: 'belisario dominguez 3815', frags: ['belisario dominguez', 'belisario'] },
  { key: 'guacamayo 1054',        frags: ['guacamayo'] },
  { key: 'av belisario dominguez sn', frags: ['belisario dominguez'] },
  { key: 'privada los olivos',    frags: ['privada los olivos', 'priv. los olivos', 'priv los olivos'] },
];

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

buscar.forEach(({ key, frags }) => {
  console.log('═'.repeat(80));
  console.log('KEY BASURA: "' + key + '"');
  console.log('═'.repeat(80));
  const seen = new Set();
  let totalHits = 0;
  frags.forEach(frag => {
    const re = new RegExp(esc(frag), 'i');
    const matches = cerebro.filter(d =>
      re.test(d.fileName || '') || re.test(d.direccion || '') || re.test(d.sujetoDireccion || '')
    );
    matches.forEach(d => {
      if (seen.has(d.folio)) return;
      seen.add(d.folio);
      totalHits++;
      const fn = (d.fileName || '').slice(0, 110);
      const dir = (d.direccion || d.sujetoDireccion || '').slice(0, 100);
      console.log('  [' + d.folio + '] suj:"' + d.sujetoColonia + '" muni:' + d.municipio);
      console.log('     fn:  ' + fn);
      if (dir && dir !== fn.replace(/^OPI-[\d-]+-\w+\s*/, '')) console.log('     dir: ' + dir);
    });
  });
  if (totalHits === 0) console.log('  (sin matches en cerebro)');
  console.log();
});
