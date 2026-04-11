import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  MapPin, Search, Save, CheckCircle2, ChevronDown, Info,
  Plus, Globe, Trash2, RefreshCw, Edit2, X, Database, Users, Megaphone, Building2,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

// Schema backend: { municipio, estado, scraper_activo, valuadores_activos, inmobiliarias_activas, ads_disponible, n_valuadores, n_inmobiliarias, n_anuncios }
const MUNICIPIOS_INICIALES = [
  { municipio: "Guadalajara",     estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  inmobiliarias_activas: true,  ads_disponible: true,  n_valuadores: 12, n_inmobiliarias: 8,  n_anuncios: 5  },
  { municipio: "Zapopan",         estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  inmobiliarias_activas: true,  ads_disponible: true,  n_valuadores: 7,  n_inmobiliarias: 5,  n_anuncios: 3  },
  { municipio: "Tlaquepaque",     estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  inmobiliarias_activas: true,  ads_disponible: true,  n_valuadores: 4,  n_inmobiliarias: 3,  n_anuncios: 2  },
  { municipio: "Tonalá",          estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 2,  n_inmobiliarias: 1,  n_anuncios: 0  },
  { municipio: "Tlajomulco",      estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 1,  n_inmobiliarias: 0,  n_anuncios: 0  },
  { municipio: "El Salto",        estado: "Jalisco", scraper_activo: false, valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 0,  n_inmobiliarias: 0,  n_anuncios: 0  },
  { municipio: "Puerto Vallarta", estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 3,  n_inmobiliarias: 2,  n_anuncios: 0  },
  { municipio: "Aguascalientes",  estado: "Ags.",    scraper_activo: true,  valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 2,  n_inmobiliarias: 1,  n_anuncios: 0  },
  { municipio: "León",            estado: "Gto.",    scraper_activo: true,  valuadores_activos: false, inmobiliarias_activas: false, ads_disponible: false, n_valuadores: 1,  n_inmobiliarias: 1,  n_anuncios: 0  },
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
  { id: "gdl",   municipio: "Guadalajara",      estado: "Jalisco",         portales: ["Inmuebles24","Vivanuncios","Lamudi","Propiedades.com"], status: "activa",    prioridad: "alta",  propiedades: 4820 },
  { id: "zap",   municipio: "Zapopan",          estado: "Jalisco",         portales: ["Inmuebles24","Vivanuncios","Lamudi"],                  status: "activa",    prioridad: "alta",  propiedades: 3210 },
  { id: "tlaq",  municipio: "Tlaquepaque",      estado: "Jalisco",         portales: ["Inmuebles24","Vivanuncios"],                          status: "activa",    prioridad: "media", propiedades: 1540 },
  { id: "pvall", municipio: "Puerto Vallarta",  estado: "Jalisco",         portales: ["Inmuebles24","Lamudi"],                               status: "activa",    prioridad: "media", propiedades: 980  },
  { id: "ags",   municipio: "Aguascalientes",   estado: "Aguascalientes",  portales: ["Inmuebles24"],                                        status: "activa",    prioridad: "baja",  propiedades: 620  },
  { id: "leon",  municipio: "León",             estado: "Guanajuato",      portales: ["Inmuebles24","Vivanuncios"],                          status: "activa",    prioridad: "baja",  propiedades: 740  },
  { id: "mty",   municipio: "Monterrey",        estado: "Nuevo León",      portales: [],                                                     status: "pendiente", prioridad: "alta",  propiedades: 0    },
  { id: "cdmx",  municipio: "Ciudad de México", estado: "Ciudad de México", portales: [],                                                    status: "pendiente", prioridad: "alta",  propiedades: 0    },
];

const STATUS_CFG = {
  activa:    { label: "Activa",    cls: "bg-green-100 text-green-700"  },
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700"  },
  prueba:    { label: "En prueba", cls: "bg-blue-100 text-blue-700"    },
  pausada:   { label: "Pausada",   cls: "bg-slate-100 text-slate-500"  },
};

const PRIORIDAD_CFG = {
  alta:  { cls: "bg-red-100 text-red-600",    dot: "bg-red-400"    },
  media: { cls: "bg-amber-100 text-amber-700",dot: "bg-amber-400"  },
  baja:  { cls: "bg-slate-100 text-slate-500",dot: "bg-slate-300"  },
};

