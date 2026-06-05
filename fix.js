const fs = require('fs');
const fp = 'frontend/src/components/dashboard/tabs/PromocionesTab.jsx';
let content = fs.readFileSync(fp, 'utf8');

const target =             <div className="flex flex-wrap items-end gap-6 border-t border-slate-100 pt-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Idioma de la Ficha</label>
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setIdioma("es")} className={\px-4 py-1.5 rounded-md text-sm font-semibold transition-colors \\}>EspaAol</button>
                <button onClick={() => setIdioma("en")} className={\px-4 py-1.5 rounded-md text-sm font-semibold transition-colors \\}>English</button>
              </div>
            </div>;

const replacement =             <div className="flex flex-wrap items-end gap-6 border-t border-slate-100 pt-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Idioma de la Ficha</label>
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setIdioma("es")} className={\px-4 py-1.5 rounded-md text-sm font-semibold transition-colors \\}>Español</button>
                  <button onClick={() => setIdioma("en")} className={\px-4 py-1.5 rounded-md text-sm font-semibold transition-colors \\}>English</button>
                </div>
              </div>
            </div>;

content = content.replace(target, replacement);
fs.writeFileSync(fp, content, 'utf8');
console.log("Fixed syntax");
