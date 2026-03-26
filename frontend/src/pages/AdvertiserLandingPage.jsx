import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2, ArrowRight, Megaphone, BarChart3, Users, Globe, Target,
  MapPin, CheckCircle, Clock, Play, Image, Zap, TrendingUp, Eye,
  ShieldCheck, DollarSign, Star, Layers, ChevronDown, ChevronUp,
} from "lucide-react";

/* ─── Data ─────────────────────────────────────────────── */

const SLOTS = [
  {
    id: "slot3",
    label: "Formato Básico",
    name: "Antes de la Descarga",
    duration: "10 segundos",
    context: "Tu anuncio aparece en pantalla completa justo cuando el usuario está por descargar su reporte. Momento de alta intención.",
    price: 5,
    tag: "Entrada accesible",
    popular: false,
    specs: "1200×628 px · Imagen JPG/PNG · máx. 5 MB",
    photos: "hasta 2 fotos en secuencia",
    icon: Image,
  },
  {
    id: "slot2",
    label: "Formato Estándar",
    name: "Durante la Generación con IA",
    duration: "10–20 segundos",
    context: "Tu anuncio se muestra mientras la IA genera el reporte personalizado. El usuario está en espera activa con total atención en pantalla.",
    price: 20,
    tag: "Alta atención",
    popular: false,
    specs: "1920×1080 px · Video MP4 o imagen · máx. 20 MB",
    photos: "hasta 4 fotos en secuencia",
    icon: Play,
  },
  {
    id: "slot1",
    label: "Formato Premium",
    name: "Durante la Investigación",
    duration: "60 segundos",
    context: "Tu anuncio ocupa los 60 segundos completos mientras el sistema busca comparables del mercado. El usuario no puede avanzar — atención garantizada.",
    price: 30,
    tag: "Máxima exposición",
    popular: true,
    specs: "1920×1080 px · Video MP4 o imagen · máx. 50 MB",
    photos: "hasta 12 fotos en secuencia",
    icon: Clock,
  },
];

const STATS = [
  { icon: BarChart3,   value: "850+",     label: "valuaciones al mes" },
  { icon: Users,       value: "3 perfiles", label: "público, valuador e inmobiliaria" },
  { icon: Globe,       value: "Jalisco",  label: "con expansión a CDMX y Monterrey" },
  { icon: Target,      value: "100%",     label: "audiencia con intención inmobiliaria" },
];

const TARGETING = [
  {
    level: "Municipal",
    desc: "Tu anuncio aparece solo cuando el inmueble valuado está en un municipio específico.",
    example: "Zapopan, Guadalajara, Tlaquepaque, San Pedro…",
  },
  {
    level: "Estatal",
    desc: "Alcance completo en todo Jalisco o el estado que selecciones en tu campaña.",
    example: "Ideal para franquicias, desarrolladoras o bancos regionales.",
  },
  {
    level: "Federal",
    desc: "Cobertura nacional sin restricción geográfica — máxima visibilidad de marca.",
    example: "Para marcas con presencia en todo México.",
  },
];

const BENEFITS = [
  {
    icon: Eye,
    title: "Audiencia de alta intención",
    desc: "El usuario está valuando un inmueble real — no es browsing pasivo. Hay intención activa de compra, venta o crédito hipotecario.",
  },
  {
    icon: ShieldCheck,
    title: "Contexto de confianza",
    desc: "Tu marca aparece dentro de una plataforma institucional de valuación, no en redes sociales. Mayor percepción de prestigio.",
  },
  {
    icon: Zap,
    title: "Sin bloqueo de anuncios",
    desc: "Los anuncios son parte del flujo nativo de la app. No existen ad-blockers ni botón de skip en los formatos premium.",
  },
  {
    icon: TrendingUp,
    title: "Métricas en tiempo real",
    desc: "Tu consola muestra impresiones, CTR y alcance geográfico actualizado. Toma decisiones con datos, no suposiciones.",
  },
  {
    icon: DollarSign,
    title: "Pago por impresión real",
    desc: "Solo pagas cuando tu anuncio se muestra efectivamente. Sin mínimos mensuales forzados ni contratos de permanencia.",
  },
  {
    icon: MapPin,
    title: "Segmentación precisa",
    desc: "Filtra por municipio, estado o nacional. Llega exactamente a los prospectos en las zonas donde operas.",
  },
  {
    icon: Star,
    title: "Perfil de marca verificado",
    desc: "Tu empresa aparece como anunciante verificado en PropValu, lo que genera confianza adicional ante los usuarios.",
  },
  {
    icon: Layers,
    title: "Formatos múltiples",
    desc: "Desde imagen estática hasta video de 60 segundos. Adecúa el formato a tu presupuesto y objetivo de campaña.",
  },
];

