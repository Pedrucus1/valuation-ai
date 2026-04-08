import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ArrowLeft, ChevronRight, Calculator,
  LayoutDashboard, FileText, Users, Sliders, BarChart3,
  CheckCircle2, Shield, Star, TrendingUp, Zap, Crown,
  Package, Repeat, UserCheck
} from "lucide-react";

const CONTENT = {
  valuador: {
    badge: "Para Valuadores Certificados",
    heroImage: "https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=1600",
    headline: "El reporte de valuación más preciso del mercado",
    subheadline: "en minutos, no en horas",
    subtitle: "PropValu combina IA, comparables reales y metodología CNBV/SHF/INDAABIN para que generes reportes profesionales 10 veces más rápido que con el método tradicional.",
    stats: [
      { value: "80%", label: "De cada servicio te lo quedas tú" },
      { value: "< 3 min", label: "Tiempo promedio por reporte" },
      { value: "10+", label: "Comparables reales por valuación" },
    ],
    benefits: [
      {
        icon: <Sliders className="w-6 h-6" />,
        title: "Comparables Editables INDAABIN",
        desc: "Selecciona y ajusta manualmente los comparables. Edita cada factor de homologación directamente en la tabla: superficie, antigüedad, calidad, tipo de frente y más."
      },
      {
        icon: <Calculator className="w-6 h-6" />,
        title: "Cálculo CUS Automático",
        desc: "El Coeficiente de Utilización del Suelo se calcula automáticamente para cada comparable. Tú solo verificas y ajustas si lo consideras necesario."
      },
      {
        icon: <FileText className="w-6 h-6" />,
        title: "Reporte con Folio Oficial",
        desc: "Cada reporte incluye folio consecutivo (Est-AAMMDD-NN), fecha, datos del inmueble, metodología detallada y firma digital. Listo para entregar al cliente."
      },
      {
        icon: <BarChart3 className="w-6 h-6" />,
        title: "Análisis Narrativo con IA",
        desc: "Sección de análisis de mercado generada por IA: ventajas competitivas, áreas de oportunidad, plusvalía proyectada a 5 años y recomendaciones de venta."
      },
    ],
    highlights: [
      "Metodología CNBV / SHF / INDAABIN",
      "Valor físico + valor de mercado",
      "Plusvalía proyectada a 5 años",
      "Mapa de ubicación y fotos del inmueble",
      "Análisis de entorno (escuelas, hospitales, etc.)",
      "Descarga PDF en segundos",
    ],
    whySection: {
      title: "¿Por qué los valuadores eligen PropValu?",
      points: [
        { icon: <Zap className="w-5 h-5" />, text: "Genera en 3 minutos lo que antes tomaba 3 horas" },
        { icon: <Shield className="w-5 h-5" />, text: "Metodología alineada con las normas bancarias mexicanas" },
        { icon: <TrendingUp className="w-5 h-5" />, text: "Comparables reales obtenidos de portales inmobiliarios con IA" },
        { icon: <Star className="w-5 h-5" />, text: "Reportes con presentación profesional lista para el cliente" },
      ]
    },
    cta: "Acceder como Valuador",
    accentColor: "bg-[#1B4332]",
    accentHover: "hover:bg-[#2D6A4F]",
  },
  inmobiliaria: {
    badge: "Para Inmobiliarias",
    heroImage: "https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=1600",
    headline: "Valúa más propiedades,",
    subheadline: "cierra más ventas",
    subtitle: "PropValu da a tu equipo inmobiliario la herramienta para presentar valuaciones profesionales a tus clientes, generar confianza y acelerar el proceso de venta o renta.",
    stats: [
      { value: "3", label: "Planes y paquetes de créditos" },
      { value: "PDF", label: "Reportes profesionales listos" },
      { value: "48h", label: "Revisión por valuador certificado" },
    ],
    benefits: [
      {
        icon: <LayoutDashboard className="w-6 h-6" />,
        title: "Dashboard Analítico Completo",
        desc: "Visualiza el historial de todas tus valuaciones con estadísticas, tendencias y métricas de valor por zona geográfica."
      },
      {
        icon: <Building2 className="w-6 h-6" />,
        title: "Gestión de Portafolio",
        desc: "Organiza y accede a todas las propiedades valuadas desde un solo lugar. Busca, filtra y compara propiedades de tu portafolio en segundos."
      },
      {
        icon: <FileText className="w-6 h-6" />,
        title: "Presentaciones para Clientes",
        desc: "Reportes PDF profesionales con diseño de alto impacto. Presenta el valor de mercado con gráficas, comparables y análisis de zona que generan confianza en el comprador."
      },
      {
        icon: <Users className="w-6 h-6" />,
        title: "Herramienta para tu Equipo",
        desc: "Todos los asesores de tu inmobiliaria pueden generar valuaciones consistentes y profesionales con la misma metodología estandarizada."
      },
    ],
    highlights: [
      "Acceso desde cualquier dispositivo",
      "Historial completo de valuaciones",
      "Reportes PDF descargables",
      "Comparables de mercado con IA",
      "Análisis de plusvalía por zona",
      "Metodología bancaria reconocida",
    ],
    whySection: {
      title: "¿Por qué las inmobiliarias eligen PropValu?",
      points: [
        { icon: <Shield className="w-5 h-5" />, text: "Genera confianza en compradores con reportes profesionales" },
        { icon: <Zap className="w-5 h-5" />, text: "Acelera el proceso de venta con argumentos de valor sólidos" },
        { icon: <TrendingUp className="w-5 h-5" />, text: "Precios alineados con el mercado real: menos rechazos" },
        { icon: <Star className="w-5 h-5" />, text: "Tu marca, metodología bancaria y tecnología de IA" },
      ]
    },
    cta: "Acceder como Inmobiliaria",
    accentColor: "bg-[#2D6A4F]",
    accentHover: "hover:bg-[#1B4332]",
  },
};

