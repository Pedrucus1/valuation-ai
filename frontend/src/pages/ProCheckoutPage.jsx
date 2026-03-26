import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, CheckCircle2, Zap, Crown, Star, CreditCard, Users, Briefcase } from "lucide-react";

/* ─── Plans ─────────────────────────────────────────────── */

const VALUADOR_PLANS = [
  {
    id: "v_starter",
    label: "Starter",
    valuations: 10,
    price: 1200,
    perUnit: 120,
    tag: null,
    popular: false,
    icon: Star,
    features: ["10 valuaciones / mes", "Reporte PDF con tu firma", "Soporte por email", "Panel de historial"],
  },
  {
    id: "v_pro",
    label: "Pro",
    valuations: 30,
    price: 3000,
    perUnit: 100,
    tag: "Más popular",
    popular: true,
    icon: Crown,
    features: ["30 valuaciones / mes", "Reporte PDF con tu firma", "Soporte prioritario", "Panel de historial", "Badge verificado en perfil", "Asignación preferente de trabajos"],
  },
  {
    id: "v_premium",
    label: "Premium",
    valuations: null,
    price: 6500,
    perUnit: null,
    tag: "Sin límite",
    popular: false,
    icon: Zap,
    features: ["Valuaciones ilimitadas", "Reporte PDF con tu firma", "Soporte dedicado", "Panel avanzado", "Badge verificado en perfil", "Asignación preferente", "Módulo de peritajes habilitado"],
  },
];

const INMOBILIARIA_PLANS = [
  {
    id: "i_basico",
    label: "Básico",
    valuations: 5,
    price: 950,
    perUnit: 190,
    tag: null,
    popular: false,
    icon: Star,
    features: ["5 valuaciones / mes", "1 usuario (titular)", "Reporte PDF PropValu", "Ficha comercial JPG/PDF"],
  },
  {
    id: "i_estandar",
    label: "Estándar",
    valuations: 20,
    price: 2800,
    perUnit: 140,
    tag: "Más popular",
    popular: true,
    icon: Crown,
    features: ["20 valuaciones / mes", "Hasta 5 asesores", "Reporte PDF PropValu", "Ficha comercial JPG/PDF", "Dashboard de equipo", "Créditos compartidos"],
  },
  {
    id: "i_premier",
    label: "Premier",
    valuations: 50,
    price: 7200,
    perUnit: 144,
    tag: "Equipo grande",
    popular: false,
    icon: Briefcase,
    features: ["50 valuaciones / mes", "Asesores ilimitados", "Reporte PDF PropValu", "Ficha comercial JPG/PDF", "Dashboard de equipo", "Créditos compartidos", "Reporte mensual de mercado", "Soporte dedicado"],
  },
];

const fmt = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

/* ─── Simulated Payment Modal ────────────────────────────── */

