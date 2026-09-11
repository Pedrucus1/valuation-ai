import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Upload, Landmark } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

// #191 sesión 2: compra de créditos prepago por transferencia bancaria. Sin integración
// bancaria real (bloqueado por trámites de la empresa) — el cliente sube comprobante y un
// admin confirma manualmente desde /admin/creditos, mismo espíritu que VaultModal.jsx pero
// sin paso de "pago simulado" porque una transferencia no se valida en el momento.
const PASO = { PAQUETE: "paquete", DATOS: "datos", TRANSFERENCIA: "transferencia", LISTO: "listo" };

export default function CreditosCheckoutModal({ open, onOpenChange, session }) {
  const [paso, setPaso] = useState(PASO.PAQUETE);
  const [paquetes, setPaquetes] = useState({});
  const [datosBancarios, setDatosBancarios] = useState({});
  const [packageId, setPackageId] = useState(null);
  const [nombre, setNombre] = useState(session?.name || "");
  const [email, setEmail] = useState(session?.email || "");
  const [enviando, setEnviando] = useState(false);
  const [purchaseId, setPurchaseId] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/creditos/paquetes`)
      .then((r) => r.json())
      .then((d) => { setPaquetes(d.paquetes || {}); setDatosBancarios(d.datos_bancarios || {}); })
      .catch(() => toast.error("No se pudieron cargar los paquetes"));
  }, [open]);

  const cerrar = (v) => {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setPaso(PASO.PAQUETE); setPackageId(null); setPurchaseId(null); setComprobante(null);
      }, 200);
    }
  };

  const paquete = packageId ? paquetes[packageId] : null;

  const comprar = async () => {
    if (!packageId) return;
    if (!session && (!nombre.trim() || !email.includes("@"))) {
      toast.error("Ingresa tu nombre y correo");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/creditos/comprar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ package_id: packageId, nombre, email }),
      });
      if (!res.ok) throw new Error("fallo");
      const data = await res.json();
      setPurchaseId(data.purchase_id);
      setPaso(PASO.TRANSFERENCIA);
    } catch {
      toast.error("No se pudo registrar la compra. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const subirComprobante = async () => {
    if (!comprobante || !purchaseId) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", comprobante);
      const res = await fetch(`${API}/creditos/compras/${purchaseId}/comprobante`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("fallo");
      setPaso(PASO.LISTO);
    } catch {
      toast.error("No se pudo subir el comprobante. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        {paso === PASO.PAQUETE && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#1B4332]">Comprar créditos</DialogTitle>
              <DialogDescription>1 crédito = 1 reporte de Flipping o 1 OPI.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 my-2">
              {Object.entries(paquetes).map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => setPackageId(id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    packageId === id ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#1B4332]">{p.label}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.tipo === "flipping" ? "Solo Flipping" : "Flipping u OPI"}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1B4332]">${p.precio.toLocaleString("es-MX")} MXN</p>
                  </div>
                </button>
              ))}
            </div>
            {!session && (
              <div className="space-y-2 mb-2">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full text-sm rounded-lg px-3 py-2 border border-[#B7E4C7] bg-[#F0FAF5] focus:outline-none focus:border-[#52B788]"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo"
                  type="email"
                  className="w-full text-sm rounded-lg px-3 py-2 border border-[#B7E4C7] bg-[#F0FAF5] focus:outline-none focus:border-[#52B788]"
                />
              </div>
            )}
            <Button
              onClick={comprar}
              disabled={!packageId || enviando}
              className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-bold rounded-xl disabled:opacity-50"
            >
              {enviando ? "Procesando…" : "Continuar"}
            </Button>
          </>
        )}

        {paso === PASO.TRANSFERENCIA && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#1B4332] flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Datos para transferencia
              </DialogTitle>
              <DialogDescription>
                Transfiere ${paquete?.precio.toLocaleString("es-MX")} MXN y sube tu comprobante — activamos tus créditos en cuanto lo confirmemos.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3 text-sm space-y-1 my-2">
              <p><span className="text-slate-500">Banco:</span> <strong>{datosBancarios.banco}</strong></p>
              <p><span className="text-slate-500">CLABE:</span> <strong className="font-mono">{datosBancarios.clabe}</strong></p>
              <p><span className="text-slate-500">Beneficiario:</span> <strong>{datosBancarios.beneficiario}</strong></p>
            </div>
            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#B7E4C7] rounded-xl p-4 cursor-pointer hover:border-[#52B788] transition-colors">
              <Upload className="w-5 h-5 text-[#52B788]" />
              <span className="text-xs text-slate-500 text-center">
                {comprobante ? comprobante.name : "Sube tu comprobante (PDF, JPG o PNG)"}
              </span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
              />
            </label>
            <Button
              onClick={subirComprobante}
              disabled={!comprobante || subiendo}
              className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl mt-3 disabled:opacity-50"
            >
              {subiendo ? "Subiendo…" : "Enviar comprobante"}
            </Button>
          </>
        )}

        {paso === PASO.LISTO && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#F0FAF5] flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-[#52B788]" />
            </div>
            <p className="font-bold text-[#1B4332] mb-1">Comprobante recibido</p>
            <p className="text-sm text-slate-500 mb-4">
              Tu compra está en revisión — te avisamos por correo en cuanto tus créditos estén activos.
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
