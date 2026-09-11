import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Calculator, Save, Info, Search, Plus, X } from "lucide-react";
import { API } from "@/App";

// $/m² de construcción por calidad — misma tabla que usa el motor (backend/server.py::_physical_breakdown).
// Referencia visual junto al campo de remodelación, NO se usa para autocalcular un monto.
const QUALITY_COSTS = [
  ["Económico", 8000], ["Interés Social", 10000], ["Medio Bajo", 13000],
  ["Medio Medio", 16000], ["Medio Alto", 20000], ["Superior", 26000], ["Lujo", 38000],
];

// Partidas de obra típicas de un flip — cada una es opcional, con su propio monto.
const REMODEL_ITEMS = [
  ["piso", "Piso"], ["pintura", "Pintura"], ["herreria", "Herrería"],
  ["cocina", "Cocina"], ["closets", "Closets"], ["puerta", "Puertas"],
  ["banos", "Muebles de baño"], ["azulejo", "Azulejo/loseta"], ["ventaneria", "Ventanería"],
];

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = (v) => `$${Math.round(v || 0).toLocaleString("es-MX")} MXN`;

const emptyInputs = {
  precio_compra: "",
  deuda_agua: "", deuda_predial: "", deuda_luz: "", deuda_cable: "", deuda_credito: "", deuda_otras: "",
  comision_pct: "5", escrituracion_notario: "", isr: "",
  costo_financiero: "",
  costo_administracion: "",
  costos_contrato_diligencias: "",
  valor_venta_estimado: "",
  margen_deseado_pct: "25",
  remodelacion_otros: "",
};

const emptyProp = { estado: "", municipio: "", colonia: "", calle: "", terreno_m2: "", construccion_m2: "" };

