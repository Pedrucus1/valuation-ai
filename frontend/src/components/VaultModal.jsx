import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

// #185 MVP sin Stripe (bloqueado por N3/N4 — falta SAPI constituida): esto solo registra
// la solicitud como lead/waitlist, no cobra nada real. El backend valida el monto server-side.
const PLANES = [
  { meses: 6, precio: 50 },
  { meses: 12, precio: 80 },
  { meses: 18, precio: 120 },
  { meses: 36, precio: 170 },
  { meses: 120, precio: 195 },
];

export default function VaultModal({ open, onOpenChange, valuationId }) {
  const [plan, setPlan] = useState(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const cerrar = (v) => {
    onOpenChange(v);
    if (!v) {
      // reset al cerrar, para que la próxima apertura empiece limpia
      setTimeout(() => { setPlan(null); setNombre(""); setEmail(""); setListo(false); }, 200);
    }
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
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), plan_meses: plan }),
      });
      if (!res.ok) throw new Error("fallo");
      setListo(true);
    } catch {
      toast.error("No se pudo registrar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        {!listo ? (
          <>
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-[#F0FAF5] flex items-center justify-center mb-2">
                <ShieldCheck className="w-5 h-5 text-[#1B4332]" />
              </div>
              <DialogTitle className="text-[#1B4332]">Guardar respaldo</DialogTitle>
              <DialogDescription>
                Elige por cuánto tiempo quieres que resguardemos tu avalúo para poder recuperarlo después.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 my-3">
              {PLANES.map((p) => (
                <button
                  key={p.meses}
                  onClick={() => setPlan(p.meses)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    plan === p.meses
                      ? "border-[#52B788] bg-[#F0FAF5] ring-2 ring-[#52B788]/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs text-slate-500">
                    {p.meses < 12
                      ? `${p.meses} meses`
                      : p.meses === 12
                      ? "1 año"
                      : `${parseFloat((p.meses / 12).toFixed(1))} años`}
                  </p>
                  <p className="font-bold text-[#1B4332]">${p.precio} MXN</p>
                </button>
              ))}
            </div>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre (opcional)"
              maxLength={120}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300 mb-2"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo"
              type="email"
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300 mb-4"
            />

            <Button
              onClick={solicitar}
              disabled={!plan || enviando}
              className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-semibold rounded-xl"
            >
              {enviando ? "Enviando…" : "Solicitar"}
            </Button>
            <p className="text-xs text-slate-400 text-center mt-2">
              El pago todavía no está disponible — registramos tu solicitud y te avisamos por correo.
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#F0FAF5] flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-[#52B788]" />
            </div>
            <p className="font-bold text-[#1B4332] mb-1">Solicitud registrada</p>
            <p className="text-sm text-slate-500 mb-4">
              Te avisaremos a {email} en cuanto el pago esté disponible.
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
