import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2, FileText, Search, BarChart2,
  Star, ChevronDown, ChevronUp, ArrowRight,
  AlertTriangle, CheckCircle2,
  Brain, Target, TrendingUp, Ruler, Clock,
  DollarSign, Shield, Download, Landmark, Map,
} from "lucide-react";

const BASE_PRICE = 280;

const QTY_OPTIONS = [
  { n: 1, discount: 0 },
  { n: 2, discount: 6 },
  { n: 3, discount: 10 },
];

const ADDONS = [
  {
    id: "valuador",
    emoji: "🏅",
    title: "Revisión por Valuador Certificado",
    desc: "Valuador CNBV/INDAABIN revisa, valida comparables y firma el reporte. Entrega en 48h.",
    price: 350,
    badge: "⭐ Recomendado",
    activeBorder: "border-[#D9ED92]",
    activeBg: "bg-[#D9ED92]/8",
    badgeBg: "bg-[#D9ED92] text-[#1B4332]",
    priceColor: "text-[#D9ED92]",
  },
  {
    id: "visita",
    emoji: "📐",
    title: "Verificación de m² en sitio",
    desc: "Visita física para medir y confirmar metros reales. Ideal si tienes dudas sobre los m².",
    price: 600,
    badge: "Visita física",
    activeBorder: "border-[#52B788]",
    activeBg: "bg-[#52B788]/8",
    badgeBg: "bg-[#52B788]/20 text-[#52B788]",
    priceColor: "text-[#52B788]",
  },
];

const BENEFITS = [
  { icon: <DollarSign className="w-6 h-6" />,  title: "Valor de mercado con rango",        desc: "Precio estimado central más valor mínimo y máximo basados en comparables reales." },
  { icon: <Search className="w-6 h-6" />,       title: "Comparables en tiempo real",        desc: "Búsqueda automática en los principales portales inmobiliarios del país." },
  { icon: <Ruler className="w-6 h-6" />,         title: "Precio por m² desglosado",          desc: "Valor unitario de construcción y terreno ajustado a la zona y tipo de inmueble." },
  { icon: <Brain className="w-6 h-6" />,         title: "Análisis narrativo con IA",          desc: "Tendencias de la zona, fortalezas y debilidades redactadas automáticamente." },
  { icon: <TrendingUp className="w-6 h-6" />,    title: "Renta estimada y cap rate",          desc: "Rendimiento esperado si destinas el inmueble a arrendamiento." },
  { icon: <Target className="w-6 h-6" />,        title: "Estrategia de comercialización",     desc: "Recomendaciones de precio y canal de venta generadas por IA según el mercado." },
  { icon: <BarChart2 className="w-6 h-6" />,     title: "Nivel de confianza del análisis",    desc: "Indicador ALTO / MEDIO / BAJO basado en la densidad de comparables encontrados." },
  { icon: <Shield className="w-6 h-6" />,        title: "Metodología bancaria oficial",       desc: "Factores CNBV · SHF · INDAABIN documentados y transparentes en el reporte." },
  { icon: <Map className="w-6 h-6" />,           title: "Tabla de comparables con ajustes",  desc: "6–10 propiedades similares con precios, superficie y factores de homologación." },
  { icon: <FileText className="w-6 h-6" />,      title: "Reporte PDF profesional",           desc: "Descargable al instante con todos los datos, tablas y análisis de la estimación." },
  { icon: <Clock className="w-6 h-6" />,         title: "Historial por 6 meses",             desc: "Accede a tus reportes anteriores desde tu panel durante 6 meses." },
  { icon: <Landmark className="w-6 h-6" />,      title: "Cobertura nacional",                desc: "Análisis disponible para propiedades en toda la República Mexicana." },
];

const FAQS = [
  {
    q: "¿Qué datos necesito para hacer la valuación?",
    a: "Dirección completa (colonia, municipio, estado), superficie de construcción, superficie de terreno, tipo de inmueble y características principales (recámaras, baños, estacionamiento, nivel, antigüedad).",
  },
  {
    q: "¿El reporte tiene validez legal o ante banco?",
    a: "La estimación PropValu es una opinión de valor informativa, no una estimación bancaria formal. El add-on de Valuador Certificado le da mayor certeza al análisis, aunque el reporte sigue siendo informativo.",
  },
  {
    q: "¿Cuánto tiempo tengo para usar los estimacións del paquete?",
    a: "Si compras un pack de 2 o 3, los estimacións no usados tienen vigencia de 3 meses desde la fecha de compra.",
  },
  {
    q: "¿En cuánto tiempo recibo el reporte?",
    a: "El reporte se genera en minutos. Con revisión por valuador, el turnaround es de 48 horas hábiles.",
  },
];

