"""
Enhanced HTML Report Generator for PropValu v2.6
- 3-page letter format optimized for print
- Larger, more legible fonts
- Static map image (no iframe issues)
- Thermometer with conservation/demand/comparables logic
- Optional sections for PDF export
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from static_map import get_map_for_report

# Catálogo de uso de suelo actualizado basado en Jalisco
LAND_USE_INFO = {
    "H1-U": {"name": "Habitacional Unifamiliar", "description": "Una vivienda por lote, baja densidad", "icon": "🏠", "color": "#22c55e"},
    "H2-U": {"name": "Habitacional Dúplex", "description": "Dos viviendas por lote", "icon": "🏠", "color": "#22c55e"},
    "H3-U": {"name": "Habitacional Tríplex", "description": "Tres viviendas por lote", "icon": "🏠", "color": "#84cc16"},
    "H2-H": {"name": "Plurifamiliar Horizontal", "description": "Viviendas horizontales en condominio", "icon": "🏘", "color": "#84cc16"},
    "H2-V": {"name": "Plurifamiliar Vertical Baja", "description": "Edificios de hasta 4 niveles", "icon": "🏢", "color": "#eab308"},
    "H3-V": {"name": "Plurifamiliar Vertical Media", "description": "Edificios de 5-8 niveles", "icon": "🏢", "color": "#f97316"},
    "H4-V": {"name": "Plurifamiliar Vertical Alta", "description": "Torres de más de 8 niveles", "icon": "🏙", "color": "#ef4444"},
    "HM": {"name": "Habitacional Mixto", "description": "Vivienda con otros usos compatibles", "icon": "🏬", "color": "#06b6d4"},
    "HC": {"name": "Habitacional con Comercio Vecinal", "description": "Comercio en planta baja, vivienda arriba", "icon": "🏪", "color": "#06b6d4"},
    "HO": {"name": "Habitacional con Oficinas", "description": "Oficinas y vivienda en mismo predio", "icon": "🏢", "color": "#8b5cf6"},
    "CU": {"name": "Comercio Uniforme", "description": "Comercio de pequeña escala", "icon": "🛒", "color": "#8b5cf6"},
    "CB": {"name": "Centro de Barrio", "description": "Servicios y comercio local", "icon": "🏬", "color": "#ec4899"},
    "CD": {"name": "Centro de Distrito", "description": "Comercio y servicios a nivel distrito", "icon": "🏬", "color": "#f43f5e"},
    "CS": {"name": "Corredor de Servicios", "description": "Comercio en vías principales", "icon": "🛣", "color": "#f43f5e"},
    "CC": {"name": "Centro Comercial", "description": "Plazas y centros comerciales", "icon": "🏬", "color": "#dc2626"},
    "CR": {"name": "Corredor Regional", "description": "Comercio de alto impacto regional", "icon": "🏪", "color": "#dc2626"},
    "I-L": {"name": "Industrial Ligera", "description": "Manufactura ligera, talleres", "icon": "🏭", "color": "#64748b"},
    "I-M": {"name": "Industrial Media", "description": "Industria de mediano impacto", "icon": "🏭", "color": "#475569"},
    "I-P": {"name": "Industrial Pesada", "description": "Industria de alto impacto", "icon": "🏭", "color": "#334155"},
    "IP": {"name": "Industria Parque", "description": "Parques industriales planificados", "icon": "🏭", "color": "#1e293b"},
    "EA": {"name": "Espacios Abiertos", "description": "Parques, jardines, áreas verdes", "icon": "🌳", "color": "#22c55e"},
    "EI": {"name": "Equipamiento Institucional", "description": "Escuelas, hospitales, gobierno", "icon": "🏛", "color": "#3b82f6"},
    "PE": {"name": "Preservación Ecológica", "description": "Áreas naturales protegidas", "icon": "🌲", "color": "#16a34a"},
    "AG": {"name": "Agrícola", "description": "Uso agrícola y ganadero", "icon": "🌾", "color": "#a3e635"},
    "desconocido": {"name": "Por Verificar", "description": "Consulte el visor urbano municipal", "icon": "❓", "color": "#94a3b8"},
}

# Mapa de características especiales a iconos coherentes
FEATURE_ICONS = {
    "parking": "🅿️",
    "pool": "🏊",
    "garden": "🌳",
    "terrace": "🌅",
    "gym": "🏋",
    "security": "🛡",
    "elevator": "🛗",
    "rooftop": "🌿",
    "service_room": "🚪",
    "laundry_room": "🧺",
    "storage": "📦",
    "kitchen_integral": "🍳",
}

FEATURE_NAMES = {
    "parking": "Estacionamiento",
    "pool": "Alberca",
    "garden": "Jardín",
    "terrace": "Terraza",
    "gym": "Gimnasio",
    "security": "Seguridad 24/7",
    "elevator": "Elevador",
    "rooftop": "Roof Garden",
    "service_room": "Cuarto de Servicio",
    "laundry_room": "Cuarto de Lavado",
    "storage": "Bodega/Almacén",
    "kitchen_integral": "Cocina Integral",
}


def get_land_use_info(land_use: str) -> Dict:
    """Get detailed description for land use codes"""
    return LAND_USE_INFO.get(land_use, LAND_USE_INFO["desconocido"])


def generate_folio(valuation_id: str) -> str:
    """Genera folio formato EST-AA-MM-DD-NN"""
    now = datetime.now(timezone.utc)
    num = ''.join(filter(str.isdigit, valuation_id[-4:])) or '01'
    return f"EST-{now.strftime('%y-%m-%d')}-{num[:2].zfill(2)}"


def generate_html_report(valuation: dict, analysis: str, include_analysis: bool = True, ai_sections: dict = None) -> str:
    """
    Generate comprehensive HTML report optimized for 3-page letter print.

    Args:
        valuation: Full valuation data
        analysis: AI-generated analysis text
        include_analysis: Whether to include the analysis section in PDF (user option)
    """
    prop = valuation["property_data"]
    result = valuation["result"]
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    consultation_date = valuation.get("consultation_date", datetime.now(timezone.utc).isoformat())
    photos = prop.get("photos", [])
    is_valuer_mode = valuation.get("mode") == "private"
    
    if is_valuer_mode and selected_ids:
        active_comparables = [c for c in comparables if c["comparable_id"] in selected_ids]
    else:
        active_comparables = comparables[:6]
    
    if isinstance(consultation_date, str):
        date_str = consultation_date[:10]
    else:
        date_str = consultation_date.strftime("%Y-%m-%d")
    
    # Generate folio
    folio = generate_folio(valuation.get('valuation_id', '001'))
    
    # Market metrics
    market_metrics = result.get('market_metrics', {})
    monthly_rent = market_metrics.get('monthly_rent_estimate', 0)
    annual_rent = market_metrics.get('annual_rent_estimate', 0)
    cap_rate = market_metrics.get('cap_rate', 0)
    appreciation = market_metrics.get('annual_appreciation', 5)
    similar_count = market_metrics.get('similar_properties_count', len(comparables))
    
    app_low = max(0, appreciation - 1)
    app_high = appreciation + 1
    appreciation_range = f"{app_low:.0f}% - {app_high:.0f}%"
    
    # Comparables table
    comp_rows = ""
    for i, comp in enumerate(active_comparables, 1):
        source_name = comp["source"].replace(".com.mx", "").replace(".com", "").replace("www.", "").capitalize()
        source_link = f'<a href="{comp.get("source_url", "#")}" target="_blank" class="source-link">{source_name}</a>'
        adj_color = '#b91c1c' if comp['total_adjustment'] < 0 else '#15803d'
        comp_rows += f"""
        <tr>
            <td class="text-center">{i}</td>
            <td>{comp['neighborhood'][:25]}</td>
            <td class="text-right">{comp.get('land_area', '-')}</td>
            <td class="text-right">{comp.get('construction_area', '-')}</td>
            <td class="text-right">${comp['price']:,.0f}</td>
            <td class="text-right">${comp['price_per_sqm']:,.0f}</td>
            <td class="text-center" style="color: {adj_color}; font-weight: 600;">{comp['total_adjustment']:+.1f}%</td>
            <td class="text-right" style="font-weight: 700;">${comp['adjusted_price_per_sqm']:,.0f}</td>
            <td>{source_link}</td>
        </tr>
        """
    
    # Photos section (compact, max 8)
    photos_html = ""
    if photos and len(photos) > 0:
        photos_html = '<div class="photos-section"><h2>📸 FOTOGRAFÍAS DEL INMUEBLE</h2><div class="photos-grid">'
        for i, photo in enumerate(photos[:8]):
            photos_html += f'<div class="photo-item"><img src="{photo}" alt="Foto {i+1}"></div>'
        photos_html += '</div></div>'
    
    # Map - generate static image
    lat = prop.get('latitude') or 19.4326
    lng = prop.get('longitude') or -99.1332
    
    # Get static map data
    map_data = get_map_for_report(lat, lng)
    static_map_src = map_data.get('static_image') or map_data['iframe_url']
    has_static_map = map_data.get('has_static', False)
    embed_map_url = map_data['iframe_url']
    
    # Property features
    features_html = ""
    if prop.get('bedrooms'):
        features_html += f'<span class="feature-tag">🛏 {prop["bedrooms"]} Recámaras</span>'
    if prop.get('bathrooms'):
        features_html += f'<span class="feature-tag">🚿 {prop["bathrooms"]} Baños</span>'
    if prop.get('parking_spaces'):
        features_html += f'<span class="feature-tag">🅿️ {prop["parking_spaces"]} Estac.</span>'
    if prop.get('floor_number'):
        floor_text = f'Piso {prop["floor_number"]}'
        if prop.get('total_floors'):
            floor_text += f'/{prop["total_floors"]}'
        features_html += f'<span class="feature-tag">🏢 {floor_text}</span>'
    if prop.get('estimated_age'):
        features_html += f'<span class="feature-tag">📅 {prop["estimated_age"]} años</span>'
    
    # Special features
    special_features = prop.get('special_features', [])
    for feat in special_features[:6]:
        icon = FEATURE_ICONS.get(feat, "✓")
        name = FEATURE_NAMES.get(feat, feat)
        features_html += f'<span class="feature-tag">{icon} {name}</span>'
    
    # Other features (free text)
    other_features_html = ""
    if prop.get('other_features'):
        other_features_html = f"""
        <div class="other-features">
            <strong>Otros elementos:</strong> {prop['other_features']}
        </div>
        """
    
    # Land use section - only show in valuer mode if specified
    land_use = prop.get('land_use', 'desconocido')
    land_info = get_land_use_info(land_use)
    
    # In public mode, hide land use section completely if not specified
    land_use_html = ""
    if is_valuer_mode:
        if land_use != 'desconocido':
            land_use_html = f"""
            <div class="land-use-box" style="border-left-color: {land_info['color']}">
                <div class="land-use-header">
                    <span class="land-use-icon">{land_info['icon']}</span>
                    <div>
                        <span class="land-use-code">{land_use}</span>
                        <strong>{land_info['name']}</strong>
                    </div>
                </div>
                <p class="land-use-desc">{land_info['description']}</p>
                <p class="land-use-note" style="font-size: 9pt; color: #64748b; margin-top: 6pt;">
                    Verificado por valuador profesional
                </p>
            </div>
            """
        else:
            land_use_html = """
            <div class="land-use-unknown">
                <span class="warning-icon">⚠️</span>
                <div>
                    <strong>Uso de suelo pendiente</strong>
                    <p>Consulte el visor urbano de su municipio para verificar.</p>
                </div>
            </div>
            """
    
    # Value breakdown
    total_value = result['estimated_value']
    land_percent = (result['land_value'] / total_value * 100) if total_value > 0 else 0
    construction_percent = 100 - land_percent
    
    # Values for thermometer display
    value_min = result['value_range_min']
    value_max = result['value_range_max']
    value_estimated = result['estimated_value']
    
    # ============== THERMOMETER LOGIC ==============
    # Based on: Conservation state, Price/m² vs comparables, Supply (number of similar properties)
    
    # 1. Conservation state factor (40% weight)
    conservation = prop.get('conservation_state', 'Bueno')
    conservation_scores = {
        'Excelente': 100,  # Maximum position
        'Bueno': 70,       # Above average
        'Regular': 40,     # Below average
        'Malo': 15         # Near minimum
    }
    conservation_score = conservation_scores.get(conservation, 60)
    
    # 2. Price/m² comparison vs comparables (40% weight)
    subject_price_sqm = result['price_per_sqm']
    if active_comparables:
        avg_comp_price_sqm = sum(c['price_per_sqm'] for c in active_comparables) / len(active_comparables)
        # If subject is cheaper than comparables = advantage = higher score
        price_ratio = subject_price_sqm / avg_comp_price_sqm if avg_comp_price_sqm > 0 else 1
        if price_ratio < 0.9:  # 10%+ cheaper = big advantage
            price_score = 90
        elif price_ratio < 0.95:  # 5-10% cheaper = advantage
            price_score = 75
        elif price_ratio < 1.05:  # Within 5% = average
            price_score = 55
        elif price_ratio < 1.1:  # 5-10% more expensive = disadvantage
            price_score = 35
        else:  # 10%+ more expensive = big disadvantage
            price_score = 20
    else:
        price_score = 50
        avg_comp_price_sqm = subject_price_sqm
    
    # 3. Supply factor - fewer similar properties = higher demand = higher score (20% weight)
    similar_count = market_metrics.get('similar_properties_count', len(comparables))
    if similar_count <= 3:
        supply_score = 90  # Low supply = high demand
    elif similar_count <= 6:
        supply_score = 70  # Moderate supply
    elif similar_count <= 10:
        supply_score = 50  # Average
    elif similar_count <= 15:
        supply_score = 35  # High supply
    else:
        supply_score = 20  # Saturated market
    
    # Combined thermometer position (weighted average)
    thermo_score = (conservation_score * 0.40) + (price_score * 0.40) + (supply_score * 0.20)
    
    # Map score (0-100) to position (10-90% to avoid edges)
    thermo_position = 10 + (thermo_score * 0.80)
    
    # Determine position label
    if thermo_score >= 75:
        position_label = "Ventaja competitiva"
    elif thermo_score >= 55:
        position_label = "Precio justo"
    elif thermo_score >= 35:
        position_label = "Precio a negociar"
    else:
        position_label = "Requiere ajuste"
    
    # Selling tips - More robust and useful in Spanish
    tips = [
        ("🎨", "Presentación", "Aplique pintura fresca en fachada e interiores con colores neutros (blanco, beige, gris claro) que amplían visualmente los espacios"),
        ("✨", "Limpieza Profunda", "Realice limpieza profesional incluyendo ventanas, azulejos, alfombras. Elimine olores con ventilación y aromatizantes suaves"),
        ("📷", "Fotografía Profesional", "Las propiedades con fotos profesionales reciben hasta 3 veces más visitas. Considere video y tour virtual 360°"),
        ("🏠", "Preparación del Inmueble", "Despersonalice retirando fotos familiares. Ordene closets, reduzca muebles. Los espacios vacíos se ven más amplios"),
        ("🔧", "Reparaciones Menores", "Arregle fugas, grietas, cerraduras, apagadores. Los detalles visibles restan valor percibido al comprador"),
        ("💰", "Estrategia de Precio", "Precio justo de mercado vende 30% más rápido. Un precio alto ahuyenta compradores y alarga el tiempo de venta"),
        ("📋", "Documentación Legal", "Tenga al corriente escrituras, predial, agua, CFE. Certifique libertad de gravamen y agilice el proceso"),
        ("🏢", "Inmobiliaria Profesional", "Un agente inmobiliario profesional logra ventas 30% más rápidas con mejor precio gracias a su red de contactos y experiencia"),
    ]
    
    tips_html = ""
    for icon, title, desc in tips:
        tips_html += f"""
        <div class="tip-item">
            <span class="tip-icon">{icon}</span>
            <div>
                <strong>{title}:</strong> {desc}
            </div>
        </div>
        """
    
    # Amenities section - removed clinics, added radius note in title
    amenities = [
        ("🏫", "Escuelas", "Instituciones educativas"),
        ("🏥", "Hospitales", "Centros de salud"),
        ("🛒", "Supermercados", "Autoservicios y tiendas"),
        ("🏪", "Mercados", "Comercio local"),
        ("🌳", "Parques", "Parques y espacios deportivos"),
        ("🚗", "Vías de Acceso", "Conectividad vial"),
    ]
    
    amenities_html = ""
    for i, (icon, name, desc) in enumerate(amenities, 1):
        amenities_html += f"""
        <div class="amenity-item">
            <span class="amenity-num">{i}</span>
            <span class="amenity-icon">{icon}</span>
            <div>
                <strong>{name}</strong>
                <span class="amenity-desc">{desc}</span>
            </div>
        </div>
        """
    
    # Search radius note removed as it's now in the title
    amenities_radius_note = ""

    # ============== AI SECTIONS HTML ==============
    ai_sections = ai_sections or {}
    plusvalia_entorno_html = ""
    vo_html = ""
    estrategia_html = ""
    equipamiento_ai_html = ""

    if ai_sections:
        pv = ai_sections.get("plusvalia", {})
        pe = ai_sections.get("perfil_entorno", {})

        # Plusvalía + Perfil del Entorno — grid 50/50 lado a lado (igual que server.js original)
        if pv or pe:
            tasa = float(pv.get("tasa_anual", appreciation)) if pv else float(appreciation)
            cur_year = datetime.now(timezone.utc).year
            bar_heights = [8, 17, 29, 41, 55]
            bar_colors = ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669']

            if pv:
                bars_html = ""
                vals_row = ""
                for i in range(5):
                    val = float(pv.get(f"anio{i+1}", 0) or 0)
                    pct_proj = round(((1 + tasa / 100) ** (i + 1) - 1) * 100, 1)
                    px_h = bar_heights[i]
                    color = bar_colors[i]
                    year_lbl = cur_year + i + 1
                    bars_html += (
                        f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:80px;">'
                        f'<div style="font-size:7.5px;font-weight:800;color:#15803d;margin-bottom:2px;">+{pct_proj:.1f}%</div>'
                        f'<div style="width:100%;background:{color};border-radius:3px 3px 0 0;height:{px_h}px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>'
                        f'<div style="font-size:7px;color:#6b7280;font-weight:600;margin-top:2px;text-align:center;">{year_lbl}</div>'
                        f'</div>'
                    )
                    if val > 0:
                        vals_row += f'<span style="font-size:7px;color:#374151;font-weight:700;">${val:,.0f}</span>'
                _vals_div = (
                    '<div style="display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#374151;margin-top:4px;padding:0 4px;">'
                    + vals_row + '</div>'
                ) if vals_row else ""
                plusvalia_col = (
                    f'<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px;">'
                    f'<div style="font-size:10px;font-weight:800;color:#1B4332;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📈 PLUSVALÍA PROYECTADA (5 AÑOS)</div>'
                    f'<div style="display:flex;align-items:flex-end;gap:5px;height:80px;overflow:visible;">{bars_html}</div>'
                    f'{_vals_div}'
                    f'<div style="font-size:9px;color:#6b7280;font-weight:500;margin-top:6px;font-style:italic;line-height:1.2;">* Tasa anual est.: ~{tasa:.1f}% (Fuente: SHF / BBVA).</div>'
                    f'</div>'
                )
            else:
                plusvalia_col = '<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px;font-size:10px;color:#6b7280;">Datos de plusvalía no disponibles.</div>'

            _ent_dot_color = {
                "seguridad": "#ef4444", "movilidad": "#f59e0b",
                "educacion": "#22c55e", "salud": "#22c55e",
                "comercio": "#22c55e", "recreacion": "#22c55e", "plazas": "#22c55e"
            }
            _ent_emoji = {
                "seguridad": "🛡", "movilidad": "🚗", "educacion": "🎓",
                "salud": "🏥", "comercio": "🛒", "recreacion": "🌳", "plazas": "🏪"
            }
            _ent_names = {
                "seguridad": "Seguridad", "movilidad": "Movilidad",
                "educacion": "Educación", "salud": "Salud",
                "comercio": "Comercio", "recreacion": "Recreación", "plazas": "Plazas"
            }
            if pe:
                entorno_items = ""
                for key in ["seguridad", "movilidad", "educacion", "salud", "comercio", "recreacion", "plazas"]:
                    cat = pe.get(key, {})
                    if not cat:
                        continue
                    texto = cat.get("texto", "") if isinstance(cat, dict) else str(cat)
                    count = cat.get("count", "") if isinstance(cat, dict) else ""
                    dot_color = _ent_dot_color.get(key, "#22c55e")
                    name = _ent_names.get(key, key)
                    label = f"{count} {name}" if count else name
                    entorno_items += (
                        f'<div style="display:flex;align-items:flex-start;gap:6px;padding:4px 0;border-bottom:1px solid #f3f4f6;">'
                        f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{dot_color};margin-top:3px;flex-shrink:0;"></span>'
                        f'<div style="line-height:1.3;">'
                        f'<span style="font-size:9px;color:#6b7280;">{label}:</span> '
                        f'<span style="font-size:9px;font-weight:700;color:#1a2e23;">{texto}</span>'
                        f'</div>'
                        f'</div>'
                    )
                entorno_col = (
                    f'<div style="background:white;border:1.5px solid #e5e7eb;border-radius:10px;padding:12px;">'
                    f'<div style="font-size:10px;font-weight:800;color:#1B4332;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📍 PERFIL DEL ENTORNO</div>'
                    f'<div style="display:flex;flex-direction:column;gap:1px;">{entorno_items}</div>'
                    f'</div>'
                )
            else:
                entorno_col = '<div style="background:white;border:1.5px solid #e5e7eb;border-radius:10px;padding:12px;font-size:10px;color:#6b7280;">Datos del entorno no disponibles.</div>'

            plusvalia_entorno_html = (
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">'
                f'{plusvalia_col}'
                f'{entorno_col}'
                f'</div>'
            )

        # Ventajas y áreas de oportunidad — grid verde/naranja (igual que server.js)
        ventajas = ai_sections.get("ventajas", [])
        oportunidades = ai_sections.get("oportunidades", [])
        if ventajas or oportunidades:
            v_items = "".join(f'<li style="margin-bottom:4px;">{v}</li>' for v in ventajas) or '<li>Ubicación estratégica</li><li>Superficie competitiva</li>'
            o_items = "".join(f'<li style="margin-bottom:4px;">{o}</li>' for o in oportunidades) or '<li>Antigüedad perceptible</li><li>Necesita actualizaciones menores</li>'
            vo_html = (
                f'<div class="section">'
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
                f'<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:12px;">'
                f'<div style="font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">✅ VENTAJAS COMPETITIVAS</div>'
                f'<ul style="margin:0;padding-left:15px;font-size:11px;color:#1a2e23;line-height:1.4;">{v_items}</ul>'
                f'</div>'
                f'<div style="background:#fff7ed;border:1.5px solid #ffedd5;border-radius:8px;padding:12px;">'
                f'<div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">⚠️ ÁREAS DE OPORTUNIDAD</div>'
                f'<ul style="margin:0;padding-left:15px;font-size:11px;color:#431407;line-height:1.4;">{o_items}</ul>'
                f'</div>'
                f'</div>'
                f'</div>'
            )

        # Estrategia de comercialización — box azul (igual que server.js)
        est = ai_sections.get("estrategia", {})
        if est:
            canales = est.get("canales", [])
            tips_e = est.get("tips", [])
            perfil = est.get("perfil_comprador", "")
            precio_entrada = est.get("precio_entrada", "")
            all_recs = []
            if perfil:
                all_recs.append(f"Perfil del Comprador: {perfil}")
            if precio_entrada:
                all_recs.append(f"Precio Sugerido: {precio_entrada}")
            all_recs.extend([f"Canal: {c}" for c in canales])
            all_recs.extend(list(tips_e))
            tips_items_html = ""
            for tip in all_recs:
                colon_idx = tip.find(':')
                has_title = 0 < colon_idx < 55
                if has_title:
                    title_part = tip[:colon_idx].strip()
                    desc_part = tip[colon_idx + 1:].strip()
                    tips_items_html += (
                        f'<div style="display:flex;gap:8px;align-items:flex-start;">'
                        f'<span style="font-size:15px;">🎯</span>'
                        f'<div style="font-size:11px;color:#1e3a8a;line-height:1.4;"><strong style="font-weight:800;color:#1e40af;">{title_part}:</strong> {desc_part}</div>'
                        f'</div>'
                    )
                else:
                    tips_items_html += (
                        f'<div style="display:flex;gap:8px;align-items:flex-start;">'
                        f'<span style="font-size:15px;">🎯</span>'
                        f'<div style="font-size:11px;color:#1e3a8a;line-height:1.4;">{tip}</div>'
                        f'</div>'
                    )
            estrategia_html = (
                f'<div class="section">'
                f'<h2>📣 ESTRATEGIA DE COMERCIALIZACIÓN Y PROMOCIÓN</h2>'
                f'<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:15px;margin-bottom:12px;">'
                f'<div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">💼 RECOMENDACIONES PARA INMOBILIARIAS Y PROPIETARIOS</div>'
                f'<div style="display:flex;flex-direction:column;gap:8px;">{tips_items_html}</div>'
                f'</div>'
                f'</div>'
            )

        # Equipamiento y Servicios — tarjetas con datos de Gemini (página 4, igual que PDF)
        pe_equip = ai_sections.get("perfil_entorno", {})
        _equip_cfg = [
            ("educacion", "🏫", "Escuelas", "Educación"),
            ("salud",     "🏥", "Hospitales", "Salud"),
            ("comercio",  "🛒", "Súper / Tiendas", "Comercio"),
            ("recreacion","🌳", "Parques", "Recreación"),
            ("plazas",    "🏪", "Plazas", "Plazas"),
        ]
        cards = ""
        for key, icon, label, cat_name in _equip_cfg:
            cat = pe_equip.get(key, {}) if pe_equip else {}
            if not cat:
                continue
            count = cat.get("count", "") if isinstance(cat, dict) else ""
            nombres = cat.get("nombres", "") if isinstance(cat, dict) else ""
            texto = cat.get("texto", "") if isinstance(cat, dict) else ""
            title = f"{count} {label}" if count else label
            cards += (
                f'<div style="display:flex;gap:10px;align-items:flex-start;background:white;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">'
                f'<div style="font-size:28px;flex-shrink:0;">{icon}</div>'
                f'<div style="flex:1;">'
                f'<strong style="display:block;font-size:13px;color:#1B4332;">{title}</strong>'
                f'<div style="font-size:9.5px;color:#6b7280;margin-bottom:3px;">{cat_name}</div>'
                f'<div style="font-size:10.5px;font-weight:600;color:#1B4332;line-height:1.3;">{nombres or texto}</div>'
                f'</div>'
                f'</div>'
            )
        if cards:
            equipamiento_ai_html = (
                f'<div class="section">'
                f'<h2>🏘️ EQUIPAMIENTO Y SERVICIOS RELEVANTES EN EL ENTORNO (RADIO 1.5 KM)</h2>'
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">{cards}</div>'
                f'</div>'
            )

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Valuación - PropValu</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        :root {{
            --primary: #1B4332;
            --secondary: #52B788;
            --accent: #D9ED92;
            --danger: #b91c1c;
            --success: #15803d;
            --gray-50: #f8fafc;
            --gray-100: #f1f5f9;
            --gray-200: #e2e8f0;
            --gray-500: #64748b;
            --gray-700: #334155;
            --gray-900: #0f172a;
        }}
        
        @page {{
            size: letter;
            margin: 0.5in;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, sans-serif;
            color: var(--gray-900);
            line-height: 1.5;
            background: white;
            font-size: 12pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .report {{
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.25in;
        }}
        
        /* Header */
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid var(--primary);
            padding-bottom: 10pt;
            margin-bottom: 12pt;
        }}
        
        .logo {{
            font-family: 'Outfit', sans-serif;
            font-size: 24pt;
            font-weight: 700;
            color: var(--primary);
        }}
        
        .logo span {{ color: var(--secondary); }}
        
        .report-meta {{
            text-align: right;
            font-size: 11pt;
            color: var(--gray-500);
        }}
        
        /* Typography */
        h1, h2, h3 {{
            font-family: 'Outfit', sans-serif;
            color: var(--primary);
        }}
        
        h1 {{
            font-size: 18pt;
            text-align: center;
            background: linear-gradient(135deg, var(--primary), #2D6A4F);
            color: white;
            padding: 12pt;
            border-radius: 6pt;
            margin-bottom: 14pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        h2 {{
            font-size: 14pt;
            margin: 12pt 0 8pt;
            padding-bottom: 4pt;
            border-bottom: 2pt solid var(--accent);
        }}
        
        /* Section */
        .section {{ margin-bottom: 10pt; }}
        
        /* Data Grid */
        .data-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5pt;
        }}
        
        .data-item {{
            display: flex;
            justify-content: space-between;
            padding: 6pt 10pt;
            background: var(--gray-50);
            border-radius: 4pt;
            font-size: 11pt;
        }}
        
        .data-label {{ color: var(--gray-500); font-size: 10pt; }}
        .data-value {{ font-weight: 600; color: var(--primary); font-size: 11pt; }}
        
        /* Features */
        .features-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 6pt;
            margin: 8pt 0;
        }}
        
        .feature-tag {{
            background: var(--accent);
            color: var(--primary);
            padding: 5pt 12pt;
            border-radius: 12pt;
            font-size: 11pt;
            font-weight: 500;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .other-features {{
            background: var(--gray-50);
            padding: 10pt 14pt;
            border-radius: 4pt;
            font-size: 11pt;
            margin-top: 8pt;
        }}
        
        /* Land Use */
        .land-use-box {{
            background: var(--gray-50);
            padding: 10pt;
            border-radius: 6pt;
            border-left: 4pt solid var(--secondary);
            margin: 8pt 0;
        }}
        
        .land-use-header {{
            display: flex;
            align-items: center;
            gap: 8pt;
            margin-bottom: 4pt;
        }}
        
        .land-use-icon {{ font-size: 28pt; }}
        
        .land-use-code {{
            background: var(--primary);
            color: white;
            padding: 3pt 8pt;
            border-radius: 3pt;
            font-size: 11pt;
            margin-right: 6pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .land-use-desc {{
            font-size: 11pt;
            color: var(--gray-500);
        }}
        
        .land-use-unknown {{
            display: flex;
            align-items: center;
            gap: 10pt;
            padding: 12pt;
            background: #fef3c7;
            border-radius: 6pt;
            margin: 8pt 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .warning-icon {{ font-size: 32pt; }}
        
        /* Map */
        .map-container {{
            border-radius: 6pt;
            overflow: hidden;
            border: 1pt solid var(--gray-200);
            aspect-ratio: 4/3;
            margin: 8pt 0;
            background: var(--gray-100);
        }}
        
        .map-container iframe {{
            width: 100%;
            height: 100%;
            border: 0;
        }}
        
        .map-address {{
            font-size: 11pt;
            color: var(--gray-700);
            text-align: center;
            margin-top: 6pt;
            font-weight: 500;
        }}
        
        .map-coords {{
            font-size: 10pt;
            color: var(--gray-500);
            text-align: center;
            margin-top: 2pt;
        }}
        
        /* Result Box */
        .result-box {{
            background: linear-gradient(135deg, var(--primary), #2D6A4F);
            color: white;
            padding: 12pt;
            border-radius: 8pt;
            text-align: center;
            margin: 10pt 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .result-label {{ font-size: 11pt; opacity: 0.9; }}
        
        .result-value {{
            font-family: 'Outfit', sans-serif;
            font-size: 28pt;
            font-weight: 700;
            margin: 6pt 0;
        }}
        
        .result-range {{ font-size: 11pt; opacity: 0.85; }}
        
        .result-sqm {{
            font-size: 13pt;
            margin-top: 6pt;
        }}
        
        .confidence {{
            display: inline-block;
            padding: 4pt 12pt;
            border-radius: 10pt;
            font-size: 11pt;
            font-weight: 600;
            margin-top: 8pt;
        }}
        
        .confidence.alto {{ background: var(--accent); color: var(--primary); }}
        .confidence.medio {{ background: #fef3c7; color: #92400e; }}
        .confidence.bajo {{ background: #fee2e2; color: #991b1b; }}
        
        /* Thermometer */
        .thermo-container {{
            margin: 10pt 0;
            padding: 10pt;
            background: var(--gray-50);
            border-radius: 6pt;
        }}
        
        .thermo-title {{
            font-size: 12pt;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 8pt;
            text-align: center;
        }}
        
        .thermometer {{
            position: relative;
            height: 24pt;
            background: linear-gradient(to right, #dc2626, #f59e0b, #22c55e);
            border-radius: 12pt;
            margin: 8pt 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .thermo-marker {{
            position: absolute;
            top: -3pt;
            width: 14pt;
            height: 30pt;
            background: var(--primary);
            border: 2pt solid white;
            border-radius: 7pt;
            transform: translateX(-50%);
            box-shadow: 0 2pt 4pt rgba(0,0,0,0.2);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .thermo-explanation {{
            font-size: 9pt;
            color: var(--gray-500);
            text-align: center;
            margin-bottom: 6pt;
        }}
        
        .thermo-labels {{
            display: flex;
            justify-content: space-between;
            margin-top: 8pt;
            padding: 0 4pt;
        }}
        
        .thermo-label-group {{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2pt;
        }}
        
        .thermo-value {{
            font-weight: 700;
            font-size: 10pt;
        }}
        
        .thermo-text {{
            font-size: 9pt;
            font-weight: 500;
        }}
        
        .thermo-min {{ color: #dc2626; }}
        .thermo-mid {{ color: var(--primary); }}
        .thermo-max {{ color: #22c55e; }}
        
        /* Executive Summary */
        .exec-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10pt;
            margin: 12pt 0;
        }}
        
        .exec-card {{
            text-align: center;
            padding: 12pt;
            border-radius: 6pt;
            background: var(--gray-50);
            border: 1pt solid var(--gray-200);
        }}
        
        .exec-card.highlight {{
            background: linear-gradient(135deg, var(--accent), #B5E48C);
            border: none;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .exec-icon {{ font-size: 28pt; margin-bottom: 4pt; }}
        .exec-value {{ font-size: 16pt; font-weight: 700; color: var(--primary); }}
        .exec-label {{ font-size: 10pt; color: var(--gray-500); margin-top: 3pt; }}
        
        /* Breakdown */
        .breakdown-row {{
            display: flex;
            align-items: center;
            gap: 16pt;
            padding: 12pt;
            background: var(--gray-50);
            border-radius: 6pt;
            margin: 10pt 0;
        }}
        
        .breakdown-chart {{
            width: 70pt;
            height: 70pt;
            border-radius: 50%;
            background: conic-gradient(
                var(--primary) 0deg {land_percent * 3.6}deg,
                var(--secondary) {land_percent * 3.6}deg 360deg
            );
            position: relative;
            flex-shrink: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .breakdown-chart::after {{
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 35pt;
            height: 35pt;
            background: white;
            border-radius: 50%;
        }}
        
        .breakdown-legend {{
            flex: 1;
        }}
        
        .legend-item {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 5pt 0;
            font-size: 12pt;
        }}
        
        .legend-color {{
            width: 12pt;
            height: 12pt;
            border-radius: 2pt;
            margin-right: 8pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        /* Amenities */
        .amenities-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8pt;
            margin: 10pt 0;
        }}
        
        .amenity-item {{
            display: flex;
            align-items: center;
            gap: 8pt;
            padding: 10pt;
            background: var(--gray-50);
            border-radius: 4pt;
            font-size: 12pt;
        }}
        
        .amenity-num {{
            background: var(--primary);
            color: white;
            width: 20pt;
            height: 20pt;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11pt;
            font-weight: 600;
            flex-shrink: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .amenity-icon {{ font-size: 24pt; }}
        .amenity-desc {{ font-size: 10pt; color: var(--gray-500); display: block; }}
        
        /* Table */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10pt 0;
            font-size: 10pt;
        }}
        
        th {{
            background: var(--primary);
            color: white;
            padding: 8pt 5pt;
            text-align: left;
            font-weight: 600;
            font-size: 10pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        td {{
            padding: 6pt 5pt;
            border-bottom: 1pt solid var(--gray-200);
            font-size: 10pt;
        }}
        
        tr:nth-child(even) {{
            background: var(--gray-50);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .text-center {{ text-align: center; }}
        .text-right {{ text-align: right; }}
        
        .source-link {{
            color: var(--secondary);
            text-decoration: none;
            font-weight: 500;
        }}
        
        /* Analysis */
        .analysis {{
            background: var(--gray-50);
            padding: 12pt;
            border-radius: 6pt;
            border-left: 4pt solid var(--secondary);
            white-space: pre-wrap;
            font-size: 11pt;
            line-height: 1.7;
        }}
        
        /* Photos */
        .photos-section {{ margin: 14pt 0; }}
        
        .photos-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5pt;
        }}
        
        .photo-item {{
            height: 110pt;
            border-radius: 4pt;
            overflow: hidden;
            background: var(--gray-100);
            border: 1pt solid var(--gray-200);
        }}
        
        .photo-item img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        
        /* Tips */
        .tips-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8pt;
            margin: 10pt 0;
        }}
        
        .tip-item {{
            display: flex;
            align-items: flex-start;
            gap: 8pt;
            padding: 8pt 10pt;
            background: var(--gray-50);
            border-radius: 4pt;
            font-size: 10pt;
            line-height: 1.4;
        }}
        
        .tip-icon {{ font-size: 24pt; flex-shrink: 0; }}
        
        /* Disclaimer */
        .disclaimer {{
            background: #fef3c7;
            border: 1pt solid #fcd34d;
            padding: 10pt 12pt;
            border-radius: 6pt;
            font-size: 10pt;
            margin-top: 14pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        
        .disclaimer ul {{
            margin: 8pt 0 0 18pt;
            line-height: 1.6;
        }}
        
        /* Footer */
        .footer {{
            margin-top: 14pt;
            padding-top: 10pt;
            border-top: 2pt solid var(--gray-200);
            text-align: center;
            font-size: 11pt;
            color: var(--gray-500);
        }}
        
        /* Page breaks */
        .page-break {{
            page-break-after: always;
        }}

        .page-break-before {{
            page-break-before: always;
        }}

        /* Plusvalía proyectada */
        .plusvalia-bars {{
            display: flex;
            align-items: flex-end;
            gap: 8pt;
            height: 80pt;
            padding: 0 4pt;
            margin: 10pt 0 4pt;
        }}
        .plusvalia-bar-wrap {{
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            height: 100%;
            gap: 3pt;
        }}
        .plusvalia-bar {{
            width: 100%;
            border-radius: 4pt 4pt 0 0;
            background: linear-gradient(to top, var(--primary), var(--secondary));
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        .plusvalia-label {{
            font-size: 8pt;
            color: var(--gray-500);
            text-align: center;
        }}
        .plusvalia-value {{
            font-size: 8pt;
            font-weight: 700;
            color: var(--primary);
            text-align: center;
        }}
        .plusvalia-comment {{
            font-size: 10pt;
            color: var(--gray-500);
            font-style: italic;
            margin-top: 6pt;
            text-align: center;
        }}

        /* Perfil del entorno */
        .entorno-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8pt;
            margin: 10pt 0;
        }}
        .entorno-item {{
            padding: 10pt;
            background: var(--gray-50);
            border-radius: 6pt;
            border: 1pt solid var(--gray-200);
        }}
        .entorno-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 5pt;
        }}
        .entorno-name {{
            font-size: 10pt;
            font-weight: 600;
            color: var(--gray-700);
        }}
        .entorno-score {{
            font-size: 11pt;
            font-weight: 700;
            color: var(--primary);
        }}
        .entorno-bar-bg {{
            height: 5pt;
            background: var(--gray-200);
            border-radius: 3pt;
            overflow: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        .entorno-bar-fill {{
            height: 100%;
            border-radius: 3pt;
            background: linear-gradient(to right, var(--secondary), var(--primary));
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        .entorno-desc {{
            font-size: 9pt;
            color: var(--gray-500);
            margin-top: 5pt;
            line-height: 1.4;
        }}

        /* Ventajas / Oportunidades */
        .vo-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10pt;
            margin: 10pt 0;
        }}
        .vo-col {{
            padding: 10pt;
            border-radius: 6pt;
        }}
        .vo-col.ventajas {{
            background: #f0fdf4;
            border: 1pt solid #bbf7d0;
        }}
        .vo-col.oportunidades {{
            background: #fffbeb;
            border: 1pt solid #fde68a;
        }}
        .vo-title {{
            font-size: 11pt;
            font-weight: 700;
            margin-bottom: 8pt;
        }}
        .vo-title.ventajas {{ color: #15803d; }}
        .vo-title.oportunidades {{ color: #92400e; }}
        .vo-item {{
            display: flex;
            align-items: flex-start;
            gap: 5pt;
            margin: 5pt 0;
            font-size: 10pt;
            line-height: 1.4;
        }}
        .vo-dot {{
            font-size: 8pt;
            margin-top: 2pt;
            flex-shrink: 0;
        }}

        /* Estrategia de comercialización */
        .estrategia-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10pt;
            margin: 10pt 0;
        }}
        .estrategia-box {{
            padding: 10pt;
            background: var(--gray-50);
            border-radius: 6pt;
            border: 1pt solid var(--gray-200);
        }}
        .estrategia-box-title {{
            font-size: 10pt;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 6pt;
        }}
        .estrategia-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .estrategia-list li {{
            font-size: 10pt;
            line-height: 1.5;
            padding: 2pt 0;
            color: var(--gray-700);
        }}
        .estrategia-list li::before {{
            content: "▶ ";
            color: var(--secondary);
            font-size: 8pt;
        }}
        
        @media print {{
            body {{ background: white; margin: 0; }}
            .report {{ padding: 12pt; box-shadow: none; }}
            .no-print {{ display: none; }}
            .section {{ page-break-inside: avoid; margin-bottom: 8pt; }}
            table {{ page-break-inside: avoid; }}
            .result-box {{ page-break-inside: avoid; }}
            .thermo-container {{ page-break-inside: avoid; }}
            .page-break-before {{ page-break-before: always; }}
        }}
    </style>
</head>
<body>
    <div class="report">
        <!-- PÁGINA 1 -->
        <div class="header">
            <div class="logo">Prop<span>Valu</span></div>
            <div class="report-meta">
                <div>Reporte de Valuación</div>
                <div>Folio: {folio}</div>
                <div>Fecha: {date_str}</div>
            </div>
        </div>
        
        <h1>📊 ESTIMACIÓN DE VALOR DE MERCADO</h1>
        
        <div class="section">
            <h2>🏠 DATOS DEL INMUEBLE</h2>
            <div class="data-grid">
                <div class="data-item">
                    <span class="data-label">📍 Ubicación</span>
                    <span class="data-value">{prop['neighborhood']}, {prop['municipality']}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">🗺 Estado</span>
                    <span class="data-value">{prop['state']}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">📐 Terreno</span>
                    <span class="data-value">{prop['land_area']} m²</span>
                </div>
                <div class="data-item">
                    <span class="data-label">🏗 Construcción</span>
                    <span class="data-value">{prop['construction_area']} m²</span>
                </div>
                <div class="data-item">
                    <span class="data-label">🏷 Tipo</span>
                    <span class="data-value">{prop.get('property_type', 'Casa')}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">📋 Régimen</span>
                    <span class="data-value">{prop['land_regime']}</span>
                </div>
            </div>
            
            {f'<div class="features-row">{features_html}</div>' if features_html else ''}
            {other_features_html}
        </div>
        
        {'<div class="section"><h2>📋 USO DE SUELO</h2>' + land_use_html + '</div>' if is_valuer_mode else ''}
        
        <div class="section">
            <h2>📍 UBICACIÓN</h2>
            <div class="map-container">
                {'<img src="' + static_map_src + '" alt="Mapa de ubicación" style="width: 100%; height: 100%; object-fit: cover;"/>' if has_static_map else '<iframe width="100%" height="100%" frameborder="0" scrolling="no" src="' + embed_map_url + '" style="border: 0;"></iframe>'}
            </div>
            <p class="map-address">📍 {prop.get('street_address', '')} {prop['neighborhood']}, {prop['municipality']}, {prop['state']}</p>
            <p class="map-coords">Coordenadas: {lat:.6f}, {lng:.6f}</p>
        </div>

        {plusvalia_entorno_html}

        <div class="result-box">
            <div class="result-label">💰 VALOR DE MERCADO ESTIMADO</div>
            <div class="result-value">${result['estimated_value']:,.0f} MXN</div>
            <div class="result-range">Rango: ${result['value_range_min']:,.0f} - ${result['value_range_max']:,.0f} MXN</div>
            <div class="result-sqm">Precio por m²: <strong>${result['price_per_sqm']:,.0f}/m²</strong></div>
            <span class="confidence {result['confidence_level'].lower()}">📈 Confianza: {result['confidence_level']}</span>
        </div>
        
        <div class="thermo-container">
            <div class="thermo-title">🌡 Posición Competitiva en el Mercado: <strong>{position_label}</strong></div>
            <p class="thermo-explanation">
                Basado en: conservación ({conservation}), precio/m² vs mercado (${subject_price_sqm:,.0f} vs ${avg_comp_price_sqm:,.0f}), oferta ({similar_count} propiedades)
            </p>
            <div class="thermometer">
                <div class="thermo-marker" style="left: {thermo_position:.0f}%;"></div>
            </div>
            <div class="thermo-labels">
                <div class="thermo-label-group">
                    <span class="thermo-value thermo-min">${value_min:,.0f}</span>
                    <span class="thermo-text thermo-min">Desventaja</span>
                </div>
                <div class="thermo-label-group">
                    <span class="thermo-value thermo-mid">${value_estimated:,.0f}</span>
                    <span class="thermo-text thermo-mid">Equilibrio</span>
                </div>
                <div class="thermo-label-group">
                    <span class="thermo-value thermo-max">${value_max:,.0f}</span>
                    <span class="thermo-text thermo-max">Ventaja</span>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📈 RESUMEN EJECUTIVO</h2>
            <div class="exec-grid">
                <div class="exec-card highlight">
                    <div class="exec-icon">💵</div>
                    <div class="exec-value">${result['estimated_value']:,.0f}</div>
                    <div class="exec-label">Valor Venta</div>
                </div>
                <div class="exec-card">
                    <div class="exec-icon">🏠</div>
                    <div class="exec-value">${monthly_rent:,.0f}</div>
                    <div class="exec-label">Renta/Mes</div>
                </div>
                <div class="exec-card">
                    <div class="exec-icon">📊</div>
                    <div class="exec-value">{cap_rate:.1f}%</div>
                    <div class="exec-label">Cap Rate</div>
                </div>
                <div class="exec-card">
                    <div class="exec-icon">📈</div>
                    <div class="exec-value">{appreciation_range}</div>
                    <div class="exec-label">Plusvalía</div>
                </div>
            </div>
            
            <div class="data-grid">
                <div class="data-item">
                    <span class="data-label">📉 Valor Mínimo</span>
                    <span class="data-value" style="color: var(--danger);">${result['value_range_min']:,.0f}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">📈 Valor Máximo</span>
                    <span class="data-value" style="color: var(--success);">${result['value_range_max']:,.0f}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">💰 Renta Anual</span>
                    <span class="data-value">${annual_rent:,.0f}</span>
                </div>
                <div class="data-item">
                    <span class="data-label">🏘 Props. Similares</span>
                    <span class="data-value">{similar_count} en venta</span>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>⚖ DESGLOSE DE VALOR FÍSICO</h2>
            <div class="breakdown-row">
                <div class="breakdown-chart"></div>
                <div class="breakdown-legend">
                    <div class="legend-item">
                        <div style="display: flex; align-items: center;">
                            <div class="legend-color" style="background: var(--primary);"></div>
                            <span>🌍 Terreno</span>
                        </div>
                        <strong>${result['land_value']:,.0f} ({land_percent:.0f}%)</strong>
                    </div>
                    <div class="legend-item">
                        <div style="display: flex; align-items: center;">
                            <div class="legend-color" style="background: var(--secondary);"></div>
                            <span>🏗 Construcción</span>
                        </div>
                        <strong>${result['construction_depreciated']:,.0f} ({construction_percent:.0f}%)</strong>
                    </div>
                    <div class="legend-item" style="margin-top: 6pt; padding-top: 6pt; border-top: 1pt solid var(--gray-200);">
                        <span style="color: var(--gray-500);">📉 Depreciación (Ross-Heidecke):</span>
                        <span>{result['depreciation_percent']}%</span>
                    </div>
                    <p style="font-size: 8pt; color: var(--gray-500); margin-top: 4pt;">
                        Método Ross-Heidecke: depreciación por edad ({prop.get('estimated_age', 10)} años) y estado de conservación ({prop.get('conservation_state', 'Bueno')})
                    </p>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔍 COMPARABLES ({len(active_comparables)})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Colonia</th>
                        <th class="text-right">Terr.</th>
                        <th class="text-right">Const.</th>
                        <th class="text-right">Precio</th>
                        <th class="text-right">$/m²</th>
                        <th class="text-center">Ajuste</th>
                        <th class="text-right">$/m² Aj.</th>
                        <th>Fuente</th>
                    </tr>
                </thead>
                <tbody>
                    {comp_rows}
                </tbody>
            </table>
        </div>
        
        {vo_html}
        {estrategia_html}

        {equipamiento_ai_html}

        {f'''<div class="section">
            <h2>📝 ANÁLISIS Y OBSERVACIONES</h2>
            <div class="analysis">{analysis}</div>
        </div>''' if include_analysis else ''}

        {photos_html}

        <div class="section">
            <h2>💡 TIPS GENERALES DE PRESENTACIÓN (HOME STAGING)</h2>
            <div class="tips-grid">
                {tips_html}
            </div>
        </div>
        
        <div class="disclaimer">
            <strong>⚠️ AVISO LEGAL Y LIMITACIONES:</strong>
            <ul>
                <li>Los comparables fueron obtenidos mediante búsqueda en internet en tiempo real y pueden variar.</li>
                <li>Los valores paramétricos de construcción fueron obtenidos de fuentes web con fecha de consulta: {date_str}.</li>
                <li>El resultado es una <strong>estimación orientativa</strong>, no un avalúo oficial con validez legal.</li>
                {'<li><strong>Este reporte contó con la revisión y apoyo de un valuador profesional</strong> quien verificó los comparables y la información capturada.</li>' if is_valuer_mode else '<li>Esta estimación fue generada automáticamente sin verificación de un valuador profesional.</li>'}
            </ul>
            <p style="margin-top: 10pt; color: var(--gray-700);">
                📅 Estimación generada el {date_str} · Metodología CNBV / SHF / INDAABIN · 
                <strong>No sustituye avalúo oficial de perito certificado con validez legal.</strong>
            </p>
        </div>
        
        <div class="footer">
            <p style="font-size: 14pt;">🏠 PropValu México - Plataforma de Estimación Inmobiliaria con IA</p>
            {'<p style="color: var(--primary); font-weight: 600; font-size: 12pt;">✓ Reporte verificado por valuador profesional</p>' if is_valuer_mode else '<p style="color: var(--gray-500); font-size: 11pt;">Reporte generado automáticamente sin verificación de perito valuador</p>'}
            <p style="font-size: 10pt; color: var(--gray-400);">www.propvalu.mx</p>
        </div>
    </div>
</body>
</html>"""
    
    return html
