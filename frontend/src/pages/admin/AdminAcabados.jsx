import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState, FilterBar, PrimaryBtn } from "@/components/AdminUI";
import { Hammer, Plus, Check, X, Trash2, RefreshCw, Clock } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import DATA from "@/data/acabados_selectores.json";

// Identificador de Edad: propuestas de catalogo (Fase 1 del plan de fuente
// unica del Manual ZMG). Reemplaza el Google Sheet original — aprobar aqui
// no toca el catalogo en vivo, solo lo deja listo para que
// aplicar_hallazgos_acabados.py (repo del Manual) lo mergee a
// acabados_master.json.

const NOMBRES_ELEMENTO = {
  muro: "Muro (interior)", cubierta: "Techo / cubierta", agua: "Manejo de agua (tinaco/cisterna)",
  piso: "Piso", herreria: "Herrería", cocina: "Cocina", azulejo_bano: "Azulejo de baño",
  puerta: "Puertas interiores", instalacion: "Instalación eléctrica", canceleria: "Cancelería",
  espejo: "Espejo del baño", wc: "Tipo de WC", lavabo: "Tipo de lavabo", griferia: "Tipo de grifería",
  fachada: "Acabado de fachada", servicio: "Patio / cuarto de servicio", niveles: "Niveles del edificio",
  carpinteria: "Clósets / carpintería", sanitaria: "Instalación sanitaria", estructura: "Estructura",
  ventaneria: "Ventanería", cochera: "Cochera / garaje", plafon: "Plafón interior",
  puerta_ingreso: "Puerta de ingreso", zocalos: "Zócalos", apagadores_placas: "Apagadores y placas",
  iluminacion_fija: "Iluminación fija", lamparas: "Lámparas", ventilacion_clima: "Ventilación y clima",
  domos_tragaluces: "Domos / tragaluces", escaleras: "Escaleras", barda_protecciones: "Barda / protecciones",
  gas_calentamiento: "Gas y calentador de agua",
};
const ELEMENTOS = DATA.elementos_principales;

const DECADAS = ["1900s", "1910s", "1920s", "1930s", "1940s", "1950s", "1960s",
  "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

const ACCIONES = [
  { id: "agregar", label: "Agregar opción nueva" },
  { id: "corregir", label: "Corregir décadas de una opción existente" },
  { id: "eliminar", label: "Eliminar una opción" },
];
const FUENTES = [
  { id: "dictado_perito", label: "Dictado del perito" },
  { id: "inferido_texto", label: "Inferido de un texto/catálogo" },
  { id: "literatura_citada", label: "Literatura citada (con URL)" },
];

const ESTADO_BADGE = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-600",
};
const ESTADO_LABEL = { pendiente: "Pendiente", aprobado: "Aprobado", rechazado: "Rechazado" };

const EMPTY_FORM = {
  elemento: ELEMENTOS[0] || "", opcion: "", decadas: [], accion: "agregar",
  fuente_tipo: "dictado_perito", fuente_url: "", nota: "",
};

