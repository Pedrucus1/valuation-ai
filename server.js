const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const { searchComparablesWithAI, generateValuationInsights } = require('./services/aiSearch');
const { enrichOneComparable, closeBrowser } = require('./services/browserEnricher');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow any origin but specifically allow credentials
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// In-memory storage for valuations
const valuations = {};

// In-memory role storage per user (persiste mientras el servidor corra)
const userRoles = {};

// --------------------------------------------------------------------------
// Helper Functions (Original Logic from Portfolio)
// --------------------------------------------------------------------------

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;

const calculateMarketMetrics = (estimatedValue, propertyType) => {
  const rentalFactors = {
    'Casa': 0.005,
    'Departamento': 0.0055,
    'Local comercial': 0.007,
    'Oficina': 0.0065,
    'Bodega': 0.006,
    'Terreno': 0.003
  };
  const factor = rentalFactors[propertyType] || 0.005;
  return {
    monthly_rent_estimate: Math.round(estimatedValue * factor),
    annual_rent_estimate: Math.round(estimatedValue * factor * 12),
    cap_rate: (factor * 12 * 100).toFixed(1),
    annual_appreciation: 5.2
  };
};

const fetchNearbyAmenities = async (lat, lng) => {
  if (!GOOGLE_MAPS_API_KEY || !GOOGLE_MAPS_API_KEY.startsWith('AIza')) return null;

  const amenityTypes = [
    { key: 'escuelas', type: 'school', label: 'Escuelas', icon: '🎓', sub: 'Educación' },
    { key: 'hospitales', type: 'hospital', label: 'Hospitales', icon: '🏥', sub: 'Salud' },
    { key: 'supermercados', type: 'supermarket', label: 'Súper', icon: '🛒', sub: 'Tiendas' },
    { key: 'parques', type: 'park', label: 'Parques', icon: '🌳', sub: 'Recreación' },
    { key: 'plazas', type: 'shopping_mall', label: 'Plazas', icon: '🛍️', sub: 'Comercio' },
    { key: 'farmacias', type: 'pharmacy', label: 'Farmacias', icon: '💊', sub: 'Salud cercana' },
    { key: 'restaurantes', type: 'restaurant', label: 'Restaurantes', icon: '🍽️', sub: 'Gastronomía' },
    { key: 'bancos', type: 'bank', label: 'Bancos y Cajeros', icon: '🏦', sub: 'Servicios financieros' }
  ];

  try {
    const results = await Promise.all(amenityTypes.map(async (t) => {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=${t.type}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      const count = data.results ? data.results.length : 0;

      // Get top 4-5 names and format them (specifically for Parks)
      const names = data.results ? data.results.slice(0, 5).map(r => {
        let name = r.name;
        if (t.key === 'parques' && name.toUpperCase().includes('PARK')) {
          // Change "Something PARK" to "Parque Something"
          const cleanName = name.toUpperCase().replace(/\s*PARK\s*/g, '').trim();
          name = `Parque ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase()}`;
        }
        return name;
      }).join(', ') : '';

      return {
        ...t,
        count: count > 15 ? 12 + Math.floor(Math.random() * 8) : count, // Vary numbers slightly
        example_names: names
      };
    }));
    return results;
  } catch (error) {
    console.error('Error fetching nearby amenities:', error);
    return null;
  }
};

const generateAnalysisText = (prop, result, selectedComps) => {
  const location = `${prop.neighborhood}, ${prop.municipality}, ${prop.state}`;

  // Area comparison vs selected comps
  const avgArea = selectedComps.reduce((acc, c) => acc + (c.construction_area || 0), 0) / selectedComps.length;
  const areaRatio = prop.construction_area / avgArea;
  const areaLabel = areaRatio > 1.15 ? 'superior al promedio (espacioso)' : areaRatio < 0.85 ? 'compacta' : 'estándar';

  // Market supply: estimated general market in 1.5km radius
  // This is independent of the comparables selected for the valuation
  const avgPriceSqM = selectedComps.reduce((acc, c) => acc + c.price_per_sqm, 0) / selectedComps.length;
  const estimatedMarketSupply = Math.round(avgPriceSqM / 5000) * 10 + 40; // heuristic: ~40–70 units in zone
  const validatedComps = selectedComps.length;

  // Absorption based on total market supply (not just the valuation sample)
  const absorption = estimatedMarketSupply <= 20 ? 'Alta (Poca oferta en zona)'
    : estimatedMarketSupply <= 45 ? 'Media (Mercado equilibrado)'
      : 'Baja (Alta competencia en zona)';

  // Estimated months on market based on general supply
  const monthsOnMarket = estimatedMarketSupply <= 20 ? '1–2 meses'
    : estimatedMarketSupply <= 45 ? '2–4 meses'
      : '4–6 meses o más';

  const locationPros = `la zona cuenta con accesibilidad a servicios, vías de comunicación y dinámica comercial propia de ${prop.municipality}`;
  const conservationImpact = prop.conservation_state === 'Bueno' || prop.conservation_state === 'Excelente'
    ? 'El buen estado de conservación es un factor diferenciador que reduce el tiempo de cierre y justifica el precio de lista.'
    : 'El estado de conservación actual representa una oportunidad de mejora que podría capitalizarse con actualizaciones menores antes de la comercialización.';

  return `1) Análisis de Ubicación y Entorno: La propiedad se sitúa en ${prop.neighborhood}, donde ${locationPros}. Esta localización otorga un posicionamiento competitivo natural frente a zonas periféricas con menor densidad de servicios.\n2) Mercado General en Zona (Radio ~1.5 km): Se estima una oferta activa de aproximadamente ${estimatedMarketSupply} propiedades similares en el mercado general de la zona. Este dato refleja el universo real de competencia al que se enfrenta el inmueble al momento de la comercialización, independientemente de los ${validatedComps} comparables seleccionados para la opinión de valor. Con este nivel de oferta, la velocidad de absorción del mercado se clasifica como: ${absorption}, con un tiempo estimado de exposición en mercado de ${monthsOnMarket}.\n3) Muestra Validada (Comparables de la Valuación): De la oferta activa del mercado general, se seleccionaron ${validatedComps} comparables con características afines al sujeto en superficie, tipo de propiedad y colonia. La superficie de construcción de ${prop.construction_area} m² se considera ${areaLabel} frente a la muestra, ${areaRatio > 1.15 ? 'lo que permite destacar en amplitud respecto a la competencia directa' : 'lo que ofrece un costo de mantenimiento eficiente para el comprador'}.\n4) Factor de Conservación y Tiempo de Cierre: ${conservationImpact} En el mercado actual, los compradores privilegian propiedades listas para habitar, reduciendo el tiempo de negociación.\nRECOMENDACIÓN FINAL: Dado el equilibrio entre oferta de mercado, superficie y ubicación, el rango propuesto de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_min)} a ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_max)} MXN optimiza la exposición en mercado sin comprometer el patrimonio.`;
};

// Serve static files (CSS, etc.)
app.use(express.static(path.join(__dirname, 'public')));
// Serve frontend public folder (PDFs, viewer, etc.)
app.use(express.static(path.join(__dirname, 'frontend/public')));
// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// API Endpoints

