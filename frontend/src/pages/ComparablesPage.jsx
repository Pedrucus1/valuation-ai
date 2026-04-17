import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Ruler,
  DollarSign,
  Check,
  RefreshCw,
  Search,
  LayoutList,
  LayoutGrid
} from "lucide-react";
import { API } from "@/App";
import AdOverlay from "@/components/AdOverlay";

// Negotiation options
const NEGOTIATION_OPTIONS = [
  { value: -1, label: "-1% (Mercado muy activo)" },
  { value: -2, label: "-2%" },
  { value: -3, label: "-3% (Competitivo)" },
  { value: -4, label: "-4%" },
  { value: -5, label: "-5% (Estándar)" },
  { value: -6, label: "-6%" },
  { value: -7, label: "-7% (Lento)" },
  { value: -8, label: "-8% (Terreno / Lento)" },
  { value: -9, label: "-9%" },
  { value: -10, label: "-10% (Alta influencia)" },
];

const ComparablesPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();
  const [valuation, setValuation] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingMore, setIsSearchingMore] = useState(false);
  const [detailView, setDetailView] = useState("row"); // "card" | "row"

  // Enriquecimiento con Puppeteer via SSE
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [adIndex, setAdIndex] = useState(0);
  const [adProgress, setAdProgress] = useState(0); // 0-100 per slide
  const [showSlot1Ad, setShowSlot1Ad] = useState(true); // slot1 al iniciar carga

  const ADS = [
    { tag: "Consejo PropValu", title: "El valor lo define la oferta y la demanda", body: "No existe un precio único para una propiedad. El valor real es el que un comprador informado está dispuesto a pagar en el mercado actual." },
    { tag: "¿Sabías que?", title: "El predial puede engañarte", body: "Las medidas del predial a menudo no coinciden con las escrituras. Siempre usa la superficie real de construcción de tus escrituras para una valuación más precisa." },
    { tag: "Dato de mercado", title: "La ubicación vale más que los metros", body: "Una propiedad 30% más pequeña en una zona premium puede superar en valor a una grande en zona periférica. La plusvalía de la colonia es clave." },
    { tag: "Consejo PropValu", title: "Las fotos importan al vender", body: "Las propiedades con fotografías profesionales reciben hasta 3 veces más contactos en portales. La primera impresión es digital." },
    { tag: "¿Sabías que?", title: "Nivel y orientación afectan el precio", body: "En edificios, los pisos altos con buena vista tienen un premium del 5-12%. La orientación al sur maximiza la iluminación natural." },
    { tag: "Dato de mercado", title: "Renta vs compra: cuándo conviene cada uno", body: "Si el precio de venta dividido entre la renta anual da más de 25 años, comprar puede ser menos eficiente que rentar e invertir la diferencia." },
    { tag: "Consejo PropValu", title: "Negocia con datos, no con intuición", body: "Conocer el precio por m² de los comparables activos en la zona te da ventaja real en cualquier negociación, ya seas comprador o vendedor." },
    { tag: "¿Sabías que?", title: "La antigüedad deprecia el valor físico", body: "Una construcción pierde en promedio 2% de valor físico por año. Por eso las remodelaciones recientes son uno de los factores que más incrementan el avalúo." },
    { tag: "Dato de mercado", title: "El cap rate revela la rentabilidad real", body: "Un cap rate del 5-7% anual es saludable en México. Propiedades con cap rate menor al 4% suelen estar sobrevaloradas para inversión de renta." },
    { tag: "Consejo PropValu", title: "Comparables: calidad sobre cantidad", body: "5 comparables bien seleccionados (mismo tipo, misma zona, mismos m²) son más precisos que 20 mal filtrados. La homologación hace la diferencia." },
    { tag: "Dato de mercado", title: "La escrituración protege tu inversión", body: "En México, más del 30% de las transacciones inmobiliarias tienen problemas legales por falta de escrituras actualizadas. Escriturar a tiempo evita litigios costosos." },
    { tag: "Consejo PropValu", title: "El tiempo en el mercado sube el riesgo", body: "Una propiedad con más de 90 días publicada sin venderse pierde poder de negociación. El precio correcto desde el inicio reduce el tiempo de venta a la mitad." },
    { tag: "¿Sabías que?", title: "El estacionamiento puede valer más de lo que crees", body: "En zonas urbanas densas de Guadalajara o CDMX, un cajón de estacionamiento adicional puede incrementar el valor de un departamento entre 8% y 15%." },
    { tag: "Dato de mercado", title: "La inflación y el ladrillo van de la mano", body: "Históricamente, el sector inmobiliario mexicano ha superado la inflación en un 2-3% anual en zonas consolidadas. Es uno de los activos más estables a largo plazo." },
    { tag: "Consejo PropValu", title: "Superficie vendible vs superficie total", body: "En condominios, la superficie privativa (la tuya) es la que se valúa. Las áreas comunes no se suman al precio del m² — un error frecuente al comparar propiedades." },
    { tag: "¿Sabías que?", title: "Las amenidades tienen rendimiento decreciente", body: "La primera alberca en un desarrollo suma valor. La segunda no. Pagar extra por amenidades que ya existen en el edificio de enfrente no se recupera al vender." },
    { tag: "Dato de mercado", title: "Plusvalía esperada vs plusvalía real", body: "No toda zona 'en crecimiento' genera plusvalía automática. La infraestructura vial, escuelas, comercio y seguridad son los indicadores reales que mueven los precios." },
    { tag: "Consejo PropValu", title: "El CUS: clave para terrenos y desarrollos", body: "El Coeficiente de Utilización del Suelo determina cuánto puedes construir legalmente. Un terreno con CUS alto en zona de demanda puede triplicar su valor potencial." },
    { tag: "¿Sabías que?", title: "Remodelar no siempre recupera la inversión", body: "Una remodelación premium en una colonia de nivel medio raramente se recupera al vender. El valor máximo de una propiedad lo pone el techo de su zona, no sus acabados." },
    { tag: "Dato de mercado", title: "El mercado de usados mueve más que el nuevo", body: "En México, el 70% de las transacciones inmobiliarias son de vivienda usada. Conocer el precio real del mercado secundario es más útil que compararse con desarrollos nuevos." },
  ];

  // Active top selection tracker
  const [activeTopFilter, setActiveTopFilter] = useState(null); // null | 6 | 10 | "all"

  // Appraiser factor editing
  const [user, setUser] = useState(null);
  const [isEditable, setIsEditable] = useState(false);
  const [customFactors, setCustomFactors] = useState({});

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user_id && data.user_id !== 'user_local_dev') setUser(data); })
      .catch(() => {});
  }, []);

  // Publicidad: público general, inmobiliaria Lite/Pro → sí. Valuador, Premier, super_admin → no.
  const showAds = !user || (
    user.role !== "appraiser" &&
    user.role !== "super_admin" &&
    !(user.role === "realtor" && user.plan === "premier")
  );

  // Negotiation adjustment (combo, -1 to -10%, max 10%)
  const [negotiation, setNegotiation] = useState(-5);

  useEffect(() => {
    fetchValuation();
  }, [valuationId]);

  // Slide timer for loading ads (10s per slide)
  useEffect(() => {
    if (!isLoading) return;
    const SLIDE_MS = 12000;
    const TICK_MS = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += TICK_MS;
      const withinSlide = elapsed % SLIDE_MS;
      setAdProgress(Math.round((withinSlide / SLIDE_MS) * 100));
      if (withinSlide === 0) {
        setAdIndex(i => (i + 1) % ADS.length);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Iniciar enriquecimiento SSE cuando los comparables estén listos
  useEffect(() => {
    if (!valuation || !valuation.comparables?.length || isEnriching) return;
    // Solo enriquecer si hay comparables sin datos completos
    const needsEnrich = valuation.comparables.some(c => !c.construction_area || !c.land_area || c.age === null || c.age === undefined);
    if (!needsEnrich) return;

    setIsEnriching(true);
    setEnrichProgress({ done: 0, total: valuation.comparables.length });

    const es = new EventSource(`${API}/valuations/${valuationId}/enrich-stream`);
    const adTimer = setInterval(() => setAdIndex(i => (i + 1) % ADS.length), 12000);
    const safetyTimer = setTimeout(() => { setIsEnriching(false); es.close(); clearInterval(adTimer); }, 90000);

    const cleanup = () => { es.close(); clearInterval(adTimer); clearTimeout(safetyTimer); };

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "enriched") {
        setValuation(prev => {
          if (!prev) return prev;
          const updatedComps = prev.comparables.map(c =>
            c.comparable_id === msg.comparable_id ? { ...c, ...msg.updates } : c
          );
          return { ...prev, comparables: updatedComps };
        });
        setEnrichProgress(p => ({ ...p, done: p.done + 1 }));
      }
      if (msg.type === "done") {
        cleanup();
        setIsEnriching(false);
        if (msg.enriched > 0) toast.success(`Datos actualizados en ${msg.enriched} comparables`);
      }
    };
    es.onerror = () => { cleanup(); setIsEnriching(false); };

    return cleanup;
  }, [valuation?.comparables?.length]);

  const fetchValuation = async () => {
    try {
      const response = await fetch(`${API}/valuations/${valuationId}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Valuación no encontrada");
      }

      const data = await response.json();
      setValuation(data);

      if (data.selected_comparables && data.selected_comparables.length > 0) {
        setSelectedIds(data.selected_comparables);
      }

      // Default negotiation by property type
      const propType = data.property_data?.property_type || "Casa";
      if (propType === "Terreno") {
        setNegotiation(-8);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar la valuación");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const searchMoreComparables = async () => {
    setIsSearchingMore(true);
    try {
      const response = await fetch(`${API}/valuations/${valuationId}/generate-comparables?append=true`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) throw new Error("Error al buscar más comparables");

      const data = await response.json();
      toast.success(`Se encontraron ${data.count} comparables en total`);
      await fetchValuation();
    } catch (error) {
      toast.error(error.message || "Error al buscar comparables");
    } finally {
      setIsSearchingMore(false);
    }
  };

  const toggleComparable = (comparableId) => {
    setSelectedIds(prev => {
      const next = prev.includes(comparableId)
        ? prev.filter(id => id !== comparableId)
        : [...prev, comparableId];
      setActiveTopFilter(null); // Clear active filter on manual change
      return next;
    });
  };

  const selectTop = (count) => {
    if (valuation?.comparables) {
      setSelectedIds(valuation.comparables.slice(0, count).map(c => c.comparable_id));
      setActiveTopFilter(count);
    }
  };

  const selectAll = () => {
    if (valuation?.comparables) {
      if (selectedIds.length === valuation.comparables.length) {
        setSelectedIds([]);
        setActiveTopFilter(null);
      } else {
        setSelectedIds(valuation.comparables.map(c => c.comparable_id));
        setActiveTopFilter("all");
      }
    }
  };

  const getAdjustedPrice = (comp) => {
    const custom = customFactors[comp.comparable_id] || {};
    const safeN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
    const areaAdj = safeN(custom.area_adjustment ?? comp.area_adjustment ?? 0);
    const conditionAdj = safeN(custom.condition_adjustment ?? comp.condition_adjustment ?? 0);
    const ageAdj = safeN(custom.age_adjustment ?? comp.age_adjustment ?? 0);
    const qualityAdj = safeN(custom.quality_adjustment ?? comp.quality_adjustment ?? 0);
    const locationAdj = safeN(custom.location_adjustment ?? comp.location_adjustment ?? 0);

    const otherAdjustments = areaAdj + conditionAdj + ageAdj + qualityAdj + locationAdj;
    const newTotalAdj = negotiation + otherAdjustments;
    
    // Fix NaN: if priceSqM or price is string from AI, parse it correctly
    const parseNum = (val) => typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : Number(val);
    let baseSqm = parseNum(comp.price_per_sqm);
    if (!baseSqm || isNaN(baseSqm)) {
      const p = parseNum(comp.price);
      const a = parseNum(comp.construction_area);
      baseSqm = (p > 0 && a > 0) ? p / a : 0;
    }

    const newAdjustedPrice = baseSqm * (1 + newTotalAdj / 100);
    return {
      totalAdjustment: newTotalAdj,
      adjustedPrice: newAdjustedPrice,
      baseSqm: baseSqm
    };
  };

  const toFactor = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "1.00";
    return (1 + num / 100).toFixed(2);
  };

  const renderFactorCell = (comp, fieldKey, originalValue) => {
    const val = customFactors[comp.comparable_id]?.[fieldKey] ?? originalValue ?? 0;
    if (!isEditable) {
      return (
        <span className={`text-xs font-semibold ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-slate-500'}`}>
          {toFactor(val)}
        </span>
      );
    }
    return (
      <input 
        type="number" 
        step="0.1" 
        className="w-16 text-center text-xs border border-[#52B788] rounded px-1 py-0.5 bg-white shadow-sm"
        value={val}
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0;
          setCustomFactors(prev => ({
            ...prev,
            [comp.comparable_id]: {
              ...(prev[comp.comparable_id] || {}),
              [fieldKey]: v
            }
          }));
        }}
      />
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 3) {
      toast.error("Seleccione al menos 3 comparables");
      return;
    }
    if (selectedIds.length > 10) {
      toast.error("Seleccione máximo 10 comparables");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectResponse = await fetch(`${API}/valuations/${valuationId}/select-comparables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          comparable_ids: selectedIds,
          custom_negotiation: negotiation,
          custom_factors: customFactors
        })
      });

      if (!selectResponse.ok) throw new Error("Error al guardar selección");

      const calcResponse = await fetch(`${API}/valuations/${valuationId}/calculate`, {
        method: "POST",
        credentials: "include"
      });

      if (!calcResponse.ok) throw new Error("Error al calcular valuación");

      toast.success("Comparables seleccionados correctamente");
      navigate(`/reporte/${valuationId}`);

    } catch (error) {
      toast.error(error.message || "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "$0";
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // ─── Popup de anuncio bloqueante (carga inicial + enriquecimiento) ───
  const AdPopup = ({ label }) => {
    const ad = ADS[adIndex];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
        {/* Cuadrado ~mitad de pantalla */}
        <div className="bg-[#1B4332] rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center justify-between p-8"
             style={{ width: "min(90vw, 520px)", height: "min(90vw, 520px)" }}>

          {/* Logo + spinner */}
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#D9ED92]" />
              <span className="font-['Outfit'] text-lg font-bold text-white">
                Prop<span className="text-[#52B788]">Valu</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#52B788] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-xs">{label}</p>
            </div>
          </div>

          {/* Contenido del anuncio */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
            <p className="text-[10px] font-bold text-[#D9ED92] uppercase tracking-widest mb-3">
              {ad.tag}
            </p>
            <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug">
              {ad.title}
            </h2>
            <p className="text-white/80 text-base leading-relaxed max-w-xs">
              {ad.body}
            </p>
          </div>

          {/* Dots + barra */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {ADS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                  i === adIndex ? "w-5 h-2 bg-[#D9ED92]" : i < adIndex ? "w-2 h-2 bg-[#52B788]" : "w-2 h-2 bg-white/20"
                }`} />
              ))}
            </div>
            <p className="text-white/25 text-[10px] mt-1">
              {Math.max(1, Math.ceil((100 - adProgress) / 100 * 12))}s · Estimación con inteligencia de PropValu
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    const zone = valuation?.property_data?.municipio || "";
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        {showAds && showSlot1Ad && (
          <AdOverlay slot="slot1" zone={zone} onDone={() => setShowSlot1Ad(false)} />
        )}
        <div className="flex flex-col items-center gap-4 text-[#1B4332]">
          <div className="w-10 h-10 border-4 border-[#52B788] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Buscando comparables de mercado...</p>
        </div>
      </div>
    );
  }

  if (!valuation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <p className="text-slate-600">Valuación no encontrada</p>
      </div>
    );
  }

  const property = valuation.property_data;
  const comparables = valuation.comparables || [];
  const selectedComps = comparables.filter(c => selectedIds.includes(c.comparable_id));

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">

      {/* Popup bloqueante durante enriquecimiento con Puppeteer (solo usuarios con ads) */}
      {isEnriching && showAds && (
        <AdPopup label={`Completando datos... ${enrichProgress.done}/${enrichProgress.total}`} />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/valuar")}
          className="mb-4 text-[#1B4332] hover:bg-[#D9ED92]/30"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nueva valuación
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-[#1B4332]" />
              <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332]">
                Selección de Comparables
              </h1>
              <Badge className="bg-[#1B4332] text-white">Modo Valuador</Badge>
            </div>
            <p className="text-slate-600">
              Seleccione entre 3-10 comparables para su análisis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-lg px-4 py-2 border-2 transition-colors ${selectedIds.length >= 3 && selectedIds.length <= 10
              ? 'border-[#52B788] text-[#1B4332] bg-[#D9ED92]/20'
              : selectedIds.length === 0
                ? 'border-slate-300 text-slate-500'
                : 'border-orange-400 text-orange-600 bg-orange-50'
              }`}>
              {selectedIds.length} / {comparables.length} seleccionados
            </Badge>
            <Button
              variant="outline"
              onClick={searchMoreComparables}
              disabled={isSearchingMore}
              className="border-[#52B788] text-[#52B788] hover:bg-[#52B788] hover:text-white"
              data-testid="search-more-btn"
            >
              {isSearchingMore ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar más
            </Button>
          </div>
        </div>
      </div>

      {/* Property Summary */}
      <Card className="max-w-6xl mx-auto mb-6 bg-white shadow-sm border-0">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Ubicación</p>
                <p className="font-semibold text-[#1B4332]">{property.neighborhood}, {property.municipality}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Terreno</p>
                <p className="font-semibold text-[#1B4332]">{property.land_area} m²</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Construcción</p>
                <p className="font-semibold text-[#1B4332]">{property.construction_area} m²</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="font-semibold text-[#1B4332]">{property.property_type}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparables Table */}
      <Card className="max-w-6xl mx-auto bg-white shadow-lg border-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Title + Negotiation combo INLINE */}
            <div className="flex items-center gap-4 flex-wrap">
              <CardTitle className="font-['Outfit'] text-xl text-[#1B4332]">
                Comparables de Mercado ({comparables.length})
              </CardTitle>
              {/* Negotiation inline combo */}
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Negociación:</Label>
                <Select
                  value={String(negotiation)}
                  onValueChange={(v) => setNegotiation(Number(v))}
                >
                  <SelectTrigger className="h-8 w-44 text-sm border-[#52B788] text-[#1B4332] font-semibold" data-testid="negotiation-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEGOTIATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        <span className="font-semibold text-red-600">{opt.value}%</span>
                        <span className="text-slate-500 ml-1 text-xs">{opt.label.split('%')[1]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Top filter buttons */}
            <div className="flex gap-2">
              {[
                { label: "Top 6", count: 6, testId: "select-top-6-btn" },
                { label: "Top 10", count: 10, testId: "select-top-10-btn" },
              ].map(({ label, count, testId }) => (
                <Button
                  key={count}
                  variant="outline"
                  size="sm"
                  onClick={() => selectTop(count)}
                  className={activeTopFilter === count
                    ? "bg-[#1B4332] !text-white border-[#1B4332] hover:bg-[#1B4332] hover:!text-white shadow-md"
                    : "border-slate-300 text-slate-600 hover:border-[#1B4332] hover:text-[#1B4332]"
                  }
                  data-testid={testId}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className={activeTopFilter === "all"
                  ? "bg-[#1B4332] !text-white border-[#1B4332] hover:bg-[#1B4332] hover:!text-white shadow-md"
                  : "border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:!text-white"
                }
                data-testid="select-all-btn"
              >
                {selectedIds.length === comparables.length && comparables.length > 0 ? "Ninguno" : "Todos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1B4332] hover:bg-[#1B4332]">
                  <TableHead className="text-white w-12">
                    <Check className="w-4 h-4" />
                  </TableHead>
                  <TableHead className="text-white">#</TableHead>
                  <TableHead className="text-white">Colonia / Domicilio</TableHead>
                  <TableHead className="text-white text-center">Edad</TableHead>
                  <TableHead className="text-white text-right">Terreno</TableHead>
                  <TableHead className="text-white text-right">Const.</TableHead>
                  <TableHead className="text-white text-right">Precio</TableHead>
                  <TableHead className="text-white text-right">$/m²</TableHead>
                  <TableHead className="text-white text-center">Aj.%</TableHead>
                  <TableHead className="text-white text-right">$/m² Aj.</TableHead>
                  <TableHead className="text-white">Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparables.map((comp, index) => {
                  const isSelected = selectedIds.includes(comp.comparable_id);
                  const adjusted = getAdjustedPrice(comp);
                  return (
                    <TableRow
                      key={comp.comparable_id}
                      className={`cursor-pointer transition-all duration-150 ${isSelected
                        ? "bg-[#D9ED92]/30 border-l-4 border-l-[#52B788] hover:bg-[#D9ED92]/40"
                        : comp.source === "propvalu_db"
                          ? "hover:bg-blue-50/40 border-l-4 border-l-blue-400"
                          : "hover:bg-slate-50 border-l-4 border-l-transparent"
                        }`}
                      onClick={() => toggleComparable(comp.comparable_id)}
                      data-testid={`comparable-row-${index}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleComparable(comp.comparable_id)}
                          className={isSelected ? "border-[#52B788] data-[state=checked]:bg-[#52B788]" : ""}
                          data-testid={`comparable-checkbox-${index}`}
                        />
                      </TableCell>
                      <TableCell className={`font-bold ${isSelected ? "text-[#1B4332]" : "text-slate-500"}`}>
                        {index + 1}
                      </TableCell>
                      <TableCell className={`font-medium ${isSelected ? "text-[#1B4332] font-semibold" : "text-slate-700"}`}>
                        <div>{comp.neighborhood}</div>
                        {comp.street_address && (
                          <div className="text-xs text-slate-400 font-normal mt-0.5">{comp.street_address}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.age != null ? (
                          <span className="text-xs font-semibold text-slate-500">{comp.age} años{comp.age === 0 ? " (nuevo)" : ""}</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">{comp.land_area} m²</TableCell>
                      <TableCell className="text-right text-slate-600">{comp.construction_area} m²</TableCell>
                      <TableCell className={`text-right font-medium ${isSelected ? "text-[#1B4332] font-bold" : ""}`}>
                        {formatCurrency(comp.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(adjusted.baseSqm)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`font-bold ${adjusted.totalAdjustment < 0
                            ? "border-red-300 text-red-600 bg-red-50"
                            : adjusted.totalAdjustment > 0
                              ? "border-green-300 text-green-600 bg-green-50"
                              : "border-slate-300"
                            }`}
                        >
                          {toFactor(adjusted.totalAdjustment)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isSelected ? "text-[#1B4332]" : "text-slate-700"}`}>
                        {formatCurrency(adjusted.adjustedPrice)}
                      </TableCell>
                      <TableCell>
                        {comp.source === "propvalu_db" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                            ★ PropValu
                          </span>
                        ) : (
                          <a
                            href={comp.source_url?.startsWith('http') ? comp.source_url : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 text-sm ${comp.source_url?.startsWith('http') ? 'text-[#52B788] hover:underline cursor-pointer' : 'text-slate-400 cursor-default'}`}
                          >
                            {comp.source?.split('.')[0] || comp.source}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Detail of selected comparables */}
          {selectedIds.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <h3 className="font-['Outfit'] font-semibold text-[#1B4332] text-lg w-full sm:w-auto sm:flex-1">
                  Detalle de Comparables Seleccionados ({selectedComps.length})
                </h3>
                {user?.role === "appraiser" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditable(!isEditable);
                      if (!isEditable) setDetailView("row");
                    }}
                    className={`h-7 px-2 text-xs transition-colors ${isEditable ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' : 'text-[#1B4332] border-[#52B788]/50 hover:bg-[#52B788]/10'}`}
                  >
                    {isEditable ? '💾 Guardar Cambios (Modo Edición)' : '✏️ Editar Factores (Valuador)'}
                  </Button>
                )}
                {/* Toggle view — mismo renglón que Editar Factores */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailView("card")}
                    className={`px-2 py-1 h-7 rounded transition-all ${detailView === "card" ? "bg-[#1B4332] text-white shadow-sm" : "text-slate-500 hover:text-[#1B4332]"}`}
                    title="Vista tarjeta"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailView("row")}
                    className={`px-2 py-1 h-7 rounded transition-all ${detailView === "row" ? "bg-[#1B4332] text-white shadow-sm" : "text-slate-500 hover:text-[#1B4332]"}`}
                    title="Vista lista"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Card view */}
              {detailView === "card" && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedComps.slice(0, 10).map((comp, index) => {
                    const adjusted = getAdjustedPrice(comp);
                    return (
                      <div
                        key={comp.comparable_id}
                        className="p-4 rounded-xl border-2 border-[#52B788] bg-white shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-[#52B788] uppercase tracking-wider">
                              Comp. {index + 1}
                            </span>
                            <p className="font-semibold text-[#1B4332] leading-tight text-sm">
                              {comp.neighborhood}
                            </p>
                            {comp.street_address && (
                              <p className="text-[10px] text-slate-400 leading-tight">{comp.street_address}</p>
                            )}
                            <div className="text-[10px] text-sky-600 font-medium mt-1 inline-flex gap-2">
                              {comp.bedrooms ? <span>{comp.bedrooms} 🛌</span> : null}
                              {comp.bathrooms ? <span>{comp.bathrooms} 🚿</span> : null}
                              {comp.parking ? <span>{comp.parking} 🚗</span> : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">$/m² Aj.</p>
                            <p className="font-bold text-[#1B4332] text-sm">{formatCurrency(adjusted.adjustedPrice)}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center py-0.5 text-xs text-slate-400">
                            <span>📅 Edad comp.:</span>
                            <span className="font-semibold">{comp.age != null ? `${comp.age} años${comp.age === 0 ? " (nuevo)" : ""}` : 'N/D'}</span>
                          </div>
                          {comp.condition && (
                            <div className="flex justify-between items-center py-0.5 text-xs text-slate-400">
                              <span>🏠 Conservación:</span>
                              <span className="font-semibold">{comp.condition}</span>
                            </div>
                          )}
                          <div className="border-t border-dashed border-slate-100 pt-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Factores INDAABIN</div>
                            {[
                              { label: 'Neg.', val: negotiation },
                              { label: 'Superficie', val: comp.area_adjustment ?? 0 },
                              { label: 'Condición', val: comp.condition_adjustment ?? 0 },
                              { label: 'Edad', val: comp.age_adjustment ?? 0 },
                              { label: 'Acabados', val: comp.quality_adjustment ?? 0 },
                              { label: 'Ubicación/Frentes', val: comp.location_adjustment ?? 0 },
                              { label: 'Régimen', val: comp.regime_adjustment ?? 0 },
                            ].map(({ label, val }) => (
                              <div key={label} className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 text-xs">{label}:</span>
                                <span className={`text-xs font-semibold ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-slate-400'
                                  }`}>
                                  {toFactor(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2 border-[#D9ED92] font-bold">
                            <span className="text-slate-700">Total Aj.:</span>
                            <span className={adjusted.totalAdjustment < 0 ? "text-red-600" : "text-green-600"}>
                              {toFactor(adjusted.totalAdjustment)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 bg-[#D9ED92]/20 rounded px-2 py-1">
                            <span className="text-[#1B4332] font-semibold text-xs">$/m² Ajustado:</span>
                            <span className="font-bold text-[#1B4332]">{formatCurrency(adjusted.adjustedPrice)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Row / list view */}
              {detailView === "row" && (
                <div className="overflow-x-auto rounded-xl border border-[#52B788]/30">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1B4332]/10 text-[#1B4332]">
                        <th className="text-left px-3 py-2 font-semibold">Ubicación</th>
                        <th className="text-center px-1 py-2 font-semibold text-base" title="Recámaras">🛏️</th>
                        <th className="text-center px-1 py-2 font-semibold text-base" title="Baños">🚿</th>
                        <th className="text-center px-1 py-2 font-semibold text-base" title="Estacionamientos">🚗</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Edad</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Neg.</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Sup.</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Cond.</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Edad Aj.</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Acab.</th>
                        <th className="text-center px-2 py-2 font-semibold text-xs">Ubic.</th>
                        <th className="text-center px-2 py-2 font-bold text-xs">Total Aj.</th>
                        <th className="text-right px-3 py-2 font-bold text-xs">$/m² Aj.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedComps.map((comp, index) => {
                        const adjusted = getAdjustedPrice(comp);
                        return (
                          <tr key={comp.comparable_id} className={index % 2 === 0 ? "bg-white" : "bg-[#D9ED92]/10"}>
                            <td className="px-3 py-1.5 min-w-[200px]">
                              <div className="font-semibold text-[#1B4332] text-sm break-words">{comp.neighborhood}</div>
                              {comp.street_address && <div className="text-xs font-medium text-slate-500 mt-0.5">{comp.street_address}</div>}
                            </td>
                            <td className="px-1 py-1.5 text-center text-slate-600 text-[11px] font-semibold">{comp.bedrooms || '-'}</td>
                            <td className="px-1 py-1.5 text-center text-slate-600 text-[11px] font-semibold">{comp.bathrooms || '-'}</td>
                            <td className="px-1 py-1.5 text-center text-slate-600 text-[11px] font-semibold">{comp.parking || '-'}</td>
                            <td className="px-2 py-1.5 text-center text-slate-500 text-xs font-semibold">{comp.age != null ? comp.age + ' años' + (comp.age === 0 ? ' (nuevo)' : '') : 'N/D'}</td>
                            <td className="px-2 py-1.5 text-center text-red-600 font-semibold text-xs">{toFactor(negotiation)}</td>
                            <td className="px-2 py-1.5 text-center">
                              {renderFactorCell(comp, 'area_adjustment', comp.area_adjustment)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {renderFactorCell(comp, 'condition_adjustment', comp.condition_adjustment)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {renderFactorCell(comp, 'age_adjustment', comp.age_adjustment)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {renderFactorCell(comp, 'quality_adjustment', comp.quality_adjustment)}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {renderFactorCell(comp, 'location_adjustment', comp.location_adjustment)}
                            </td>
                            <td className={`px-3 py-2 text-center font-bold ${adjusted.totalAdjustment < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {toFactor(adjusted.totalAdjustment)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-[#1B4332]">
                              {formatCurrency(adjusted.adjustedPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="max-w-6xl mx-auto mt-6 flex justify-between items-center flex-wrap gap-4">
        <div className="text-sm text-slate-500">
          <p>Seleccione entre <strong>3 y 10</strong> comparables para el análisis</p>
          <p className="text-xs mt-1">
            Factor de negociación activo: <strong className="text-red-600">{negotiation}%</strong>
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedIds.length < 3 || selectedIds.length > 10}
          className="bg-[#52B788] hover:bg-[#40916C] text-white px-8 shadow-md"
          data-testid="continue-btn"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Continuar al Reporte
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ComparablesPage;
