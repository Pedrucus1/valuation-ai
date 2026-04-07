import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import LandingPage from "@/pages/LandingPage";
import ValuationForm from "@/pages/ValuationForm";
import ComparablesPage from "@/pages/ComparablesPage";
import ReportPage from "@/pages/ReportPage";
import DashboardPage from "@/pages/DashboardPage";
import AuthCallback from "@/pages/AuthCallback";
import BenefitsPage from "@/pages/BenefitsPage";
import ValuadorPage from "@/pages/ValuadorPage";
import PricingPage from "@/pages/PricingPage";
import InmobiliariaPage from "@/pages/InmobiliariaPage";
import ThankYouPage from "@/pages/ThankYouPage";
import LoginPage from "@/pages/LoginPage";
import ProCheckoutPage from "@/pages/ProCheckoutPage";
import ValuadorDashboardPage from "@/pages/ValuadorDashboardPage";
import InmobiliariaDashboardPage from "@/pages/InmobiliariaDashboardPage";
import AdvertiserLandingPage from "@/pages/AdvertiserLandingPage";
import AdvertiserRegisterPage from "@/pages/AdvertiserRegisterPage";
import AdvertiserConsolePage from "@/pages/AdvertiserConsolePage";
import PrivacidadPage from "@/pages/PrivacidadPage";
import TerminosPage from "@/pages/TerminosPage";
import ContactoPage from "@/pages/ContactoPage";
import TerminosAnunciantesPage from "@/pages/TerminosAnunciantesPage";
import TerminosValuadoresPage from "@/pages/TerminosValuadoresPage";
import TerminosInmobiliariasPage from "@/pages/TerminosInmobiliariasPage";
import CodigoEticaPage from "@/pages/CodigoEticaPage";
import FeedbackPage from "@/pages/FeedbackPage";
import ValuadoresDirectorioPage from "@/pages/ValuadoresDirectorioPage";
import PoliticaAnunciosPage from "@/pages/PoliticaAnunciosPage";
import ValuadorRedPage from "@/pages/ValuadorRedPage";

// Admin
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsuarios from "@/pages/admin/AdminUsuarios";
import AdminKYC from "@/pages/admin/AdminKYC";
import AdminModeracion from "@/pages/admin/AdminModeracion";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import AdminValuadores from "@/pages/admin/AdminValuadores";
import AdminBroadcast from "@/pages/admin/AdminBroadcast";
import AdminScraper from "@/pages/admin/AdminScraper";
import AdminCMS from "@/pages/admin/AdminCMS";
import AdminCFDI from "@/pages/admin/AdminCFDI";
import AdminCobertura from "@/pages/admin/AdminCobertura";
import AdminReportes from "@/pages/admin/AdminReportes";
import AdminBlacklist from "@/pages/admin/AdminBlacklist";
import AdminAlertas from "@/pages/admin/AdminAlertas";
import AdminPrecios from "@/pages/admin/AdminPrecios";
import AdminMantenimiento from "@/pages/admin/AdminMantenimiento";
import AdminAdsAnalytics from "@/pages/admin/AdminAdsAnalytics";
import AdminInmobiliarias from "@/pages/admin/AdminInmobiliarias";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = {
  user: null,
  setUser: () => {},
  isLoading: true,
  setIsLoading: () => {},
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    if (location.state?.user) return;

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Not authenticated");
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/", { replace: true });
      }
    };
    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

// App Router Component
function AppRouter() {
  const location = useLocation();
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/valuar" element={<ValuationForm />} />
      <Route path="/comparables/:valuationId" element={<ComparablesPage />} />
      <Route path="/reporte/:valuationId" element={<ReportPage />} />
      <Route path="/comprar" element={<PricingPage />} />
      <Route path="/checkout/pro" element={<ProCheckoutPage />} />
      <Route path="/dashboard/valuador" element={<ValuadorDashboardPage />} />
      <Route path="/dashboard/inmobiliaria" element={<InmobiliariaDashboardPage />} />
      <Route path="/gracias/:valuationId" element={<ThankYouPage />} />
      <Route path="/para-valuadores" element={<ValuadorPage />} />
      <Route path="/para-inmobiliarias" element={<InmobiliariaPage />} />
      <Route path="/login" element={<LoginPage />} />
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
      <Route path="/politica-anuncios" element={<PoliticaAnunciosPage />} />
      <Route path="/valuador/red" element={<ValuadorRedPage />} />
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/usuarios" element={<AdminProtectedRoute><AdminUsuarios /></AdminProtectedRoute>} />
      <Route path="/admin/kyc" element={<AdminProtectedRoute><AdminKYC /></AdminProtectedRoute>} />
      <Route path="/admin/moderacion" element={<AdminProtectedRoute><AdminModeracion /></AdminProtectedRoute>} />
      <Route path="/admin/roles" element={<AdminProtectedRoute rolesPermitidos={["superadmin"]}><AdminRoles /></AdminProtectedRoute>} />
      <Route path="/admin/feedback" element={<AdminProtectedRoute><AdminFeedback /></AdminProtectedRoute>} />
      <Route path="/admin/valuadores" element={<AdminProtectedRoute><AdminValuadores /></AdminProtectedRoute>} />
      <Route path="/admin/broadcast" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador","contenido"]}><AdminBroadcast /></AdminProtectedRoute>} />
      <Route path="/admin/scraper" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador"]}><AdminScraper /></AdminProtectedRoute>} />
      <Route path="/admin/cms" element={<AdminProtectedRoute rolesPermitidos={["superadmin","contenido"]}><AdminCMS /></AdminProtectedRoute>} />
      <Route path="/admin/cfdi" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminCFDI /></AdminProtectedRoute>} />
      <Route path="/admin/reportes" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminReportes /></AdminProtectedRoute>} />
      <Route path="/admin/cobertura" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador"]}><AdminCobertura /></AdminProtectedRoute>} />
      <Route path="/admin/blacklist" element={<AdminProtectedRoute rolesPermitidos={["superadmin","moderador","contenido"]}><AdminBlacklist /></AdminProtectedRoute>} />
      <Route path="/admin/alertas" element={<AdminProtectedRoute><AdminAlertas /></AdminProtectedRoute>} />
      <Route path="/admin/precios" element={<AdminProtectedRoute rolesPermitidos={["superadmin","finanzas"]}><AdminPrecios /></AdminProtectedRoute>} />
      <Route path="/admin/mantenimiento" element={<AdminProtectedRoute rolesPermitidos={["superadmin"]}><AdminMantenimiento /></AdminProtectedRoute>} />
      <Route path="/admin/ads-analytics" element={<AdminProtectedRoute><AdminAdsAnalytics /></AdminProtectedRoute>} />
      <Route path="/admin/inmobiliarias" element={<AdminProtectedRoute><AdminInmobiliarias /></AdminProtectedRoute>} />
    </Routes>
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
