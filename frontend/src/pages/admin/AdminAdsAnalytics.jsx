import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { TrendingUp, TrendingDown, Eye, MousePointer, ChevronDown, Download, BarChart2 } from "lucide-react";

const SLOTS = [
  { id: "comparables_banner", label: "Banner Comparables (60s)", descripcion: "Aparece en la página de comparables durante 60 segundos" },
  { id: "reporte_lateral",    label: "Banner Lateral Reporte",   descripcion: "Sidebar en la página del reporte generado" },
  { id: "descarga_overlay",   label: "Overlay Descarga PDF",      descripcion: "Aparece 10s antes de habilitar la descarga del PDF" },
];

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const ESTADO_CFG = {
  activo:  "bg-green-100 text-green-700",
  pausado: "bg-yellow-100 text-yellow-700",
  vencido: "bg-slate-100 text-slate-500",
};

const MiniBarChart = ({ datos, color }) => {
  const max = Math.max(...datos);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {datos.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div className="rounded-sm transition-all" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
};

const AdminAdsAnalytics = () => {
  const [anunciosStats, setAnunciosStats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [slotFiltro, setSlotFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  useEffect(() => {
    adminFetch("/api/admin/ads/analytics")
      .then((d) => setAnunciosStats(d.anuncios || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => anunciosStats.filter((a) => {
    const matchS = slotFiltro === "todos" || a.slot === slotFiltro;
    const matchE = estadoFiltro === "todos" || a.estado === estadoFiltro;
    return matchS && matchE;
  }), [anunciosStats, slotFiltro, estadoFiltro]);

  const totales = {
    impresiones: anunciosStats.reduce((s, a) => s + a.impresiones, 0),
    clicks:      anunciosStats.reduce((s, a) => s + a.clicks, 0),
    ctr_avg:     anunciosStats.length > 0
      ? (anunciosStats.reduce((s, a) => s + a.ctr, 0) / anunciosStats.length).toFixed(1)
      : "0.0",
    activos:     anunciosStats.filter((a) => a.estado === "aprobado").length,
  };

  const descargarCSV = () => {
    const cols = ["ID", "Anunciante", "Slot", "Impresiones", "Clicks", "CTR%", "Estado", "Inicio", "Fin"];
    const rows = anunciosStats.map((a) =>
      [a.id, a.anunciante, a.slot, a.impresiones, a.clicks, a.ctr, a.estado, a.inicio, a.fin].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_Ads_Analytics_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Analytics de Publicidad</h1>
            <p className="text-slate-400 text-sm mt-0.5">Rendimiento de anuncios por slot y anunciante</p>
          </div>
          <button onClick={descargarCSV}
            className="flex items-center gap-2 border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>

        {/* KPIs globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Impresiones totales", val: cargando ? "…" : totales.impresiones.toLocaleString(), icon: Eye,           color: "bg-blue-100 text-blue-600" },
            { label: "Clicks totales",       val: cargando ? "…" : totales.clicks.toLocaleString(),      icon: MousePointer,  color: "bg-purple-100 text-purple-600" },
            { label: "CTR promedio",          val: cargando ? "…" : `${totales.ctr_avg}%`,               icon: TrendingUp,    color: parseFloat(totales.ctr_avg) >= 3 ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600" },
            { label: "Campañas aprobadas",    val: cargando ? "…" : totales.activos,                     icon: BarChart2,     color: "bg-[#D9ED92] text-[#1B4332]" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Resumen por slot */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-[#1B4332] text-sm mb-4">Rendimiento por slot</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {SLOTS.map((slot) => {
              const ads = anunciosStats.filter((a) => a.slot === slot.id && a.estado === "aprobado");
              const totalImp = ads.reduce((s, a) => s + a.impresiones, 0);
              const totalClk = ads.reduce((s, a) => s + a.clicks, 0);
              const ctr = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(1) : "0.0";
              return (
                <div key={slot.id} className="border border-slate-100 rounded-xl p-4">
                  <p className="font-semibold text-[#1B4332] text-xs">{slot.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">{slot.descripcion}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-bold text-sm text-[#1B4332]">{totalImp.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">Impr.</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1B4332]">{totalClk}</p>
                      <p className="text-[10px] text-slate-400">Clicks</p>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${parseFloat(ctr) >= 3 ? "text-green-600" : "text-yellow-600"}`}>{ctr}%</p>
                      <p className="text-[10px] text-slate-400">CTR</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          {[
            { val: slotFiltro, set: setSlotFiltro, opts: [["todos","Todos los slots"], ...SLOTS.map((s) => [s.id, s.label])] },
            { val: estadoFiltro, set: setEstadoFiltro, opts: [["todos","Todos los estados"],["activo","Activo"],["pausado","Pausado"],["vencido","Vencido"]] },
          ].map(({ val, set, opts }, i) => (
            <div key={i} className="relative">
              <select value={val} onChange={(e) => set(e.target.value)}
                className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Tarjetas por anuncio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map((a) => {
            const slot = SLOTS.find((s) => s.id === a.slot);
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-[#1B4332] text-sm">{a.anunciante}</p>
                    <p className="text-xs text-slate-400">{slot?.label}</p>
                    <p className="text-[11px] text-slate-300">{a.inicio} → {a.fin}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ESTADO_CFG[a.estado]}`}>
                    {a.estado}
                  </span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="font-bold text-lg text-[#1B4332]">{a.impresiones.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">Impresiones</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-[#1B4332]">{a.clicks}</p>
                    <p className="text-[11px] text-slate-400">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-lg ${a.ctr >= 4 ? "text-green-600" : a.ctr >= 2 ? "text-yellow-600" : "text-red-500"}`}>
                      {a.ctr}%
                    </p>
                    <p className="text-[11px] text-slate-400">CTR</p>
                  </div>
                </div>

                {/* Mini gráfica */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Impresiones / día</span>
                      <span className="flex items-center gap-0.5">
                        {a.impresiones_semana[6] >= a.impresiones_semana[5]
                          ? <TrendingUp className="w-3 h-3 text-green-500" />
                          : <TrendingDown className="w-3 h-3 text-red-400" />}
                        ayer: {a.impresiones_semana[6]}
                      </span>
                    </div>
                    <MiniBarChart datos={a.impresiones_semana} color="#52B788" />
                    <div className="flex justify-between mt-0.5">
                      {DIAS.map((d) => <span key={d} className="flex-1 text-center text-[9px] text-slate-300">{d}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Clicks / día</span>
                      <span>ayer: {a.clicks_semana[6]}</span>
                    </div>
                    <MiniBarChart datos={a.clicks_semana} color="#1B4332" />
                  </div>
                </div>

                {/* Budget */}
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span>Presupuesto: <strong className="text-slate-600">${a.presupuesto.toLocaleString()}</strong></span>
                  <span>CPC: <strong className="text-slate-600">${(a.presupuesto / a.clicks).toFixed(2)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{cargando ? "Cargando analytics…" : "No hay anuncios con esos filtros"}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAdsAnalytics;
