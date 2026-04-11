import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead } from "@/components/AdminUI";
import { adminFetch } from "@/lib/adminFetch";
import { Download, TrendingUp, FileText, Users, ChevronDown, BarChart2 } from "lucide-react";

const TIPO_COLORS = {
  público:      "bg-slate-100 text-slate-500",
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
    const cols = ["ID","Fecha","Cliente","Tipo","Concepto","Monto","Método"];
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

        <PageHeader icon={BarChart2} title="Reportes de Ingresos"
          subtitle="Resumen financiero exportable">
          <button onClick={descargarCSV}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors border border-white/30">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </PageHeader>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Valuaciones completadas", val: datos.totales.valuaciones_completadas ?? "—", icon: FileText,    stripe: "bg-[#52B788]",   iconBg: "bg-[#F0FAF5]",   iconColor: "text-[#1B4332]" },
            { label: "Usuarios registrados",    val: datos.totales.usuarios ?? "—",                icon: Users,       stripe: "bg-blue-400",    iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
            { label: "Valuadores verificados",  val: datos.totales.valuadores_activos ?? "—",      icon: TrendingUp,  stripe: "bg-purple-400",  iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
          ].map(({ label, val, icon: Icon, stripe, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className={`h-1 ${stripe}`} />
              <div className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${iconBg}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{cargando ? "…" : val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfica */}
        <AdminCard icon={BarChart2} title="Valuaciones completadas por mes">
          <div className="p-6">
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
        </AdminCard>

        {/* Tabla transacciones */}
        <AdminCard icon={FileText}
          title={`Transacciones recientes — $${totalFiltrado.toLocaleString()} MXN`}
          action={
            <div className="relative">
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
                className="appearance-none bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1 text-xs focus:outline-none pr-6">
                <option value="todos" className="text-slate-700">Todos</option>
                {["público","valuador","inmobiliaria","anunciante"].map(t => (
                  <option key={t} value={t} className="text-slate-700">{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-white/70 pointer-events-none" />
            </div>
          }>
          <div className="overflow-x-auto">
            {filtradas.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {cargando ? "Cargando…" : "Sin transacciones registradas — se mostrarán cuando se integre la pasarela de pagos"}
              </div>
            ) : (
              <table className="w-full">
                <GradThead cols={["Fecha","Cliente","Tipo","Concepto","Monto","Método"]} />
                <tbody className="divide-y divide-slate-50">
                  {filtradas.map((t, i) => (
                    <tr key={t.payment_id || i} className="hover:bg-[#F0FAF5]/50 transition-colors">
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
        </AdminCard>

      </div>
    </AdminLayout>
  );
};

export default AdminReportes;
