import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, MapPin, Star, ShieldCheck, Phone, Mail,
  ChevronDown, ChevronUp, ArrowLeft, ExternalLink, Filter, X,
  MessageSquare, Send,
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

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
    badges: ["identidad", "cedula", "exp", "efirma", "avaluos", "curriculum"],
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
    badges: ["identidad", "cedula"],
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
    badges: ["identidad", "cedula", "exp", "efirma", "seguro_rc", "avaluos", "curriculum", "domicilio"],
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
    badges: ["identidad", "cedula"],
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
    badges: ["identidad", "cedula", "exp", "efirma", "rfc", "seguro_rc", "domicilio", "recomendado", "curriculum", "avaluos"],
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
    badges: ["identidad", "cedula", "exp", "efirma", "avaluos"],
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

// Medallitas para el perfil público — en orden de prioridad visual
const CREDENTIAL_BADGES = {
  cedula:     { emoji: "🎓", label: "Cédula SEP verificada",         bg: "bg-purple-100",  ring: "ring-purple-300" },
  exp:        { emoji: "📅", label: "Experiencia comprobada",         bg: "bg-rose-100",    ring: "ring-rose-300" },
  efirma:     { emoji: "✍️", label: "e.firma SAT vigente",           bg: "bg-indigo-100",  ring: "ring-indigo-300" },
  seguro_rc:  { emoji: "🛡️", label: "Seguro de responsabilidad civil", bg: "bg-orange-100",  ring: "ring-orange-300" },
  avaluos:    { emoji: "📊", label: "Avalúos de muestra verificados", bg: "bg-emerald-100", ring: "ring-emerald-300" },
};

const PLAN_BADGE = {
  enterprise: { label: "Enterprise", cls: "bg-[#1B4332] text-white" },
  pro: { label: "Pro", cls: "bg-[#52B788] text-white" },
  basico: { label: "Verificado", cls: "bg-slate-100 text-slate-600" },
};

const medallaExperiencia = (años) => {
  if (años >= 10) return { emoji: "🥇", label: "Oro",   cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-300",   title: `${años} años — Nivel Oro` };
  if (años >= 3)  return { emoji: "🥈", label: "Plata", cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-300",  title: `${años} años — Nivel Plata` };
  if (años >= 1)  return { emoji: "🥉", label: "Bronce",cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-300",title: `${años} años — Nivel Bronce` };
  return null;
};

const Estrellas = ({ valor, interactive = false, onSelect }) => {
  const [hover, setHover] = useState(0);
  if (!interactive) return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(Math.floor(valor))}
      {valor % 1 >= 0.5 ? "½" : ""}
      <span className="text-slate-200">{"★".repeat(5 - Math.ceil(valor))}</span>
    </span>
  );
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onSelect(n)} className="text-2xl transition-transform hover:scale-110">
          <span className={(hover || valor) >= n ? "text-yellow-400" : "text-slate-200"}>★</span>
        </button>
      ))}
    </div>
  );
};

