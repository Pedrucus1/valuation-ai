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
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
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
        setAceptaTerminos(false); setMostrarTerminos(false);
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
    if (!aceptaTerminos) {
      toast.error("Acepta los términos para continuar");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/valuations/${valuationId}/vault-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(), email: email.trim(), plan_meses: plan.meses,
          acepta_terminos: aceptaTerminos,
        }),
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
            ? "max-w-md bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] border-none p-4"
            : "max-w-md"
        }
      >
        {paso === PASO.PLAN && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <DialogTitle className="text-white text-base">Guarda tu respaldo</DialogTitle>
            </div>
            <div className="bg-[#52B788] rounded-xl p-2.5">
              <DialogDescription className="text-white text-xs font-medium leading-snug">
                El 70% de las personas que valúan una propiedad vuelven a actualizarla o
                solicitar una copia después de un año. Guarda tu respaldo ahora y evita pagar
                un avalúo completo de nuevo (${PRECIO_AVALUO} MXN, precio total con IVA).
              </DialogDescription>
            </div>

            <div className="flex items-center justify-center gap-1 text-xs">
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

            <div className="rounded-xl overflow-hidden bg-white">
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
                    <th className="text-center py-1.5 pr-3">{vista === "anio" ? "Inversión" : "Ahorras"}</th>
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
                        className={`cursor-pointer border-t border-slate-300 transition-colors ${
                          selected ? "bg-[#F0FAF5]" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="pl-2 py-1.5 align-middle">
                          <span className={`block w-4 h-4 rounded-full border-2 ${
                            selected ? "border-[#52B788] bg-[#52B788]" : "border-slate-300"
                          }`} />
                        </td>
                        <td className="py-1.5 px-2 align-middle">
                          <span className="block text-sm font-semibold text-[#1B4332] whitespace-nowrap">
                            {p.label}
                            {p.tag && (
                              <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332] align-middle whitespace-nowrap">
                                {p.tag}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`py-1.5 px-2 align-middle text-sm font-bold text-right whitespace-nowrap ${p.precio === 0 ? "text-[#52B788]" : "text-[#1B4332]"}`}>
                          {p.precio === 0 ? "Gratis" : `$${p.precio}`}
                        </td>
                        <td className="py-1.5 pr-3 align-middle text-center whitespace-nowrap">
                          {p.precio === 0 ? (
                            <span className="text-xs text-slate-300">—</span>
                          ) : (
                            <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332]">
                              {vista === "anio" ? `$${porAnio}/año` : `${pctAhorro}% menos`}
                            </span>
                          )}
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
              className="w-full text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder:text-white/40 border !bg-white/10 !border-white/20 [&:not(:placeholder-shown)]:!bg-white/10 [&:not(:placeholder-shown)]:!border-white/20 [&:not(:placeholder-shown)]:!text-white"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo"
              type="email"
              className="w-full text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder:text-white/40 border !bg-white/10 !border-white/20 [&:not(:placeholder-shown)]:!bg-white/10 [&:not(:placeholder-shown)]:!border-white/20 [&:not(:placeholder-shown)]:!text-white"
            />

            <label className="flex items-start gap-2 text-[11px] text-white/70 leading-snug">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 accent-[#D9ED92] w-3.5 h-3.5 shrink-0"
              />
              <span>
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setMostrarTerminos((v) => !v)}
                  className="underline font-semibold text-white"
                >
                  términos y política de privacidad
                </button>
                .
              </span>
            </label>
            {mostrarTerminos && (
              <div className="bg-white/10 rounded-lg p-2.5 text-[10px] text-white/70 leading-relaxed max-h-24 overflow-y-auto">
                Guardamos tu nombre, correo y los datos de tu avalúo únicamente para brindarte
                este servicio de respaldo. Al aceptar, autorizas a PropValu a enviarte
                invitaciones, noticias, promociones o información sobre nuevos servicios por
                este correo — independientemente del plazo del plan que hayas elegido. No
                compartimos tus datos con terceros para fines distintos a este servicio.
              </div>
            )}

            <Button
              onClick={solicitar}
              disabled={!plan || !aceptaTerminos || enviando}
              className="w-full bg-[#D9ED92] hover:bg-[#c8e070] text-[#1B4332] font-bold rounded-xl disabled:opacity-50"
            >
              {enviando ? "Enviando…" : plan?.precio === 0 ? "Activar gratis" : "Continuar"}
            </Button>
          </div>
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
