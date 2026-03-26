import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, FileText, LineChart, Shield, Clock,
  ChevronRight, Map, Calculator, Download, User,
  LogOut, Menu, X, Home, CheckCircle2, LayoutDashboard,
  Star, TrendingUp, Award, Brain, Search, Landmark,
  Ruler, BarChart2, Target, ClipboardList, DollarSign,
  MapPin, Percent, Zap, Users, Lock,
} from "lucide-react";
import { API } from "@/App";
import AfiliadosCarousel from "@/components/AfiliadosCarousel";

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total_valuations: 0, total_users: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCta, setHoveredCta] = useState(null);
  const [hoveredModo, setHoveredModo] = useState(null);

  useEffect(() => { checkAuth(); fetchStats(); }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        if (data?.user_id && data.user_id !== 'user_local_dev') setUser(data);
      }
    } catch (e) {}
    finally { setIsLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API}/stats`);
      if (r.ok) setStats(await r.json());
    } catch (e) {}
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }); setUser(null); } catch (e) {}
  };

  const modos = [
    {
      icon: <Home className="w-6 h-6" />,
      tag: null,
      title: "Público General",
      subtitle: "Estima el valor de tu propiedad",
      features: [
        "Sin registro requerido",
        "Estimación con IA en segundos",
        "Reporte PDF descargable",
        "Add-on: revisión por valuador certificado",
      ],
      cta: "Ver precios",
      ctaAction: () => navigate("/comprar"),
      featured: false,
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      tag: "Más Popular",
      title: "Valuador Profesional",
      subtitle: "Herramientas para peritos certificados",
      features: [
        "Comparables editables INDAABIN",
        "Factores de homologación CUS",
        "Reporte con folio, cédula y firma",
        "Red para recibir encargos",
      ],
      cta: "Conocer beneficios",
      ctaAction: () => navigate("/para-valuadores"),
      featured: true,
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      tag: "Empresas",
      title: "Inmobiliarias",
      subtitle: "Gestión de portafolio de propiedades",
      features: [
        "Desde 5 hasta 50+ avalúos/mes",
        "Logo y marca en cada reporte",
        "Fichas promocionales para asesores",
        "Multi-usuario desde plan Pro",
      ],
      cta: "Conocer beneficios",
      ctaAction: () => navigate("/para-inmobiliarias"),
      featured: false,
    },
  ];

  const trust = [
    { icon: <Award className="w-4 h-4" />, label: "Metodología de valuación CNBV" },
    { icon: <Shield className="w-4 h-4" />, label: "Criterios de valor SHF aplicados" },
    { icon: <Landmark className="w-4 h-4" />, label: "Factores de homologación INDAABIN" },
    { icon: <TrendingUp className="w-4 h-4" />, label: "Cobertura nacional" },
    { icon: <Zap className="w-4 h-4" />, label: "Resultados en segundos" },
  ];

  const whyUs = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "IA que analiza y redacta",
      desc: "Gemini AI lee el mercado y genera un análisis narrativo: tendencias de la zona, fortalezas, debilidades del inmueble y estrategia de comercialización — no solo números.",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Comparables en tiempo real",
      desc: "Búsqueda automática en Inmuebles24, Lamudi y Vivanuncios. Propiedades similares en tu zona con precios actuales — no promedios históricos desactualizados.",
    },
    {
      icon: <Landmark className="w-6 h-6" />,
      title: "Metodología bancaria oficial",
      desc: "CNBV · SHF · INDAABIN. Los mismos estándares que usan bancos y notarías para validar el valor de un inmueble. Cada factor de homologación, documentado.",
    },
  ];

  const reportItems = [
    { icon: <DollarSign className="w-5 h-5" />,    title: "Valor estimado de mercado",          desc: "Precio central + rango mínimo y máximo según comparables" },
    { icon: <Ruler className="w-5 h-5" />,          title: "Precio por m² (construcción y terreno)", desc: "Desglose del valor unitario ajustado a la zona" },
    { icon: <Map className="w-5 h-5" />,             title: "Tabla de comparables",               desc: "6–10 propiedades similares con precio, superficie y ajustes" },
    { icon: <TrendingUp className="w-5 h-5" />,      title: "Renta mensual estimada + cap rate",  desc: "Rendimiento esperado si se destina a arrendamiento" },
    { icon: <Brain className="w-5 h-5" />,           title: "Análisis de mercado con IA",         desc: "Tendencias, fortalezas y debilidades redactadas automáticamente" },
    { icon: <Target className="w-5 h-5" />,          title: "Estrategia de comercialización",     desc: "Recomendaciones de precio y canal de venta generadas por IA" },
    { icon: <BarChart2 className="w-5 h-5" />,       title: "Nivel de confianza",                 desc: "Indicador ALTO / MEDIO / BAJO basado en densidad de comparables" },
    { icon: <ClipboardList className="w-5 h-5" />,   title: "Metodología y factores aplicados",   desc: "CNBV / SHF / INDAABIN — homologación documentada y transparente" },
  ];

  const steps = [
    { number: "01", icon: <MapPin className="w-5 h-5" />,    title: "Ingresa los datos",       description: "Dirección, superficie, tipo de propiedad y características principales." },
    { number: "02", icon: <Brain className="w-5 h-5" />,     title: "Análisis con IA",         description: "Búsqueda automática de comparables y cálculo con metodología bancaria." },
    { number: "03", icon: <FileText className="w-5 h-5" />,  title: "Descarga tu reporte",     description: "Visualiza y descarga tu estimación profesional en PDF en segundos." },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <Building2 className="w-8 h-8 text-[#1B4332]" />
              <span className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">
                Prop<span className="text-[#52B788]">Valu</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {!isLoading && (
                user ? (
                  <>
                    <Button onClick={() => navigate("/dashboard")} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white" data-testid="dashboard-btn">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Mi Panel
                    </Button>
                    <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-[#1B4332]" data-testid="logout-btn">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleLogin} className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white transition-colors" data-testid="login-btn">
                    <User className="w-4 h-4 mr-2" /> Acceso Clientes
                  </Button>
                )
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="mobile-menu-btn">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
            {!isLoading && (user ? (
              <div className="space-y-2">
                <Button variant="ghost" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }} className="w-full justify-start text-[#1B4332]">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Mi Panel
                </Button>
                <Button variant="ghost" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start text-slate-600">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
                <User className="w-4 h-4 mr-2" /> Acceso Clientes
              </Button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[95vh] flex items-center pt-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Propiedad residencial en México"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(8,28,21,0.97) 0%, rgba(27,67,50,0.90) 45%, rgba(27,67,50,0.55) 100%)" }} />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center">
          {/* Headline — centered */}
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 bg-[#D9ED92]/15 border border-[#D9ED92]/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-[#D9ED92]" />
              <span className="text-[#D9ED92] text-xs font-bold tracking-widest uppercase">Metodología CNBV · SHF · INDAABIN</span>
            </div>
            <h1 className="font-['Outfit'] text-5xl sm:text-6xl font-black text-white tracking-tight leading-[1.0] mb-5">
              Conoce el valor real de{" "}
              <span className="text-[#D9ED92]">tu propiedad</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              La única plataforma de valuación inmobiliaria con inteligencia artificial que sigue la metodología bancaria mexicana. Resultados precisos, en segundos.
            </p>
          </div>

          {/* Mode Cards — centered */}
          <div className="grid md:grid-cols-3 gap-4 w-full max-w-4xl">
            {modos.map((modo, index) => {
              const isLime = hoveredModo === index;
              return (
                <div
                  key={index}
                  onClick={modo.ctaAction}
                  onMouseEnter={() => setHoveredModo(index)}
                  onMouseLeave={() => setHoveredModo(null)}
                  style={{ transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.25s" }}
                  className={`relative rounded-2xl cursor-pointer flex flex-col border-2 shadow-lg ${
                    isLime
                      ? "bg-[#D9ED92] border-[#D9ED92] shadow-[#D9ED92]/30 -translate-y-1"
                      : "bg-white/95 backdrop-blur-sm border-transparent -translate-y-0"
                  }`}
                >
                  {modo.tag && (
                    <div className="absolute -top-3 left-4">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full shadow bg-[#1B4332] text-white">
                        {modo.tag}
                      </span>
                    </div>
                  )}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isLime ? "bg-[#1B4332]/15 text-[#1B4332]" : "bg-[#1B4332]/10 text-[#1B4332]"}`}>
                      {modo.icon}
                    </div>
                    <div>
                      <h3 className="font-['Outfit'] text-base font-bold text-[#1B4332]">{modo.title}</h3>
                      <p className={`text-xs mt-0.5 transition-colors ${isLime ? "text-[#1B4332]/60" : "text-slate-500"}`}>{modo.subtitle}</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {modo.features.map((f, i) => (
                        <li key={i} className={`flex items-start gap-2 text-xs transition-colors ${isLime ? "text-[#1B4332]/75" : "text-slate-600"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors ${isLime ? "text-[#1B4332]" : "text-[#52B788]"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={(e) => { e.stopPropagation(); modo.ctaAction(); }}
                      className="w-full mt-1 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors"
                      data-testid={`modo-${index}-btn`}
                    >
                      {modo.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-10 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-[#D9ED92]" />
              <span>{stats.total_valuations.toLocaleString()}+ valuaciones realizadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D9ED92]" />
              <span>Resultados en menos de 60 seg</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#D9ED92]" />
              <span>Reporte PDF profesional incluido</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="bg-[#1B4332] py-4 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center items-center gap-6 md:gap-12">
          {trust.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-white/75 text-sm font-medium">
              <span className="text-[#D9ED92]">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── ¿POR QUÉ ELEGIRNOS? ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#D9ED92] text-[#1B4332] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Inteligencia Artificial · Datos Reales · Metodología Bancaria
            </span>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-[#1B4332]">
              ¿Por qué elegir PropValu?
            </h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
              No es solo una calculadora — es una plataforma que combina IA con comparables del mercado real y los estándares que exigen los bancos y notarías en México.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {whyUs.map((item, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-7 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-white flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4332] flex items-center justify-center text-white">
                  {item.icon}
                </div>
                <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ¿QUÉ INCLUYE EL REPORTE? ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(150deg, #081C15 0%, #1B4332 60%, #2D6A4F 100%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#D9ED92] text-[#1B4332] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Reporte PDF Profesional
            </span>
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white">
              ¿Qué datos incluye tu reporte?
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm mt-3 leading-relaxed">
              Un análisis completo que va mucho más allá del precio — contexto de mercado, datos duros y recomendaciones generadas con IA.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto mb-12">
            {reportItems.map((item, i) => (
              <div key={i} className="flex gap-4 bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.10] rounded-xl px-5 py-4 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[#D9ED92] flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm mb-0.5">{item.title}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => { navigate("/comprar"); window.scrollTo(0, 0); }}
              className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-base px-10 py-4 rounded-xl transition-all shadow-lg shadow-[#D9ED92]/20 inline-flex items-center gap-2"
            >
              Generar mi reporte ahora <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-white/30 text-xs mt-3">Sin registro · Listo en minutos · PDF descargable</p>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[440px]">
              <img
                src="https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Valuación profesional"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,28,21,0.80) 0%, transparent 50%)" }} />
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl">
                <p className="text-xs text-slate-500 mb-1">Valor estimado de mercado</p>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">$3,850,000 MXN</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-[#52B788]" />
                  <span className="text-xs text-[#1B4332] font-semibold">Confianza ALTA</span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <span className="inline-block bg-[#D9ED92] text-[#1B4332] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                Proceso simple
              </span>
              <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-[#1B4332] mb-10">
                De los datos al reporte en 3 pasos
              </h2>
              <div className="space-y-7">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-full bg-[#1B4332] text-white flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-[#52B788] text-xs font-bold mb-0.5 uppercase tracking-wider">{step.number}</p>
                      <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-1">{step.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/comprar")}
                className="mt-10 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors inline-flex items-center gap-2"
                data-testid="steps-cta-btn"
              >
                Comenzar ahora <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <ReviewsSection />

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(150deg, #081C15 0%, #1B4332 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white mb-3">
            ¿Cómo quieres usar PropValu?
          </h2>
          <p className="text-white/50 mb-10 text-sm leading-relaxed max-w-xl mx-auto">
            Elige tu perfil y empieza hoy — cada tipo de usuario tiene su propio acceso y beneficios.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Home className="w-6 h-6" />,
                label: "Público general",
                desc: "Quiero valuar mi propiedad",
                action: () => { window.scrollTo(0, 0); navigate("/comprar"); },
              },
              {
                icon: <Calculator className="w-6 h-6" />,
                label: "Soy valuador",
                desc: "Quiero afiliarme a la red",
                action: () => { window.scrollTo(0, 0); navigate("/para-valuadores"); },
              },
              {
                icon: <Building2 className="w-6 h-6" />,
                label: "Soy inmobiliaria",
                desc: "Quiero un plan para mi empresa",
                action: () => { window.scrollTo(0, 0); navigate("/para-inmobiliarias"); },
              },
            ].map((item, i) => {
              const isLime = hoveredCta === i;
              return (
                <button
                  key={i}
                  onClick={item.action}
                  onMouseEnter={() => setHoveredCta(i)}
                  onMouseLeave={() => setHoveredCta(null)}
                  style={{ transition: "background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s" }}
                  className={`flex flex-col items-center gap-3 px-6 py-6 rounded-2xl font-semibold ${
                    isLime
                      ? "bg-[#D9ED92] text-[#1B4332] border border-[#D9ED92] shadow-lg shadow-[#D9ED92]/20"
                      : "bg-white/10 text-white border border-white/20"
                  }`}
                  data-testid={`cta-${i}-btn`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isLime ? "bg-[#1B4332]/15" : "bg-white/10"}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-base">{item.label}</p>
                    <p className={`text-xs mt-0.5 transition-colors ${isLime ? "text-[#1B4332]/65" : "text-white/55"}`}>{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CAROUSEL AFILIADOS ── */}
      <AfiliadosCarousel tipo="inmobiliaria" />

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <button onClick={() => { window.scrollTo(0, 0); navigate("/para-valuadores"); }} className="hover:text-[#1B4332] transition-colors">Valuadores</button>
            <button onClick={() => { window.scrollTo(0, 0); navigate("/para-inmobiliarias"); }} className="hover:text-[#1B4332] transition-colors">Inmobiliarias</button>
            <button onClick={() => { window.scrollTo(0, 0); navigate("/anunciantes"); }} className="hover:text-[#1B4332] transition-colors">Anunciantes</button>
            <button onClick={() => { window.scrollTo(0, 0); navigate("/privacidad"); }} className="hover:text-[#1B4332] transition-colors">Política de Privacidad</button>
            <button onClick={() => { window.scrollTo(0, 0); navigate("/terminos"); }} className="hover:text-[#1B4332] transition-colors">Términos de Uso</button>
            <button onClick={() => { window.scrollTo(0, 0); navigate("/contacto"); }} className="hover:text-[#1B4332] transition-colors">Contacto</button>
          </div>
          <p className="text-sm text-slate-400">
            © 2025 PropValu México · Estimaciones orientativas, no avalúos oficiales.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Reviews
const SEED_REVIEWS = [
  { stars: 5, comment: "Rápido y preciso. Lo usé para una propiedad en Querétaro y el valor coincidió perfectamente con la tasación del banco.", author: "Carlos M." },
  { stars: 5, comment: "Excelente herramienta. El reporte PDF es muy profesional y me sirvió para negociar el precio de venta.", author: "Ana R." },
  { stars: 4, comment: "Muy buena estimación, fácil de usar. Me hubiera gustado poder agregar más fotos.", author: "Roberto L." },
];

const ReviewsSection = () => {
  const stored = JSON.parse(localStorage.getItem("propvalu_ratings") || "[]");
  const reviews = [
    ...stored
      .filter((r) => r.stars >= 4 && r.comment)
      .slice(-3)
      .map((r) => ({ stars: r.stars, comment: r.comment, author: "Usuario verificado" })),
    ...SEED_REVIEWS,
  ].slice(0, 6);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332] mb-2">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="flex justify-center items-center gap-1 mt-2">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm text-slate-500 font-medium">4.8 / 5</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`w-4 h-4 ${n <= r.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                ))}
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">"{r.comment}"</p>
              <p className="text-xs font-semibold text-[#1B4332]">— {r.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPage;
