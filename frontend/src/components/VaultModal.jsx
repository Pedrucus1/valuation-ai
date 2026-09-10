import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldAlert, Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

// #185 sin Stripe real (bloqueado por N3/N4 — falta SAPI constituida): el pago es simulado,
// mismo patrón que ValuationForm.jsx (checkout de valuación) y ProCheckoutPage.jsx — no se
// mueve dinero real, solo se marca la solicitud como pagada en el backend.
// Precio TOTAL (con IVA) de un avalúo individual completo — mismo cálculo que muestra
// PricingPage.jsx ("Total con IVA") y ValuationForm.jsx ($280 base + 16% IVA) — es la única
// cifra que el cliente real paga, referencia de "lo que te ahorras volviendo a pagar todo".
const PRECIO_AVALUO = Math.round(280 * 1.16);

const PLANES = [
  { meses: 3, precio: 0, label: "3 meses" },
  { meses: 12, precio: 50, label: "1 año" },
  { meses: 36, precio: 110, label: "3 años", tag: "Más elegido" },
  { meses: 60, precio: 150, label: "5 años" },
  { meses: 120, precio: 195, label: "10 años" },
];

const fmtCardNum = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExpiry = (v) => v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

const PASO = { PLAN: "plan", PAGO: "pago", LISTO: "listo" };

