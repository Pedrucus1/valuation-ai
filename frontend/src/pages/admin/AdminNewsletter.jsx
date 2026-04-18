import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState, FilterBar, PrimaryBtn } from "@/components/AdminUI";
import { Mail, Users, UserCheck, UserX, RefreshCw, Search } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

const ROL_LABELS = { public: "Público", appraiser: "Valuador", realtor: "Inmobiliaria" };

export default function AdminNewsletter() {
  const [data, setData] = useState({ total: 0, activos: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [filtroRol, setFiltroRol] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filtroActivo) params.set("activo", filtroActivo);
      if (filtroRol) params.set("rol", filtroRol);
      const res = await adminFetch(`/api/admin/newsletter/subscribers?${params}`);
      setData(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filtroActivo, filtroRol]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const darDeBaja = async (id) => {
    await adminFetch(`/api/admin/newsletter/subscribers/${id}`, { method: "DELETE" });
    fetchData();
  };

  const visible = data.items.filter(s =>
    !search || s.email.toLowerCase().includes(search.toLowerCase()) || (s.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  const inactivos = data.total - data.activos;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <PageHeader icon={Mail} title="Newsletter" subtitle="Suscriptores al boletín de inteligencia de mercado" />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users,     label: "Total suscriptores", value: data.total,   iconBg: "bg-[#F0FAF5]", iconColor: "text-[#1B4332]" },
            { icon: UserCheck, label: "Activos",             value: data.activos, iconBg: "bg-green-50",  iconColor: "text-emerald-600" },
            { icon: UserX,     label: "Dados de baja",       value: inactivos,    iconBg: "bg-slate-50",  iconColor: "text-slate-400" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className="h-1 bg-[#52B788]" />
              <div className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.iconBg}`}>
                  <k.icon className={`w-4 h-4 ${k.iconColor}`} />
                </div>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{loading ? "…" : k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <FilterBar title="Filtros y búsqueda">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar email o nombre…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <select
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Dados de baja</option>
          </select>
          <select
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todos los roles</option>
            <option value="public">Público</option>
            <option value="appraiser">Valuador</option>
            <option value="realtor">Inmobiliaria</option>
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </FilterBar>

        {/* Tabla */}
        <AdminCard icon={Mail} title={`Suscriptores${visible.length !== data.total ? ` — ${visible.length} mostrados` : ` — ${data.total} total`}`}>
          <div className="p-0">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
            ) : visible.length === 0 ? (
              <EmptyState icon={Mail} title="Sin suscriptores con estos filtros" sub="Prueba con otros criterios de búsqueda" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <GradThead cols={["Email", "Nombre", "Rol", "Suscripción", "Estado", ""]} />
                  <tbody>
                    {visible.map(s => (
                      <tr key={s.subscriber_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{s.email}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.nombre || <span className="text-slate-300 italic">—</span>}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                            {ROL_LABELS[s.rol] || s.rol}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">
                          {s.fecha_suscripcion ? new Date(s.fecha_suscripcion).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          {s.activo
                            ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Activo</span>
                            : <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">Dado de baja</span>
                          }
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {s.activo && (
                            <button
                              onClick={() => darDeBaja(s.subscriber_id)}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              Dar de baja
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>

      </div>
    </AdminLayout>
  );
}