const WHO = [
  { title: "Inmobiliarias", desc: "Promociona tus desarrollos ante compradores que ya están valuando. Convierte usuarios a prospectos calificados." },
  { title: "Notarías y despachos", desc: "Posiciónate ante vendedores y compradores en el momento en que más necesitan servicios jurídicos." },
  { title: "Bancos y Sofoles", desc: "Ofrece créditos hipotecarios a usuarios que acaban de conocer el valor de su inmueble." },
  { title: "Constructoras", desc: "Presenta tus proyectos a usuarios con alta intención de compra en zonas específicas." },
  { title: "Seguros de inmueble", desc: "Llega al dueño justo cuando conoce el valor asegurado de su propiedad." },
  { title: "Servicios de remodelación", desc: "Contacta a propietarios que acaban de valuar — potenciales clientes para mejorar su inmueble." },
];

const FAQS = [
  {
    q: "¿Cuánto debo presupuestar mínimo para empezar?",
    a: "No hay mínimo obligatorio. Cargas el saldo que quieras y solo se descuenta por impresión real. Puedes empezar con $500 MXN para medir resultados.",
  },
  {
    q: "¿Puedo pausar o detener mi campaña?",
    a: "Sí, en cualquier momento desde tu consola. El saldo no usado queda disponible para cuando quieras reactivar.",
  },
  {
    q: "¿Qué tipo de creativo puedo subir?",
    a: "Imagen JPG/PNG o video MP4, según el formato que elijas. Las especificaciones exactas (resolución y peso máximo) están detalladas en cada formato.",
  },
  {
    q: "¿Cómo funciona la segmentación geográfica?",
    a: "Al crear tu campaña seleccionas municipios, estados o cobertura nacional. Tu anuncio solo se activa cuando el inmueble valuado cae dentro de tu zona seleccionada.",
  },
  {
    q: "¿Cuándo aparece mi anuncio exactamente?",
    a: "Dependiendo del slot: antes de la descarga del reporte, durante la generación con IA, o durante los 60 s de investigación de comparables. Son los momentos de mayor atención del usuario.",
  },
];

