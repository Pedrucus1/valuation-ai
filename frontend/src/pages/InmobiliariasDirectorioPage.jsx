import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, MapPin, Star, ShieldCheck, Phone, Mail,
  Filter, X, MessageSquare, Send, ChevronDown, ChevronUp,
  Briefcase, Globe, Users,
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

/* ─── Helpers ─────────────────────────────────────────────── */

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const PLAN_BADGE = {
  premier: { label: "Premier", cls: "bg-[#1B4332] text-white" },
  estandar: { label: "Estándar", cls: "bg-[#52B788] text-white" },
  lite:     { label: "Lite",     cls: "bg-slate-100 text-slate-600" },
  basico:   { label: "Verificado", cls: "bg-slate-100 text-slate-600" },
};

const OPERACION_LABELS = {
  venta_residencial: "Venta residencial",
  renta_residencial: "Renta residencial",
  comercial:         "Comercial",
  industrial:        "Industrial",
  terrenos:          "Terrenos",
  oficinas:          "Oficinas",
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
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onSelect(n)}
          className="text-2xl transition-transform hover:scale-110">
          <span className={(hover || valor) >= n ? "text-yellow-400" : "text-slate-200"}>★</span>
        </button>
      ))}
    </div>
  );
};

/* ─── Modal Reseña ─────────────────────────────────────────── */

