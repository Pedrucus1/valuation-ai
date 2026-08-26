import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, ArrowLeft, Calculator, Save, Info } from "lucide-react";
import { API } from "@/App";

// $/m² de construcción por calidad — misma tabla que usa el motor (backend/server.py::_physical_breakdown).
// Referencia visual junto al campo de remodelación, NO se usa para autocalcular un monto.
const QUALITY_COSTS = [
  ["Interés Social", 12000], ["Económico", 14000], ["Medio Bajo", 16000],
  ["Medio Medio", 19000], ["Medio Alto", 23000], ["Superior", 30000], ["Lujo", 45000],
];

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = (v) => `$${Math.round(v || 0).toLocaleString("es-MX")} MXN`;

const emptyInputs = {
  precio_compra: "",
  deuda_agua: "", deuda_predial: "", deuda_luz: "", deuda_cable: "", deuda_credito: "", deuda_otras: "",
  costo_remodelacion: "",
  comision_pct: "5", escrituracion_notario: "", isr: "",
  costo_financiero: "",
  costo_administracion: "",
  costos_contrato_diligencias: "",
  valor_venta_estimado: "",
  margen_deseado_pct: "25",
};

export default function FlippingCalculatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const valuationId = searchParams.get("valuation_id");

  const [inputs, setInputs] = useState(emptyInputs);
  const [direccion, setDireccion] = useState("");
  const [asIsValue, setAsIsValue] = useState(null);
  const [loadingVal, setLoadingVal] = useState(!!valuationId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!valuationId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/valuations/${valuationId}`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const val = await res.json();
        const prop = val.property_data || {};
        setDireccion([prop.address || prop.street_address, prop.neighborhood].filter(Boolean).join(", "));
        setAsIsValue(val.result?.estimated_value || null);
        if (val.arv_estimado) {
          setInputs((prev) => ({ ...prev, valor_venta_estimado: String(Math.round(val.arv_estimado)) }));
        }
      } catch {
        toast.error("No se pudo cargar el avalúo indicado");
      } finally {
        setLoadingVal(false);
      }
    })();
  }, [valuationId]);

  const set = (field) => (e) => setInputs((prev) => ({ ...prev, [field]: e.target.value }));

  const calc = useMemo(() => {
    const precioCompra = num(inputs.precio_compra);
    const deudasTotal = ["deuda_agua", "deuda_predial", "deuda_luz", "deuda_cable", "deuda_credito", "deuda_otras"]
      .reduce((s, k) => s + num(inputs[k]), 0);
    const arv = num(inputs.valor_venta_estimado);
    const comision = arv * (num(inputs.comision_pct) / 100);
    const costosVentaTotal = comision + num(inputs.escrituracion_notario) + num(inputs.isr);
    const remodelacion = num(inputs.costo_remodelacion);
    const financiero = num(inputs.costo_financiero);
    const administracion = num(inputs.costo_administracion);
    const contratoDiligencias = num(inputs.costos_contrato_diligencias);
    const margenPct = num(inputs.margen_deseado_pct) / 100;

    const netoAlDueno = precioCompra - deudasTotal;
    const inversionTotal = precioCompra + remodelacion + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const margenNeto = arv - inversionTotal;
    const margenPctReal = arv > 0 ? margenNeto / arv : 0;

    const otrosCostos = remodelacion + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const precioCompraMax = arv - otrosCostos - (arv * margenPct);
    const netoAlDuenoMax = precioCompraMax - deudasTotal;

    return {
      deudasTotal, costosVentaTotal, netoAlDueno, inversionTotal, margenNeto, margenPctReal,
      precioCompraMax, netoAlDuenoMax,
    };
  }, [inputs]);

  const guardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/flipping/calculos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          valuation_id: valuationId || null,
          direccion,
          inputs,
          outputs: calc,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Cálculo guardado");
    } catch {
      toast.error("No se pudo guardar — ¿iniciaste sesión?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-[#1B4332] hover:bg-[#D9ED92]/30">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-8 h-8 text-[#1B4332]" />
          <div>
            <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332] leading-tight">Calculadora de Flipping</h1>
            <p className="text-sm text-slate-500">
              {loadingVal ? "Cargando avalúo…" : direccion ? direccion : "Sin avalúo conectado — llena los valores a mano"}
            </p>
          </div>
        </div>

        {asIsValue && (
          <div className="text-xs text-slate-500 mb-4">Valor actual (as-is) del avalúo: {fmt(asIsValue)}</div>
        )}

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Precio y valor de venta</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Precio de compra (oferta al dueño)</Label>
                <Input type="number" value={inputs.precio_compra} onChange={set("precio_compra")} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Valor de venta estimado (ARV)</Label>
                <Input type="number" value={inputs.valor_venta_estimado} onChange={set("valor_venta_estimado")} placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Deudas de la propiedad (se restan de lo que recibe el dueño)</h2>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Agua</Label><Input type="number" value={inputs.deuda_agua} onChange={set("deuda_agua")} placeholder="0" /></div>
              <div><Label className="text-xs">Predial</Label><Input type="number" value={inputs.deuda_predial} onChange={set("deuda_predial")} placeholder="0" /></div>
              <div><Label className="text-xs">Luz</Label><Input type="number" value={inputs.deuda_luz} onChange={set("deuda_luz")} placeholder="0" /></div>
              <div><Label className="text-xs">Cable/TV</Label><Input type="number" value={inputs.deuda_cable} onChange={set("deuda_cable")} placeholder="0" /></div>
              <div><Label className="text-xs">Crédito hipotecario</Label><Input type="number" value={inputs.deuda_credito} onChange={set("deuda_credito")} placeholder="0" /></div>
              <div><Label className="text-xs">Otras</Label><Input type="number" value={inputs.deuda_otras} onChange={set("deuda_otras")} placeholder="0" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Remodelación</h2>
            <Label className="text-xs">Costo estimado de remodelación</Label>
            <Input type="number" value={inputs.costo_remodelacion} onChange={set("costo_remodelacion")} placeholder="0" />
            <div className="text-xs text-slate-500 flex items-start gap-1 mt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Referencia de $/m² de construcción por calidad (no autocalcula el monto — tú decides el presupuesto):
                {" "}{QUALITY_COSTS.map(([q, c]) => `${q} $${c.toLocaleString("es-MX")}`).join(" · ")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Costos de venta, cierre y operación</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Comisión inmobiliaria (% del ARV, típico 3-6%)</Label><Input type="number" value={inputs.comision_pct} onChange={set("comision_pct")} /></div>
              <div><Label className="text-xs">Escrituración / notario (venta)</Label><Input type="number" value={inputs.escrituracion_notario} onChange={set("escrituracion_notario")} placeholder="0" /></div>
              <div>
                <Label className="text-xs">ISR sobre la ganancia</Label>
                <Input type="number" value={inputs.isr} onChange={set("isr")} placeholder="0" />
                <p className="text-[11px] text-slate-400 mt-0.5">Hasta 35% de la ganancia; consulta a tu contador — rara vez exento en un flip rápido.</p>
              </div>
              <div><Label className="text-xs">ISAI + notarial de compra (~4% típico)</Label><Input type="number" value={inputs.costos_contrato_diligencias} onChange={set("costos_contrato_diligencias")} placeholder="0" /></div>
              <div><Label className="text-xs">Costo financiero (intereses del crédito puente)</Label><Input type="number" value={inputs.costo_financiero} onChange={set("costo_financiero")} placeholder="0" /></div>
              <div><Label className="text-xs">Administración / tenencia durante el proceso</Label><Input type="number" value={inputs.costo_administracion} onChange={set("costo_administracion")} placeholder="0" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1B4332] text-white shadow-sm border-0 mb-4">
          <CardContent className="p-5 space-y-2">
            <h2 className="font-semibold">Resultado</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="opacity-80">Neto que recibe el dueño</span><span className="text-right font-semibold">{fmt(calc.netoAlDueno)}</span>
              <span className="opacity-80">Inversión total</span><span className="text-right font-semibold">{fmt(calc.inversionTotal)}</span>
              <span className="opacity-80">Margen neto</span><span className="text-right font-semibold">{fmt(calc.margenNeto)} ({(calc.margenPctReal * 100).toFixed(1)}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-2 border-[#52B788] mb-6">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Cálculo inverso — ¿cuánto ofrecer?</h2>
            <div>
              <Label className="text-xs">Margen objetivo (% del ARV — recomendado 20-30% en México)</Label>
              <Input type="number" value={inputs.margen_deseado_pct} onChange={set("margen_deseado_pct")} className="max-w-[140px]" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pt-2">
              <span className="text-slate-500">Precio de compra máximo</span><span className="text-right font-semibold text-[#1B4332]">{fmt(calc.precioCompraMax)}</span>
              <span className="text-slate-500">Neto máximo para el dueño</span><span className="text-right font-semibold text-[#1B4332]">{fmt(calc.netoAlDuenoMax)}</span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={guardar} disabled={saving} className="bg-[#52B788] hover:bg-[#40916C] text-white">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando…" : "Guardar cálculo"}
        </Button>
      </div>
    </div>
  );
}
