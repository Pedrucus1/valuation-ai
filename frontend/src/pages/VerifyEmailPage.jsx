import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/App";

// Landing del link que manda /auth/register (backend/routers/auth.py::_send_verification_email).
// Sin esto, el email de un usuario nunca queda confirmado y el guard
// require_admin_or_credentialed_contributor no lo deja proponer contenido.
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying"); // verifying | ok | error
  const [message, setMessage] = useState("");
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Enlace inválido: falta el token."); return; }
    if (ranOnce.current) return;
    ranOnce.current = true;
    fetch(`${API}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "No se pudo verificar el correo");
        setStatus("ok");
      })
      .catch((err) => { setStatus("error"); setMessage(err.message); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-8 relative">
      <div className="absolute top-4 left-4">
        <button onClick={() => navigate("/login")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-[#D9ED92]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          {status === "verifying" && <p className="text-slate-500">Verificando tu correo…</p>}

          {status === "ok" && (
            <>
              <MailCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">Correo verificado</h1>
              <p className="text-sm text-slate-500 mb-6">Ya puedes proponer contenido como colaborador acreditado.</p>
              <Button onClick={() => navigate("/dashboard/valuador")} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
                Continuar
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">No se pudo verificar</h1>
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-6">{message}</p>
              <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
                Ir al inicio de sesión
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