export default function AdminAcabados() {
  const [data, setData] = useState({ total: 0, conteos: {}, items: [] });
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await adminFetch(`/api/admin/acabados/propuestas?${params}`);
      setData(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const abrirCrear = () => { setError(""); setModal({ form: { ...EMPTY_FORM } }); };
  const setForm = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }));
  const toggleDecada = (d) => setForm({
    decadas: modal.form.decadas.includes(d)
      ? modal.form.decadas.filter(x => x !== d)
      : [...modal.form.decadas, d],
  });

  const guardar = async () => {
    const f = modal.form;
    if (!f.opcion.trim()) { setError("Escribe el nombre de la opción."); return; }
    if (f.accion !== "eliminar" && f.decadas.length === 0) {
      setError("Marca al menos una década."); return;
    }
    setSaving(true); setError("");
    try {
      await adminFetch("/api/admin/acabados/propuestas", { method: "POST", body: JSON.stringify(f) });
      setModal(null);
      fetchData();
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const revisar = async (p, estado) => {
    await adminFetch(`/api/admin/acabados/propuestas/${p.propuesta_id}/revisar`, {
      method: "POST", body: JSON.stringify({ estado }),
    });
    fetchData();
  };

  const borrar = async (p) => {
    if (!window.confirm(`¿Eliminar la propuesta de "${p.opcion}"? No se puede deshacer.`)) return;
    await adminFetch(`/api/admin/acabados/propuestas/${p.propuesta_id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <PageHeader icon={Hammer} title="Catálogo de acabados (Identificador de Edad)"
          subtitle="Propuestas de cambios al catálogo del Manual ZMG — aprobar aquí no toca el catálogo en vivo, solo lo deja listo para aplicar">
          <PrimaryBtn icon={Plus} onClick={abrirCrear}>Nueva propuesta</PrimaryBtn>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { estado: "pendiente", icon: Clock, label: "Pendientes", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
            { estado: "aprobado", icon: Check, label: "Aprobadas", iconBg: "bg-green-50", iconColor: "text-emerald-600" },
            { estado: "rechazado", icon: X, label: "Rechazadas", iconBg: "bg-red-50", iconColor: "text-red-500" },
          ].map(k => (
            <button key={k.estado} onClick={() => setFiltroEstado(k.estado)}
              className={`text-left bg-white rounded-xl border shadow-sm overflow-hidden ${filtroEstado === k.estado ? "border-[#52B788] ring-2 ring-[#52B788]/20" : "border-slate-200"}`}>
              <div className="h-1 bg-[#52B788]" />
              <div className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.iconBg}`}>
                  <k.icon className={`w-4 h-4 ${k.iconColor}`} />
                </div>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{loading ? "…" : (data.conteos?.[k.estado] ?? 0)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            </button>
          ))}
        </div>

        <FilterBar title="Filtro">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobadas</option>
            <option value="rechazado">Rechazadas</option>
            <option value="">Todas</option>
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </FilterBar>

        <AdminCard icon={Hammer} title={`Propuestas — ${data.total} total`}>
          <div className="p-0">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
            ) : data.items.length === 0 ? (
              <EmptyState icon={Hammer} title="Sin propuestas" sub="Agrega una con el botón “Nueva propuesta”" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <GradThead cols={["Elemento", "Opción", "Décadas", "Acción", "Fuente", "Autor", "Estado", ""]} />
                  <tbody>
                    {data.items.map(p => (
                      <tr key={p.propuesta_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-700">{NOMBRES_ELEMENTO[p.elemento] || p.elemento}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {p.opcion}
                          {p.nota && <span className="block text-[11px] text-slate-400 truncate max-w-[220px]">{p.nota}</span>}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 text-xs">{(p.decadas || []).join(", ") || "—"}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">{ACCIONES.find(a => a.id === p.accion)?.label || p.accion}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">
                          {FUENTES.find(f => f.id === p.fuente_tipo)?.label || p.fuente_tipo}
                          {p.fuente_url && <a href={p.fuente_url} target="_blank" rel="noreferrer" className="block text-[#52B788] hover:underline truncate max-w-[160px]">{p.fuente_url}</a>}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">{p.autor || "—"}</td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 ${ESTADO_BADGE[p.estado] || "bg-slate-100 text-slate-500"}`}>
                            {ESTADO_LABEL[p.estado] || p.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {p.estado === "pendiente" ? (
                            <>
                              <button onClick={() => revisar(p, "aprobado")} className="text-emerald-500 hover:text-emerald-700 mr-2" title="Aprobar"><Check className="w-4 h-4 inline" /></button>
                              <button onClick={() => revisar(p, "rechazado")} className="text-red-400 hover:text-red-600 mr-2" title="Rechazar"><X className="w-4 h-4 inline" /></button>
                            </>
                          ) : null}
                          <button onClick={() => borrar(p)} className="text-red-300 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4 inline" /></button>
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Nueva propuesta de catálogo</h3>
              <button onClick={() => !saving && setModal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Elemento</label>
                <select value={modal.form.elemento} onChange={e => setForm({ elemento: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                  {ELEMENTOS.map(e => <option key={e} value={e}>{NOMBRES_ELEMENTO[e] || e}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Acción</label>
                <select value={modal.form.accion} onChange={e => setForm({ accion: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                  {ACCIONES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Opción (nombre exacto)</label>
                <input value={modal.form.opcion} onChange={e => setForm({ opcion: e.target.value })}
                  placeholder="Ej: Porcelanato gran formato en fachada"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>

              {modal.form.accion !== "eliminar" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Décadas</label>
                  <div className="mt-1 grid grid-cols-4 gap-1.5">
                    {DECADAS.map(d => (
                      <button key={d} type="button" onClick={() => toggleDecada(d)}
                        className={`px-2 py-1.5 rounded-lg border text-xs ${modal.form.decadas.includes(d) ? "border-[#52B788] bg-[#F0FAF5] font-medium text-[#1B4332]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fuente</label>
                <select value={modal.form.fuente_tipo} onChange={e => setForm({ fuente_tipo: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                  {FUENTES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>

              {modal.form.fuente_tipo === "literatura_citada" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">URL de la fuente</label>
                  <input type="url" value={modal.form.fuente_url} onChange={e => setForm({ fuente_url: e.target.value })}
                    placeholder="https://…"
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nota (opcional)</label>
                <input value={modal.form.nota} onChange={e => setForm({ nota: e.target.value })}
                  placeholder="Contexto extra para el revisor"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
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
