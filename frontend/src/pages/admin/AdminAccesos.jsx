import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState, FilterBar, PrimaryBtn } from "@/components/AdminUI";
import { KeyRound, Users, UserCheck, Infinity as InfinityIcon, RefreshCw, Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

const CATEGORIAS = [
  { id: "interno",      label: "Interno" },
  { id: "valuador",     label: "Valuador" },
  { id: "inmobiliaria", label: "Inmobiliaria" },
];
const MODALIDADES = [
  { id: "solo_valuacion", label: "Solo valuación",         hint: "Sin add-ons" },
  { id: "con_valuador",   label: "Con servicio de valuador", hint: "Incluye Revisión por Perito ($350)" },
  { id: "con_visita",     label: "Con visita incluida",     hint: "Incluye Verificación de m² ($600)" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.label]));
const MOD_LABEL = Object.fromEntries(MODALIDADES.map(m => [m.id, m.label]));

const ESTADO_BADGE = {
  activo:   "bg-green-100 text-green-700",
  agotado:  "bg-amber-100 text-amber-700",
  expirado: "bg-red-100 text-red-600",
  inactivo: "bg-slate-100 text-slate-400",
};
const ESTADO_LABEL = { activo: "Activo", agotado: "Agotado", expirado: "Expirado", inactivo: "Inactivo" };

const EMPTY_FORM = {
  email: "", categoria: "interno", acceso_total: false,
  avaluos_gratis: 1, modalidad: "solo_valuacion", fecha_expiracion: "", nota: "", activo: true,
};