export default function VaultModal({ open, onOpenChange, valuationId }) {
  const [paso, setPaso] = useState(PASO.PLAN);
  const [vista, setVista] = useState("anio"); // "anio" | "descuento" — toggle A/B de la tabla
  const [plan, setPlan] = useState(PLANES[0]); // preseleccionado: 3 meses gratis
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [vaultRequestId, setVaultRequestId] = useState(null);
  const [expiraEn, setExpiraEn] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);

  const cardOk = card.number.replace(/\s/g, "").length === 16
    && card.expiry.length === 5 && card.cvv.length >= 3 && card.name.trim().length >= 3;

  const cerrar = (v) => {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setPaso(PASO.PLAN); setPlan(PLANES[0]); setNombre(""); setEmail("");
        setCard({ number: "", expiry: "", cvv: "", name: "" });
        setVaultRequestId(null); setExpiraEn(null);
      }, 200);
    }
  };

  const confirmarPago = async (reqId) => {
    const res = await fetch(`${API}/vault-requests/${reqId}/confirmar-pago`, { method: "POST" });
    if (!res.ok) throw new Error("fallo confirmar");
    const data = await res.json();
    setExpiraEn(data.expira_en);
    setPaso(PASO.LISTO);
  };

  const solicitar = async () => {
    if (!plan) return;
    if (!email.trim() || !email.includes("@")) {
      toast.error("Ingresa un correo válido");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/valuations/${valuationId}/vault-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), plan_meses: plan.meses }),
      });
      if (!res.ok) throw new Error("fallo");
      const data = await res.json();
      setVaultRequestId(data.vault_request_id);
      if (plan.precio === 0) {
        await confirmarPago(data.vault_request_id);
      } else {
        setPaso(PASO.PAGO);
      }
    } catch {
      toast.error("No se pudo registrar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async () => {
    setProcesandoPago(true);
    await new Promise((r) => setTimeout(r, 2000)); // simulado — sin Stripe real
    try {
      await confirmarPago(vaultRequestId);
    } catch {
      toast.error("No se pudo confirmar el pago. Intenta de nuevo.");
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent
        className={
          paso === PASO.PLAN
            ? "max-w-md max-h-[95vh] overflow-y-auto bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] border-none p-5"
            : "max-w-md max-h-[95vh] overflow-y-auto"
        }
      >
        {paso === PASO.PLAN && (
          <>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle className="text-white text-lg">Guarda tu respaldo</DialogTitle>
            </div>
            <div className="bg-[#52B788] rounded-xl p-3 mb-3">
              <DialogDescription className="text-white text-sm font-medium leading-snug">
                El 70% de las personas que valúan una propiedad vuelven a actualizarla o
                solicitar una copia años después. Guarda tu respaldo ahora y evita pagar un
                avalúo completo de nuevo (${PRECIO_AVALUO} MXN, precio total con IVA).
              </DialogDescription>
            </div>

            <div className="flex items-center justify-center gap-1 mb-2 text-xs">
              <button
                onClick={() => setVista("anio")}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  vista === "anio" ? "bg-white text-[#1B4332]" : "text-white/50 hover:text-white/80"
                }`}
              >
                Inversión por año
              </button>
              <button
                onClick={() => setVista("descuento")}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  vista === "descuento" ? "bg-white text-[#1B4332]" : "text-white/50 hover:text-white/80"
                }`}
              >
                % de ahorro
              </button>
            </div>

            <div className="rounded-xl overflow-hidden mb-3 bg-white">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col className="w-8" />
                  <col />
                  <col className="w-16" />
                  <col className="w-[92px]" />
                </colgroup>
                <thead>
                  <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
                    <th></th>
                    <th className="text-left py-1.5 px-2">Plan</th>
                    <th className="text-right py-1.5 px-2">Precio</th>
                    <th className="text-right py-1.5 pr-3">{vista === "anio" ? "Inversión" : "Ahorras"}</th>
                  </tr>
                </thead>
                <tbody>
                  {PLANES.map((p) => {
                    const selected = plan?.meses === p.meses;
                    const porAnio = p.precio > 0 ? Math.round(p.precio / (p.meses / 12)) : null;
                    const pctAhorro = p.precio > 0 ? Math.round((1 - p.precio / PRECIO_AVALUO) * 100) : null;
                    return (
                      <tr
                        key={p.meses}
                        onClick={() => setPlan(p)}
                        className={`cursor-pointer border-t border-slate-100 transition-colors ${
                          selected ? "bg-[#F0FAF5]" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="pl-2 py-2 align-middle">
                          <span className={`block w-4 h-4 rounded-full border-2 ${
                            selected ? "border-[#52B788] bg-[#52B788]" : "border-slate-300"
                          }`} />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <span className="block text-sm font-semibold text-[#1B4332] whitespace-nowrap">
                            {p.label}
                            {p.tag && (
                              <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332] align-middle whitespace-nowrap">
                                {p.tag}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`py-2 px-2 align-middle text-sm font-bold text-right whitespace-nowrap ${p.precio === 0 ? "text-[#52B788]" : "text-[#1B4332]"}`}>
                          {p.precio === 0 ? "Gratis" : `$${p.precio}`}
                        </td>
                        <td className="py-2 pr-3 align-middle text-xs text-right text-slate-400 font-medium whitespace-nowrap">
                          {p.precio === 0
                            ? "—"
                            : vista === "anio"
                            ? `$${porAnio}/año`
                            : `${pctAhorro}% menos`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre (opcional)"
              maxLength={120}
              className="w-full text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder:text-white/40 mb-2 border !bg-white/10 !border-white/20"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo"
              type="email"
              className="w-full text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder:text-white/40 mb-3 border !bg-white/10 !border-white/20"
            />

            <Button
              onClick={solicitar}
              disabled={!plan || enviando}
              className="w-full bg-[#D9ED92] hover:bg-[#c8e070] text-[#1B4332] font-bold rounded-xl"
            >
              {enviando ? "Enviando…" : plan?.precio === 0 ? "Activar gratis" : "Continuar"}
            </Button>
          </>
        )}

        {paso === PASO.PAGO && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#1B4332]">Pago <span className="text-xs text-slate-400 font-normal">(simulado)</span></DialogTitle>
              <DialogDescription>
                {plan?.label} — ${plan?.precio} MXN. No se procesa ningún cobro real.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2">
              <input
                className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788] font-mono tracking-wider"
                placeholder="Número de tarjeta   4242 4242 4242 4242"
                value={card.number}
                maxLength={19}
                onChange={(e) => setCard((p) => ({ ...p, number: fmtCardNum(e.target.value) }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788]"
                  placeholder="MM/AA"
                  value={card.expiry}
                  maxLength={5}
                  onChange={(e) => setCard((p) => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                />
                <input
                  className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788]"
                  placeholder="CVV"
                  value={card.cvv}
                  maxLength={4}
                  onChange={(e) => setCard((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                />
              </div>
              <input
                className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788] uppercase"
                placeholder="NOMBRE EN LA TARJETA"
                value={card.name}
                onChange={(e) => setCard((p) => ({ ...p, name: e.target.value.toUpperCase() }))}
              />
            </div>
            <Button
              onClick={pagar}
              disabled={!cardOk || procesandoPago}
              className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-bold rounded-xl gap-2"
            >
              {procesandoPago ? (
                <>Procesando pago…</>
              ) : (
                <><CreditCard className="w-4 h-4" />Pagar ${plan?.precio} MXN</>
              )}
            </Button>
          </>
        )}

        {paso === PASO.LISTO && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#F0FAF5] flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-[#52B788]" />
            </div>
            <p className="font-bold text-[#1B4332] mb-1">Respaldo activo</p>
            <p className="text-sm text-slate-500 mb-1">
              Válido hasta {expiraEn ? new Date(expiraEn).toLocaleDateString("es-MX") : "—"}.
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Recupéralo cuando quieras en propvalu.com/recuperar con {email}.
            </p>
            <Button onClick={() => cerrar(false)} variant="outline" className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
