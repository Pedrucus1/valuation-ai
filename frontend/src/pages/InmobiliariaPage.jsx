import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2, ChevronRight, ChevronDown, ChevronUp,
  ArrowLeft, Check, Minus, Crown, MapPin, Camera, User, BedDouble, Bath,
  TrendingUp, Zap,
} from "lucide-react";

/* ─── Data ─────────────────────────────────────────────── */

const FEATURES = [
  { key: "dashboard",      label: "Dashboard analítico" },
  { key: "historial",      label: "Historial de valuaciones" },
  { key: "logo_empresa",   label: "Logo de empresa en reportes" },
  { key: "ficha",          label: "Ficha promocional de la propiedad" },
  { key: "foto_asesor",    label: "Foto del asesor en reportes" },
  { key: "newsletter",     label: "Newsletter semanal de mercado" },
  { key: "data_analysis",  label: "Data Analysis mensual" },
  { key: "multiuser",      label: "Multi-usuario" },
  { key: "no_ads",         label: "Sin publicidad en reportes" },
];

const PLANS = [
  {
    id: "lite5",
    name: "Lite 5",
    price: 1400,
    unit: 280,
    discount: 0,
    avaluos: 5,
    features: {
      dashboard: true, historial: true, logo_empresa: true, ficha: "Básica",
      foto_asesor: false, newsletter: false, data_analysis: false,
      multiuser: false, no_ads: false,
    },
  },
  {
    id: "lite10",
    name: "Lite 10",
    price: 2700,
    unit: 270,
    discount: 4,
    avaluos: 10,
    features: {
      dashboard: true, historial: true, logo_empresa: true, ficha: "Básica",
      foto_asesor: false, newsletter: false, data_analysis: false,
      multiuser: false, no_ads: false,
    },
  },
  {
    id: "pro20",
    name: "Pro 20",
    price: 5200,
    unit: 260,
    discount: 7,
    avaluos: 20,
    popular: true,
    features: {
      dashboard: true, historial: true, logo_empresa: true, ficha: "Completa",
      foto_asesor: true, newsletter: true, data_analysis: false,
      multiuser: "hasta 5", no_ads: false,
    },
  },
  {
    id: "premier",
    name: "Premier",
    price: 7500,
    unit: 250,
    discount: 11,
    avaluos: "30–50+",
    premier: true,
    features: {
      dashboard: true, historial: true, logo_empresa: true, ficha: "Completa",
      foto_asesor: true, newsletter: true, data_analysis: true,
      multiuser: "hasta 50", no_ads: true,
    },
  },
];

const REPORT_ITEMS = [
  { title: "Valor estimado de mercado",      desc: "Precio central + rango mínimo y máximo" },
  { title: "Precio por m²",                  desc: "Construcción y terreno ajustado a la zona" },
  { title: "Tabla de comparables",           desc: "6–10 propiedades similares con ajustes" },
  { title: "Análisis de mercado con IA",     desc: "Tendencias, fortalezas y debilidades" },
  { title: "Renta mensual + cap rate",       desc: "Rendimiento estimado en arrendamiento" },
  { title: "Estrategia de comercialización", desc: "Tips de precio y canal, generados por IA" },
  { title: "Nivel de confianza",             desc: "ALTO / MEDIO / BAJO según comparables" },
  { title: "Metodología aplicada",           desc: "CNBV / SHF / INDAABIN documentada" },
];

const ADDONS = [
  {
    icon: "🏅",
    title: "Revisión por Valuador Certificado",
    price: "+$350",
    pitch: "Un valuador certificado valida comparables, corrige desviaciones y firma con su cédula. Esa firma puede representar miles de pesos más en el precio de venta y elimina objeciones del comprador ante notarías e instituciones financieras.",
    items: [
      "Firma y cédula oficial (CNBV/INDAABIN)",
      "Ajuste de comparables si detecta inconsistencias",
      "Mayor certeza ante notarios e instituciones",
      "Entrega en menos de 48 horas",
    ],
  },
  {
    icon: "📍",
    title: "Verificación en Sitio",
    price: "$600",
    pitch: "Los m² en escritura o predial frecuentemente no coinciden con la realidad. Una diferencia de 5–10 m² puede cambiar el valor en $50,000–$200,000 MXN. La visita física elimina ese margen de error.",
    items: [
      "Medición física certificada de superficie",
      "Verificación del estado real de conservación",
      "Reporte fotográfico incluido",
      "Base sólida para avalúo bancario o notarial",
    ],
  },
];

