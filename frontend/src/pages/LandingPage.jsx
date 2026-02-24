import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  LineChart,
  Shield,
  Clock,
  ChevronRight,
  Map,
  Calculator,
  Download,
  User,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { API } from "@/App";

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total_valuations: 0, total_users: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.log("Not authenticated");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const features = [
    {
      icon: <Calculator className="w-6 h-6" />,
      title: "Estimación Instantánea",
      description: "Obtén el valor estimado de tu propiedad en segundos con nuestra IA avanzada"
    },
    {
      icon: <Map className="w-6 h-6" />,
      title: "Comparables de Mercado",
      description: "Análisis de 6-10 propiedades similares en tu zona para mayor precisión"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Reportes Profesionales",
      description: "Descarga reportes PDF con metodología CNBV/SHF para uso profesional"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Metodología Bancaria",
      description: "Basado en estándares de valuación inmobiliaria mexicana"
    }
  ];

  const steps = [
    { number: "01", title: "Ingresa los Datos", description: "Ubicación, superficie y características básicas" },
    { number: "02", title: "Análisis IA", description: "Búsqueda de comparables y cálculo de valor" },
    { number: "03", title: "Obtén tu Reporte", description: "Visualiza y descarga tu estimación en PDF" }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-[#1B4332]" />
              <span className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">
                Prop<span className="text-[#52B788]">Valu</span>
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              {!isLoading && (
                <>
                  {user ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/dashboard")}
                        className="text-[#1B4332] hover:bg-[#D9ED92]/30"
                        data-testid="dashboard-btn"
                      >
                        <User className="w-4 h-4 mr-2" />
                        {user.name}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="text-slate-600 hover:text-[#1B4332]"
                        data-testid="logout-btn"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleLogin}
                      className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                      data-testid="login-btn"
                    >
                      Iniciar Sesión
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
            {!isLoading && (
              <>
                {user ? (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}
                      className="w-full justify-start text-[#1B4332]"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {user.name}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full justify-start text-slate-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesión
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleLogin}
                    className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                  >
                    Iniciar Sesión
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <Badge className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92]">
                Metodología CNBV / SHF / INDAABIN
              </Badge>
              <h1 className="font-['Outfit'] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1B4332] tracking-tight leading-tight">
                Estima el valor de tu propiedad en{" "}
                <span className="text-[#52B788]">segundos</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                Plataforma de valuación inmobiliaria con inteligencia artificial.
                Obtén estimaciones precisas basadas en comparables de mercado y
                metodología bancaria mexicana.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/valuar")}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  data-testid="start-valuation-btn"
                >
                  Comenzar Valuación
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                {user && user.role === "appraiser" && (
                  <Badge className="bg-[#1B4332] text-white self-center">
                    Modo Valuador Activo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-8 pt-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Resultados en 30 seg</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Reporte PDF incluido</span>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/17174768/pexels-photo-17174768.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Modern Luxury Villa Mexico"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B4332]/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-sm opacity-80">Valuaciones realizadas</p>
                  <p className="text-3xl font-bold font-['Outfit']">
                    {stats.total_valuations.toLocaleString()}+
                  </p>
                </div>
              </div>

              {/* Floating card */}
              <Card className="absolute -bottom-6 -right-4 bg-white shadow-xl border-0 w-48 animate-slide-in" style={{ animationDelay: "0.4s" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D9ED92] flex items-center justify-center">
                      <LineChart className="w-5 h-5 text-[#1B4332]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Precisión</p>
                      <p className="text-lg font-bold text-[#1B4332]">95%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-semibold text-[#1B4332] tracking-tight">
              ¿Por qué elegir PropValu?
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Tecnología de punta combinada con metodología de valuación profesional
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all card-hover"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center text-[#1B4332] mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-['Outfit'] text-lg font-semibold text-[#1B4332] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-['Outfit'] text-3xl md:text-4xl font-semibold text-[#1B4332] tracking-tight">
              ¿Cómo funciona?
            </h2>
            <p className="mt-4 text-slate-600">
              Tres simples pasos para obtener tu estimación
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative"
              >
                <div className="text-6xl font-['Outfit'] font-bold text-[#D9ED92] mb-4">
                  {step.number}
                </div>
                <h3 className="font-['Outfit'] text-xl font-semibold text-[#1B4332] mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full">
                    <div className="w-1/2 h-0.5 bg-[#D9ED92]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-[#1B4332] to-[#081C15] border-0 overflow-hidden">
            <CardContent className="p-8 md:p-12 text-center text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#52B788]/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <h2 className="font-['Outfit'] text-2xl md:text-3xl font-bold mb-4">
                  ¿Listo para conocer el valor de tu propiedad?
                </h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto">
                  Comienza ahora y obtén una estimación profesional en menos de un minuto
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate("/valuar")}
                  className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92]/90 px-8 py-6 text-lg font-semibold"
                  data-testid="cta-valuation-btn"
                >
                  Comenzar Valuación Gratuita
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-7 h-7 text-[#1B4332]" />
              <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
                Prop<span className="text-[#52B788]">Valu</span>
              </span>
            </div>
            <p className="text-sm text-slate-500">
              © 2025 PropValu México. Estimaciones orientativas, no avalúos oficiales.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
