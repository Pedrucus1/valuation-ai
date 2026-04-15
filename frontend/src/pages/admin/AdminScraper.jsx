import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Activity, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Clock, Database, AlertTriangle, Play, Search, ChevronLeft, ChevronRight, ExternalLink,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";
import { API } from "@/App";
import MercadoView from "@/components/MercadoView";

/* ─── Constantes ─────────────────────────────── */
const ESTADO_CFG = {
  ok:        { label: "OK",        cls: "bg-green-100 text-green-700",   icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
  parcial:   { label: "Parcial",   cls: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="w-4 h-4 text-yellow-600" /> },
  error:     { label: "Error",     cls: "bg-red-100 text-red-600",       icon: <XCircle className="w-4 h-4 text-red-500" /> },
  corriendo: { label: "Corriendo", cls: "bg-blue-100 text-blue-700",     icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" /> },
};

const LOG_CFG = {
  ok:    "text-green-600 bg-green-50",
  warn:  "text-yellow-700 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  info:  "text-blue-600 bg-blue-50",
};

const ESTADO_INICIAL = {
  ultima_ejecucion: null, duracion_min: 0, estado_global: "sin_datos",
  portales: [], total_propiedades: 0, nuevas_hoy: 0, log_reciente: [],
};

const PORTALES_IDS = ["INMUEBLES24", "PINCALI", "VIVANUNCIOS", "MITULA", "CASAS_Y_TERRENOS"];

const TABS = [
  { id: "monitor",     label: "Monitor" },
  { id: "propiedades", label: "Propiedades escrapeadas" },
  { id: "mercado",     label: "Mercado" },
];

const TIPOS_PROP = ["Casa", "Departamento", "Terreno", "Local", "Bodega", "Oficina"];
const TIPO_COLORS = {
  Casa: "#1B4332", Departamento: "#52B788", Terreno: "#D9ED92",
  Local: "#F4A261", Bodega: "#9B5DE5", Oficina: "#E63946",
};

const getSegmento = (precio, tipo_op = "venta") => {
  if (!precio) return { label: "—", color: "#94a3b8" };
  if (tipo_op === "renta") {
    if (precio < 5000)   return { label: "Económico",  color: "#52B788" };
    if (precio < 12000)  return { label: "Medio",      color: "#1B4332" };
    if (precio < 25000)  return { label: "Medio-Alto", color: "#F4A261" };
    if (precio < 50000)  return { label: "Alto",       color: "#9B5DE5" };
    if (precio < 100000) return { label: "Premium",    color: "#E63946" };
    if (precio < 200000) return { label: "Lujo",       color: "#C77DFF" };
    return                      { label: "Super Lujo", color: "#FF6B6B" };
  }
  if (precio < 1e6)   return { label: "Económico",  color: "#52B788" };
  if (precio < 3e6)   return { label: "Medio",      color: "#1B4332" };
  if (precio < 7e6)   return { label: "Medio-Alto", color: "#F4A261" };
  if (precio < 15e6)  return { label: "Alto",       color: "#9B5DE5" };
  if (precio < 30e6)  return { label: "Premium",    color: "#E63946" };
  if (precio < 60e6)  return { label: "Lujo",       color: "#C77DFF" };
  return                     { label: "Super Lujo", color: "#FF6B6B" };
};

const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-MX")}` : "—";
const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

/* ─── Componente: Ejecutar Scraper (modal portal) ── */
const EjecutarPanel = ({ onClose, onRun, corriendo, status }) => {
  const [selected, setSelected] = useState("todos");
  const portalesActivos = status.portales.map(p => p.id?.toUpperCase()).filter(Boolean);
  const lista = portalesActivos.length > 0 ? portalesActivos : PORTALES_IDS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-xl p-6 w-[360px]" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-[#1B4332] text-base mb-4">Ejecutar scraper</h3>
        <p className="text-xs text-slate-400 mb-4">Selecciona un portal o ejecuta todos en paralelo.</p>
        <div className="space-y-2 mb-5">
          <button onClick={() => setSelected("todos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              selected === "todos" ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Globe className="w-4 h-4 shrink-0"/>
            <span>Todos los portales</span>
            {selected === "todos" && <CheckCircle2 className="w-4 h-4 ml-auto" />}
          </button>
          {lista.map(pid => (
            <button key={pid} onClick={() => setSelected(pid)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                selected === pid ? "bg-[#52B788]/10 text-[#1B4332] border-[#52B788]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              <Activity className="w-4 h-4 shrink-0"/>
              <span>{pid}</span>
              {selected === pid && <CheckCircle2 className="w-4 h-4 ml-auto text-[#52B788]" />}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { onRun(selected === "todos" ? null : selected); onClose(); }}
            disabled={corriendo}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#163828] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            {corriendo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Ejecutar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Componente: Propiedades escrapeadas ─────── */
const PropiedadesViewer = () => {
  const [tabSheet, setTabSheet] = useState("CONSOLIDADO");
  const [tabs, setTabs] = useState(["CONSOLIDADO"]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroOp, setFiltroOp] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const limite = 50;

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const params = new URLSearchParams({ tab: tabSheet, page, limite, busqueda });
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (filtroOp)   params.set("listing_type", filtroOp);
      const data = await adminFetch(`/api/admin/scraper/propiedades?${params}`);
      if (!data.ok) { setError(data.error || "Error desconocido"); setItems([]); return; }
      setItems(data.items || []);
      setTotal(data.total || 0);
      if (data.tabs) setTabs(data.tabs);
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, [tabSheet, page, busqueda, filtroTipo, filtroOp]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(1); }, [tabSheet, busqueda, filtroTipo, filtroOp]);

  const totalPages = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Tabs portal */}
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTabSheet(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                tabSheet === t ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>{t}</button>
          ))}
        </div>
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#52B788] text-slate-600">
            <option value="">Todos los tipos</option>
            {TIPOS_PROP.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#52B788] text-slate-600">
            <option value="">Venta y Renta</option>
            <option value="venta">Venta</option>
            <option value="renta">Renta</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ciudad, colonia…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#52B788] w-52" />
          </div>
          <button onClick={cargar}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error === "GOOGLE_SHEETS_API_KEY no configurada"
            ? "La variable GOOGLE_SHEETS_API_KEY no está configurada en el backend."
            : `Error: ${error}`}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#B7E4C7] bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
          <span className="text-sm font-semibold text-white">
            {cargando ? "Cargando…" : `${total.toLocaleString()} propiedades`}
            {(filtroTipo || filtroOp) && (
              <span className="ml-2 text-white/60 text-xs">
                {filtroTipo && `· ${filtroTipo}`}{filtroOp && ` · ${filtroOp}`}
              </span>
            )}
          </span>
          <span className="text-xs text-white/60">Página {page} de {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                {["Título","Precio","Tipo","Colonia","Municipio","Estado","M² const.","M² terr.","Rec.","Baños","Operación","Fuente"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={12} className="px-3 py-2.5">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                </td></tr>
              ))}
              {!cargando && items.length === 0 && (
                <tr><td colSpan={12} className="text-center py-10 text-slate-400">
                  {error ? "—" : "Sin datos en este tab / filtro"}
                </td></tr>
              )}
              {!cargando && items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-2 max-w-[180px] truncate font-medium text-slate-700" title={item.title}>{item.title || "—"}</td>
                  <td className="px-3 py-2 text-[#1B4332] font-semibold whitespace-nowrap">
                    {item.price ? `$${item.price.toLocaleString("es-MX")}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                      backgroundColor: `${TIPO_COLORS[item.property_type] || "#94a3b8"}22`,
                      color: TIPO_COLORS[item.property_type] || "#94a3b8",
                    }}>{item.property_type || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{item.neighborhood || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{item.municipality || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{item.state || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{item.construction_area || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{item.land_area || "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{item.bedrooms ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{item.bathrooms ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      item.listing_type === "renta" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>{item.listing_type || "venta"}</span>
                  </td>
                  <td className="px-3 py-2">
                    {item.source_url ? (
                      <a href={item.source_url} target="_blank" rel="noreferrer"
                        className="text-[#52B788] hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {item.source || tabSheet}
                      </a>
                    ) : <span className="text-slate-300">{item.source || "—"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#B7E4C7]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#1B4332] disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#1B4332] disabled:opacity-30">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


/* ─── Componente principal ────────────────────── */
const AdminScraper = () => {
  const [activeTab, setActiveTab] = useState("monitor");
  const [status, setStatus] = useState(ESTADO_INICIAL);
  const [cargando, setCargando] = useState(true);
  // runningPortals: objeto { INMUEBLES24: true, PINCALI: false, ... }
  const [runningPortals, setRunningPortals] = useState({});
  const [corriendoTodos, setCorriendoTodos] = useState(false);
  const [reseteando, setReseteando] = useState(null);
  const [toast, setToast] = useState(null);

  const cargar = useCallback(() => {
    adminFetch("/api/admin/scraper/status")
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const showToast = (msg, tipo = "info") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4500);
  };

  const horasDesdeEjecucion = () => {
    if (!status.ultima_ejecucion) return null;
    return ((Date.now() - new Date(status.ultima_ejecucion).getTime()) / 1000 / 60 / 60).toFixed(1);
  };

  /* Ejecutar UN portal individual — nunca bloquea aunque otro esté corriendo */
  const ejecutarPortal = async (portalId) => {
    const id = portalId.toUpperCase();
    setRunningPortals((p) => ({ ...p, [id]: true }));
    try {
      const res = await adminFetch("/api/admin/scraper/run", {
        method: "POST",
        body: JSON.stringify({ portal: id }),
      });
      const msg = res.mensaje || `Portal ${id} iniciado`;
      showToast(msg, "ok");
      // Optimistic update: marcar portal como corriendo en status
      setStatus((prev) => ({
        ...prev,
        portales: prev.portales.map((p) =>
          p.id?.toUpperCase() === id ? { ...p, estado: "corriendo" } : p
        ),
        log_reciente: [
          { ts: new Date().toTimeString().slice(0, 8), msg, nivel: "info" },
          ...(prev.log_reciente || []),
        ],
      }));
      setTimeout(cargar, 5000);
    } catch (e) {
      showToast(`${id}: ${e.message}`, "error");
    } finally {
      setRunningPortals((p) => ({ ...p, [id]: false }));
    }
  };

  /* Ejecutar TODOS en paralelo (force=true evita el 409) */
  const ejecutarTodos = async () => {
    setCorriendoTodos(true);
    try {
      const res = await adminFetch("/api/admin/scraper/run", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      const msg = res.mensaje || "Todos los portales iniciados en paralelo";
      showToast(msg, "ok");
      setStatus((prev) => ({
        ...prev,
        estado_global: "corriendo",
        log_reciente: [
          { ts: new Date().toTimeString().slice(0, 8), msg, nivel: "info" },
          ...(prev.log_reciente || []),
        ],
      }));
      setTimeout(cargar, 5000);
    } catch (e) {
      showToast("Error al ejecutar todos: " + e.message, "error");
    } finally {
      setCorriendoTodos(false);
    }
  };

  const resetearPortal = async (id) => {
    setReseteando(id);
    try {
      await adminFetch(`/api/admin/scraper/portales/${id}/reset`, { method: "POST", body: JSON.stringify({}) });
      showToast(`Portal ${id}: errores reseteados`, "ok");
      setStatus((prev) => ({
        ...prev,
        portales: prev.portales.map((portal) =>
          portal.id === id ? { ...portal, errores: 0, estado: "ok" } : portal
        ),
        log_reciente: [
          { ts: new Date().toTimeString().slice(0, 8), msg: `Portal ${id}: errores reseteados manualmente`, nivel: "info" },
          ...(prev.log_reciente || []),
        ],
      }));
    } catch (e) {
      showToast("Error: " + e.message, "error");
    } finally {
      setReseteando(null);
    }
  };

  const totalCompletadas = status.portales.reduce((s, p) => s + (p.completadas || 0), 0);
  const totalErrores     = status.portales.reduce((s, p) => s + (p.errores || 0), 0);
  const horasStr = horasDesdeEjecucion();
  const horas = horasStr ? parseFloat(horasStr) : 0;
  // Lista de portales a mostrar (combina datos del backend + portales sin datos aún)
  const listaPortales = PORTALES_IDS.map((pid) => {
    const found = status.portales.find((p) => p.id?.toUpperCase() === pid);
    return found || { id: pid, nombre: pid, estado: "sin_datos", propiedades: 0, completadas: 0, errores: 0, pendientes: 0, ultima: null };
  });

  return (
    <AdminLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
          toast.tipo === "ok"    ? "bg-green-50 border-green-200 text-green-700" :
          toast.tipo === "error" ? "bg-red-50 border-red-200 text-red-700"      :
                                   "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {toast.tipo === "ok"    ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
           toast.tipo === "error" ? <XCircle className="w-4 h-4 shrink-0" />      :
                                    <Activity className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <PageHeader icon={Activity} title="Scraper de Comparables"
          subtitle="Estado de los portales de comparables y datos de mercado" />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 pt-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? "border-[#52B788] text-[#1B4332]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>{t.label}</button>
          ))}
        </div>

        {/* ── Tab: Propiedades ── */}
        {activeTab === "propiedades" && <PropiedadesViewer />}

        {/* ── Tab: Mercado ── */}
        {activeTab === "mercado" && (
          <MercadoView
            modo="admin"
            nombreUsuario="Admin"
            valuacionesPropias={[]}
            planId=""
            API={API}
            esAdmin={true}
          />
        )}

        {/* ── Tab: Monitor ── */}
        {activeTab === "monitor" && (
          <div className="flex flex-col gap-6">

            {horas > 24 && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">El scraper lleva {horas}h sin ejecutarse</p>
                  <p className="text-xs text-red-500">Verifica el cron job en el servidor o ejecuta manualmente.</p>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Database,     label: "Propiedades en BD", valor: status.total_propiedades?.toLocaleString() ?? "0", cls: "bg-blue-100 text-blue-600" },
                { icon: Activity,     label: "Nuevas hoy",        valor: status.nuevas_hoy ?? 0,                           cls: "bg-green-100 text-green-600" },
                { icon: CheckCircle2, label: "Tareas completas",  valor: status.tareas_completadas != null ? `${status.tareas_completadas}/${status.tareas_total}` : totalCompletadas.toLocaleString(), cls: "bg-[#D9ED92] text-[#1B4332]" },
                { icon: XCircle,      label: "Errores",           valor: status.tareas_errores ?? totalErrores,            cls: (status.tareas_errores ?? totalErrores) > 0 ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-400" },
              ].map(({ icon: Icon, label, valor, cls }) => (
                <div key={label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm p-4 flex flex-col gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon className="w-4 h-4" /></div>
                  <p className="font-['Outfit'] text-xl font-bold text-[#1B4332]">{valor}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Barra de progreso global */}
            {status.progreso_pct != null && (
              <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#1B4332]">Progreso total del ciclo</span>
                  <span className="text-xs font-bold text-[#1B4332]">{status.progreso_pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#52B788] to-[#1B4332] rounded-full transition-all duration-500"
                    style={{ width: `${status.progreso_pct}%` }} />
                </div>
                <div className="flex gap-4 mt-2 text-[11px] text-slate-400">
                  <span className="text-green-600 font-semibold">{status.tareas_completadas} completadas</span>
                  <span>{status.tareas_pendientes} pendientes</span>
                  {status.tareas_errores > 0 && <span className="text-red-500">{status.tareas_errores} errores</span>}
                </div>
              </div>
            )}

            {/* ── Sección: Portales ── */}
            <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              {/* Header con botón maestro */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#B7E4C7] flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-[#1B4332] text-sm">Portales</h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {status.ultima_ejecucion
                      ? `última ejecución: hace ${horas < 1 ? `${Math.round(horas * 60)} min` : `${horas}h`}`
                      : "Sin ejecuciones registradas"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={cargar}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[#1B4332] hover:border-[#52B788] transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </button>
                  {/* BOTÓN MAESTRO */}
                  <button
                    onClick={ejecutarTodos}
                    disabled={corriendoTodos}
                    className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors shadow-sm">
                    {corriendoTodos
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Iniciando todos…</>
                      : <><Play className="w-4 h-4" /> Ejecutar todos los portales</>}
                  </button>
                </div>
              </div>

              {/* Tarjetas de portal — una por portal, en grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cargando && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                ))}
                {!cargando && listaPortales.map((p) => {
                  const pid = p.id?.toUpperCase() || p.nombre?.toUpperCase() || "";
                  const isRunning = runningPortals[pid] || p.estado === "corriendo";
                  const cfg = isRunning ? ESTADO_CFG.corriendo : (ESTADO_CFG[p.estado] || ESTADO_CFG.ok);

                  return (
                    <div key={pid}
                      className={`relative rounded-xl border p-4 transition-all ${
                        isRunning
                          ? "border-blue-300 bg-blue-50/40 shadow-sm"
                          : p.estado === "error"
                          ? "border-red-200 bg-red-50/30"
                          : "border-[#B7E4C7] bg-white hover:shadow-sm"
                      }`}>
                      {/* Pulse cuando corriendo */}
                      {isRunning && (
                        <span className="absolute top-3 right-3 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                        </span>
                      )}

                      {/* Nombre + estado */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm font-bold text-[#1B4332]">{p.nombre || pid}</p>
                          <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-slate-50 rounded-lg py-1.5">
                          <p className="text-xs font-bold text-[#1B4332]">{(p.propiedades ?? 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Props</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg py-1.5">
                          <p className="text-xs font-bold text-green-600">{(p.completadas ?? 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Hechas</p>
                        </div>
                        <div className={`rounded-lg py-1.5 ${p.errores > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                          <p className={`text-xs font-bold ${p.errores > 0 ? "text-red-500" : "text-slate-300"}`}>{p.errores ?? 0}</p>
                          <p className="text-[10px] text-slate-400">Errores</p>
                        </div>
                      </div>

                      {/* Última actualización */}
                      {p.ultima && (
                        <p className="text-[10px] text-slate-300 mb-3">
                          Última act.: {new Date(p.ultima).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => ejecutarPortal(pid)}
                          disabled={isRunning}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#1B4332] hover:bg-[#163828] disabled:opacity-50 text-white px-3 py-1.5 rounded-xl transition-colors">
                          {isRunning
                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Corriendo…</>
                            : <><Play className="w-3 h-3" /> Correr</>}
                        </button>
                        {(p.errores > 0 || p.estado === "error") && (
                          <button
                            onClick={() => resetearPortal(p.id)}
                            disabled={reseteando === p.id}
                            className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-3 h-3 ${reseteando === p.id ? "animate-spin" : ""}`} /> Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Log reciente */}
            <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm">
              <div className="px-5 py-4 border-b border-[#B7E4C7]">
                <h2 className="font-semibold text-[#1B4332] text-sm">Log de ejecución reciente</h2>
              </div>
              <div className="p-4 space-y-1.5 font-mono text-xs max-h-64 overflow-y-auto">
                {(status.log_reciente || []).length === 0 && (
                  <p className="text-slate-300 text-center py-4">Sin logs aún</p>
                )}
                {(status.log_reciente || []).map((l, i) => (
                  <div key={i} className={`flex gap-3 px-3 py-1.5 rounded-lg ${LOG_CFG[l.nivel] || LOG_CFG.info}`}>
                    <span className="opacity-50 flex-shrink-0">{l.ts}</span>
                    <span>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminScraper;
