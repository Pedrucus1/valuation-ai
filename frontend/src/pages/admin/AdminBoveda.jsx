import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState } from "@/components/AdminUI";
import { adminFetch } from "@/lib/adminFetch";
import { Archive, ChevronDown } from "lucide-react";

const ESTADO_COLORS = {
  pagado: "bg-emerald-100 text-emerald-700",
  pendiente_pago: "bg-amber-100 text-amber-700",
};

const _labelPlan = (meses) => {
  if (meses < 12) return `${meses} meses`;
  const anios = meses / 12;
  return anios === 1 ? "1 año" : `${anios} años`;
};

const AdminBoveda = () => {
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [datos, setDatos] = useState({ items: [], totales: {} });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const qs = estadoFiltro !== "todos" ? `?estado=${estadoFiltro}` : "";
    adminFetch(`/api/admin/vault-requests${qs}`)
      .then((d) => setDatos(d))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [estadoFiltro]);

  const items = datos.items || [];
  const totales = datos.totales || {};

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <PageHeader icon={Archive} title="Bóveda de Respaldo" subtitle="Solicitudes de respaldo de avalúo público (#185)" />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Respaldos activos", val: totales.pagados ?? "—" },
            { label: "Ingresos acumulados", val: cargando ? "—" : `$${(totales.ingresos || 0).toLocaleString()} MXN` },
            { label: "Solicitudes totales", val: totales.total ?? "—" },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className="h-1 bg-[#52B788]" />
              <div className="p-4">
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{cargando ? "…" : val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <AdminCard icon={Archive} title={`Solicitudes (${items.length})`}
          action={
            <div className="relative">
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
                className="appearance-none bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1 text-xs focus:outline-none pr-6">
                <option value="todos" className="text-slate-700">Todos</option>
                <option value="pagado" className="text-slate-700">Pagado</option>
                <option value="pendiente_pago" className="text-slate-700">Pendiente de pago</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 text-white/70 pointer-events-none" />
            </div>
          }>
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <EmptyState icon={Archive} title={cargando ? "Cargando…" : "Sin solicitudes de bóveda"} />
            ) : (
              <table className="w-full">
                <GradThead cols={["Fecha", "Nombre", "Correo", "Plan", "Monto", "Estado", "Expira", "Avalúo"]} />
                <tbody className="divide-y divide-slate-50">
                  {items.map((r) => (
                    <tr key={r.vault_request_id} className="hover:bg-[#F0FAF5]/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.fecha_solicitud?.split("T")[0]}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1B4332]">{r.nombre || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.email}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.tipo === "descarga_suelta" ? "Descarga suelta" : _labelPlan(r.plan_meses)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[#1B4332]">${(r.monto || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[r.estado] || "bg-slate-100 text-slate-500"}`}>
                          {r.estado === "pagado" ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.expira_en?.split("T")[0] || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.valuation_id}</td>
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

export default AdminBoveda;
