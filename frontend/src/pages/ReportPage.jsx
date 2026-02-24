import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Share2
} from "lucide-react";
import { API } from "@/App";

const ReportPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();
  const [valuation, setValuation] = useState(null);
  const [reportHtml, setReportHtml] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const reportRef = useRef(null);

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

      if (data.report_html) {
        setReportHtml(data.report_html);
      } else if (data.result) {
        // If calculated but no report, generate it with default options
        generateReport(true);
      } else {
        // If not calculated, calculate first
        await calculateAndGenerate();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar la valuación");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAndGenerate = async () => {
    setIsGenerating(true);
    try {
      // Calculate first
      const calcResponse = await fetch(`${API}/valuations/${valuationId}/calculate`, {
        method: "POST",
        credentials: "include"
      });

      if (!calcResponse.ok) {
        throw new Error("Error al calcular valuación");
      }

      // Then generate report with analysis preference
      await generateReport(includeAnalysis);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = async (withAnalysis = true) => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API}/valuations/${valuationId}/generate-report?include_analysis=${withAnalysis}`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Error al generar reporte");
      }

      const data = await response.json();
      setReportHtml(data.report_html);

      // Refresh valuation data
      const valResponse = await fetch(`${API}/valuations/${valuationId}`, {
        credentials: "include"
      });
      if (valResponse.ok) {
        setValuation(await valResponse.json());
      }

      toast.success("Reporte generado exitosamente");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Error al generar reporte");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = () => {
    // Create a blob from the HTML and trigger download
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    toast.info("Use 'Guardar como PDF' en el diálogo de impresión");
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reporte de Valuación - PropValu',
          text: 'Mira este reporte de valuación inmobiliaria',
          url: url
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles");
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
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando valuación...</p>
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
  const result = valuation.result;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="mb-2 text-[#1B4332] hover:bg-[#D9ED92]/30 -ml-4"
                data-testid="back-home-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-[#1B4332]" />
                <h1 className="font-['Outfit'] text-xl md:text-2xl font-bold text-[#1B4332]">
                  Reporte de Valuación
                </h1>
                {valuation.mode === "private" && (
                  <Badge className="bg-[#1B4332] text-white">Modo Valuador</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => generateReport(includeAnalysis)}
                disabled={isGenerating}
                className="border-[#1B4332] text-[#1B4332]"
                data-testid="regenerate-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="border-[#1B4332] text-[#1B4332]"
                data-testid="print-btn"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="bg-[#52B788] hover:bg-[#40916C] text-white"
                data-testid="download-pdf-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button
                variant="ghost"
                onClick={handleShare}
                className="text-[#1B4332]"
                data-testid="share-btn"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* PDF Options */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeAnalysis"
                checked={includeAnalysis}
                onCheckedChange={setIncludeAnalysis}
                className="border-[#1B4332] data-[state=checked]:bg-[#1B4332]"
              />
              <Label
                htmlFor="includeAnalysis"
                className="text-sm text-slate-600 cursor-pointer"
              >
                Incluir sección de Análisis IA en PDF
              </Label>
            </div>
            <span className="text-xs text-slate-400">
              (Regenera el reporte para aplicar cambios)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Summary Card */}
      {result && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
          <Card className="bg-gradient-to-br from-[#1B4332] to-[#081C15] border-0 text-white">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <p className="text-white/70 text-sm mb-1">Valor de Mercado Estimado</p>
                  <p className="text-3xl md:text-4xl font-bold font-['Outfit']">
                    {formatCurrency(result.estimated_value)}
                  </p>
                  <p className="text-white/70 text-sm mt-2">
                    Rango: {formatCurrency(result.value_range_min)} - {formatCurrency(result.value_range_max)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-1">Precio por m²</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(result.price_per_sqm)}/m²
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-1">Nivel de Confianza</p>
                  <Badge
                    className={`text-lg px-4 py-1 ${result.confidence_level === "ALTO"
                        ? "bg-[#D9ED92] text-[#1B4332]"
                        : result.confidence_level === "MEDIO"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                  >
                    {result.confidence_level}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isGenerating ? (
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-lg text-[#1B4332] font-medium">Generando reporte con IA...</p>
              <p className="text-slate-500 mt-2">Esto puede tomar unos segundos</p>
            </CardContent>
          </Card>
        ) : reportHtml ? (
          <div
            ref={reportRef}
            className="bg-white rounded-lg shadow-lg"
            dangerouslySetInnerHTML={{ __html: reportHtml }}
          />
        ) : (
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg text-slate-600">El reporte aún no ha sido generado</p>
              <Button
                onClick={generateReport}
                className="mt-4 bg-[#52B788] hover:bg-[#40916C] text-white"
                data-testid="generate-report-btn"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 no-print">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigate("/valuar")}
            className="border-[#1B4332] text-[#1B4332]"
            data-testid="new-valuation-btn"
          >
            Nueva Valuación
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadPDF}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
              data-testid="download-btn-footer"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
