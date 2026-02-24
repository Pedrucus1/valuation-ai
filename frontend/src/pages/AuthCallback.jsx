import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/App";

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error("No session_id found");
          navigate("/", { replace: true });
          return;
        }

        // Exchange session_id for session_token
        const response = await fetch(`${API}/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
          throw new Error("Failed to authenticate");
        }

        const userData = await response.json();
        
        // Navigate to dashboard with user data
        navigate("/dashboard", { 
          replace: true,
          state: { user: userData }
        });

      } catch (error) {
        console.error("Auth error:", error);
        navigate("/", { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-[#1B4332] font-medium">Iniciando sesión...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
