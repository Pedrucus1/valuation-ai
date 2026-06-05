const fs = require("fs");
const path = "frontend/src/pages/InmobiliariaDashboardPage.jsx";
let code = fs.readFileSync(path, "utf8");

let fStart = code.indexOf("const FacturacionTab = () => {");
let fEnd = code.indexOf("/* ─── Promociones Tab ─── */", fStart);
if (fEnd === -1) fEnd = code.indexOf("const PromocionesTab = () => {", fStart);

let pStart = code.indexOf("const PromocionesTab = () => {");
let pEnd = code.indexOf("/* ─── Publicidad Tab ─── */", pStart);

if (fStart !== -1 && pEnd !== -1) {
    code = code.substring(0, fStart) + code.substring(pEnd);
}

const importsStr = `
const FacturacionTab = React.lazy(() => import('@/components/dashboard/tabs/FacturacionTab'));
const PromocionesTab = React.lazy(() => import('@/components/dashboard/tabs/PromocionesTab'));
const DataExchangeTab = React.lazy(() => import('@/components/dashboard/tabs/DataExchangeTab'));
`;

let importEnd = code.lastIndexOf("import");
let nextNewline = code.indexOf("\n", importEnd);
code = code.substring(0, nextNewline + 1) + importsStr + code.substring(nextNewline + 1);

let activeTabResumen = code.indexOf('{activeTab === "resumen" && (');
if (activeTabResumen !== -1) {
    code = code.substring(0, activeTabResumen) + 
           '<React.Suspense fallback={<p className="text-center p-10 text-slate-400">Cargando pestaña...</p>}>\n        ' + 
           code.substring(activeTabResumen);
           
    // Find the end of main to place the closing Suspense properly inside main.
    // We can look for </main> and place it right before it.
    let mainEnd = code.lastIndexOf('</main>');
    if (mainEnd !== -1) {
        code = code.substring(0, mainEnd) + 
               '</React.Suspense>\n        ' + 
               code.substring(mainEnd);
    }
}

let facturacionRender = code.indexOf('{activeTab === "facturacion" && <FacturacionTab />}');
if (facturacionRender !== -1 && !code.includes('<DataExchangeTab />')) {
    code = code.substring(0, facturacionRender) + 
           '{activeTab === "data_exchange" && <DataExchangeTab />}\n        ' + 
           code.substring(facturacionRender);
}

fs.writeFileSync(path, code, "utf8");
console.log("Refactor applied via script perfectly.");
