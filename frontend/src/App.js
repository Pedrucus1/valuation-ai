import { useState, useEffect, useRef, lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

// ── Lazy-loaded pages (cada una carga solo cuando el usuario visita esa ruta) ──

// Públicas / landing
const LandingPage               = lazy(() => import("@/pages/LandingPage"));
const ValuationForm             = lazy(() => import("@/pages/ValuationForm"));
const ComparablesPage           = lazy(() => import("@/pages/ComparablesPage"));
const EdadesZonaPage            = lazy(() => import("@/pages/EdadesZonaPage"));
const ReportPage                = lazy(() => import("@/pages/ReportPage"));
const PricingPage               = lazy(() => import("@/pages/PricingPage"));
const BenefitsPage              = lazy(() => import("@/pages/BenefitsPage"));
const ValuadorPage              = lazy(() => import("@/pages/ValuadorPage"));
const InmobiliariaPage          = lazy(() => import("@/pages/InmobiliariaPage"));
const ThankYouPage              = lazy(() => import("@/pages/ThankYouPage"));
const FeedbackPage              = lazy(() => import("@/pages/FeedbackPage"));
const ContactoPage              = lazy(() => import("@/pages/ContactoPage"));
const ValuadoresDirectorioPage  = lazy(() => import("@/pages/ValuadoresDirectorioPage"));
const InmobiliariasDirectorioPage = lazy(() => import("@/pages/InmobiliariasDirectorioPage"));
const PromoPublicPage           = lazy(() => import("@/pages/PromoPublicPage"));

// Auth
const LoginPage                 = lazy(() => import("@/pages/LoginPage"));
const AuthCallback              = lazy(() => import("@/pages/AuthCallback"));
const ForgotPasswordPage        = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage         = lazy(() => import("@/pages/ResetPasswordPage"));

// Dashboards (pesados — lazy crítico)
const DashboardPage             = lazy(() => import("@/pages/DashboardPage"));
const ValuadorDashboardPage     = lazy(() => import("@/pages/ValuadorDashboardPage"));
const InmobiliariaDashboardPage = lazy(() => import("@/pages/InmobiliariaDashboardPage"));
const ProCheckoutPage           = lazy(() => import("@/pages/ProCheckoutPage"));

// Anunciantes
const AdvertiserLandingPage     = lazy(() => import("@/pages/AdvertiserLandingPage"));
const AdvertiserRegisterPage    = lazy(() => import("@/pages/AdvertiserRegisterPage"));
const AdvertiserConsolePage     = lazy(() => import("@/pages/AdvertiserConsolePage"));

// Editor visual (Plasmic) — hoja en blanco para diseñar/probar layouts
const PlasmicPage               = lazy(() => import("@/PlasmicPage"));

// Legal / misc
const PrivacidadPage            = lazy(() => import("@/pages/PrivacidadPage"));
const TerminosPage              = lazy(() => import("@/pages/TerminosPage"));
const TerminosAnunciantesPage   = lazy(() => import("@/pages/TerminosAnunciantesPage"));
const TerminosValuadoresPage    = lazy(() => import("@/pages/TerminosValuadoresPage"));
const TerminosInmobiliariasPage = lazy(() => import("@/pages/TerminosInmobiliariasPage"));
const CodigoEticaPage           = lazy(() => import("@/pages/CodigoEticaPage"));
const PoliticaAnunciosPage      = lazy(() => import("@/pages/PoliticaAnunciosPage"));
const ValuadorRedPage           = lazy(() => import("@/pages/ValuadorRedPage"));

// Admin (chunk separado — nunca carga para usuarios normales)
const AdminLogin                = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard            = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsuarios             = lazy(() => import("@/pages/admin/AdminUsuarios"));
const AdminKYC                  = lazy(() => import("@/pages/admin/AdminKYC"));
const AdminModeracion           = lazy(() => import("@/pages/admin/AdminModeracion"));
const AdminRoles                = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminFeedback             = lazy(() => import("@/pages/admin/AdminFeedback"));
const AdminValuadores           = lazy(() => import("@/pages/admin/AdminValuadores"));
const AdminBroadcast            = lazy(() => import("@/pages/admin/AdminBroadcast"));
const AdminNewsletter           = lazy(() => import("@/pages/admin/AdminNewsletter"));
const AdminScraper              = lazy(() => import("@/pages/admin/AdminScraper"));
const AdminCMS                  = lazy(() => import("@/pages/admin/AdminCMS"));
const AdminCFDI                 = lazy(() => import("@/pages/admin/AdminCFDI"));
const AdminPayouts              = lazy(() => import("@/pages/admin/AdminPayouts"));
const AdminAccesos              = lazy(() => import("@/pages/admin/AdminAccesos"));
const AdminCobertura            = lazy(() => import("@/pages/admin/AdminCobertura"));
const AdminReportes             = lazy(() => import("@/pages/admin/AdminReportes"));
const AdminBlacklist            = lazy(() => import("@/pages/admin/AdminBlacklist"));
const AdminAlertas              = lazy(() => import("@/pages/admin/AdminAlertas"));
const AdminPrecios              = lazy(() => import("@/pages/admin/AdminPrecios"));
const AdminMantenimiento        = lazy(() => import("@/pages/admin/AdminMantenimiento"));
const AdminAdsAnalytics         = lazy(() => import("@/pages/admin/AdminAdsAnalytics"));
const AdminInmobiliarias        = lazy(() => import("@/pages/admin/AdminInmobiliarias"));

// ── Spinner compartido ────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
    <div className="spinner" />
  </div>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = {
  user: null,
  setUser: () => {},
  isLoading: true,
  setIsLoading: () => {},
};

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    if (location.state?.user) return;
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, { credentials: "include" });
        if (!response.ok) throw new Error("Not authenticated");
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        navigate("/", { replace: true });
      }
    };
    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) return <PageSpinner />;
  return isAuthenticated ? children : null;
};

