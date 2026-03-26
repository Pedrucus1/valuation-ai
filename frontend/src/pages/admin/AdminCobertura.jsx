import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { MapPin, Search, Save, CheckCircle2, ChevronDown, Info } from "lucide-react";

// Schema backend: { municipio, estado, scraper_activo, valuadores_activos, ads_disponible }
const MUNICIPIOS_INICIALES = [
  { municipio: "Guadalajara",     estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  ads_disponible: true  },
  { municipio: "Zapopan",         estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  ads_disponible: true  },
  { municipio: "Tlaquepaque",     estado: "Jalisco", scraper_activo: true,  valuadores_activos: true,  ads_disponible: true  },
  { municipio: "Tonalá",          estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, ads_disponible: false },
  { municipio: "Tlajomulco",      estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, ads_disponible: false },
  { municipio: "El Salto",        estado: "Jalisco", scraper_activo: false, valuadores_activos: false, ads_disponible: false },
  { municipio: "Puerto Vallarta", estado: "Jalisco", scraper_activo: true,  valuadores_activos: false, ads_disponible: false },
  { municipio: "Aguascalientes",  estado: "Ags.",    scraper_activo: true,  valuadores_activos: false, ads_disponible: false },
  { municipio: "León",            estado: "Gto.",    scraper_activo: true,  valuadores_activos: false, ads_disponible: false },
];

const CAPAS = [
  { key: "scraper_activo",    label: "Scraper activo",       color: "text-blue-600 bg-blue-50 border-blue-200",      desc: "Se recopilan comparables de este municipio" },
  { key: "valuadores_activos",label: "Valuadores activos",   color: "text-green-600 bg-green-50 border-green-200",   desc: "Hay valuadores verificados disponibles" },
  { key: "ads_disponible",    label: "Publicidad disponible",color: "text-purple-600 bg-purple-50 border-purple-200", desc: "Los anunciantes pueden targetear este municipio" },
];

const Toggle = ({ activo, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${activo ? "bg-[#52B788]" : "bg-slate-200"}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

const AdminCobertura = () => {
  const [municipios, setMunicipios] = useState(MUNICIPIOS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [guardado, setGuardado] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

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

  const stats = {
    conScraper:    municipios.filter((m) => m.scraper_activo).length,
    conValuadores: municipios.filter((m) => m.valuadores_activos).length,
    conAds:        municipios.filter((m) => m.ads_disponible).length,
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Cobertura Geográfica</h1>
            <p className="text-slate-400 text-sm mt-0.5">Controla qué ciudades tienen scraper, valuadores y publicidad activos</p>
          </div>
          <button
            onClick={guardar}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" />
            {cambiosPendientes ? "Guardar cambios" : "Sin cambios"}
          </button>
        </div>

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Cobertura actualizada correctamente</span>
          </div>
        )}

        {/* KPIs de capas */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Con scraper",    val: stats.conScraper,    total: municipios.length, color: "text-blue-600" },
            { label: "Con valuadores", val: stats.conValuadores, total: municipios.length, color: "text-green-600" },
            { label: "Con publicidad", val: stats.conAds,        total: municipios.length, color: "text-purple-600" },
          ].map(({ label, val, total, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className={`font-['Outfit'] text-2xl font-bold mt-1 ${color}`}>
                {val}{total ? <span className="text-slate-300 text-base font-normal">/{total}</span> : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Leyenda de capas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Capas de cobertura</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CAPAS.map((c) => (
              <div key={c.key} className={`flex items-start gap-2 border rounded-xl px-4 py-3 ${c.color}`}>
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">{c.label}</p>
                  <p className="text-[11px] opacity-70 leading-snug">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar municipio o estado..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          <div className="relative">
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todos">Todos</option>
              <option value="activo">Con alguna capa activa</option>
              <option value="inactivo">Sin cobertura</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {/* Acciones masivas */}
          <div className="flex gap-2 ml-auto">
            {CAPAS.map((c) => (
              <button key={c.key}
                onClick={() => activarTodos(c.key, true)}
                className="text-xs text-slate-500 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition-colors">
                Activar todos {c.label.split(" ")[0].toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de municipios */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Municipio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wide">Scraper</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Valuadores</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-purple-600 uppercase tracking-wide">Ads</th>
                    </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((m) => (
                  <tr key={m.municipio} className={`transition-colors ${m.scraper_activo || m.valuadores_activos || m.ads_disponible ? "hover:bg-slate-50/50" : "bg-slate-50/30 hover:bg-slate-50"}`}>
                    <td className="px-5 py-3 font-semibold text-sm text-[#1B4332]">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${m.scraper_activo || m.valuadores_activos ? "text-[#52B788]" : "text-slate-300"}`} />
                        {m.municipio}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{m.estado}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Toggle activo={m.scraper_activo} onChange={() => toggle(m.municipio, "scraper_activo")} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Toggle activo={m.valuadores_activos} onChange={() => toggle(m.municipio, "valuadores_activos")} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Toggle activo={m.ads_disponible} onChange={() => toggle(m.municipio, "ads_disponible")} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota para anunciantes */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          Los municipios con <strong>Ads desactivado</strong> no aparecerán en el selector de zona geográfica al registrar un anuncio. Los cambios de cobertura se reflejan inmediatamente en el formulario de anunciantes.
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCobertura;
