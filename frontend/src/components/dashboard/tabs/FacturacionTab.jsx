import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

const FacturacionTab = ({ billingData, session, saveBillingPref, savingPref }) => {
  if (!billingData) return <p className="text-slate-400 text-sm p-4">Cargando...</p>;
  
  const { next_cutoff, days_to_cutoff, cycle_start, earnings_this_cycle,
          plan_cost, balance, billing_status, billing_preference } = billingData;
  const alerta = days_to_cutoff <= 5;
  const fmtMXN = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);
  const PREF_OPTIONS = [
    { value: "auto",        label: "Automático",         desc: "Se descuenta del saldo al corte sin confirmación" },
    { value: "ask_monthly", label: "Confirmar cada mes", desc: "PropValu te avisa 5 días antes para que autorices" },
    { value: "manual",      label: "Solo tarjeta",       desc: "Siempre se cobra a tu tarjeta registrada" },
  ];
  
  return (
    <div className="space-y-5">
      {billing_status === "blocked" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Acceso suspendido por pago pendiente</p>
            <p className="text-xs text-red-500 mt-0.5">Autoriza el pago para reactivar tu cuenta.</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Card className={`border-0 shadow-sm ${alerta ? "bg-amber-50" : "bg-white"}`}>
          <CardContent className="p-5">
            <p className={`text-xs mb-1 ${alerta ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
              {alerta ? "⚠️ Próximo corte" : "Próximo corte"}
            </p>
            <p className={`text-2xl font-bold font-['Outfit'] ${alerta ? "text-amber-600" : "text-[#1B4332]"}`}>
              {days_to_cutoff} días
            </p>
            <p className="text-xs text-slate-400 mt-1">{next_cutoff} · Desde {cycle_start}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-1">Balance proyectado</p>
            <p className={`text-2xl font-bold font-['Outfit'] ${balance >= 0 ? "text-[#1B4332]" : "text-red-600"}`}>
              {balance >= 0 ? "+" : ""}{fmtMXN(balance)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {balance >= 0 ? "A depositar en tu cuenta" : `Diferencia a cobrar: ${fmtMXN(Math.abs(balance))}`}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Desglose del ciclo</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ganancias por encargos</span>
              <span className="font-semibold text-[#1B4332]">{fmtMXN(earnings_this_cycle)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Costo plan ({session?.plan || "—"})</span>
              <span className="font-semibold text-slate-700">− {fmtMXN(plan_cost)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>
                {balance >= 0 ? "A depositar" : "A cobrar"}
              </span>
              <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>{fmtMXN(Math.abs(balance))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Preferencia de renovación</p>
          <div className="space-y-2">
            {PREF_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => saveBillingPref(opt.value)} disabled={savingPref}
                className={`w-full text-left rounded-xl border p-3 transition-all ${billing_preference === opt.value ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 bg-white hover:border-[#52B788]/50"}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${billing_preference === opt.value ? "border-[#52B788]" : "border-slate-300"}`}>
                    {billing_preference === opt.value && <div className="w-2 h-2 rounded-full bg-[#52B788]" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {savingPref && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Guardando...</p>}
        </CardContent>
      </Card>
      <p className="text-[11px] text-slate-400 text-center">
        El cobro y depósito automáticos estarán disponibles al activar la pasarela de pagos.
      </p>
    </div>
  );
};

export default FacturacionTab;
