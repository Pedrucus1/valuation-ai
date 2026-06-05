const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, 'frontend', 'src', 'pages', 'InmobiliariaDashboardPage.jsx');
let content = fs.readFileSync(fp, 'utf8');

const target =                   <TableCell>
                    {v.estado === "completada" && v.valuador_id && !v.calificada && (
                      <button
                        onClick={() => setCalificarModal(v)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Star className="w-3 h-3" />
                        Calificar
                      </button>
                    )};

const replacement =                   <TableCell className="flex items-center gap-2">
                    {v.estado === "completada" && (
                      <button
                        onClick={() => window.open(\/reporte/\\, "_blank")}
                        className="flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:text-[#2D6A4F] bg-[#F0FAF5] hover:bg-[#D9F0E3] border border-[#B7E4C7] px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        title="Ver Reporte"
                      >
                        <FileText className="w-3 h-3" />
                        Ver Reporte
                      </button>
                    )}
                    {v.estado === "completada" && v.valuador_id && !v.calificada && (
                      <button
                        onClick={() => setCalificarModal(v)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                        title="Calificar Valuador"
                      >
                        <Star className="w-3 h-3" />
                        Calificar
                      </button>
                    )};

content = content.replace(target, replacement);
fs.writeFileSync(fp, content, 'utf8');
console.log("Done");