/* ─── Sub-components ──────────────────────────────────────── */

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.08]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left gap-4"
      >
        <span className="text-white/90 font-medium text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#52B788] flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />}
      </button>
      {open && (
        <p className="text-white/55 text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────── */

const AdvertiserLandingPage = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const SLIDES = [
    "https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/1642125/pexels-photo-1642125.jpeg?auto=compress&w=900",
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveSlide((p) => (p + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(160deg,#051410 0%,#0d2318 55%,#1a3a28 100%)", backgroundAttachment: "fixed" }}
    >
      <style>{`
        @keyframes kb { 0%{transform:scale(1)} 100%{transform:scale(1.08) translate(-2%,-1%)} }
        .kb { animation: kb 8s ease-in-out infinite alternate; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn 0.8s ease; }
      `}</style>

      {/* ── HEADER ── */}
      <header
        style={{ background: "rgba(5,20,16,0.92)", backdropFilter: "blur(16px)" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-[#52B788]" />
            <span className="font-['Outfit'] text-xl font-bold text-white">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
            <span className="text-white/20 mx-2 hidden sm:block">|</span>
            <span className="text-sm font-semibold text-white/50 hidden sm:block">Anunciantes</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/anunciantes/registro", { state: { tab: "login" } })}
              className="text-sm text-white/55 hover:text-white transition-colors"
            >
              Ya tengo cuenta
            </button>
            <button
              onClick={() => navigate("/anunciantes/registro")}
              className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-sm px-5 py-2 rounded-lg transition-colors"
            >
              Empezar a anunciar
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-16 min-h-screen relative flex items-center overflow-hidden">
        {/* Background slideshow */}
        <div className="absolute inset-0 z-0">
          {SLIDES.map((src, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? "opacity-100" : "opacity-0"}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover kb" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,20,16,0.92) 45%, rgba(5,20,16,0.5) 100%)" }} />
            </div>
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#1B4332] border border-[#52B788]/40 text-[#D9ED92] text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-6">
              <Megaphone className="w-3.5 h-3.5" />
              Publicidad inmobiliaria de alto impacto
            </div>
            <h1 className="font-['Outfit'] text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 text-white">
              Llega a quienes<br />
              <span className="text-[#52B788]">toman decisiones</span><br />
              inmobiliarias
            </h1>
            <p className="text-lg text-white/65 max-w-xl mb-10 leading-relaxed">
              Tus anuncios aparecen exactamente mientras el usuario espera resultados de valuación —
              el momento de mayor atención e intención de compra en el sector.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/anunciantes/registro")}
                className="bg-[#52B788] hover:bg-[#40916C] text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors flex items-center justify-center gap-2"
              >
                Crear cuenta de anunciante
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.getElementById("formatos")?.scrollIntoView({ behavior: "smooth" })}
                className="border border-white/25 hover:border-white/50 text-white/80 hover:text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                Ver formatos y tarifas
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 backdrop-blur-sm">
                <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-[#52B788]" />
                </div>
                <p className="font-['Outfit'] text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-xs text-white/50 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? "bg-[#52B788] w-5" : "bg-white/30"}`}
            />
          ))}
        </div>
      </section>

      {/* ── STATS (mobile) ── */}
      <section className="lg:hidden border-y border-white/[0.08] py-8 px-6">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center mb-2 text-[#52B788]"><s.icon className="w-5 h-5" /></div>
              <p className="font-['Outfit'] text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/45 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#1B4332] border border-[#52B788]/40 text-[#D9ED92] text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-5">
              ¿Por qué PropValu?
            </span>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white mb-4">
              Publicidad que <span className="text-[#52B788]">sí convierte</span>
            </h2>
            <p className="text-white/55 max-w-xl mx-auto leading-relaxed">
              No es display pasivo. Es presencia en el momento exacto en que tu prospecto está tomando una decisión.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.08] hover:border-[#52B788]/40 rounded-2xl p-6 transition-colors group">
                <div className="w-10 h-10 flex items-center justify-center mb-4">
                  <b.icon className="w-7 h-7 text-[#D9ED92]" />
                </div>
                <h3 className="font-['Outfit'] font-bold text-white text-sm mb-2">{b.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-['Outfit'] text-3xl font-bold text-white mb-3">
              ¿Quién se anuncia en PropValu?
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Cualquier empresa que quiera llegar a propietarios, compradores o inversionistas inmobiliarios.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHO.map((w, i) => (
              <div key={i} className="flex gap-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <CheckCircle className="w-5 h-5 text-[#52B788] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm mb-1">{w.title}</p>
                  <p className="text-white/45 text-xs leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SLOTS ── */}
      <section id="formatos" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#1B4332] border border-[#52B788]/40 text-[#D9ED92] text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-5">
              Formatos
            </span>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white mb-4">
              Tres momentos, <span className="text-[#52B788]">una sola audiencia</span>
            </h2>
            <p className="text-white/55 max-w-xl mx-auto">
              Elige el formato según tu objetivo y presupuesto. El usuario no puede ignorarlos — son parte del flujo nativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SLOTS.map(slot => (
              <div
                key={slot.id}
                className={`rounded-2xl border flex flex-col p-7 relative transition-all ${
                  slot.popular
                    ? "border-[#52B788] bg-[#1B4332]/40 shadow-lg shadow-[#52B788]/10"
                    : "border-white/[0.1] bg-white/[0.03] hover:border-white/20"
                }`}
              >
                {slot.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#52B788] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Más popular
                  </div>
                )}
                <div className={`self-start mb-4 text-[10px] font-bold px-3 py-1 rounded-full ${
                  slot.popular ? "bg-[#D9ED92] text-[#1B4332]" : "bg-white/10 text-white/60"
                }`}>
                  {slot.tag}
                </div>
                <p className="text-xs font-bold text-[#52B788] uppercase tracking-wider mb-1">{slot.label}</p>
                <h3 className="font-['Outfit'] text-xl font-bold text-white mb-3">{slot.name}</h3>
                <p className="text-sm text-white/50 mb-6 flex-1 leading-relaxed">{slot.context}</p>

                <div className="bg-white/[0.05] rounded-xl p-4 mb-5 space-y-3 border border-white/[0.07]">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/45">Duración</span>
                    <span className="font-semibold text-white">{slot.duration}</span>
                  </div>
                  <div className="flex justify-between text-xs items-start gap-2">
                    <span className="text-white/45 shrink-0">Specs</span>
                    <span className="font-semibold text-white text-right">{slot.specs}</span>
                  </div>
                  <div className="flex justify-between text-xs items-start gap-2">
                    <span className="text-white/45 shrink-0">Secuencia</span>
                    <span className="font-semibold text-white text-right">{slot.photos}</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-5 mt-auto">
                  <p className="font-['Outfit'] text-3xl font-bold text-white">
                    ${slot.price} <span className="text-base font-normal text-white/40">MXN</span>
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">por impresión</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARGETING ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-['Outfit'] text-3xl font-bold text-white mb-3">
              Segmentación <span className="text-[#52B788]">geográfica precisa</span>
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Paga solo por las impresiones en la zona que te interesa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TARGETING.map((t, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-[#1B4332] rounded-xl flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#52B788]" />
                  </div>
                  <h3 className="font-['Outfit'] text-lg font-bold text-white">{t.level}</h3>
                </div>
                <p className="text-sm text-white/55 mb-4 leading-relaxed">{t.desc}</p>
                <p className="text-xs text-white/30 italic">{t.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-['Outfit'] text-2xl font-bold text-white mb-10 text-center">
            Preguntas frecuentes
          </h2>
          {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center bg-[#1B4332]/50 border border-[#52B788]/30 rounded-3xl p-12">
          <div className="w-14 h-14 bg-[#52B788]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Megaphone className="w-7 h-7 text-[#52B788]" />
          </div>
          <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white mb-4">
            Empieza tu primera campaña hoy
          </h2>
          <p className="text-white/55 mb-8 leading-relaxed max-w-xl mx-auto">
            Regístrate en minutos, sube tu creatividad y llega a miles de usuarios con intención inmobiliaria real en Jalisco.
          </p>
          <button
            onClick={() => navigate("/anunciantes/registro")}
            className="bg-[#52B788] hover:bg-[#40916C] text-white font-bold px-10 py-4 rounded-xl text-base transition-colors inline-flex items-center gap-2"
          >
            Crear cuenta de anunciante
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-white/30 text-xs mt-5">Sin contratos · Sin mínimos · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-6 py-6 text-center">
        <p className="text-xs text-white/25">
          © 2026 PropValu México · Plataforma de valuación inmobiliaria con IA ·{" "}
          <button className="hover:text-white/60 transition-colors" onClick={() => navigate("/terminos")}>Términos</button> ·{" "}
          <button className="hover:text-white/60 transition-colors" onClick={() => navigate("/privacidad")}>Privacidad</button> ·{" "}
          <button className="hover:text-white/60 transition-colors" onClick={() => navigate("/")}>Ir a PropValu</button>
        </p>
      </footer>
    </div>
  );
};

export default AdvertiserLandingPage;
