/**
 * Aplica correcciones de las 32 OPIs mal etiquetadas como "Atotonilquillo".
 * Identifica cada OPI por su fileName completo.
 */
const fs = require('fs');

// BACKUP primero
fs.copyFileSync('cerebro_datos.json', 'cerebro_datos.backup.2026-05-30-atotonilquillo.json');
console.log('Backup: cerebro_datos.backup.2026-05-30-atotonilquillo.json\n');

const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

// Mapeo: substring del fileName → { sujetoColonia, municipio }
// Usa los primeros ~30 caracteres únicos del fileName como ID
const FIXES = [
  // 23 con parse claro
  { fnContains: 'OPI-26-3-06-OF Ignacio Ramires',           col: 'Santa Teresita',         muni: 'Guadalajara' },
  { fnContains: 'OPI-25-10-15-OF San Melchor 1345',         col: 'Santa María',            muni: 'Guadalajara' },
  { fnContains: 'OPI-25-8-14-LM Blvd. Bosques de San Isidro', col: 'Villas de Zapopan',    muni: 'Zapopan' },
  { fnContains: 'OPI-25-6-06-LM Fresnos 219',               col: 'Prados de Santa María',  muni: 'San Pedro Tlaquepaque' },
  { fnContains: 'OPI-25-6-01-LM Cto. Calz. Club Atlas',     col: 'Club de Golf Atlas',     muni: 'El Salto' },
  { fnContains: 'OPI-25-3-20-AV C. José Luis Verdía',       col: 'Analco',                 muni: 'Guadalajara' },
  { fnContains: 'OPI-25-1-08-AV Av. Camino Mozárabe',       col: 'Coyula',                 muni: 'Tonalá' },
  { fnContains: 'OPI-24-10-12-AV El Pandito',               col: 'El Pandito',             muni: 'Mazamitla' },
  { fnContains: 'OPI-24-10-05-AV Hospital 16',              col: 'Artesanos',              muni: 'Guadalajara' },
  { fnContains: 'OPI-24-9-13-AV Morelos 7',                 col: 'El Tabardillo',          muni: 'Mazamitla' },
  { fnContains: 'OPIRT2-24-7-01-OF Zapote 116',             col: 'Las Huertas',            muni: 'San Pedro Tlaquepaque' },
  { fnContains: 'OPI-24-7-06-OF Sevilla 634',               col: 'Nueva España',           muni: 'Zapopan' },
  { fnContains: 'OPI-24-2-16-EK San Melchor 1322',          col: 'Santa María',            muni: 'Guadalajara' },
  { fnContains: 'OPI-24-2-05-EK Marcos Lara 41',            col: 'Santa Paula',            muni: 'Tonalá' },
  { fnContains: 'OPI-23-12-30-OF Cruz del Sur',             col: 'Villas de San Miguel',   muni: 'Tlajomulco de Zúñiga' },
  { fnContains: 'OPI-23-12-17-OF Felipe Lopez',             col: 'Polanquito',             muni: 'Guadalajara' },
  { fnContains: 'OPI-23-10-08-OF Guadalupe Victoria',       col: 'Los Altos',              muni: 'San Pedro Tlaquepaque' },
  { fnContains: 'OPI-23-10-08-OF_Guadalupe Victoria',       col: 'Los Altos',              muni: 'San Pedro Tlaquepaque' },
  { fnContains: 'OPI-23-8-18 Crisantemo',                   col: 'Flores del Valle',       muni: 'Zapopan' },
  { fnContains: 'OPI-23-7-11-OF_ Aries 4058',               col: 'Juan Manuel Vallarta',   muni: 'Zapopan' },
  { fnContains: 'OPI-23-7-09-OF Can Mayor',                 col: 'Arboledas',              muni: 'Zapopan' },
  { fnContains: 'OPI-23-6-20-OF Av. Francisco J. Múgica',   col: 'El Paraíso',             muni: 'Zapopan' },
  { fnContains: 'OPI-23-6-07-OF coto olmo',                 col: 'Albereda Residencial',   muni: 'El Salto' },

  // 11 ambiguas (con tu propuesta)
  { fnContains: 'OPI-25-1-04-AV Torremolinos',              col: 'Francisco Villa',        muni: 'Zapopan' },
  { fnContains: 'OPI-23-12-31-OF_Limon 1418',               col: 'Del Fresno',             muni: 'Guadalajara' },
  { fnContains: 'OPI-23-9-11-OF Hacienda de los Olivos',    col: 'Hacienda Santa Cruz',    muni: 'Tlajomulco de Zúñiga' },
  { fnContains: 'OPI-23-7-03-OF Emiliano Zapata',           col: 'Lomas del Aeropuerto',   muni: 'Zapopan' },
  { fnContains: 'OPI-23-6-24-OF Manzano 8',                 col: 'Mesa de San Juan',       muni: 'Tonalá' },
  { fnContains: 'OPI-23-6-23-OF Calzada Paraisos',          col: 'Ciudad Granja',          muni: 'Zapopan' },
  { fnContains: 'OPI-23-6-21-OF C. Acacía',                 col: 'Rancho El Centinela',    muni: 'Zapopan' },
  { fnContains: 'OPI-23-6-09-OF Arrollo Oriente',           col: 'Ojo de Agua',            muni: 'Tlajomulco de Zúñiga' },
  { fnContains: 'OPI-23-6-08-OF Aurora Boreal',             col: 'Paseo los Agaves',       muni: 'Tlajomulco de Zúñiga' },

  // 2 OPIs rurales — SE OMITEN (quedan como Atotonilquillo por ahora)
  // OPI-25-3-01-AV 4000 Cópala — rural sin colonia clara
  // OPI-24-3-01-OF Predio la Tuna Tapalpa — rural sin colonia clara
];

