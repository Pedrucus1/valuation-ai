/**
 * proximidad.cjs
 * Módulo de proximidad geográfica para el motor de valuación (Node.js).
 * Port de proximidad.py — misma lógica, cero dependencias externas.
 *
 * Funciones públicas:
 *   haversine(lat1, lon1, lat2, lon2) → km
 *   coordsDeColonia(colonia, municipio) → {lat, lon, cp} | null
 *   coloniasCercanas(colonia, municipio, kmMax=2.5) → [{colonia, municipio, cp, distancia_km}]
 *
 * Uso: const { coloniasCercanas } = require('./_geo/proximidad.cjs');
 */
const fs = require('fs');
const path = require('path');

// ── Carga lazy ────────────────────────────────────────────────────────────────
let _cpCoords = null;
let _coloniaCP = null;

function _load() {
  if (!_cpCoords) {
    _cpCoords = JSON.parse(fs.readFileSync(path.join(__dirname, 'cp_coords.json'), 'utf8'));
  }
  if (!_coloniaCP) {
    _coloniaCP = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonia_cp.json'), 'utf8'));
  }
}

// ── Normalización (idéntica a construir_colonia_cp.py) ────────────────────────
function normalizar(texto) {
  if (!texto) return '';
  return texto.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = d => d * Math.PI / 180;
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dphi = toRad(lat2 - lat1);
  const dlam = toRad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Lookup de coordenadas de una colonia ──────────────────────────────────────
function coordsDeColonia(colonia, municipio) {
  _load();
  const key = normalizar(colonia) + '|' + normalizar(municipio);
  const cpVal = _coloniaCP[key];
  if (cpVal === undefined) return null;
  const cp = Array.isArray(cpVal) ? cpVal[0] : cpVal;
  const coord = _cpCoords[cp];
  if (!coord) return null;
  return { lat: coord.lat, lon: coord.lon, municipio: coord.municipio, cp };
}

// ── Colonias cercanas (cruza municipios) ─────────────────────────────────────
function coloniasCercanas(colonia, municipio, kmMax = 2.5) {
  _load();
  const origen = coordsDeColonia(colonia, municipio);
  if (!origen) return [];

  const lat0 = origen.lat, lon0 = origen.lon;
  const keySujeto = normalizar(colonia) + '|' + normalizar(municipio);
  const resultados = [];

  for (const [key, cpVal] of Object.entries(_coloniaCP)) {
    if (key === keySujeto) continue;
    const cp = Array.isArray(cpVal) ? cpVal[0] : cpVal;
    const coord = _cpCoords[cp];
    if (!coord) continue;
    const dist = haversine(lat0, lon0, coord.lat, coord.lon);
    if (dist <= kmMax) {
      const parts = key.split('|');
      resultados.push({
        colonia: parts[0],
        municipio: coord.municipio,
        cp,
        distancia_km: Math.round(dist * 1000) / 1000,
      });
    }
  }

  resultados.sort((a, b) => a.distancia_km - b.distancia_km);
  return resultados;
}

module.exports = { haversine, coordsDeColonia, coloniasCercanas };

// ── Self-test ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  const ejemplos = [
    ['Chapalita', 'Guadalajara', 2.0],
    ['Tlaquepaque Centro', 'San Pedro Tlaquepaque', 3.0],
    ['El Manantial', 'San Pedro Tlaquepaque', 2.0],
  ];

  for (const [col, mun, km] of ejemplos) {
    console.log(`\n--- coloniasCercanas('${col}', '${mun}', km_max=${km}) ---`);
    const origen = coordsDeColonia(col, mun);
    if (!origen) { console.log('  !! No encontrada'); continue; }
    console.log(`  Origen: lat=${origen.lat}, lon=${origen.lon}, cp=${origen.cp}`);
    const cercanas = coloniasCercanas(col, mun, km);
    const mismoMun = cercanas.filter(c => normalizar(c.municipio) === normalizar(mun));
    const otroMun = cercanas.filter(c => normalizar(c.municipio) !== normalizar(mun));
    console.log(`  Total: ${cercanas.length} (mismo mun: ${mismoMun.length}, cruce: ${otroMun.length})`);
    cercanas.slice(0, 15).forEach(c => {
      const cross = normalizar(c.municipio) !== normalizar(mun) ? ' *** CRUCE ***' : '';
      console.log(`  ${c.distancia_km.toFixed(2)} km  ${c.colonia.padEnd(40)} ${c.municipio}${cross}`);
    });
    if (cercanas.length > 15) console.log(`  ... y ${cercanas.length - 15} más`);
  }
}
