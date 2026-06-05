import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API } from "@/App";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Enlace inválido o expirado");
      navigate("/login");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al restablecer contraseña");
      
      setIsSuccess(true);
      toast.success("Contraseña actualizada exitosamente");
      setTimeout(() => navigate("/login"), 3000);
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
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">Nueva contraseña</h1>
          
          {isSuccess ? (
            <div className="mt-6">
              <div className="bg-[#F0FAF5] p-4 rounded-xl border border-[#B7E4C7] mb-6">
                <p className="text-sm text-[#1B4332]">
                  Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión en unos segundos.
                </p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
                Ir al inicio de sesión
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-6">
                Por favor ingresa tu nueva contraseña a continuación.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Nueva contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password" required placeholder="••••••••" minLength={8}
                      className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password" required placeholder="••••••••" minLength={8}
                      className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-semibold py-2.5 mt-2">
                  {isLoading ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