const ModalResena = ({ perfil, onClose, onEnviada }) => {
  const [cal, setCal] = useState(0);
  const [comentario, setComentario] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    if (!cal) { toast.error("Selecciona una calificación"); return; }
    if (!comentario.trim()) { toast.error("Escribe un comentario"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/directorio/inmobiliarias/${perfil.id || perfil.email}/resena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion: cal, comentario: comentario.trim(), nombre_cliente: nombre.trim() || "Anónimo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al enviar reseña");
      toast.success("¡Gracias por tu reseña!");
      onEnviada();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1B4332]">Calificar servicio</h3>
            <p className="text-sm text-slate-500">{perfil.company_name || perfil.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">¿Cómo calificarías el servicio? *</p>
            <Estrellas valor={cal} interactive onSelect={setCal} />
            <p className="text-sm text-slate-400 mt-1">
              {["","Malo","Regular","Bueno","Muy bueno","Excelente"][cal]}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Tu comentario *</label>
            <textarea
              rows={3}
              placeholder="Cuenta tu experiencia con esta inmobiliaria — atención, profesionalismo, resultados..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-[#52B788] focus:outline-none resize-none bg-[#F0FAF5]"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Tu nombre <span className="font-normal text-slate-400">(opcional)</span></label>
            <input
              type="text"
              placeholder="ej. Juan Pérez (o déjalo en blanco para publicar como Anónimo)"
              className="w-full h-9 text-sm border border-slate-200 rounded-xl px-3 focus:border-[#52B788] focus:outline-none bg-[#F0FAF5]"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          <button
            onClick={handleEnviar}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? "Enviando..." : "Publicar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Tarjeta Inmobiliaria ─────────────────────────────────── */

const TarjetaInmobiliaria = ({ inm, onCalificar }) => {
  const [expandida, setExpandida] = useState(false);
  const [resenas, setResenas] = useState([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);

  const iniciales = (inm.company_name || inm.name || "??")
    .split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const plan = inm.plan || "basico";
  const planBadge = PLAN_BADGE[plan] || PLAN_BADGE.basico;

  const operaciones = inm.q_tipo_operaciones
    ? Object.entries(inm.q_tipo_operaciones).filter(([,v]) => v).map(([k]) => OPERACION_LABELS[k]).filter(Boolean)
    : [];

  const zonas = inm.estados?.length > 0
    ? inm.estados.join(", ")
    : inm.estado || "—";

  const cargarResenas = async () => {
    if (resenas.length > 0) { setExpandida(e => !e); return; }
    setCargandoResenas(true);
    try {
      const res = await fetch(`${API}/directorio/inmobiliarias/${inm.id || inm.email}/resenas`);
      const data = await res.json();
      setResenas(data);
      setExpandida(true);
    } catch { setExpandida(e => !e); }
    finally { setCargandoResenas(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#D9ED92] flex items-center justify-center text-[#1B4332] font-bold text-lg flex-shrink-0 overflow-hidden border border-[#B7E4C7]">
            {inm.logo_url
              ? <img src={inm.logo_url} alt="" className="w-full h-full object-contain p-1" />
              : iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-sm leading-snug truncate">
                  {inm.company_name || inm.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">{inm.name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-xs">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{zonas}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${planBadge.cls}`}>
                {planBadge.label}
              </span>
            </div>

            {/* Calificación */}
            <div className="flex items-center gap-2 mt-1.5">
              <Estrellas valor={inm.calificacion_promedio || 0} />
              <span className="text-xs text-slate-500">
                {inm.calificacion_promedio > 0
                  ? `${inm.calificacion_promedio.toFixed(1)} · ${inm.total_resenas} reseña${inm.total_resenas !== 1 ? "s" : ""}`
                  : "Sin reseñas aún"}
              </span>
            </div>
          </div>
        </div>

        {/* Tipo de cuenta */}
        <div className="flex items-center gap-2">
          {inm.inmobiliaria_tipo === "titular" ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
              <Briefcase className="w-3 h-3" /> Empresa titular
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <Users className="w-3 h-3" /> Asesor afiliado
            </span>
          )}
          {inm.asociacion && (
            <span className="text-xs text-slate-500 truncate">· {inm.asociacion}</span>
          )}
        </div>

        {/* Operaciones */}
        {operaciones.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {operaciones.map(op => (
              <span key={op} className="text-[10px] text-slate-500 bg-[#F8F9FA] border border-slate-100 px-2 py-0.5 rounded-lg">
                {op}
              </span>
            ))}
          </div>
        )}

        {/* Badge verificado */}
        {inm.kyc_status === "approved" && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="w-3 h-3" /> Verificada por PropValu
            </span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="px-5 pb-3 flex gap-2 border-t border-slate-50 pt-3">
        {inm.phone && (
          <a href={`https://wa.me/52${inm.phone}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl py-2.5 transition-colors">
            <Phone className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
        {inm.email && (
          <a href={`mailto:${inm.email}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1B4332] border border-[#52B788]/40 hover:bg-[#52B788]/10 rounded-xl py-2.5 transition-colors">
            <Mail className="w-3.5 h-3.5" /> Email
          </a>
        )}
        <button
          onClick={() => onCalificar(inm)}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-yellow-600 border border-yellow-200 hover:bg-yellow-50 rounded-xl px-3 py-2.5 transition-colors">
          <Star className="w-3.5 h-3.5" /> Calificar
        </button>
      </div>

      {/* Reseñas expandibles */}
      <div className="border-t border-slate-50">
        <button
          onClick={cargarResenas}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-500 hover:text-[#1B4332] hover:bg-[#F0FAF5] transition-colors rounded-b-2xl">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {cargandoResenas ? "Cargando reseñas..." : `Ver reseñas (${inm.total_resenas || 0})`}
          </span>
          {expandida ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandida && (
          <div className="px-5 pb-4 space-y-3">
            {resenas.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">Aún no hay reseñas. ¡Sé el primero en calificar!</p>
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

/* ─── Page ─────────────────────────────────────────────────── */

export default function InmobiliariasDirectorioPage() {
  const navigate = useNavigate();
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams();
        if (estado) params.set("estado", estado);
        if (tipo)   params.set("tipo", tipo);
        const res = await fetch(`${API}/directorio/inmobiliarias?${params}`);
        const data = await res.json();
        setInmobiliarias(Array.isArray(data) ? data : []);
      } catch {
        setInmobiliarias([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [estado, tipo, reloadKey]);

  const filtradas = useMemo(() => {
    if (!busqueda) return inmobiliarias;
    const q = busqueda.toLowerCase();
    return inmobiliarias.filter(inm =>
      (inm.company_name || "").toLowerCase().includes(q) ||
      (inm.name || "").toLowerCase().includes(q) ||
      (inm.estado || "").toLowerCase().includes(q) ||
      (inm.estados || []).some(e => e.toLowerCase().includes(q))
    );
  }, [inmobiliarias, busqueda]);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-['Outfit'] font-bold text-[#1B4332] text-lg hover:opacity-80">
            <Building2 className="w-6 h-6" />
            Prop<span className="text-[#52B788]">Valu</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button onClick={() => navigate("/valuadores")} className="hover:text-[#1B4332] transition-colors">Valuadores</button>
            <span>·</span>
            <span className="font-semibold text-[#1B4332]">Inmobiliarias</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-['Outfit'] text-3xl font-bold text-white mb-2">
            Directorio de Inmobiliarias
          </h1>
          <p className="text-white/70 text-base mb-6">
            Empresas y asesores verificados por PropValu — consulta reseñas reales de clientes
          </p>
          {/* Buscador */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa o estado..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-0 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Filtros */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            {cargando ? "Buscando..." : `${filtradas.length} inmobiliaria${filtradas.length !== 1 ? "s" : ""} encontrada${filtradas.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:border-[#52B788] focus:outline-none text-slate-600 appearance-none"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:border-[#52B788] focus:outline-none text-slate-600 appearance-none"
            >
              <option value="">Titular y asesor</option>
              <option value="titular">Solo titulares</option>
              <option value="asesor">Solo asesores</option>
            </select>
            {(estado || tipo || busqueda) && (
              <button
                onClick={() => { setEstado(""); setTipo(""); setBusqueda(""); }}
                className="h-9 px-3 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100" />
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
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No se encontraron inmobiliarias</p>
            <p className="text-sm text-slate-300 mt-1">Intenta con otros filtros o amplía la búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtradas.map((inm, i) => (
              <TarjetaInmobiliaria
                key={inm.id || inm.email || i}
                inm={inm}
                onCalificar={setModalPerfil}
              />
            ))}
          </div>
        )}

        {/* CTA registro */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] p-8 text-center">
          <h2 className="font-['Outfit'] text-xl font-bold text-white mb-2">¿Eres inmobiliaria o asesor?</h2>
          <p className="text-white/70 text-sm mb-4">Únete al directorio verificado de PropValu y recibe más clientes</p>
          <button
            onClick={() => navigate("/login", { state: { role: "realtor" } })}
            className="bg-[#D9ED92] text-[#1B4332] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#C7E08A] transition-colors">
            Registrar mi empresa
          </button>
        </div>
      </div>

      {/* Modal reseña */}
      {modalPerfil && (
        <ModalResena
          perfil={modalPerfil}
          onClose={() => setModalPerfil(null)}
          onEnviada={() => setReloadKey(k => k + 1)}
        />
      )}
    </div>
  );
}
