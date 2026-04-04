import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { API } from "@/App";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await fetch(`${API}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Credenciales incorrectas");
      }
      const admin = await res.json();
      localStorage.setItem(
        "pv_admin",
        JSON.stringify({ nombre: admin.nombre, rol: admin.rol, token: admin.token, ts: Date.now() })
      );
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Error al iniciar sesión.");
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-[#0D1F18] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Building2 className="w-7 h-7 text-[#52B788]" />
          <span className="font-['Outfit'] text-2xl font-bold text-white">
            Prop<span className="text-[#52B788]">Valu</span>
            <span className="text-[#52B788] text-sm font-semibold ml-2 opacity-80">Admin</span>
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-[#52B788]" />
            <h1 className="font-['Outfit'] text-lg font-bold text-white">Acceso restringido</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Email de administrador</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@propvalu.mx"
                autoComplete="off"
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#52B788]/50 focus:border-[#52B788]/60"
                style={{ backgroundColor: "#1a2e23", color: "#fff", caretColor: "#52B788", WebkitBoxShadow: "0 0 0px 1000px #1a2e23 inset", WebkitTextFillColor: "#fff" }}
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#52B788]/50 focus:border-[#52B788]/60 pr-10"
                  style={{ backgroundColor: "#1a2e23", color: "#fff", caretColor: "#52B788", WebkitBoxShadow: "0 0 0px 1000px #1a2e23 inset", WebkitTextFillColor: "#fff" }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-[#52B788] hover:bg-[#3fa070] disabled:opacity-50 text-white font-bold text-sm rounded-xl py-3 transition-colors mt-2"
            >
              <Lock className="w-4 h-4" />
              {cargando ? "Verificando..." : "Ingresar al panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Acceso exclusivo para el equipo PropValu · IP registrada
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
