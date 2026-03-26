import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, Star, ShieldCheck, Phone, Mail,
  MapPin, ChevronDown, ArrowLeft, X, MessageSquare,
  Users, TrendingUp, Award,
} from "lucide-react";

// Mock — reemplazar con GET /api/valuadores/red (requiere auth)
const RED_VALUADORES = [
  {
    id: "v1",
    nombre: "Ing. Roberto Sánchez Ávila",
    certificaciones: ["INDAABIN", "IMC"],
    ciudad: "Guadalajara",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial"],
    experiencia: 12,
    calificacion: 4.8,
    totalReportes: 143,
    whatsapp: "3312345678",
    email: "roberto.sanchez@propvalu.mx",
    cedula: "0987654",
    plan: "pro",
    disponible: true,
    zonas: ["Guadalajara", "Zapopan", "Tlajomulco"],
  },
  {
    id: "v2",
    nombre: "Arq. María Fernanda López Ortiz",
    certificaciones: ["INDAABIN"],
    ciudad: "Zapopan",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Industrial"],
    experiencia: 8,
    calificacion: 4.6,
    totalReportes: 89,
    whatsapp: "3398765432",
    email: "mf.lopez@propvalu.mx",
    cedula: "1234567",
    plan: "basico",
    disponible: true,
    zonas: ["Zapopan", "Guadalajara"],
  },
  {
    id: "v3",
    nombre: "Ing. Carlos Mendoza Ruiz",
    certificaciones: ["IMC", "CNBV"],
    ciudad: "Tlaquepaque",
    estado: "Jalisco",
    especialidad: ["Comercial", "Industrial"],
    experiencia: 15,
    calificacion: 4.9,
    totalReportes: 287,
    whatsapp: "3387654321",
    email: "c.mendoza@propvalu.mx",
    cedula: "2345678",
    plan: "enterprise",
    disponible: false,
    zonas: ["Tlaquepaque", "Tonalá", "Guadalajara"],
  },
  {
    id: "v4",
    nombre: "Mtra. Ana Patricia Vega Solís",
    certificaciones: ["INDAABIN", "IMC", "CNBV"],
    ciudad: "Tonalá",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial", "Industrial"],
    experiencia: 20,
    calificacion: 5.0,
    totalReportes: 412,
    whatsapp: "3376543210",
    email: "ap.vega@propvalu.mx",
    cedula: "3456789",
    plan: "enterprise",
    disponible: true,
    zonas: ["Tonalá", "Tlaquepaque", "Zapopan", "Guadalajara"],
  },
  {
    id: "v5",
    nombre: "Ing. Luis Felipe Herrera Mora",
    certificaciones: ["IMC"],
    ciudad: "Guadalajara",
    estado: "Jalisco",
    especialidad: ["Habitacional"],
    experiencia: 5,
    calificacion: 4.3,
    totalReportes: 34,
    whatsapp: "3365432109",
    email: "lf.herrera@propvalu.mx",
    cedula: "4567890",
    plan: "basico",
    disponible: true,
    zonas: ["Guadalajara"],
  },
  {
    id: "v6",
    nombre: "Arq. Diana Castillo Fuentes",
    certificaciones: ["INDAABIN"],
    ciudad: "Zapopan",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial"],
    experiencia: 10,
    calificacion: 4.7,
    totalReportes: 115,
    whatsapp: "3354321098",
    email: "d.castillo@propvalu.mx",
    cedula: "5678901",
    plan: "pro",
    disponible: false,
    zonas: ["Zapopan", "Guadalajara", "Tlajomulco"],
  },
];

const CERT_COLOR = {
  INDAABIN: "bg-blue-100 text-blue-700",
  IMC:      "bg-purple-100 text-purple-700",
  CNBV:     "bg-amber-100 text-amber-700",
};

const PLAN_CFG = {
  enterprise: { label: "Enterprise", cls: "bg-[#1B4332] text-white" },
  pro:        { label: "Pro",        cls: "bg-[#D9ED92] text-[#1B4332]" },
  basico:     { label: "Básico",     cls: "bg-slate-100 text-slate-500" },
};

const PLAN_ORDEN = { enterprise: 0, pro: 1, basico: 2 };

const CIUDADES = [...new Set(RED_VALUADORES.map((v) => v.ciudad))].sort();
const ESPECIALIDADES = [...new Set(RED_VALUADORES.flatMap((v) => v.especialidad))].sort();

const ValuadorRedPage = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [ciudadFiltro, setCiudadFiltro] = useState("todas");
  const [espFiltro, setEspFiltro] = useState("todas");
  const [dispFiltro, setDispFiltro] = useState("todos");
  const [seleccionado, setSeleccionado] = useState(null);

  const filtrados = useMemo(() => {
    return RED_VALUADORES
      .filter((v) => {
        const q = busqueda.toLowerCase();
        const matchQ = !q || v.nombre.toLowerCase().includes(q) || v.ciudad.toLowerCase().includes(q) || v.especialidad.some((e) => e.toLowerCase().includes(q));
        const matchC = ciudadFiltro === "todas" || v.ciudad === ciudadFiltro;
        const matchE = espFiltro === "todas" || v.especialidad.includes(espFiltro);
        const matchD = dispFiltro === "todos" || (dispFiltro === "disponible" ? v.disponible : !v.disponible);
        return matchQ && matchC && matchE && matchD;
      })
      .sort((a, b) => PLAN_ORDEN[a.plan] - PLAN_ORDEN[b.plan] || b.calificacion - a.calificacion);
  }, [busqueda, ciudadFiltro, espFiltro, dispFiltro]);

  const stats = {
    total: RED_VALUADORES.length,
    disponibles: RED_VALUADORES.filter((v) => v.disponible).length,
    enterprise: RED_VALUADORES.filter((v) => v.plan === "enterprise").length,
    reportes: RED_VALUADORES.reduce((s, v) => s + v.totalReportes, 0),
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 hover:text-[#1B4332] text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <Building2 className="w-5 h-5 text-[#52B788]" />
              <span className="font-['Outfit'] font-bold text-[#1B4332]">
                Prop<span className="text-[#52B788]">Valu</span>
                <span className="text-xs text-slate-400 font-normal ml-1">· Red de Valuadores</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/valuador")}
            className="text-xs text-[#52B788] font-semibold hover:underline"
          >
            Mi Dashboard →
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-1">Exclusivo para valuadores</p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332]">Red de Valuadores Verificados</h1>
          <p className="text-slate-400 text-sm mt-1">Conecta con colegas verificados, comparte zonas y genera referidos.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Valuadores en red",   val: stats.total,       icon: Users,     color: "bg-blue-100 text-blue-600" },
            { label: "Disponibles ahora",   val: stats.disponibles, icon: TrendingUp, color: "bg-green-100 text-green-600" },
            { label: "Nivel Enterprise",    val: stats.enterprise,  icon: Award,     color: "bg-[#D9ED92] text-[#1B4332]" },
            { label: "Reportes emitidos",   val: stats.reportes.toLocaleString(), icon: ShieldCheck, color: "bg-purple-100 text-purple-600" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
            <input
              type="text"
              placeholder="Buscar por nombre, ciudad o especialidad…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>

          {/* Select ciudad */}
          <div className="relative">
            <select value={ciudadFiltro} onChange={(e) => setCiudadFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todas">Todas las ciudades</option>
              {CIUDADES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Select especialidad */}
          <div className="relative">
            <select value={espFiltro} onChange={(e) => setEspFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todas">Todas las especialidades</option>
              {ESPECIALIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Disponibilidad */}
          <div className="relative">
            <select value={dispFiltro} onChange={(e) => setDispFiltro(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              <option value="todos">Todos</option>
              <option value="disponible">Disponible</option>
              <option value="ocupado">Ocupado</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {busqueda && (
            <button onClick={() => setBusqueda("")} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((v) => {
            const planCfg = PLAN_CFG[v.plan];
            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-[#52B788]/30 transition-all cursor-pointer"
                onClick={() => setSeleccionado(v)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] font-bold text-sm flex-shrink-0">
                    {v.nombre.split(" ").filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map((w) => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1B4332] text-sm leading-tight">{v.nombre}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planCfg.cls}`}>{planCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-300" />
                      <span className="text-xs text-slate-400">{v.ciudad}, {v.estado}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${v.disponible ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {v.disponible ? "Disponible" : "Ocupado"}
                  </span>
                </div>

                {/* Rating + reportes */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-[#1B4332]">{v.calificacion.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-slate-400">{v.totalReportes} reportes</span>
                  <span className="text-xs text-slate-400">{v.experiencia} años exp.</span>
                </div>

                {/* Certificaciones */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.certificaciones.map((c) => (
                    <span key={c} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${CERT_COLOR[c]}`}>
                      <ShieldCheck className="w-2.5 h-2.5" />{c}
                    </span>
                  ))}
                </div>

                {/* Especialidades */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {v.especialidad.map((e) => (
                    <span key={e} className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{e}</span>
                  ))}
                </div>

                {/* Contacto */}
                <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <a
                    href={`https://wa.me/52${v.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 text-xs font-semibold py-2 rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:${v.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold py-2 rounded-xl transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay valuadores con esos filtros</p>
            <button onClick={() => { setBusqueda(""); setCiudadFiltro("todas"); setEspFiltro("todas"); setDispFiltro("todos"); }}
              className="mt-3 text-xs text-[#52B788] hover:underline">Limpiar filtros</button>
          </div>
        )}

        {/* Info banner */}
        <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#52B788]/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[#52B788]" />
          </div>
          <div>
            <p className="font-semibold text-[#1B4332] text-sm mb-1">¿Por qué colaborar con la red?</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Los valuadores de PropValu se refieren mutuamente cuando reciben solicitudes fuera de su zona o especialidad.
              Al colaborar aumentas tus ingresos sin incrementar tu carga de trabajo.
              El sistema de referidos está próximo a lanzarse — aparecerás primero ante clientes de tu zona si tu perfil está completo.
            </p>
          </div>
        </div>
      </div>

      {/* Modal detalle */}
      {seleccionado && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSeleccionado(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] font-bold">
                  {seleccionado.nombre.split(" ").filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map((w) => w[0]).join("")}
                </div>
                <div>
                  <p className="font-bold text-[#1B4332]">{seleccionado.nombre}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_CFG[seleccionado.plan].cls}`}>
                    {PLAN_CFG[seleccionado.plan].label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSeleccionado(null)} className="text-slate-300 hover:text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              {[
                { label: "Ciudad",          val: `${seleccionado.ciudad}, ${seleccionado.estado}` },
                { label: "Experiencia",     val: `${seleccionado.experiencia} años` },
                { label: "Calificación",    val: `${seleccionado.calificacion.toFixed(1)} ★` },
                { label: "Reportes",        val: seleccionado.totalReportes.toLocaleString() },
                { label: "Cédula prof.",    val: seleccionado.cedula },
                { label: "Disponibilidad", val: seleccionado.disponible ? "Disponible" : "Ocupado" },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-semibold text-[#1B4332]">{val}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-1">Zonas de cobertura</p>
              <div className="flex flex-wrap gap-1">
                {seleccionado.zonas.map((z) => (
                  <span key={z} className="text-xs bg-[#D9ED92] text-[#1B4332] font-semibold px-2 py-0.5 rounded-full">{z}</span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-1">Certificaciones</p>
              <div className="flex flex-wrap gap-1">
                {seleccionado.certificaciones.map((c) => (
                  <span key={c} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${CERT_COLOR[c]}`}>
                    <ShieldCheck className="w-2.5 h-2.5" />{c}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://wa.me/52${seleccionado.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#20BA5A] text-sm font-bold py-3 rounded-xl transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={`mailto:${seleccionado.email}`}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1B4332] text-white hover:bg-[#163828] text-sm font-bold py-3 rounded-xl transition-colors"
              >
                <Mail className="w-4 h-4" />
                Enviar email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuadorRedPage;
