import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle2, Download, Upload, FileText, AlertTriangle, Loader2, Database, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import PropiedadManualForm from "@/components/PropiedadManualForm";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const DX = `${API}/api/inmobiliaria/data-exchange`;

const money = (v) => (v ? `$${Number(v).toLocaleString("es-MX")}` : "—");
const num = (v) => (v || v === 0 ? v : "—");

// Muestra de ejemplo (se ve cuando aún no has subido nada) para saber qué datos poner
const SAMPLE = [
  { direccion: "Av. Patria 1250", coto_edificio: "Coto Las Palmas", colonia: "Jardines Universidad", municipio: "Zapopan", tipo: "Casa", precio_oferta: 4200000, m2_construccion: 220, m2_terreno: 180, recamaras: 3, banos: 2, estacionamiento: 2, piso: null, antiguedad: 8, amenidades: "Alberca, Seguridad 24h, Panel solar" },
  { direccion: "Calle Morelos 45", coto_edificio: "Edificio Central", colonia: "Centro", municipio: "Guadalajara", tipo: "Departamento", precio_oferta: 2850000, m2_construccion: 95, m2_terreno: null, recamaras: 2, banos: 2, estacionamiento: 1, piso: 4, antiguedad: 3, amenidades: "Elevador, Gimnasio, Roof garden" },
  { direccion: "Prol. Américas 900", coto_edificio: "", colonia: "Providencia", municipio: "Guadalajara", tipo: "Casa", precio_oferta: 6800000, m2_construccion: 310, m2_terreno: 260, recamaras: 4, banos: 3, estacionamiento: 2, piso: null, antiguedad: 12, amenidades: "Jardín, Cuarto de servicio, Aire acondicionado" },
  { direccion: "Camino Real 30", coto_edificio: "El Palomar", colonia: "El Palomar", municipio: "Tlajomulco", tipo: "Terreno", precio_oferta: 3500000, m2_construccion: null, m2_terreno: 500, recamaras: null, banos: null, estacionamiento: null, piso: null, antiguedad: null, amenidades: "" },
];