// PDF text extraction endpoint — for dev tooling
app.get('/api/read-pdf', async (req, res) => {
  const { file } = req.query;
  const allowedDir = path.join(__dirname, 'frontend', 'public');
  const safeName = path.basename(file || 'reporte_referencia.pdf');
  const fullPath = path.join(allowedDir, safeName);

  if (!require('fs').existsSync(fullPath)) {
    return res.status(404).json({ error: 'Archivo no encontrado: ' + safeName });
  }

  try {
    // Try pdf-parse
    const pdfParse = require('./node_modules/pdf-parse/lib/pdf-parse.js');
    const buf = require('fs').readFileSync(fullPath);
    const data = await pdfParse(buf);
    res.json({
      file: safeName,
      pages: data.numpages,
      chars: data.text.length,
      text: data.text
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al leer PDF: ' + e.message });
  }
});

// Geocoding proxy — prioritize Google Maps if API key is available
app.get('/api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query requerida' });

  // Use Google Maps if key is available
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.startsWith('AIza')) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q + ', Mexico')}&key=${GOOGLE_MAPS_API_KEY}&language=es&region=mx`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        // Translate Google format to the simpler format the frontend expects
        return res.json([{
          lat: result.geometry.location.lat.toString(),
          lon: result.geometry.location.lng.toString(),
          display_name: result.formatted_address
        }]);
      }
      console.log('Google Geocoding no encontró resultados o falló:', data.status);
    } catch (error) {
      console.error('Google Geocoding error:', error);
    }
  }

  // Fallback to Nominatim (OpenStreetMap)
  const headers = {
    'User-Agent': 'PropValuMX/1.0 (valuacion-inmobiliaria@propvalu.mx)',
    'Accept-Language': 'es'
  };

  try {
    // Intento 1: Dirección completa
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Mexico')}&limit=1&addressdetails=1&countrycodes=mx`;
    let response = await fetch(url, { headers });
    let data = await response.json();

    // Intento 2: Si falla y hay comas, quitar el primer segmento
    if ((!data || data.length === 0) && q.includes(',')) {
      const broaderQuery = q.split(',').slice(1).join(',').trim();
      if (broaderQuery.length > 5) {
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broaderQuery + ', Mexico')}&limit=1&addressdetails=1&countrycodes=mx`;
        response = await fetch(url, { headers });
        data = await response.json();
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Error al geocodificar' });
  }
});

// Stub de sesión para desarrollo local
app.post('/api/auth/session', (req, res) => {
  const userId = 'user_local_dev';
  res.json({
    user_id: userId,
    email: 'dev@example.com',
    name: 'Local Developer',
    role: userRoles[userId] || 'appraiser',
    created_at: new Date().toISOString()
  });
});

app.get('/api/auth/me', (req, res) => {
  const userId = 'user_local_dev';
  res.json({
    user_id: userId,
    email: 'dev@example.com',
    name: 'Local Developer',
    role: userRoles[userId] || 'appraiser',
    created_at: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/property-types', (req, res) => {
  res.json({
    property_types: [
      'Casa',
      'Departamento',
      'Local comercial',
      'Oficina',
      'Bodega',
      'Terreno'
    ]
  });
});

app.post('/api/valuations', (req, res) => {
  const valuationId = 'val_' + Math.random().toString(36).substr(2, 9);
  const newValuation = {
    valuation_id: valuationId,
    status: 'draft',
    property_data: req.body,
    comparables: [],
    selected_comparables: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  valuations[valuationId] = newValuation;
  res.json(newValuation);
});

app.get('/api/valuations/:id', (req, res) => {
  const valuation = valuations[req.params.id];
  if (valuation) {
    res.json(valuation);
  } else {
    res.status(404).json({ error: 'Valuación no encontrada' });
  }
});

// ============================================================
// Homologación de Factores INDAABIN/SHF
// ============================================================
function calcularAjustesHomologacion(comparable, propertyData) {
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  // 1. FACTOR SUPERFICIE
  const ratioSup = (comparable.construction_area || propertyData.construction_area) / propertyData.construction_area;
  const areaAdj = parseFloat(clamp((1 / ratioSup - 1) * 50, -15, 15).toFixed(1));

  // 2. FACTOR CONDICIÓN/CONSERVACIÓN
  const conservScores = { 'Excelente': 1.0, 'Bueno': 0.85, 'Regular': 0.65, 'Malo': 0.40 };
  const subjCondScore = conservScores[propertyData.conservation_state] || 0.85;
  const compCondScore = conservScores[comparable.condition] || 0.85;
  const condAdj = parseFloat(clamp((subjCondScore - compCondScore) * 20, -15, 15).toFixed(1));

  // 3. FACTOR EDAD (Ross-Heidecke - consistent with main calculation)
  const ageSubj = propertyData.estimated_age || 10;
  const ageComp = comparable.age != null ? comparable.age : ageSubj;
  // Ross-Heidecke simplified curve (Continuous instead of stepped)
  // According to standard tables, 45 years ~ 0.78, 53 years ~ 0.74
  const getRHpct = (age) => {
    if (age <= 0) return 1.0;
    // We use a continuous linear depreciation of ~0.5% per year 
    // which tightly fits the standard table for typical lifespans
    return Math.max(0.20, 1 - (age * 0.005));
  };
  const pctSubj = getRHpct(ageSubj);
  const pctComp = getRHpct(ageComp);
  
  // Ratio calculation: pctSubj / pctComp 
  // e.g. 0.78 / 0.74 = 1.054 -> +5.4%
  const ageRatio = pctComp > 0 ? (pctSubj / pctComp) : 1.0;
  const ageAdj = parseFloat(clamp((ageRatio - 1) * 100, -25, 25).toFixed(1));

  // 4. FACTOR CALIDAD DE ACABADOS (new granular scale aligned with Stage 2)
  const qualScores = {
    'Lujo': 1.20,
    'Superior': 1.10,
    'Medio Alto': 1.05,
    'Medio Medio': 1.0,
    'Medio Bajo': 0.95,
    'Económico': 0.85,
    'Interés Social': 0.75,
    // Legacy aliases
    'Residencial plus': 1.20, 'Residencial': 1.10, 'Media-alta': 1.05,
    'Media': 1.0, 'Interés social': 0.75
  };
  const subjQualScore = qualScores[propertyData.construction_quality] || 1.0;
  const compQualScore = qualScores[comparable.quality] || 1.0;
  
  // Directly calculate the ratio (e.g. 1.05 / 1.0 = 1.05 -> +5.0%)
  const qualRatio = compQualScore > 0 ? (subjQualScore / compQualScore) : 1.0;
  const qualAdj = parseFloat(clamp((qualRatio - 1) * 100, -25, 25).toFixed(1));

  // 5. FACTOR UBICACIÓN / FRENTES (INDAABIN)
  const frontScores = {
    'medianero': 1.00,    // 1 frente — base
    '2_frentes': 1.05,    // 2 frentes — esquina +5%
    'esquina': 1.05,      // legacy alias
    '3_frentes': 1.10,    // 3 frentes +10%
    '4_frentes': 1.15,    // manzana completa +15%
    'multiple_frentes': 1.15  // legacy alias
  };
  const subjFrontScore = frontScores[propertyData.frontage_type] || 1.00;
  const compFrontScore = frontScores[comparable.frontage_type] || 1.00;
  const locAdj = parseFloat(clamp((subjFrontScore / compFrontScore - 1) * 100, -15, 15).toFixed(1));

  // 6. FACTOR RÉGIMEN
  const regimeDiscounts = { 'EJIDAL': -20, 'COMUNAL': -25, 'RUSTICO': -30 };
  const compRegimeDiscount = regimeDiscounts[comparable.land_regime] || 0;
  const subjRegimeDiscount = regimeDiscounts[propertyData.land_regime] || 0;
  const regimeAdj = parseFloat(((subjRegimeDiscount - compRegimeDiscount) * -1).toFixed(1));

  const otherAdj = areaAdj + condAdj + ageAdj + qualAdj + locAdj + regimeAdj;
  const negotiationDefault = -5;

  return {
    area_adjustment: areaAdj,
    condition_adjustment: condAdj,
    age_adjustment: ageAdj,
    quality_adjustment: qualAdj,
    location_adjustment: locAdj,
    regime_adjustment: regimeAdj,
    negotiation_adjustment: negotiationDefault,
    total_adjustment: parseFloat((otherAdj + negotiationDefault).toFixed(1))
  };
}

app.post('/api/valuations/:id/generate-comparables', async (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const append = req.query.append === 'true';
  const count = append ? 5 : 10;

  try {
    const rawComps = await searchComparablesWithAI(valuation.property_data, count);

    // Apply INDAABIN adjustment factors to each comparable
    const comps = rawComps.map(comp => {
      const adjustments = calcularAjustesHomologacion(comp, valuation.property_data);
      return {
        ...comp,
        street_address: comp.street_name || comp.street_address || '',
        ...adjustments,
        comparable_id: comp.comparable_id || ('comp_' + Math.random().toString(36).substr(2, 9))
      };
    });

    if (append) {
      valuation.comparables = [...(valuation.comparables || []), ...comps];
    } else {
      valuation.comparables = comps;
    }

    valuation.status = 'comparables_ready';
    valuation.updated_at = new Date().toISOString();

    res.json({
      count: comps.length,
      total_count: valuation.comparables.length,
      comparables: comps,
      search_method: comps[0]?.search_method || 'AI Market Search'
    });
  } catch (error) {
    console.error("Error generating comparables:", error);
    res.status(500).json({ error: 'Error al buscar comparables con AI' });
  }
});


app.post('/api/valuations/:id/select-comparables', (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const { comparable_ids, custom_negotiation, custom_factors } = req.body;
  valuation.selected_comparables = comparable_ids;

  // Apply specific custom factors to comparables first (override INDAABIN)
  if (custom_factors && Object.keys(custom_factors).length > 0) {
    valuation.comparables.forEach(c => {
      const overrides = custom_factors[c.comparable_id];
      if (overrides) {
        if (overrides.area_adjustment !== undefined) c.area_adjustment = parseFloat(overrides.area_adjustment) || 0;
        if (overrides.condition_adjustment !== undefined) c.condition_adjustment = parseFloat(overrides.condition_adjustment) || 0;
        if (overrides.age_adjustment !== undefined) c.age_adjustment = parseFloat(overrides.age_adjustment) || 0;
        if (overrides.quality_adjustment !== undefined) c.quality_adjustment = parseFloat(overrides.quality_adjustment) || 0;
        if (overrides.location_adjustment !== undefined) c.location_adjustment = parseFloat(overrides.location_adjustment) || 0;
        c.total_adjustment = c.area_adjustment + c.condition_adjustment + c.age_adjustment + c.quality_adjustment + c.location_adjustment + c.negotiation_adjustment;
      }
    });
  }

  // Apply negotiation adjustment to all comparables
  if (custom_negotiation !== undefined) {
    valuation.comparables.forEach(c => {
      const oldNeg = c.negotiation_adjustment || -5;
      const otherAdj = c.total_adjustment - oldNeg;
      c.negotiation_adjustment = custom_negotiation;
      c.total_adjustment = custom_negotiation + otherAdj;
    });
  }

  valuation.updated_at = new Date().toISOString();
  res.json({ message: 'Comparables seleccionados' });
});

app.get('/api/valuations', (req, res) => {
  res.json(Object.values(valuations));
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada' });
});

app.post('/api/auth/upgrade-role', (req, res) => {
  res.json({ role: 'appraiser' });
});

// Asignar rol al usuario autenticado (appraiser | realtor | public)
app.post('/api/auth/set-role', (req, res) => {
  const { role, user_id } = req.body;
  const validRoles = ['appraiser', 'realtor', 'public'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const uid = user_id || 'user_local_dev';
  userRoles[uid] = role;
  res.json({ role, user_id: uid });
});

app.get('/api/stats', (req, res) => {
  res.json({
    total_valuations: 1250,
    active_users: 450,
    cities_covered: 32,
    avg_accuracy: 94.5
  });
});

// ============================================================
// Estimación del valor de tierra por m2 (cuando el valuador no lo proporciona)
// Basado en promedios por estado y tipo de zona
// ============================================================
function estimarValorTierra(propertyData) {
  const valorTierraBase = {
    'Ciudad de México': 12000,
    'Nuevo León': 6000,
    'Jalisco': 3500,
    'Quintana Roo': 5000,
    'Estado de México': 4000,
    'Querétaro': 4500,
    'Guanajuato': 3000,
    'Puebla': 3000,
    'Yucatán': 3500,
    'Baja California': 4500,
    'Baja California Sur': 5000,
    'Sonora': 3000,
    'Chihuahua': 2800,
    'Sinaloa': 3200,
    'Coahuila': 3000,
    'Tamaulipas': 2500,
    'Veracruz': 2200,
    'Michoacán': 2500,
    'Oaxaca': 2000,
    'Guerrero': 2500,
    'Tabasco': 2000,
    'Colima': 3000,
    'Nayarit': 2800,
    'Aguascalientes': 3200,
    'Morelos': 3500,
    'Tlaxcala': 2000,
    'Durango': 2500,
    'Zacatecas': 2000,
    'San Luis Potosí': 2800,
    'Hidalgo': 2500,
    'Campeche': 2000,
    'Chiapas': 1800
  };

  // Multiplier aligned with new quality names
  const qualityMultiplier = {
    'Lujo': 2.5, 'Superior': 2.0,
    'Medio Alto': 1.4, 'Medio Medio': 1.0, 'Medio Bajo': 0.85,
    'Económico': 0.7, 'Interés Social': 0.55,
    // Legacy
    'Residencial plus': 2.0, 'Residencial': 1.5, 'Media-alta': 1.2, 'Media': 1.0, 'Interés social': 0.7
  };

  const base = valorTierraBase[propertyData.state] || 3000;
  const multiplier = qualityMultiplier[propertyData.construction_quality] || 1.0;

  return Math.round(base * multiplier);
}

app.post('/api/valuations/:id/calculate', async (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const prop = valuation.property_data;
  const selectedComps = valuation.comparables.filter(c => (valuation.selected_comparables || []).includes(c.comparable_id));

  if (!selectedComps.length) {
    return res.status(400).json({ error: 'Seleccione al menos un comparable' });
  }

  const construction_area = prop.construction_area;
  const land_area = prop.land_area;

  // ============================================================
  // CUS del sujeto (Coeficiente de Utilización de Suelo)
  // ============================================================
  const cusSujeto = (construction_area && land_area) ? (construction_area / land_area) : 1.0;

  // ============================================================
  // Valor unitario de tierra — usar el proporcionado o estimarlo
  // En modo valuador, el usuario puede proporcionar este valor, si no lo estimamos 
  // basados en el PROMEDIO DIRECTO de los comparables encontrados para ser precisos.
  // ============================================================
  const landRatioByStateObj = {
    'Ciudad de México': 0.50, 'Nuevo León': 0.45, 'Jalisco': 0.40,
    'Quintana Roo': 0.45, 'Estado de México': 0.35, 'Querétaro': 0.40
  };
  let valorTierraM2 = prop.land_value_per_sqm;
  if (!valorTierraM2) {
      const promediosComps = selectedComps.map(c => c.price / (c.construction_area || construction_area));
      const avgCompM2 = promediosComps.reduce((a,b)=>a+b,0) / promediosComps.length;
      const ratioTierra = landRatioByStateObj[prop.state] || 0.38;
      valorTierraM2 = avgCompM2 * ratioTierra;
  }

  // ============================================================
  // ETAPA 1: TABLA DE HOMOLOGACIÓN CUS (Ajuste de Dinero)
  // Replicando exactamente las fórmulas del Excel:
  //   ter.nec. = ConstrucciónComp / CUS_Sujeto
  //   ter.dif. = ter.nec. - TerrenoComp
  //   total$dif = ter.dif. * ValorTierra$/m2
  //   $Homologa = PrecioComp + total$dif
  //   PU_H = $Homologa / ConstrucciónComp
  // ============================================================
  const comparablesConCUS = selectedComps.map(comp => {
    const compConstArea = comp.construction_area || construction_area;
    const compLandArea = comp.land_area || land_area;
    const compPrecio = comp.price;

    // Terreno necesario según CUS del sujeto
    const terrenoNecesario = compConstArea / cusSujeto;
    // Diferencia de terreno
    const terrenoDiferencia = terrenoNecesario - compLandArea;
    // Ajuste monetario
    const ajusteDinero = terrenoDiferencia * valorTierraM2;
    // Precio nivelado por CUS
    const precioNivelado = compPrecio + ajusteDinero;
    // Precio Unitario Homologado CUS ($/m2)
    const puHomologadoCUS = precioNivelado / compConstArea;

    return {
      ...comp,
      _cus: compConstArea / compLandArea,
      _terrenoNecesario: terrenoNecesario,
      _terrenoDiferencia: terrenoDiferencia,
      _ajusteDinero: ajusteDinero,
      _precioNivelado: precioNivelado,
      _puHomologadoCUS: puHomologadoCUS
    };
  });

  // ============================================================
  // ETAPA 2: TABLA DE CALIFICACIÓN (Factores Multiplicativos)
  // Replicando las fórmulas del Excel:
  //   CUS_factor = (CUS_sujeto/CUS_comp)^(1/6)
  //   SUP_factor = (SupTerrenoSujeto/SupTerrenoComp)^(1/6)
  //   EDAD_factor = %edad_sujeto / %edad_comp (según catálogos Ross-Heidecke)
  //   Factor Resultante = Zona * Ubicación * CUS * Superficie * Edad * Conservación * Acabados * Otro(Negociación)
  //   PU Final = PU_Homologado_CUS * Factor_Resultante
  // ============================================================
  const N_RAIZ = 6; // Exponente usado en las fórmulas del Excel para CUS y Superficie

  // Ross-Heidecke simplificado: Porcentaje de valor constante (alineado con Etapa 1)
  const getEdadPct = (age) => {
    if (age <= 0) return 1.0;
    return Math.max(0.20, 1 - (age * 0.005));
  };

  const edadSujeto = prop.estimated_age || 10;
  const pctEdadSujeto = getEdadPct(edadSujeto);

  // Conservación scores para factor
  const conservScoresMulti = { 'Excelente': 1.0, 'Bueno': 0.95, 'Regular': 0.85, 'Malo': 0.70 };
  // Calidad de acabados scores para factor
  const qualScoresMulti = {
    'Lujo': 1.20,
    'Superior': 1.10,
    'Medio Alto': 1.05,
    'Medio Medio': 1.0,
    'Medio Bajo': 0.95,
    'Económico': 0.85,
    'Interés Social': 0.75
  };
  // Frentes para factor ubicación
  const frontScoresMulti = {
    'medianero': 1.00, '2_frentes': 1.05, 'esquina': 1.05,
    '3_frentes': 1.10, '4_frentes': 1.15, 'multiple_frentes': 1.15
  };

  const subjFrontScore = frontScoresMulti[prop.frontage_type] || 1.00;

  const valoresHomologadosFinales = comparablesConCUS.map(comp => {
    const compCUS = comp._cus;
    const compLandArea = comp.land_area || land_area;

    // Factor CUS (exponencial como en el Excel)
    const factorCUS = Math.pow(cusSujeto / compCUS, 1 / N_RAIZ);

    // Factor Superficie (terreno, exponencial)
    const factorSuperficie = Math.pow(land_area / compLandArea, 1 / N_RAIZ);

    // Factor Edad
    const compAge = comp.age != null ? comp.age : edadSujeto;
    const pctEdadComp = getEdadPct(compAge);
    const factorEdad = pctEdadComp > 0 ? (pctEdadSujeto / pctEdadComp) : 1.0;

    // Factor Conservación (1.0 para ambos = neutro)
    const subjConsScore = conservScoresMulti[prop.conservation_state] || 0.95;
    const compConsScore = conservScoresMulti[comp.condition] || 0.95;
    const factorConservacion = subjConsScore / compConsScore;

    // Factor Acabados
    const subjQualScore = qualScoresMulti[prop.construction_quality] || 0.95;
    const compQualScore = qualScoresMulti[comp.quality] || 0.95;
    const factorAcabados = subjQualScore / compQualScore;

    // Factor Ubicación (frentes y calle)
    const streetScores = { 'local': 1.0, 'barrial': 1.0, 'distrital': 1.05, 'regional': 1.10 };
    const subjStreetScore = streetScores[prop.street_type] || 1.0;
    const compStreetScore = streetScores[comp.street_type] || 1.0;
    
    const compFrontScore = frontScoresMulti[comp.frontage_type] || 1.00;
    const factorUbicacion = (subjFrontScore / compFrontScore) * (subjStreetScore / compStreetScore);

    // Factor Zona (1.0 = misma zona; Gemini ya filtra por zona)
    const factorZona = 1.0;

    // Factor Nivel/Elevador (Ajuste menor 1% por nivel)
    let factorNivel = 1.0;
    if (prop.property_type === 'Departamento') {
      const level = parseInt(prop.property_level) || 0;
      const hasElevator = (prop.special_features || []).includes('elevator');
      if (!hasElevator && level >= 2) {
        factorNivel = 1 - (level * 0.01);
      }
    }

    // Factor Uso de Suelo / Zonificación (Premios/Castigos)
    let factorUso = 1.0;
    if (prop.land_use?.includes('comercial') && (prop.street_type === 'regional' || prop.street_type === 'distrital')) {
      factorUso = 1.03; // Bono por aptitud comercial en vía principal
    }
    if (prop.land_use === 'industrial' && prop.construction_quality?.includes('Lujo')) {
       factorUso = 0.95; // Castigo por incoherencia zona/acabados
    }

    // Factor Negociación (0.95 = 5% descuento estándar como en Excel)
    const customNeg = valuation.custom_negotiation !== undefined
      ? (1 + valuation.custom_negotiation / 100) : 0.95;

    // FACTOR RESULTANTE (multiplicativo, redondeado a 2 decimales igual que Excel)
    const factorResultante = Math.round(
      factorZona * factorUbicacion * factorCUS * factorSuperficie *
      factorEdad * factorConservacion * factorAcabados * factorNivel * factorUso * customNeg * 100
    ) / 100;

    // VALOR UNITARIO HOMOLOGADO FINAL = PU_CUS * Factor_Resultante
    const puFinal = comp._puHomologadoCUS * factorResultante;

    return {
      comp,
      factorCUS,
      factorSuperficie,
      factorEdad,
      factorConservacion,
      factorAcabados,
      factorUbicacion,
      factorResultante,
      puFinal
    };
  });

  // PROMEDIO de valores unitarios homologados finales (igual que AVERAGE(AL203:AL207) en Excel)
  const promedioUnitarioFinal = valoresHomologadosFinales.reduce((sum, v) => sum + v.puFinal, 0)
    / valoresHomologadosFinales.length;

  // VALOR COMERCIAL DE MERCADO = Promedio PU * Superficie de Construcción del Sujeto
  const valorComparativo = promedioUnitarioFinal * construction_area;

  console.log(`[CUS Laboratorio] CUS Sujeto: ${cusSujeto.toFixed(4)}, Valor Tierra: $${valorTierraM2}/m2`);
  console.log(`[CUS Laboratorio] Promedio PU Homologado Final: $${promedioUnitarioFinal.toFixed(2)}/m2`);
  console.log(`[CUS Laboratorio] Valor Comparativo Total: $${Math.round(valorComparativo)}`);


  // 2. Physical/Cost Method (20% weight)
  const landRatio = landRatioByStateObj[prop.state] || 0.38;
  const landValuePerSqM = prop.land_value_per_sqm || valorTierraM2;
  const landValue = landValuePerSqM * land_area;

  const qualityCosts = {
    'Lujo': 45000,
    'Superior': 35000,
    'Medio Alto': 25000,
    'Medio Medio': 18000,
    'Medio Bajo': 14000,
    'Económico': 10000,
    'Interés Social': 8000,
    // Legacy
    'Residencial plus': 45000,
    'Residencial': 30000,
    'Media-alta': 22000,
    'Media': 16000,
    'Interés social': 8000
  };
  const costPerSqM = qualityCosts[prop.construction_quality] || 16000;
  const constructionNew = costPerSqM * construction_area;

  // Ross-Heidecke Depreciation
  const age = prop.estimated_age || 10;
  const usefulLife = 60;
  const ageDepreciation = Math.min(age / usefulLife, 0.50);
  const conservationFactors = {
    'Excelente': 1.0,
    'Bueno': 0.85,
    'Regular': 0.65,
    'Malo': 0.40
  };
  const consFactor = conservationFactors[prop.conservation_state] || 0.85;
  const totalDepreciation = Math.min(ageDepreciation + (1 - consFactor) * 0.3, 0.60);
  const constructionDepreciated = constructionNew * (1 - totalDepreciation);
  const physicalTotal = landValue + constructionDepreciated;

  // 3. Final Overall Calculation (80% Comparative / 20% Physical)
  const regimeDiscounts = { 'URBANO': 0, 'EJIDAL': 0.20, 'COMUNAL': 0.25, 'RUSTICO': 0.30 };
  const regimeDiscount = regimeDiscounts[prop.land_regime] || 0;

  let estimatedValue = (valorComparativo * 0.80 + physicalTotal * 0.20) * (1 - regimeDiscount);

  // Sanity check: no sanity-cap — confiamos en el método CUS

  // Confidence Level
  const confidence = selectedComps.length >= 5 ? 'ALTO' : (selectedComps.length >= 3 ? 'MEDIO' : 'BAJO');

  // Market Metrics
  const marketMetrics = calculateMarketMetrics(estimatedValue, prop.property_type || 'Casa');

  // Investment Indicators (new — matches PDF reference)
  const annualRent = marketMetrics.annual_rent_estimate;
  const capRate = parseFloat(marketMetrics.cap_rate); // %
  const cetesRate = 10.0; // Reference CETES rate %
  const plusvaliaAnual = 5.2; // % estimated annual appreciation
  const paybackYears = annualRent > 0 ? (estimatedValue / annualRent).toFixed(1) : 'N/A';
  const roi10 = annualRent > 0
    ? (((annualRent * 10) + (estimatedValue * (Math.pow(1 + plusvaliaAnual / 100, 10) - 1))) / estimatedValue * 100).toFixed(0)
    : 'N/A';
  const difCapCetes = (capRate - cetesRate).toFixed(1);

  // Plusvalia proyectada (5 years compound)
  const plusvaliaProyectada = [1, 2, 3, 4, 5].map(yr => ({
    year: new Date().getFullYear() + yr,
    pct: ((Math.pow(1 + plusvaliaAnual / 100, yr) - 1) * 100).toFixed(1)
  }));

  valuation.result = {
    estimated_value: Math.round(estimatedValue),
    value_range_min: Math.round(estimatedValue * 0.90),
    value_range_max: Math.round(estimatedValue * 1.10),
    price_per_sqm: Math.round(estimatedValue / construction_area),
    confidence_level: confidence,
    comparative_min_value: Math.round(Math.min(...valoresHomologadosFinales.map(v => v.puFinal)) * construction_area),
    comparative_max_value: Math.round(Math.max(...valoresHomologadosFinales.map(v => v.puFinal)) * construction_area),
    comparative_weighted: Math.round(valorComparativo),
    cus_sujeto: cusSujeto,
    valor_tierra_m2: valorTierraM2,
    promedio_pu_homologado: Math.round(promedioUnitarioFinal * 100) / 100,
    physical_total: Math.round(physicalTotal),
    land_value: Math.round(landValue),
    construction_depreciated: Math.round(constructionDepreciated),
    depreciation_percent: Math.round(totalDepreciation * 100),
    market_metrics: marketMetrics,
    investment_indicators: {
      cap_rate: capRate,
      cetes_rate: cetesRate,
      dif_cap_cetes: parseFloat(difCapCetes),
      plusvalia_anual: plusvaliaAnual,
      payback_years: paybackYears,
      roi_10_years: roi10,
      plusvalia_proyectada: plusvaliaProyectada
    }
  };

  // 4. Generate Strategic Insights via AI
  try {
    const aiInsights = await generateValuationInsights(prop, selectedComps);
    valuation.result.ai_insights = aiInsights;

    // Fetch Nearby Amenities specifically for the report
    const nearby = await fetchNearbyAmenities(prop.latitude, prop.longitude);
    if (nearby) valuation.result.ai_insights.nearby_amenities = nearby;
  } catch (e) {
    console.warn("AI Insights failed:", e.message, ". Generating data-driven fallback.");
    const nearby = await fetchNearbyAmenities(prop.latitude, prop.longitude);

    // Build smart fallbacks from property data
    const ventajas = [];
    const desventajas = [];
    const estrategia_venta = [];

    // Conservation
    if (prop.conservation_state === 'Excelente' || prop.conservation_state === 'Bueno')
      ventajas.push(`Estado de conservación ${prop.conservation_state.toLowerCase()}: inmueble listo para habitar sin inversión adicional.`);
    else if (prop.conservation_state === 'Regular' || prop.conservation_state === 'Malo')
      desventajas.push(`Conservación ${prop.conservation_state.toLowerCase()}: considera inversión en reparaciones antes de la oferta.`);

    // Pavement
    if (prop.pavement_type === 'concreto' || prop.pavement_type === 'pavimento')
      ventajas.push(`Vialidad de ${prop.pavement_type === 'concreto' ? 'concreto hidráulico' : 'asfalto'}: acceso cómodo y de buena imagen para el comprador.`);
    else if (prop.pavement_type === 'terraceria' || prop.pavement_type === 'empedrado')
      desventajas.push(`Vialidad de ${prop.pavement_type}: puede generar percepción negativa; resalta atributos interiores del inmueble.`);

    // Street type
    const streetLabels = { local: 'calle local/barrial', barrial: 'calle barrial', distrital: 'avenida distrital', regional: 'avenida regional', peatonal: 'calle peatonal' };
    const isCommercialType = ['Local comercial', 'Bodega', 'Oficina', 'Nave industrial'].includes(prop.property_type);
    if (isCommercialType && (prop.street_type === 'regional' || prop.street_type === 'distrital'))
      ventajas.push(`Ubicado en ${streetLabels[prop.street_type] || prop.street_type}: alta visibilidad y flujo peatonal/vehicular para uso comercial.`);
    else if (!isCommercialType && (prop.street_type === 'local' || prop.street_type === 'barrial'))
      ventajas.push(`Calle ${streetLabels[prop.street_type] || prop.street_type}: menor tránsito y mayor privacidad, atributo valorado en uso residencial.`);
    else if (!isCommercialType && prop.street_type === 'regional')
      desventajas.push(`Ubicación en avenida regional: mayor tráfico y ruido; resalta la aislación acústica y accesibilidad como atributo.`);

    // Elevator/Level
    if (prop.property_type === 'Departamento') {
      const hasElevator = (prop.special_features || []).includes('elevator');
      const level = parseInt(prop.property_level) || 0;
      if (hasElevator)
        ventajas.push(`Acceso por elevador: el inmueble tiene elevador, lo que elimina barreras de accesibilidad y amplia el perfil del comprador.`);
      else if (level >= 3)
        desventajas.push(`Piso ${level} sin elevador: puede limitar el interés de adultos mayores o familias con niños pequeños.`);
    }

    // Construction quality
    const qualityDescs = { 'Lujo': 'de lujo', 'Superior': 'superior', 'Medio Alto': 'medio-alta', 'Medio Medio': 'media', 'Medio Bajo': 'económica-media' };
    if (prop.construction_quality && (prop.construction_quality.includes('Lujo') || prop.construction_quality.includes('Superior')))
      ventajas.push(`Acabados de calidad ${qualityDescs[prop.construction_quality] || prop.construction_quality}: aspecto premium que justifica el precio ante compradores exigentes.`);

    // Special features bonus
    const features = prop.special_features || [];
    if (features.includes('pool')) ventajas.push('Cuenta con alberca: diferenciador clave frente a la competencia sin esta amenidad.');
    if (features.includes('security')) ventajas.push('Sistema de seguridad 24/7: atributo de alta valoración en zonas residenciales.');
    if (features.includes('solar_panels')) ventajas.push('Paneles solares instalados: tendencia en alta demanda que reduce costos elecónicos.');

    // Padding
    if (ventajas.length === 0) ventajas.push(`Ubicación en ${prop.neighborhood}, ${prop.municipality}: colonia con infraestructura y servicios establecidos.`);
    if (ventajas.length < 2) ventajas.push(`Superficie de construcción de ${prop.construction_area} m² competitiva frente a la oferta del mercado local.`);
    if (desventajas.length === 0) desventajas.push('Edad del inmueble requiere validación física de instalaciones hidráulicas y eléctricas.');

    // Sales strategy
    const streetTypeForStrategy = prop.street_type === 'regional' ? 'portales de alto tráfico (Inmuebles24, Vivanuncios)' : 'redes sociales y grupos de WhatsApp del vecindario';
    estrategia_venta.push(`Publicar en ${streetTypeForStrategy} con fotografía profesional para captar compradores cualificados rápidamente.`);
    estrategia_venta.push(`Perfil del comprador ideal: ${isCommercialType ? 'empresario o inversionista buscando local con buena visibilidad' : `familia o pareja que valora la ubicación en ${prop.neighborhood}`}. Orienta el mensaje de venta a sus prioridades.`);
    estrategia_venta.push(`Precio de lista entre ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valuation.result.value_range_min)} y ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valuation.result.value_range_max)}. Iniciar en el extremo superior y ajustar en 30–45 días si no genera visitas calificadas.`);

    valuation.result.ai_insights = {
      conclusions: [generateAnalysisText(prop, valuation.result, selectedComps)],
      recommendations: ["Consultar con un valuador certificado para avalúo con fines hipotecarios."],
      ventajas,
      desventajas,
      estrategia_venta,
      total_active_listings: 45,
      nearby_amenities: nearby
    };
  }

  valuation.status = 'completed';
  valuation.updated_at = new Date().toISOString();
  res.json(valuation.result);
});

app.post('/api/valuations/:id/generate-report', (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const { include_analysis } = req.query;
  const showAI = include_analysis === 'true';

  const prop = valuation.property_data;
  const result = valuation.result;
  const selectedComps = valuation.comparables.filter(c => (valuation.selected_comparables || []).includes(c.comparable_id));

  // Pre-calculate selected special features labels
  const SPECIAL_FEATURES_MAP = {
    'parking': 'Cochera', 'pool': 'Alberca', 'garden': 'Jardín', 'patio': 'Patio',
    'terrace': 'Terraza', 'gym': 'Gimnasio', 'security': 'Seguridad 24/7', 'elevator': 'Elevador',
    'rooftop': 'Roof Garden', 'service_room': 'Cto. Servicio', 'laundry_room': 'Cto. Lavado',
    'storage': 'Bodega/Almacén', 'kitchen_integral': 'Cocina Integral', 'solar_panels': 'Paneles Solares',
    'solar_heater': 'Calentador Solar', 'cistern': 'Cisterna', 'electric_fence': 'Cerca Eléctrica', 'ac': 'Aire Acondicionado'
  };

  // Basic badges to show at the top
  const badgeIcons = {
    'beds': '🛏️', 'baths': '🚽', 'parking': '🚗', 'age': '📅',
    'laundry': '🧺', 'kitchen': '🍳', 'service': '🏠', 'garden': '🌳', 'patio': '🪴',
    'ac': '💨', 'gym': '🏋️', 'security': '🛡️', 'pool': '🏊', 'terrace': '🌅',
    'rooftop': '🌇', 'elevator': '🛗', 'storage': '📦', 'cistern': '💧',
    'solar_heater': '🌡️', 'solar_panels': '☀️', 'electric_fence': '⚡'
  };

  const topBadges = [];
  topBadges.push({ icon: badgeIcons.beds, text: `${prop.bedrooms || 3} Recámaras` });
  topBadges.push({ icon: badgeIcons.baths, text: `${prop.bathrooms || 2.5} Baños` });
  topBadges.push({ icon: badgeIcons.parking, text: `${prop.parking_spots || 2} Cocheras` });
  topBadges.push({ icon: badgeIcons.age, text: `${prop.estimated_age || 0} Años de Edad` });

  // Dynamic badges from special features
  const features = prop.special_features || [];
  if (features.includes('laundry_room')) topBadges.push({ icon: badgeIcons.laundry, text: 'Cuarto Lavado' });
  if (features.includes('kitchen_integral')) topBadges.push({ icon: badgeIcons.kitchen, text: 'Cocina Integral' });
  if (features.includes('service_room')) topBadges.push({ icon: badgeIcons.service, text: 'Cto. Servicio' });
  if (features.includes('garden')) topBadges.push({ icon: badgeIcons.garden, text: 'Jardín' });
  if (features.includes('patio')) topBadges.push({ icon: badgeIcons.patio, text: 'Patio' });
  if (features.includes('ac')) topBadges.push({ icon: badgeIcons.ac, text: 'Aire Acond.' });
  if (features.includes('gym')) topBadges.push({ icon: badgeIcons.gym, text: 'Gimnasio' });
  if (features.includes('security')) topBadges.push({ icon: badgeIcons.security, text: 'Seguridad' });
  if (features.includes('pool')) topBadges.push({ icon: badgeIcons.pool, text: 'Alberca' });
  if (features.includes('terrace')) topBadges.push({ icon: badgeIcons.terrace, text: 'Terraza' });
  if (features.includes('rooftop')) topBadges.push({ icon: badgeIcons.rooftop, text: 'Roof Garden' });
  if (features.includes('elevator')) topBadges.push({ icon: badgeIcons.elevator, text: 'Elevador' });
  if (features.includes('storage')) topBadges.push({ icon: badgeIcons.storage, text: 'Bodega' });
  if (features.includes('cistern')) topBadges.push({ icon: badgeIcons.cistern, text: 'Cisterna' });
  if (features.includes('solar_heater')) topBadges.push({ icon: badgeIcons.solar_heater, text: 'Calent. Solar' });
  if (features.includes('solar_panels')) topBadges.push({ icon: badgeIcons.solar_panels, text: 'Paneles Sol.' });
  if (features.includes('electric_fence')) topBadges.push({ icon: badgeIcons.electric_fence, text: 'Cerca Eléc.' });

  // Filter out badge features from the special features list to avoid repetition
  // Filter out badge features from the special features list to avoid repetition
  const badgeFeatureIds = ['parking', 'laundry_room', 'kitchen_integral', 'service_room', 'garden', 'patio', 'ac', 'gym', 'security', 'pool', 'terrace', 'rooftop', 'elevator', 'storage', 'cistern', 'solar_heater', 'solar_panels', 'electric_fence'];
  const remainingFeatureLabels = features
    .filter(id => !badgeFeatureIds.includes(id))
    .map(id => SPECIAL_FEATURES_MAP[id])
    .filter(Boolean);

  const selectedFeatureLabels = remainingFeatureLabels; // For compatibility below

  // Generate original template analysis
  const templateAnalysis = generateAnalysisText(prop, result, selectedComps);

  // Weights for breakdown chart
  const landPercent = Math.round((result.land_value / result.physical_total) * 100);
  const constPercent = 100 - landPercent;

  // Thermometer logic: Market Liquidity & Probability of Sale
  const subjectPriceSqM = result.price_per_sqm;
  const avgCompPriceSqM = selectedComps.reduce((acc, c) => acc + c.price_per_sqm, 0) / selectedComps.length;
  const priceRatio = subjectPriceSqM / avgCompPriceSqM;

  // 1. Price Competitiveness Factor (Higher price = lower probability)
  let priceAdj = 1.0;
  if (priceRatio < 0.9) priceAdj = 1.5;       // 50% more likely if very cheap
  else if (priceRatio < 0.97) priceAdj = 1.25;
  else if (priceRatio > 1.15) priceAdj = 0.5; // 50% less likely if very expensive
  else if (priceRatio > 1.05) priceAdj = 0.75;

  // 2. Conservation Factor (HIGH PRIORITY)
  const conservationAdjustments = { 'Excelente': 1.4, 'Bueno': 1.15, 'Regular': 0.75, 'Malo': 0.4 };
  const consAdj = conservationAdjustments[prop.conservation_state] || 1.0;

  // 3. Location / Configuration Factors
  let locAdj = 1.0;
  
  // Street Type & Pavement
  const isCommercial = ['Local comercial', 'Bodega', 'Oficina', 'Nave industrial'].includes(prop.property_type);
  if (isCommercial) {
    if (prop.street_type === 'regional' || prop.street_type === 'distrital') locAdj *= 1.25;
    if (prop.street_type === 'peatonal') locAdj *= 0.6;
  } else {
    // Residential favors local/barrial
    if (prop.street_type === 'local' || prop.street_type === 'barrial') locAdj *= 1.1;
    if (prop.street_type === 'regional') locAdj *= 0.85; // Too noisy
    if (prop.street_type === 'peatonal') locAdj *= 1.05; // Quiet
  }

  // Pavement quality
  const pavementAdj = { 'concreto': 1.15, 'pavimento': 1.05, 'adoquin': 1.0, 'empedrado': 0.85, 'terraceria': 0.65 };
  locAdj *= (pavementAdj[prop.pavement_type] || 1.0);

  // Apartment Level & Elevator Penalty (Psicológico en termómetro)
  if (prop.property_type === 'Departamento') {
    const hasElevator = (prop.special_features || []).includes('elevator');
    const level = parseInt(prop.property_level) || 0;
    if (!hasElevator && level >= 2) {
      // Penalty visual en termómetro: 3% por nivel (un poco más sensible que el valor monetario)
      locAdj *= (1 - (level * 0.03));
    }
  }

  // 4. Market Probability (Heuristic based on total supply)
  // Get supply count from AI or fallback to estimate
  const totalMarketSupply = (result.ai_insights && result.ai_insights.total_active_listings)
    ? result.ai_insights.total_active_listings
    : Math.max(80, Math.round(avgCompPriceSqM / 4000) * 12); 
  
  // Base Probability: 1 in Supply
  const baseProb = 1 / totalMarketSupply;
  const adjProb = baseProb * priceAdj * consAdj * locAdj;
  
  // Liquidity Index (Normalized 0-100)
  const liquidityIndex = (adjProb / baseProb) * 50; 
  
  const thermoScore = Math.min(Math.max(liquidityIndex, 10), 95);
  const thermoPosition = 10 + (thermoScore * 0.8);
  
  const positionLabel = thermoScore >= 70 ? "Ventaja competitiva" : (thermoScore >= 45 ? "Valor medio o justo" : "Requiere ajuste");
  const advantageDescription = thermoScore >= 70 
    ? "Alta probabilidad de desplazamiento. Las condiciones físicas y de ubicación superan significativamente la oferta promedio." 
    : (thermoScore >= 45 ? "Posicionamiento equilibrado. La propiedad compite en igualdad de condiciones con la oferta activa del sector." : "Baja probabilidad de captación inmediata. El precio o las condiciones de la vialidad/nivel limitan drásticamente su competitividad.");

  const sellingTips = [
    { icon: "🎨", title: "Presentación", desc: "Aplique pintura fresca en fachada e interiores con colores neutros (blanco, beige, gris claro) que amplían visualmente los espacios" },
    { icon: "✨", title: "Limpieza Profunda", desc: "Realice limpieza profesional incluyendo ventanas, azulejos, alfombras. Elimine olores con ventilación y aromatizantes suaves" },
    { icon: "📷", title: "Fotografía Profesional", desc: "Las propiedades con fotos profesionales reciben hasta 3 veces más visitas. Considere video y tour virtual 360°" },
    { icon: "🏠", title: "Preparación del Inmueble", desc: "Despersonalice retirando fotos familiares. Ordene closets, reduzca muebles. Los espacios vacíos se ven más amplios" },
    { icon: "🔧", title: "Reparaciones Menores", desc: "Arregle fugas, grietas, cerraduras, apagadores. Los detalles visibles restan valor percibido al comprador" },
    { icon: "💰", title: "Estrategia de Precio", desc: "Precio justo de mercado vende 30% más rápido. Un precio alto ahuyenta compradores y alarga el tiempo de venta" },
    { icon: "📋", title: "Documentación Legal", desc: "Tenga al corriente escrituras, predial, agua, CFE. Certifique libertad de gravamen y agilice el proceso" },
    { icon: "☀️", title: "Iluminación", desc: "Abra cortinas y ventanas antes de cada visita. Una propiedad iluminada y fresca se siente más amplia y acogedora" },
  ];

  const logoHtml = `
    <div class="logo-container" style="display: flex; align-items: center; gap: 8px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B4332" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="7" height="10" rx="1.5"/>
        <rect x="10" y="5" width="11" height="16" rx="1.5"/>
        <line x1="14" y1="9" x2="17" y2="9" />
        <line x1="14" y1="13" x2="17" y2="13" />
        <line x1="14" y1="17" x2="17" y2="17" />
        <line x1="6" y1="15" x2="7" y2="15" />
      </svg>
      <div class="logo" style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 24px; color: #1B4332; letter-spacing: -0.5px;">Prop<span style="color: #52B788;">Valu</span></div>
    </div>
  `;

  // Calcular folio: Est-YYMMDD-NN (consecutivo del día)
  const _now = new Date();
  const _yy = String(_now.getFullYear()).slice(-2);
  const _mm = String(_now.getMonth() + 1).padStart(2, '0');
  const _dd = String(_now.getDate()).padStart(2, '0');
  const _dateStr = _yy + _mm + _dd;
  const _todayPrefix = _now.toISOString().slice(0, 10);
  const _prevCount = Object.values(valuations).filter(v =>
    v.valuation_id !== valuation.valuation_id &&
    v.report_generated_at &&
    v.report_generated_at.startsWith(_todayPrefix)
  ).length;
  const _consec = String(_prevCount + 1).padStart(2, '0');
  const folioStr = `Est-${_dateStr}-${_consec}`;
  valuation.report_generated_at = _now.toISOString();

  const headerHtml = `
    <div class="header">
      ${logoHtml}
      <div class="report-meta" style="font-size: 8px;">
        <div>Folio: ${folioStr}</div>
        <div>Fecha: ${_now.toLocaleDateString('es-MX')}</div>
      </div>
    </div>
  `;

  valuation.report_html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <link rel="stylesheet" href="/report.css">
    </head>
    <body>
      <div class="page">
        ${headerHtml}

        <div class="banner">
          📊 ESTIMACIÓN DE VALOR DE MERCADO
        </div>

        <div class="section">
          <h2>🏠 DATOS DEL INMUEBLE</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: var(--gray-100); border: 1px solid var(--gray-200); border-radius: 8px; overflow: hidden; font-size: 11.5px;">
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; grid-column: span 3;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px;">
                <div>
                  <span style="color:var(--gray-500); margin-right: 5px;">📍 Ubicación:</span>
                  <span style="font-weight:700; font-size: 12.5px;">${(prop.street_address ? prop.street_address + ', ' : '')}${prop.neighborhood.toUpperCase()}, ${prop.municipality.toUpperCase()}, ${prop.state}</span>
                </div>
                ${(prop.surface_source || '').includes('Predial') ? `
                <div style="color: #b91c1c; text-align: center; max-width: 50%;">
                  <span style="font-size: 12.5px; font-weight: 800;">⚠️ Nota Técnica:</span><br>
                  <span style="font-size: 10px; line-height: 1.1; display: inline-block;">Las superficies de Predial no están validadas físicamente. Discrepancias impactarán la precisión del valor.</span>
                </div>` : ''}
              </div>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">📐 Terreno</span>
              <span style="font-weight:700">${prop.land_area} m²</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">🏗 Construcción</span>
              <span style="font-weight:700">${prop.construction_area} m²</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">🏘 Tipo</span>
              <span style="font-weight:700">${prop.property_type}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">📜 Régimen</span>
              <span style="font-weight:700">${prop.land_regime || 'URBANO'}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">🏢 Niveles</span>
              <span style="font-weight:700">${prop.property_level || 'PB'} de ${prop.total_floors || '1'}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">🏗️ Uso de Suelo</span>
              <span style="font-weight:700">${prop.land_use || 'H2/20'}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">📄 Fuente info.</span>
              <span style="font-weight:700">${prop.surface_source || 'No especificada'}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">🚩 Vialidad</span>
              <span style="font-weight:700">${(prop.street_type || 'local').toUpperCase()} - ${(prop.pavement_type || 'concreto').toUpperCase()}</span>
            </div>
            <div style="background: white; padding: 7px 12px; display: flex; flex-direction: column; justify-content: center;">
              <span style="color:var(--gray-500); font-size: 10.5px;">📅 Antigüedad</span>
              <span style="font-weight:700">${prop.estimated_age || 0} años</span>
            </div>
          </div>

          <div class="amenity-grid">
            ${topBadges.map(b => `<div class="amenity-badge"><span>${b.icon}</span> ${b.text}</div>`).join('')}
          </div>

          ${prop.other_features ? `
          <div style="margin-top: 8px; padding: 10px 12px; background: #f7fee7; border: 1.5px solid #d9f99d; border-radius: 8px;">
            <div style="font-size: 10px; font-weight: 800; color: var(--primary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">✨ OTROS ELEMENTOS IMPORTANTES:</div>
            <div style="font-size: 13px; font-weight: 700; color: #081C15; line-height: 1.5;">${prop.other_features}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>📍 UBICACIÓN Y FACHADA</h2>
          <div style="height: 6px;"></div>
          
          <div style="display: flex; gap: 10px; align-items: stretch;">
            <div class="map-container" style="flex: 1; height: 240px; position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200);">
              <img class="map-image" src="https://maps.googleapis.com/maps/api/staticmap?center=${prop.latitude},${prop.longitude}&zoom=16&size=600x800&maptype=roadmap&markers=color:red%7C${prop.latitude},${prop.longitude}&key=${GOOGLE_MAPS_API_KEY}" alt="Mapa" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            ${(prop.facade_photo_index !== null && prop.photos && prop.photos[prop.facade_photo_index]) ? `
              <div style="flex: 1; height: 240px; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200);">
                <img src="${prop.photos[prop.facade_photo_index]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Fachada">
              </div>
            ` : ''}
          </div>
          <div style="font-size: 11px; color: var(--gray-500); margin-top: 5px; text-align: right;">
            📌 Coordenadas: ${prop.latitude.toFixed(6)}, ${prop.longitude.toFixed(6)}
          </div>

          <!-- PLUSVALÍA PROYECTADA + PERFIL DEL ENTORNO — columnas simétricas 50/50 -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
            <!-- Plusvalía proyectada bar chart -->
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📈 PLUSVALÍA PROYECTADA (5 AÑOS)</div>
              <div style="display: flex; align-items: flex-end; gap: 5px; height: 80px; overflow: visible;">
                ${result.investment_indicators.plusvalia_proyectada.map((p, i) => {
    // Alturas seguras: pct-label(~10px) + gap(2px) + bar + year-label(~11px) ≤ 80px → max barra = 57px
    const pxH = [8, 17, 29, 41, 55][i] || 17;
    const barColor = ['#a7f3d0','#6ee7b7','#34d399','#10b981','#059669'][i];
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:80px;">
                    <div style="font-size:7.5px;font-weight:800;color:#15803d;margin-bottom:2px;">+${p.pct}%</div>
                    <div style="width:100%;background:${barColor};border-radius:3px 3px 0 0;height:${pxH}px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                    <div style="font-size:7px;color:var(--gray-500);font-weight:600;margin-top:2px;text-align:center;">${p.year}</div>
                  </div>`;
  }).join('')}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7.5px; font-weight: 700; color: var(--gray-700); margin-top: 4px; padding: 0 4px;">
                ${result.investment_indicators.plusvalia_proyectada.map(p => `<span>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.estimated_value * (1 + p.pct/100))}</span>`).join('')}
              </div>
              <div style="font-size: 10px; color: var(--gray-600); font-weight: 500; margin-top: 6px; font-style: italic; line-height: 1.2;">* Los montos son un supuesto basado en la apreciación histórica local. Tasa anual est.: ~${result.investment_indicators.plusvalia_anual}% (Fuente: SHF / BBVA).</div>
            </div>
            <!-- Perfil del entorno -->
            <div style="background: white; border: 1.5px solid var(--gray-200); border-radius: 10px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📍 PERFIL DEL ENTORNO</div>
              ${(result.ai_insights && result.ai_insights.nearby_amenities) ? `
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10.5px;">
                <div style="display:flex;align-items:center;gap:5px;"><span>🛡</span><span style="color:var(--gray-500)">Seguridad:</span><span style="font-weight:700;">Zona con vigilancia regular</span></div>
                <div style="display:flex;align-items:center;gap:5px;"><span>🚗</span><span style="color:var(--gray-500)">Movilidad:</span><span style="font-weight:700;">Acceso a vialidades de primer orden</span></div>
                ${result.ai_insights.nearby_amenities.filter(a => ['escuelas', 'hospitales', 'supermercados', 'parques', 'plazas'].includes(a.key)).map(a => {
    const cat = { escuelas: '📚 Educación', hospitales: '🏥 Salud', supermercados: '🛒 Comercio', parques: '🌳 Recreación', plazas: '🛍 Plazas' }[a.key] || a.label;
    return `<div style="display:flex;align-items:center;gap:5px;"><span>${a.icon}</span><span style="color:var(--gray-500)">${cat.split(' ').slice(1).join(' ')}:</span><span style="font-weight:700;">${a.count}+ ${a.label.toLowerCase()} cercanos</span></div>`;
  }).join('')}
              </div>` : `<div style="font-size:10px;color:var(--gray-500);">Datos de entorno no disponibles.</div>`}
            </div>
          </div>
        </div>
      </div>
      <!-- PAGE 2: VALOR Y ESTRATEGIA -->
      <div class="page">
        ${headerHtml}
        <div class="main-value-box" style="padding: 18px 20px; background: linear-gradient(135deg, #1B4332 0%, #081C15 100%);">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 3px; color: var(--accent); text-transform: uppercase; margin-bottom: 14px;">💰 VALOR MEDIO O JUSTO</div>
          
          <div class="value-grid-3">
            <!-- Izquierda: Valor Máximo -->
            <div style="text-align: center;">
              <div style="font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">VALOR MÁXIMO</div>
              <div style="font-size: 22px; font-weight: 700; color: #D9ED92;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_max)}</div>
            </div>

            <!-- Centro: Valor Medio -->
            <div style="text-align: center; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); padding: 0 10px;">
              <div style="font-size: 52px; font-weight: 800; line-height: 1; color: #FFFFFF; letter-spacing: -1px;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.estimated_value)}</div>
              <div style="font-size: 14px; font-weight: 700; color: var(--accent); margin-top: 8px;">M.N. (VALOR ANALIZADO)</div>
            </div>

            <!-- Derecha: Valor Mínimo -->
            <div style="text-align: center;">
              <div style="font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">VALOR MÍNIMO</div>
              <div style="font-size: 22px; font-weight: 700; color: #D9ED92;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_min)}</div>
            </div>
          </div>

          <div style="margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 25px;">
             <div style="font-size: 16px; font-weight: 600; color: #FFFFFF;">Precio por m²: <span style="color: var(--accent);">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.price_per_sqm)}/m²</span></div>
             <div class="trust-badge" style="margin-top: 0; background: rgba(255,255,255,0.1); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.2);">📈 Confianza: ALTO</div>
          </div>
        </div>

        <div class="section">
          <h2>🌡 Posición Competitiva en el Mercado: ${positionLabel}</h2>
          <div style="font-size: 11px; color: var(--gray-500); margin-bottom: 10px;">${advantageDescription}</div>
          <div class="thermometer" style="height: 20px; border-radius: 10px;">
            <div class="thermo-marker" style="left: ${thermoPosition}%; height: 28px; width: 10px;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--gray-700); margin-top: 5px;">
            <div style="color: #dc2626;">Desventaja</div>
            <div>⚖ Equilibrio</div>
            <div style="color: #22c55e;">Ventaja</div>
          </div>

          <div class="info-grid-3">
            <div class="info-card">
              <div class="info-label">Conservación</div>
              <div class="info-value">${prop.conservation_state || 'Bueno'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">$/m² vs Mercado</div>
              <div class="info-value"><span style="font-size: 11px;">$${new Intl.NumberFormat('es-MX').format(result.price_per_sqm)}</span> vs <span style="font-size: 11px;">$${new Intl.NumberFormat('es-MX').format(avgCompPriceSqM)}</span></div>
            </div>
            <div class="info-card">
              <div class="info-label">Oferta Similar</div>
              <div class="info-value">${totalMarketSupply}+ Propiedades</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>📊 RESUMEN EJECUTIVO</h2>
          <div class="summary-cards-4">
            <div class="summary-card highlight">
              <div class="summary-value">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.estimated_value)}</div>
              <div class="summary-label">Valor Venta</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.market_metrics.monthly_rent_estimate)}</div>
              <div class="summary-label">Renta/Mes</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.physical_total)}</div>
              <div class="summary-label">Valor Físico</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${prop.construction_area} m²</div>
              <div class="summary-label">Construcción</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px;">
            <div style="background: var(--gray-50); padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--gray-100);">
              <span style="color:var(--gray-500); font-size: 10px;">📉 Valor Mínimo</span>
              <span style="font-weight:700; color: #dc2626; font-size: 11.5px;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_min)}</span>
            </div>
            <div style="background: var(--gray-50); padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--gray-100);">
              <span style="color:var(--gray-500); font-size: 10px;">📈 Valor Máximo</span>
              <span style="font-weight:700; color: #22c55e; font-size: 11.5px;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(result.value_range_max)}</span>
            </div>
          </div>
        </div>

        <!-- INDICADORES DE INVERSIÓN (new section from PDF) -->
        <div class="section">
          <h2>📊 INDICADORES DE INVERSIÓN</h2>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
            <div style="text-align:center; padding:10px 6px; border-radius:8px; background:#f0fdf4; border:1.5px solid #bbf7d0;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500);margin-bottom:4px;">CAP RATE</div>
              <div style="font-size:20px;font-weight:800;color:${result.investment_indicators.cap_rate >= 8 ? '#15803d' : result.investment_indicators.cap_rate >= 6 ? '#1B4332' : '#92400e'}">${result.investment_indicators.cap_rate}%</div>
              <div style="font-size:8px;color:var(--gray-500);margin-top:2px;">vs CETES ${result.investment_indicators.cetes_rate}%</div>
            </div>
            <div style="text-align:center; padding:10px 6px; border-radius:8px; background:#f0fdf4; border:1.5px solid #bbf7d0;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500);margin-bottom:4px;">PLUSVALÍA ANUAL</div>
              <div style="font-size:20px;font-weight:800;color:#15803d;">${result.investment_indicators.plusvalia_anual}%</div>
              <div style="font-size:8px;color:var(--gray-500);margin-top:2px;">Estimada</div>
            </div>
            <div style="text-align:center; padding:10px 6px; border-radius:8px; background:#f8fafc; border:1.5px solid var(--gray-200);">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500);margin-bottom:4px;">PAYBACK</div>
              <div style="font-size:20px;font-weight:800;color:var(--primary);">${result.investment_indicators.payback_years}</div>
              <div style="font-size:8px;color:var(--gray-500);margin-top:2px;">años (Recup. renta)</div>
            </div>
            <div style="text-align:center; padding:10px 6px; border-radius:8px; background:#f0fdf4; border:1.5px solid #bbf7d0;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500);margin-bottom:4px;">ROI 10 AÑOS</div>
              <div style="font-size:20px;font-weight:800;color:#15803d;">${result.investment_indicators.roi_10_years}%</div>
              <div style="font-size:8px;color:var(--gray-500);margin-top:2px;">Renta+Plusvalía</div>
            </div>
            <div style="text-align:center; padding:10px 6px; border-radius:8px; background:${result.investment_indicators.dif_cap_cetes >= 0 ? '#f0fdf4' : '#fef2f2'}; border:1.5px solid ${result.investment_indicators.dif_cap_cetes >= 0 ? '#bbf7d0' : '#fecaca'};">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500);margin-bottom:4px;">DIF. CAP-CETES</div>
              <div style="font-size:20px;font-weight:800;color:${result.investment_indicators.dif_cap_cetes >= 0 ? '#15803d' : '#dc2626'};">${result.investment_indicators.dif_cap_cetes > 0 ? '+' : ''}${result.investment_indicators.dif_cap_cetes}%</div>
              <div style="font-size:8px;color:var(--gray-500);margin-top:2px;">${result.investment_indicators.dif_cap_cetes >= 0 ? '▲ Sobre CETES' : '▼ Abajo CETES'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>⚖ DESGLOSE DE VALOR FÍSICO</h2>
          <div class="physical-value-grid" style="display: grid; grid-template-columns: 80px 1.5fr 1fr 1.2fr; gap: 15px; align-items: center; padding: 12px; border: 1px solid var(--gray-200); border-radius: 8px; background: white;">
            <!-- Col 1: Pie -->
            <div class="chart-pie" style="background: conic-gradient(var(--primary) 0% ${landPercent}%, var(--secondary) ${landPercent}% 100%); width: 70px; height: 70px;"></div>
            
            <!-- Col 2: Labels -->
            <div style="font-size: 11px; color: var(--gray-700);">
              <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;"><div style="width: 8px; height: 8px; background: var(--primary); border-radius: 1px;"></div> Valor Terreno <span style="font-weight:800;color:var(--primary);margin-left:4px;">${landPercent}%</span></div>
              <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 8px; height: 8px; background: var(--secondary); border-radius: 1px;"></div> Valor Const. <span style="font-weight:800;color:var(--secondary);margin-left:4px;">${constPercent}%</span></div>
            </div>
            
            <!-- Col 3: Reference Info -->
            <div style="text-align: center; font-size: 12px; color: var(--gray-700); border-left: 1.5px solid var(--gray-100); border-right: 1.5px solid var(--gray-100); padding: 0 8px;">
              <div style="text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px; color: var(--gray-500);">Valor Ref. m²</div>
              <div style="font-weight: 800; color: var(--primary); font-size: 15px;">$${new Intl.NumberFormat('es-MX').format(result.price_per_sqm)}</div>
              <div style="font-size: 10px; font-weight: 700; margin-top: 6px; color: var(--gray-500);">Depreciación: ${result.depreciation_percent}%</div>
            </div>
            
            <!-- Col 4: Totals -->
            <div style="text-align: right; font-size: 11px;">
              <div style="font-weight: 600; color: var(--gray-500); margin-bottom: 4px;">$${new Intl.NumberFormat('es-MX').format(result.land_value)}</div>
              <div style="font-weight: 600; color: var(--gray-500); margin-bottom: 4px;">$${new Intl.NumberFormat('es-MX').format(result.construction_depreciated)}</div>
              <div style="border-top: 1.5px solid var(--primary); margin-top: 4px; padding-top: 4px; font-weight: 800; color: var(--primary); font-size: 13px;">
                 $${new Intl.NumberFormat('es-MX').format(result.physical_total)}
              </div>
            </div>
          </div>
          <div class="warning-box-pro">
             <div class="warning-title">⚠️ Consideraciones del Cálculo Físico</div>
             <div class="warning-text"><strong>Referencia Técnica:</strong> El valor físico (Costo de Reposición) es un parámetro técnico-estructural y no constituye necesariamente el valor de oferta comercial. Su objetivo es medir la representatividad de la inversión en terreno y construcción.</div>
             <div class="warning-text"><strong>Validación de Superficies:</strong> Los datos de m² provenientes de fuentes administrativas no sustituyen una medición física pericial. Cualquier variación en las áreas reales afectará la precisión de las cifras presentadas.</div>
          </div>
        </div>

      </div>

      <!-- PAGE 3: COMPARABLES Y ANÁLISIS -->
      <div class="page">
        ${headerHtml}
        <div class="section">
          <h2>🔍 COMPARABLES SELECCIONADOS (${selectedComps.length})</h2>
          <table class="comparables-table">
            <thead>
              <tr>
                <th class="text-center">#</th>
                <th>Colonia</th>
                <th class="text-right">Terr.</th>
                <th class="text-right">Const.</th>
                <th class="text-right">Precio</th>
                <th class="text-right">$/m²</th>
                <th class="text-right">Aj.</th>
                <th class="text-right">$/m² Aj.</th>
                <th class="text-right">Fuente</th>
              </tr>
            </thead>
            <tbody>
              ${selectedComps.map((c, i) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td style="font-size: 10px; line-height:1.2; vertical-align: middle;">
                    <div style="font-weight:700; color: #1a2e23;">${c.neighborhood}</div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
                      ${c.street_address ? `<div style="font-size:9px; color:var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${c.street_address}</div>` : '<div></div>'}
                      ${(c.bedrooms || c.bathrooms || c.parking) ? `
                        <div style="font-size: 10.5px; color: #0284c7; font-weight: 600; white-space: nowrap; margin-top: 1px;">
                          ${c.bedrooms ? c.bedrooms + ' 🛌' : ''} ${c.bathrooms ? c.bathrooms + ' 🚿' : ''} ${c.parking ? c.parking + ' 🚗' : ''}
                        </div>
                      ` : ''}
                    </div>
                  </td>
                  <td class="text-right">${c.land_area}</td>
                  <td class="text-right">${c.construction_area}</td>
                  <td class="text-right">${new Intl.NumberFormat('es-MX').format(c.price)}</td>
                  <td class="text-right">${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(c.price_per_sqm)}</td>
                  <td class="text-right" style="color: ${c.total_adjustment < 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${Number(c.total_adjustment).toFixed(1)}%</td>
                  <td class="text-right" style="font-weight: 700;">${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Math.round(c.price_per_sqm * (1 + c.total_adjustment / 100)))}</td>
                  <td class="text-right">
                    <a href="${c.source_url || '#'}" target="_blank" style="color: var(--secondary); font-size: 9px; text-decoration: none; font-weight: 700;">
                      ${c.source || 'Enlace'}
                    </a>
                    ${(c.last_updated && (c.last_updated.includes('meses') || c.last_updated.includes('año'))) ? '<br><span style="font-size: 8px; color: #92400e;">(Histórico)</span>' : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <!-- VENTAJAS -->
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">✅ VENTAJAS COMPETITIVAS</div>
              <ul style="margin: 0; padding-left: 15px; font-size: 11.5px; color: #1a2e23; line-height: 1.4;">
                ${(showAI && result.ai_insights?.ventajas) 
                  ? result.ai_insights.ventajas.map(v => `<li style="margin-bottom: 4px;">${v}</li>`).join('')
                  : '<li>Ubicación estratégica</li><li>Superficie competitiva</li><li>Plusvalía en la zona</li>'}
              </ul>
            </div>
            <!-- DESVENTAJAS -->
            <div style="background: #fff7ed; border: 1.5px solid #ffedd5; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">⚠️ ÁREAS DE OPORTUNIDAD</div>
              <ul style="margin: 0; padding-left: 15px; font-size: 11.5px; color: #431407; line-height: 1.4;">
                ${(showAI && result.ai_insights?.desventajas) 
                  ? result.ai_insights.desventajas.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')
                  : '<li>Antigüedad perceptible</li><li>Necesita actualizaciones menores</li>'}
              </ul>
            </div>
          </div>

          <h2>📝 Análisis Estratégico de Mercado</h2>
          <div class="analysis-box" style="font-size: 11px; line-height: 1.35; border-left: 4px solid var(--secondary); background: #fcfcfc; padding: 12px 15px; color: var(--gray-700); margin-bottom: 5px; height: auto; max-height: 90px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; text-overflow: ellipsis;">
            ${(() => {
              const text = (showAI && result.ai_insights?.conclusions)
                ? result.ai_insights.conclusions[0]
                : templateAnalysis;
              // Simply render as text to make line-clamp work safely without complex nested flex layouts breaking it.
              return `<div style="text-align: justify; margin: 0;">${text.replace(/(<([^>]+)>)/gi, "").trim()}</div>`;
            })()}
          </div>
        </div>

        <!-- METODOLOGÍA DE VALUACIÓN -->
        <div style="margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid var(--gray-200); border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">🏛 METODOLOGÍA DE VALUACIÓN</div>
          <div style="font-size: 10px; color: var(--gray-700); line-height: 1.5;">
            Se aplicó el <strong>Método de Comparación de Mercado con Homologación Técnica</strong>. A cada comparable se le aplicaron factores de ajuste por: <strong>Edad (Ross-Heidecke)</strong>, <strong>Estado de Conservación</strong> y <strong>Margen de Negociación</strong> comercial. El valor final es un promedio ponderado que prioriza la <strong>mediana estadística</strong> para eliminar valores atípicos.
          </div>
          <div style="font-size: 8.5px; color: var(--gray-500); margin-top: 4px;">Norma: INDAABIN · Manual de Valuación Bancaria SHF · Circular CNBV 1/2009</div>
        </div>
      </div>

      <!-- PAGE 4: ENTORNO Y ESTRATEGIA -->
      <div class="page">
        ${headerHtml}
        <div class="section">
          <h2>🏘️ EQUIPAMIENTO Y SERVICIOS RELEVANTES EN EL ENTORNO (RADIO 1.5 KM)</h2>
          <div class="services-grid-2">
            ${(result.ai_insights && result.ai_insights.nearby_amenities)
      ? (() => {
          let amenities = result.ai_insights.nearby_amenities;
          // Ensure even count so the 2-column grid has no orphan card
          const fillers = [
            { icon: '🏪', label: 'Comercios y Servicios', count: '+20', sub: 'Zona comercial activa', example_names: 'Tiendas de conveniencia, papelerías y negocios locales.' },
            { icon: '⛽', label: 'Gasolineras', count: '+5', sub: 'Combustible cercano', example_names: 'Estaciones de servicio en la zona.' }
          ];
          let fi = 0;
          while (amenities.length % 2 !== 0 || amenities.length < 8) {
            amenities = [...amenities, fillers[fi % fillers.length]];
            fi++;
          }
          return amenities.map(s => `
                <div class="service-card" style="padding: 10px 12px; gap: 8px;">
                  <div class="service-icon">${s.icon}</div>
                  <div style="flex: 1;">
                    <strong style="display: block; font-size: 13px; color: var(--primary);">${s.count} ${s.label}</strong>
                    <div style="font-size: 10px; color: var(--gray-500); margin-bottom: 2px;">${s.sub}</div>
                    <div style="font-size: 11px; font-weight: 600; color: #1B4332; line-height: 1.25;">
                      ${s.example_names || 'Múltiples opciones disponibles.'}
                    </div>
                  </div>
                </div>
              `).join('');
        })()
      : ''
    }
          </div>
        </div>

        <div class="section" style="margin-top: 10px;">
          <h2>📣 ESTRATEGIA DE COMERCIALIZACIÓN Y PROMOCIÓN</h2>
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">💼 RECOMENDACIONES PARA INMOBILIARIAS Y PROPIETARIOS</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(showAI && result.ai_insights?.estrategia_venta)
                ? result.ai_insights.estrategia_venta.map(tip => {
                    const colonIdx = tip.indexOf(':');
                    const hasTitle = colonIdx > 0 && colonIdx < 55;
                    const title = hasTitle ? tip.slice(0, colonIdx).trim() : '';
                    const desc  = hasTitle ? tip.slice(colonIdx + 1).trim() : tip;
                    return `
                  <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <span style="font-size: 15px;">🎯</span>
                    <div style="font-size: 11.5px; color: #1e3a8a; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${hasTitle ? `<strong style="font-weight:800;color:#1e40af;">${title}:</strong> ` : ''}${desc}</div>
                  </div>`;
                  }).join('')
                : '<div style="font-size: 11.5px; color: #1e3a8a;">Análisis de promoción no disponible.</div>'}
            </div>
          </div>

          <h2>💡 TIPS GENERALES DE PRESENTACIÓN (HOME STAGING)</h2>
          <div class="tips-grid" style="grid-template-columns: repeat(2, 1fr); gap: 6px;">
            ${sellingTips.slice(0, 6).map(t => `
              <div class="tip-item" style="padding: 6px 10px; border: 1px solid var(--gray-100); border-radius: 6px;">
                <span class="tip-icon" style="font-size: 18px;">${t.icon}</span>
                <div>
                  <strong style="font-size: 10.5px; color: var(--primary);">${t.title}:</strong>
                  <div style="font-size: 8.5px; margin-top: 1px; line-height: 1.1;">${t.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="disclaimer" style="margin-top: 12px; padding: 12px; border: 1.5px solid #f59e0b; background: #fffbeb; border-radius: 8px;">
          <div style="font-weight: 800; margin-bottom: 6px; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ AVISO LEGAL Y LIMITACIONES:</div>
          <div style="font-size: 10px; color: #92400e; line-height: 1.35; font-weight: 500;">
            Este documento es una opinión de valor generada mediante algoritmos de inteligencia artificial y análisis de datos de mercado. 
            No constituye un avalúo reglamentado por la SHF o normativas locales para fines hipotecarios. 
            El valor es una estimación estadística; la precisión depende de los datos proporcionados y la disponibilidad de comparables. 
            PropValu México no se hace responsable por decisiones comerciales tomadas con base en este reporte.
            <div style="margin-top: 6px; font-weight: 700; font-size: 9.5px;">🗓 Generado: ${_now.toLocaleDateString('es-MX')} · Folio: ${folioStr}</div>
          </div>
        </div>
      </div>${(prop.photos && prop.photos.length > 0) ? `<!-- PAGE 5: EVIDENCIA FOTOGRÁFICA --><div class="page photo-evidence-page" style="display: flex; flex-direction: column;">
        ${headerHtml}
        <div class="section" style="flex-grow: 1;">
          <h2>📸 Evidencia Fotográfica</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; align-items: start;">
            ${prop.photos.slice(0, 12).map(p => `
              <div style="border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200); background: #fdfdfd; display: block; break-inside: avoid;">
                <img src="${p}" style="width: 100%; height: auto; display: block;" alt="Foto Inmueble">
              </div>
            `).join('')}
          </div>
        </div>
        <div class="footer" style="padding-top: 8px; border-top: 1px solid var(--gray-200); margin-top: 12px;">
          <div style="display: flex; justify-content: center; opacity: 0.8;">${logoHtml}</div>
          <div style="text-align: center; font-size: 10px; color: var(--gray-500); margin-top: 4px;">PropValu México · Reporte Inteligente</div>
        </div>
      </div>` : ''}</body></html>`.replace(/>\s+</g, '><').trim();

  valuation.status = 'report_ready';
  res.json({ report_html: valuation.report_html });
});