function AppRouter() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/valuar" element={<ValuationForm />} />
        <Route path="/comparables/:valuationId" element={<ComparablesPage />} />
        <Route path="/reporte/:valuationId" element={<ReportPage />} />
        <Route path="/promo/:propiedadId" element={<PromoPublicPage />} />
        <Route path="/comprar" element={<PricingPage />} />
        <Route path="/checkout/pro" element={<ProCheckoutPage />} />
        <Route path="/edades-zona" element={<EdadesZonaPage />} />
        <Route path="/dashboard/valuador" element={<ValuadorDashboardPage />} />
        <Route path="/dashboard/inmobiliaria" element={<InmobiliariaDashboardPage />} />
        <Route path="/gracias/:valuationId" element={<ThankYouPage />} />
        <Route path="/para-valuadores" element={<ValuadorPage />} />
        <Route path="/para-inmobiliarias" element={<InmobiliariaPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/diseno/:pageSlug" element={<PlasmicPage />} />
        <Route path="/diseno" element={<PlasmicPage />} />
        <Route path="/anunciantes" element={<AdvertiserLandingPage />} />
        <Route path="/anunciantes/registro" element={<AdvertiserRegisterPage />} />
        <Route path="/anunciantes/consola" element={<AdvertiserConsolePage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/contacto" element={<ContactoPage />} />
        <Route path="/terminos-anunciantes" element={<TerminosAnunciantesPage />} />
        <Route path="/terminos-valuadores" element={<TerminosValuadoresPage />} />
        <Route path="/terminos-inmobiliarias" element={<TerminosInmobiliariasPage />} />
        <Route path="/codigo-etica-valuadores" element={<CodigoEticaPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/valuadores" element={<ValuadoresDirectorioPage />} />
        <Route path="/inmobiliarias" element={<InmobiliariasDirectorioPage />} />
        <Route path="/politica-anuncios" element={<PoliticaAnunciosPage />} />
        <Route path="/valuador/red" element={<ValuadorRedPage />} />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />

        {/* Admin — chunk completamente separado */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/usuarios" element={<AdminProtectedRoute><AdminUsuarios /></AdminProtectedRoute>} />
        <Route path="/admin/kyc" element={<AdminProtectedRoute><AdminKYC /></AdminProtectedRoute>} />
        <Route path="/admin/moderacion" element={<AdminProtectedRoute><AdminModeracion /></AdminProtectedRoute>} />
        <Route path="/admin/roles" element={<AdminProtectedRoute rolesPermitidos={["superadmin"]}><AdminRoles /></AdminProtectedRoute>} />
        <Route path="/admin/feedback" element={<AdminProtectedRoute><AdminFeedback /></AdminProtectedRoute>} />
        <Route path="/admin/valuadores" element={<AdminProtectedRoute><AdminValuadores /></AdminProtectedRoute>} />
        <Route path="/admin/accesos" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminAccesos /></AdminProtectedRoute>} />
        <Route path="/admin/broadcast" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador","contenido"]}><AdminBroadcast /></AdminProtectedRoute>} />
        <Route path="/admin/newsletter" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador","contenido"]}><AdminNewsletter /></AdminProtectedRoute>} />
        <Route path="/admin/scraper" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador"]}><AdminScraper /></AdminProtectedRoute>} />
        <Route path="/admin/cms" element={<AdminProtectedRoute rolesPermitidos={["superadmin","contenido"]}><AdminCMS /></AdminProtectedRoute>} />
        <Route path="/admin/cfdi" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminCFDI /></AdminProtectedRoute>} />
        <Route path="/admin/payouts" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminPayouts /></AdminProtectedRoute>} />
        <Route path="/admin/reportes" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminReportes /></AdminProtectedRoute>} />
        <Route path="/admin/cobertura" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador"]}><AdminCobertura /></AdminProtectedRoute>} />
        <Route path="/admin/blacklist" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador","contenido"]}><AdminBlacklist /></AdminProtectedRoute>} />
        <Route path="/admin/alertas" element={<AdminProtectedRoute><AdminAlertas /></AdminProtectedRoute>} />
        <Route path="/admin/precios" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminPrecios /></AdminProtectedRoute>} />
        <Route path="/admin/mantenimiento" element={<AdminProtectedRoute rolesPermitidos={["superadmin"]}><AdminMantenimiento /></AdminProtectedRoute>} />
        <Route path="/admin/ads-analytics" element={<AdminProtectedRoute><AdminAdsAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/inmobiliarias" element={<AdminProtectedRoute><AdminInmobiliarias /></AdminProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