const Toggle = ({ activo, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${activo ? "bg-[#52B788]" : "bg-slate-200"}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

/* ─── Tab Zonas objetivo ─── */
const ZonasObjetivo = () => {
  const [zonas, setZonas] = useState(ZONAS_INICIALES);
  const [form, setForm] = useState({ municipio: "", estado: "Jalisco", portales: [], prioridad: "media" });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [testando, setTestando] = useState(null);
  const [editando, setEditando] = useState(null); // zona siendo editada

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

  const abrirEditar = (zona) => setEditando({ ...zona, portalesEdit: [...zona.portales] });

  const guardarEditar = () => {
    setZonas((z) => z.map((zona) =>
      zona.id === editando.id
        ? { ...zona, municipio: editando.municipio, estado: editando.estado, portales: editando.portalesEdit, prioridad: editando.prioridad }
        : zona
    ));
    setEditando(null);
  };

  const togglePortalEdit = (p) => setEditando((e) => ({
    ...e,
    portalesEdit: e.portalesEdit.includes(p) ? e.portalesEdit.filter((x) => x !== p) : [...e.portalesEdit, p],
  }));

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

  const activas    = zonas.filter((z) => z.status === "activa").length;
  const pendientes = zonas.filter((z) => z.status === "pendiente").length;
  const totalProp  = zonas.reduce((s, z) => s + (z.propiedades || 0), 0);

  return (
    <div className="space-y-5">

      <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl px-4 py-3 text-xs text-slate-600 flex items-start gap-2">
        <Globe className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1B4332]">Zonas objetivo del scraper</strong> — Define qué municipios y portales incluirá el scraper.
          Agrega ciudades en <em>Pendiente</em>, configura sus portales, pruébalas y actívalas cuando estés listo.
          Los cambios afectan los próximos ciclos de scraping, no el actual.
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Zonas activas",          val: activas,                  color: "text-green-600" },
          { label: "Pendientes de activar",   val: pendientes,               color: "text-amber-600" },
          { label: "Propiedades indexadas",   val: totalProp.toLocaleString(), color: "text-[#1B4332]" },
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
                    <td className="px-4 py-3 font-semibold text-sm text-[#1B4332]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0" />{z.municipio}
                      </div>
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
                            {testando === z.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            Probar
                          </button>
                        )}
                        <button onClick={() => abrirEditar(z)}
                          className="p-1.5 text-slate-400 hover:text-[#1B4332] hover:bg-[#F0FAF5] rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => eliminar(z.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Modal editar zona */}
      {editando && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-[#1B4332]">Editar zona</h2>
              <button onClick={() => setEditando(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Municipio</label>
                <input type="text" value={editando.municipio}
                  onChange={(e) => setEditando((p) => ({ ...p, municipio: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado</label>
                <select value={editando.estado}
                  onChange={(e) => setEditando((p) => ({ ...p, estado: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                  {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
              <select value={editando.prioridad}
                onChange={(e) => setEditando((p) => ({ ...p, prioridad: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                <option value="alta">Alta — ciudad principal</option>
                <option value="media">Media — ciudad secundaria</option>
                <option value="baja">Baja — exploración</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Portales</label>
              <div className="flex flex-wrap gap-2">
                {PORTALES_DISPONIBLES.map((p) => (
                  <button key={p} type="button" onClick={() => togglePortalEdit(p)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                      editando.portalesEdit.includes(p)
                        ? "bg-[#1B4332] text-white border-[#1B4332]"
                        : "border-slate-200 text-slate-600 hover:border-[#52B788]"
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={guardarEditar}
                className="flex-1 bg-[#1B4332] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#163828] transition-colors">
                Guardar cambios
              </button>
              <button onClick={() => setEditando(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Tab Cobertura activa ─── */
const CoberturaActiva = () => {
  const [municipios, setMunicipios] = useState(MUNICIPIOS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [guardado, setGuardado] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [formNueva, setFormNueva] = useState({ municipio: "", estado: "Jalisco" });
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/zonas-cobertura")
      .then((data) => { if (data.zonas?.length) setMunicipios(data.zonas); })
      .catch(() => {});
  }, []);

  const filtrados = useMemo(() => municipios.filter((m) => {
    const matchQ = !busqueda || m.municipio.toLowerCase().includes(busqueda.toLowerCase()) || m.estado.toLowerCase().includes(busqueda.toLowerCase());
    const matchE = estadoFiltro === "todos"
      || (estadoFiltro === "activo" && (m.scraper_activo || m.valuadores_activos || m.ads_disponible))
      || (estadoFiltro === "inactivo" && !m.scraper_activo && !m.valuadores_activos && !m.ads_disponible);
    return matchQ && matchE;
  }), [municipios, busqueda, estadoFiltro]);

  const toggle = (municipio, capa) => {
    setMunicipios((p) => p.map((m) => m.municipio === municipio ? { ...m, [capa]: !m[capa] } : m));
    setCambiosPendientes(true);
  };

  const guardar = async () => {
    try {
      await adminFetch("/api/admin/zonas-cobertura", {
        method: "PUT",
        body: JSON.stringify({ zonas: municipios }),
      });
      setGuardado(true);
      setCambiosPendientes(false);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  const activarTodos = (capa, valor) => {
    setMunicipios((p) => p.map((m) => ({ ...m, [capa]: valor })));
    setCambiosPendientes(true);
  };

  const agregarCiudad = () => {
    if (!formNueva.municipio.trim()) return;
    if (municipios.some((m) => m.municipio.toLowerCase() === formNueva.municipio.trim().toLowerCase())) return;
    setMunicipios((p) => [...p, {
      municipio: formNueva.municipio.trim(),
      estado: formNueva.estado,
      scraper_activo: false,
      valuadores_activos: false,
      inmobiliarias_activas: false,
      ads_disponible: false,
      n_valuadores: 0,
      n_inmobiliarias: 0,
      n_anuncios: 0,
    }]);
    setFormNueva({ municipio: "", estado: "Jalisco" });
    setMostrarForm(false);
    setCambiosPendientes(true);
  };

  const eliminarCiudad = (municipio) => {
    if (!confirm(`¿Eliminar ${municipio} de la cobertura?`)) return;
    setMunicipios((p) => p.filter((m) => m.municipio !== municipio));
    setCambiosPendientes(true);
  };

  const stats = {
    conScraper:        municipios.filter((m) => m.scraper_activo).length,
    conValuadores:     municipios.filter((m) => m.valuadores_activos).length,
    conInmobiliarias:  municipios.filter((m) => m.inmobiliarias_activas).length,
    conAds:            municipios.filter((m) => m.ads_disponible).length,
  };

  return (
    <div className="space-y-4">

      {guardado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-xs text-green-700 font-semibold">Cobertura actualizada correctamente</span>
        </div>
      )}

      {/* Panel de controles — todo en una fila */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm px-4 py-2.5 flex flex-wrap gap-2 items-center">

        {/* Buscar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ciudad..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl w-40 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
        </div>

        {/* Filtro */}
        <div className="relative">
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
            className="appearance-none text-xs border border-slate-200 rounded-xl pl-2.5 pr-7 py-1.5 text-slate-600 bg-white focus:outline-none">
            <option value="todos">Todas</option>
            <option value="activo">Con capa activa</option>
            <option value="inactivo">Sin cobertura</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Separador */}
        <span className="w-px h-4 bg-slate-100" />

        {/* Activar todos — icono + etiqueta corta con color */}
        <button onClick={() => activarTodos("scraper_activo", true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
          <Database className="w-3 h-3" /> Scraper
        </button>
        <button onClick={() => activarTodos("valuadores_activos", true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-green-600 border border-green-200 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
          <Users className="w-3 h-3" /> Valuad.
        </button>
        <button onClick={() => activarTodos("inmobiliarias_activas", true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
          <Building2 className="w-3 h-3" /> Inmob.
        </button>
        <button onClick={() => activarTodos("ads_disponible", true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 border border-purple-200 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
          <Megaphone className="w-3 h-3" /> Ads
        </button>

        {/* Separador */}
        <span className="w-px h-4 bg-slate-100" />

        {/* Estadísticas inline */}
        <span className="text-[11px] text-blue-500 font-semibold">{stats.conScraper} scraper</span>
        <span className="text-[11px] text-green-600 font-semibold">{stats.conValuadores} val.</span>
        <span className="text-[11px] text-orange-500 font-semibold">{stats.conInmobiliarias} inmob.</span>
        <span className="text-[11px] text-purple-500 font-semibold">{stats.conAds} ads</span>
        <span className="text-[11px] text-slate-400">/ {municipios.length} ciudades</span>

        {/* Acciones — al final */}
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setMostrarForm((v) => !v)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${mostrarForm ? "bg-[#1B4332] text-white border-[#1B4332]" : "text-[#1B4332] border-[#B7E4C7] hover:bg-[#F0FAF5]"}`}>
            <Plus className="w-3.5 h-3.5" /> Ciudad
          </button>
          <button onClick={guardar} disabled={!cambiosPendientes}
            className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-35 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
            <Save className="w-3.5 h-3.5" />
            {cambiosPendientes ? "Guardar" : "Guardado"}
          </button>
        </div>
      </div>

      {/* Agregar ciudad — fila compacta */}
      {mostrarForm && (
        <div className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-2xl px-4 py-3 flex flex-wrap gap-2 items-center">
          <input type="text" value={formNueva.municipio}
            onChange={(e) => setFormNueva((p) => ({ ...p, municipio: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && agregarCiudad()}
            placeholder="Nombre del municipio / ciudad"
            className="border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          <div className="relative">
            <select value={formNueva.estado}
              onChange={(e) => setFormNueva((p) => ({ ...p, estado: e.target.value }))}
              className="appearance-none border border-slate-200 bg-white rounded-xl pl-3 pr-7 py-1.5 text-xs focus:outline-none w-48">
              {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-400 flex-1 hidden sm:block">Se agrega con todas las capas desactivadas</span>
          <div className="flex gap-1.5">
            <button onClick={agregarCiudad} disabled={!formNueva.municipio.trim()}
              className="flex items-center gap-1 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
            <button onClick={() => { setMostrarForm(false); setFormNueva({ municipio: "", estado: "Jalisco" }); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 bg-white rounded-xl transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabla de municipios */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide">Municipio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-wide">Estado</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-blue-200 uppercase tracking-wide">Scraper</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-green-200 uppercase tracking-wide">Val. habilitados</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-orange-200 uppercase tracking-wide">Inmob. habilitadas</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-purple-200 uppercase tracking-wide">Ads habilitados</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-white/60 uppercase tracking-wide">Valuadores</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-white/60 uppercase tracking-wide">Inmobiliarias</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-white/60 uppercase tracking-wide">Anuncios</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((m) => (
                <tr key={m.municipio} className={`transition-colors ${m.scraper_activo || m.valuadores_activos || m.ads_disponible ? "hover:bg-slate-50/50" : "bg-slate-50/30 hover:bg-slate-50"}`}>
                  <td className="px-5 py-3 font-semibold text-sm text-[#1B4332]">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${m.scraper_activo || m.valuadores_activos ? "text-[#52B788]" : "text-slate-300"}`} />
                      {m.municipio}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{m.estado}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle activo={m.scraper_activo} onChange={() => toggle(m.municipio, "scraper_activo")} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle activo={m.valuadores_activos} onChange={() => toggle(m.municipio, "valuadores_activos")} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle activo={m.inmobiliarias_activas} onChange={() => toggle(m.municipio, "inmobiliarias_activas")} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle activo={m.ads_disponible} onChange={() => toggle(m.municipio, "ads_disponible")} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.n_valuadores > 0
                      ? <span className="text-sm font-bold text-green-600">{m.n_valuadores}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.n_inmobiliarias > 0
                      ? <span className="text-sm font-bold text-[#1B4332]">{m.n_inmobiliarias}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.n_anuncios > 0
                      ? <span className="text-sm font-bold text-purple-600">{m.n_anuncios}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => eliminarCiudad(m.municipio)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota ads */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
        <Info className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
        Ciudades con <strong className="text-slate-500">Ads deshabilitado</strong> no aparecen en el selector de zona al publicar un anuncio.
      </div>
    </div>
  );
};

const TABS = [
  { id: "cobertura", label: "Cobertura activa" },
  { id: "zonas",     label: "Zonas objetivo (scraper)" },
];

const AdminCobertura = () => {
  const [activeTab, setActiveTab] = useState("cobertura");

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        <PageHeader icon={MapPin} title="Cobertura Geográfica"
          subtitle="Controla ciudades activas y planifica la expansión del scraper" />

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

        {activeTab === "cobertura" && <CoberturaActiva />}
        {activeTab === "zonas"     && <ZonasObjetivo />}

      </div>
    </AdminLayout>
  );
};

export default AdminCobertura;