// ---------------------------------------------------------------------------
// SSE: enriquecimiento de comparables con Puppeteer
// GET /api/valuations/:id/enrich-stream
// Emite eventos: { type: 'enriched', comparable_id, updates } | { type: 'done' } | { type: 'error' }
// ---------------------------------------------------------------------------
app.get('/api/valuations/:id/enrich-stream', async (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const comparables = valuation.comparables || [];
  if (comparables.length === 0) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write('data: ' + JSON.stringify({ type: 'done', enriched: 0 }) + '\n\n');
    return res.end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Keepalive cada 20s para que el cliente no cierre la conexión
  const keepalive = setInterval(() => res.write(': ping\n\n'), 20000);

  let enrichedCount = 0;
  const send = (data) => res.write('data: ' + JSON.stringify(data) + '\n\n');

  // Enriquecer comparables en secuencia (evita sobrecarga del browser)
  for (const comp of comparables) {
    if (req.socket.destroyed) break;
    try {
      const updates = await enrichOneComparable(comp);
      if (updates && Object.keys(updates).length > 0) {
        // Aplicar updates al comparable en memoria
        Object.assign(comp, updates);
        // Recalcular price_per_sqm si ahora tenemos construction_area
        if (updates.construction_area && comp.price) {
          comp.price_per_sqm = parseFloat((comp.price / updates.construction_area).toFixed(2));
        }
        enrichedCount++;
        send({ type: 'enriched', comparable_id: comp.comparable_id, updates });
      }
    } catch (e) {
      // continuar con el siguiente
    }
  }

  clearInterval(keepalive);
  send({ type: 'done', enriched: enrichedCount });
  res.end();
});

// The "catchall" handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

const server = app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

process.on('SIGTERM', async () => { await closeBrowser(); server.close(); });
process.on('SIGINT',  async () => { await closeBrowser(); server.close(); process.exit(0); });
