import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { TrendingUp, CheckCircle2, Download, Upload, FileText } from "lucide-react";

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);

const DataExchangeTab = () => {
  const [inventory, setInventory] = useState([
    { id: 1, direccion: "Av. Patria 1200, Zapopan", precioSalida: 3500000, estatus: "Activa", precioCierre: null },
    { id: 2, direccion: "Calle Independencia 45, Guadalajara", precioSalida: 2100000, estatus: "Activa", precioCierre: null },
  ]);
  const [dragActive, setDragActive] = useState(false);

  const handleStatusChange = (id, newStatus) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, estatus: newStatus } : item));
  };

  const handlePrecioCierreChange = (id, value) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, precioCierre: value } : item));
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="absolute -right-10 -top-10 opacity-10">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 9h10M7 12h6M7 15h8" />
          </svg>
        </div>
        <div className="relative z-10 text-white max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold font-['Outfit'] mb-2">Programa Data Exchange: 50% Off</h2>
          <p className="text-sm md:text-base text-[#D9ED92]/90 leading-relaxed">
            Comparte tu inventario histórico y activo de propiedades de forma confidencial. Al enriquecer nuestra base de datos, obtienes un <strong>50% de descuento vitalicio</strong> en todas tus valuaciones dentro de la plataforma.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <div className="bg-[#D9ED92] text-[#1B4332] font-bold text-2xl px-6 py-4 rounded-xl shadow-lg flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> -50% Off
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instructions & Checklist */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white border-0 shadow-sm h-full border-[#B7E4C7]">
            <div className="bg-[#1B4332] px-5 py-3 rounded-t-xl">
              <h3 className="font-['Outfit'] font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9ED92]" /> Instrucciones y Checklist
              </h3>
            </div>
            <CardContent className="p-5">
              <p className="text-sm text-slate-600 mb-4">
                Sube un archivo Excel (.xlsx) o CSV con tu inventario. Asegúrate de incluir las siguientes columnas requeridas:
              </p>
              <ul className="space-y-2 mb-6">
                {["Dirección completa", "Edad (años)", "Estado de conservación", "Precio de salida", "Max. Negociación (%)", "Recámaras", "Baños"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#52B788]" /> {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-[#F0FAF5] text-[#1B4332] hover:bg-[#E0F4E8] font-semibold border border-[#B7E4C7]">
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upload Zone & Inventory */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Zone */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                  dragActive ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); }}
              >
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-[#52B788]" />
                </div>
                <h3 className="text-lg font-bold text-[#1B4332] mb-1">Sube tu inventario</h3>
                <p className="text-sm text-slate-500 mb-4">Arrastra y suelta tu archivo Excel o CSV aquí, o haz clic para explorar.</p>
                <label className="bg-[#1B4332] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2D6A4F] cursor-pointer transition-colors inline-flex items-center gap-2">
                  Explorar archivos
                  <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#52B788] to-[#40916C] px-5 py-4">
              <p className="font-['Outfit'] font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D9ED92]" /> Propiedades Cargadas
              </p>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-[#1B4332]">Dirección</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Precio Salida</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Estatus</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Precio de Cierre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="text-sm text-slate-700 font-medium">
                          {item.direccion}
                        </TableCell>
                        <TableCell className="text-sm text-[#1B4332] font-semibold">
                          {formatMXN(item.precioSalida)}
                        </TableCell>
                        <TableCell>
                          <select 
                            value={item.estatus}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#52B788] ${
                              item.estatus === "Activa" ? "bg-green-50 text-green-700 border-green-200" :
                              item.estatus === "Vendida" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="Activa">Activa</option>
                            <option value="Vendida">Vendida</option>
                            <option value="Baja">Baja</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          {item.estatus === "Vendida" ? (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Precio real de cierre</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input 
                                  type="number" 
                                  value={item.precioCierre || ""}
                                  onChange={(e) => handlePrecioCierreChange(item.id, e.target.value)}
                                  placeholder="Ej. 3200000"
                                  className="w-32 pl-6 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#52B788]"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataExchangeTab;