const BenefitsPage = ({ type }) => {
  const navigate = useNavigate();
  const content = CONTENT[type];

  const roleKey = type === 'valuador' ? 'appraiser' : 'realtor';

  const handleLogin = () => {
    navigate('/login', { state: { role: roleKey } });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-500 hover:text-[#1B4332] -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </Button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                <Building2 className="w-7 h-7 text-[#1B4332]" />
                <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
                  Prop<span className="text-[#52B788]">Valu</span>
                </span>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white" data-testid="login-benefits-btn">
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero con foto */}
      <section className="relative min-h-[70vh] flex items-center pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={content.heroImage} alt="Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#081C15]/95 via-[#1B4332]/85 to-[#1B4332]/40" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Badge className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92] mb-5">
            {content.badge}
          </Badge>
          <h1 className="font-['Outfit'] text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-2">
            {content.headline}
          </h1>
          <h2 className="font-['Outfit'] text-4xl sm:text-5xl font-bold text-[#D9ED92] tracking-tight mb-5">
            {content.subheadline}
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mb-8 leading-relaxed">
            {content.subtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              onClick={handleLogin}
              className={`${content.accentColor} ${content.accentHover} text-white px-8 py-6 text-lg font-semibold shadow-xl`}
              data-testid="cta-login-btn"
            >
              {content.cta} <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/valuar")}
              className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              Ver demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-2xl">
            {content.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-['Outfit'] text-3xl font-bold text-[#D9ED92]">{s.value}</p>
                <p className="text-white/60 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92] mb-3">Funcionalidades</Badge>
            <h2 className="font-['Outfit'] text-3xl font-bold text-[#1B4332]">
              Todo lo que necesitas en una sola plataforma
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {content.benefits.map((benefit, index) => (
              <Card key={index} className="bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D9ED92] to-[#52B788]/30 flex items-center justify-center text-[#1B4332] flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-[#1B4332] mb-2">{benefit.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{benefit.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why section + Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">

          {/* Why */}
          <Card className="bg-[#1B4332] border-0 text-white">
            <CardContent className="p-8">
              <h3 className="font-['Outfit'] text-xl font-bold text-white mb-6">
                {content.whySection.title}
              </h3>
              <ul className="space-y-4">
                {content.whySection.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D9ED92]/20 flex items-center justify-center text-[#D9ED92] flex-shrink-0 mt-0.5">
                      {p.icon}
                    </div>
                    <span className="text-white/85 text-sm leading-relaxed">{p.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card className="bg-white border border-slate-100 shadow-sm">
            <CardContent className="p-8">
              <h3 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-6">
                Todo incluido en tu acceso
              </h3>
              <ul className="space-y-3">
                {content.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#52B788] flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA con foto */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src="https://images.pexels.com/photos/280221/pexels-photo-280221.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Propiedad"
              className="w-full h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#081C15]/95 to-[#1B4332]/85 flex items-center">
              <div className="px-8 md:px-12">
                <h2 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-white mb-2">
                  ¿Listo para empezar?
                </h2>
                <p className="text-white/75 mb-6 text-sm max-w-lg">
                  Inicia sesión con Google y accede a todas las herramientas profesionales de PropValu
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={handleLogin}
                    className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92]/90 font-semibold px-8"
                    data-testid="cta-login-bottom-btn"
                  >
                    {content.cta} <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    Ver todos los planes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92] mb-3">Planes y Precios</Badge>
          <h2 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Acceso sencillo y transparente
          </h2>
          <p className="text-slate-600 mb-10 text-sm">
            Sin contratos ni compromisos. Empieza hoy.
          </p>

          {type === 'valuador' ? (
            /* VALUADOR: son Partners que reciben trabajo, no pagan por avalúo */
            <div className="space-y-6">
              <div className="rounded-xl bg-[#F0FDF4] border border-[#52B788]/30 p-6 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1B4332] flex items-center justify-center flex-shrink-0">
                    <Crown className="w-6 h-6 text-[#D9ED92]" />
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-lg mb-1">Registro gratuito — tú cobras, nosotros administramos</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Como Valuador Partner no pagas por avalúo: recibes trabajos asignados por la plataforma y te quedas con el <strong>80% de cada servicio</strong>. PropValu retiene el 20% como comisión de marketplace.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Revisión remota</p>
                        <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">$280 <span className="text-sm font-normal text-slate-500">MXN</span></p>
                        <p className="text-xs text-[#52B788] font-semibold mt-0.5">Tú recibes $224 MXN</p>
                        <p className="text-xs text-slate-500 mt-1">Firma digital, revisión de comparables y factores INDAABIN</p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Visita física</p>
                        <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">$480 <span className="text-sm font-normal text-slate-500">MXN</span></p>
                        <p className="text-xs text-[#52B788] font-semibold mt-0.5">Tú recibes $384 MXN</p>
                        <p className="text-xs text-slate-500 mt-1">Verificación física de m², firma y entrega de reporte</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-[#52B788]" /> Pagos automáticos el primer día de cada mes</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-[#52B788]" /> Acceso a volumen de propiedades similares en tu zona</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-[#52B788]" /> Listado público segmentado por Estado/Municipio</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-[#52B788]" /> Dashboard con historial de trabajos y ganancias</li>
              </ul>
            </div>
          ) : (
            /* INMOBILIARIA: paquetes mensuales con descuento escalonado */
            <div className="grid sm:grid-cols-4 gap-4 text-left">
              {/* Lite 5 */}
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Lite 5</p>
                  <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-0">$1,358 <span className="text-sm font-normal text-slate-500">MXN/mes</span></p>
                  <p className="text-xs text-[#52B788] font-semibold mb-3">5 avalúos · $271.60/u (-3%)</p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-5">
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Dashboard profesional</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Ficha publicitaria básica</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Base de datos histórica</li>
                  </ul>
                  <Button variant="outline" size="sm" className="w-full border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white text-xs" onClick={handleLogin}>
                    Comenzar <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              {/* Lite 10 */}
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Lite 10</p>
                  <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-0">$2,688 <span className="text-sm font-normal text-slate-500">MXN/mes</span></p>
                  <p className="text-xs text-[#52B788] font-semibold mb-3">10 avalúos · $268.80/u (-4%)</p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-5">
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Dashboard profesional</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Ficha publicitaria básica</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Base de datos histórica</li>
                  </ul>
                  <Button variant="outline" size="sm" className="w-full border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white text-xs" onClick={handleLogin}>
                    Comenzar <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              {/* Pro 20 */}
              <Card className="border-2 border-[#52B788] shadow-lg relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#52B788] text-white px-3 py-0.5 text-xs">Más popular</Badge>
                </div>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Pro 20</p>
                  <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-0">$5,320 <span className="text-sm font-normal text-slate-500">MXN/mes</span></p>
                  <p className="text-xs text-[#52B788] font-semibold mb-3">20 avalúos · $266.00/u (-5%)</p>
                  <ul className="space-y-1.5 text-xs text-slate-600 mb-5">
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Dashboard + Newsletter semanal</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Ficha publicitaria completa</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Base de datos histórica</li>
                  </ul>
                  <Button size="sm" className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs" onClick={handleLogin}>
                    Comenzar <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              {/* Premier */}
              <Card className="border border-slate-200 shadow-sm bg-[#081C15] text-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown className="w-3.5 h-3.5 text-[#D9ED92]" />
                    <p className="text-xs font-semibold text-[#D9ED92]/80 uppercase">Premier</p>
                  </div>
                  <p className="font-['Outfit'] text-2xl font-bold text-white mb-0">30–50+ <span className="text-sm font-normal text-white/60">avalúos/mes</span></p>
                  <p className="text-xs text-[#D9ED92] font-semibold mb-3">Precio especial · Pago domiciliado</p>
                  <ul className="space-y-1.5 text-xs text-white/80 mb-5">
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Sin publicidad</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Data Analysis mensual incluido</li>
                    <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Acceso multi-usuario</li>
                  </ul>
                  <Button size="sm" variant="outline" className="w-full border-[#D9ED92]/40 text-[#D9ED92] hover:bg-[#D9ED92]/10 text-xs" onClick={handleLogin}>
                    Contactar ventas <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add-on: Revisión por Valuador Profesional */}
          <div className="mt-8 rounded-xl border-2 border-dashed border-[#52B788]/50 bg-[#F0FDF4] p-6 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1B4332] flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6 text-[#D9ED92]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-['Outfit'] font-bold text-[#1B4332]">Add-on: Revisión por Valuador Certificado</h3>
                  <Badge className="bg-[#1B4332] text-white text-xs">+$350 MXN</Badge>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Un valuador profesional certificado (CNBV/INDAABIN) revisa tu reporte generado, valida los comparables seleccionados, ajusta factores de homologación y firma el documento. Ideal cuando necesitas mayor respaldo técnico o cuando la propiedad tiene características atípicas.
                </p>
                <ul className="grid sm:grid-cols-2 gap-1 text-xs text-slate-600">
                  <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Revisión en menos de 48 horas</li>
                  <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Firma y cédula del valuador</li>
                  <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Ajuste de comparables si es necesario</li>
                  <li className="flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#52B788]" /> Mayor validez ante instituciones financieras</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-6">* Precios en MXN + IVA. Integración de pagos próximamente — por ahora el acceso es directo.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            © 2025 PropValu México. Estimaciones orientativas, no avalúos oficiales.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BenefitsPage;
