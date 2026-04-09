import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, ChevronRight, Check, Minus, Crown,
  Zap, Users, FileText, Award,
  Briefcase, BarChart3, Handshake, Star,
  Clock, DollarSign, Shield,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function SectionTitle({ children }) {
  return (
    <span className="inline-block bg-white rounded-xl px-4 py-2.5 text-[#1B4332] font-['Outfit'] font-bold text-xs uppercase tracking-widest shadow-sm">
      {children}
    </span>
  );
}

function Bullet() {
  return <span className="w-2 h-2 rounded-full bg-white/35 flex-shrink-0 mt-[7px]" />;
}

function FeatureVal({ value }) {
  if (value === true)  return <Check className="w-4 h-4 text-[#52B788]" />;
  if (value === false) return <Minus className="w-4 h-4 text-white/25" />;
  return (
    <span className="text-[10px] font-bold bg-[#52B788]/20 text-[#52B788] px-1.5 py-0.5 rounded whitespace-nowrap">
      {value}
    </span>
  );
}

// ── data ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { key: "dashboard",    label: "Dashboard + historial" },
  { key: "folio",        label: "Folio oficial y firma digital" },
  { key: "analisis_ia",  label: "Análisis narrativo con IA" },
  { key: "red_encargos", label: "Encargos de la red" },
  { key: "alianzas",     label: "Solicitudes institucionales" },
  { key: "newsletter",   label: "Reportes de mercado" },
  { key: "data_analysis",label: "Data Analysis + exportación" },
  { key: "multiuser",    label: "Peritos adicionales" },
  { key: "prioridad",    label: "Prioridad en encargos" },
];

const PLANS = [
  {
    id: "independiente", name: "Independiente",
    price: 840,  unit: 168, discount: 0,  avaluos: 5,  peritos: 1,
    features: {
      dashboard: true,  folio: true,  analisis_ia: true,
      red_encargos: true, alianzas: true,
      newsletter: true,  data_analysis: false,
      multiuser: false,  prioridad: false,
    },
  },
  {
    id: "despacho", name: "Despacho",
    price: 1600, unit: 160, discount: 5,  avaluos: 10, peritos: 3,
    features: {
      dashboard: true,  folio: true,  analisis_ia: true,
      red_encargos: true, alianzas: true,
      newsletter: true,  data_analysis: false,
      multiuser: "hasta 3", prioridad: false,
    },
  },
  {
    id: "pro", name: "Pro",
    price: 3100, unit: 155, discount: 8,  avaluos: 20, peritos: 5,
    popular: true,
    features: {
      dashboard: true,  folio: true,  analisis_ia: true,
      red_encargos: true, alianzas: "Ampliado",
      newsletter: true,  data_analysis: true,
      multiuser: "hasta 5", prioridad: true,
    },
  },
  {
    id: "corporativo", name: "Corporativo",
    price: 4500, unit: 150, discount: 11, avaluos: "40+", peritos: 10,
    premier: true,
    features: {
      dashboard: true,  folio: true,  analisis_ia: true,
      red_encargos: "Prioritario", alianzas: "Acceso completo",
      newsletter: true,  data_analysis: true,
      multiuser: "hasta 10", prioridad: true,
    },
  },
];

const FAQS = [
  {
    q: "¿Cómo funciona la Red PropValu para recibir encargos?",
    a: "Al afiliarte, tu perfil queda visible para inmobiliarias y particulares que solicitan revisión o firma de un avalúo. PropValu te asigna los trabajos según tu zona, especialidad y disponibilidad. Tú aceptas, realizas el servicio y cobras directamente — PropValu gestiona la logística.",
  },
  {
    q: "¿Cómo funciona el acceso a solicitudes de INFONAVIT, FOVISSSTE y catastros?",
    a: "Cuando un cliente de alguna de estas entidades necesita un avalúo con credenciales específicas, PropValu identifica qué peritos afiliados están calificados y les envía la solicitud. Tú decides si aceptas — sin gestionar cada institución por tu cuenta.",
  },
  {
    q: "¿Puedo afiliarme sin consumir avalúos mensuales?",
    a: "Sí. Si tu volumen de trabajo es bajo o variable, existe la opción de afiliación anual que te mantiene en la red sin comprometerte a un plan mensual. Consulta disponibilidad al registrarte.",
  },
  {
    q: "¿Los reportes salen con mi nombre y cédula?",
    a: "Sí. Cada reporte incluye tu nombre completo, cédula profesional, número de registro (CNBV/INDAABIN según corresponda), firma digital y logo de tu despacho. El reporte es tuyo — PropValu es la herramienta.",
  },
  {
    q: "¿Hay contratos de permanencia?",
    a: "No. Los planes mensuales se pueden cancelar en cualquier momento. Para seguir recibiendo solicitudes institucionales recomendamos mantener la afiliación activa, pero no existe cláusula de permanencia mínima.",
  },
];