export default function FlippingCalculatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const valuationId = searchParams.get("valuation_id");

  const [inputs, setInputs] = useState(emptyInputs);
  const [direccion, setDireccion] = useState("");
  const [asIsValue, setAsIsValue] = useState(null);
  const [loadingVal, setLoadingVal] = useState(!!valuationId);
  const [saving, setSaving] = useState(false);

  const [prop, setProp] = useState(emptyProp);
  const [arv, setArv] = useState({ loading: false, error: null, min: null, avg: null, max: null, valuationId: null });
  const [remodelSel, setRemodelSel] = useState({});
  const [gestionItems, setGestionItems] = useState([]);

  useEffect(() => {
    if (!valuationId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/valuations/${valuationId}`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const val = await res.json();
        const p = val.property_data || {};
        setDireccion([p.address || p.street_address, p.neighborhood].filter(Boolean).join(", "));
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
  const setProp1 = (field) => (e) => setProp((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleRemodelItem = (key) => (checked) =>
    setRemodelSel((prev) => ({ ...prev, [key]: { checked, costo: prev[key]?.costo || "" } }));
  const setRemodelCosto = (key) => (e) =>
    setRemodelSel((prev) => ({ ...prev, [key]: { ...prev[key], costo: e.target.value } }));

  const addGestionItem = () =>
    setGestionItems((prev) => [...prev, { id: Date.now() + Math.random(), label: "", monto: "" }]);
  const setGestionField = (id, field) => (e) =>
    setGestionItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: e.target.value } : it)));
  const removeGestionItem = (id) => setGestionItems((prev) => prev.filter((it) => it.id !== id));

  const calcularARV = async () => {
    if (!prop.municipio || !prop.colonia || !num(prop.terreno_m2) || !num(prop.construccion_m2)) {
      toast.error("Falta municipio, colonia, m² de terreno o m² de construcción");
      return;
    }
    setArv((a) => ({ ...a, loading: true, error: null }));
    try {
      const createRes = await fetch(`${API}/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          state: prop.estado || "Jalisco",
          municipality: prop.municipio,
          neighborhood: prop.colonia,
          street_address: prop.calle || undefined,
          land_area: num(prop.terreno_m2),
          construction_area: num(prop.construccion_m2),
          land_regime: "URBANO",
          property_type: "Casa",
          estimated_age: 0,
          conservation_state: "Nuevo",
        }),
      });
      if (!createRes.ok) throw new Error("No se pudo crear la OPI");
      const val = await createRes.json();

      const calcRes = await fetch(`${API}/valuations/${val.valuation_id}/calculate-remi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      const data = await calcRes.json();
      if (!calcRes.ok) throw new Error(data.detail || "El motor no pudo calcular esta zona");

      const r = data.result;
      setArv({
        loading: false, error: null, valuationId: val.valuation_id,
        min: r.value_range_min, avg: r.estimated_value, max: r.value_range_max,
      });
      setInputs((prev) => ({ ...prev, valor_venta_estimado: String(Math.round(r.estimated_value)) }));
      toast.success("Valor de mercado calculado");
    } catch (e) {
      setArv((a) => ({ ...a, loading: false, error: e.message || "No se pudo calcular" }));
      toast.error(e.message || "No se pudo calcular el valor de mercado");
    }
  };

  const calc = useMemo(() => {
    const precioCompra = num(inputs.precio_compra);
    const deudasTotal = ["deuda_agua", "deuda_predial", "deuda_luz", "deuda_cable", "deuda_credito", "deuda_otras"]
      .reduce((s, k) => s + num(inputs[k]), 0);
    const arvValor = num(inputs.valor_venta_estimado);
    const comision = arvValor * (num(inputs.comision_pct) / 100);
    const costosVentaTotal = comision + num(inputs.escrituracion_notario) + num(inputs.isr);

    const remodelacion = Object.values(remodelSel).reduce((s, it) => s + (it.checked ? num(it.costo) : 0), 0)
      + num(inputs.remodelacion_otros);
    const gestionTotal = gestionItems.reduce((s, it) => s + num(it.monto), 0);

    const financiero = num(inputs.costo_financiero);
    const administracion = num(inputs.costo_administracion);
    const contratoDiligencias = num(inputs.costos_contrato_diligencias);
    const margenPct = num(inputs.margen_deseado_pct) / 100;

    const netoAlDueno = precioCompra - deudasTotal;
    const inversionTotal = precioCompra + remodelacion + gestionTotal + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const margenNeto = arvValor - inversionTotal;
    const margenPctReal = arvValor > 0 ? margenNeto / arvValor : 0;

    const otrosCostos = remodelacion + gestionTotal + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const precioCompraMax = arvValor - otrosCostos - (arvValor * margenPct);
    const netoAlDuenoMax = precioCompraMax - deudasTotal;

    return {
      deudasTotal, costosVentaTotal, remodelacion, gestionTotal, netoAlDueno, inversionTotal, margenNeto, margenPctReal,
      precioCompraMax, netoAlDuenoMax,
    };
  }, [inputs, remodelSel, gestionItems]);

  const guardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/flipping/calculos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          valuation_id: valuationId || arv.valuationId || null,
          direccion: direccion || [prop.calle, prop.colonia, prop.municipio].filter(Boolean).join(", "),
          prop,
          arv,
          remodelSel,
          gestionItems,
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

        {!valuationId && (
          <Card className="bg-white shadow-sm border-0 mb-4">
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-[#1B4332]">Valor de mercado (ARV) — datos mínimos del inmueble</h2>
              <p className="text-xs text-slate-500">
                Se calcula como si la propiedad ya estuviera remodelada y terminada (año 0), contra comparables reales de la zona.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Estado</Label><Input value={prop.estado} onChange={setProp1("estado")} placeholder="Jalisco" /></div>
                <div><Label className="text-xs">Municipio *</Label><Input value={prop.municipio} onChange={setProp1("municipio")} placeholder="Guadalajara" /></div>
                <div><Label className="text-xs">Colonia *</Label><Input value={prop.colonia} onChange={setProp1("colonia")} placeholder="Chapalita" /></div>
                <div><Label className="text-xs">Calle / referencia (opcional)</Label><Input value={prop.calle} onChange={setProp1("calle")} /></div>
                <div><Label className="text-xs">m² terreno *</Label><Input type="number" value={prop.terreno_m2} onChange={setProp1("terreno_m2")} placeholder="0" /></div>
                <div><Label className="text-xs">m² construcción *</Label><Input type="number" value={prop.construccion_m2} onChange={setProp1("construccion_m2")} placeholder="0" /></div>
              </div>
              <Button onClick={calcularARV} disabled={arv.loading} className="bg-[#1B4332] hover:bg-[#143024] text-white">
                <Search className="w-4 h-4 mr-2" />
                {arv.loading ? "Calculando…" : "Calcular valor de mercado"}
              </Button>
              {arv.error && <p className="text-xs text-red-600">{arv.error}</p>}
              {arv.avg != null && (
                <div className="grid grid-cols-3 gap-3 pt-2 text-sm">
                  <div><span className="text-xs text-slate-500 block">Mínimo</span><span className="font-semibold">{fmt(arv.min)}</span></div>
                  <div><span className="text-xs text-slate-500 block">Promedio (usado como ARV)</span><span className="font-semibold text-[#1B4332]">{fmt(arv.avg)}</span></div>
                  <div><span className="text-xs text-slate-500 block">Máximo</span><span className="font-semibold">{fmt(arv.max)}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
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
            <h2 className="font-semibold text-[#1B4332]">Remodelación — gasto de obra</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REMODEL_ITEMS.map(([key, label]) => (
                <div key={key} className="flex items-start gap-2">
                  <Checkbox
                    className="mt-2"
                    checked={!!remodelSel[key]?.checked}
                    onCheckedChange={toggleRemodelItem(key)}
                  />
                  <div className="flex-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number" placeholder="$"
                      disabled={!remodelSel[key]?.checked}
                      value={remodelSel[key]?.costo || ""}
                      onChange={setRemodelCosto(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs">Otros trabajos de obra (monto libre)</Label>
              <Input type="number" value={inputs.remodelacion_otros} onChange={set("remodelacion_otros")} placeholder="0" />
            </div>
            <div className="text-xs text-slate-500 flex items-start gap-1 mt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Referencia de $/m² de construcción por calidad:
                {" "}{QUALITY_COSTS.map(([q, c]) => `${q} $${c.toLocaleString("es-MX")}`).join(" · ")}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#1B4332] pt-1">Total obra: {fmt(calc.remodelacion)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1B4332]">Gastos de gestión</h2>
              <Button variant="outline" size="sm" onClick={addGestionItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
              </Button>
            </div>
            {gestionItems.length === 0 && (
              <p className="text-xs text-slate-400">Trámites, permisos, gestoría — agrega los que apliquen.</p>
            )}
            {gestionItems.map((it) => (
              <div key={it.id} className="flex items-end gap-2">
                <div className="flex-1"><Label className="text-xs">Concepto</Label><Input value={it.label} onChange={setGestionField(it.id, "label")} placeholder="Ej. gestoría" /></div>
                <div className="w-32"><Label className="text-xs">Monto</Label><Input type="number" value={it.monto} onChange={setGestionField(it.id, "monto")} placeholder="0" /></div>
                <Button variant="ghost" size="icon" onClick={() => removeGestionItem(it.id)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
            {gestionItems.length > 0 && (
              <div className="text-sm font-semibold text-[#1B4332] pt-1">Total gestión: {fmt(calc.gestionTotal)}</div>
            )}
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
