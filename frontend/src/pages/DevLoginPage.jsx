import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/App";

const ROLES = [
  {
    id: "public",
    label: "Público General",
    emoji: "🌐",
    color: "bg-slate-100 border-slate-300 hover:border-slate-500",
    badge: "bg-slate-200 text-slate-700",
    description: "Acceso básico: valuación gratis, comparables limitados, sin descarga.",
    links: [
      { label: "Inicio", path: "/" },
      { label: "Hacer valuación", path: "/valuar" },
      { label: "Ver precios", path: "/comprar" },
      { label: "Para valuadores", path: "/para-valuadores" },
      { label: "Para inmobiliarias", path: "/para-inmobiliarias" },
      { label: "Base histórica", path: "/historico" },
    ],
  },
  {
    id: "realtor",
    label: "Inmobiliaria / Asesor",
    emoji: "🏢",
    color: "bg-blue-50 border-blue-300 hover:border-blue-500",
    badge: "bg-blue-100 text-blue-700",
    description: "Dashboard con valuaciones, botón Ficha comercial, comparables ilimitados.",
    links: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Nueva valuación", path: "/valuar" },
      { label: "Para inmobiliarias", path: "/para-inmobiliarias" },
      { label: "Base histórica", path: "/historico" },
    ],
  },
  {
    id: "appraiser",
    label: "Valuador Profesional",
    emoji: "📋",
    color: "bg-green-50 border-green-300 hover:border-green-500",
    badge: "bg-green-100 text-green-700",
    description: "Dashboard con KYC, ganancias, órdenes de servicio y payouts.",
    links: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Registro KYC", path: "/registro-valuador" },
      { label: "Nueva valuación", path: "/valuar" },
      { label: "Para valuadores", path: "/para-valuadores" },
    ],
  },
  {
    id: "admin",
    label: "Administrador",
    emoji: "⚙️",
    color: "bg-red-50 border-red-300 hover:border-red-500",
    badge: "bg-red-100 text-red-700",
    description: "Acceso total: KYC, newsletters, payouts, anuncios, pagos.",
    links: [
      { label: "Dashboard admin", path: "/dashboard" },
      { label: "Base histórica", path: "/historico" },
    ],
  },
  {
    id: "anunciante",
    label: "Anunciante",
    emoji: "📢",
    color: "bg-yellow-50 border-yellow-300 hover:border-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    description: "Gestiona tus creatividades: crea, edita, pausa y mide tus anuncios.",
    links: [
      { label: "Consola de anuncios", path: "/anunciantes/consola" },
    ],
  },
];

const ALL_PAGES = [
  { label: "/ — Landing", path: "/" },
  { label: "/valuar — Formulario", path: "/valuar" },
  { label: "/comprar — Precios", path: "/comprar" },
  { label: "/dashboard — Dashboard", path: "/dashboard" },
  { label: "/para-valuadores — Info valuadores", path: "/para-valuadores" },
  { label: "/para-inmobiliarias — Info inmobiliarias", path: "/para-inmobiliarias" },
  { label: "/registro-valuador — KYC", path: "/registro-valuador" },
  { label: "/historico — Base histórica", path: "/historico" },
  { label: "/anunciantes/consola — Consola ads", path: "/anunciantes/consola" },
];

export default function DevLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);

  const switchRole = async (role, destination) => {
    setLoading(role);
    setError(null);
    // Cada rol tiene su propio user_id para que los datos estén aislados
    const userId = `dev_${role}`;
    try {
      const res = await fetch(`${API}/auth/set-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, user_id: userId }),
      });
      if (!res.ok) throw new Error("Error al cambiar rol");
      const data = await res.json();
      // Guardamos user_id para que otros módulos (consola de anunciante, etc.) lo usen
      localStorage.setItem("propvalu_user_id", userId);
      localStorage.setItem("propvalu_role", data.role);
      setCurrent(data.role);
      if (destination) navigate(destination);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
            DEV
          </span>
          <h1 className="text-2xl font-bold">Panel de pruebas — PropValu</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Selecciona un rol para cambiar la sesión local y navegar al flujo correspondiente.
          Solo disponible en entorno de desarrollo.
        </p>

        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {current && (
          <div className="mb-6 bg-emerald-900/40 border border-emerald-700 text-emerald-300 rounded-lg px-4 py-3 text-sm">
            Rol activo: <strong>{current}</strong> — la sesión dev usa este rol hasta que lo cambies.
          </div>
        )}

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {ROLES.map((r) => (
            <div
              key={r.id}
              className={`border-2 rounded-xl p-5 transition-all ${r.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{r.emoji}</span>
                <span className="font-semibold text-gray-800 text-base">{r.label}</span>
                <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded ${r.badge}`}>
                  {r.id}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{r.description}</p>

              {/* Quick nav links */}
              <div className="flex flex-wrap gap-2 mb-4">
                {r.links.map((lk) => (
                  <button
                    key={lk.path}
                    onClick={() => switchRole(r.id, lk.path)}
                    disabled={loading === r.id}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    {lk.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => switchRole(r.id, null)}
                disabled={loading === r.id}
                className="w-full text-sm font-medium bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading === r.id ? "Cambiando…" : `Activar rol ${r.id}`}
              </button>
            </div>
          ))}
        </div>

        {/* All Pages */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Todas las páginas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_PAGES.map((pg) => (
              <button
                key={pg.path}
                onClick={() => navigate(pg.path)}
                className="text-left text-sm px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors font-mono"
              >
                {pg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flow guide */}
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Flujos de prueba
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <div>
              <span className="text-white font-medium">Público:</span>{" "}
              / → /valuar → /comparables/:id → /reporte/:id → /gracias/:id
            </div>
            <div>
              <span className="text-white font-medium">Inmobiliaria:</span>{" "}
              /valuar → /comparables → /reporte → /dashboard → /ficha/:id
            </div>
            <div>
              <span className="text-white font-medium">Valuador:</span>{" "}
              /para-valuadores → /registro-valuador → /dashboard (earnings widget)
            </div>
            <div>
              <span className="text-white font-medium">Admin:</span>{" "}
              /dashboard (KYC + newsletter + payouts tabs)
            </div>
            <div>
              <span className="text-white font-medium">Anunciante:</span>{" "}
              Activar rol anunciante → /anunciantes/consola → crear creatividad → ver impresiones
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-gray-600 text-xs">
          PropValu · Dev Tools · Este panel no aparece en producción
        </p>
      </div>
    </div>
  );
}
