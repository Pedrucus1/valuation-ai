import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard } from "@/components/AdminUI";
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
      <PageHeader title="Newsletter" subtitle="Gestión de suscriptores al boletín de inteligencia de mercado" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Users className="w-5 h-5" />, label: "Total suscriptores", value: data.total, color: "text-[#1B4332]" },
          { icon: <UserCheck className="w-5 h-5" />, label: "Activos", value: data.activos, color: "text-emerald-600" },
          { icon: <UserX className="w-5 h-5" />, label: "Dados de baja", value: inactivos, color: "text-slate-400" },
        ].map(k => (
          <AdminCard key={k.label}>
            <div className="flex items-center gap-3">
              <div className={`${k.color}`}>{k.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800 font-['Outfit']">{k.value}</p>
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar email o nombre…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"
          />
        </div>
        <select
          value={filtroActivo}
          onChange={e => setFiltroActivo(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Dados de baja</option>
        </select>
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
        >
          <option value="">Todos los roles</option>
          <option value="public">Público</option>
          <option value="appraiser">Valuador</option>
          <option value="realtor">Inmobiliaria</option>
        </select>
        <button onClick={fetchData} className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Tabla */}
      <AdminCard>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-10">
            <Mail className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay suscriptores con estos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Rol</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Suscripción</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map(s => (
                  <tr key={s.subscriber_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{s.email}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.nombre || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                        {ROL_LABELS[s.rol] || s.rol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">
                      {s.fecha_suscripcion ? new Date(s.fecha_suscripcion).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {s.activo
                        ? <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Activo</span>
                        : <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">Dado de baja</span>
                      }
                    </td>
                    <td className="py-2.5 px-3 text-right">
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
            <p className="text-xs text-slate-400 mt-3 px-3">{visible.length} suscriptor{visible.length !== 1 ? "es" : ""} mostrado{visible.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </AdminCard>
    </AdminLayout>
  );
}