let aplicados = 0;
let noEncontrados = [];
FIXES.forEach(fix => {
  const opi = cerebro.find(d => (d.fileName || '').startsWith(fix.fnContains));
  if (!opi) { noEncontrados.push(fix.fnContains); return; }
  const antesCol = opi.sujetoColonia;
  const antesMuni = opi.municipio;
  opi.sujetoColonia = fix.col;
  opi.municipio = fix.muni;
  console.log('✓ [' + (opi.folio || 'sin-folio') + '] "' + antesCol + '"/"' + antesMuni + '" → "' + opi.sujetoColonia + '"/"' + opi.municipio + '"');
  aplicados++;
});

if (noEncontrados.length) {
  console.log('\n⚠ NO ENCONTRADOS (' + noEncontrados.length + '):');
  noEncontrados.forEach(s => console.log('   ' + s));
}

// Confirmar los 3 reales
console.log('\n--- VERIFICANDO 3 REALES ATOTONILQUILLO ---');
const REALES_FN = ['OPI-24-3-19-EK', 'OPI-24-3-18-EK', 'OPI-24-3-17-EK'];
REALES_FN.forEach(folio => {
  const opi = cerebro.find(d => (d.fileName || '').includes(folio));
  if (opi) {
    if (opi.sujetoColonia !== 'Atotonilquillo') opi.sujetoColonia = 'Atotonilquillo';
    if (opi.municipio !== 'Chapala') opi.municipio = 'Chapala';
    console.log('  ✓ ' + folio + ' → Atotonilquillo / Chapala');
  }
});

fs.writeFileSync('cerebro_datos.json', JSON.stringify(cerebro, null, 2));
console.log('\n=== TOTAL: ' + aplicados + ' OPIs corregidos + 3 reales confirmados ===');

// Verificación final
const { normCol } = require('./motor_remi_api');
const aunMal = cerebro.filter(d => normCol(d.sujetoColonia || '') === 'atotonilquillo');
console.log('OPIs que aún normalizan a "atotonilquillo": ' + aunMal.length);
aunMal.forEach(d => console.log('  [' + (d.folio || '?') + '] ' + (d.fileName || '').slice(0, 100)));
