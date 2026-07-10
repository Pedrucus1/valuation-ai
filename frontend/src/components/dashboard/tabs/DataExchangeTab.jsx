import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { TrendingUp, CheckCircle2, Download, Upload, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const DX = `${API}/api/inmobiliaria/data-exchange`;

const DataExchangeTab = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);   // respuesta de /analizar
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const descargarPlantilla = async () => {
    try {
      const res = await fetch(`${DX}/plantilla`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_data_exchange.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar la plantilla");
    }
  };

  const analizar = async (f) => {
    setFile(f); setAnalysis(null); setConfirmed(false); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("archivo", f);
      const res = await fetch(`${DX}/analizar`, { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al analizar");
      setAnalysis(data);
    } catch (e) {
      toast.error(e.message || "No se pudo analizar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const res = await fetch(`${DX}/confirmar`, { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al confirmar");
      setConfirmed(true);
      toast.success(`${data.al_crm} propiedades importadas · ${data.descuento_pct}% activado`);
    } catch (e) {
      toast.error(e.message || "No se pudo confirmar la importación");
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e) => { const f = e.target.files?.[0]; if (f) analizar(f); };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="relative z-10 text-white max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold font-['Outfit'] mb-2">Programa Data Exchange: 50% Off</h2>
          <p className="text-sm md:text-base text-[#D9ED92]/90 leading-relaxed">
            Comparte tu inventario de propiedades. Se suma a tu CRM y, al enriquecer nuestra base de datos, obtienes un <strong>50% de descuento vitalicio</strong> en tus valuaciones.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <div className={`font-bold text-2xl px-6 py-4 rounded-xl shadow-lg flex items-center gap-2 ${confirmed ? "bg-[#D9ED92] text-[#1B4332]" : "bg-white/15 text-white"}`}>
            <TrendingUp className="w-6 h-6" /> {confirmed ? "-50% Activo" : "-50% Off"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instructions & Checklist */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white border-0 shadow-sm h-full border-[#B7E4C7]">
            <div className="bg-[#1B4332] px-5 py-3 rounded-t-xl">
              <h3 className="font-['Outfit'] font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9ED92]" /> Instrucciones
              </h3>
            </div>
            <CardContent className="p-5">
              <p className="text-sm text-slate-600 mb-4">
                Descarga la plantilla, llénala (una fila por propiedad) y súbela. La primera columna es el <strong>Tipo de propiedad</strong>: para Terreno solo se piden ubicación, precio y m² terreno.
              </p>
              <Button onClick={descargarPlantilla} className="w-full bg-[#F0FAF5] text-[#1B4332] hover:bg-[#E0F4E8] font-semibold border border-[#B7E4C7]">
                <Download className="w-4 h-4 mr-2" /> Descargar Plantilla
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upload Zone & Results */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
                  dragActive ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 bg-slate-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) analizar(f); }}
              >
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                  {loading ? <Loader2 className="w-8 h-8 text-[#52B788] animate-spin" /> : <Upload className="w-8 h-8 text-[#52B788]" />}
                </div>
                <h3 className="text-lg font-bold text-[#1B4332] mb-1">{file ? file.name : "Sube tu inventario"}</h3>
                <p className="text-sm text-slate-500 mb-4">Arrastra tu Excel o CSV aquí, o haz clic para explorar.</p>
                <label className="bg-[#1B4332] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2D6A4F] cursor-pointer transition-colors inline-flex items-center gap-2">
                  Explorar archivos
                  <input type="file" className="hidden" onChange={onFile}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                </label>
              </div>
            </CardContent>
          </Card>

          {analysis && (
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#52B788] to-[#40916C] px-5 py-4 flex items-center justify-between">
                <p className="font-['Outfit'] font-bold text-white text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D9ED92]" /> Resultado del análisis
                </p>
                <span className="text-white text-sm font-semibold">
                  {analysis.aceptadas} de {analysis.total} listas
                </span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-semibold">✓ {analysis.aceptadas} aceptadas</span>
                  {analysis.rechazadas.length > 0 && (
                    <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">⚠ {analysis.rechazadas.length} con datos faltantes</span>
                  )}
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">{analysis.al_pool} suman al mercado</span>
                </div>

                {analysis.rechazadas.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Corrige y vuelve a subir estas filas:
                    </p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {analysis.rechazadas.map((r) => (
                        <li key={r.fila} className="text-xs text-slate-600">
                          <strong>Fila {r.fila}:</strong> falta {r.faltan.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.preview.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-semibold text-[#1B4332]">Dirección</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Colonia</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Tipo</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Precio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.preview.map((p, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="text-sm text-slate-700 font-medium">{p["Dirección"]}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p["Colonia"]}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p["Tipo de propiedad"]}</TableCell>
                            <TableCell className="text-sm text-[#1B4332] font-semibold">
                              {p["Precio de salida (MXN)"] ? `$${Number(p["Precio de salida (MXN)"]).toLocaleString("es-MX")}` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={confirmar} disabled={loading || confirmed || analysis.aceptadas === 0}
                    className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] font-semibold">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {confirmed ? "Importado ✓" : `Importar ${analysis.aceptadas} y activar 50%`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataExchangeTab;
