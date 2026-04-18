import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard } from "@/components/AdminUI";
import { DollarSign, Plus, CheckCircle2, Clock, RefreshCw, X } from "lucide-react";
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
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-[#1B4332] font-['Outfit']">Registrar encargo</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valuador</label>
            <select
              value={form.valuador_id}
              onChange={e => setForm(f => ({ ...f, valuador_id: e.target.value }))}
              required
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"
            >
              <option value="">Seleccionar valuador…</option>
              {valuadores.map(v => (
                <option key={v.user_id} value={v.user_id}>{v.name} ({v.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Descripción del encargo</label>
            <input
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              required
              placeholder="Ej: Valuación casa en Zapopan"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Precio total cobrado (MXN)</label>
            <input
              type="number"
              value={form.precio_total}
              onChange={e => setForm(f => ({ ...f, precio_total: e.target.value }))}
              required
              min="1"
              placeholder="2000"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"
            />
            {precio > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Valuador recibe: <strong className="text-[#1B4332]">{fmtMXN(precio * 0.8)}</strong> · PropValu: <strong>{fmtMXN(precio * 0.2)}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Notas internas (opcional)</label>
            <textarea
              value={form.notas_admin}
              onChange={e => setForm(f => ({ ...f, notas_admin: e.target.value }))}
              rows={2}
              placeholder="Referencia, número de expediente, etc."
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? "Registrando…" : "Registrar encargo"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPayouts() {
  const [data, setData] = useState({ total: 0, pendiente: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [valuadores, setValuadores] = useState([]);
  const [filtroPagado, setFiltroPagado] = useState("");
  const [filtroValuador, setFiltroValuador] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [pagando, setPagando] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filtroPagado) params.set("pagado", filtroPagado);
      if (filtroValuador) params.set("valuador_id", filtroValuador);
      const res = await adminFetch(`/api/admin/encargos?${params}`);
      setData(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filtroPagado, filtroValuador]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    adminFetch("/api/admin/usuarios?skip=0&limit=200&role=appraiser")
      .then(d => setValuadores(d.items || d.users || []))
      .catch(() => {});
  }, []);

  const marcarPagado = async (id) => {
    setPagando(id);
    try {
      await adminFetch(`/api/admin/encargos/${id}/pagar`, { method: "PUT" });
      fetchData();
    } finally { setPagando(null); }
  };

  const pendienteCount = data.items.filter(e => !e.pago_realizado).length;
  const liquidadoMes = data.items
    .filter(e => e.pago_realizado)
    .reduce((s, e) => s + (e.comision_valuador || 0), 0);

  return (
    <AdminLayout>
      <PageHeader title="Payouts Valuadores" subtitle="Gestión de encargos y liquidación de comisiones (80/20)" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Clock className="w-5 h-5" />, label: "Pendientes de pago", value: pendienteCount, sub: fmtMXN(data.pendiente), color: "text-amber-600" },
          { icon: <CheckCircle2 className="w-5 h-5" />, label: "Liquidado (filtro)", value: data.items.filter(e => e.pago_realizado).length, sub: fmtMXN(liquidadoMes), color: "text-emerald-600" },
          { icon: <DollarSign className="w-5 h-5" />, label: "Total encargos", value: data.total, sub: "", color: "text-[#1B4332]" },
        ].map(k => (
          <AdminCard key={k.label}>
            <div className="flex items-center gap-3">
              <div className={k.color}>{k.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800 font-['Outfit']">{k.value}</p>
                <p className="text-xs text-slate-400">{k.label}</p>
                {k.sub && <p className={`text-sm font-semibold ${k.color} mt-0.5`}>{k.sub}</p>}
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Acciones y filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Registrar encargo
        </button>
        <select
          value={filtroPagado}
          onChange={e => setFiltroPagado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="false">Pendientes</option>
          <option value="true">Pagados</option>
        </select>
        <select
          value={filtroValuador}
          onChange={e => setFiltroValuador(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
        >
          <option value="">Todos los valuadores</option>
          {valuadores.map(v => (
            <option key={v.user_id} value={v.user_id}>{v.name}</option>
          ))}
        </select>
        <button onClick={fetchData} className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Tabla */}
      <AdminCard>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
        ) : data.items.length === 0 ? (
          <div className="text-center py-10">
            <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay encargos con estos filtros.</p>
            <button onClick={() => setModalNuevo(true)} className="mt-3 text-[#52B788] text-sm hover:underline">+ Registrar primer encargo</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Valuador</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Descripción</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Total</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Comisión (80%)</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Fecha</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map(e => (
                  <tr key={e.encargo_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{e.valuador_nombre || e.valuador_id}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">{e.descripcion}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{fmtMXN(e.precio_total)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#1B4332]">{fmtMXN(e.comision_valuador)}</td>
                    <td className="py-2.5 px-3 text-center text-xs text-slate-500">
                      {e.fecha_completado ? new Date(e.fecha_completado).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {e.pago_realizado
                        ? <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Pagado</span>
                        : <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">Pendiente</span>
                      }
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!e.pago_realizado && (
                        <button
                          onClick={() => marcarPagado(e.encargo_id)}
                          disabled={pagando === e.encargo_id}
                          className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg px-3 py-1 disabled:opacity-60"
                        >
                          {pagando === e.encargo_id ? "…" : "Marcar pagado"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {modalNuevo && (
        <ModalNuevoEncargo
          valuadores={valuadores}
          onClose={() => setModalNuevo(false)}
          onCreado={() => { setModalNuevo(false); fetchData(); }}
        />
      )}
    </AdminLayout>
  );
}