const ModalResenaValuador = ({ perfil, onClose, onEnviada }) => {
  const [cal, setCal] = useState(0);
  const [comentario, setComentario] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const handleEnviar = async () => {
    if (!cal) { toast.error("Selecciona una calificación"); return; }
    if (!comentario.trim()) { toast.error("Escribe un comentario"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/directorio/valuadores/${perfil.id || perfil.email}/resena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion: cal, comentario: comentario.trim(), nombre_cliente: nombre.trim() || "Anónimo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      toast.success("¡Gracias por tu reseña!");
      onEnviada();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1B4332]">Calificar valuador</h3>
            <p className="text-sm text-slate-500">{perfil.nombre || perfil.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">¿Cómo calificarías el servicio? *</p>
            <Estrellas valor={cal} interactive onSelect={setCal} />
            <p className="text-sm text-slate-400 mt-1">{["","Malo","Regular","Bueno","Muy bueno","Excelente"][cal]}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Tu comentario *</label>
            <textarea rows={3} placeholder="Cuenta tu experiencia — puntualidad, calidad del reporte, trato..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-[#52B788] focus:outline-none resize-none bg-[#F0FAF5]"
              value={comentario} onChange={e => setComentario(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Tu nombre <span className="font-normal text-slate-400">(opcional)</span></label>
            <input type="text" placeholder="ej. Juan Pérez (o déjalo en blanco para Anónimo)"
              className="w-full h-9 text-sm border border-slate-200 rounded-xl px-3 focus:border-[#52B788] focus:outline-none bg-[#F0FAF5]"
              value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <button onClick={handleEnviar} disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />{loading ? "Enviando..." : "Publicar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TarjetaValuador = ({ v, onCalificar }) => {
  const [expandida, setExpandida] = useState(false);
  const [resenas, setResenas] = useState([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);

  const cargarResenas = async () => {
    if (resenas.length > 0) { setExpandida(e => !e); return; }
    setCargandoResenas(true);
    try {
      const res = await fetch(`${API}/directorio/valuadores/${v.id || v.email}/resenas`);
      const data = await res.json();
      setResenas(data);
      setExpandida(true);
    } catch { setExpandida(e => !e); }
    finally { setCargandoResenas(false); }
  };

  // Compatibilidad datos reales (name, estado) y mock (nombre, ciudad)
  const nombre = v.name || v.nombre || "";
  const zona = v.municipio ? `${v.municipio}, ${v.estado}` : v.estado || v.ciudad || "—";
  const calificacion = v.calificacion_promedio ?? v.calificacion ?? 0;
  const totalResenas = v.total_resenas ?? v.totalReportes ?? 0;
  const whatsapp = v.phone || v.whatsapp || "";
  const experienciaNum = (() => {
    if (typeof v.experiencia === "number") return v.experiencia;
    const exp = v.q_experiencia || "";
    if (exp.includes("10")) return 12;
    if (exp.includes("5-10")) return 7;
    if (exp.includes("3-5")) return 4;
    if (exp.includes("1-3")) return 2;
    return 0;
  })();

  const iniciales = nombre.split(" ").slice(0, 2).map(p => p[0]).join("");

  const planBadge = PLAN_BADGE[v.plan] || PLAN_BADGE.basico;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-[#D9ED92] flex items-center justify-center text-[#1B4332] font-bold text-lg flex-shrink-0 overflow-hidden">
          {v.foto_url
            ? <img src={v.foto_url} alt={nombre} className="w-full h-full object-cover" />
            : iniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-sm leading-snug truncate">{nombre}</h3>
              <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-xs">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{zona}</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${planBadge.cls}`}>
              {planBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Estrellas valor={calificacion} />
            <span className="text-xs text-slate-500">
              {calificacion > 0 ? `${calificacion.toFixed(1)} · ` : ""}{totalResenas} reseña{totalResenas !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Experiencia + badges */}
      <div className="flex flex-wrap gap-1.5">
        {(() => {
          const m = medallaExperiencia(experienciaNum);
          return m ? (
            <span title={m.title} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}>
              {m.emoji} {v.q_experiencia || `${experienciaNum} años`}
            </span>
          ) : v.q_experiencia ? (
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{v.q_experiencia}</span>
          ) : null;
        })()}
        {v.kyc_status === "approved" && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="w-2.5 h-2.5" /> Verificado
          </span>
        )}
      </div>

      {/* Medallitas de credenciales */}
      {v.badges?.length > 0 && (
        <div className="flex items-center gap-1.5">
          {Object.entries(CREDENTIAL_BADGES)
            .filter(([key]) => v.badges.includes(key))
            .map(([key, b]) => (
              <span key={key} title={b.label}
                className={`w-7 h-7 rounded-full ${b.bg} ring-1 ${b.ring} flex items-center justify-center text-sm cursor-default`}>
                {b.emoji}
              </span>
            ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50">
        {whatsapp && (
          <a href={`https://wa.me/52${whatsapp}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl py-2.5 transition-colors">
            <Phone className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
        {v.email && (
          <a href={`mailto:${v.email}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1B4332] border border-[#52B788]/40 hover:bg-[#52B788]/10 rounded-xl py-2.5 transition-colors">
            <Mail className="w-3.5 h-3.5" /> Email
          </a>
        )}
        <button onClick={() => onCalificar(v)}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-yellow-600 border border-yellow-200 hover:bg-yellow-50 rounded-xl px-3 py-2.5 transition-colors">
          <Star className="w-3.5 h-3.5" /> Calificar
        </button>
      </div>

      {/* Reseñas expandibles */}
      <div className="border-t border-slate-50 mt-2">
        <button onClick={cargarResenas}
          className="w-full flex items-center justify-between px-2 py-2.5 text-xs text-slate-500 hover:text-[#1B4332] hover:bg-[#F0FAF5] transition-colors rounded-b-2xl">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {cargandoResenas ? "Cargando..." : `Ver reseñas (${v.totalReportes || 0})`}
          </span>
          {expandida ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandida && (
          <div className="px-2 pb-3 space-y-2">
            {resenas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Aún no hay reseñas en línea.</p>
            ) : resenas.map((r, i) => (
              <div key={i} className="bg-[#F8F9FA] rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1B4332]">{r.nombre_cliente}</span>
                  <Estrellas valor={r.calificacion} />
                </div>
                <p className="text-sm text-slate-600 leading-snug">{r.comentario}</p>
                <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const ValuadoresDirectorioPage = () => {
  const navigate = useNavigate();
  const [valuadores, setValuadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalPerfil, setModalPerfil] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [estado, setEstado] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams();
        if (estado) params.set("estado", estado);
        const res = await fetch(`${API}/directorio/valuadores?${params}`);
        const data = await res.json();
        setValuadores(Array.isArray(data) ? data : []);
      } catch {
        setValuadores([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [estado, reloadKey]);

  const filtrados = useMemo(() => {
    if (!busqueda) return valuadores;
    const q = busqueda.toLowerCase();
    return valuadores.filter(v =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.estado || "").toLowerCase().includes(q) ||
      (v.municipio || "").toLowerCase().includes(q)
    );
  }, [valuadores, busqueda]);

  const hayFiltros = !!estado;
  const limpiarFiltros = () => { setEstado(""); setBusqueda(""); };

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
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, ciudad o estado..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788]" />
            </div>
            <select value={estado} onChange={e => setEstado(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:border-[#52B788] focus:outline-none text-slate-600 appearance-none">
              <option value="">Todos los estados</option>
              {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {hayFiltros && (
              <button onClick={limpiarFiltros}
                className="h-10 px-3 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Contador */}
        <p className="text-xs text-slate-400 mb-4">
          {cargando ? "Buscando valuadores..." : `${filtrados.length} valuador${filtrados.length !== 1 ? "es" : ""} encontrado${filtrados.length !== 1 ? "s" : ""}`}
        </p>

        {/* Grid */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron valuadores con esos criterios.</p>
            <button onClick={limpiarFiltros} className="mt-3 text-[#52B788] text-sm hover:underline">Ver todos</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((v, i) => (
              <TarjetaValuador key={v.id || v.email || i} v={v} onCalificar={setModalPerfil} />
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

      {modalPerfil && (
        <ModalResenaValuador
          perfil={modalPerfil}
          onClose={() => setModalPerfil(null)}
          onEnviada={() => setReloadKey(k => k + 1)}
        />
      )}
    </div>
  );
};

export default ValuadoresDirectorioPage;
