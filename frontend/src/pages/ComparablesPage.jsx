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

  // Active top selection tracker
  const [activeTopFilter, setActiveTopFilter] = useState(null); // null | 6 | 10 | "all"

  // Negotiation adjustment (combo, -1 to -10%, max 10%)
  const [negotiation, setNegotiation] = useState(-5);

  useEffect(() => {
    fetchValuation();
  }, [valuationId]);

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
    const otherAdjustments = comp.total_adjustment - (comp.negotiation_adjustment || -5);
    const newTotalAdj = negotiation + otherAdjustments;
    const newAdjustedPrice = comp.price_per_sqm * (1 + newTotalAdj / 100);
    return {
      totalAdjustment: newTotalAdj,
      adjustedPrice: newAdjustedPrice
    };
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
          custom_negotiation: negotiation
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="spinner"></div>
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
                  variant={activeTopFilter === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectTop(count)}
                  className={activeTopFilter === count
                    ? "bg-[#1B4332] text-white border-[#1B4332] shadow-md"
                    : "border-slate-300 text-slate-600 hover:border-[#1B4332] hover:text-[#1B4332]"
                  }
                  data-testid={testId}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant={activeTopFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={selectAll}
                className={activeTopFilter === "all"
                  ? "bg-[#1B4332] text-white border-[#1B4332] shadow-md"
                  : "border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
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
                          <span className="text-xs font-semibold text-slate-500">{comp.age} años</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">{comp.land_area} m²</TableCell>
                      <TableCell className="text-right text-slate-600">{comp.construction_area} m²</TableCell>
                      <TableCell className={`text-right font-medium ${isSelected ? "text-[#1B4332] font-bold" : ""}`}>
                        {formatCurrency(comp.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(comp.price_per_sqm)}
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
                          {adjusted.totalAdjustment > 0 ? "+" : ""}{adjusted.totalAdjustment.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isSelected ? "text-[#1B4332]" : "text-slate-700"}`}>
                        {formatCurrency(adjusted.adjustedPrice)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={comp.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#52B788] hover:underline flex items-center gap-1 text-sm"
                        >
                          {comp.source?.split('.')[0] || comp.source}
                          <ExternalLink className="w-3 h-3" />
                        </a>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-['Outfit'] font-semibold text-[#1B4332] text-lg">
                  Detalle de Comparables Seleccionados ({selectedComps.length})
                </h3>
                {/* Toggle view */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailView("card")}
                    className={`px-2 py-1 h-7 rounded transition-all ${detailView === "card"
                      ? "bg-[#1B4332] text-white shadow-sm"
                      : "text-slate-500 hover:text-[#1B4332]"
                      }`}
                    title="Vista tarjeta"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailView("row")}
                    className={`px-2 py-1 h-7 rounded transition-all ${detailView === "row"
                      ? "bg-[#1B4332] text-white shadow-sm"
                      : "text-slate-500 hover:text-[#1B4332]"
                      }`}
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
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">$/m² Aj.</p>
                            <p className="font-bold text-[#1B4332] text-sm">{formatCurrency(adjusted.adjustedPrice)}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          {comp.age != null && (
                            <div className="flex justify-between items-center py-0.5 text-xs text-slate-400">
                              <span>📅 Edad comp.:</span>
                              <span className="font-semibold">{comp.age} años</span>
                            </div>
                          )}
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
                                  {val > 0 ? '+' : ''}{typeof val === 'number' ? val.toFixed(1) : val}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2 border-[#D9ED92] font-bold">
                            <span className="text-slate-700">Total Aj.:</span>
                            <span className={adjusted.totalAdjustment < 0 ? "text-red-600" : "text-green-600"}>
                              {adjusted.totalAdjustment > 0 ? "+" : ""}{adjusted.totalAdjustment.toFixed(1)}%
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
                        <th className="text-left px-3 py-2 font-semibold">Colonia</th>
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
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-[#1B4332] text-sm">{comp.neighborhood.slice(0, 20)}</div>
                              {comp.street_address && <div className="text-[10px] text-slate-400">{comp.street_address}</div>}
                            </td>
                            <td className="px-2 py-1.5 text-center text-slate-500 text-xs font-semibold">{comp.age != null ? comp.age + 'a' : '—'}</td>
                            <td className="px-2 py-1.5 text-center text-red-600 font-semibold text-xs">{negotiation}%</td>
                            <td className={`px-2 py-1.5 text-center font-semibold text-xs ${(comp.area_adjustment ?? 0) > 0 ? 'text-green-600' : (comp.area_adjustment ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {(comp.area_adjustment ?? 0) > 0 ? '+' : ''}{(comp.area_adjustment ?? 0).toFixed(1)}%
                            </td>
                            <td className={`px-2 py-1.5 text-center font-semibold text-xs ${(comp.condition_adjustment ?? 0) > 0 ? 'text-green-600' : (comp.condition_adjustment ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {(comp.condition_adjustment ?? 0) > 0 ? '+' : ''}{(comp.condition_adjustment ?? 0).toFixed(1)}%
                            </td>
                            <td className={`px-2 py-1.5 text-center font-semibold text-xs ${(comp.age_adjustment ?? 0) > 0 ? 'text-green-600' : (comp.age_adjustment ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {(comp.age_adjustment ?? 0) > 0 ? '+' : ''}{(comp.age_adjustment ?? 0).toFixed(1)}%
                            </td>
                            <td className={`px-2 py-1.5 text-center font-semibold text-xs ${(comp.quality_adjustment ?? 0) > 0 ? 'text-green-600' : (comp.quality_adjustment ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {(comp.quality_adjustment ?? 0) > 0 ? '+' : ''}{(comp.quality_adjustment ?? 0).toFixed(1)}%
                            </td>
                            <td className={`px-2 py-1.5 text-center font-semibold text-xs ${(comp.location_adjustment ?? 0) > 0 ? 'text-green-600' : (comp.location_adjustment ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {(comp.location_adjustment ?? 0) > 0 ? '+' : ''}{(comp.location_adjustment ?? 0).toFixed(1)}%
                            </td>
                            <td className={`px-3 py-2 text-center font-bold ${adjusted.totalAdjustment < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {adjusted.totalAdjustment > 0 ? '+' : ''}{adjusted.totalAdjustment.toFixed(1)}%
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
