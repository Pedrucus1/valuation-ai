import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  MessageSquare, ChevronDown, Search, X, ExternalLink,
  Clock, CheckCircle2, Circle, AlertCircle, User, Send,
} from "lucide-react";

// Backend: { feedback_id, tipo, descripcion, email, valuador_id, calificacion, estado, created_at, asignado_a, notas_internas }
// Frontend usa: id, nombre, contacto, valuador, asignado, notas, fecha

function normalizeFeedback(f) {
  return {
    id: f.feedback_id,
    tipo: f.tipo || "queja_general",
    valuador: f.valuador_id || null,
    nombre: f.nombre || "Anónimo",
    contacto: f.email || null,
    descripcion: f.descripcion || "",
    estado: f.estado || "recibido",
    asignado: f.asignado_a || null,
    fecha: f.created_at ? f.created_at.split("T")[0] : "-",
    notas: f.notas_internas || [],
  };
}

const ADMINS = ["Diana Moderadora", "Ricardo Finanzas", "Sofia Soporte"];

const TIPO_CFG = {
  queja_valuador:      { label: "Queja valuador",  cls: "bg-red-100 text-red-600" },
  bug:                 { label: "Bug",              cls: "bg-purple-100 text-purple-700" },
  sugerencia:          { label: "Sugerencia",       cls: "bg-blue-100 text-blue-700" },
  queja_anuncio:       { label: "Queja anuncio",    cls: "bg-orange-100 text-orange-700" },
  calificacion_valuador:{ label: "Calificación",   cls: "bg-green-100 text-green-700" },
  queja_general:       { label: "Queja general",   cls: "bg-slate-100 text-slate-600" },
};