// Ordered 5→2 por precisión
const M2_SOURCES = [
  {
    rating: 5,
    icon: "📏",
    label: "Medición física",
    desc: "La más precisa — mides los metros reales en sitio, incluyendo ampliaciones no registradas.",
    quality: "Excelente",
    qualityColor: "text-[#D9ED92] bg-[#D9ED92]/12",
    checkColor: "text-[#D9ED92]",
  },
  {
    rating: 4,
    icon: "📐",
    label: "Plano arquitectónico",
    desc: "Muy confiable — incluye m² de terreno y construcción desglosados por planta.",
    quality: "Muy buena",
    qualityColor: "text-emerald-300 bg-emerald-300/12",
    checkColor: "text-emerald-300",
  },
  {
    rating: 3,
    icon: "📜",
    label: "Escritura pública",
    desc: "Útil como referencia, aunque rara vez incluye los m² de construcción actualizados.",
    quality: "Referencia",
    qualityColor: "text-amber-300 bg-amber-300/12",
    checkColor: "text-amber-300",
  },
  {
    rating: 2,
    icon: "🗂️",
    label: "Predial",
    desc: "Estimado de terreno y construcción; puede no reflejar ampliaciones recientes.",
    quality: "Estimada",
    qualityColor: "text-orange-400/80 bg-orange-400/10",
    checkColor: "text-orange-400",
  },
];

const fmt = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v);

// Estrellas de rating (5 estrellas, rellenas según n)
function StarRating({ n, color }) {
  return (
    <span className="flex gap-[2px] items-center leading-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-[13px] ${i <= n ? color : "text-white/15"}`}>★</span>
      ))}
    </span>
  );
}

