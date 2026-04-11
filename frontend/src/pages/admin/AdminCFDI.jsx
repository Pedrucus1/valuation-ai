import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  FileText, Download, Search, ChevronDown, CheckCircle2,
  XCircle, Clock, AlertCircle, RefreshCw, X, Send,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

// Mock — en producción conectar con Facturama API (api.facturama.mx)
const CFDI_MOCK = [
  { id: "cfdi-001", folio: "A0001", cliente: "RE/MAX Jalisco",        rfc: "RMX010101ABC", concepto: "Suscripción Pro — Marzo 2026",    monto: 1400,  iva: 224,  total: 1624,  estado: "timbrado",   uuid: "F1A2B3C4-...", fecha: "2026-03-01", uso_cfdi: "G03" },
  { id: "cfdi-002", folio: "A0002", cliente: "Ing. Roberto Sánchez",   rfc: "SARR880215H12", concepto: "Plan Pro Valuador — Marzo 2026", monto: 800,   iva: 128,  total: 928,   estado: "timbrado",   uuid: "D4E5F6A7-...", fecha: "2026-03-01", uso_cfdi: "G03" },
  { id: "cfdi-003", folio: "A0003", cliente: "PropHouse Zapopan",      rfc: "PPH200310XY0",  concepto: "Paquete Starter — Marzo 2026",  monto: 600,   iva: 96,   total: 696,   estado: "timbrado",   uuid: "B8C9D0E1-...", fecha: "2026-03-02", uso_cfdi: "G03" },
  { id: "cfdi-004", folio: "A0004", cliente: "Tasas MX Créditos",      rfc: "TMX190505KL2",  concepto: "Anuncio Premium — Marzo 2026",  monto: 2500,  iva: 400,  total: 2900,  estado: "pendiente",  uuid: null,           fecha: "2026-03-15", uso_cfdi: "G03" },
  { id: "cfdi-005", folio: "A0005", cliente: "Carlos Mendoza Ruiz",    rfc: "MERC750810P22", concepto: "Plan Pro Valuador — Marzo 2026", monto: 800,   iva: 128,  total: 928,   estado: "timbrado",   uuid: "C2D3E4F5-...", fecha: "2026-03-01", uso_cfdi: "G03" },
  { id: "cfdi-006", folio: "A0006", cliente: "Inmobiliaria Norte",     rfc: "INO180720NRT",  concepto: "Plan Pro Inmobiliaria",          monto: 1200,  iva: 192,  total: 1392,  estado: "cancelado",  uuid: "E6F7A8B9-...", fecha: "2026-02-28", uso_cfdi: "G03", motivo_cancelacion: "Cuenta suspendida por queja" },
  { id: "cfdi-007", folio: "A0007", cliente: "Arq. Claudia Vega",      rfc: "VECL840922M33", concepto: "Plan Pro Valuador — Marzo 2026", monto: 800,   iva: 128,  total: 928,   estado: "timbrado",   uuid: "G0H1I2J3-...", fecha: "2026-03-01", uso_cfdi: "G03" },
  { id: "cfdi-008", folio: "A0008", cliente: "Ana García López",       rfc: "GALA950312F44", concepto: "Reporte público — folio RPT-2341", monto: 241.38, iva: 38.62, total: 280, estado: "pendiente",  uuid: null,           fecha: "2026-03-19", uso_cfdi: "G01" },
];

