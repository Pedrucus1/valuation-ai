/**
 * Parsea fileName de OPIs mal etiquetadas como "Atotonilquillo"
 * para extraer colonia + municipio reales.
 */
const fs = require('fs');
const { normCol } = require('./motor_remi_api');

const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

// Diccionario CP → municipio (parcial, casos comunes AMG y outliers)
const CP_TO_MUNI = {
  '44': 'Guadalajara', // 44000-44999 = GDL
  '45000': 'Guadalajara', '45010': 'Guadalajara', '45020': 'Zapopan',
};
function muniByCP(cp) {
  if (!cp) return null;
  const n = parseInt(cp, 10);
  if (n >= 44000 && n <= 44999) return 'Guadalajara';
  if (n >= 45010 && n <= 45089) return 'Zapopan';
  if (n >= 45100 && n <= 45239) return 'Zapopan';
  if (n >= 45400 && n <= 45439) return 'Tonalá';
  if (n >= 45500 && n <= 45599) return 'Tonalá';
  if (n >= 45560 && n <= 45619) return 'San Pedro Tlaquepaque';
  if (n >= 45620 && n <= 45699) return 'Tlajomulco de Zúñiga';
  if (n >= 45680 && n <= 45699) return 'El Salto';
  if (n >= 45700 && n <= 45719) return 'El Salto';
  if (n >= 49100 && n <= 49199) return 'Mazamitla';
  if (n >= 49500 && n <= 49520) return 'Tapalpa';
  if (n >= 45900 && n <= 45920) return 'Chapala';
  return null;
}

// Municipios conocidos (lista expandida)
const MUNIS = [
  'Guadalajara','Zapopan','San Pedro Tlaquepaque','Tlaquepaque','Tonalá','Tonala',
  'Tlajomulco de Zúñiga','Tlajomulco','El Salto','Ixtlahuacán de los Membrillos','Ixtlahuacan',
  'Juanacatlán','Juanacatlan','Chapala','Jocotepec','Ajijic','Ocotlán','Ocotlan',
  'Puerto Vallarta','Bahía de Banderas','Bahia de Banderas',
  'Mazamitla','Tapalpa','San Luis Soyatlán','San Luis Soyatlan',
  'San Miguel Cuyutlán','San Miguel Cuyutlan','Las Pintitas','Las Pintas',
  'Cajititlán','Tesistán','Atotonilquillo','Coyula'
];

