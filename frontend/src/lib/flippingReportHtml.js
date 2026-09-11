import { GOOGLE_MAPS_KEY } from "@/components/LocationMap";

const fmt = (v) => `$${Math.round(v || 0).toLocaleString("es-MX")} MXN`;

// Genera el HTML del reporte de flipping (mismo esqueleto/CSS que
// backend/report_generator.py::generate_mini_report_html) para descargarlo
// como PDF con lib/downloadReportPdf.js — 100% cliente, sin backend.
export function buildFlippingReportHtml({ prop, direccion, arv, calc, folio }) {
  const lat = prop.lat || 20.6597;
  const lng = prop.lng || -103.3496;
  const hasCoords = !!(prop.lat && prop.lng);
  const mapHtml = hasCoords
    ? `<img src="https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x300&markers=color:0x1B4332%7C${lat},${lng}&key=${GOOGLE_MAPS_KEY}" alt="Mapa" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='&#x1F4CD; ${lat.toFixed(6)}, ${lng.toFixed(6)}'">`
    : `<span>&#x1F4CD; Sin ubicación capturada</span>`;

  const dateDisplay = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  const margenColor = calc.margenPctReal >= 0.20 ? "#2D6A4F" : calc.margenPctReal >= 0.10 ? "#B7791F" : "#C0392B";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>PropValu ${folio} - Flipping</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --green-900:#1B4231; --green-700:#2D6A4F; --lime:#D9ED91; --text-main:#0F162A; --text-sec:#63738A; --gray-200:#e2e8f0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; color:var(--text-main); font-size:13px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1,h2,h3 { font-family:'Outfit',sans-serif; }
  .page { width:210mm; min-height:297mm; margin:0 auto; padding:16mm 18mm; background:#fff; position:relative; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--green-900); padding-bottom:10px; margin-bottom:18px; }
  .logo-text { font-family:'Outfit',sans-serif; font-weight:800; font-size:20px; color:var(--green-900); }
  .logo-text span { color:var(--green-700); }
  .folio-box { text-align:right; font-size:11px; color:var(--text-sec); }
  .addr { font-size:15px; font-weight:600; margin-bottom:2px; }
  .loc { font-size:12px; color:var(--text-sec); margin-bottom:20px; }
  .value-box { background:var(--green-900); color:#fff; border-radius:14px; padding:22px; text-align:center; margin-bottom:18px; }
  .value-label { font-size:12px; opacity:.85; letter-spacing:.5px; text-transform:uppercase; }
  .value-amount { font-family:'Outfit',sans-serif; font-weight:800; font-size:32px; margin:6px 0; }
  .value-range { font-size:12px; opacity:.85; }
  .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
  .grid4 .cell { background:#f8fafc; border:1px solid var(--gray-200); border-radius:10px; padding:12px; text-align:center; }
  .grid4 .cell .lbl { font-size:10px; color:var(--text-sec); text-transform:uppercase; }
  .grid4 .cell .val { font-size:16px; font-weight:700; margin-top:4px; }
  .map-box { width:100%; height:170px; border-radius:10px; overflow:hidden; background:#e2e8f0; display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
  table.costos { width:100%; border-collapse:collapse; margin-bottom:18px; font-size:12px; }
  table.costos td { padding:6px 4px; border-bottom:1px solid var(--gray-200); }
  table.costos td:last-child { text-align:right; font-weight:600; }
  table.costos tr.total td { border-top:2px solid var(--green-900); border-bottom:none; font-weight:700; padding-top:10px; }
  .result-box { background:#f0faf4; border:1.5px solid var(--green-700); border-radius:14px; padding:20px; margin-bottom:18px; }
  .result-row { display:flex; justify-content:space-between; font-size:13px; padding:4px 0; }
  .result-row.margen { font-size:18px; font-weight:800; margin-top:6px; }
  .footer { border-top:1px solid var(--gray-200); padding-top:10px; font-size:9px; color:var(--text-sec); text-align:center; position:absolute; bottom:14mm; left:18mm; right:18mm; }
  @media print { @page { size:A4; margin:0; } .page { margin:0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-text">Prop<span>Valu</span></div>
    <div class="folio-box">Flipping · Folio: <strong>${folio}</strong><br>Fecha: ${dateDisplay}</div>
  </div>

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
    <div class="cell"><div class="lbl">Colonia</div><div class="val" style="font-size:12px;">${prop.colonia || "-"}</div></div>
  </div>

  <div class="map-box">${mapHtml}</div>

  <table class="costos">
    <tr><td>Precio de compra</td><td>${fmt(calc.precioCompraNum)}</td></tr>
    <tr><td>Deudas de la propiedad</td><td>${fmt(calc.deudasTotal)}</td></tr>
    <tr><td>Remodelación (obra)</td><td>${fmt(calc.remodelacion)}</td></tr>
    <tr><td>Gastos de gestión</td><td>${fmt(calc.gestionTotal)}</td></tr>
    <tr><td>Costos de venta, cierre y operación</td><td>${fmt(calc.costosVentaTotal)}</td></tr>
    <tr class="total"><td>Inversión total</td><td>${fmt(calc.inversionTotal)}</td></tr>
  </table>

  <div class="result-box">
    <div class="result-row"><span>Neto que recibe el dueño actual</span><span>${fmt(calc.netoAlDueno)}</span></div>
    <div class="result-row"><span>Valor de venta (ARV)</span><span>${fmt(arv.avg)}</span></div>
    <div class="result-row margen" style="color:${margenColor}"><span>Margen neto del flip</span><span>${fmt(calc.margenNeto)} (${(calc.margenPctReal * 100).toFixed(1)}%)</span></div>
  </div>

  <div class="footer">
    Estimación de mercado y proyección de flip, no constituye avalúo formal ni dictamen pericial &mdash; PropValu &middot; propvalu.mx
  </div>
</div>
</body>
</html>`;
}