const ESTADO_CFG = {
  recibido:    { label: "Recibido",    cls: "bg-blue-100 text-blue-700",   icon: <Circle className="w-3 h-3" /> },
  en_revision: { label: "En revisión", cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3 h-3" /> },
  resuelto:    { label: "Resuelto",    cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-3 h-3" /> },
  cerrado:     { label: "Cerrado",     cls: "bg-slate-100 text-slate-500",  icon: <X className="w-3 h-3" /> },
};

const ESTADOS_ORDEN = ["recibido", "en_revision", "resuelto", "cerrado"];

const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [expandido, setExpandido] = useState(null);
  const [nuevaNota, setNuevaNota] = useState({});
  const [respuestaEmail, setRespuestaEmail] = useState({});

  useEffect(() => {
    adminFetch("/api/admin/feedback")
      .then((data) => setItems((data.items || []).map(normalizeFeedback)))
      .catch(() => {});
  }, []);

  const filtrados = useMemo(() => items.filter((f) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || f.id.toLowerCase().includes(q) || f.nombre.toLowerCase().includes(q) || f.descripcion.toLowerCase().includes(q) || (f.valuador && f.valuador.toLowerCase().includes(q));
    const matchT = tipoFiltro === "todos" || f.tipo === tipoFiltro;
    const matchE = estadoFiltro === "todos" || f.estado === estadoFiltro;
    return matchQ && matchT && matchE;
  }), [items, busqueda, tipoFiltro, estadoFiltro]);

  const pendientes = items.filter((f) => f.estado === "recibido" || f.estado === "en_revision").length;

  const actualizarItem = async (id, cambios) => {
    // Mapear campos frontend → backend
    const backendCambios = {};
    if ("estado" in cambios) backendCambios.estado = cambios.estado;
    if ("asignado" in cambios) backendCambios.asignado_a = cambios.asignado;
    if ("notas" in cambios) backendCambios.notas_internas = cambios.notas;
    try {
      await adminFetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify(backendCambios),
      });
    } catch (e) {
      console.error("Error actualizando feedback:", e.message);
    }
    setItems((prev) => prev.map((f) => f.id === id ? { ...f, ...cambios } : f));
  };

  const agregarNota = (id) => {
    const texto = nuevaNota[id]?.trim();
    if (!texto) return;
    const item = items.find((f) => f.id === id);
    const nuevasNotas = [...(item?.notas || []), texto];
    actualizarItem(id, { notas: nuevasNotas });
    setNuevaNota((p) => ({ ...p, [id]: "" }));
  };

  const badges = { kyc: 0, ads: 0, quejas: pendientes };

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-4xl mx-auto space-y-5">

        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Quejas y Sugerencias</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pendientes} sin resolver · {items.length} total</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por folio, nombre, descripción..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          <div className="relative">
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todos">Todos los estados</option>
              {ESTADOS_ORDEN.map((e) => <option key={e} value={e}>{ESTADO_CFG[e].label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay reportes con esos criterios</p>
            </div>
          )}
          {filtrados.map((f) => {
            const abierto = expandido === f.id;
            const tipoCfg = TIPO_CFG[f.tipo];
            const estCfg = ESTADO_CFG[f.estado];
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandido(abierto ? null : f.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-slate-400">{f.id}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tipoCfg.cls}`}>{tipoCfg.label}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${estCfg.cls}`}>
                        {estCfg.icon}{estCfg.label}
                      </span>
                      {f.valuador && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> {f.valuador}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-snug line-clamp-2">{f.descripcion}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                      <span>{f.nombre}</span>
                      {f.asignado && <span>→ {f.asignado}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.fecha}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 mt-1 transition-transform flex-shrink-0 ${abierto ? "rotate-180" : ""}`} />
                </div>

                {/* Panel expandido */}
                {abierto && (
                  <div className="border-t border-slate-100 p-5 space-y-5">
                    {/* Descripción completa */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Descripción completa</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{f.descripcion}</p>
                      {f.contacto && (
                        <p className="text-xs text-slate-400 mt-1">
                          Contacto: <strong className="text-slate-600">{f.contacto}</strong>
                        </p>
                      )}
                    </div>

                    {/* Links rápidos */}
                    {f.valuador && (
                      <div className="flex gap-2">
                        <a href="/admin/valuadores" className="flex items-center gap-1.5 text-xs text-[#52B788] border border-[#52B788]/30 px-3 py-1.5 rounded-xl hover:bg-[#52B788]/10 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Ver expediente valuador
                        </a>
                        <a href="/admin/kyc" className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors">
                          Ver KYC
                        </a>
                      </div>
                    )}

                    {/* Controles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Asignar a</label>
                        <select
                          value={f.asignado || ""}
                          onChange={(e) => actualizarItem(f.id, { asignado: e.target.value || null })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                        >
                          <option value="">Sin asignar</option>
                          {ADMINS.map((a) => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Estado</label>
                        <select
                          value={f.estado}
                          onChange={(e) => actualizarItem(f.id, { estado: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                        >
                          {ESTADOS_ORDEN.map((e) => <option key={e} value={e}>{ESTADO_CFG[e].label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Notas internas */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notas internas</p>
                      {f.notas.length === 0 && <p className="text-xs text-slate-300 mb-2">Sin notas aún.</p>}
                      {f.notas.map((n, i) => (
                        <div key={i} className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5 text-xs text-slate-600 mb-2">
                          {n}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nuevaNota[f.id] || ""}
                          onChange={(e) => setNuevaNota((p) => ({ ...p, [f.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && agregarNota(f.id)}
                          placeholder="Agregar nota interna..."
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                        />
                        <button onClick={() => agregarNota(f.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-3 py-2 text-xs font-semibold transition-colors">
                          + Nota
                        </button>
                      </div>
                    </div>

                    {/* Responder por email */}
                    {f.contacto && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Responder al usuario</p>
                        <textarea
                          value={respuestaEmail[f.id] || ""}
                          onChange={(e) => setRespuestaEmail((p) => ({ ...p, [f.id]: e.target.value }))}
                          rows={3}
                          placeholder={`Escribir respuesta para ${f.nombre}...`}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                        />
                        <button
                          onClick={() => {
                            setRespuestaEmail((p) => ({ ...p, [f.id]: "" }));
                            actualizarItem(f.id, { estado: "resuelto" });
                          }}
                          className="mt-2 flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Enviar respuesta y marcar resuelto
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFeedback;