function parseFileName(fn) {
  // Quitar folio prefix
  let s = (fn || '').replace(/^OPI[A-Z\d]*-[\d-]+-\w+\s*_?\s*/, '').trim();

  // Buscar CP (5 dígitos)
  const cpMatch = s.match(/\b(4[4-9]\d{3}|5\d{4})\b/);
  const cp = cpMatch ? cpMatch[1] : null;

  // Buscar municipio conocido
  let muni = null;
  for (const m of MUNIS) {
    const re = new RegExp('\\b' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(s)) {
      // Normalizar nombre
      if (/^tlaquepaque$/i.test(m)) muni = 'San Pedro Tlaquepaque';
      else if (/^tonala$/i.test(m)) muni = 'Tonalá';
      else if (/^tlajomulco$/i.test(m)) muni = 'Tlajomulco de Zúñiga';
      else if (/^ixtlahuacan$/i.test(m)) muni = 'Ixtlahuacán de los Membrillos';
      else if (/^juanacatlan$/i.test(m)) muni = 'Juanacatlán';
      else if (/^ocotlan$/i.test(m)) muni = 'Ocotlán';
      else if (/^bahia de banderas$/i.test(m)) muni = 'Bahía de Banderas';
      else if (/^san luis soyatlan$/i.test(m)) muni = 'San Luis Soyatlán';
      else if (/^san miguel cuyutlan$/i.test(m)) muni = 'San Miguel Cuyutlán';
      else if (/^cajititlan$/i.test(m)) muni = 'Cajititlán';
      else if (/^tesistan$/i.test(m)) muni = 'Tesistán';
      else muni = m;
      break;
    }
  }

  // Si no hay muni explícito pero hay CP, derivar
  if (!muni && cp) muni = muniByCP(cp);

  // Las Pintitas / Las Pintas son localidades de El Salto
  if (muni === 'Las Pintitas' || muni === 'Las Pintas') muni = 'El Salto';
  // Coyula es localidad de Tonalá
  if (muni === 'Coyula') muni = 'Tonalá';
  // Tesistán es localidad de Zapopan
  if (muni === 'Tesistán') muni = 'Zapopan';
  // Cajititlán es localidad de Tlajomulco
  if (muni === 'Cajititlán') muni = 'Tlajomulco de Zúñiga';
  // San Miguel Cuyutlán es localidad de Tlajomulco
  if (muni === 'San Miguel Cuyutlán') muni = 'Tlajomulco de Zúñiga';
  // Ajijic es localidad de Chapala
  if (muni === 'Ajijic') muni = 'Chapala';

  // Extraer colonia: heurística — buscar texto entre dirección y CP/municipio
  // Patrón típico: "Calle Nombre Núm, [Int], COLONIA, [CP] MUNI, Jal."
  // Quitamos al final: ", Jal.", ", Jalisco"
  s = s.replace(/,?\s*Jal(?:isco)?\.?\s*$/i, '');
  // Quitamos al final el municipio
  if (muni) {
    const munis = [muni, 'Tlaquepaque', 'Tonala', 'Tlajomulco'];
    for (const m of munis) {
      const re = new RegExp(',\\s*(?:\\d{5}\\s*)?' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\.?$', 'i');
      s = s.replace(re, '');
    }
  }
  // Quitamos CP solo si está al final
  s = s.replace(/,\s*\d{5}\s*$/, '');

  // Lo último después de la última coma es la colonia (en la mayoría de casos)
  const partes = s.split(',').map(p => p.trim()).filter(Boolean);
  let colonia = partes[partes.length - 1] || null;

  // Limpieza de colonia (quitar Col., Fracc., etc.)
  if (colonia) {
    colonia = colonia.replace(/^col(?:onia)?\.?\s+/i, '')
                     .replace(/^fracc(?:ionamiento)?\.?\s+/i, '')
                     .replace(/^residencial\s+/i, '')
                     .trim();
  }

  // Si la "colonia" parece ser dirección/número (Int, S/N, etc.), tomar la anterior
  if (colonia && /^(int|s\/?n|sn|\d|piso|local|casa)/i.test(colonia) && partes.length >= 2) {
    colonia = partes[partes.length - 2];
  }

  return { colonia, municipio: muni, cp };
}

const opis = cerebro.filter(d => normCol(d.sujetoColonia || '') === 'atotonilquillo');

console.log('Parseando ' + opis.length + ' OPIs:\n');
const resultados = opis.map(d => {
  const parsed = parseFileName(d.fileName);
  return {
    folio: d.folio,
    fileName: d.fileName,
    muniActual: d.municipio,
    coloniaActual: d.sujetoColonia,
    parsed,
    esRealAtotonilquillo: /atotonilquillo/i.test(d.fileName || '')
  };
});

resultados.forEach(r => {
  const flag = r.esRealAtotonilquillo ? '✓ REAL' : '✗ MAL';
  console.log(flag + ' [' + r.folio + ']');
  console.log('   fn:  ' + (r.fileName || '').slice(0, 100));
  console.log('   ACTUAL → suj:"' + r.coloniaActual + '" muni:"' + r.muniActual + '"');
  console.log('   PROPUESTA → suj:"' + r.parsed.colonia + '" muni:"' + r.parsed.municipio + '" cp:' + r.parsed.cp);
  console.log();
});

// Resumen
const reales = resultados.filter(r => r.esRealAtotonilquillo).length;
const malParsed = resultados.filter(r => !r.esRealAtotonilquillo && r.parsed.colonia && r.parsed.municipio).length;
const malSinDatos = resultados.filter(r => !r.esRealAtotonilquillo && (!r.parsed.colonia || !r.parsed.municipio)).length;

console.log('═════════════════════════════════════════════');
console.log('RESUMEN:');
console.log('  Realmente Atotonilquillo:', reales);
console.log('  Mal etiquetadas con parse OK:', malParsed);
console.log('  Mal etiquetadas sin parse claro:', malSinDatos);

fs.writeFileSync('atotonilquillo_propuesta.json', JSON.stringify(resultados, null, 2));
console.log('\n→ Guardado en atotonilquillo_propuesta.json');
