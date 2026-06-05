import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API } from "@/App";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al enviar solicitud");
      
      setIsSent(true);
      toast.success("Correo enviado exitosamente");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">Recuperar contraseña</h1>
          
          {isSent ? (
            <div className="mt-6">
              <div className="bg-[#F0FAF5] p-4 rounded-xl border border-[#B7E4C7] mb-6">
                <p className="text-sm text-[#1B4332]">
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor revisa tu bandeja de entrada o carpeta de spam.
                </p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-6">
                Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email" required placeholder="tu@correo.com"
                      className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-semibold py-2.5 mt-2">
                  {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