// Grupo de botones de selección (toggle) reutilizable
function BtnGroup({ value, options, onChange, cols = 3 }) {
  return (
    <div className={`grid gap-2 ${cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`text-left px-3 py-2 rounded-xl border text-sm transition ${
            value === o.id
              ? "border-[#52B788] bg-[#F0FAF5] ring-2 ring-[#52B788]/30"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span className="font-medium text-slate-800">{o.label}</span>
          {o.hint && <span className="block text-[11px] text-slate-400 mt-0.5">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export default function AdminAccesos() {
  const [data, setData] = useState({ total: 0, activos: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCat, setFiltroCat] = useState("");
  const [modal, setModal] = useState(null); // null | {modo:"crear"|"editar", form, access_id}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCat) params.set("categoria", filtroCat);
      const res = await adminFetch(`/api/admin/accesos?${params}`);
      setData(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filtroCat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const abrirCrear = () => { setError(""); setModal({ modo: "crear", form: { ...EMPTY_FORM } }); };
  const abrirEditar = (a) => {
    setError("");
    setModal({
      modo: "editar",
      access_id: a.access_id,
      form: {
        email: a.email,
        categoria: a.categoria || "interno",
        acceso_total: !!a.acceso_total,
        avaluos_gratis: a.avaluos_gratis ?? 1,
        modalidad: a.modalidad || "solo_valuacion",
        fecha_expiracion: a.fecha_expiracion ? a.fecha_expiracion.slice(0, 10) : "",
        nota: a.nota || "",
        activo: a.activo !== false,
      },
    });
  };

  const setForm = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));

  const guardar = async () => {
    const f = modal.form;
    if (!f.email || !f.email.includes("@")) { setError("Ingresa un email válido."); return; }
    if (!f.acceso_total && (!f.avaluos_gratis || f.avaluos_gratis < 1)) {
      setError("Indica cuántos avalúos gratis (o marca Acceso total)."); return;
    }
    setSaving(true); setError("");
    const payload = {
      categoria: f.categoria,
      acceso_total: f.acceso_total,
      avaluos_gratis: f.acceso_total ? 0 : Number(f.avaluos_gratis),
      modalidad: f.modalidad,
      fecha_expiracion: f.fecha_expiracion || null,
      nota: f.nota,
      activo: f.activo,
    };
    try {
      if (modal.modo === "crear") {
        await adminFetch("/api/admin/accesos", { method: "POST", body: JSON.stringify({ ...payload, email: f.email }) });
      } else {
        await adminFetch(`/api/admin/accesos/${modal.access_id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      setModal(null);
      fetchData();
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const resetUsados = async (a) => {
    if (!window.confirm(`¿Reiniciar el contador de usados de ${a.email} a 0?`)) return;
    await adminFetch(`/api/admin/accesos/${a.access_id}`, { method: "PUT", body: JSON.stringify({ reset_usados: true }) });
    fetchData();
  };

  const borrar = async (a) => {
    if (!window.confirm(`¿Eliminar el acceso de ${a.email}? Esta acción no se puede deshacer.`)) return;
    await adminFetch(`/api/admin/accesos/${a.access_id}`, { method: "DELETE" });
    fetchData();
  };

  const visible = data.items.filter(a =>
    !search || a.email.toLowerCase().includes(search.toLowerCase()) || (a.nota || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <PageHeader icon={KeyRound} title="Accesos autorizados" subtitle="Emails con acceso gratis: uso interno o pruebas a clientes (valuador / inmobiliaria)">
          <PrimaryBtn icon={Plus} onClick={abrirCrear}>Nuevo acceso</PrimaryBtn>
        </PageHeader>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users,      label: "Accesos totales", value: data.total,   iconBg: "bg-[#F0FAF5]", iconColor: "text-[#1B4332]" },
            { icon: UserCheck,  label: "Activos",         value: data.activos, iconBg: "bg-green-50",  iconColor: "text-emerald-600" },
            { icon: InfinityIcon, label: "Con acceso total", value: data.items.filter(a => a.acceso_total).length, iconBg: "bg-indigo-50", iconColor: "text-indigo-500" },
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
              placeholder="Buscar email o nota…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <select
            value={filtroCat}
            onChange={e => setFiltroCat(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </FilterBar>

        {/* Tabla */}
        <AdminCard icon={KeyRound} title={`Accesos${visible.length !== data.total ? ` — ${visible.length} mostrados` : ` — ${data.total} total`}`}>
          <div className="p-0">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
            ) : visible.length === 0 ? (
              <EmptyState icon={KeyRound} title="Sin accesos autorizados" sub="Agrega un email interno o de prueba con el botón “Nuevo acceso”" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <GradThead cols={["Email", "Categoría", "Tipo acceso", "# gratis", "Modalidad", "Usados", "Vigencia", "Estado", ""]} />
                  <tbody>
                    {visible.map(a => (
                      <tr key={a.access_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {a.email}
                          {a.nota && <span className="block text-[11px] text-slate-400 truncate max-w-[200px]">{a.nota}</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{CAT_LABEL[a.categoria] || a.categoria}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {a.acceso_total
                            ? <span className="inline-flex items-center gap-1 text-indigo-600 font-medium"><InfinityIcon className="w-3.5 h-3.5" /> Total</span>
                            : <span className="text-slate-500">Por cupo</span>}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-700 tabular-nums">{a.acceso_total ? "—" : a.avaluos_gratis}</td>
                        <td className="py-2.5 px-4 text-slate-600 text-xs">{MOD_LABEL[a.modalidad] || a.modalidad}</td>
                        <td className="py-2.5 px-4 text-center tabular-nums">
                          {a.acceso_total ? <span className="text-slate-400">{a.usados}</span> : (
                            <span className={a.restantes === 0 ? "text-amber-600 font-semibold" : "text-slate-700"}>
                              {a.usados}/{a.avaluos_gratis}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">
                          {a.fecha_expiracion ? new Date(a.fecha_expiracion).toLocaleDateString("es-MX") : <span className="text-slate-300">Sin límite</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 ${ESTADO_BADGE[a.estado] || "bg-slate-100 text-slate-500"}`}>
                            {ESTADO_LABEL[a.estado] || a.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {!a.acceso_total && a.usados > 0 && (
                            <button onClick={() => resetUsados(a)} className="text-[11px] text-slate-400 hover:text-[#1B4332] hover:underline mr-3" title="Reiniciar usados">reset</button>
                          )}
                          <button onClick={() => abrirEditar(a)} className="text-slate-400 hover:text-[#1B4332] mr-2" title="Editar"><Pencil className="w-4 h-4 inline" /></button>
                          <button onClick={() => borrar(a)} className="text-red-300 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4 inline" /></button>
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

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
                {modal.modo === "crear" ? "Nuevo acceso autorizado" : "Editar acceso"}
              </h3>
              <button onClick={() => !saving && setModal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={modal.form.email}
                  disabled={modal.modo === "editar"}
                  onChange={e => setForm({ email: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Categoría</label>
                <div className="mt-1"><BtnGroup value={modal.form.categoria} options={CATEGORIAS} onChange={v => setForm({ categoria: v })} /></div>
              </div>

              {/* Tipo de acceso */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tipo de acceso</label>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => setForm({ acceso_total: false })}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm ${!modal.form.acceso_total ? "border-[#52B788] bg-[#F0FAF5] ring-2 ring-[#52B788]/30 font-medium" : "border-slate-200 hover:bg-slate-50"}`}>
                    Nº de avalúos gratis
                  </button>
                  <button type="button" onClick={() => setForm({ acceso_total: true })}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm ${modal.form.acceso_total ? "border-[#52B788] bg-[#F0FAF5] ring-2 ring-[#52B788]/30 font-medium" : "border-slate-200 hover:bg-slate-50"}`}>
                    Acceso total
                  </button>
                </div>
              </div>

              {/* # gratis */}
              {!modal.form.acceso_total && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Cantidad de avalúos gratis</label>
                  <input
                    type="number" min="1"
                    value={modal.form.avaluos_gratis}
                    onChange={e => setForm({ avaluos_gratis: e.target.value })}
                    className="mt-1 w-32 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                  />
                </div>
              )}

              {/* Modalidad */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Modalidad del servicio incluido</label>
                <div className="mt-1"><BtnGroup value={modal.form.modalidad} options={MODALIDADES} onChange={v => setForm({ modalidad: v })} /></div>
              </div>

              {/* Vigencia + activo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Vigencia (opcional)</label>
                  <input
                    type="date"
                    value={modal.form.fecha_expiracion}
                    onChange={e => setForm({ fecha_expiracion: e.target.value })}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={modal.form.activo} onChange={e => setForm({ activo: e.target.checked })} className="w-4 h-4 accent-[#52B788]" />
                    Acceso activo
                  </label>
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nota (ej. nombre del cliente)</label>
                <input
                  value={modal.form.nota}
                  onChange={e => setForm({ nota: e.target.value })}
                  placeholder="Prueba — Inmobiliaria XYZ"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-50">Cancelar</button>
              <PrimaryBtn onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
