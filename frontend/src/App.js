import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
import FichaPage from "@/pages/FichaPage";
import KYCRegistroPage from "@/pages/KYCRegistroPage";
import HistoricoPage from "@/pages/HistoricoPage";
import AnunciantesConsolaPage from "@/pages/AnunciantesConsolaPage";
import DevLoginPage from "@/pages/DevLoginPage";
import PrivacidadPage from "@/pages/PrivacidadPage";
import TerminosPage from "@/pages/TerminosPage";
import ContactoPage from "@/pages/ContactoPage";

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
        const userId = localStorage.getItem("propvalu_user_id") || "user_local_dev";
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
          headers: { "X-User-Id": userId },
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
  
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/valuar" element={<ValuationForm />} />
      <Route path="/comparables/:valuationId" element={<ComparablesPage />} />
      <Route path="/reporte/:valuationId" element={<ReportPage />} />
      <Route path="/comprar" element={<PricingPage />} />
      <Route path="/gracias/:valuationId" element={<ThankYouPage />} />
      <Route path="/para-valuadores" element={<ValuadorPage />} />
      <Route path="/para-inmobiliarias" element={<InmobiliariaPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/ficha/:valuationId" element={<FichaPage />} />
      <Route path="/registro-valuador" element={<KYCRegistroPage />} />
      <Route path="/historico" element={<HistoricoPage />} />
      <Route path="/anunciantes/consola" element={<AnunciantesConsolaPage />} />
      <Route path="/dev/login" element={<DevLoginPage />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/terminos" element={<TerminosPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
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