function PaymentModal({ plan, role, total, onClose, onSuccess }) {
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fmtCard = (v) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExpiry = (v) =>
    v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

  const handlePay = async () => {
    if (!card.number || !card.expiry || !card.cvv || !card.name) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2200));
    setLoading(false);
    setSuccess(true);
    await new Promise(r => setTimeout(r, 1400));
    onSuccess();
  };

  const fmtNum = (v) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#1B4332] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-['Outfit'] font-bold text-white text-base">Pago seguro simulado</p>
            <p className="text-xs text-white/60 mt-0.5">Entorno de prueba · no se realiza cobro real</p>
          </div>
          {!loading && !success && (
            <button onClick={onClose} className="text-white/50 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-[#D9ED92] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#1B4332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-['Outfit'] text-xl font-bold text-[#1B4332]">¡Plan activado!</p>
            <p className="text-sm text-slate-500 mt-1">
              {plan.valuations
                ? `${plan.valuations} valuaciones disponibles en tu cuenta`
                : "Valuaciones ilimitadas activadas"}
            </p>
            <p className="text-xs text-slate-400 mt-3">Redirigiendo a tu dashboard…</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Order summary */}
            <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Plan {plan.label} · {plan.valuations ? `${plan.valuations} valuaciones/mes` : "Ilimitado"}
                </span>
                <span className="font-semibold text-[#1B4332]">{fmtNum(plan.price)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs">
                <span>IVA (16%)</span>
                <span>{fmtNum(plan.price * 0.16)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1B4332] border-t border-slate-200 pt-2 mt-1">
                <span>Total con IVA</span>
                <span>{fmtNum(total)}</span>
              </div>
            </div>

            {/* Card fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Número de tarjeta</label>
                <input
                  className="w-full border border-[#B7E4C7] rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white font-mono tracking-wider"
                  placeholder="4242 4242 4242 4242"
                  value={card.number}
                  maxLength={19}
                  onChange={e => setCard(p => ({ ...p, number: fmtCard(e.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Vencimiento</label>
                  <input
                    className="w-full border border-[#B7E4C7] rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white"
                    placeholder="MM/AA"
                    value={card.expiry}
                    maxLength={5}
                    onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">CVV</label>
                  <input
                    className="w-full border border-[#B7E4C7] rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white"
                    placeholder="123"
                    value={card.cvv}
                    maxLength={4}
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre en la tarjeta</label>
                <input
                  className="w-full border border-[#B7E4C7] rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white uppercase"
                  placeholder="NOMBRE APELLIDO"
                  value={card.name}
                  onChange={e => setCard(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="w-4 h-4 text-[#52B788] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pago simulado · Datos de prueba no se procesan
            </div>

            <button
              onClick={handlePay}
              disabled={loading || !card.number || !card.expiry || !card.cvv || !card.name}
              className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Procesando…
                </>
              ) : (
                `Activar plan · ${fmtNum(total)}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────── */

export default function ProCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Puede recibirse role/userData desde location.state (desde el login)
  const role = location.state?.role || "valuador"; // "valuador" | "inmobiliaria"
  const userName = location.state?.name || "";
  const existingCredits = location.state?.credits ?? null; // null = no verificado aún

  const plans = role === "inmobiliaria" ? INMOBILIARIA_PLANS : VALUADOR_PLANS;
  const defaultPlan = plans.find(p => p.popular) || plans[1];

  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [showModal, setShowModal] = useState(false);

  const totalWithIva = selectedPlan.price * 1.16;

  const handleSuccess = () => {
    // Guardar créditos en localStorage (simulado)
    const sessionKey = role === "inmobiliaria" ? "inmobiliaria_session" : "valuador_session";
    const existing = JSON.parse(localStorage.getItem(sessionKey) || "{}");
    localStorage.setItem(sessionKey, JSON.stringify({
      ...existing,
      plan: selectedPlan.id,
      credits: selectedPlan.valuations ?? 999,
      planLabel: selectedPlan.label,
    }));
    navigate("/dashboard", { state: { user: location.state?.user } });
  };

  const roleLabel = role === "inmobiliaria" ? "Inmobiliaria" : "Valuador";
  const RoleIcon = role === "inmobiliaria" ? Briefcase : Users;

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{ background: "linear-gradient(160deg, #051410 0%, #0d2318 50%, #1a3a28 100%)" }}
    >
      {/* Header */}
      <header
        className="border-b border-white/8 sticky top-0 z-20"
        style={{ background: "rgba(5,20,16,0.90)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-white" />
            <span className="font-['Outfit'] text-xl font-bold text-white">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </button>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <RoleIcon className="w-4 h-4" />
            <span>{roleLabel}{userName ? ` · ${userName}` : ""}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Si ya tiene créditos activos */}
        {existingCredits !== null && existingCredits > 0 ? (
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-[#D9ED92]/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#D9ED92]" />
            </div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-white mb-2">
              Ya tienes créditos activos
            </h1>
            <p className="text-white/60 mb-2">
              Te quedan <span className="text-[#D9ED92] font-bold text-xl">{existingCredits}</span> valuaciones disponibles este mes.
            </p>
            <p className="text-white/40 text-sm mb-8">Puedes continuar valuando directamente o comprar más créditos si los necesitas.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/dashboard", { state: { user: location.state?.user } })}
                className="bg-[#D9ED92] text-[#1B4332] font-bold px-8 py-3 rounded-xl hover:bg-[#c8e070] transition-colors"
              >
                Ir a mi dashboard
              </button>
              <button
                onClick={() => {}}
                className="border border-white/20 text-white/70 px-8 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                Comprar más créditos
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-[#D9ED92]/10 border border-[#D9ED92]/20 text-[#D9ED92] text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">
                <RoleIcon className="w-3.5 h-3.5" />
                Plan {roleLabel}
              </span>
              <h1 className="font-['Outfit'] text-3xl md:text-4xl font-bold text-white mb-3">
                Elige tu plan mensual
              </h1>
              <p className="text-white/55 max-w-lg mx-auto text-sm leading-relaxed">
                Activa tu cuenta y empieza a generar valuaciones con IA.
                Sin contrato de permanencia · Cancela cuando quieras.
              </p>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
              {plans.map(plan => {
                const Icon = plan.icon;
                const active = selectedPlan.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                      active
                        ? "border-[#D9ED92] bg-[#D9ED92]/5 shadow-lg"
                        : "border-white/15 hover:border-white/30 bg-white/[0.04]"
                    }`}
                  >
                    {plan.tag && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                        plan.popular ? "bg-[#D9ED92] text-[#1B4332]" : "bg-white/20 text-white"
                      }`}>
                        {plan.tag}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      active ? "bg-[#D9ED92]/20" : "bg-white/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${active ? "text-[#D9ED92]" : "text-white/60"}`} />
                    </div>

                    <p className={`font-['Outfit'] text-xl font-bold mb-0.5 ${active ? "text-[#D9ED92]" : "text-white"}`}>
                      {plan.label}
                    </p>
                    <p className="text-white/40 text-xs mb-4">
                      {plan.valuations ? `${plan.valuations} valuaciones / mes` : "Valuaciones ilimitadas"}
                    </p>

                    <p className="font-['Outfit'] text-3xl font-black text-white">
                      {fmt(plan.price)}
                    </p>
                    <p className="text-xs text-white/30 mb-4">+ IVA / mes</p>
                    {plan.perUnit && (
                      <p className="text-xs text-[#52B788] font-semibold mb-4">
                        {fmt(plan.perUnit)} por valuación
                      </p>
                    )}

                    <ul className="space-y-1.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active ? "text-[#D9ED92]" : "text-[#52B788]"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Summary + CTA */}
            <div className="max-w-sm mx-auto">
              <div
                className="rounded-2xl border border-[#D9ED92]/20 overflow-hidden"
                style={{ background: "linear-gradient(165deg, #0a1f14 0%, #1B4332 100%)" }}
              >
                <div className="px-5 py-4 border-b border-white/10 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/55">Plan {selectedPlan.label}</span>
                    <span className="font-semibold text-white">{fmt(selectedPlan.price)}</span>
                  </div>
                  <div className="flex justify-between text-white/35 text-xs">
                    <span>IVA (16%)</span>
                    <span>{fmt(selectedPlan.price * 0.16)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#D9ED92] border-t border-white/10 pt-2">
                    <span>Total mensual</span>
                    <span>{fmt(totalWithIva)}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-3 rounded-xl bg-[#D9ED92] text-[#1B4332] font-extrabold text-sm hover:bg-[#c8e070] transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Activar plan {selectedPlan.label}
                  </button>
                  <p className="text-center text-xs text-white/25">Sin permanencia · Cancela cuando quieras</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <PaymentModal
          plan={selectedPlan}
          role={role}
          total={totalWithIva}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

