const fs = require('fs');
const path = 'c:/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/frontend/src/pages/InmobiliariaDashboardPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use indices to replace
const removeSection = (startStr, endStr, keepEnd) => {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) {
    console.log("Could not find", startStr);
    return;
  }
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx === -1) {
    console.log("Could not find", endStr);
    return;
  }
  
  content = content.slice(0, startIdx) + (keepEnd ? endStr : '') + content.slice(endIdx + endStr.length);
};

// Remove FacturacionTab (up to PromocionesTab)
removeSection('/* ── Facturación Tab ── */', '/* ── Promociones Tab ── */', true);

// Remove PromocionesTab (up to Publicidad Tab)
removeSection('/* ── Promociones Tab ── */', '/* ── Publicidad Tab ── */', true);

// Remove DataExchangeTab (up to the return statement)
removeSection('/* ── Data Exchange Tab ── */', '  return (\n    <div className="min-h-screen', true);

fs.writeFileSync(path, content, 'utf8');
console.log("Cleanup done!");
