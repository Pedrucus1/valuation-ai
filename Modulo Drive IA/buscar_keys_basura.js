const fs = require('fs');
const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

const buscar = [
  'muralista 253', 'nanzal 10', 'loma arandas', '12 de diciembre',
  'valle de puebla', 'belisario dominguez 3815', 'guacamayo 1054',
  'coto 2 jardin real', 'belisario dominguez sn', 'local 6 zona c',
  'coto 18', 'privada los olivos', '12122', 'muralista', 'nanzal',
];

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

buscar.forEach(frag => {
  const re = new RegExp(esc(frag), 'i');
  const matches = cerebro.filter(d =>
    re.test(d.fileName || '') || re.test(d.direccion || '') || re.test(d.sujetoDireccion || '')
  );
  console.log('▸ "' + frag + '" → ' + matches.length + ' OPI(s):');
  matches.forEach(d => {
    const fn = (d.fileName || '').slice(0, 110);
    console.log('   [' + d.folio + '] suj:"' + d.sujetoColonia + '" muni:' + d.municipio);
    console.log('     ' + fn);
  });
  console.log();
});
