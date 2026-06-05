const fs = require("fs");
const path = "frontend/src/pages/InmobiliariaDashboardPage.jsx";
let code = fs.readFileSync(path, "utf8");

// We want to remove FacturacionTab and PromocionesTab which are defined as:
// const FacturacionTab = () => { ... };
// const PromocionesTab = () => { ... };

// Find the start of FacturacionTab
let fStart = code.indexOf("const FacturacionTab = () => {");
let fEnd = code.indexOf("/* ─── Promociones Tab ─── */", fStart);
if (fEnd === -1) fEnd = code.indexOf("const PromocionesTab = () => {", fStart);

// Find the end of PromocionesTab
let pStart = code.indexOf("const PromocionesTab = () => {");
let pEnd = code.indexOf("/* ─── Publicidad Tab ─── */", pStart);

if (fStart !== -1 && pEnd !== -1) {
    // Remove both functions
    code = code.substring(0, fStart) + code.substring(pEnd);
}

// Add the React.lazy imports at the top
const importsStr = `
const FacturacionTab = React.lazy(() => import('@/components/dashboard/tabs/FacturacionTab'));
const PromocionesTab = React.lazy(() => import('@/components/dashboard/tabs/PromocionesTab'));
const DataExchangeTab = React.lazy(() => import('@/components/dashboard/tabs/DataExchangeTab'));
`;

// Insert after other imports
let importEnd = code.lastIndexOf("import");
let nextNewline = code.indexOf("\n", importEnd);
code = code.substring(0, nextNewline + 1) + importsStr + code.substring(nextNewline + 1);

// Wrap the rendering of tabs in Suspense
let activeTabResumen = code.indexOf('{activeTab === "resumen" && (');
if (activeTabResumen !== -1) {
    code = code.substring(0, activeTabResumen) + 
           '<React.Suspense fallback={<p className="text-center p-10 text-slate-400">Cargando pestaña...</p>}>\n        ' + 
           code.substring(activeTabResumen);
           
    // Now close the Suspense wrapper at the end of the tabs
    let endOfTabs = code.indexOf('{/* Modal calificar valuador */}');
    if (endOfTabs !== -1) {
        code = code.substring(0, endOfTabs) + 
               '</React.Suspense>\n      ' + 
               code.substring(endOfTabs);
    }
}

// Ensure DataExchangeTab is included in the render list
let facturacionRender = code.indexOf('{activeTab === "facturacion" && <FacturacionTab />}');
if (facturacionRender !== -1 && !code.includes('<DataExchangeTab />')) {
    code = code.substring(0, facturacionRender) + 
           '{activeTab === "data_exchange" && <DataExchangeTab />}\n        ' + 
           code.substring(facturacionRender);
}

fs.writeFileSync(path, code, "utf8");
console.log("Refactor applied via script.");
