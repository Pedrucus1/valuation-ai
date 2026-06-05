const fs = require('fs');
const fp = 'frontend/src/pages/InmobiliariaDashboardPage.jsx';
let lines = fs.readFileSync(fp, 'utf8').split('\n');

// 1. Añadir import si no existe
const importStr = 'import PromocionesTab from "../components/dashboard/tabs/PromocionesTab";';
let hasImport = false;
for (let i = 0; i < 50; i++) {
  if (lines[i].includes('PromocionesTab')) {
    hasImport = true;
    break;
  }
}
if (!hasImport) {
  lines.splice(2, 0, importStr);
}

// 2. Eliminar el PromocionesTab interno
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const PromocionesTab = () => {')) start = i;
  if (start !== -1 && lines[i].includes('/* ── Publicidad Tab ── */')) {
    end = i - 1;
    break;
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1);
}

// 3. Pasar props en el renderizado
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{activeTab === "promociones" && <PromocionesTab />}')) {
    lines[i] = lines[i].replace(
      '<PromocionesTab />', 
      '<PromocionesTab valuacionesList={valuacionesList} session={session} />'
    );
  }
}

fs.writeFileSync(fp, lines.join('\n'), 'utf8');
console.log("Done patching InmobiliariaDashboardPage");
