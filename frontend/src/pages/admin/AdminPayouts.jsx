import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState, FilterBar, PrimaryBtn } from "@/components/AdminUI";
import { DollarSign, Plus, CheckCircle2, Clock, RefreshCw, X, Layers } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

const fmtMXN = v => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v || 0);

function ModalNuevoEncargo({ valuadores, onClose, onCreado }) {
  const [form, setForm] = useState({ valuador_id: "", descripcion: "", precio_total: "", notas_admin: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.valuador_id || !form.descripcion || !form.precio_total) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/encargos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, precio_total: parseFloat(form.precio_total) }),
      });
      onCreado();
    } finally { setSaving(false); }
  };

  const precio = parseFloat(form.precio_total) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-t-2xl px-5 py-4 flex items-center justify-between">
          <h2 className="font-['Outfit'] text-lg font-bold text-white">Registrar encargo</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-white/70 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valuador</label>
            <select
              value={form.valuador_id}
              onChange={e => setForm(f => ({ ...f, valuador_id: e.target.value }))}
              required
              className="mt-1 w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            >
              <option value="">Seleccionar valuador…</option>
              {valuadores.map(v => (
                <option key={v.user_id} value={v.user_id}>{v.name} ({v.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Descripción</label>
            <input
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              required
              placeholder="Ej: Valuación casa en Zapopan"
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cobro total (MXN)</label>
            <input
              type="number"
              value={form.precio_total}
              onChange={e => setForm(f => ({ ...f, precio_total: e.target.value }))}
              required min="1" placeholder="2000"
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <PrimaryBtn type="submit" disabled={saving} className="w-full justify-center py-2.5">
            {saving ? "Registrando…" : "Registrar encargo"}
          </PrimaryBtn>
        </form>
      </div>
    </div>
  );
}

export default function AdminPayouts() {
  const [data, setData] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [valuadores, setValuadores] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [pagando, setPagando] = useState(null);

  useEffect(() => {
    adminFetch("/api/admin/usuarios?skip=0&limit=200&role=appraiser")
      .then(d => setValuadores(d.items || d.users || []))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await adminFetch(`/api/admin/payouts?${params}`);
      setData(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filtroEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const marcarPagado = async (id) => {
    if (!window.confirm("¿Confirmas que ya realizaste el pago a este valuador?")) return;
    setPagando(id);
    try {
      await adminFetch(`/api/admin/payouts/${id}/pagar`, { method: "PUT" });
      fetchData();
    } finally { setPagando(null); }
  };

  const generarPayouts = async () => {
    if (!window.confirm("¿Agrupar todos los encargos completados pendientes de pago en nuevos lotes mensuales?")) return;
    setGenerando(true);
    try {
      const res = await adminFetch("/api/admin/payouts/generar", { method: "POST" });
      alert(`Se generaron ${res.payouts_creados} lotes de pago.`);
      fetchData();
    } finally { setGenerando(false); }
  };

  const pendienteCount = data.items.filter(e => e.estado === "pendiente_revision").length;
  const liquidado = data.items.filter(e => e.estado === "pagado").reduce((s, e) => s + (e.monto_total || 0), 0);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <PageHeader icon={DollarSign} title="Payouts (Lotes Mensuales)"
          subtitle="Agrupación y pago mensual de comisiones a Valuadores">
          <div className="flex gap-2">
            <PrimaryBtn icon={Plus} onClick={() => setModalNuevo(true)} className="bg-slate-700 hover:bg-slate-800">
              Registrar Encargo
            </PrimaryBtn>
            <PrimaryBtn icon={Layers} onClick={generarPayouts} disabled={generando}>
              {generando ? "Generando..." : "Generar Payouts"}
            </PrimaryBtn>
          </div>
        </PageHeader>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Clock,        label: "Lotes Pendientes", value: pendienteCount,                             sub: "", iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
            { icon: CheckCircle2, label: "Lotes Pagados",   value: data.items.filter(e => e.estado === "pagado").length, sub: fmtMXN(liquidado),      iconBg: "bg-green-50", iconColor: "text-emerald-600" },
            { icon: DollarSign,   label: "Total Lotes",     value: data.total,                                 sub: "",                     iconBg: "bg-[#F0FAF5]", iconColor: "text-[#1B4332]" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className="h-1 bg-[#52B788]" />
              <div className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.iconBg}`}>
                  <k.icon className={`w-4 h-4 ${k.iconColor}`} />
                </div>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{loading ? "…" : k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
                {k.sub && <p className={`text-sm font-semibold mt-0.5 ${k.iconColor}`}>{k.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <FilterBar title="Filtros">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente_revision">Pendientes</option>
            <option value="pagado">Pagados</option>
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </FilterBar>

        {/* Tabla */}
        <AdminCard icon={DollarSign} title="Lotes de Pago">
          <div className="p-0">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
            ) : data.items.length === 0 ? (
              <EmptyState icon={DollarSign} title="No hay payouts"
                sub="Haz clic en Generar Payouts para agrupar encargos pendientes" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <GradThead cols={["Valuador", "Mes", "Encargos", { label: "A Pagar (MXN)", className: "text-right" }, "Creación", "Estado", ""]} />
                  <tbody>
                    {data.items.map(e => (
                      <tr key={e.payout_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-slate-800">{e.valuador_nombre}</div>
                          <div className="text-xs text-slate-400">{e.valuador_email}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{e.mes}</td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{e.cantidad_encargos}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-[#1B4332]">{fmtMXN(e.monto_total)}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          {new Date(e.fecha_creacion).toLocaleDateString("es-MX")}
                        </td>
                        <td className="py-2.5 px-4">
                          {e.estado === "pagado"
                            ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Pagado</span>
                            : <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Pendiente</span>
                          }
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {e.estado !== "pagado" && (
                            <button
                              onClick={() => marcarPagado(e.payout_id)}
                              disabled={pagando === e.payout_id}
                              className="text-xs bg-[#1B4332] hover:bg-[#163828] text-white rounded-lg px-3 py-1 disabled:opacity-60 font-semibold"
                            >
                              {pagando === e.payout_id ? "…" : "Marcar pagado"}
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

      {modalNuevo && (
        <ModalNuevoEncargo
          valuadores={valuadores}
          onClose={() => setModalNuevo(false)}
          onCreado={() => { setModalNuevo(false); alert("Encargo registrado (aparecerá al Generar Payouts)"); }}
        />
      )}
    </AdminLayout>
  );
}
