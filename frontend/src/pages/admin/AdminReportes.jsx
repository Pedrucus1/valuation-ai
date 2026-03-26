import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { Download, TrendingUp, FileText, Users, ChevronDown } from "lucide-react";

const TIPO_COLORS = {
  public:       "bg-slate-100 text-slate-500",
  valuador:     "bg-blue-100 text-blue-700",
  inmobiliaria: "bg-purple-100 text-purple-700",
  anunciante:   "bg-orange-100 text-orange-700",
};

const AdminReportes = () => {
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [datos, setDatos] = useState({ resumen_meses: [], transacciones: [], totales: {} });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/reportes")
      .then((d) => setDatos(d))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtradas = useMemo(() =>
    datos.transacciones.filter((t) => tipoFiltro === "todos" || t.tipo === tipoFiltro),
    [datos.transacciones, tipoFiltro]
  );

  const totalFiltrado = filtradas.reduce((s, t) => s + (t.monto || 0), 0);

  const descargarCSV = () => {
    const cols = ["ID","Fecha","Cliente","Tipo","Concepto","Monto","Método de pago"];
    const rows = filtradas.map((t) =>
      [t.payment_id || t.id, t.created_at?.split("T")[0] || t.fecha, t.cliente, t.tipo, t.concepto, t.monto, t.metodo].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_Ingresos_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const meses = datos.resumen_meses;
  const maxVal = Math.max(...meses.map((m) => m.valuaciones), 1);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Reportes de Ingresos</h1>
            <p className="text-slate-400 text-sm mt-0.5">Resumen financiero exportable</p>
          </div>
          <button onClick={descargarCSV}
            className="flex items-center gap-2 border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Valuaciones completadas", val: datos.totales.valuaciones_completadas ?? "—", icon: FileText, color: "bg-[#D9ED92] text-[#1B4332]" },
            { label: "Usuarios registrados",    val: datos.totales.usuarios ?? "—",                icon: Users,    color: "bg-blue-100 text-blue-600" },
            { label: "Valuadores verificados",  val: datos.totales.valuadores_activos ?? "—",      icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-['Outfit'] text-xl font-bold text-[#1B4332]">{cargando ? "…" : val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Gráfica de barras por mes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-[#1B4332] text-sm mb-5">Valuaciones completadas por mes</h2>
          {meses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{cargando ? "Cargando…" : "Sin datos disponibles"}</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {meses.map((m) => {
                const h = (m.valuaciones / maxVal) * 100;
                return (
                  <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[10px] text-slate-500 font-semibold">{m.valuaciones}</p>
                    <div className="w-full bg-[#52B788] rounded-t-lg" style={{ height: `${Math.max(h, 2)}%`, minHeight: 4 }} />
                    <p className="text-[9px] text-slate-400 text-center leading-tight whitespace-nowrap">{m.mes}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabla transacciones */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#1B4332] text-sm">
              Transacciones recientes — <span className="text-[#52B788]">${totalFiltrado.toLocaleString()} MXN</span>
            </h2>
            <div className="flex gap-3">
              <div className="relative">
                <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 bg-white focus:outline-none pr-7">
                  <option value="todos">Todos</option>
                  <option value="public">Público</option>
                  <option value="valuador">Valuador</option>
                  <option value="inmobiliaria">Inmobiliaria</option>
                  <option value="anunciante">Anunciante</option>
                </select>
                <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {filtradas.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {cargando ? "Cargando…" : "Sin transacciones registradas — se mostrarán cuando se integre la pasarela de pagos"}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-slate-100">
                    {["Fecha","Cliente","Tipo","Concepto","Monto","Método"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtradas.map((t, i) => (
                    <tr key={t.payment_id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.created_at?.split("T")[0] || t.fecha}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1B4332]">{t.cliente}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[t.tipo] || "bg-slate-100 text-slate-500"}`}>{t.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{t.concepto}</td>
                      <td className="px-4 py-3 text-sm font-bold text-[#1B4332]">${(t.monto || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{t.metodo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminReportes;