// Section title with white background
function SectionTitle({ children }) {
  return (
    <div className="bg-white rounded-xl px-4 py-2.5 mb-4 shadow-sm">
      <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-lg leading-snug">{children}</h2>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);

  const discount = qty === 2 ? 6 : qty === 3 ? 10 : 0;
  const unitPrice = BASE_PRICE * (1 - discount / 100);
  const subtotal = unitPrice * qty;
  const addonsTotal = addons.reduce((s, id) => s + (ADDONS.find(a => a.id === id)?.price ?? 0), 0) * qty;
  const total = subtotal + addonsTotal;

  const toggle = (id) => setAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleStart = () => {
    sessionStorage.setItem("propvalu_cart", JSON.stringify({ qty, addons, total }));
    navigate("/valuar");
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
      <header
        className="border-b border-white/8 sticky top-0 z-20"
        style={{ background: "rgba(5,20,16,0.90)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-white" />
            <span className="font-['Outfit'] text-xl font-bold text-white">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </button>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => navigate("/para-inmobiliarias")} className="text-white/55 hover:text-white transition-colors">Inmobiliaria</button>
            <span className="text-white/15">·</span>
            <button onClick={() => navigate("/para-valuadores")} className="text-white/55 hover:text-white transition-colors">Valuador</button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Hero */}
        <div className="text-center mb-7">
          <span className="inline-block bg-[#D9ED92] text-[#1B4332] text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-3">
            Sin registro · Resultado en minutos
          </span>
          <h1 className="font-['Outfit'] text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
            Conoce el valor real
            <span className="text-[#D9ED92]"> de tu propiedad</span>
          </h1>
          <p className="text-white/50 text-sm max-w-lg mx-auto">
            Comparables en tiempo real · Metodología CNBV · Reporte PDF profesional
          </p>
        </div>

        {/* 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">

          {/* ── COL 1: ¿De dónde saco los m²? ── */}
          <div className="flex flex-col">
            <SectionTitle>¿De dónde saco los m²?</SectionTitle>

            <p className="text-white/65 text-sm mb-3 leading-relaxed">
              De mayor a menor precisión:
            </p>

            <div className="flex-1 flex flex-col justify-between">
              {M2_SOURCES.map((src, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-white/8 last:border-0">
                  <span className="text-xl flex-shrink-0 mt-0.5">{src.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-white text-base">{src.label}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StarRating n={src.rating} color={src.checkColor} />
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${src.qualityColor}`}>
                          {src.quality}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{src.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── COL 2: Tu valuación ── */}
          <div className="flex flex-col">
            <SectionTitle>Tu valuación</SectionTitle>

            {/* Compact qty toggle */}
            <div className="mb-3">
              <p className="text-white/75 text-sm font-medium mb-2">¿Cuántos estimacións necesitas?</p>
              <div className="flex gap-2">
                {QTY_OPTIONS.map(({ n, discount: d }) => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    className={`relative flex-1 rounded-xl py-2 text-center border-2 transition-all ${
                      qty === n
                        ? "border-[#D9ED92] bg-[#D9ED92]/10"
                        : "border-white/20 hover:border-[#D9ED92] hover:bg-[#D9ED92]/25 hover:text-[#D9ED92] bg-white/5 transition-all duration-150"
                    }`}
                  >
                    {d > 0 && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold bg-[#D9ED92] text-[#1B4332] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        -{d}%
                      </span>
                    )}
                    <p className="font-black text-white text-xl leading-none">{n}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{n === 1 ? "estimación" : "estimaciones"}</p>
                    <p className="text-xs font-bold text-[#D9ED92] mt-1">
                      {fmt(BASE_PRICE * (1 - d / 100))}{n > 1 ? "/u" : ""}
                    </p>
                  </button>
                ))}
              </div>
              <p
                className="text-[11px] mt-2 text-center font-medium text-[#52B788]"
                style={{ visibility: qty > 1 ? "visible" : "hidden" }}
              >
                Avalúos no usados tienen vigencia de 3 meses
              </p>
            </div>

            {/* Purchase card — flex-1 so it fills remaining col height */}
            <div
              className="flex-1 rounded-2xl overflow-hidden border border-[#D9ED92]/20 shadow-2xl flex flex-col"
              style={{ background: "linear-gradient(165deg, #0a1f14 0%, #1B4332 100%)" }}
            >
              <div className="px-5 py-4 border-b border-white/10 flex-1">
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-white/55">{qty} estimación{qty > 1 ? "es" : ""} × {fmt(unitPrice)}</span>
                    <span className="font-semibold text-white">{fmt(subtotal)}</span>
                  </div>
                  {addons.map(id => {
                    const a = ADDONS.find(x => x.id === id);
                    return (
                      <div key={id} className="flex justify-between text-white/45 text-xs">
                        <span className="truncate pr-2">{a.emoji} {a.title.split(" ").slice(0, 3).join(" ")}…</span>
                        <span className="font-semibold text-white/80 flex-shrink-0">{fmt(a.price * qty)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-white/10 text-center">
                  <p className="text-white/40 text-[10px] mb-1 uppercase tracking-widest">Total</p>
                  <p className="font-['Outfit'] text-5xl font-black text-[#D9ED92] leading-none mb-1">{fmt(total)}</p>
                  <p className="text-white/30 text-[11px]">+ IVA (16%)</p>
                  <span
                    style={{ visibility: discount > 0 ? "visible" : "hidden" }}
                    className="inline-block mt-1.5 bg-[#D9ED92]/15 text-[#D9ED92] text-xs font-bold px-3 py-0.5 rounded-full border border-[#D9ED92]/25"
                  >
                    Ahorraste {discount}% · {fmt(BASE_PRICE * qty - subtotal)}
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2.5">
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-full py-6 text-[15px] font-extrabold rounded-xl gap-2 bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] border-0 shadow-lg"
                >
                  Comenzar valuación
                  <ArrowRight className="w-6 h-6" />
                </Button>
                <p className="text-center text-xs text-white/25">Sin registro · Resultado en minutos</p>

                <div className="flex justify-around pt-1">
                  {[["🔒", "Seguro"], ["⚡", "En minutos"], ["📄", "PDF listo"]].map(([icon, label]) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className="text-base">{icon}</span>
                      <span className="text-[10px] text-white/35">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1 text-center">
                  <button
                    onClick={() => navigate("/para-inmobiliarias")}
                    className="text-xs text-[#52B788]/70 hover:text-[#52B788] transition-colors"
                  >
                    ¿Más de 5 estimacións/mes? Ver planes →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── COL 3: Add-ons + Includes ── */}
          <div className="flex flex-col">
            <SectionTitle>¿Mayor precisión o validez?</SectionTitle>

            <p className="text-white/65 text-sm mb-3 leading-relaxed">
              Agrégalo ahora · se aplica a cada estimación del paquete
            </p>

            <div className="flex flex-col gap-5">
              {ADDONS.map((addon, idx) => {
                const active = addons.includes(addon.id);
                return (
                  <div key={addon.id} className="flex flex-col gap-5">
                  <button
                    onClick={() => toggle(addon.id)}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      active
                        ? `${addon.activeBorder} ${addon.activeBg}`
                        : "border-white/20 hover:border-white/40 bg-white/[0.10]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{addon.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-bold text-sm text-white leading-snug">{addon.title}</p>
                          <div
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              active ? "bg-[#D9ED92] border-[#D9ED92]" : "border-white/25"
                            }`}
                          >
                            {active && (
                              <svg className="w-3 h-3 text-[#1B4332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-white/50 mb-3 leading-relaxed">{addon.desc}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${addon.badgeBg}`}>
                            {addon.badge}
                          </span>
                          <span className={`font-extrabold text-base ${addon.priceColor}`}>
                            +{fmt(addon.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {idx === 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-white/60 uppercase tracking-widest">o también</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  </div>
                );
              })}
            </div>

            {/* Warning — open */}
            <div className="mt-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400/60 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/60 leading-relaxed">
                Este reporte es <span className="text-white font-semibold">informativo</span>. Para hipoteca o herencia, la revisión por valuador da mayor certeza.
              </p>
            </div>

          </div>
        </div>

        {/* ── BENEFICIOS ── */}
        <div className="mt-10 mb-2">
          <div className="text-center mb-5">
            <span className="inline-block bg-[#D9ED92]/15 border border-[#D9ED92]/25 text-[#D9ED92] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-3">
              Incluido en cada estimación
            </span>
            <h2 className="font-['Outfit'] text-xl md:text-2xl font-bold text-white">
              Todo lo que obtienes en tu reporte
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/[0.07] sm:divide-y-0">
            {BENEFITS.map((b, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors
                  ${i < BENEFITS.length - (BENEFITS.length % 3 || 3) ? "sm:border-b sm:border-white/[0.07]" : ""}
                `}
              >
                <span className="text-[#D9ED92] flex-shrink-0">{b.icon}</span>
                <span className="text-base text-white font-semibold leading-snug">{b.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RESEÑAS ── */}
        <ReviewsMarquee />

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] text-center mb-1">FAQ</p>
          <h2 className="font-['Outfit'] text-xl font-bold text-white text-center mb-4">Preguntas frecuentes</h2>
          <div>
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-white/8 last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <span className="font-medium text-white/80 text-sm pr-6">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-[#52B788] flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-white/25 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <p className="text-xs text-white/50 pb-3 leading-relaxed pr-6">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="relative text-center py-5 text-xs text-white/18">
        © 2026 PropValu México · Estimación realizada con inteligencia de PropValu
      </footer>
    </div>
  );
}

const REVIEWS = [
  { stars: 5, comment: "Usé PropValu para negociar la compra de un departamento y el valor coincidió casi exacto con la estimación del banco. Excelente herramienta.", author: "Carlos M.", role: "Comprador particular" },
  { stars: 5, comment: "El reporte PDF es muy profesional. Lo presenté ante un notario y quedó impresionado con el nivel de detalle.", author: "Ana R.", role: "Vendedora de casa" },
  { stars: 5, comment: "Rápido, claro y muy bien explicado. Lo recomiendo a cualquiera que quiera saber el valor real de su propiedad.", author: "Jorge L.", role: "Inversionista" },
  { stars: 4, comment: "Muy buena estimación. Me hubiera gustado poder agregar fotos, pero el análisis de mercado con IA es impresionante.", author: "Roberto S.", role: "Dueño de local comercial" },
  { stars: 5, comment: "Necesitaba saber si el precio de venta era justo antes de cerrar el trato. PropValu me dio la confianza que necesitaba.", author: "Mariana V.", role: "Compradora" },
  { stars: 5, comment: "La sección de estrategia de comercialización me ayudó a fijar el precio correcto y vender en menos de 3 semanas.", author: "Héctor P.", role: "Vendedor" },
  { stars: 4, comment: "Muy útil para tener una referencia antes de contratar un valuador formal. Ahorra tiempo y dinero.", author: "Sofía G.", role: "Arrendadora" },
  { stars: 5, comment: "El análisis narrativo de la zona es sorprendentemente detallado. Claramente no es solo una calculadora.", author: "Luis A.", role: "Desarrollador inmobiliario" },
];

function StarRow({ n }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= n ? "text-amber-400" : "text-white/15"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

function ReviewsMarquee() {
  const doubled = [...REVIEWS, ...REVIEWS];
  return (
    <div className="mt-10 mb-2">
      <div className="text-center mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52B788] mb-1">Reseñas</p>
        <h2 className="font-['Outfit'] text-xl font-bold text-white">Lo que dicen quienes ya lo usaron</h2>
      </div>

      <div className="relative overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
        <div
          className="flex gap-4 w-max"
          style={{
            animation: "marquee-scroll 80s linear infinite",
          }}
        >
          {doubled.map((r, i) => (
            <div
              key={i}
              className="w-64 flex-shrink-0 bg-white/[0.92] border border-white/20 rounded-xl px-4 py-3 shadow-sm"
            >
              <StarRow n={r.stars} />
              <p className="text-xs text-slate-600 leading-relaxed mt-1.5 mb-2">"{r.comment}"</p>
              <div>
                <p className="text-[11px] font-semibold text-[#1B4332]">— {r.author}</p>
                <p className="text-[10px] text-slate-400">{r.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
