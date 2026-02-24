import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Settings2,
  Search
} from "lucide-react";
import { API } from "@/App";

const ComparablesPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();
  const [valuation, setValuation] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingMore, setIsSearchingMore] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  
  // Editable negotiation adjustments
  const [adjustments, setAdjustments] = useState({
    negotiation: -5,
    minNegotiation: -10,
    maxNegotiation: 0
  });

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
      
      // Pre-select if already selected
      if (data.selected_comparables && data.selected_comparables.length > 0) {
        setSelectedIds(data.selected_comparables);
      }
      
      // Set default negotiation based on property type
      const propType = data.property_data?.property_type || "Casa";
      if (propType === "Terreno") {
        setAdjustments(prev => ({ ...prev, negotiation: -8 }));
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
      
      if (!response.ok) {
        throw new Error("Error al buscar más comparables");
      }
      
      const data = await response.json();
      toast.success(`Se encontraron ${data.count} comparables en total`);
      
      // Refresh valuation data
      await fetchValuation();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Error al buscar comparables");
    } finally {
      setIsSearchingMore(false);
    }
  };

  const toggleComparable = (comparableId) => {
    setSelectedIds(prev => {
      if (prev.includes(comparableId)) {
        return prev.filter(id => id !== comparableId);
      } else {
        return [...prev, comparableId];
      }
    });
  };

  const selectAll = () => {
    if (valuation?.comparables) {
      if (selectedIds.length === valuation.comparables.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(valuation.comparables.map(c => c.comparable_id));
      }
    }
  };

  const selectTop = (count) => {
    if (valuation?.comparables) {
      setSelectedIds(valuation.comparables.slice(0, count).map(c => c.comparable_id));
    }
  };

  // Recalculate adjusted prices with custom negotiation
  const getAdjustedPrice = (comp) => {
    const customNegotiation = adjustments.negotiation;
    const otherAdjustments = comp.total_adjustment - comp.negotiation_adjustment;
    const newTotalAdj = customNegotiation + otherAdjustments;
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
      // Save selection with custom adjustments
      const selectResponse = await fetch(`${API}/valuations/${valuationId}/select-comparables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          comparable_ids: selectedIds,
          custom_negotiation: adjustments.negotiation
        })
      });

      if (!selectResponse.ok) {
        throw new Error("Error al guardar selección");
      }

      // Calculate valuation
      const calcResponse = await fetch(`${API}/valuations/${valuationId}/calculate`, {
        method: "POST",
        credentials: "include"
      });

      if (!calcResponse.ok) {
        throw new Error("Error al calcular valuación");
      }

      toast.success("Comparables seleccionados correctamente");
      navigate(`/reporte/${valuationId}`);
      
    } catch (error) {
      console.error("Error:", error);
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
            <Badge variant="outline" className="text-lg px-4 py-2 border-[#52B788] text-[#1B4332]">
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

      {/* Adjustment Controls */}
      <Card className="max-w-6xl mx-auto mb-6 bg-white shadow-sm border-0">
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Ajustes de Negociación
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdjustments(!showAdjustments)}
              className="text-[#52B788]"
              data-testid="toggle-adjustments-btn"
            >
              {showAdjustments ? "Ocultar" : "Personalizar"}
            </Button>
          </div>
        </CardHeader>
        {showAdjustments && (
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#1B4332]">
                  Factor de Negociación: <span className="text-[#52B788] font-bold">{adjustments.negotiation}%</span>
                </Label>
                <p className="text-xs text-slate-500 mb-3">
                  Porcentaje estándar: {property.property_type === "Terreno" ? "-8%" : "-5%"} para {property.property_type}
                </p>
                <Slider
                  value={[adjustments.negotiation]}
                  onValueChange={(value) => setAdjustments(prev => ({ ...prev, negotiation: value[0] }))}
                  min={-15}
                  max={0}
                  step={1}
                  className="w-full max-w-md"
                  data-testid="negotiation-slider"
                />
                <div className="flex justify-between text-xs text-slate-400 max-w-md mt-1">
                  <span>-15%</span>
                  <span>-10%</span>
                  <span>-5%</span>
                  <span>0%</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <strong>Nota:</strong> El ajuste de negociación refleja el margen típico entre precio de lista 
                y precio de cierre. En mercados competitivos puede ser menor (-3%), en mercados lentos mayor (-10%).
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Comparables Table */}
      <Card className="max-w-6xl mx-auto bg-white shadow-lg border-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-['Outfit'] text-xl text-[#1B4332]">
              Comparables de Mercado ({comparables.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectTop(6)}
                className="border-slate-300 text-slate-600"
                data-testid="select-top-6-btn"
              >
                Top 6
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectTop(10)}
                className="border-slate-300 text-slate-600"
                data-testid="select-top-10-btn"
              >
                Top 10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="border-[#1B4332] text-[#1B4332]"
                data-testid="select-all-btn"
              >
                {selectedIds.length === comparables.length ? "Ninguno" : "Todos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1B4332]">
                  <TableHead className="text-white w-12">
                    <Check className="w-4 h-4" />
                  </TableHead>
                  <TableHead className="text-white">#</TableHead>
                  <TableHead className="text-white">Colonia</TableHead>
                  <TableHead className="text-white text-right">Terreno</TableHead>
                  <TableHead className="text-white text-right">Const.</TableHead>
                  <TableHead className="text-white text-right">Precio</TableHead>
                  <TableHead className="text-white text-right">$/m²</TableHead>
                  <TableHead className="text-white text-center">Ajuste</TableHead>
                  <TableHead className="text-white text-right">$/m² Aj</TableHead>
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
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-[#D9ED92]/20 hover:bg-[#D9ED92]/30" 
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => toggleComparable(comp.comparable_id)}
                      data-testid={`comparable-row-${index}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleComparable(comp.comparable_id)}
                          data-testid={`comparable-checkbox-${index}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium text-[#1B4332]">
                        {comp.neighborhood}
                      </TableCell>
                      <TableCell className="text-right">{comp.land_area} m²</TableCell>
                      <TableCell className="text-right">{comp.construction_area} m²</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(comp.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(comp.price_per_sqm)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={`${
                            adjusted.totalAdjustment < 0 
                              ? "border-red-300 text-red-600 bg-red-50" 
                              : adjusted.totalAdjustment > 0 
                                ? "border-green-300 text-green-600 bg-green-50"
                                : "border-slate-300"
                          }`}
                        >
                          {adjusted.totalAdjustment > 0 ? "+" : ""}{adjusted.totalAdjustment.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#1B4332]">
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
                          {comp.source.split('.')[0]}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Adjustment Details - Show only selected */}
          {selectedIds.length > 0 && (
            <div className="p-6 border-t border-slate-100">
              <h3 className="font-['Outfit'] font-semibold text-[#1B4332] mb-4">
                Detalle de Comparables Seleccionados ({selectedIds.length})
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparables
                  .filter(comp => selectedIds.includes(comp.comparable_id))
                  .slice(0, 6)
                  .map((comp, index) => {
                    const adjusted = getAdjustedPrice(comp);
                    return (
                      <div 
                        key={comp.comparable_id}
                        className="p-4 rounded-lg border border-[#52B788] bg-[#D9ED92]/10"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-[#1B4332]">
                            {comp.neighborhood.slice(0, 20)}
                          </span>
                          <Check className="w-4 h-4 text-[#52B788]" />
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Negociación:</span>
                            <span className="text-red-600">{adjustments.negotiation}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Superficie:</span>
                            <span>{comp.area_adjustment > 0 ? "+" : ""}{comp.area_adjustment}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Condición:</span>
                            <span>{comp.condition_adjustment > 0 ? "+" : ""}{comp.condition_adjustment.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ubicación:</span>
                            <span>{comp.location_adjustment > 0 ? "+" : ""}{comp.location_adjustment.toFixed(1)}%</span>
                          </div>
                          {comp.regime_adjustment !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Régimen:</span>
                              <span className="text-red-600">{comp.regime_adjustment}%</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                            <span>Total:</span>
                            <span className={adjusted.totalAdjustment < 0 ? "text-red-600" : "text-green-600"}>
                              {adjusted.totalAdjustment > 0 ? "+" : ""}{adjusted.totalAdjustment.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 font-bold text-[#1B4332]">
                            <span>$/m² Ajustado:</span>
                            <span>{formatCurrency(adjusted.adjustedPrice)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="max-w-6xl mx-auto mt-6 flex justify-between items-center flex-wrap gap-4">
        <div className="text-sm text-slate-500">
          <p>Seleccione entre <strong>3 y 10</strong> comparables para el análisis</p>
          <p className="text-xs mt-1">
            Ajuste de negociación aplicado: <strong>{adjustments.negotiation}%</strong>
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedIds.length < 3 || selectedIds.length > 10}
          className="bg-[#52B788] hover:bg-[#40916C] text-white px-8"
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