const FAQS = [
  {
    q: "¿Cuántos usuarios pueden usar la cuenta?",
    a: "Los planes Lite son para 1 usuario. Pro 20 soporta hasta 5 usuarios. Premier inicia con hasta 15 usuarios en el paquete de 30 avalúos y escala hasta 50 conforme aumenta el volumen contratado.",
  },
  {
    q: "¿Los avalúos se renuevan cada mes?",
    a: "Sí, los créditos se renuevan automáticamente al inicio de cada ciclo mensual. Los no usados no se acumulan al siguiente mes.",
  },
  {
    q: "¿Puedo agregar revisión de valuador certificado?",
    a: "Sí. En cualquier plan puedes agregar el add-on por +$350 MXN por avalúo. El valuador revisa, valida comparables y firma en menos de 48h.",
  },
  {
    q: "¿Hay contratos o compromisos?",
    a: "No. Los planes son mes a mes. Puedes cancelar o cambiar de plan en cualquier momento, sin penalizaciones.",
  },
];

const ASESORES = [
  { initials: "AM", name: "Ana Martínez",    role: "Asesora Senior",      grad: "from-[#1B4332] to-[#52B788]" },
  { initials: "JR", name: "Jorge Ramírez",   role: "Asesor Residencial",  grad: "from-[#0d4a3a] to-[#2D6A4F]" },
  { initials: "CL", name: "Carmen López",    role: "Directora Comercial", grad: "from-[#2D6A4F] to-[#74C69D]" },
  { initials: "RP", name: "Roberto Pedraza", role: "Asesor Jr.",          grad: "from-[#1B4332] to-[#40916C]" },
];

/* ─── Helpers ───────────────────────────────────────────── */

const fmt = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", minimumFractionDigits: 0,
  }).format(v);

function FeatureVal({ val }) {
  if (val === true)  return <Check className="w-4 h-4 text-[#52B788] flex-shrink-0" />;
  if (val === false) return <Minus className="w-4 h-4 text-white/15 flex-shrink-0" />;
  return <span className="text-[11px] text-[#D9ED92] font-bold flex-shrink-0">{val}</span>;
}

/* Round bullet — clean, minimal */
function Bullet() {
  return <span className="w-2 h-2 rounded-full bg-white/35 flex-shrink-0 mt-[7px]" />;
}

/* ─── Page ──────────────────────────────────────────────── */

