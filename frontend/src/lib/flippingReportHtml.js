import { GOOGLE_MAPS_KEY } from "@/components/LocationMap";

const fmt = (v) => `$${Math.round(v || 0).toLocaleString("es-MX")} MXN`;
const pct = (v) => `${(v || 0).toFixed(1)}%`;

// Genera el HTML del reporte de flipping (hoja carta, 2 páginas) para
// descargarlo como PDF con lib/downloadReportPdf.js — 100% cliente, sin backend.
// Mismo esqueleto/CSS que backend/report_generator.py::generate_mini_report_html,
// incluida la regla de la fachada: si no hay foto, el mapa toma el ancho completo
// (report_generator.py:1222-1225), no se deja una caja gris vacía.
export function buildFlippingReportHtml({ prop, direccion, arv, calc, folio, facadePhoto, chartData = [], roiTimeData = [] }) {
  const lat = prop.lat || 20.6597;
  const lng = prop.lng || -103.3496;
  const hasCoords = !!(prop.lat && prop.lng);
  const mapHtml = hasCoords
    ? `<img src="https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=500x300&markers=color:0x1B4332%7C${lat},${lng}&key=${GOOGLE_MAPS_KEY}" alt="Mapa" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='&#x1F4CD; ${lat.toFixed(6)}, ${lng.toFixed(6)}'">`
    : `<span>&#x1F4CD; Sin ubicación capturada</span>`;

  const dateDisplay = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  const margenColor = calc.margenPctReal >= 0.20 ? "#2D6A4F" : calc.margenPctReal >= 0.10 ? "#B7791F" : "#C0392B";

  const costRows = [
    ["Precio de compra", calc.precioCompra],
    ["Deudas de la propiedad", calc.deudasTotal],
    ["Remodelación (obra)", calc.remodelacion],
    ["Gastos de gestión", calc.gestionTotal],
    ["Costos de venta, cierre y operación", calc.costosVentaTotal],
    ["Costo financiero", calc.financiero],
  ].filter(([, v]) => v > 0);

  const totalChart = chartData.reduce((s, d) => s + d.valor, 0) || 1;
  const stackedBarHtml = chartData.map((d) =>
    `<span style="display:inline-block;height:100%;width:${(d.valor / totalChart) * 100}%;background:${d.color};"></span>`
  ).join("");
  const legendHtml = chartData.map((d) =>
    `<div class="legend-row"><span class="dot" style="background:${d.color}"></span><span class="lbl">${d.name}</span><span class="pct">${((d.valor / totalChart) * 100).toFixed(0)}%</span><span class="amt">${fmt(d.valor)}</span></div>`
  ).join("");

  const maxRoi = Math.max(1, ...roiTimeData.map((d) => Math.abs(d.roiAnualizado)));
  const roiBarsHtml = roiTimeData.map((d) => {
    const h = Math.max(2, (Math.abs(d.roiAnualizado) / maxRoi) * 70);
    const active = d.meses === calc.mesesVenta;
    return `<div class="roi-bar-col">
      <div class="roi-bar-val">${d.roiAnualizado.toFixed(0)}%</div>
      <div class="roi-bar" style="height:${h}px;background:${active ? "#1B4231" : "#95D5B2"};"></div>
      <div class="roi-bar-lbl">${d.meses}m</div>
    </div>`;
  }).join("");

  const headerLogo = `<div class="logo">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1B4231" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
        </svg>
      </div>
      <div class="logo-text">Prop<span>Valu</span></div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>PropValu ${folio} - Flipping</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --green-900:#1B4231; --green-700:#2D6A4F; --lime:#D9ED91; --text-main:#0F162A; --text-sec:#63738A; --gray-200:#e2e8f0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; color:var(--text-main); font-size:12px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1,h2,h3 { font-family:'Outfit',sans-serif; }
  .page { width:216mm; height:279mm; margin:0 auto; padding:14mm 16mm; background:#fff; position:relative; overflow:hidden; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--green-900); padding-bottom:8px; margin-bottom:12px; }
  .logo { display:flex; align-items:center; gap:6px; }
  .logo-icon { width:24px; height:24px; color:var(--green-900); }
  .logo-icon svg { width:24px; height:24px; }
  .logo-text { font-family:'Outfit',sans-serif; font-weight:800; font-size:19px; color:var(--green-900); }
  .logo-text span { color:var(--green-700); }
  .folio-box { text-align:right; font-size:10px; color:var(--text-sec); line-height:1.6; }
  .folio-box strong { color:var(--text-main); }
  .title-banner { background:var(--green-900); color:#fff; text-align:center; padding:8px 16px; border-radius:8px; margin-bottom:14px; font-family:'Outfit',sans-serif; font-size:12px; font-weight:700; }
  .addr { font-size:14px; font-weight:600; margin-bottom:2px; }
  .loc { font-size:11px; color:var(--text-sec); margin-bottom:14px; }
  .value-box { background:var(--green-900); color:#fff; border-radius:14px; padding:18px; text-align:center; margin-bottom:14px; }
  .value-label { font-size:11px; opacity:.85; letter-spacing:.5px; text-transform:uppercase; }
  .value-amount { font-family:'Outfit',sans-serif; font-weight:800; font-size:28px; margin:4px 0; }
  .value-range { font-size:11px; opacity:.85; }
  .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
  .grid4 .cell { background:#f8fafc; border:1px solid var(--gray-200); border-radius:10px; padding:10px; text-align:center; }
  .grid4 .cell .lbl { font-size:9px; color:var(--text-sec); text-transform:uppercase; }
  .grid4 .cell .val { font-size:14px; font-weight:700; margin-top:3px; }
  .photos-row { display:flex; gap:10px; margin-bottom:14px; }
  .photos-row .box { height:170px; border-radius:10px; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; }
  h3.section { font-size:13px; color:var(--green-900); margin-bottom:8px; }
  table.costos { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:11px; }
  table.costos td { padding:5px 4px; border-bottom:1px solid var(--gray-200); }
  table.costos td:last-child { text-align:right; font-weight:600; }
  table.costos tr.total td { border-top:2px solid var(--green-900); border-bottom:none; font-weight:700; padding-top:8px; }
  .result-box { background:#f0faf4; border:1.5px solid var(--green-700); border-radius:14px; padding:16px; margin-bottom:14px; }
  .result-row { display:flex; justify-content:space-between; font-size:12px; padding:3px 0; }
  .result-row.margen { font-size:17px; font-weight:800; margin-top:5px; }
  .roi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
  .roi-grid .cell { background:#f8fafc; border-radius:10px; padding:10px; text-align:center; }
  .roi-grid .cell .lbl { font-size:9px; color:var(--text-sec); text-transform:uppercase; }
  .roi-grid .cell .val { font-size:16px; font-weight:800; color:var(--green-900); margin-top:2px; }
  .stack-bar { display:flex; width:100%; height:22px; border-radius:6px; overflow:hidden; margin-bottom:8px; }
  .legend-row { display:flex; align-items:center; gap:6px; font-size:10px; padding:2px 0; }
  .legend-row .dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
  .legend-row .lbl { flex:1; color:var(--text-main); }
  .legend-row .pct { width:32px; font-weight:700; color:var(--green-900); }
  .legend-row .amt { width:90px; text-align:right; color:var(--text-sec); }
  .roi-bars { display:flex; align-items:flex-end; gap:6px; height:110px; margin-bottom:6px; padding-top:14px; }
  .roi-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
  .roi-bar-val { font-size:8px; color:var(--text-sec); margin-bottom:2px; }
  .roi-bar { width:70%; border-radius:3px 3px 0 0; }
  .roi-bar-lbl { font-size:8px; color:var(--text-sec); margin-top:3px; }
  .footer { border-top:1px solid var(--gray-200); padding-top:8px; font-size:8px; color:var(--text-sec); text-align:center; position:absolute; bottom:10mm; left:16mm; right:16mm; }
  .page-num { position:absolute; bottom:10mm; right:16mm; font-size:8px; color:var(--text-sec); }
  @media print { @page { size:letter; margin:0; } .page { margin:0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    ${headerLogo}
    <div class="folio-box">Folio: <strong>${folio}</strong><br>Fecha: ${dateDisplay}</div>
  </div>

  <div class="title-banner">&#x1F4CA; Análisis de Flipping</div>

  <div class="addr">&#x1F4CD; ${direccion || "Dirección no especificada"}</div>
  <div class="loc">${[prop.municipio, prop.estado].filter(Boolean).join(", ")}</div>

  <div class="value-box">
    <div class="value-label">Valor de Venta Estimado (ARV)</div>
    <div class="value-amount">${fmt(arv.avg)}</div>
    <div class="value-range">Rango: ${fmt(arv.min)} &mdash; ${fmt(arv.max)}</div>
  </div>

  <div class="grid4">
    <div class="cell"><div class="lbl">Terreno</div><div class="val">${prop.terreno_m2 || "-"} m&#xB2;</div></div>
    <div class="cell"><div class="lbl">Construcción</div><div class="val">${prop.construccion_m2 || "-"} m&#xB2;</div></div>
    <div class="cell"><div class="lbl">Tipo</div><div class="val">${prop.propertyType || "Casa"}</div></div>
    <div class="cell"><div class="lbl">Colonia</div><div class="val" style="font-size:11px;">${prop.colonia || "-"}</div></div>
  </div>

  <div class="photos-row">
    <div class="box" style="${facadePhoto ? "flex:1;" : "width:100%;"}">${mapHtml}</div>
    ${facadePhoto ? `<div class="box" style="flex:1;"><img src="${facadePhoto}" alt="Fachada" style="width:100%;height:100%;object-fit:cover;"></div>` : ""}
  </div>

  <div class="footer">
    Estimación de mercado y proyección de flip, no constituye avalúo formal ni dictamen pericial &mdash; PropValu &middot; propvalu.mx
  </div>
  <div class="page-num">1/2</div>
</div>

<div class="page">
  <div class="header">
    ${headerLogo}
    <div class="folio-box">Folio: <strong>${folio}</strong><br>Fecha: ${dateDisplay}</div>
  </div>

  <h3 class="section">Desglose de inversión</h3>
  ${chartData.length ? `<div class="stack-bar">${stackedBarHtml}</div><div style="margin-bottom:14px;">${legendHtml}</div>` : ""}
  <table class="costos">
    ${costRows.map(([label, v]) => `<tr><td>${label}</td><td>${fmt(v)}</td></tr>`).join("")}
    <tr class="total"><td>Inversión total</td><td>${fmt(calc.inversionTotal)}</td></tr>
  </table>

  <div class="result-box">
    <div class="result-row"><span>Neto que recibe el dueño actual</span><span>${fmt(calc.netoAlDueno)}</span></div>
    <div class="result-row"><span>Valor de venta (ARV)</span><span>${fmt(arv.avg)}</span></div>
    <div class="result-row margen" style="color:${margenColor}"><span>Margen neto del flip</span><span>${fmt(calc.margenNeto)} (${pct(calc.margenPctReal * 100)})</span></div>
  </div>

  <h3 class="section">Retorno para el inversionista</h3>
  <div class="roi-grid">
    <div class="cell"><div class="lbl">ROI del flip</div><div class="val">${pct(calc.roiPct)}</div></div>
    <div class="cell"><div class="lbl">ROI anualizado</div><div class="val">${pct(calc.roiAnualizado)}</div></div>
    <div class="cell"><div class="lbl">Tiempo para vender</div><div class="val">${calc.mesesVenta || 0} meses</div></div>
  </div>
  ${roiTimeData.length ? `<div style="font-size:10px;color:var(--text-sec);margin-bottom:2px;">ROI anualizado según meses para vender (oscuro = tu selección)</div><div class="roi-bars">${roiBarsHtml}</div>` : ""}

  <div class="footer">
    Estimación de mercado y proyección de flip, no constituye avalúo formal ni dictamen pericial &mdash; PropValu &middot; propvalu.mx
  </div>
  <div class="page-num">2/2</div>
</div>
</body>
</html>`;
}
