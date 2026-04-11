import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Activity, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Clock, Database, AlertTriangle, Play, List, Search, ChevronLeft, ChevronRight, ExternalLink,
  MapPin, Plus, X, Globe, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

const ESTADO_CFG = {
  ok:       { label: "OK",         cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
  parcial:  { label: "Parcial",    cls: "bg-yellow-100 text-yellow-700",icon: <AlertCircle className="w-4 h-4 text-yellow-600" /> },
  error:    { label: "Error",      cls: "bg-red-100 text-red-600",      icon: <XCircle className="w-4 h-4 text-red-500" /> },
  corriendo:{ label: "Corriendo",  cls: "bg-blue-100 text-blue-700",    icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" /> },
};

const LOG_CFG = {
  ok:    "text-green-600 bg-green-50",
  warn:  "text-yellow-700 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  info:  "text-blue-600 bg-blue-50",
};

const ESTADO_INICIAL = {
  ultima_ejecucion: null,
  duracion_min: 0,
  estado_global: "sin_datos",
  portales: [],
  total_propiedades: 0,
  nuevas_hoy: 0,
  log_reciente: [],
};

const TABS = [
  { id: "monitor",     label: "Monitor" },
  { id: "propiedades", label: "Propiedades escrapeadas" },
  { id: "zonas",       label: "Zonas objetivo" },
];

const PORTALES_DISPONIBLES = ["Inmuebles24", "Vivanuncios", "Lamudi", "Propiedades.com", "MercadoLibre", "Encuentra24"];

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla",
  "Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas",
  "Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const ZONAS_INICIALES = [
  { id: "gdl",   municipio: "Guadalajara",     estado: "Jalisco",          portales: ["Inmuebles24","Vivanuncios","Lamudi","Propiedades.com"], status: "activa",   prioridad: "alta",  propiedades: 4820 },
  { id: "zap",   municipio: "Zapopan",         estado: "Jalisco",          portales: ["Inmuebles24","Vivanuncios","Lamudi"],                  status: "activa",   prioridad: "alta",  propiedades: 3210 },
  { id: "tlaq",  municipio: "Tlaquepaque",     estado: "Jalisco",          portales: ["Inmuebles24","Vivanuncios"],                          status: "activa",   prioridad: "media", propiedades: 1540 },
  { id: "pvall", municipio: "Puerto Vallarta", estado: "Jalisco",          portales: ["Inmuebles24","Lamudi"],                               status: "activa",   prioridad: "media", propiedades: 980  },
  { id: "ags",   municipio: "Aguascalientes",  estado: "Aguascalientes",   portales: ["Inmuebles24"],                                        status: "activa",   prioridad: "baja",  propiedades: 620  },
  { id: "leon",  municipio: "León",            estado: "Guanajuato",       portales: ["Inmuebles24","Vivanuncios"],                          status: "activa",   prioridad: "baja",  propiedades: 740  },
  { id: "mty",   municipio: "Monterrey",       estado: "Nuevo León",       portales: [],                                                     status: "pendiente",prioridad: "alta",  propiedades: 0    },
  { id: "cdmx",  municipio: "Ciudad de México",estado: "Ciudad de México",  portales: [],                                                     status: "pendiente",prioridad: "alta",  propiedades: 0    },
];

const STATUS_CFG = {
  activa:     { label: "Activa",       cls: "bg-green-100 text-green-700"  },
  pendiente:  { label: "Pendiente",    cls: "bg-amber-100 text-amber-700"  },
  prueba:     { label: "En prueba",    cls: "bg-blue-100 text-blue-700"    },
  pausada:    { label: "Pausada",      cls: "bg-slate-100 text-slate-500"  },
};

const PRIORIDAD_CFG = {
  alta:  { cls: "bg-red-100 text-red-600",    dot: "bg-red-400"    },
  media: { cls: "bg-amber-100 text-amber-700",dot: "bg-amber-400"  },
  baja:  { cls: "bg-slate-100 text-slate-500",dot: "bg-slate-300"  },
};

/* ─── Tab Zonas objetivo ─── */
const ZonasObjetivo = () => {
  const [zonas, setZonas] = useState(ZONAS_INICIALES);
  const [form, setForm] = useState({ municipio: "", estado: "Jalisco", portales: [], prioridad: "media" });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [testando, setTestando] = useState(null);

  const togglePortal = (p) => setForm((f) => ({
    ...f,
    portales: f.portales.includes(p) ? f.portales.filter((x) => x !== p) : [...f.portales, p],
  }));

  const agregar = () => {
    if (!form.municipio.trim()) return;
    const nueva = {
      id: `z-${Date.now()}`,
      municipio: form.municipio.trim(),
      estado: form.estado,
      portales: form.portales,
      status: "pendiente",
      prioridad: form.prioridad,
      propiedades: 0,
    };
    setZonas((z) => [...z, nueva]);
    setForm({ municipio: "", estado: "Jalisco", portales: [], prioridad: "media" });
  };

  const cambiarStatus = (id, status) => {
    setZonas((z) => z.map((zona) => zona.id === id ? { ...zona, status } : zona));
  };

  const eliminar = (id) => {
    if (!confirm("¿Eliminar esta zona del plan de scraping?")) return;
    setZonas((z) => z.filter((zona) => zona.id !== id));
  };

  const testScrape = async (id) => {
    setTestando(id);
    await new Promise((r) => setTimeout(r, 1800));
    setZonas((z) => z.map((zona) => zona.id === id ? { ...zona, status: "prueba" } : zona));
    setTestando(null);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await adminFetch("/api/admin/scraper/zonas", { method: "PUT", body: JSON.stringify({ zonas }) });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch { /* silencioso */ }
    setGuardando(false);
  };

  const activas  = zonas.filter((z) => z.status === "activa").length;
  const pendientes = zonas.filter((z) => z.status === "pendiente").length;
  const totalProp  = zonas.reduce((s, z) => s + (z.propiedades || 0), 0);

  return (
    <div className="space-y-5">

      <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl px-4 py-3 text-xs text-slate-600 flex items-start gap-2">
        <Globe className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1B4332]">Zonas objetivo</strong> — Aquí se define qué municipios y portales incluirá el scraper.
          Agrega ciudades en <em>Pendiente</em>, configura sus portales, pruébalas y actívalas cuando estés listo.
          Los cambios afectan los próximos ciclos de scraping, no el actual.
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Zonas activas",    val: activas,   color: "text-green-600" },
          { label: "Pendientes de activar", val: pendientes, color: "text-amber-600" },
          { label: "Propiedades indexadas",  val: totalProp.toLocaleString(), color: "text-[#1B4332]" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#B7E4C7] p-4 shadow-sm">
            <p className={`font-['Outfit'] text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de zonas */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D9ED92]" />
            <span className="font-['Outfit'] font-semibold text-white text-sm">Zonas configuradas ({zonas.length})</span>
          </div>
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#D9ED92] text-[#1B4332] hover:bg-white px-3 py-1.5 rounded-xl transition-colors">
            {guardando ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            {guardado ? "✓ Guardado" : "Guardar cambios"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                {["Municipio","Estado","Portales","Propiedades","Prioridad","Estado","Acciones"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {zonas.map((z) => {
                const stCfg = STATUS_CFG[z.status] || STATUS_CFG.pendiente;
                const prCfg = PRIORIDAD_CFG[z.prioridad] || PRIORIDAD_CFG.media;
                return (
                  <tr key={z.id} className="hover:bg-[#F0FAF5]/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-sm text-[#1B4332] flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0" />{z.municipio}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{z.estado}</td>
                    <td className="px-4 py-3">
                      {z.portales.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {z.portales.map((p) => (
                            <span key={p} className="text-[10px] font-semibold bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-1.5 py-0.5 rounded-full">{p.split(".")[0]}</span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-300">Sin configurar</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                      {z.propiedades > 0 ? z.propiedades.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${prCfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prCfg.dot}`} />{z.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={z.status} onChange={(e) => cambiarStatus(z.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${stCfg.cls}`}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <option key={k} value={k} className="bg-white text-slate-700">{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {z.status === "pendiente" && (
                          <button onClick={() => testScrape(z.id)} disabled={testando === z.id}
                            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {testando === z.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            Probar
                          </button>
                        )}
                        <button onClick={() => eliminar(z.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario agregar zona */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#D9ED92]" />
          <span className="font-['Outfit'] font-semibold text-white text-sm">Agregar nueva zona objetivo</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Municipio</label>
              <input type="text" value={form.municipio} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
                placeholder="Ej: Querétaro"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado</label>
              <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
              <select value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                <option value="alta">Alta — ciudad principal</option>
                <option value="media">Media — ciudad secundaria</option>
                <option value="baja">Baja — exploración</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Portales a activar</label>
            <div className="flex flex-wrap gap-2">
              {PORTALES_DISPONIBLES.map((p) => (
                <button key={p} type="button" onClick={() => togglePortal(p)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                    form.portales.includes(p)
                      ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "border-slate-200 text-slate-600 hover:border-[#52B788]"
                  }`}>{p}</button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Puedes dejar sin portales y configurar después — la zona quedará en estado Pendiente</p>
          </div>

          <button onClick={agregar} disabled={!form.municipio.trim()}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Agregar zona
          </button>
        </div>
      </div>
    </div>
  );
};

const PropiedadesViewer = () => {
  const [tabSheet, setTabSheet] = useState("CONSOLIDADO");
  const [tabs, setTabs] = useState(["CONSOLIDADO"]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const limite = 50;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tab: tabSheet, page, limite, busqueda });
      const data = await adminFetch(`/api/admin/scraper/propiedades?${params}`);
      if (!data.ok) { setError(data.error || "Error desconocido"); setItems([]); return; }
      setItems(data.items || []);
      setTotal(data.total || 0);
      if (data.tabs) setTabs(data.tabs);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [tabSheet, page, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(1); }, [tabSheet, busqueda]);

  const totalPages = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTabSheet(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                tabSheet === t ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por ciudad, colonia…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#52B788] w-52"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error === "GOOGLE_SHEETS_API_KEY no configurada"
            ? "La variable GOOGLE_SHEETS_API_KEY no está configurada en el backend."
            : `Error: ${error}`}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#B7E4C7] bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
          <span className="text-sm font-semibold text-white">
            {cargando ? "Cargando…" : `${total.toLocaleString()} propiedades`}
          </span>
          <span className="text-xs text-white/60">Página {page} de {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                {["Título", "Precio", "Tipo", "Colonia", "Municipio", "Estado", "M² const.", "M² terr.", "Rec.", "Baños", "Operación", "Fuente"].map((h) => (
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
                  <td className="px-3 py-2 text-slate-500">{item.property_type || "—"}</td>
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
                        <ExternalLink className="w-3 h-3" />
                        {item.source || tabSheet}
                      </a>
                    ) : (
                      <span className="text-slate-300">{item.source || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
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

const AdminScraper = () => {
  const [activeTab, setActiveTab] = useState("monitor");
  const [status, setStatus] = useState(ESTADO_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [corriendo, setCorriendo] = useState(false);
  const [reseteando, setReseteando] = useState(null);

  const cargar = () => {
    adminFetch("/api/admin/scraper/status")
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const horasDesdeEjecucion = () => {
    if (!status.ultima_ejecucion) return null;
    const diff = (Date.now() - new Date(status.ultima_ejecucion).getTime()) / 1000 / 60 / 60;
    return diff.toFixed(1);
  };

  const ejecutarScraper = async (portal = null) => {
    setCorriendo(true);
    try {
      const res = await adminFetch("/api/admin/scraper/run", {
        method: "POST",
        body: JSON.stringify(portal ? { portal } : {}),
      });
      const msg = res.mensaje || (portal ? `Portal ${portal} iniciado` : "Todos los portales iniciados en paralelo");
      setStatus((p) => ({
        ...p,
        estado_global: "corriendo",
        log_reciente: [
          { ts: new Date().toTimeString().slice(0, 8), msg, nivel: "info" },
          ...p.log_reciente,
        ],
      }));
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setCorriendo(false);
    }
  };

  const resetearPortal = async (id) => {
    setReseteando(id);
    try {
      await adminFetch(`/api/admin/scraper/portales/${id}/reset`, { method: "POST", body: JSON.stringify({}) });
      setStatus((p) => ({
        ...p,
        portales: p.portales.map((portal) =>
          portal.id === id ? { ...portal, errores: 0, estado: "ok" } : portal
        ),
        log_reciente: [
          { ts: new Date().toTimeString().slice(0, 8), msg: `Portal ${id}: errores reseteados manualmente`, nivel: "info" },
          ...p.log_reciente,
        ],
      }));
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setReseteando(null);
    }
  };

  const totalCompletadas = status.portales.reduce((s, p) => s + p.completadas, 0);
  const totalErrores = status.portales.reduce((s, p) => s + p.errores, 0);
  const horasStr = horasDesdeEjecucion();
  const horas = horasStr ? parseFloat(horasStr) : 0;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <PageHeader icon={Activity} title="Monitor del Scraper"
          subtitle="Estado de los portales de comparables">
          {activeTab === "monitor" && (
            <button onClick={ejecutarScraper} disabled={corriendo}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
              {corriendo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {corriendo ? "Ejecutando..." : "Ejecutar ahora"}
            </button>
          )}
        </PageHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? "border-[#52B788] text-[#1B4332]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>{t.label}</button>
          ))}
        </div>

        {activeTab === "propiedades" && <PropiedadesViewer />}

        {activeTab === "zonas" && <ZonasObjetivo />}

        {activeTab === "monitor" && <>

        {/* Alerta si llevan +24h sin correr */}
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
            { icon: Database, label: "Propiedades en BD", valor: status.total_propiedades.toLocaleString(), cls: "bg-blue-100 text-blue-600" },
            { icon: Activity, label: "Nuevas hoy", valor: status.nuevas_hoy, cls: "bg-green-100 text-green-600" },
            { icon: CheckCircle2, label: "URLs procesadas", valor: totalCompletadas.toLocaleString(), cls: "bg-[#D9ED92] text-[#1B4332]" },
            { icon: XCircle, label: "Errores",    valor: totalErrores, cls: totalErrores > 0 ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-400" },
          ].map(({ icon: Icon, label, valor, cls }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#B7E4C7] p-4 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-['Outfit'] text-xl font-bold text-[#1B4332]">{valor}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Estado por portal */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#B7E4C7]">
            <h2 className="font-semibold text-[#1B4332] text-sm">Estado por portal</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {status.ultima_ejecucion
                ? `Última ejecución: hace ${horas < 1 ? `${Math.round(horas * 60)} min` : `${horas}h`}`
                : "Sin ejecuciones registradas"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                  {["Portal", "Estado", "Completadas", "Errores", "Pendientes", "Última act.", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {status.portales.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    {cargando ? "Cargando…" : "Sin datos — el scraper aún no ha ejecutado un ciclo completo"}
                  </td></tr>
                )}
                {status.portales.map((p) => {
                  const cfg = ESTADO_CFG[p.estado];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-sm text-[#1B4332]">{p.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.completadas.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={p.errores > 0 ? "text-sm font-bold text-red-500" : "text-sm text-slate-300"}>
                          {p.errores}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{p.pendientes || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                        {new Date(p.ultima).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => ejecutarScraper(p.id.toUpperCase())}
                            disabled={corriendo || status.estado_global === "corriendo"}
                            className="flex items-center gap-1 text-[11px] font-semibold text-[#1B4332] border border-[#52B788] hover:bg-[#52B788]/10 px-2.5 py-1.5 rounded-xl transition-colors disabled:opacity-40"
                            title={`Correr solo ${p.nombre}`}
                          >
                            <Play className="w-3 h-3" />
                          </button>
                          {(p.errores > 0 || p.estado === "error") && (
                            <button
                              onClick={() => resetearPortal(p.id)}
                              disabled={reseteando === p.id}
                              className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${reseteando === p.id ? "animate-spin" : ""}`} />
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log reciente */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm">
          <div className="px-5 py-4 border-b border-[#B7E4C7]">
            <h2 className="font-semibold text-[#1B4332] text-sm">Log de ejecución reciente</h2>
          </div>
          <div className="p-4 space-y-1.5 font-mono text-xs max-h-60 overflow-y-auto">
            {status.log_reciente.map((l, i) => (
              <div key={i} className={`flex gap-3 px-3 py-1.5 rounded-lg ${LOG_CFG[l.nivel]}`}>
                <span className="opacity-50 flex-shrink-0">{l.ts}</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

        </>}
      </div>
    </AdminLayout>
  );
};

export default AdminScraper;
