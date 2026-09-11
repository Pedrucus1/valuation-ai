import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationMap } from "@/components/LocationMap";
import DynamicMoneyList from "@/components/DynamicMoneyList";
import { MEXICAN_STATES } from "@/lib/mexicanStates";
import { buildFlippingReportHtml } from "@/lib/flippingReportHtml";
import { downloadReportPdf } from "@/lib/downloadReportPdf";
import { compressImage } from "@/lib/compressImage";
import { toast } from "sonner";
import { ArrowLeft, Calculator, Save, Info, Search, Home, Building2, RotateCcw, Download, Camera, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
  deuda_agua: "", deuda_predial: "", deuda_luz: "", deuda_cable: "", deuda_credito: "",
  comision_pct: "5", escrituracion_notario: "", isr: "",
  costo_financiero: "",
  costo_financiero_modo: "mensual", // "mensual" | "total" — un socio inversionista suele cobrar interés mensual
  costo_administracion: "",
  costos_contrato_diligencias: "",
  valor_venta_estimado: "",
  margen_deseado_pct: "25",
  meses_venta: "6",
};

const emptyProp = {
  estado: "", municipio: "", colonia: "", calle: "", terreno_m2: "", construccion_m2: "",
  propertyType: "Casa", lat: 19.4326, lng: -99.1332,
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
  const [downloading, setDownloading] = useState(false);

  const [prop, setProp] = useState(emptyProp);
  const [arv, setArv] = useState({ loading: false, error: null, min: null, avg: null, max: null, valuationId: null });
  const [remodelSel, setRemodelSel] = useState({});
  const [remodelExtra, setRemodelExtra] = useState([]);
  const [deudaExtra, setDeudaExtra] = useState([]);
  const [gestionItems, setGestionItems] = useState([]);
  const [autoLocked, setAutoLocked] = useState({ escrituracion_notario: false, isr: false, costos_contrato_diligencias: false });
  const [photos, setPhotos] = useState([]);
  const [facadeIndex, setFacadeIndex] = useState(null);
  const MAX_PHOTOS = 4;

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
  const setAutoField = (field) => (e) => {
    setAutoLocked((prev) => ({ ...prev, [field]: true }));
    setInputs((prev) => ({ ...prev, [field]: e.target.value }));
  };
  const resetAutoField = (field) => () => setAutoLocked((prev) => ({ ...prev, [field]: false }));

  const setProp1 = (field) => (e) => setProp((prev) => ({ ...prev, [field]: e.target?.value ?? e }));
  const handleLocationChange = (lat, lng) => setProp((prev) => ({ ...prev, lat, lng }));
  const direccionBusqueda = [prop.calle, prop.colonia, prop.municipio, prop.estado].filter(Boolean).join(", ");

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = "";
    const compressed = await Promise.all(files.map((f) => compressImage(f).then((r) => r.dataUrl)));
    setPhotos((prev) => {
      const next = [...prev, ...compressed];
      if (prev.length === 0 && next.length > 0) setFacadeIndex(0);
      return next;
    });
  };
  const removePhoto = (i) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setFacadeIndex((prev) => {
      if (prev === i) return null;
      if (prev !== null && prev > i) return prev - 1;
      return prev;
    });
  };

  const toggleRemodelItem = (key) => (checked) =>
    setRemodelSel((prev) => ({ ...prev, [key]: { checked, costo: prev[key]?.costo || "" } }));
  const setRemodelCosto = (key) => (e) =>
    setRemodelSel((prev) => ({ ...prev, [key]: { ...prev[key], costo: e.target.value } }));

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
          property_type: prop.propertyType,
          estimated_age: 0,
          conservation_state: "Nuevo",
          latitude: prop.lat,
          longitude: prop.lng,
          photos: photos.length ? photos : undefined,
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

  const remodelacionTotal = useMemo(() => {
    const checklist = Object.values(remodelSel).reduce((s, it) => s + (it.checked ? num(it.costo) : 0), 0);
    const extra = remodelExtra.reduce((s, it) => s + num(it.monto), 0);
    return checklist + extra;
  }, [remodelSel, remodelExtra]);

  // Sugerencias automáticas (editable a mano) — escrituración 2% ARV, ISAI 4% precio de
  // compra, ISR 35% de la ganancia fiscal (ARV - compra - remodelación - escrituración - ISAI).
  const autoSuggested = useMemo(() => {
    const arvValor = num(inputs.valor_venta_estimado);
    const precioCompra = num(inputs.precio_compra);
    const escrit = arvValor * 0.02;
    const isai = precioCompra * 0.04;
    const ganancia = Math.max(0, arvValor - precioCompra - remodelacionTotal - escrit - isai);
    return { escrituracion_notario: escrit, costos_contrato_diligencias: isai, isr: ganancia * 0.35 };
  }, [inputs.valor_venta_estimado, inputs.precio_compra, remodelacionTotal]);

  useEffect(() => {
    setInputs((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of ["escrituracion_notario", "costos_contrato_diligencias", "isr"]) {
        if (autoLocked[key]) continue;
        const suggested = autoSuggested[key];
        const v = suggested > 0 ? String(Math.round(suggested)) : "";
        if (v !== prev[key]) { next[key] = v; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [autoSuggested, autoLocked]);

  const calc = useMemo(() => {
    const precioCompra = num(inputs.precio_compra);
    const deudasFijas = ["deuda_agua", "deuda_predial", "deuda_luz", "deuda_cable", "deuda_credito"]
      .reduce((s, k) => s + num(inputs[k]), 0);
    const deudasExtraTotal = deudaExtra.reduce((s, it) => s + num(it.monto), 0);
    const deudasTotal = deudasFijas + deudasExtraTotal;

    const arvValor = num(inputs.valor_venta_estimado);
    const comision = arvValor * (num(inputs.comision_pct) / 100);
    const costosVentaTotal = comision + num(inputs.escrituracion_notario) + num(inputs.isr);

    const gestionTotal = gestionItems.reduce((s, it) => s + num(it.monto), 0);

    const mesesVenta = num(inputs.meses_venta);
    const financieroMensual = num(inputs.costo_financiero);
    const financiero = inputs.costo_financiero_modo === "mensual" ? financieroMensual * mesesVenta : financieroMensual;
    const administracion = num(inputs.costo_administracion);
    const contratoDiligencias = num(inputs.costos_contrato_diligencias);
    const margenPct = num(inputs.margen_deseado_pct) / 100;

    const netoAlDueno = precioCompra - deudasTotal;
    const inversionTotal = precioCompra + remodelacionTotal + gestionTotal + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const margenNeto = arvValor - inversionTotal;
    const margenPctReal = arvValor > 0 ? margenNeto / arvValor : 0;

    const otrosCostos = remodelacionTotal + gestionTotal + costosVentaTotal + financiero + administracion + contratoDiligencias;
    const precioCompraMax = arvValor - otrosCostos - (arvValor * margenPct);
    const netoAlDuenoMax = precioCompraMax - deudasTotal;

    const roiPct = inversionTotal > 0 ? (margenNeto / inversionTotal) * 100 : 0;
    const roiAnualizado = mesesVenta > 0 ? roiPct * (12 / mesesVenta) : 0;

    return {
      precioCompra, deudasTotal, costosVentaTotal, remodelacion: remodelacionTotal, gestionTotal,
      netoAlDueno, inversionTotal, margenNeto, margenPctReal, precioCompraMax, netoAlDuenoMax,
      financiero, mesesVenta, roiPct, roiAnualizado,
    };
  }, [inputs, remodelacionTotal, gestionItems, deudaExtra]);

  const margenColor = calc.margenPctReal >= 0.20 ? "text-[#D9ED92]" : calc.margenPctReal >= 0.10 ? "text-amber-300" : "text-red-300";

  const chartData = useMemo(() => [
    { name: "Compra", valor: calc.precioCompra, color: "#1B4332" },
    { name: "Remodelación", valor: calc.remodelacion, color: "#52B788" },
    { name: "Gestión", valor: calc.gestionTotal, color: "#74C69D" },
    { name: "Venta/cierre", valor: calc.costosVentaTotal, color: "#95D5B2" },
    { name: "Ganancia", valor: Math.max(calc.margenNeto, 0), color: "#D9ED92" },
  ], [calc]);

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
          prop, arv, remodelSel, remodelExtra, deudaExtra, gestionItems,
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

  const descargarPdf = async () => {
    setDownloading(true);
    try {
      const arvParaReporte = arv.avg != null
        ? arv
        : { min: num(inputs.valor_venta_estimado), avg: num(inputs.valor_venta_estimado), max: num(inputs.valor_venta_estimado) };
      const folio = arv.valuationId || valuationId || `FLIP-${Date.now().toString(36).toUpperCase()}`;
      const html = buildFlippingReportHtml({
        prop, direccion: direccion || direccionBusqueda, arv: arvParaReporte, calc, folio,
      });
      const ok = await downloadReportPdf(html, `Flipping ${direccion || prop.colonia || folio}`);
      if (ok) toast.success("Reporte descargado en PDF");
      else toast.error("No se pudo generar el PDF");
    } finally {
      setDownloading(false);
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

              <div className="flex gap-2">
                {[["Casa", Home], ["Departamento", Building2]].map(([label, Icon]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setProp((prev) => ({ ...prev, propertyType: label }))}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                      prop.propertyType === label ? "border-[#52B788] bg-[#D9ED92]/20 text-[#1B4332]" : "border-slate-200 text-slate-500 hover:border-[#52B788]/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={prop.estado} onValueChange={(v) => setProp1("estado")(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      {MEXICAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Municipio *</Label><Input value={prop.municipio} onChange={setProp1("municipio")} placeholder="Guadalajara" /></div>
                <div><Label className="text-xs">Colonia *</Label><Input value={prop.colonia} onChange={setProp1("colonia")} placeholder="Chapalita" /></div>
                <div><Label className="text-xs">Calle / referencia (opcional)</Label><Input value={prop.calle} onChange={setProp1("calle")} /></div>
                <div><Label className="text-xs">m² terreno *</Label><Input type="number" value={prop.terreno_m2} onChange={setProp1("terreno_m2")} placeholder="0" /></div>
                <div><Label className="text-xs">m² construcción *</Label><Input type="number" value={prop.construccion_m2} onChange={setProp1("construccion_m2")} placeholder="0" /></div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <LocationMap
                    latitude={prop.lat}
                    longitude={prop.lng}
                    onLocationChange={handleLocationChange}
                    address={direccionBusqueda}
                    autoSearch={!!(prop.municipio && prop.colonia && prop.estado)}
                    extraAction={
                      <label className={`flex items-center gap-1 text-xs text-[#1B4332] hover:underline whitespace-nowrap px-1 ${photos.length >= MAX_PHOTOS ? "opacity-40" : "cursor-pointer"}`}>
                        <Camera className="w-4 h-4" /> Subir foto ({photos.length}/{MAX_PHOTOS})
                        <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} disabled={photos.length >= MAX_PHOTOS} />
                      </label>
                    }
                  />
                </div>
                {facadeIndex != null && photos[facadeIndex] && (
                  <img src={photos[facadeIndex]} alt="Fachada" className="w-24 h-24 shrink-0 object-cover rounded-lg border-2 border-[#52B788]" />
                )}
              </div>

              {photos.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400">Selecciona una como "Fachada" para la portada.</p>
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((src, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded overflow-hidden border border-slate-200">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                          <button type="button" onClick={() => removePhoto(i)} className="self-end p-0.5 bg-white/20 hover:bg-red-500 text-white rounded-full">
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFacadeIndex(facadeIndex === i ? null : i)}
                            className={`w-full py-0.5 rounded text-[8px] font-bold uppercase ${facadeIndex === i ? "bg-[#52B788] text-white" : "bg-white/90 text-[#1B4332]"}`}
                          >
                            {facadeIndex === i ? "★ Fachada" : "Elegir"}
                          </button>
                        </div>
                        {facadeIndex === i && (
                          <div className="absolute top-0.5 left-0.5 bg-[#52B788] text-white text-[7px] font-bold px-1 rounded">PORTADA</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={calcularARV} disabled={arv.loading} className="bg-[#1B4332] hover:bg-[#143024] text-white">
                <Search className="w-4 h-4 mr-2" />
                {arv.loading ? "Calculando…" : "Calcular valor de mercado"}
              </Button>
              {arv.error && <p className="text-xs text-red-600">{arv.error}</p>}
              {arv.avg != null && (
                <div className="bg-[#1B4332] text-white rounded-lg p-4 grid grid-cols-3 gap-3 text-center">
                  <div><span className="text-[11px] uppercase tracking-wide opacity-80 block">Mínimo</span><span className="font-bold text-lg">{fmt(arv.min)}</span></div>
                  <div><span className="text-[11px] uppercase tracking-wide opacity-80 block">Promedio (usado como ARV)</span><span className="font-bold text-lg text-[#D9ED92]">{fmt(arv.avg)}</span></div>
                  <div><span className="text-[11px] uppercase tracking-wide opacity-80 block">Máximo</span><span className="font-bold text-lg">{fmt(arv.max)}</span></div>
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
                <MoneyInput value={inputs.precio_compra} onChange={set("precio_compra")} />
              </div>
              <div>
                <Label className="text-xs">Valor de venta estimado (ARV)</Label>
                <MoneyInput value={inputs.valor_venta_estimado} onChange={set("valor_venta_estimado")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mb-4 items-start">
          <Card className="bg-white shadow-sm border-0 h-full">
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-[#1B4332] text-sm">Deudas de la propiedad</h2>
              <p className="text-[10px] text-slate-400 -mt-1">Se restan de lo que recibe el dueño</p>
              <div className="space-y-2">
                <div><Label className="text-xs">Agua</Label><MoneyInput value={inputs.deuda_agua} onChange={set("deuda_agua")} /></div>
                <div><Label className="text-xs">Predial</Label><MoneyInput value={inputs.deuda_predial} onChange={set("deuda_predial")} /></div>
                <div><Label className="text-xs">Luz</Label><MoneyInput value={inputs.deuda_luz} onChange={set("deuda_luz")} /></div>
                <div><Label className="text-xs">Cable/TV</Label><MoneyInput value={inputs.deuda_cable} onChange={set("deuda_cable")} /></div>
                <div><Label className="text-xs">Crédito hipotecario</Label><MoneyInput value={inputs.deuda_credito} onChange={set("deuda_credito")} /></div>
              </div>
              <DynamicMoneyList items={deudaExtra} onChange={setDeudaExtra} addLabel="Agregar otra deuda" />
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0 h-full">
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-[#1B4332] text-sm">Gastos de gestión</h2>
              <DynamicMoneyList items={gestionItems} onChange={setGestionItems} addLabel="Agregar gasto" emptyHint="Trámites, permisos, gestoría." />
              {gestionItems.length > 0 && (
                <div className="text-sm font-semibold text-[#1B4332] pt-1">Total: {fmt(calc.gestionTotal)}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0 h-full">
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-[#1B4332] text-sm">Costos de venta, cierre y operación</h2>
              <div className="space-y-2">
                <div><Label className="text-xs">Comisión inmobiliaria (% del ARV)</Label><Input type="number" value={inputs.comision_pct} onChange={set("comision_pct")} /></div>
                <div>
                  <Label className="text-xs flex items-center justify-between">Escrituración / notario
                    {autoLocked.escrituracion_notario && <button type="button" onClick={resetAutoField("escrituracion_notario")} className="text-slate-400 hover:text-[#1B4332]" title="Volver a automático"><RotateCcw className="w-3 h-3" /></button>}
                  </Label>
                  <MoneyInput value={inputs.escrituracion_notario} onChange={setAutoField("escrituracion_notario")} />
                  {!autoLocked.escrituracion_notario && <p className="text-[10px] text-slate-400 mt-0.5">Auto: 2% del ARV</p>}
                </div>
                <div>
                  <Label className="text-xs flex items-center justify-between">ISR sobre la ganancia
                    {autoLocked.isr && <button type="button" onClick={resetAutoField("isr")} className="text-slate-400 hover:text-[#1B4332]" title="Volver a automático"><RotateCcw className="w-3 h-3" /></button>}
                  </Label>
                  <MoneyInput value={inputs.isr} onChange={setAutoField("isr")} />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {autoLocked.isr ? "Editado a mano — puede haber exención" : "Auto: 35% de la ganancia fiscal"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs flex items-center justify-between">ISAI + notarial de compra
                    {autoLocked.costos_contrato_diligencias && <button type="button" onClick={resetAutoField("costos_contrato_diligencias")} className="text-slate-400 hover:text-[#1B4332]" title="Volver a automático"><RotateCcw className="w-3 h-3" /></button>}
                  </Label>
                  <MoneyInput value={inputs.costos_contrato_diligencias} onChange={setAutoField("costos_contrato_diligencias")} />
                  {!autoLocked.costos_contrato_diligencias && <p className="text-[10px] text-slate-400 mt-0.5">Auto: 4% del precio de compra</p>}
                </div>
                <div>
                  <Label className="text-xs">Costo financiero {inputs.costo_financiero_modo === "mensual" ? "(mensual)" : "(total del préstamo)"}</Label>
                  <MoneyInput value={inputs.costo_financiero} onChange={set("costo_financiero")} />
                  <div className="flex gap-1 mt-1">
                    <button type="button" onClick={() => setInputs((p) => ({ ...p, costo_financiero_modo: "mensual" }))} className={`text-[10px] px-1.5 py-0.5 rounded ${inputs.costo_financiero_modo === "mensual" ? "bg-[#1B4332] text-white" : "bg-slate-100 text-slate-500"}`}>Mensual</button>
                    <button type="button" onClick={() => setInputs((p) => ({ ...p, costo_financiero_modo: "total" }))} className={`text-[10px] px-1.5 py-0.5 rounded ${inputs.costo_financiero_modo === "total" ? "bg-[#1B4332] text-white" : "bg-slate-100 text-slate-500"}`}>Total</button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {inputs.costo_financiero_modo === "mensual"
                      ? "Ej. interés mensual de un socio inversionista — se multiplica por los meses para vender."
                      : "Monto único, ej. comisión de apertura del crédito puente."}
                  </p>
                </div>
                <div><Label className="text-xs">Administración / tenencia</Label><MoneyInput value={inputs.costo_administracion} onChange={set("costo_administracion")} /></div>
                <div>
                  <Label className="text-xs">Tiempo estimado para vender (meses)</Label>
                  <Input type="number" value={inputs.meses_venta} onChange={set("meses_venta")} className="max-w-[100px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    <MoneyInput
                      disabled={!remodelSel[key]?.checked}
                      value={remodelSel[key]?.costo || ""}
                      onChange={setRemodelCosto(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <DynamicMoneyList items={remodelExtra} onChange={setRemodelExtra} addLabel="Agregar otro trabajo de obra" />
            <div className="text-xs text-slate-500 flex items-start gap-1 mt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Referencia de $/m² de construcción por calidad:
                {" "}{QUALITY_COSTS.map(([q, c]) => `${q} $${c.toLocaleString("es-MX")}`).join(" · ")}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#1B4332] pt-1">Total obra: {fmt(calc.remodelacion)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1B4332] text-white shadow-sm border-0 mb-4">
          <CardContent className="p-5 space-y-2">
            <h2 className="font-semibold">Resultado</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="opacity-80">Neto que recibe el dueño</span><span className="text-right font-semibold">{fmt(calc.netoAlDueno)}</span>
              <span className="opacity-80">Inversión total</span><span className="text-right font-semibold">{fmt(calc.inversionTotal)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/20 mt-2">
              <span className="opacity-90 font-medium">Margen neto</span>
              <span className={`font-extrabold text-2xl ${margenColor}`}>{fmt(calc.margenNeto)} ({(calc.margenPctReal * 100).toFixed(1)}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0 mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-[#1B4332]">Retorno para el inversionista</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase block">ROI del flip</span>
                <span className="text-xl font-bold text-[#1B4332]">{calc.roiPct.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase block">ROI anualizado</span>
                <span className="text-xl font-bold text-[#1B4332]">{calc.roiAnualizado.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase block">Tiempo para vender</span>
                <span className="text-xl font-bold text-[#1B4332]">{calc.mesesVenta || 0} meses</span>
              </div>
            </div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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

        <div className="flex gap-3">
          <Button onClick={guardar} disabled={saving} className="bg-[#52B788] hover:bg-[#40916C] text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando…" : "Guardar cálculo"}
          </Button>
          <Button onClick={descargarPdf} disabled={downloading} variant="outline" className="border-[#1B4332] text-[#1B4332] hover:bg-[#D9ED92]/20">
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