const ESTADO_CFG = {
  timbrado:  { label: "Timbrado ✓",  cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pendiente: { label: "Pendiente",   cls: "bg-yellow-100 text-yellow-700",icon: <Clock className="w-3.5 h-3.5" /> },
  cancelado: { label: "Cancelado",   cls: "bg-red-100 text-red-600",      icon: <XCircle className="w-3.5 h-3.5" /> },
};

const USO_CFDI = { G01: "Adquisición de mercancias", G03: "Gastos en general", I04: "Equipo de computo" };

const PAGE_SIZE = 6;

const AdminCFDI = () => {
  const [facturas, setFacturas] = useState(CFDI_MOCK);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [timbrandoId, setTimbrandoId] = useState(null);

  const filtrados = useMemo(() => facturas.filter((f) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || f.cliente.toLowerCase().includes(q) || f.rfc.toLowerCase().includes(q) || f.folio.toLowerCase().includes(q);
    const matchE = estadoFiltro === "todos" || f.estado === estadoFiltro;
    return matchQ && matchE;
  }), [facturas, busqueda, estadoFiltro]);

  const totalPags = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const totales = {
    timbrado:  facturas.filter((f) => f.estado === "timbrado").reduce((s, f) => s + f.total, 0),
    pendiente: facturas.filter((f) => f.estado === "pendiente").length,
    cancelado: facturas.filter((f) => f.estado === "cancelado").length,
  };

  const timbrar = async (id) => {
    setTimbrandoId(id);
    await new Promise((r) => setTimeout(r, 1500));
    setFacturas((p) => p.map((f) => f.id === id
      ? { ...f, estado: "timbrado", uuid: `UUID-MOCK-${Date.now()}` }
      : f
    ));
    setTimbrandoId(null);
  };

  const descargarCSV = () => {
    const cols = ["Folio", "Cliente", "RFC", "Concepto", "Subtotal", "IVA", "Total", "Estado", "UUID", "Fecha"];
    const rows = facturas.map((f) =>
      [f.folio, f.cliente, f.rfc, f.concepto, f.monto, f.iva, f.total, f.estado, f.uuid || "—", f.fecha].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_CFDI_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        <PageHeader icon={FileText} title="CFDI / Facturación"
          subtitle="Gestión de facturas CFDI 4.0 · PAC: Facturama">
          <button onClick={descargarCSV}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </PageHeader>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#B7E4C7] p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Ingresos timbrados</p>
            <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mt-1">${totales.timbrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-2xl border border-yellow-200 p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Facturas pendientes</p>
            <p className="font-['Outfit'] text-2xl font-bold text-yellow-600 mt-1">{totales.pendiente}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#B7E4C7] p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Canceladas</p>
            <p className="font-['Outfit'] text-2xl font-bold text-red-500 mt-1">{totales.cancelado}</p>
          </div>
        </div>

        {/* Aviso PAC */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700">
            <strong>Integración con PAC:</strong> Para timbrado real, configurar CSD (.cer + .key) de PropValu México en{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">api.facturama.mx</code>. Sandbox gratuito disponible.
            Costo producción: ~$1.50 MXN por CFDI timbrado.
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por cliente, RFC o folio..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          <div className="relative">
            <select value={estadoFiltro} onChange={(e) => { setEstadoFiltro(e.target.value); setPagina(1); }}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todos">Todos los estados</option>
              <option value="timbrado">Timbrado</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                  {["Folio","Cliente / RFC","Concepto","Subtotal","IVA","Total","Estado","Fecha",""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginados.map((f) => {
                  const estCfg = ESTADO_CFG[f.estado];
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.folio}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#1B4332] leading-snug">{f.cliente}</p>
                        <p className="text-xs text-slate-400 font-mono">{f.rfc}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{f.concepto}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">${f.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">${f.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#1B4332]">${f.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${estCfg.cls}`}>
                          {estCfg.icon}{estCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{f.fecha}</td>
                      <td className="px-4 py-3">
                        {f.estado === "pendiente" ? (
                          <button onClick={() => timbrar(f.id)} disabled={timbrandoId === f.id}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#1B4332] hover:bg-[#163828] disabled:opacity-50 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap">
                            {timbrandoId === f.id
                              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Timbrando...</>
                              : <><Send className="w-3 h-3" /> Timbrar</>}
                          </button>
                        ) : f.estado === "timbrado" ? (
                          <button onClick={() => setModal(f)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors">
                            <FileText className="w-3 h-3" /> Ver
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPags > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}</span>
              <div className="flex gap-1">
                {Array.from({ length: totalPags }, (_, i) => (
                  <button key={i} onClick={() => setPagina(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${pagina === i + 1 ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle CFDI */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-bold text-[#1B4332]">CFDI {modal.folio}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <div className="space-y-2">
              {[
                ["UUID", modal.uuid], ["Cliente", modal.cliente], ["RFC", modal.rfc],
                ["Concepto", modal.concepto], ["Subtotal", `$${modal.monto}`],
                ["IVA 16%", `$${modal.iva}`], ["Total", `$${modal.total}`],
                ["Uso CFDI", `${modal.uso_cfdi} — ${USO_CFDI[modal.uso_cfdi]}`],
                ["Fecha timbrado", modal.fecha],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                  <span className="text-slate-400 font-semibold">{k}</span>
                  <span className="text-[#1B4332] font-mono text-xs text-right max-w-[180px] truncate">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { alert("[Mock] Descargando XML del CFDI..."); }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1B4332] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#163828] transition-colors">
                <Download className="w-4 h-4" /> Descargar XML
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCFDI;
