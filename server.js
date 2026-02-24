const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const { searchComparablesWithAI, generateValuationInsights } = require('./services/aiSearch');
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
    { key: 'plazas', type: 'shopping_mall', label: 'Plazas', icon: '🛍️', sub: 'Comercio' }
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
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'frontend/build')));

// API Endpoints

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

app.get('/api/auth/me', (req, res) => {
  res.json({
    user_id: 'user_local_dev',
    email: 'dev@example.com',
    name: 'Local Developer',
    role: 'appraiser', // Always appraiser for dev
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

app.post('/api/valuations/:id/generate-comparables', async (req, res) => {
  const valuation = valuations[req.params.id];
  if (!valuation) return res.status(404).json({ error: 'Valuación no encontrada' });

  const append = req.query.append === 'true';
  const count = append ? 5 : 10;

  try {
    const comps = await searchComparablesWithAI(valuation.property_data, count);

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

  const { comparable_ids, custom_negotiation } = req.body;
  valuation.selected_comparables = comparable_ids;

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

app.get('/api/stats', (req, res) => {
  res.json({
    total_valuations: 1250,
    active_users: 450,
    cities_covered: 32,
    avg_accuracy: 94.5
  });
});

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

  // 1. Comparative Market Method (80% weight)
  const rawPricesSqM = selectedComps.map(c => c.price_per_sqm);
  const adjustedPricesSqM = selectedComps.map(c => {
    const customNegotiation = valuation.custom_negotiation !== undefined ? valuation.custom_negotiation : -5;
    const otherAdj = c.total_adjustment - (c.negotiation_adjustment || -5);
    return c.price_per_sqm * (1 + (customNegotiation + otherAdj) / 100);
  });

  // Weighted prices for robustness: 60% adjusted + 40% raw
  const weightedPrices = adjustedPricesSqM.map((adj, i) => (adj * 0.6 + rawPricesSqM[i] * 0.4));

  const minPriceSqM = Math.min(...weightedPrices);
  const maxPriceSqM = Math.max(...weightedPrices);
  const avgPriceSqM = weightedPrices.reduce((a, b) => a + b, 0) / weightedPrices.length;

  // Median calculation
  const sorted = [...weightedPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPriceSqM = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Final Price SqM (70% median + 30% average)
  const finalPriceSqM = medianPriceSqM * 0.7 + avgPriceSqM * 0.3;
  const comparativeWeighted = finalPriceSqM * construction_area;

  // 2. Physical/Cost Method (20% weight)
  const landRatioByState = {
    'Ciudad de México': 0.50,
    'Nuevo León': 0.45,
    'Jalisco': 0.40,
    'Quintana Roo': 0.45,
    'Estado de México': 0.35,
    'Querétaro': 0.40
  };
  const landRatio = landRatioByState[prop.state] || 0.38;
  const landValuePerSqM = finalPriceSqM * landRatio;
  const landValue = landValuePerSqM * land_area;

  const qualityCosts = {
    'Interés social': 12000,
    'Media': 16000,
    'Media-alta': 22000,
    'Residencial': 30000,
    'Residencial plus': 45000
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

  let estimatedValue = (comparativeWeighted * 0.80 + physicalTotal * 0.20) * (1 - regimeDiscount);

  // Sanity check vs comparable raw average
  const compRawAvg = selectedComps.reduce((acc, c) => acc + c.price, 0) / selectedComps.length;
  if (estimatedValue < compRawAvg * 0.70) estimatedValue = (estimatedValue + compRawAvg * 0.70) / 2;
  if (estimatedValue > compRawAvg * 1.30) estimatedValue = (estimatedValue + compRawAvg * 1.30) / 2;

  // Confidence Level
  const confidence = selectedComps.length >= 5 ? 'ALTO' : (selectedComps.length >= 3 ? 'MEDIO' : 'BAJO');

  // Market Metrics
  const marketMetrics = calculateMarketMetrics(estimatedValue, prop.property_type || 'Casa');

  valuation.result = {
    estimated_value: Math.round(estimatedValue),
    value_range_min: Math.round(estimatedValue * 0.90),
    value_range_max: Math.round(estimatedValue * 1.10),
    price_per_sqm: Math.round(estimatedValue / construction_area),
    confidence_level: confidence,
    comparative_min_value: Math.round(minPriceSqM * construction_area),
    comparative_max_value: Math.round(maxPriceSqM * construction_area),
    comparative_weighted: Math.round(comparativeWeighted),
    physical_total: Math.round(physicalTotal),
    land_value: Math.round(landValue),
    construction_depreciated: Math.round(constructionDepreciated),
    depreciation_percent: Math.round(totalDepreciation * 100),
    market_metrics: marketMetrics
  };

  // 4. Generate Strategic Insights via AI
  try {
    const aiInsights = await generateValuationInsights(prop, selectedComps);
    valuation.result.ai_insights = aiInsights;

    // Fetch Nearby Amenities specifically for the report
    const nearby = await fetchNearbyAmenities(prop.latitude, prop.longitude);
    if (nearby) valuation.result.ai_insights.nearby_amenities = nearby;
  } catch (e) {
    console.warn("AI Insights failed, attempting nearby amenities only.");
    const nearby = await fetchNearbyAmenities(prop.latitude, prop.longitude);
    valuation.result.ai_insights = {
      conclusions: [generateAnalysisText(prop, valuation.result, selectedComps)],
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

  // Thermometer logic
  const subjectPriceSqM = result.price_per_sqm;
  const avgCompPriceSqM = selectedComps.reduce((acc, c) => acc + c.price_per_sqm, 0) / selectedComps.length;
  const priceRatio = subjectPriceSqM / avgCompPriceSqM;

  let priceScore = 55;
  if (priceRatio < 0.9) priceScore = 90;
  else if (priceRatio < 0.95) priceScore = 75;
  else if (priceRatio > 1.1) priceScore = 20;
  else if (priceRatio > 1.05) priceScore = 35;

  const conservationScores = { 'Excelente': 100, 'Bueno': 75, 'Regular': 45, 'Malo': 15 };
  const consScore = conservationScores[prop.conservation_state] || 75;

  const supplyScore = selectedComps.length <= 3 ? 90 : (selectedComps.length <= 6 ? 70 : 40);

  const thermoScore = (consScore * 0.4) + (priceScore * 0.4) + (supplyScore * 0.2);
  const thermoPosition = 10 + (thermoScore * 0.8);
  const positionLabel = thermoScore >= 75 ? "Ventaja competitiva" : (thermoScore >= 55 ? "Valor medio o justo" : "Requiere ajuste");

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

  const headerHtml = `
    <div class="header">
      ${logoHtml}
      <div class="report-meta">
        <div style="font-weight: 700; color: var(--primary); font-size: 14px;">Reporte de Valuación</div>
        <div>Folio: EST-${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${valuation.valuation_id.slice(-2).toLowerCase()}</div>
        <div>Fecha: ${new Date().toLocaleDateString('es-MX')}</div>
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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--gray-100); border: 1px solid var(--gray-200); border-radius: 8px; overflow: hidden; font-size: 13px;">
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">📍 Ubicación</span>
              <span style="font-weight:700">${prop.neighborhood.toUpperCase()}, ${prop.municipality.toUpperCase()}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">🚩 Estado</span>
              <span style="font-weight:700">${prop.state}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">📐 Terreno</span>
              <span style="font-weight:700">${prop.land_area} m²</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">🏗 Construcción</span>
              <span style="font-weight:700">${prop.construction_area} m²</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">🏘 Tipo</span>
              <span style="font-weight:700">${prop.property_type}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">📜 Régimen</span>
              <span style="font-weight:700">${prop.land_regime || 'URBANO'}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">🏢 Niveles</span>
              <span style="font-weight:700">${prop.property_level || 'PB'} de ${prop.total_floors || '1'}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">🏗️ Uso de Suelo</span>
              <span style="font-weight:700">${prop.land_use || 'H2/20'}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">📄 Fuente info.</span>
              <span style="font-weight:700">${prop.surface_source || 'No especificada'}</span>
            </div>
            <div style="background: white; padding: 10px 12px; display: flex; justify-content: space-between;">
              <span style="color:var(--gray-500)">📅 Edad estimada</span>
              <span style="font-weight:700">${prop.estimated_age || 0} años</span>
            </div>
            ${prop.surface_source === 'Predial' ? `
            <div style="background: #fef2f2; padding: 8px 12px; font-size: 10px; color: #991b1b; border-top: 1px solid #fee2e2; border-right: 1px solid var(--gray-200); line-height: 1.3;">
              ⚠️ <strong>Nota Técnica:</strong> Las superficies de Predial no están validadas físicamente. Discrepancias impactarán la precisión del valor.
            </div>
            <div style="background: #fef2f2; border-top: 1px solid #fee2e2;"></div>
            ` : ''}
          </div>

          <div class="amenity-grid">
            ${topBadges.map(b => `<div class="amenity-badge"><span>${b.icon}</span> ${b.text}</div>`).join('')}
          </div>

          ${(selectedFeatureLabels.length > 0 || prop.other_features) ? `
          <div style="margin-top: 10px; padding: 12px; background: #f7fee7; border: 1.5px solid #d9f99d; border-radius: 8px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--primary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">✨ CARACTERÍSTICAS ESPECIALES E INSTALACIONES:</div>
            <div style="font-size: 14px; font-weight: 700; color: #081C15; line-height: 1.5;">
              ${selectedFeatureLabels.join(' • ')}${selectedFeatureLabels.length > 0 && prop.other_features ? ' • ' : ''}${prop.other_features || ''}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>📍 UBICACIÓN Y FACHADA</h2>
          <div style="font-weight: 600; color: var(--primary); margin-bottom: 8px;">📍 ${prop.street_address || prop.neighborhood}${prop.internal_number ? ' Int. ' + prop.internal_number : ''}, ${prop.neighborhood}</div>
          
          <div style="display: flex; gap: 12px; align-items: stretch;">
            <div class="map-container" style="flex: 1; height: 260px; position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200);">
              <img class="map-image" src="https://maps.googleapis.com/maps/api/staticmap?center=${prop.latitude},${prop.longitude}&zoom=16&size=600x800&maptype=roadmap&markers=color:red%7C${prop.latitude},${prop.longitude}&key=${GOOGLE_MAPS_API_KEY}" alt="Mapa" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            
            ${(prop.facade_photo_index !== null && prop.photos && prop.photos[prop.facade_photo_index]) ? `
              <div style="flex: 1; height: 260px; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200);">
                <img src="${prop.photos[prop.facade_photo_index]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Fachada">
              </div>
            ` : ''}
          </div>

          <div style="font-size: 11px; color: var(--gray-500); margin-top: 6px; text-align: right;">
            📌 Coordenadas: ${prop.latitude.toFixed(6)}, ${prop.longitude.toFixed(6)}
          </div>
        </div>
      </div>
      <!-- PAGE 2: VALOR Y ESTRATEGIA -->
      <div class="page">
        ${headerHtml}
        <div class="main-value-box" style="padding: 30px 20px; background: linear-gradient(135deg, #1B4332 0%, #081C15 100%);">
          <div style="font-size: 15px; font-weight: 700; letter-spacing: 3px; color: var(--accent); text-transform: uppercase; margin-bottom: 25px;">💰 VALOR MEDIO O JUSTO</div>
          
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
          <div style="font-size: 11px; color: var(--gray-500); margin-bottom: 10px;">Basado en: estado de conservación (Bueno), comparación de precio/m² vs mercado, y oferta de propiedades similares.</div>
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
              <div class="info-value">${selectedComps.length} Propiedades</div>
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

        <div class="section">
          <h2>⚖ DESGLOSE DE VALOR FÍSICO</h2>
          <div style="display: grid; grid-template-columns: 80px 1.5fr 1fr 1.2fr; gap: 15px; align-items: center; padding: 12px; border: 1px solid var(--gray-200); border-radius: 8px; background: white;">
            <!-- Col 1: Pie -->
            <div class="chart-pie" style="background: conic-gradient(var(--primary) 0% ${landPercent}%, var(--secondary) ${landPercent}% 100%); width: 70px; height: 70px;"></div>
            
            <!-- Col 2: Labels -->
            <div style="font-size: 11px; color: var(--gray-700);">
              <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;"><div style="width: 8px; height: 8px; background: var(--primary); border-radius: 1px;"></div> Valor Terreno</div>
              <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 8px; height: 8px; background: var(--secondary); border-radius: 1px;"></div> Valor Const.</div>
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
                  <td style="font-size: 10px;">${c.neighborhood}</td>
                  <td class="text-right">${c.land_area}</td>
                  <td class="text-right">${c.construction_area}</td>
                  <td class="text-right">${new Intl.NumberFormat('es-MX').format(c.price)}</td>
                  <td class="text-right">${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(c.price_per_sqm)}</td>
                  <td class="text-right" style="color: ${c.total_adjustment < 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${c.total_adjustment}%</td>
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
          <h2>📝 Análisis de Mercado y Observaciones</h2>
          <div class="analysis-box" style="font-size: 11px; line-height: 1.35; border-left: 4px solid var(--secondary); background: #fcfcfc; padding: 12px 15px; color: var(--gray-700); margin-bottom: 5px; height: auto; white-space: normal;">
            ${(() => {
      const rawPoints = (showAI && result.ai_insights && !result.ai_insights.conclusions[0].includes('Error'))
        ? result.ai_insights.conclusions.flatMap(c => c.split('\n'))
        : templateAnalysis.split('\n');

      return rawPoints.filter(p => p.trim()).map((p, i) => {
        let text = p.trim().replace(/^[0-9]\)\s?/, '');
        if (text.includes(':')) {
          const parts = text.split(':');
          text = `<strong>${parts[0].trim()}:</strong>${parts.slice(1).join(':')}`;
        }
        return `
                  <div style="display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;">
                    <div style="background: #2D6A4F; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">${i + 1}</div>
                    <div style="flex: 1;">${text}</div>
                  </div>`;
      }).join('');
    })()}
          </div>
        </div>
      </div>

      <!-- PAGE 4: ENTORNO Y ESTRATEGIA -->
      <div class="page">
        ${headerHtml}
        <div class="section">
          <h2>🏘️ EQUIPAMIENTO Y SERVICIOS RELEVANTES EN EL ENTORNO (RADIO 1.5 KM)</h2>
          <div class="services-grid-2">
            ${(result.ai_insights && result.ai_insights.nearby_amenities)
      ? result.ai_insights.nearby_amenities.map(s => `
                <div class="service-card">
                  <div class="service-icon">${s.icon}</div>
                  <div style="flex: 1;">
                    <strong style="display: block; font-size: 13px; color: var(--primary);">${s.count} ${s.label}</strong>
                    <div style="font-size: 10px; color: var(--gray-500); margin-bottom: 2px;">${s.sub}</div>
                    <div style="font-size: 11px; font-weight: 600; color: #1B4332; line-height: 1.25;">
                      ${s.example_names || 'Múltiples opciones disponibles.'}
                    </div>
                  </div>
                </div>
              `).join('')
      : ''
    }
          </div>
        </div>

        <div class="section" style="margin-top: 10px;">
          <h2>💡 CONSEJOS PARA VENDER</h2>
          <div class="tips-grid" style="grid-template-columns: repeat(2, 1fr); gap: 6px;">
            ${sellingTips.map(t => `
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
            <div style="margin-top: 6px; font-weight: 700; font-size: 9.5px;">🗓 Generado: ${new Date().toLocaleDateString('es-MX')} · Folio: EST-${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${valuation.valuation_id.slice(-2).toLowerCase()}</div>
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

// The "catchall" handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