const DataExchangeTab = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);   // respuesta de /analizar
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [inventario, setInventario] = useState([]);  // propiedades ya subidas (tabla Excel)
  const [cargandoInv, setCargandoInv] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);

  const cargarInventario = useCallback(async () => {
    setCargandoInv(true);
    try {
      const res = await fetch(`${API}/api/inmobiliaria/propiedades`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setInventario(data.propiedades || []);
    } catch {
      /* silencioso: el tab sigue usable sin la tabla */
    } finally {
      setCargandoInv(false);
    }
  }, []);

  useEffect(() => { cargarInventario(); }, [cargarInventario]);

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
      cargarInventario();   // refresca la tabla con lo recién subido
    } catch (e) {
      toast.error(e.message || "No se pudo confirmar la importación");
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e) => { const f = e.target.files?.[0]; if (f) analizar(f); };

  return (
    <div className="space-y-5">
      {/* Barra delgada: plantilla (izq) + subir (ícono clicable) + conteo útiles + condiciones */}
      <div className="space-y-2">
        <div
          className={`bg-white rounded-xl shadow-sm border-2 border-dashed transition-colors flex flex-col md:flex-row md:items-center gap-4 px-4 py-3 ${
            dragActive ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) analizar(f); }}
        >
          {/* Izquierda: descargar plantilla + texto */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button onClick={descargarPlantilla} className="bg-[#F0FAF5] text-[#1B4332] hover:bg-[#E0F4E8] font-semibold border border-[#B7E4C7] h-9 px-3 shrink-0">
              <Download className="w-4 h-4 mr-1.5" /> Descargar Plantilla
            </Button>
            <Button onClick={() => setManualOpen(true)} variant="outline"
              className="border-slate-200 text-[#1B4332] hover:bg-[#F0FAF5] h-9 px-3 shrink-0"
              title="Agregar 1 a 3 propiedades a mano, sin plantilla" aria-label="Agregar propiedad manual">
              <FilePlus2 className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Agregar manual</span>
            </Button>
            <p className="text-xs text-slate-500 hidden lg:block">Descarga la plantilla para subir tus propiedades.</p>
          </div>

          {/* Derecha: conteo útiles + ícono clicable para subir */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs font-semibold text-[#1B4332] bg-[#F0FAF5] border border-[#B7E4C7] rounded-lg px-2.5 py-1 flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> {inventario.length} útiles · sin repetir
            </span>
            <label className="flex items-center gap-2.5 cursor-pointer group" title="Haz clic para subir tu inventario">
              <div className="w-11 h-11 rounded-full bg-[#1B4332] group-hover:bg-[#2D6A4F] flex items-center justify-center shrink-0 transition-colors shadow-sm">
                {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1B4332] truncate">{file ? file.name : "Sube tu inventario"}</p>
                <p className="text-[11px] text-slate-500">Haz clic o arrastra tu Excel/CSV</p>
              </div>
              <input type="file" className="hidden" onChange={onFile}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            </label>
          </div>
        </div>

        {/* Condiciones: seriedad + validación mensual anti-duplicados */}
        <p className="text-[11px] text-slate-500 px-1 flex items-start gap-1.5 leading-snug">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
          <span>
            Validamos los datos obligatorios de cada propiedad según su tipo.{" "}
            <strong>Cada mes verificamos que no haya duplicadas</strong>: solo las propiedades reales y sin repetir cuentan para tu descuento vitalicio.
          </span>
        </p>
      </div>

      {/* Resultado del análisis (solo tras subir un archivo) */}
      {analysis && (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#52B788] to-[#40916C] px-5 py-4 flex items-center justify-between">
            <p className="font-['Outfit'] font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D9ED92]" /> Resultado del análisis
            </p>
            <span className="text-white text-sm font-semibold">{analysis.aceptadas} de {analysis.total} listas</span>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-semibold">✓ {analysis.nuevas ?? analysis.aceptadas} nuevas</span>
              {analysis.duplicadas > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-semibold">↺ {analysis.duplicadas} ya las tenías</span>
              )}
              {analysis.rechazadas.length > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">⚠ {analysis.rechazadas.length} con datos faltantes</span>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">{analysis.al_pool} suman al mercado</span>
              <span className="px-3 py-1.5 rounded-lg bg-[#D9ED92]/50 text-[#1B4332] font-semibold">Descuento por calidad: {analysis.descuento_pct}%</span>
            </div>

            {analysis.rechazadas.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Corrige y vuelve a subir estas filas:
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {analysis.rechazadas.map((r) => (
                    <li key={r.fila} className="text-xs text-slate-600"><strong>Fila {r.fila}:</strong> falta {r.faltan.join(", ")}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={confirmar} disabled={loading || confirmed || (analysis.nuevas ?? analysis.aceptadas) === 0}
                className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] font-semibold">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {confirmed ? "Importado ✓" : `Importar ${analysis.nuevas ?? analysis.aceptadas} y activar ${analysis.descuento_pct}%`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listado tipo Excel: inventario ya subido (con muestra de ejemplo si está vacío) */}
      {(() => {
        const esEjemplo = inventario.length === 0;
        const filas = esEjemplo ? SAMPLE : inventario;
        return (
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-[#52B788]" /> Mi inventario subido
              </h3>
              {esEjemplo
                ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">Ejemplo — así se verá. Sube tu Excel para reemplazarlo.</span>
                : <span className="text-xs text-slate-400 font-semibold">{inventario.length} propiedades</span>}
            </div>
            <CardContent className="p-0">
              {cargandoInv ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Cargando inventario…
                </div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto">
                  <Table className="table-fixed w-full">
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <TableHeader className="sticky top-0 bg-slate-50 z-10">
                      <TableRow>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Dirección</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Coto / Edif.</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Colonia</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Municipio</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Tipo</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Precio</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">m²C</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">m²T</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Rec</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Bñ</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Est</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Piso</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332] text-right">Ant</TableHead>
                        <TableHead className="px-2 py-2 text-xs font-semibold text-[#1B4332]">Amenidades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={esEjemplo ? "opacity-60 italic" : ""}>
                      {filas.map((p, i) => (
                        <TableRow key={p.propiedad_id || i} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/40">
                          <TableCell className="px-2 py-1.5 text-xs text-slate-700 font-medium truncate" title={p.direccion}>{p.direccion || "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 truncate" title={p.coto_edificio}>{p.coto_edificio || "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 truncate" title={p.colonia}>{p.colonia || "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 truncate" title={p.municipio}>{p.municipio || "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 truncate">{p.tipo || "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-[#1B4332] font-semibold text-right whitespace-nowrap">{money(p.precio_oferta)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.m2_construccion)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.m2_terreno)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.recamaras)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.banos)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.estacionamiento)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{num(p.piso)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 text-right">{p.antiguedad || p.antiguedad === 0 ? `${p.antiguedad}a` : "—"}</TableCell>
                          <TableCell className="px-2 py-1.5 text-xs text-slate-600 truncate" title={p.amenidades}>{p.amenidades || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <PropiedadManualForm
        open={manualOpen}
        onOpenChange={setManualOpen}
        endpoint={`${DX}/manual`}
        onSuccess={cargarInventario}
      />
    </div>
  );
};

export default DataExchangeTab;