export default function InmobiliariaPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const handleLogin = (planId) => {
    localStorage.setItem("propvalu_intended_role", "realtor");
    if (planId) localStorage.setItem("propvalu_selected_plan", planId);
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="relative min-h-screen text-white overflow-hidden"
      style={{ background: "linear-gradient(160deg, #051410 0%, #0d2318 50%, #1a3a28 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/3 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(82,183,136,0.1) 0%, transparent 65%)", filter: "blur(60px)" }} />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(27,67,50,0.35) 0%, transparent 70%)", filter: "blur(70px)" }} />
      <div className="absolute bottom-20 left-0 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(217,237,146,0.05) 0%, transparent 70%)", filter: "blur(50px)" }} />

      {/* Header */}
      <header className="border-b border-white/8 sticky top-0 z-20"
        style={{ background: "rgba(5,20,16,0.90)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Building2 className="w-6 h-6 text-white" />
              <span className="font-['Outfit'] text-lg font-bold text-white">Prop<span className="text-[#52B788]">Valu</span></span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/comprar")} className="hidden md:block text-sm text-white/55 hover:text-white transition-colors">
              Público
            </button>
            <button onClick={() => navigate("/para-valuadores")} className="hidden md:block text-sm text-white/55 hover:text-white transition-colors">
              Valuadores
            </button>
            <Button onClick={() => handleLogin(null)} size="sm"
              className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] hover:shadow-lg hover:shadow-[#D9ED92]/20 active:bg-[#b8d060] font-bold border-0 transition-all">
              Iniciar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <span className="inline-block bg-[#D9ED92] text-[#1B4332] text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4">
            Para Inmobiliarias
          </span>

          <h1 className="font-['Outfit'] text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
            Valúa más propiedades,
            <span className="text-[#D9ED92]"> cierra más ventas</span>
          </h1>

          {/* AI line — differentiated from H1 lime */}
          <p className="font-['Outfit'] font-black text-2xl md:text-3xl tracking-tight mb-6 text-white/90 text-center">
            <span className="text-[#52B788]">IA en tiempo real</span>
            <span className="text-white/35 mx-2">·</span>
            Todo México
            <span className="text-white/35 mx-2">·</span>
            Metodología bancaria
          </p>

          {/* 3 chips — bigger, readable */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <MapPin className="w-4 h-4" />,      label: "Cobertura nacional" },
              { icon: <TrendingUp className="w-4 h-4" />,  label: "Datos del mercado hoy" },
              { icon: <Zap className="w-4 h-4" />,         label: "Reporte con análisis IA incluido" },
            ].map((chip, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#1B4332] border border-[#52B788]/50 rounded-full px-5 py-2.5">
                <span className="text-[#D9ED92]">{chip.icon}</span>
                <span className="text-sm font-semibold text-white">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Plans: 4 columns ── */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">Planes mensuales</p>
        <h2 className="font-['Outfit'] text-2xl font-bold text-white text-center mb-7">Elige el plan para tu equipo</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch mb-12">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${
                plan.popular
                  ? "border-[#D9ED92]/60 bg-[#D9ED92]/[0.12] shadow-xl shadow-[#D9ED92]/8 hover:border-[#D9ED92]/85 hover:bg-[#D9ED92]/[0.17]"
                  : plan.premier
                    ? "border-[#52B788]/40 bg-gradient-to-b from-[#52B788]/12 to-white/[0.05] hover:border-[#52B788]/60 hover:from-[#52B788]/18"
                    : "border-white/18 bg-white/[0.10] hover:border-white/30 hover:bg-white/[0.15]"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold bg-[#D9ED92] text-[#1B4332] px-3 py-0.5 rounded-full whitespace-nowrap">
                  ★ Más popular
                </span>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="font-['Outfit'] font-black text-white text-lg">{plan.name}</p>
                {plan.premier && <Crown className="w-4 h-4 text-[#D9ED92]" />}
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {plan.premier && (
                    <span className="text-sm text-[#52B788] font-semibold">Desde</span>
                  )}
                  <p className="font-['Outfit'] text-4xl font-black text-[#D9ED92] leading-none">
                    {fmt(plan.price)}
                  </p>
                </div>
                <p className="text-sm text-white/45 mt-1.5">{plan.avaluos} avalúos / mes</p>
                <p className="text-sm text-[#52B788] font-semibold mt-0.5">
                  {fmt(plan.unit)}/u{plan.discount > 0 ? ` · −${plan.discount}%` : ""}
                  {plan.premier && " · escala"}
                </p>
              </div>

              <Button onClick={() => handleLogin(plan.id)}
                className={`w-full font-bold border-0 mb-6 py-5 text-sm transition-all duration-200 ${
                  plan.popular
                    ? "bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] hover:shadow-md hover:shadow-[#D9ED92]/25 active:bg-[#b8d060]"
                    : plan.premier
                      ? "bg-[#52B788]/25 text-white hover:bg-[#D9ED92] hover:text-[#1B4332] active:bg-[#c8e070]"
                      : "bg-white/10 text-white hover:bg-[#D9ED92] hover:text-[#1B4332] active:bg-[#c8e070]"
                }`}
              >
                Comenzar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>

              <div className="border-t border-white/10 pt-5 flex-1 flex flex-col gap-3.5">
                {FEATURES.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <span className={`text-xs leading-tight ${
                      plan.features[f.key] === false
                        ? "text-white/35"
                        : "text-white/85 font-semibold"
                    }`}>
                      {f.label}
                    </span>
                    <FeatureVal val={plan.features[f.key]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Perfiles ── */}
        <div className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">Tu marca, tu equipo</p>
          <h2 className="font-['Outfit'] text-xl font-bold text-white text-center mb-2">Perfil de empresa y asesores</h2>
          <p className="text-center text-sm text-white/45 max-w-xl mx-auto mb-7">
            Tu identidad presente en cada documento que entregas a tus clientes.
          </p>

          <div className="grid lg:grid-cols-3 gap-5 mb-4">

            {/* Empresa */}
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#52B788] mb-4">Logo de empresa · desde Lite</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] border border-[#52B788]/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-[#D9ED92]" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Inmobiliaria Ejemplo</p>
                  <p className="text-xs text-white/40 mt-0.5">Monterrey · AMPI #1234</p>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "Logo en portada de cada reporte PDF",
                  "Datos de contacto y página web",
                  "Membresía AMPI visible al cliente",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <Check className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-px" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Asesores */}
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#52B788] mb-4">Foto de asesor · desde Pro 20</p>
              <div className="space-y-2.5 mb-4">
                {ASESORES.map((u, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.grad} flex items-center justify-center flex-shrink-0 border border-white/10`}>
                      <span className="text-[11px] font-bold text-white">{u.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/80 leading-none truncate">{u.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{u.role}</p>
                    </div>
                    <span className="text-[9px] text-[#52B788] bg-[#52B788]/10 px-1.5 py-0.5 rounded-full">activo</span>
                  </div>
                ))}
              </div>
              <ul className="space-y-2">
                {[
                  "Foto y nombre en cada reporte PDF",
                  "Historial individual por asesor",
                  "Cuenta y métricas propias",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <Check className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-px" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ficha promocional */}
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#52B788] mb-4">Ficha promocional de la propiedad</p>
              {/* Mini mockup — ficha promocional */}
              <div className="rounded-lg border border-white/12 overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                {/* Header: logo + price */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#1B4332] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3 h-3 text-[#D9ED92]" />
                    </div>
                    <span className="text-[9px] text-white/55 font-bold uppercase tracking-wide">Tu Inmobiliaria</span>
                  </div>
                  <span className="text-[10px] font-black text-[#D9ED92]">$3,500,000</span>
                </div>

                {/* Photo grid with camera icons */}
                <div className="grid grid-cols-3 gap-1 p-2">
                  <div className="col-span-2 h-14 rounded bg-white/[0.06] border border-white/8 flex flex-col items-center justify-center gap-1">
                    <Camera className="w-4 h-4 text-white/25" />
                    <span className="text-[8px] text-white/20">Fachada</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-[26px] rounded bg-white/[0.06] border border-white/8 flex items-center justify-center">
                      <Camera className="w-2.5 h-2.5 text-white/20" />
                    </div>
                    <div className="h-[26px] rounded bg-white/[0.06] border border-white/8 flex items-center justify-center">
                      <Camera className="w-2.5 h-2.5 text-white/20" />
                    </div>
                  </div>
                </div>

                {/* Property data row */}
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-3 text-[9px] text-white/50 mb-1.5">
                    <span className="flex items-center gap-0.5"><BedDouble className="w-2.5 h-2.5" /> 3 rec</span>
                    <span className="flex items-center gap-0.5"><Bath className="w-2.5 h-2.5" /> 2 baños</span>
                    <span>180 m²</span>
                    <span>Cumbres, MTY</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-white/8 pt-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#1B4332] to-[#52B788] flex items-center justify-center flex-shrink-0">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] text-white/65 font-semibold leading-none">Ana Martínez</p>
                      <p className="text-[8px] text-white/30">+52 81 0000 0000</p>
                    </div>
                  </div>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "Básica (Lite): logo de empresa, precio, m² y zona",
                  "Completa (Pro/Premier): + foto y contacto del asesor",
                  "Hoja independiente del reporte — lista para compartir por WhatsApp o correo",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <Check className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0 mt-px" /> {f}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Plan inclusion strip */}
          <div className="rounded-xl px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { plan: "Lite 5 & 10",  dot: "bg-white/30",   label: "Incluye", items: ["Logo de empresa en reporte", "Ficha básica de la propiedad"] },
              { plan: "Pro 20",       dot: "bg-[#D9ED92]",  label: "Agrega",  items: ["Foto y contacto del asesor en ficha", "Ficha completa lista para compartir"] },
              { plan: "Premier",      dot: "bg-[#52B788]",  label: "Agrega",  items: ["Multi-usuario hasta 50", "Sin publicidad en reportes"] },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${row.dot}`} />
                <div>
                  <p className="text-sm font-bold text-white/75 mb-1">
                    {row.plan} <span className="font-normal text-white/35">· {row.label}:</span>
                  </p>
                  {row.items.map((item, j) => (
                    <p key={j} className="text-xs text-white/40 leading-snug">{item}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Add-ons ── */}
        <div className="rounded-2xl px-6 sm:px-8 py-8 mb-8"
          style={{ background: "linear-gradient(135deg, rgba(13,35,24,0.95) 0%, rgba(40,90,65,0.35) 100%)", border: "1px solid rgba(82,183,136,0.15)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">Servicios adicionales</p>
          <h2 className="font-['Outfit'] text-xl font-bold text-white text-center mb-2">Agrega mayor certeza a tu avalúo</h2>
          <p className="text-center text-sm text-white/45 max-w-xl mx-auto mb-7">
            Sin estos servicios el reporte es informativo y de alta calidad — con ellos, un profesional certificado respalda cada cifra.
            Eso puede significar <span className="text-white/70 font-semibold">miles de pesos más en el precio de venta</span> y cero objeciones.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {ADDONS.map((addon, idx) => (
              <div key={idx} className="rounded-xl p-6"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(217,237,146,0.12)" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{addon.icon}</span>
                    <p className="font-bold text-base text-white leading-snug">{addon.title}</p>
                  </div>
                  <span className="font-black text-[#D9ED92] text-xl flex-shrink-0 ml-3">{addon.price}</span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed mb-5 border-l-2 border-[#52B788]/50 pl-4">
                  {addon.pitch}
                </p>
                <ul className="space-y-2">
                  {addon.items.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/55">
                      <Check className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-px" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Report contents ── */}
        <div className="rounded-2xl px-6 sm:px-8 py-8 mb-10"
          style={{ background: "linear-gradient(150deg, rgba(5,20,16,0.7) 0%, rgba(27,67,50,0.25) 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">Reporte PDF Profesional</p>
          <h2 className="font-['Outfit'] text-xl font-bold text-white text-center mb-6">¿Qué datos incluye cada reporte?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
            {REPORT_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Bullet />
                <div>
                  <p className="font-semibold text-white/85 text-sm mb-0.5">{item.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">FAQ</p>
          <h2 className="font-['Outfit'] text-xl font-bold text-white text-center mb-5">Preguntas frecuentes</h2>
          <div>
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-white/8 last:border-0">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left">
                  <span className="font-semibold text-white/85 text-base pr-6">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-[#52B788] flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-white/25 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <p className="text-sm text-white/55 pb-4 leading-relaxed pr-6">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="relative text-center py-5 text-xs text-white/18 border-t border-white/5 mt-4">
        © 2026 PropValu México · Para Inmobiliarias
      </footer>
    </div>
  );
}
