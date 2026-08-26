"""
HTML Report Generator for PropValu v3.0
- 5 páginas: Datos | Valor | Comparables | Entorno/Recomendaciones | Fotos
- CSS exacto del template reporte-preview-TEMPLATE.html
- Diseño fiel al PDF de referencia Emergent 19.1
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from static_map import get_map_for_report

# Catálogo de uso de suelo
LAND_USE_INFO = {
    "H1-U": {"name": "Habitacional Unifamiliar", "description": "Una vivienda por lote, baja densidad", "icon": "🏠", "color": "#22c55e"},
    "H2-U": {"name": "Habitacional Dúplex", "description": "Dos viviendas por lote", "icon": "🏠", "color": "#22c55e"},
    "H3-U": {"name": "Habitacional Tríplex", "description": "Tres viviendas por lote", "icon": "🏠", "color": "#84cc16"},
    "H2-H": {"name": "Plurifamiliar Horizontal", "description": "Viviendas horizontales en condominio", "icon": "🏘", "color": "#84cc16"},
    "H2-V": {"name": "Plurifamiliar Vertical Baja", "description": "Edificios de hasta 4 niveles", "icon": "🏢", "color": "#eab308"},
    "H3-V": {"name": "Plurifamiliar Vertical Media", "description": "Edificios de 5-8 niveles", "icon": "🏢", "color": "#f97316"},
    "H4-V": {"name": "Plurifamiliar Vertical Alta", "description": "Torres de más de 8 niveles", "icon": "🏙", "color": "#ef4444"},
    "HM":   {"name": "Habitacional Mixto", "description": "Vivienda con otros usos compatibles", "icon": "🏬", "color": "#06b6d4"},
    "HC":   {"name": "Habitacional con Comercio Vecinal", "description": "Comercio en planta baja, vivienda arriba", "icon": "🏪", "color": "#06b6d4"},
    "HO":   {"name": "Habitacional con Oficinas", "description": "Oficinas y vivienda en mismo predio", "icon": "🏢", "color": "#8b5cf6"},
    "CU":   {"name": "Comercio Uniforme", "description": "Comercio de pequeña escala", "icon": "🛒", "color": "#8b5cf6"},
    "CB":   {"name": "Centro de Barrio", "description": "Servicios y comercio local", "icon": "🏬", "color": "#ec4899"},
    "CD":   {"name": "Centro de Distrito", "description": "Comercio y servicios a nivel distrito", "icon": "🏬", "color": "#f43f5e"},
    "CS":   {"name": "Corredor de Servicios", "description": "Comercio en vías principales", "icon": "🛣", "color": "#f43f5e"},
    "CC":   {"name": "Centro Comercial", "description": "Plazas y centros comerciales", "icon": "🏬", "color": "#dc2626"},
    "CR":   {"name": "Corredor Regional", "description": "Comercio de alto impacto regional", "icon": "🏪", "color": "#dc2626"},
    "I-L":  {"name": "Industrial Ligera", "description": "Manufactura ligera, talleres", "icon": "🏭", "color": "#64748b"},
    "I-M":  {"name": "Industrial Media", "description": "Industria de mediano impacto", "icon": "🏭", "color": "#475569"},
    "I-P":  {"name": "Industrial Pesada", "description": "Industria de alto impacto", "icon": "🏭", "color": "#334155"},
    "IP":   {"name": "Industria Parque", "description": "Parques industriales planificados", "icon": "🏭", "color": "#1e293b"},
    "EA":   {"name": "Espacios Abiertos", "description": "Parques, jardines, áreas verdes", "icon": "🌳", "color": "#22c55e"},
    "EI":   {"name": "Equipamiento Institucional", "description": "Escuelas, hospitales, gobierno", "icon": "🏛", "color": "#3b82f6"},
    "PE":   {"name": "Preservación Ecológica", "description": "Áreas naturales protegidas", "icon": "🌲", "color": "#16a34a"},
    "AG":   {"name": "Agrícola", "description": "Uso agrícola y ganadero", "icon": "🌾", "color": "#a3e635"},
    # Valores auto-sugeridos por el formulario (ValuationForm) que no usan el código oficial.
    "h_habitacional": {"name": "Habitacional Unifamiliar", "description": "Una vivienda por lote", "icon": "🏠", "color": "#22c55e"},
    "h_popular":      {"name": "Habitacional Popular", "description": "Interés social / económico", "icon": "🏠", "color": "#22c55e"},
    "h_vertical":     {"name": "Habitacional Vertical", "description": "Departamentos en edificio", "icon": "🏢", "color": "#eab308"},
    "comercial":      {"name": "Comercial", "description": "Uso comercial", "icon": "🏪", "color": "#8b5cf6"},
    "oficinas":       {"name": "Oficinas", "description": "Uso de oficinas", "icon": "🏢", "color": "#8b5cf6"},
    "desconocido": {"name": "Por Verificar", "description": "Consulte el visor urbano municipal", "icon": "❓", "color": "#94a3b8"},
}

FEATURE_ICONS = {
    "parking": "🅿️", "pool": "🏊", "garden": "🌳", "patio": "🌳", "terrace": "🌅",
    "gym": "🏋", "security": "🛡", "elevator": "🛗", "rooftop": "🌿",
    "service_room": "🚪", "laundry_room": "🧺", "storage": "📦", "kitchen_integral": "🍳",
    "solar_panels": "☀️", "solar_heater": "🌡️", "cistern": "💧", "electric_fence": "⚡", "ac": "❄️",
}
FEATURE_NAMES = {
    "parking": "Estacionamiento", "pool": "Alberca", "garden": "Jardín", "patio": "Patio",
    "terrace": "Terraza", "gym": "Gimnasio", "security": "Seguridad 24/7", "elevator": "Elevador",
    "rooftop": "Roof Garden", "service_room": "Cuarto de Servicio", "laundry_room": "Cuarto de Lavado",
    "storage": "Bodega/Almacén", "kitchen_integral": "Cocina Integral",
    "solar_panels": "Paneles Solares", "solar_heater": "Calentador Solar",
    "cistern": "Cisterna/Aljibe", "electric_fence": "Cerca Eléctrica", "ac": "Aire Acondicionado",
}


def get_land_use_info(land_use: str) -> Dict:
    return LAND_USE_INFO.get(land_use, LAND_USE_INFO["desconocido"])


def generate_folio(valuation_id: str) -> str:
    """Fallback legado (público sin folio guardado): EST-YYMMDD-PU-NN."""
    num = ''.join(filter(str.isdigit, valuation_id[-4:])) or '01'
    return build_folio("public", "", int(num[:2] or "1"))


_SIGLAS_STOPWORDS = {"y", "e", "de", "del", "la", "el", "los", "las"}


def user_siglas(nombre: str) -> str:
    """2 iniciales de las palabras significativas del nombre/empresa. '' si vacío.
    Ej: 'Avaluos y Arquitectura' -> 'AA'; 'Ana Vargas' -> 'AV'."""
    if not nombre:
        return ""
    palabras = [w for w in nombre.split() if w.lower() not in _SIGLAS_STOPWORDS and w[:1].isalnum()]
    return "".join(w[0] for w in palabras[:2]).upper()


def tipo_code(role: str) -> str:
    """Tipo de usuario para el folio: IN inmobiliaria, PE perito, AD admin, PU público."""
    return {"realtor": "IN", "appraiser": "PE", "super_admin": "AD"}.get((role or "").lower(), "PU")


def build_folio(role: str, siglas: str, seq: int, when=None) -> str:
    """EST-YYMMDD-TIPO[-SIGLAS]-NN. Público (PU) no lleva siglas."""
    when = when or datetime.now(timezone.utc)
    tipo = tipo_code(role)
    partes = ["EST", when.strftime("%y%m%d"), tipo]
    if tipo != "PU" and siglas:
        partes.append(siglas)
    partes.append(str(seq).zfill(2))
    return "-".join(partes)


# ── CSS exacto del template reporte-preview-TEMPLATE.html ─────────────────────
_REPORT_CSS = """
  :root {
    --green-900: #1B4231;
    --green-700: #2D6A4F;
    --green-500: #51B687;
    --green-100: #f0faf4;
    --lime:      #D9ED91;
    --text-main: #0F162A;
    --text-sec:  #63738A;
    --text-comp: #1A2E22;
    --text-blue: #0183C7;
    --text-mkt:  #1E3A89;
    --text-disc: #913F0D;
    --red:       #DC2525;
    --gray-50:   #f8fafc;
    --gray-100:  #f1f5f9;
    --gray-200:  #e2e8f0;
    --gray-400:  #94a3b8;
    --gray-500:  #64748b;
    --box-bg:    #fcfcfc;
    --white:     #FFFFFF;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #d0d8e4;
    color: var(--text-main);
    font-size: 12px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 24px auto;
    padding: 18px 28px 30px;
    background: white;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    border-radius: 16px;
    position: relative;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }
  h1, h2, h3 { font-family: 'Outfit', sans-serif; }

  /* Impresión / PDF: sin @page el navegador agrega sus propios márgenes (grandes
     a los lados) y empuja la hoja de 297mm a la siguiente física. margin:0 hace que
     cada .page ocupe exactamente una hoja A4 y el padding interno sea el margen. */
  @media print {
    @page { size: A4; margin: 0; }
    body { background: #fff; }
    .page {
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      width: 210mm;
      min-height: 297mm;
    }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--green-900);
    margin-bottom: 14px;
  }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-icon {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    color: var(--green-900);
  }
  .logo-icon svg { width: 32px; height: 32px; }
  .logo-text { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: var(--green-900); }
  .logo-text span { color: #51B687; }
  .folio-box { text-align: right; font-size: 10px; color: var(--text-sec); line-height: 1.7; }
  .folio-box strong { color: var(--text-main); }

  .title-banner {
    background: var(--green-900);
    color: white;
    text-align: center;
    padding: 9px 20px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-family: 'Outfit', sans-serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
  }

  .section-title {
    font-family: 'Outfit', sans-serif;
    font-size: 13px; font-weight: 700;
    color: var(--green-900);
    margin-bottom: 9px;
    display: flex; align-items: center; gap: 5px;
  }

  .inmueble-card { border: 1px solid var(--gray-200); border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
  .inmueble-top {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0;
    border-bottom: 1px solid var(--gray-200); background: var(--gray-50);
  }
  .inmueble-addr { padding: 10px 14px; border-right: 1px solid var(--gray-200); }
  .prop-address { font-size: 12px; font-weight: 700; color: var(--text-main); }
  .prop-city    { font-size: 11px; color: var(--text-sec); margin-top: 2px; }
  .tech-note { padding: 10px 14px; font-size: 10px; color: #92400e; background: #fffbeb; }
  .tech-note strong { color: #b45309; display: block; margin-bottom: 2px; }

  .data-grid { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  .data-grid td {
    border-top: 1px solid var(--gray-200);
    border-right: 1px solid var(--gray-200);
    padding: 7px 9px; width: 20%;
    vertical-align: top; background: white;
  }
  .data-grid td:last-child { border-right: none; }
  .data-grid .dg-label {
    font-size: 8.5px; color: var(--text-sec);
    text-transform: uppercase; letter-spacing: 0.3px;
    margin-bottom: 3px; font-weight: 500;
    display: flex; align-items: center; gap: 4px;
  }
  .data-grid .dg-value { font-size: 12px; font-weight: 700; color: var(--text-main); }

  .badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px 12px; border-radius: 20px;
    font-size: 10px; font-weight: 600; color: white;
    background: var(--green-700);
  }

  .map-container {
    width: 100%; overflow: hidden;
    border: 1px solid var(--gray-200); border-radius: 12px;
    margin-bottom: 5px; background: var(--gray-100);
    display: flex; align-items: center; justify-content: center;
    color: var(--gray-400); font-size: 13px;
  }
  .map-container img { width: 100%; height: 100%; object-fit: cover; }
  .coords { text-align: right; font-size: 10px; color: var(--text-sec); margin-bottom: 12px; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .plusvalia-card { border: 1px solid var(--gray-200); border-radius: 12px; padding: 12px 14px; }
  .chart-bars {
    display: flex; align-items: flex-end; gap: 8px;
    height: 110px; margin: 10px 0 6px;
    border-bottom: 2px solid var(--gray-200); padding-bottom: 0;
  }
  .chart-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .chart-bar { width: 100%; border-radius: 4px 4px 0 0; }
  .cb-1 { background: #76C893; } .cb-2 { background: var(--green-500); }
  .cb-3 { background: #3d9970; } .cb-4 { background: #2D6A4F; }
  .cb-5 { background: var(--green-900); }
  .chart-pct    { font-size: 11px; font-weight: 700; color: var(--green-900); }
  .chart-year   { font-size: 11px; color: var(--text-sec); }
  .chart-amount { font-size: 11px; color: var(--text-sec); }
  .chart-footnote { font-size: 10px; color: var(--gray-400); font-style: italic; margin-top: 4px; }

  .entorno-card { border: 1px solid var(--gray-200); border-radius: 12px; padding: 12px 14px; }
  .entorno-item {
    display: flex; align-items: center; gap: 6px;
    padding: 3px 0; font-size: 11px;
    border-bottom: 1px solid var(--gray-100);
  }
  .entorno-item:last-child { border-bottom: none; }
  .entorno-item .elabel { color: var(--text-sec); min-width: 72px; }
  .entorno-item .evalue { font-weight: 600; color: var(--text-main); }

  /* Perfil del Entorno con scores */
  .pe-scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .pe-score-card { border: 1px solid var(--gray-200); border-radius: 12px; padding: 10px 12px; }
  .pe-score-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
  .pe-score-name { display: flex; align-items: center; gap: 5px; font-weight: 700; font-size: 11px; color: var(--text-main); }
  .pe-score-val  { font-weight: 800; color: var(--green-700); font-size: 11px; }
  .pe-score-bar-bg { height: 5px; background: var(--gray-200); border-radius: 3px; margin-bottom: 5px; }
  .pe-score-bar    { height: 5px; background: var(--green-500); border-radius: 3px; }
  .pe-score-text   { font-size: 11px; color: var(--text-sec); line-height: 1.4; }

  .page-footer {
    position: absolute; bottom: 10px; left: 28px; right: 28px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 8px; color: var(--gray-400); font-style: italic;
    border-top: 1px solid var(--gray-100); padding-top: 4px;
  }
  .page-footer .pf-center { text-align: center; flex: 1; }
  .page-footer .pf-page {
    font-style: normal; font-weight: 600; color: var(--gray-500);
    font-size: 8px; background: var(--gray-100); padding: 2px 7px; border-radius: 10px;
  }

  /* PÁGINA 2 */
  .valor-hero {
    background: linear-gradient(150deg, #162f24 0%, var(--green-900) 40%, var(--green-700) 100%);
    color: white; padding: 20px 24px 14px; border-radius: 16px; margin-bottom: 14px;
  }
  .vh-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-bottom: 12px; }
  .vh-side-col { display: flex; flex-direction: column; }
  .vh-side-col.right { align-items: flex-end; text-align: right; }
  .vh-side-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.5); margin-bottom: 3px; font-weight: 600; }
  .vh-side-val   { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; }
  .vh-val-lime { color: var(--lime); }
  .vh-val-red  { color: #fca5a5; }
  .vh-center-col { text-align: center; }
  .valor-subtitle { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--lime); font-weight: 700; margin-bottom: 4px; }
  .valor-main     { font-family: 'Outfit', sans-serif; font-size: 52px; font-weight: 800; line-height: 1; letter-spacing: -2px; }
  .valor-currency { font-size: 10px; color: rgba(255,255,255,0.55); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px; }
  .vh-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px; margin-top: 2px; }
  .vh-footer .vh-m2 { font-size: 12px; font-weight: 600; color: white; }
  .vh-footer .vh-m2 span { color: var(--lime); font-weight: 800; }
  .vh-confianza { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 4px 12px; font-size: 10px; font-weight: 700; color: white; }

  .competitiva-bar-bg { height: 12px; background: linear-gradient(to right, #ef4444 0%, #f59e0b 35%, #22c55e 65%, var(--green-500) 100%); border-radius: 6px; position: relative; margin: 8px 0; }
  .competitiva-marker { position: absolute; top: -5px; width: 4px; height: 22px; background: var(--text-main); border-radius: 2px; box-shadow: 0 0 0 2px white, 0 0 0 3px var(--text-main); }
  .competitiva-labels { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin-bottom: 10px; }
  .clabel-red   { color: var(--red); }
  .clabel-gray  { color: var(--gray-500); }
  .clabel-green { color: var(--green-500); }

  .metric-card-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .metric-card { border: 1px solid var(--gray-200); border-radius: 8px; padding: 9px 12px; text-align: center; background: white; }
  .metric-card .mc-label { font-size: 9px; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .metric-card .mc-value { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: var(--text-main); }

  .resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
  .resumen-box { border: 1px solid var(--gray-200); border-radius: 10px; padding: 12px 8px; text-align: center; background: white; }
  .resumen-box.highlight { border: 2px solid var(--green-500); background: #f0faf4; }
  .resumen-box.highlight .rb-value { color: var(--green-700); }
  .resumen-box .rb-value { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: var(--green-900); }
  .resumen-box .rb-label { font-size: 9px; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }

  .min-max-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 11px; margin-bottom: 12px; border-bottom: 1px solid var(--gray-100); }
  .mm-label { color: var(--text-sec); }
  .mm-lime  { font-weight: 700; color: #2D6A4F; }
  .mm-pink  { font-weight: 700; color: #2D6A4F; }

  .indicadores-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-bottom: 12px; }
  .ind-card { border: 1px solid var(--gray-200); border-radius: 8px; padding: 10px 6px; text-align: center; background: var(--green-100); }
  .ind-card .ind-label { font-size: 8px; color: var(--green-700); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; font-weight: 700; }
  .ind-card .ind-value { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: var(--green-900); }
  .ind-card .ind-sub   { font-size: 9px; color: var(--gray-500); margin-top: 2px; }
  .ind-card.negative { border-color: #fecaca; background: #fff5f5; }
  .ind-card.negative .ind-label { color: #b91c1c; }
  .ind-card.negative .ind-value { color: var(--red); }

  .fisico-grid { display: grid; grid-template-columns: 110px 1fr 1fr; gap: 12px; align-items: center; }
  .donut-legend { font-size: 10px; margin-top: 6px; }
  .donut-legend .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 3px; vertical-align: middle; }
  .fisico-values { font-size: 12px; }
  .fisico-values .fv-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid var(--gray-100); }
  .fisico-values .fv-total { font-weight: 800; font-size: 14px; color: var(--green-900); border-top: 2px solid var(--green-900); padding-top: 3px; margin-top: 3px; display: flex; justify-content: space-between; }

  .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 3px solid #f59e0b; border-radius: 10px; padding: 10px 14px; font-size: 10px; color: #78350f; line-height: 1.6; }
  .warning-box .wb-title { font-weight: 700; color: #b45309; margin-bottom: 5px; }
  .warning-box strong { color: var(--text-main); }

  /* PÁGINA 3 */
  .comp-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; border-radius: 10px; overflow: hidden; border: 1px solid var(--gray-200); }
  .comp-table thead th { background: var(--gray-50); color: var(--text-sec); padding: 8px 7px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid var(--gray-200); }
  .comp-table tbody td { padding: 8px 7px; border-bottom: 1px solid var(--gray-100); vertical-align: top; color: var(--text-main); }
  .comp-table tbody tr:nth-child(even) { background: #fafafa; }
  .comp-colonia { font-weight: 700; color: var(--text-comp); }
  .comp-rooms   { display: flex; gap: 8px; margin-top: 2px; font-size: 9px; color: var(--text-sec); }
  .comp-tag     { display: inline-block; padding: 1px 6px; border-radius: 4px; background: rgba(81,182,135,0.12); color: var(--green-500); font-size: 8px; font-weight: 600; }
  .comp-neg     { font-weight: 700; color: var(--red); }
  .comp-pos     { font-weight: 700; color: var(--green-500); }
  .comp-fuente  { color: var(--text-blue); font-size: 9px; }

  .va-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .va-card { border: 1px solid var(--gray-200); border-radius: 12px; padding: 12px 14px; background: white; }
  .va-card.green-bg { background: var(--green-100); border-color: #b7e4c7; }
  .va-card.red-bg   { background: #fff5f5; border-color: #fecaca; }
  .va-card .va-title { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; margin-bottom: 7px; }
  .va-title-green { color: var(--green-500); }
  .va-title-amber { color: #d97706; }
  .va-card ul { list-style: disc; padding-left: 14px; font-size: 11px; color: var(--text-sec); line-height: 1.6; }

  .analisis-box { border: 1px solid var(--gray-200); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: var(--box-bg); }
  .analisis-box p { font-size: 11px; color: var(--text-sec); line-height: 1.7; text-align: justify; }

  .metodo-box { background: var(--gray-50); border: 1px solid var(--gray-200); border-left: 3px solid var(--green-500); border-radius: 12px; padding: 10px 12px; font-size: 8.5px; color: var(--text-sec); line-height: 1.45; }
  .metodo-box .mb-title { font-weight: 700; color: var(--green-900); margin-bottom: 4px; font-size: 11px; }
  .metodo-box strong { color: var(--text-main); }

  /* PÁGINA 4 */
  .servicios-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
  .servicio-card { border: 1px solid var(--gray-200); border-radius: 10px; padding: 10px 12px; }
  .servicio-card .sc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
  .servicio-card .sc-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; background: var(--green-100); border-radius: 8px; flex-shrink: 0; }
  .servicio-card .sc-title    { font-weight: 700; font-size: 12px; color: var(--text-main); }
  .servicio-card .sc-subtitle { font-size: 11px; color: var(--text-sec); }
  .servicio-card .sc-list     { font-size: 11px; color: var(--text-sec); line-height: 1.4; }

  .recom-box { border: 1px solid #c7d7f5; border-left: 3px solid var(--text-mkt); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #f0f4fd; }
  .recom-box .recom-head { font-weight: 700; color: var(--text-mkt); margin-bottom: 7px; font-size: 11px; }
  .recom-item { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12px; color: var(--text-mkt); line-height: 1.3; align-items: flex-start; }
  .recom-item span { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
  .recom-item strong { color: var(--text-mkt); font-weight: 700; }

  .tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .tip-card { display: flex; gap: 9px; padding: 9px 11px; border: 1px solid var(--gray-200); border-radius: 8px; font-size: 10px; }
  .tip-card .tip-icon  { font-size: 16px; flex-shrink: 0; }
  .tip-card .tip-title { font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
  .tip-card .tip-text  { color: var(--text-sec); font-size: 11px; line-height: 1.35; }

  .legal-box { background: #fdf8f3; border: 1px solid #e8d5b0; border-left: 3px solid var(--text-disc); border-radius: 10px; padding: 10px 14px; font-size: 9px; color: var(--text-disc); line-height: 1.7; }
  .legal-box .lb-title { font-weight: 700; color: var(--text-disc); font-size: 10px; margin-bottom: 4px; }

  /* PÁGINA 5 — FOTOS */
  .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .photo-item img { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid var(--gray-200); }
  .no-photos { text-align: center; padding: 60px 20px; color: var(--gray-400); border: 2px dashed var(--gray-200); border-radius: 10px; margin-top: 20px; }
  .no-photos .np-icon { font-size: 48px; margin-bottom: 12px; }

  @media print {
    body { background: white; }
    .page { margin: 0; padding: 12mm 18mm 14mm; box-shadow: none; }
  }
"""


def generate_mini_report_html(valuation: dict, arv_estimado: float = None) -> str:
    """Resumen de 1 página (venta) para clientes que solo quieren el valor.
    Sin sección de renta: hoy la renta es un factor derivado de venta, no un
    estudio de comparables de renta independiente (pendiente motor aparte)."""
    prop = valuation["property_data"]
    result = valuation["result"]
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    active_comparables = [c for c in comparables if c["comparable_id"] in selected_ids] if selected_ids else comparables[:6]

    consultation_date = valuation.get("consultation_date", datetime.now(timezone.utc).isoformat())
    date_str = consultation_date[:10] if isinstance(consultation_date, str) else consultation_date.strftime("%Y-%m-%d")
    try:
        date_display = datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        date_display = date_str

    folio = valuation.get('folio') or generate_folio(valuation.get('valuation_id', '001'))

    address = (prop.get('address') or prop.get('street_address') or '').strip()
    neighborhood = prop.get('neighborhood', '')
    city = prop.get('city') or prop.get('municipality') or ''
    state_name = prop.get('state', '')
    addr_full = ', '.join([p for p in [address, neighborhood] if p]) or 'Dirección no especificada'
    location_str = ', '.join([p for p in [city, state_name] if p])

    land_area = prop.get('land_area', '-')
    construction_area = prop.get('construction_area', '-')
    age = prop.get('estimated_age', '-')
    property_type = prop.get('property_type', 'Casa')

    total_value = result['estimated_value']
    value_min = result['value_range_min']
    value_max = result['value_range_max']
    market_metrics = result.get('market_metrics', {})
    similar_count = int(market_metrics.get('similar_properties_count', len(comparables)) or len(active_comparables))

    def fmt_money(v):
        return f"${v:,.0f} MXN"

    lat = prop.get('latitude') or 20.6597
    lng = prop.get('longitude') or -103.3496
    map_data = get_map_for_report(lat, lng)
    static_src = map_data.get('static_image') if map_data.get('has_static') else None
    map_html = (
        f'<img src="{static_src}" alt="Mapa" style="width:100%;height:100%;object-fit:cover;" '
        f'onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'&#x1F4CD; {lat:.6f}, {lng:.6f}\'">'
        if static_src else f'<span>&#x1F4CD; {lat:.6f}, {lng:.6f}</span>'
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PropValu {folio} - Resumen</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {{ --green-900:#1B4231; --green-700:#2D6A4F; --lime:#D9ED91; --text-main:#0F162A; --text-sec:#63738A; --gray-200:#e2e8f0; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:'Inter',sans-serif; color:var(--text-main); font-size:13px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  h1,h2,h3 {{ font-family:'Outfit',sans-serif; }}
  .page {{ width:210mm; min-height:297mm; margin:0 auto; padding:16mm 18mm; background:#fff; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--green-900); padding-bottom:10px; margin-bottom:18px; }}
  .logo-text {{ font-family:'Outfit',sans-serif; font-weight:800; font-size:20px; color:var(--green-900); }}
  .logo-text span {{ color:var(--green-700); }}
  .folio-box {{ text-align:right; font-size:11px; color:var(--text-sec); }}
  .addr {{ font-size:15px; font-weight:600; margin-bottom:2px; }}
  .loc {{ font-size:12px; color:var(--text-sec); margin-bottom:20px; }}
  .value-box {{ background:var(--green-900); color:#fff; border-radius:14px; padding:26px; text-align:center; margin-bottom:22px; }}
  .value-label {{ font-size:12px; opacity:.85; letter-spacing:.5px; text-transform:uppercase; }}
  .value-amount {{ font-family:'Outfit',sans-serif; font-weight:800; font-size:38px; margin:6px 0; }}
  .value-range {{ font-size:12px; opacity:.85; }}
  .arv-box {{ background:var(--green-100, #f0faf4); border:1.5px solid var(--green-700); color:var(--text-main); border-radius:14px; padding:20px; text-align:center; margin-bottom:22px; }}
  .arv-box .value-label {{ color:var(--green-700); }}
  .arv-box .value-amount {{ font-size:30px; color:var(--green-900); }}
  .arv-box .value-range {{ color:var(--text-sec); }}
  .grid4 {{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }}
  .grid4 .cell {{ background:#f8fafc; border:1px solid var(--gray-200); border-radius:10px; padding:12px; text-align:center; }}
  .grid4 .cell .lbl {{ font-size:10px; color:var(--text-sec); text-transform:uppercase; }}
  .grid4 .cell .val {{ font-size:16px; font-weight:700; margin-top:4px; }}
  .map-box {{ width:100%; height:190px; border-radius:10px; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }}
  .conf-line {{ font-size:12px; color:var(--text-sec); text-align:center; margin-bottom:24px; }}
  .footer {{ border-top:1px solid var(--gray-200); padding-top:10px; font-size:9px; color:var(--text-sec); text-align:center; position:absolute; bottom:14mm; left:18mm; right:18mm; }}
  @media print {{ @page {{ size:A4; margin:0; }} .page {{ margin:0; }} }}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-text">Prop<span>Valu</span></div>
    <div class="folio-box">Folio: <strong>{folio}</strong><br>Fecha: {date_display}</div>
  </div>

  <div class="addr">&#x1F4CD; {addr_full}</div>
  <div class="loc">{location_str}</div>

  <div class="value-box">
    <div class="value-label">Valor Estimado de Mercado</div>
    <div class="value-amount">{fmt_money(total_value)}</div>
    <div class="value-range">Rango: {fmt_money(value_min)} &mdash; {fmt_money(value_max)}</div>
  </div>
{f'''
  <div class="arv-box">
    <div class="value-label">Valor Estimado Remodelada (ARV)</div>
    <div class="value-amount">{fmt_money(arv_estimado)}</div>
    <div class="value-range">Valor hipotético si la propiedad estuviera completamente remodelada &mdash; referencia para evaluar compra, remodelación y reventa (flipping)</div>
  </div>
''' if arv_estimado else ''}
  <div class="grid4">
    <div class="cell"><div class="lbl">Terreno</div><div class="val">{land_area} m&#xB2;</div></div>
    <div class="cell"><div class="lbl">Construcción</div><div class="val">{construction_area} m&#xB2;</div></div>
    <div class="cell"><div class="lbl">Antigüedad</div><div class="val">{age} años</div></div>
    <div class="cell"><div class="lbl">Tipo</div><div class="val">{property_type}</div></div>
  </div>

  <div class="map-box">{map_html}</div>

  <div class="conf-line">Basado en {similar_count} comparables activos en la zona</div>

  <div class="footer">
    Estimación de mercado, no constituye avalúo formal ni dictamen pericial &mdash; PropValu &middot; propvalu.mx
  </div>
</div>
</body>
</html>"""


def generate_html_report(valuation: dict, analysis: str, include_analysis: bool = True, ai_sections: dict = None) -> str:
    prop = valuation["property_data"]
    result = valuation["result"]
    comparables = valuation.get("comparables", [])
    selected_ids = valuation.get("selected_comparables", [])
    consultation_date = valuation.get("consultation_date", datetime.now(timezone.utc).isoformat())
    photos = prop.get("photos", [])
    is_valuer_mode = valuation.get("mode") == "private"

    if selected_ids:
        active_comparables = [c for c in comparables if c["comparable_id"] in selected_ids]
    else:
        active_comparables = comparables[:6]

    # Date
    if isinstance(consultation_date, str):
        date_str = consultation_date[:10]
    else:
        date_str = consultation_date.strftime("%Y-%m-%d")
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        date_display = d.strftime("%d/%m/%Y")
    except Exception:
        date_display = date_str

    folio = valuation.get('folio') or generate_folio(valuation.get('valuation_id', '001'))

    # Market metrics
    market_metrics = result.get('market_metrics', {})
    monthly_rent = market_metrics.get('monthly_rent_estimate', 0)
    cap_rate = float(market_metrics.get('cap_rate', 0))
    appreciation = float(market_metrics.get('annual_appreciation', 5))
    similar_count = market_metrics.get('similar_properties_count', len(comparables))

    # Values
    total_value = result['estimated_value']
    value_min = result['value_range_min']
    value_max = result['value_range_max']
    price_sqm = result['price_per_sqm']
    land_value = result.get('land_value', total_value * 0.40)
    physical_value = result.get('physical_value', land_value * 1.4)
    construction_phys = max(0, physical_value - land_value)
    land_percent_donut = (land_value / physical_value * 100) if physical_value > 0 else 50
    const_percent_donut = 100 - land_percent_donut

    # Nota técnica de superficies: solo advertir cuando el dato viene de Predial
    # (fuente no confiable). Si el usuario indicó Escrituras/Plano/Medidas Físicas,
    # no tiene sentido decir que "no están validadas físicamente" (bug 07-ago:
    # surface_source no estaba declarado en PropertyInput, Pydantic lo descartaba
    # y el reporte siempre mostraba la advertencia sin importar lo que se eligiera).
    surface_source = prop.get('surface_source')
    if surface_source == 'Predial':
        tech_note_html = (
            '<strong>&#x26A0; Nota Técnica:</strong> '
            'Las superficies de Predial no están validadas físicamente. '
            'Discrepancias impactarán la precisión del valor.'
        )
    elif surface_source in ('Escrituras', 'Plano', 'Medidas Físicas'):
        tech_note_html = ''
    else:
        # Valuaciones viejas sin el dato (antes del fix): conservar la advertencia
        # por default, ya que no sabemos si la superficie viene de Predial o no.
        tech_note_html = (
            '<strong>&#x26A0; Nota Técnica:</strong> '
            'Las superficies reportadas no están validadas físicamente. '
            'Discrepancias impactarán la precisión del valor.'
        )

    # Conservation & thermometer
    conservation = prop.get('conservation_state', 'Bueno')
    conservation_scores_map = {'Excelente': 100, 'Bueno': 70, 'Regular': 40, 'Malo': 15}
    c_score = conservation_scores_map.get(conservation, 60)

    if active_comparables:
        avg_comp_sqm = sum(c['price_per_sqm'] for c in active_comparables) / len(active_comparables)
        ratio = price_sqm / avg_comp_sqm if avg_comp_sqm > 0 else 1
        p_score = 90 if ratio < 0.9 else (75 if ratio < 0.95 else (55 if ratio < 1.05 else (35 if ratio < 1.1 else 20)))
    else:
        avg_comp_sqm = price_sqm
        p_score = 50

    s_count = int(similar_count)
    s_score = 90 if s_count <= 3 else (70 if s_count <= 6 else (50 if s_count <= 10 else (35 if s_count <= 15 else 20)))

    thermo_score = c_score * 0.40 + p_score * 0.40 + s_score * 0.20
    thermo_pos = min(90, max(10, 10 + thermo_score * 0.80))

    if thermo_score >= 75:
        pos_label = "Alta probabilidad de desplazamiento. Las condiciones físicas y de ubicación superan significativamente la oferta promedio."
    elif thermo_score >= 55:
        pos_label = "Precio competitivo. El inmueble se encuentra bien posicionado respecto a la oferta de mercado."
    elif thermo_score >= 35:
        pos_label = "Precio a negociar. Se recomienda revisar condiciones para mejorar posición competitiva."
    else:
        pos_label = "Requiere ajuste. El precio o condiciones del inmueble presentan desventaja respecto al mercado."

    confidence_level = result.get('confidence_level', 'ALTO').upper()

    # Investment indicators
    cetes = 10.0
    payback = (1 / (cap_rate / 100)) if cap_rate > 0 else 0
    roi_10 = (cap_rate * 10) + (appreciation * 10) if cap_rate > 0 else appreciation * 10
    cap_vs_cetes = cap_rate - cetes

    # Donut
    circumference = 251.2
    land_dash = (land_percent_donut / 100) * circumference
    const_dash = (const_percent_donut / 100) * circumference
    depr_pct = round(result.get('depreciation_factor', 0.55) * 100)

    # Map
    lat = prop.get('latitude') or 20.6597
    lng = prop.get('longitude') or -103.3496
    map_data = get_map_for_report(lat, lng)
    has_static = map_data.get('has_static', False)
    static_src = map_data.get('static_image') or ''
    if has_static and static_src:
        map_html = f'<img src="{static_src}" alt="Mapa" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'&#x1F4CD; {lat:.6f}, {lng:.6f}\'">'
    else:
        map_html = f'<span>&#x1F4CD; {lat:.6f}, {lng:.6f}</span>'

    # Property fields
    # El formulario guarda street_address / municipality / land_regime; había un
    # mismatch de nombres (address/city/tenure_type) que dejaba la dirección como
    # "no especificada" y el régimen en blanco. Aceptar ambos nombres.
    address = (prop.get('address') or prop.get('street_address') or '').strip()
    neighborhood = prop.get('neighborhood', '')
    city = prop.get('city') or prop.get('municipality') or ''
    state_name = prop.get('state', '')
    location_parts = [p for p in [city, state_name] if p]
    location_str = ', '.join(location_parts)
    addr_full = ', '.join([p for p in [address, neighborhood] if p]) or 'Dirección no especificada'

    land_area = prop.get('land_area', '-')
    construction_area = prop.get('construction_area', '-')
    property_type = prop.get('property_type', 'Casa')
    tenure = prop.get('tenure_type') or prop.get('land_regime') or '-'
    # Régimen guardado como enum (ej. "CONDOMINIO_VERTICAL") → legible ("Condominio Vertical")
    if tenure and tenure != '-' and ('_' in tenure or tenure.isupper()):
        tenure = tenure.replace('_', ' ').title()
    floor_number = prop.get('floor_number', '')
    total_floors = prop.get('total_floors', '')
    land_use = prop.get('land_use', 'desconocido')
    land_use_label = get_land_use_info(land_use or 'desconocido')['name']  # etiqueta humana, no el código crudo
    age = prop.get('estimated_age', '-')

    if floor_number and total_floors:
        niveles_str = f"Piso {floor_number} de {total_floors}"
    elif floor_number:
        niveles_str = f"Piso {floor_number}"
    elif total_floors:
        niveles_str = f"{total_floors} niveles"
    else:
        niveles_str = "PB"

    # Badges
    badges = []
    if prop.get('bedrooms'):
        badges.append(f'<span class="badge">&#x1F6CF; {prop["bedrooms"]} Recámaras</span>')
    if prop.get('bathrooms'):
        badges.append(f'<span class="badge">&#x1F6BF; {prop["bathrooms"]} Baños</span>')
    if prop.get('parking_spaces'):
        badges.append(f'<span class="badge">&#x1F697; {prop["parking_spaces"]} Cocheras</span>')
    if prop.get('estimated_age'):
        badges.append(f'<span class="badge">&#x1F4C5; {prop["estimated_age"]} Años</span>')
    for feat in prop.get('special_features', [])[:4]:
        icon = FEATURE_ICONS.get(feat, '&#x2713;')
        name = FEATURE_NAMES.get(feat, feat)
        badges.append(f'<span class="badge">{icon} {name}</span>')
    badges_html = '\n    '.join(badges)

    # AI sections
    ai_sections = ai_sections or {}
    pv = ai_sections.get('plusvalia', {})
    pe = ai_sections.get('perfil_entorno', {})
    ventajas = ai_sections.get('ventajas', [])
    oportunidades = ai_sections.get('oportunidades', [])
    est = ai_sections.get('estrategia', {})
    analisis_mercado = ai_sections.get('analisis_mercado', '') or analysis or 'Análisis de mercado no disponible.'

    # Plusvalía bars
    tasa = float(pv.get('tasa_anual', appreciation)) if pv else float(appreciation)
    cur_year = datetime.now(timezone.utc).year
    # Alturas topadas a ~82px: el contenedor mide 110px y el "+%" de arriba (~16px)
    # más la barra deben caber dentro; con 103px el porcentaje se desbordaba del recuadro.
    bar_heights = [26, 40, 54, 68, 82]
    bar_classes = ['cb-1', 'cb-2', 'cb-3', 'cb-4', 'cb-5']
    bars_html = ''
    for i in range(5):
        pct_proj = round(((1 + tasa / 100) ** (i + 1) - 1) * 100, 1)
        if pv and pv.get(f'anio{i+1}'):
            val = float(pv[f'anio{i+1}'])
        else:
            val = total_value * (1 + tasa / 100) ** (i + 1)
        amt_str = f'${val:,.0f}'
        bars_html += f"""
        <div class="chart-bar-col">
          <div class="chart-pct">+{pct_proj:.1f}%</div>
          <div class="chart-bar {bar_classes[i]}" style="height:{bar_heights[i]}px;"></div>
          <div class="chart-year">{cur_year + i + 1}</div>
          <div class="chart-amount">{amt_str}</div>
        </div>"""

    # Entorno simple list (seguridad/movilidad se omiten aquí porque aparecen en la cuadrícula de scores)
    _ent_names = {
        'seguridad': 'Seguridad', 'movilidad': 'Movilidad', 'educacion': 'Educación',
        'salud': 'Salud', 'comercio': 'Comercio', 'recreacion': 'Recreación', 'plazas': 'Plazas',
        'bancos': 'Bancos'
    }
    entorno_items = ''
    if pe:
        for key in ['educacion', 'salud', 'comercio', 'recreacion', 'plazas', 'bancos']:
            cat = pe.get(key, {})
            if not cat:
                continue
            count = cat.get('count', '') if isinstance(cat, dict) else ''
            name = _ent_names.get(key, key)
            val_disp = f"{count} cercanos" if count else (cat.get('texto', '') if isinstance(cat, dict) else str(cat))
            entorno_items += f"""
      <div class="entorno-item">
        <span class="elabel">{name}:</span>
        <span class="evalue">{val_disp}</span>
      </div>"""
    if not entorno_items:
        entorno_items = """
      <div class="entorno-item"><span class="elabel">Educación:</span><span class="evalue" style="color:var(--gray-400);font-style:italic;">Regenerar con análisis IA</span></div>
      <div class="entorno-item"><span class="elabel">Salud:</span><span class="evalue" style="color:var(--gray-400);font-style:italic;">Regenerar con análisis IA</span></div>
      <div class="entorno-item"><span class="elabel">Comercio:</span><span class="evalue" style="color:var(--gray-400);font-style:italic;">Regenerar con análisis IA</span></div>
      <div class="entorno-item"><span class="elabel">Recreación:</span><span class="evalue" style="color:var(--gray-400);font-style:italic;">Regenerar con análisis IA</span></div>"""

    # Perfil del entorno con scores
    _pe_icons = {
        'seguridad': '&#x1F512;', 'movilidad': '&#x1F68C;', 'educacion': '&#x1F3EB;',
        'salud': '&#x1F3E5;', 'comercio': '&#x1F6D2;', 'recreacion': '&#x1F333;'
    }
    pe_scores_cards = ''
    if pe:
        for key in ['seguridad', 'movilidad', 'educacion', 'salud', 'comercio', 'recreacion']:
            cat = pe.get(key, {})
            if not cat or not isinstance(cat, dict):
                continue
            score = int(cat.get('score', 0) or 0)
            texto = cat.get('texto', '')
            name = _ent_names.get(key, key)
            icon = _pe_icons.get(key, '&#x1F4CD;')
            bar_w = score * 10
            pe_scores_cards += f"""
    <div class="pe-score-card">
      <div class="pe-score-head">
        <div class="pe-score-name"><span>{icon}</span> {name}</div>
        <div class="pe-score-val">{score}/10</div>
      </div>
      <div class="pe-score-bar-bg">
        <div class="pe-score-bar" style="width:{bar_w}%;"></div>
      </div>
      <div class="pe-score-text">{texto}</div>
    </div>"""

    if not pe_scores_cards:
        for key, icon, name in [
            ('seguridad', '&#x1F512;', 'Seguridad'), ('movilidad', '&#x1F68C;', 'Movilidad'),
            ('educacion', '&#x1F3EB;', 'Educación'), ('salud',     '&#x1F3E5;', 'Salud'),
            ('comercio',  '&#x1F6D2;', 'Comercio'), ('recreacion','&#x1F333;', 'Recreación'),
        ]:
            pe_scores_cards += f"""
    <div class="pe-score-card">
      <div class="pe-score-head">
        <div class="pe-score-name"><span>{icon}</span> {name}</div>
        <div class="pe-score-val" style="color:var(--gray-400);">N/D</div>
      </div>
      <div class="pe-score-bar-bg"><div class="pe-score-bar" style="width:0%;"></div></div>
      <div class="pe-score-text" style="color:var(--gray-400);font-style:italic;">Activar análisis IA</div>
    </div>"""
    pe_scores_section = f"""
  <div class="section-title" style="margin-top:12px;">&#x2B50; CALIFICACIÓN DEL ENTORNO</div>
  <div class="pe-scores-grid">
{pe_scores_cards}
  </div>"""

    # Comparables table
    comp_rows = ''
    def _portal_label(p):
        return (p or '').replace('_', ' ').replace('.com.mx', '').replace('.com', '').replace('www.', '').strip().title()

    for i, comp in enumerate(active_comparables, 1):
        # Antes se mostraban links a los anuncios/portal; se quitaron del reporte.
        # En su lugar mostramos SOLO la calificación de calidad del comparable.
        conf = comp.get('confiabilidad')
        conf_label = comp.get('confiabilidad_label')
        if conf is not None:
            _dot = {'Alta': '#16a34a', 'Media': '#d97706', 'Baja': '#dc2626'}.get(conf_label, '#94a3b8')
            n_portales = comp.get('n_portales', 1) or 1
            _corro = f' &middot; {n_portales} portales' if n_portales > 1 else ''
            fuente_cell = (f'<div style="font-size:9px;color:{_dot};font-weight:700;">'
                           f'&#x25CF; {conf_label} ({conf}){_corro}</div>')
        else:
            fuente_cell = '<span style="font-size:9px;color:var(--gray-400);">&#x25CF; N/D</span>'
        adj = comp.get('total_adjustment', 0)
        adj_cls = 'comp-neg' if adj < 0 else 'comp-pos'
        beds = comp.get('bedrooms', '')
        baths = comp.get('bathrooms', '')
        rooms_parts = []
        if beds:
            rooms_parts.append(f'{beds}&#x1F6CF;')
        if baths:
            rooms_parts.append(f'{baths}&#x1F6BF;')
        rooms_str = ' '.join(rooms_parts)
        adj_sqm = comp.get('adjusted_price_per_sqm', comp['price_per_sqm'])
        tenure_tag = comp.get('zona_tag') or comp.get('tenure_type', 'N/A')
        comp_rows += f"""
      <tr>
        <td>{i}</td>
        <td>
          <div class="comp-colonia">{comp['neighborhood'][:28]}</div>
          <div class="comp-rooms">{rooms_str}</div>
          <span class="comp-tag">{tenure_tag}</span>
        </td>
        <td>{comp.get('land_area', '-')}</td>
        <td>{comp.get('construction_area', '-')}</td>
        <td>${comp['price']:,.0f}</td>
        <td>${comp['price_per_sqm']:,.0f}</td>
        <td class="{adj_cls}">{adj:+.1f}%</td>
        <td style="font-weight:700">${adj_sqm:,.0f}</td>
        <td class="comp-fuente">{fuente_cell}</td>
      </tr>"""

    # Comparables stats
    n_comp = len(active_comparables)
    if n_comp > 0:
        avg_raw = sum(c['price_per_sqm'] for c in active_comparables) / n_comp
        avg_adj_pct = sum(c.get('total_adjustment', 0) for c in active_comparables) / n_comp
        avg_adj_sqm = sum(c.get('adjusted_price_per_sqm', c['price_per_sqm']) for c in active_comparables) / n_comp
    else:
        avg_raw = avg_adj_pct = avg_adj_sqm = 0
    adj_color_css = 'var(--red)' if avg_adj_pct < 0 else 'var(--green-500)'

    # Confianza global del avalúo (informativo): dispersión del $/m² ajustado +
    # confiabilidad promedio de los comparables + tamaño de muestra. NO cambia el valor.
    _adj_vals = [c.get('adjusted_price_per_sqm', c['price_per_sqm']) for c in active_comparables]
    if n_comp >= 2 and avg_adj_sqm > 0:
        _sd = (sum((v - avg_adj_sqm) ** 2 for v in _adj_vals) / n_comp) ** 0.5
        _cv = _sd / avg_adj_sqm
    else:
        _cv = 0.40
    _conf_list = [c.get('confiabilidad') for c in active_comparables if c.get('confiabilidad') is not None]
    _avg_conf = sum(_conf_list) / len(_conf_list) if _conf_list else 50
    _disp_score = max(0.0, 100 - _cv * 250)          # cv 0.10→75, 0.20→50, 0.40→0
    _n_score = min(n_comp / 6, 1.0) * 100
    conf_global = max(0, min(100, round(0.45 * _disp_score + 0.35 * _avg_conf + 0.20 * _n_score)))
    conf_global_label = 'Alta' if conf_global >= 70 else ('Media' if conf_global >= 50 else 'Baja')
    conf_global_color = {'Alta': '#16a34a', 'Media': '#d97706', 'Baja': '#dc2626'}[conf_global_label]
    conf_global_dispersion = round(_cv * 100, 1)

    # Ventajas / Oportunidades
    v_items_html = ''.join(f'<li>{v}</li>' for v in ventajas) if ventajas else '<li>Ubicación estratégica</li><li>Superficie competitiva</li>'
    if oportunidades:
        o_items_html = ''.join(f'<li>{o}</li>' for o in oportunidades)
    elif conservation.lower() in ('bueno', 'muy bueno', 'excelente'):
        # Estado bueno reportado por el cliente: no inventar acabados/antigüedad como defecto.
        o_items_html = '<li>Negociar con base en tiempo de mercado de comparables similares</li><li>Verificar documentación y adeudos antes de cerrar</li>'
    else:
        o_items_html = '<li>Revisar acabados interiores</li><li>Antigüedad perceptible</li>'

    # Recom items (page 4)
    recom_items = ''
    if est:
        perfil_comp = est.get('perfil_comprador', '')
        precio_ent = est.get('precio_entrada', '')
        canales = est.get('canales', [])
        tips_e = est.get('tips', [])
        if perfil_comp:
            recom_items += f'\n    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Perfil del Comprador:</strong> {perfil_comp}</div></div>'
        if precio_ent:
            recom_items += f'\n    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Precio de Entrada:</strong> {precio_ent}</div></div>'
        for canal in canales[:3]:
            recom_items += f'\n    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Canal:</strong> {canal}</div></div>'
        for tip in list(tips_e)[:3]:
            ci = tip.find(':')
            if 0 < ci < 50:
                recom_items += f'\n    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>{tip[:ci].strip()}:</strong> {tip[ci+1:].strip()}</div></div>'
            else:
                recom_items += f'\n    <div class="recom-item"><span>&#x1F3AF;</span><div>{tip}</div></div>'
    if not recom_items:
        recom_items = """
    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Canales de Venta:</strong> Portales inmobiliarios líderes (Inmuebles24, Propiedades.com, Lamudi) y redes sociales enfocadas en la zona.</div></div>
    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Perfil del Comprador:</strong> Jóvenes profesionales o parejas buscando primera propiedad en zona consolidada; inversionistas de renta.</div></div>
    <div class="recom-item"><span>&#x1F3AF;</span><div><strong>Tips de Marketing:</strong> Fotografías profesionales, tour virtual 360° y descripción detallada de amenidades.</div></div>"""

    # Equipamiento cards (page 4)
    _equip_cfg = [
        ('educacion', '&#x1F4DA;', 'Escuelas',     'Educación'),
        ('salud',     '&#x1F3E5;', 'Hospitales',    'Salud'),
        ('comercio',  '&#x1F6D2;', 'Supermercados', 'Tiendas'),
        ('recreacion','&#x1F333;', 'Parques',        'Recreación'),
    ]
    equip_cards = ''
    for key, icon, label, cat_name in _equip_cfg:
        cat = pe.get(key, {}) if pe else {}
        if not cat:
            continue
        count   = str(cat.get('count', '')) if isinstance(cat, dict) else ''
        nombres = cat.get('nombres', '') if isinstance(cat, dict) else ''
        # Conteo real 0/vacío → no mostrar nombres (evita "0 Supermercados" y luego
        # listarlos; los nombres vienen de Places, si no hay conteo no hay nombres válidos).
        sin_datos = count in ('', '0')
        title   = label if sin_datos else f"{count} {label}"
        detalle = 'Sin registros a 800 m' if sin_datos else (nombres or '—')
        equip_cards += f"""
    <div class="servicio-card">
      <div class="sc-header">
        <div class="sc-icon">{icon}</div>
        <div>
          <div class="sc-title">{title}</div>
          <div class="sc-subtitle">{cat_name}</div>
        </div>
      </div>
      <div class="sc-list">{detalle}</div>
    </div>"""
    if not equip_cards:
        for icon, label, cat_name in [
            ('&#x1F4DA;', 'Escuelas',     'Educación'),
            ('&#x1F3E5;', 'Hospitales',   'Salud'),
            ('&#x1F6D2;', 'Supermercados','Tiendas'),
            ('&#x1F333;', 'Parques',      'Recreación'),
        ]:
            equip_cards += f"""
    <div class="servicio-card">
      <div class="sc-header">
        <div class="sc-icon">{icon}</div>
        <div>
          <div class="sc-title">{label}</div>
          <div class="sc-subtitle">{cat_name}</div>
        </div>
      </div>
      <div class="sc-list" style="color:var(--gray-400);font-style:italic;">Activar análisis IA para detalle</div>
    </div>"""

    plazas_cat = pe.get('plazas', {}) if pe else {}
    plazas_card = ''
    if plazas_cat and isinstance(plazas_cat, dict):
        pl_count  = str(plazas_cat.get('count', ''))
        pl_nombres = plazas_cat.get('nombres', '')
        pl_sin = pl_count in ('', '0')
        pl_title  = "Plazas" if pl_sin else f"{pl_count} Plazas"
        pl_detalle = 'Sin registros a 800 m' if pl_sin else (pl_nombres or '—')
        plazas_card = f"""
  <div class="servicio-card" style="margin-bottom:12px;">
    <div class="sc-header">
      <div class="sc-icon">&#x1F3EC;</div>
      <div>
        <div class="sc-title">{pl_title}</div>
        <div class="sc-subtitle">Comercio</div>
      </div>
    </div>
    <div class="sc-list">{pl_detalle}</div>
  </div>"""

    bancos_cat = pe.get('bancos', {}) if pe else {}
    bancos_card = ''
    if bancos_cat and isinstance(bancos_cat, dict):
        bc_count  = str(bancos_cat.get('count', ''))
        bc_nombres = bancos_cat.get('nombres', '')
        bc_sin = bc_count in ('', '0')
        bc_title  = "Bancos" if bc_sin else f"{bc_count} Bancos"
        bc_detalle = 'Sin registros a 800 m' if bc_sin else (bc_nombres or '—')
        bancos_card = f"""
  <div class="servicio-card" style="margin-bottom:12px;">
    <div class="sc-header">
      <div class="sc-icon">&#x1F3E6;</div>
      <div>
        <div class="sc-title">{bc_title}</div>
        <div class="sc-subtitle">Bancos y cajeros</div>
      </div>
    </div>
    <div class="sc-list">{bc_detalle}</div>
  </div>"""

    # Facade photo for mapa section — si no se eligió portada pero hay fotos, usar la primera
    # (para que la fachada aparezca junto al mapa en la hoja 1).
    facade_idx = prop.get('facade_photo_index')
    if facade_idx is None and photos:
        facade_idx = 0
    facade_photo_url = photos[facade_idx] if (facade_idx is not None and photos and facade_idx < len(photos)) else None

    # Photos (page 5) — hasta 15 fotos. Columnas por cantidad y ALTURA DINÁMICA para
    # llenar el alto útil de la hoja (si suben pocas → más grandes, sin margen vacío abajo).
    if photos and len(photos) > 0:
        n = min(len(photos), 15)
        display_photos = photos[:n]
        if n == 1:
            cols = 1
        elif n in (2, 4, 6, 8):
            cols = 2
        else:
            cols = 3
        rows = (n + cols - 1) // cols
        gap = 8
        avail = 860  # alto útil para fotos en la hoja A4 (menos cabecera/título/pie)
        height = max(150, min(460, int((avail - gap * (rows - 1)) / rows)))
        photo_items = ''.join(
            f'<div style="border-radius:10px;overflow:hidden;border:1px solid var(--gray-200);background:#fdfdfd;">'
            f'<img src="{p}" style="width:100%;height:{height}px;object-fit:cover;display:block;" alt="Foto {i+1}"></div>'
            for i, p in enumerate(display_photos)
        )
        photos_content = f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);gap:8px;margin-top:10px;">{photo_items}</div>'
        show_photos_page = True
    else:
        photos_content = ''
        show_photos_page = False

    # ── Helper functions ────────────────────────────────────────────────────────

    def _header():
        return f"""  <div class="header">
    <div class="logo">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1B4231" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          <path d="M10 6h4"/>
          <path d="M10 10h4"/>
          <path d="M10 14h4"/>
          <path d="M10 18h4"/>
        </svg>
      </div>
      <div class="logo-text">Prop<span>Valu</span></div>
    </div>
    <div class="folio-box">
      Folio: <strong>{folio}</strong><br>
      <span style="color:var(--text-main);">&#x1F4CD; {addr_full}</span><br>
      Fecha: {date_display}
    </div>
  </div>"""

    def _footer(page, total=5):
        return f"""  <div class="page-footer">
    <span class="pf-page">{page} / {total}</span>
    <span class="pf-center">Estimación realizada con inteligencia de PropValu &mdash; propvalu.mx</span>
    <span style="font-size:8px;color:var(--gray-400);">{folio}</span>
  </div>"""

    # ── Build HTML ──────────────────────────────────────────────────────────────

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PropValu {folio} - {addr_full}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{_REPORT_CSS}
</style>
</head>
<body>

<!-- ════════════════════════════════════════════════════ -->
<!-- PÁGINA 1: DATOS DEL INMUEBLE                         -->
<!-- ════════════════════════════════════════════════════ -->
<div class="page">
{_header()}

  <div class="title-banner">&#x1F4CA; Estimación de Valor de Mercado</div>

  <div class="section-title">&#x1F3E0; DATOS DEL INMUEBLE</div>

  <div class="inmueble-card">
    <div class="inmueble-top">
      <div class="inmueble-addr">
        <div class="prop-address">&#x1F4CD; {addr_full}</div>
        <div class="prop-city">{location_str}</div>
      </div>
      {f'<div class="tech-note">{tech_note_html}</div>' if tech_note_html else ''}
    </div>
    <table class="data-grid" style="table-layout:fixed;">
      <tr>
        <td><div class="dg-label">&#x1F4D0; Terreno</div><div class="dg-value">{land_area} m&#xB2;</div></td>
        <td><div class="dg-label">&#x1F3D7; Construcción</div><div class="dg-value">{construction_area} m&#xB2;</div></td>
        <td><div class="dg-label">&#x1F3E0; Tipo</div><div class="dg-value">{property_type}</div></td>
        <td><div class="dg-label">&#x1F3E2; Régimen</div><div class="dg-value">{tenure}</div></td>
        <td><div class="dg-label">&#x1F3D8; Niveles</div><div class="dg-value">{niveles_str}</div></td>
      </tr>
      <tr>
        <td><div class="dg-label">&#x1F4CB; Uso de Suelo</div><div class="dg-value">{land_use_label}</div></td>
        <td><div class="dg-label">&#x25B6; Conservación</div><div class="dg-value">{conservation}</div></td>
        <td><div class="dg-label">&#x1F3DB; Antigüedad</div><div class="dg-value">{age} años</div></td>
        <td><div class="dg-label">&#x1F4C4; Fuente Info.</div><div class="dg-value">Predial / Escrituras</div></td>
        <td></td>
      </tr>
    </table>
  </div>

  <div class="badges">
    {badges_html}
  </div>

  <div class="section-title">&#x1F4CD; UBICACIÓN Y FACHADA</div>
  <div style="display:flex;gap:10px;align-items:stretch;">
    <div class="map-container" style="{'flex:1' if facade_photo_url else 'width:100%'};height:240px;">
      {map_html}
    </div>
    {f'<div style="flex:1;height:240px;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);"><img src="{facade_photo_url}" style="width:100%;height:100%;object-fit:cover;" alt="Fachada"></div>' if facade_photo_url else ''}
  </div>
  <div class="coords">&#x2B50; Coordenadas: {lat:.6f}, {lng:.6f}</div>

  <div class="grid-2">
    <div class="plusvalia-card">
      <div class="section-title" style="font-size:11px;margin-bottom:4px;">&#x1F4C8; PLUSVALÍA PROYECTADA (5 AÑOS)</div>
      <div class="chart-bars">
        {bars_html}
      </div>
      <div class="chart-footnote">* Supuesto basado en apreciación histórica. Tasa est.: ~{tasa:.1f}% (SHF/BBVA).</div>
    </div>

    <div class="entorno-card">
      <div class="section-title" style="font-size:11px;margin-bottom:6px;">&#x1F4CD; PERFIL DEL ENTORNO</div>
      {entorno_items}
    </div>
  </div>
  {pe_scores_section}

{_footer(1)}
</div>


<!-- ════════════════════════════════════════════════════ -->
<!-- PÁGINA 2: VALOR                                      -->
<!-- ════════════════════════════════════════════════════ -->
<div class="page">
{_header()}

  <div class="valor-hero">
    <div class="vh-row">
      <div class="vh-side-col">
        <div class="vh-side-label">VALOR MÍNIMO</div>
        <div class="vh-side-val vh-val-lime">${value_min:,.0f}</div>
      </div>
      <div class="vh-center-col">
        <div class="valor-subtitle">&#x1F4B0; VALOR MEDIO O JUSTO</div>
        <div class="valor-main">${total_value:,.0f}</div>
        <div class="valor-currency">M.N.</div>
      </div>
      <div class="vh-side-col right">
        <div class="vh-side-label">VALOR MÁXIMO</div>
        <div class="vh-side-val vh-val-lime">${value_max:,.0f}</div>
      </div>
    </div>
    <div class="vh-footer">
      <div class="vh-m2">Precio por m&#xB2;: <span>${price_sqm:,.0f}/m&#xB2;</span></div>
      <div class="vh-confianza">&#x2713; Confianza: {confidence_level}</div>
    </div>
  </div>

  <div class="section-title">&#x1F3AF; POSICIÓN COMPETITIVA EN EL MERCADO</div>
  <p style="font-size:10px;color:var(--text-sec);margin-bottom:6px;">{pos_label}</p>
  <div class="competitiva-bar-bg">
    <div class="competitiva-marker" style="left:{thermo_pos:.0f}%;"></div>
  </div>
  <div class="competitiva-labels">
    <span class="clabel-red">Desventaja</span>
    <span class="clabel-gray">&#x2696; Equilibrio</span>
    <span class="clabel-green">Ventaja</span>
  </div>
  <div class="metric-card-row">
    <div class="metric-card">
      <div class="mc-label">Conservación</div>
      <div class="mc-value">{conservation}</div>
    </div>
    <div class="metric-card">
      <div class="mc-label">$/M&#xB2; vs Mercado</div>
      <div class="mc-value">${price_sqm:,.0f} vs ${avg_comp_sqm:,.0f}</div>
    </div>
    <div class="metric-card">
      <div class="mc-label">Oferta Similar</div>
      <div class="mc-value">{similar_count}+ Propiedades</div>
    </div>
  </div>

  <div class="section-title">&#x1F4CA; RESUMEN EJECUTIVO</div>
  <div class="resumen-grid">
    <div class="resumen-box highlight">
      <div class="rb-value">${total_value:,.0f}</div>
      <div class="rb-label">Valor Venta</div>
    </div>
    <div class="resumen-box">
      <div class="rb-value">${monthly_rent:,.0f}</div>
      <div class="rb-label">Renta / Mes</div>
    </div>
    <div class="resumen-box">
      <div class="rb-value">${physical_value:,.0f}</div>
      <div class="rb-label">Valor Físico</div>
    </div>
    <div class="resumen-box">
      <div class="rb-value">{construction_area} m&#xB2;</div>
      <div class="rb-label">Construcción</div>
    </div>
  </div>
  <div class="min-max-row">
    <span class="mm-label">&#x1F4C9; Valor Mínimo</span>
    <span class="mm-pink">${value_min:,.0f}</span>
    <span class="mm-label">&#x1F4C8; Valor Máximo</span>
    <span class="mm-lime">${value_max:,.0f}</span>
  </div>

  <div class="section-title">&#x1F4CA; INDICADORES DE INVERSIÓN</div>
  <div class="indicadores-grid">
    <div class="ind-card">
      <div class="ind-label">Cap Rate</div>
      <div class="ind-value">{cap_rate:.1f}%</div>
      <div class="ind-sub">vs CETES {cetes:.0f}%</div>
    </div>
    <div class="ind-card">
      <div class="ind-label">Plusvalía Anual</div>
      <div class="ind-value">{appreciation:.1f}%</div>
      <div class="ind-sub">Estimada</div>
    </div>
    <div class="ind-card">
      <div class="ind-label">Recup. Inversión</div>
      <div class="ind-value">{payback:.1f}</div>
      <div class="ind-sub">años (renta)</div>
    </div>
    <div class="ind-card">
      <div class="ind-label">ROI 10 Años</div>
      <div class="ind-value">{roi_10:.0f}%</div>
      <div class="ind-sub">Renta + Plusvalía</div>
    </div>
    <div class="ind-card {'negative' if cap_vs_cetes < 0 else ''}">
      <div class="ind-label">Dif. Cap-CETES</div>
      <div class="ind-value">{cap_vs_cetes:+.1f}%</div>
      <div class="ind-sub">{'&#x25BC; Abajo CETES' if cap_vs_cetes < 0 else '&#x25B2; Sobre CETES'}</div>
    </div>
  </div>

  <div class="section-title">&#x2696; DESGLOSE DE VALOR FÍSICO</div>
  <div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px 14px;margin-bottom:12px;">
    <div class="fisico-grid">
      <div>
        <svg viewBox="0 0 100 100" style="width:100px;height:100px;">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--gray-200)" stroke-width="18"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1B4231" stroke-width="18"
            stroke-dasharray="{land_dash:.1f} {circumference}" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#51B687" stroke-width="18"
            stroke-dasharray="{const_dash:.1f} {circumference}" stroke-dashoffset="-{land_dash:.1f}" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="donut-legend">
          <div><span class="dot" style="background:#1B4231"></span> Terreno</div>
          <div><span class="dot" style="background:#51B687"></span> Construcción</div>
        </div>
      </div>
      <div>
        <div style="margin-bottom:6px;">
          <div style="font-size:9px;color:var(--text-sec);text-transform:uppercase;margin-bottom:2px;">Valor Ref. M&#xB2;</div>
          <div style="font-size:18px;font-weight:700;color:var(--text-main);">${price_sqm:,.0f}</div>
        </div>
        <div style="font-size:10px;color:var(--gray-400);">Depreciación: {depr_pct}%</div>
      </div>
      <div class="fisico-values">
        <div class="fv-row"><span>Terreno</span><span style="font-weight:700">${land_value:,.0f}</span></div>
        <div class="fv-row"><span>Construcción</span><span style="font-weight:700">${construction_phys:,.0f}</span></div>
        <div class="fv-total"><span>Total Físico</span><span>${physical_value:,.0f}</span></div>
      </div>
    </div>
  </div>

  <div class="warning-box">
    <div class="wb-title">&#x26A0; CONSIDERACIONES DEL CÁLCULO FÍSICO</div>
    <p><strong>Referencia Técnica:</strong> El valor físico (Costo de Reposición) es un parámetro técnico-estructural y no constituye el valor de oferta comercial.</p>
    <p style="margin-top:5px;"><strong>Validación de Superficies:</strong> Los datos de m&#xB2; de fuentes administrativas no sustituyen una medición física pericial.</p>
  </div>

{_footer(2)}
</div>


<!-- ════════════════════════════════════════════════════ -->
<!-- PÁGINA 3: COMPARABLES                                -->
<!-- ════════════════════════════════════════════════════ -->
<div class="page">
{_header()}

  <div class="section-title">&#x1F50D; COMPARABLES SELECCIONADOS ({n_comp})</div>

  <table class="comp-table">
    <thead>
      <tr>
        <th>#</th><th>Colonia</th><th>Terr.</th><th>Const.</th>
        <th>Precio</th><th>$/M&#xB2;</th><th>Aj.</th><th>$/M&#xB2; Aj.</th><th>Fuente</th>
      </tr>
    </thead>
    <tbody>
      {comp_rows}
    </tbody>
  </table>

  <div class="va-grid">
    <div class="va-card green-bg">
      <div class="va-title va-title-green">&#x2705; VENTAJAS COMPETITIVAS</div>
      <ul>{v_items_html}</ul>
    </div>
    <div class="va-card red-bg">
      <div class="va-title va-title-amber">&#x26A0; ÁREAS DE OPORTUNIDAD</div>
      <ul>{o_items_html}</ul>
    </div>
  </div>

  <div class="section-title">&#x1F4DD; ANÁLISIS ESTRATÉGICO DE MERCADO</div>
  <div class="analisis-box">
    <p>{analisis_mercado}</p>
  </div>

  <div class="metodo-box">
    <div class="mb-title">&#x1F3E0; METODOLOGÍA DE VALUACIÓN</div>
    <p>Se aplicó el <strong>Método de Comparación de Mercado con Homologación Técnica</strong>. A cada comparable se aplicaron factores de ajuste por: <strong>Edad (Ross-Heidecke)</strong>, <strong>Estado de Conservación</strong> y <strong>Margen de Negociación</strong>. El valor final es un promedio ponderado que prioriza la <strong>mediana estadística</strong> para eliminar valores atípicos.</p>
    <p style="margin-top:4px;font-size:9px;color:var(--gray-400);">Norma: INDAABIN &middot; Manual de Valuación Bancaria SHF &middot; Circular CNBV 1/2009</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px;">
    <div style="border:1px solid var(--gray-200);border-radius:8px;padding:9px 10px;text-align:center;background:var(--box-bg);">
      <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;">Muestra</div>
      <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:#1B4231;">{n_comp}</div>
      <div style="font-size:11px;color:var(--text-sec);">comparables</div>
    </div>
    <div style="border:1px solid var(--gray-200);border-radius:8px;padding:9px 10px;text-align:center;background:var(--box-bg);">
      <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;">$/m&#xB2; Medio</div>
      <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:#1B4231;">${avg_raw:,.0f}</div>
      <div style="font-size:11px;color:var(--text-sec);">mercado zona</div>
    </div>
    <div style="border:1px solid var(--gray-200);border-radius:8px;padding:9px 10px;text-align:center;background:var(--box-bg);">
      <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;">Aj. Promedio</div>
      <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:{adj_color_css};">{avg_adj_pct:+.1f}%</div>
      <div style="font-size:11px;color:var(--text-sec);">homologación</div>
    </div>
    <div style="border:1px solid var(--gray-200);border-radius:8px;padding:9px 10px;text-align:center;background:var(--box-bg);">
      <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;">$/m&#xB2; Ajustado</div>
      <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:#1B4231;">${avg_adj_sqm:,.0f}</div>
      <div style="font-size:11px;color:var(--text-sec);">valor analizado</div>
    </div>
  </div>

  <div style="display:flex;align-items:center;gap:10px;margin-top:8px;border:1px solid var(--gray-200);border-left:4px solid {conf_global_color};border-radius:8px;padding:8px 12px;background:var(--box-bg);">
    <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.4px;">Confianza del avalúo</div>
    <div style="font-family:'Outfit',sans-serif;font-size:14px;font-weight:800;color:{conf_global_color};">&#x25CF; Confianza {conf_global_label}</div>
    <div style="font-size:11px;color:var(--text-sec);margin-left:auto;text-align:right;">Basada en {n_comp} comparables &middot; dispersión {conf_global_dispersion}% &middot; corroboración multi-portal</div>
  </div>

{_footer(3)}
</div>


<!-- ════════════════════════════════════════════════════ -->
<!-- PÁGINA 4: ENTORNO Y RECOMENDACIONES                  -->
<!-- ════════════════════════════════════════════════════ -->
<div class="page">
{_header()}

  <div class="section-title">&#x1F3D8; EQUIPAMIENTO Y SERVICIOS RELEVANTES (RADIO 1.5 KM)</div>

  <div class="servicios-grid">
    {equip_cards}
  </div>
  {plazas_card}
  {bancos_card}

  <div class="section-title">&#x1F525; ESTRATEGIA DE COMERCIALIZACIÓN Y PROMOCIÓN</div>
  <div class="recom-box">
    <div class="recom-head">&#x1F3E0; RECOMENDACIONES PARA INMOBILIARIAS Y PROPIETARIOS</div>
    {recom_items}
  </div>

  <div class="section-title">&#x1F4A1; TIPS GENERALES DE PRESENTACIÓN (HOME STAGING)</div>
  <div class="tips-grid">
    <div class="tip-card">
      <div class="tip-icon">&#x1F3A8;</div>
      <div><div class="tip-title">Presentación:</div><div class="tip-text">Pintura fresca con colores neutros (blanco, beige, gris claro) que amplían visualmente los espacios</div></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">&#x2728;</div>
      <div><div class="tip-title">Limpieza Profunda:</div><div class="tip-text">Limpieza profesional de ventanas, azulejos, alfombras. Ventilación y aromatizantes suaves</div></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">&#x1F4F7;</div>
      <div><div class="tip-title">Fotografía Profesional:</div><div class="tip-text">Propiedades con fotos profesionales reciben 3x más visitas. Considerar video y tour virtual 360°</div></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">&#x1F4E6;</div>
      <div><div class="tip-title">Despersonalización:</div><div class="tip-text">Retirar fotos familiares, ordenar closets, reducir muebles. Espacios vacíos se perciben más amplios</div></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">&#x1F527;</div>
      <div><div class="tip-title">Reparaciones Menores:</div><div class="tip-text">Fugas, grietas, cerraduras, apagadores. Los detalles visibles restan valor percibido al comprador</div></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">&#x1F4B0;</div>
      <div><div class="tip-title">Estrategia de Precio:</div><div class="tip-text">Precio justo de mercado vende 30% más rápido. Precio alto ahuyenta compradores y alarga tiempos</div></div>
    </div>
  </div>

  <div class="legal-box">
    <div class="lb-title">&#x26A0; AVISO LEGAL Y LIMITACIONES</div>
    <p>Este documento es una opinión de valor generada mediante algoritmos de inteligencia artificial y análisis de datos de mercado. No constituye un avalúo reglamentado por la SHF o normativas locales para fines hipotecarios. El valor es una estimación estadística; la precisión depende de los datos proporcionados y la disponibilidad de comparables en la zona. Para fines legales, hipotecarios o litigiosos se requiere un perito valuador certificado con cédula profesional vigente y registro ante las instituciones correspondientes.</p>
  </div>

{_footer(4)}
</div>


{f'''
<!-- ════════════════════════════════════════════════════ -->
<!-- PÁGINA 5: FOTOGRAFÍAS                                -->
<!-- ════════════════════════════════════════════════════ -->
<div class="page">
{_header()}

  <div class="section-title">&#x1F4F7; EVIDENCIA FOTOGRÁFICA</div>

  {photos_content}

  <div style="position:absolute;bottom:18px;left:0;right:0;text-align:center;border-top:1px solid var(--gray-100);padding-top:12px;">
    <div style="display:inline-flex;align-items:center;gap:8px;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1B4231" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/>
        <path d="M10 10h4"/>
        <path d="M10 14h4"/>
        <path d="M10 18h4"/>
      </svg>
      <span style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:#1B4231;">Prop<span style="color:#51B687;">Valu</span></span>
    </div>
    <div style="font-size:9px;color:var(--gray-400);margin-top:3px;">PropValu México &middot; Reporte Inteligente</div>
  </div>
</div>
''' if show_photos_page else ''}

</body>
</html>"""