const HERO_SLIDES = [
  {
    src: "https://images.pexels.com/photos/4427630/pexels-photo-4427630.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Arquitecto hombre mirando a cámara",
  },
  {
    src: "https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Casa de estilo latino",
  },
  {
    src: "https://images.pexels.com/photos/2119713/pexels-photo-2119713.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Edificio urbano latinoamericano",
  },
];

// ── component ─────────────────────────────────────────────────────────────
const ValuadorPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (planId) => {
    localStorage.setItem("propvalu_intended_role", "appraiser");
    if (planId) localStorage.setItem("propvalu_intended_plan", planId);
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(160deg,#051410 0%,#0d2318 55%,#1a3a28 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <style>{`
        @keyframes kb1 { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.12) translate(-3%,-2%)} }
        @keyframes kb2 { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.12) translate(3%,-2%)} }
        @keyframes kb3 { 0%{transform:scale(1.05) translate(2%,2%)} 100%{transform:scale(1.12) translate(-2%,-1%)} }
        .kb1 { animation: kb1 15s ease-in-out infinite alternate; }
        .kb2 { animation: kb2 15s ease-in-out infinite alternate; }
        .kb3 { animation: kb3 15s ease-in-out infinite alternate; }
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
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/comprar")}
              className="hidden md:block text-sm text-white/55 hover:text-white transition-colors"
            >
              Público
            </button>
            <button
              onClick={() => navigate("/para-inmobiliarias")}
              className="hidden md:block text-sm text-white/55 hover:text-white transition-colors"
            >
              Inmobiliarias
            </button>
            <button
              onClick={() => handleLogin(null)}
              className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-sm px-5 py-2 rounded-lg transition-colors flex flex-col items-center leading-tight"
            >
              <span className="text-[10px] font-normal opacity-60 leading-none">Valuador</span>
              <span>Iniciar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[calc(100vh-64px)] py-12">

            {/* Left — copy */}
            <div>
              <div className="inline-block mb-5">
                <span className="bg-[#1B4332] border border-[#52B788]/40 text-[#D9ED92] text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest">
                  Para Peritos Valuadores
                </span>
              </div>
              <h1 className="font-['Outfit'] font-black text-4xl sm:text-5xl tracking-tight leading-[1.05] mb-4 text-white">
                Más avalúos en menos tiempo<br />
                <span className="text-[#D9ED92]">y una red que te da trabajo</span>
              </h1>
              <p className="font-['Outfit'] font-black text-xl tracking-tight mb-6 text-white/90">
                <span className="text-[#52B788]">Tu marca en cada reporte</span>
                <span className="text-white/35 mx-2">·</span>
                Encargos directos
                <span className="text-white/35 mx-2">·</span>
                Solicitudes institucionales
              </p>
              <div className="inline-flex flex-col gap-2 mb-7">
                {[
                  { icon: <Zap className="w-4 h-4" />,       label: "10x más rápido que el método tradicional" },
                  { icon: <Users className="w-4 h-4" />,     label: "Encargos directos de inmobiliarias y clientes" },
                  { icon: <Handshake className="w-4 h-4" />, label: "Solicitudes institucionales si tienes las credenciales" },
                ].map((chip, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#1B4332] border border-[#52B788]/50 rounded-full px-4 py-2">
                    <span className="text-[#D9ED92] flex-shrink-0">{chip.icon}</span>
                    <span className="text-sm font-semibold text-white">{chip.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={() => scrollTo("planes")}
                  className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-base px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#D9ED92]/20 flex items-center gap-2"
                >
                  Ver planes <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate("/valuar")}
                  className="border border-white/25 text-white hover:bg-white/10 font-semibold text-base px-8 py-4 rounded-xl transition-all"
                >
                  Ver demo
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-sm">
                {[
                  { value: "< 3 min", label: "Por reporte generado" },
                  { value: "Red",     label: "De clientes inmobiliarios activos" },
                  { value: "100%",    label: "Tu nombre en cada documento" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="font-['Outfit'] text-2xl font-black text-[#D9ED92]">{s.value}</p>
                    <p className="text-white/50 text-xs mt-1 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — slideshow, borde derecho alineado con max-6xl */}
            <div className="relative hidden lg:block -mr-8">
              <div className="relative rounded-3xl overflow-hidden" style={{ height: "min(85vh, 580px)" }}>
                {HERO_SLIDES.map((slide, i) => (
                  <img
                    key={i}
                    src={slide.src}
                    alt={slide.alt}
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 kb${i + 1}`}
                    style={{ opacity: activeSlide === i ? 1 : 0 }}
                  />
                ))}
                {/* Overlay gradients */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,20,16,0.35) 0%, transparent 40%, transparent 60%, rgba(5,20,16,0.25) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 h-28" style={{ background: "linear-gradient(to top, rgba(5,20,16,0.90) 0%, transparent 100%)" }} />
                {/* Dots */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${activeSlide === i ? "bg-[#D9ED92] w-4" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section id="beneficios" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <SectionTitle>Beneficios de afiliación</SectionTitle>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-black text-white mt-4">
              PropValu trabaja para ti
            </h2>
            <p className="text-white/55 mt-2 max-w-xl mx-auto text-sm">
              No solo una herramienta — una plataforma que te trae trabajo, te da visibilidad y conecta con solicitudes institucionales.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Clock className="w-6 h-6" />,      title: "Genera 10x más rápido",           desc: "Lo que antes te tomaba 3 horas, en 3 minutos. Más avalúos por día significan más ingresos con el mismo esfuerzo." },
              { icon: <DollarSign className="w-6 h-6" />, title: "Encargos que te llegan",           desc: "Inmobiliarias y particulares solicitan revisión o firma de avalúos a través de PropValu. Tú los recibes, aceptas y cobras directamente." },
              { icon: <Award className="w-6 h-6" />,      title: "Tu marca en cada reporte",         desc: "Nombre, cédula, firma digital y logo de tu despacho en portada. El reporte es tuyo — PropValu es solo la plataforma." },
              { icon: <Handshake className="w-6 h-6" />,  title: "Solicitudes institucionales",      desc: "Clientes de INFONAVIT, FOVISSSTE y catastros que necesitan un perito con tus credenciales llegan a ti a través de la plataforma." },
              { icon: <BarChart3 className="w-6 h-6" />,  title: "Reportes mensuales de mercado",    desc: "Datos reales de tu zona: precios por m², tendencias, plusvalía y movimientos del mercado." },
              { icon: <Star className="w-6 h-6" />,       title: "Red de valuadores",                desc: "Conecta con otros peritos afiliados. Colabora en avalúos grandes y refiérete trabajo en zonas fuera de tu cobertura." },
              { icon: <Briefcase className="w-6 h-6" />,  title: "Inspección y peritajes",           desc: "Inspección de vivienda y peritajes especializados (comercial, industrial, agropecuario) como servicios adicionales en la plataforma." },
              { icon: <Shield className="w-6 h-6" />,     title: "Afiliación anual disponible",      desc: "Si tu volumen varía, la afiliación anual te mantiene en la red sin compromiso mensual." },
            ].map((f, i) => (
              <div key={i} className="bg-white/[0.10] hover:bg-white/[0.16] border border-white/[0.14] rounded-2xl p-5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#1B4332] flex items-center justify-center text-[#D9ED92] mb-3">
                  {f.icon}
                </div>
                <h3 className="font-['Outfit'] font-bold text-white text-sm mb-1.5">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA LA RED ── */}
      <section id="red" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <SectionTitle>La Red PropValu</SectionTitle>
            <h2 className="font-['Outfit'] text-3xl font-black text-white mt-4">Cómo recibes encargos</h2>
          </div>
          <div className="relative">
            <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-[#52B788]/25 z-0" />
            <div className="grid sm:grid-cols-4 gap-4 relative z-10">
              {[
                { num: "01", title: "Te afilias",         desc: "Registras tu perfil: cédula, especialidad, zona de cobertura y firma digital." },
                { num: "02", title: "Apareces en la red", desc: "Tu perfil es visible para inmobiliarias y clientes que necesitan un perito calificado." },
                { num: "03", title: "Recibes el encargo", desc: "PropValu te notifica. Aceptas, realizas el trabajo y firmas el documento." },
                { num: "04", title: "Cobras directo",     desc: "El cliente paga y tú recibes tu parte. PropValu gestiona la logística." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1B4332] border-2 border-[#52B788]/40 flex items-center justify-center mb-3 flex-shrink-0">
                    <p className="font-['Outfit'] text-lg font-black text-[#D9ED92]">{step.num}</p>
                  </div>
                  <h3 className="font-['Outfit'] font-bold text-white text-sm mb-1.5">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                photo: "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400",
                name: "Carlos M.",
                role: "Perito valuador · CDMX",
                quote: "Antes tardaba medio día en redactar un reporte. Ahora genero 5 en la misma mañana y el análisis de mercado lleva mi nombre.",
              },
              {
                photo: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400",
                name: "Laura R.",
                role: "Despacho valuador · Guadalajara",
                quote: "La red me trajo dos encargos de revisión el primer mes. Sin publicidad, sin intermediarios — solo por estar afiliada.",
              },
              {
                photo: "https://images.pexels.com/photos/5673488/pexels-photo-5673488.jpeg?auto=compress&cs=tinysrgb&w=400",
                name: "Miguel A.",
                role: "Perito INDAABIN · Monterrey",
                quote: "Por fin una plataforma que entiende cómo trabajamos. Mi cédula y firma aparecen en portada — el crédito es mío.",
              },
            ].map((t, i) => (
              <div key={i} className="bg-white/[0.10] border border-white/[0.14] rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-white/75 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                  />
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{t.name}</p>
                    <p className="text-[#52B788] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="planes" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <SectionTitle>Planes y precios</SectionTitle>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-black text-white mt-4">
              Elige según el tamaño de tu despacho
            </h2>
            <p className="text-white/55 mt-2 text-sm">Sin contratos · Cancela cuando quieras · Afiliación anual disponible</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id}
                className={`relative rounded-2xl border transition-all flex flex-col ${
                  plan.popular
                    ? "bg-white/[0.15] border-[#52B788]/60 shadow-xl shadow-[#52B788]/10"
                    : "bg-white/[0.11] hover:bg-white/[0.17] border-white/[0.15]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-[#52B788] text-white text-[11px] font-bold px-3 py-1 rounded-full">Más popular</span>
                  </div>
                )}
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/55 text-xs font-semibold uppercase tracking-wider">{plan.name}</p>
                    {plan.premier && <Crown className="w-4 h-4 text-[#D9ED92]" />}
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                    {plan.premier && <span className="text-sm text-[#52B788] font-semibold">Desde</span>}
                    <p className="font-['Outfit'] text-4xl font-black text-[#D9ED92] leading-none">{fmt(plan.price)}</p>
                  </div>
                  <p className="text-white/35 text-xs mb-1">/mes</p>
                  <p className="text-[#52B788] text-xs font-semibold mb-1">
                    {plan.avaluos} avalúos · {fmt(plan.unit)}/u{plan.discount > 0 && ` · −${plan.discount}%`}
                  </p>
                  <p className="text-white/40 text-xs mb-5">
                    {plan.peritos === 1 ? "1 perito" : `desde ${plan.peritos} peritos (ampliable)`}
                  </p>
                  {/* Features — label LEFT, check RIGHT */}
                  <div className="space-y-2.5">
                    {FEATURES.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-2">
                        <span className={`text-xs leading-snug ${
                          plan.features[f.key] === false ? "text-white/30" : "text-white/80 font-semibold"
                        }`}>
                          {f.label}
                        </span>
                        <div className="flex-shrink-0">
                          <FeatureVal value={plan.features[f.key]} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <button onClick={() => handleLogin(plan.id)}
                    className={`w-full font-bold py-3 text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-1 ${
                      plan.popular
                        ? "bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] hover:shadow-md hover:shadow-[#D9ED92]/25"
                        : plan.premier
                          ? "bg-[#52B788]/25 text-white hover:bg-[#D9ED92] hover:text-[#1B4332]"
                          : "bg-white/10 text-white hover:bg-[#D9ED92] hover:text-[#1B4332]"
                    }`}
                  >
                    Afiliarme <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/registro-valuador")}
                    className="w-full text-xs text-white/50 hover:text-[#D9ED92] underline underline-offset-2 mt-1 transition-colors"
                  >
                    Completar KYC (INE + Cédula)
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-white/[0.09] border border-[#52B788]/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white/80 font-semibold text-sm">¿Volumen variable o temporal?</p>
              <p className="text-white/45 text-xs mt-0.5">
                La <span className="text-[#D9ED92] font-semibold">afiliación anual</span> te mantiene en la red sin plan mensual. Consulta disponibilidad al registrarte.
              </p>
            </div>
            <button onClick={() => handleLogin(null)}
              className="whitespace-nowrap border border-[#52B788]/40 text-[#52B788] hover:bg-[#52B788]/10 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all flex-shrink-0">
              Ver afiliación anual
            </button>
          </div>
        </div>
      </section>

      {/* ── TU MARCA PROFESIONAL ── */}
      <section id="identidad" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <SectionTitle>Tu identidad profesional</SectionTitle>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-black text-white mt-4">
              Tu firma, tu despacho, tu reputación
            </h2>
            <p className="text-white/55 mt-2 text-sm max-w-lg mx-auto">
              Cada reporte lleva tu marca — no la de PropValu. La plataforma es la herramienta, el crédito es tuyo.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-6">
            {[
              {
                icon: <Award className="w-7 h-7" />, title: "Membrete completo",
                lines: ["Nombre y cédula profesional", "Logo del despacho", "Número de registro CNBV/INDAABIN", "Firma digital estampada en PDF"],
                note: "Desde plan Independiente",
              },
              {
                icon: <FileText className="w-7 h-7" />, title: "Folio y control propio",
                lines: ["Folio consecutivo personalizado", "Formato Est-AAMMDD-NN", "Control de tu propio expediente", "Historial de valuaciones propio"],
                note: "Desde plan Independiente",
              },
              {
                icon: <Users className="w-7 h-7" />, title: "Despacho multi-perito",
                lines: ["Varios peritos bajo un mismo despacho", "Cada uno con su perfil y cédula", "Cola de trabajo compartida", "Dashboard consolidado"],
                note: "Desde plan Despacho",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white/[0.11] border border-white/[0.15] rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-[#1B4332] flex items-center justify-center text-[#D9ED92] mb-4">
                  {card.icon}
                </div>
                <h3 className="font-['Outfit'] font-black text-white mb-3">{card.title}</h3>
                <ul className="space-y-2 mb-4">
                  {card.lines.map((line, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Bullet />
                      <span className="text-white/70 text-sm leading-snug">{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[#52B788] text-xs font-semibold">{card.note}</p>
              </div>
            ))}
          </div>

          {/* Solicitudes institucionales banner */}
          <div className="bg-[#1B4332]/60 border border-[#52B788]/30 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#1B4332] flex items-center justify-center flex-shrink-0">
                <Handshake className="w-7 h-7 text-[#D9ED92]" />
              </div>
              <div className="flex-1">
                <p className="font-['Outfit'] font-black text-white text-lg mb-2">
                  Solicitudes institucionales para peritos afiliados
                </p>
                <p className="text-white/60 text-sm mb-4">
                  Cuando un cliente de INFONAVIT, FOVISSSTE, un catastro municipal u otra entidad necesita un avalúo con credenciales específicas, PropValu identifica qué peritos afiliados están calificados para realizarlo y les envía la solicitud. Tú decides si aceptas — sin gestionar cada institución por tu cuenta. Lo mismo aplica para inspecciones de vivienda y peritajes especializados.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["INFONAVIT", "FOVISSSTE", "Catastros", "Inspección de vivienda", "Peritajes"].map((inst) => (
                    <span key={inst} className="bg-[#1B4332] border border-[#52B788]/30 text-[#52B788] text-xs font-semibold px-3 py-1.5 rounded-full">
                      {inst}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <SectionTitle>Preguntas frecuentes</SectionTitle>
            <h2 className="font-['Outfit'] text-3xl font-black text-white mt-4">¿Tienes dudas?</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white/[0.10] border border-white/[0.14] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-5 flex justify-between items-center gap-3"
                >
                  <span className="text-white/85 font-semibold text-sm">{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-white/55 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-['Outfit'] text-3xl md:text-4xl font-black text-white mb-3">
            Únete a la red de peritos PropValu
          </h2>
          <p className="text-white/55 text-sm mb-6">
            Configura tu perfil en minutos, sube tu cédula y firma digital, y empieza a recibir encargos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => handleLogin(null)}
              className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-base px-10 py-4 rounded-xl transition-all shadow-lg shadow-[#D9ED92]/20 flex items-center gap-2">
              Crear mi cuenta <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")}
              className="border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold text-base px-8 py-4 rounded-xl transition-all">
              Volver al inicio
            </button>
          </div>
          <p className="text-white/25 text-xs mt-5">
            Precios en MXN + IVA · Sin contratos · Afiliación anual disponible
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.08] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#52B788]" />
            <span className="font-['Outfit'] text-lg font-bold text-white">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
          <p className="text-white/30 text-sm">© 2025 PropValu México · Estimaciones orientativas, no avalúos oficiales</p>
        </div>
      </footer>
    </div>
  );
};

export default ValuadorPage;
