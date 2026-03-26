import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, MapPin, Star, ShieldCheck, Phone, Mail,
  ChevronDown, ArrowLeft, ExternalLink, Filter, X
} from "lucide-react";

// Mock data — reemplazar con fetch a /api/valuadores cuando exista el endpoint
const VALUADORES = [
  {
    id: "v1",
    nombre: "Ing. Roberto Sánchez Ávila",
    foto: null,
    certificaciones: ["INDAABIN", "IMC"],
    ciudad: "Guadalajara",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial"],
    experiencia: 12,
    calificacion: 4.8,
    totalReportes: 143,
    whatsapp: "3312345678",
    email: "roberto.sanchez@email.com",
    cedula: "0987654",
    plan: "pro",
  },
  {
    id: "v2",
    nombre: "Arq. María Fernanda López Ortiz",
    foto: null,
    certificaciones: ["INDAABIN"],
    ciudad: "Zapopan",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Industrial"],
    experiencia: 8,
    calificacion: 4.6,
    totalReportes: 89,
    whatsapp: "3398765432",
    email: "mf.lopez@email.com",
    cedula: "1234567",
    plan: "basico",
  },
  {
    id: "v3",
    nombre: "Ing. Carlos Mendoza Ruiz",
    foto: null,
    certificaciones: ["IMC", "CNBV"],
    ciudad: "Tlaquepaque",
    estado: "Jalisco",
    especialidad: ["Comercial", "Industrial"],
    experiencia: 15,
    calificacion: 4.9,
    totalReportes: 212,
    whatsapp: "3356781234",
    email: "cmendoza@email.com",
    cedula: "3456789",
    plan: "pro",
  },
  {
    id: "v4",
    nombre: "Arq. Sofía Torres Herrera",
    foto: null,
    certificaciones: ["INDAABIN"],
    ciudad: "Tonalá",
    estado: "Jalisco",
    especialidad: ["Habitacional"],
    experiencia: 5,
    calificacion: 4.4,
    totalReportes: 34,
    whatsapp: "3367894561",
    email: "sofia.torres@email.com",
    cedula: "5678901",
    plan: "basico",
  },
  {
    id: "v5",
    nombre: "Ing. Jorge Ramírez Castro",
    foto: null,
    certificaciones: ["INDAABIN", "IMC", "CNBV"],
    ciudad: "Puerto Vallarta",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial", "Turístico"],
    experiencia: 20,
    calificacion: 5.0,
    totalReportes: 378,
    whatsapp: "3221234567",
    email: "jorge.ramirez@email.com",
    cedula: "6789012",
    plan: "enterprise",
  },
  {
    id: "v6",
    nombre: "Arq. Claudia Vega Morales",
    foto: null,
    certificaciones: ["IMC"],
    ciudad: "Guadalajara",
    estado: "Jalisco",
    especialidad: ["Habitacional", "Comercial"],
    experiencia: 10,
    calificacion: 4.7,
    totalReportes: 97,
    whatsapp: "3334567890",
    email: "claudia.vega@email.com",
    cedula: "7890123",
    plan: "pro",
  },
];

const CIUDADES = ["Todas", ...new Set(VALUADORES.map((v) => v.ciudad))];
const CERTIFICACIONES = ["Todas", "INDAABIN", "IMC", "CNBV"];
const ESPECIALIDADES = ["Todas", "Habitacional", "Comercial", "Industrial", "Turístico"];

const CERT_COLORS = {
  INDAABIN: "bg-blue-100 text-blue-700",
  IMC: "bg-purple-100 text-purple-700",
  CNBV: "bg-orange-100 text-orange-700",
};

const PLAN_BADGE = {
  enterprise: { label: "Enterprise", cls: "bg-[#1B4332] text-white" },
  pro: { label: "Pro", cls: "bg-[#52B788] text-white" },
  basico: { label: "Verificado", cls: "bg-slate-100 text-slate-600" },
};

const Estrellas = ({ valor }) => (
  <span className="text-yellow-400 text-sm">
    {"★".repeat(Math.floor(valor))}
    {valor % 1 >= 0.5 ? "½" : ""}
    <span className="text-slate-200">{"★".repeat(5 - Math.ceil(valor))}</span>
  </span>
);

const TarjetaValuador = ({ v }) => {
  const iniciales = v.nombre
    .split(" ")
    .slice(1, 3)
    .map((p) => p[0])
    .join("");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-[#D9ED92] flex items-center justify-center text-[#1B4332] font-bold text-lg flex-shrink-0">
          {v.foto ? (
            <img src={v.foto} alt={v.nombre} className="w-full h-full rounded-full object-cover" />
          ) : (
            iniciales
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-sm leading-snug">
                {v.nombre}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-xs">
                <MapPin className="w-3 h-3" />
                {v.ciudad}, {v.estado}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${PLAN_BADGE[v.plan].cls}`}>
              {PLAN_BADGE[v.plan].label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Estrellas valor={v.calificacion} />
            <span className="text-xs text-slate-500">
              {v.calificacion.toFixed(1)} · {v.totalReportes} reportes
            </span>
          </div>
        </div>
      </div>

      {/* Certificaciones */}
      <div className="flex flex-wrap gap-1.5">
        {v.certificaciones.map((c) => (
          <span key={c} className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${CERT_COLORS[c]}`}>
            <ShieldCheck className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5" />
            {c}
          </span>
        ))}
        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
          {v.experiencia} años exp.
        </span>
      </div>

      {/* Especialidades */}
      <div className="flex flex-wrap gap-1">
        {v.especialidad.map((e) => (
          <span key={e} className="text-[10px] text-slate-500 bg-[#F8F9FA] border border-slate-100 px-2 py-0.5 rounded-lg">
            {e}
          </span>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50">
        <a
          href={`https://wa.me/52${v.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl py-2.5 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          WhatsApp
        </a>
        <a
          href={`mailto:${v.email}`}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1B4332] border border-[#52B788]/40 hover:bg-[#52B788]/10 rounded-xl py-2.5 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </a>
      </div>
    </div>
  );
};

const ValuadoresDirectorioPage = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [ciudad, setCiudad] = useState("Todas");
  const [cert, setCert] = useState("Todas");
  const [especialidad, setEspecialidad] = useState("Todas");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const filtrados = useMemo(() => {
    return VALUADORES.filter((v) => {
      const matchBusq =
        !busqueda ||
        v.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.ciudad.toLowerCase().includes(busqueda.toLowerCase());
      const matchCiudad = ciudad === "Todas" || v.ciudad === ciudad;
      const matchCert = cert === "Todas" || v.certificaciones.includes(cert);
      const matchEsp = especialidad === "Todas" || v.especialidad.includes(especialidad);
      return matchBusq && matchCiudad && matchCert && matchEsp;
    }).sort((a, b) => {
      // Enterprise y Pro primero, luego por calificación
      const planOrder = { enterprise: 0, pro: 1, basico: 2 };
      if (planOrder[a.plan] !== planOrder[b.plan]) return planOrder[a.plan] - planOrder[b.plan];
      return b.calificacion - a.calificacion;
    });
  }, [busqueda, ciudad, cert, especialidad]);

  const hayFiltros = ciudad !== "Todas" || cert !== "Todas" || especialidad !== "Todas";

  const limpiarFiltros = () => {
    setCiudad("Todas");
    setCert("Todas");
    setEspecialidad("Todas");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1B4332] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Building2 className="w-5 h-5 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">
            Red de peritos · Directorio público
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Valuadores Verificados
          </h1>
          <p className="text-slate-500 text-sm">
            Todos los peritos listados tienen cédula profesional SEP verificada y certificación
            activa (INDAABIN, IMC y/o CNBV).
          </p>
        </div>

        {/* Búsqueda y filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o ciudad..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788]"
              />
            </div>
            <button
              onClick={() => setMostrarFiltros((p) => !p)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                mostrarFiltros || hayFiltros
                  ? "border-[#52B788] bg-[#52B788]/10 text-[#1B4332]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hayFiltros && (
                <span className="w-2 h-2 rounded-full bg-[#52B788] inline-block" />
              )}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Ciudad", value: ciudad, setter: setCiudad, opts: CIUDADES },
                { label: "Certificación", value: cert, setter: setCert, opts: CERTIFICACIONES },
                { label: "Especialidad", value: especialidad, setter: setEspecialidad, opts: ESPECIALIDADES },
              ].map(({ label, value, setter, opts }) => (
                <div key={label} className="relative">
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788] pr-8"
                  >
                    {opts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              ))}
            </div>
          )}

          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contador */}
        <p className="text-xs text-slate-400 mb-4">
          {filtrados.length} valuador{filtrados.length !== 1 ? "es" : ""} encontrado
          {filtrados.length !== 1 ? "s" : ""}
        </p>

        {/* Grid */}
        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron valuadores con esos criterios.</p>
            <button
              onClick={() => { setBusqueda(""); limpiarFiltros(); }}
              className="mt-3 text-[#52B788] text-sm hover:underline"
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((v) => (
              <TarjetaValuador key={v.id} v={v} />
            ))}
          </div>
        )}

        {/* CTA ¿Eres valuador? */}
        <div className="mt-12 bg-[#1B4332] rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[#D9ED92] text-xs font-bold uppercase tracking-widest mb-1">
              ¿Eres perito valuador?
            </p>
            <h2 className="font-['Outfit'] text-xl font-bold text-white mb-1">
              Únete a la red de valuadores PropValu
            </h2>
            <p className="text-white/70 text-sm">
              Recibe encargos, publica tu perfil y gestiona reportes con IA.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => navigate("/para-valuadores")}
              className="flex items-center gap-2 bg-[#D9ED92] hover:bg-[#c5d97e] text-[#1B4332] font-bold text-sm px-5 py-3 rounded-xl transition-colors"
            >
              Ver planes
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ValuadoresDirectorioPage;
