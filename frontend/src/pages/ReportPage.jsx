import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Share2,
  Building2,
  ArrowRight,
  Star
} from "lucide-react";
import { API } from "@/App";
import AdOverlay from "@/components/AdOverlay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ReportPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();

  // Review flow states
  const [appraiserRating, setAppraiserRating] = useState(0);
  const [appraiserComment, setAppraiserComment] = useState("");
  const [showPropValuModal, setShowPropValuModal] = useState(false);
  const [propValuRating, setPropValuRating] = useState(5);
  const [propValuComment, setPropValuComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [appraiserReviewDone, setAppraiserReviewDone] = useState(false);

  const allOptions = [
    "La información es valiosísima. De no haber tenido este avalúo exacto, seguramente habría perdido muchísimo dinero al malbaratar mi casa.",
    "Me ahorró semanas de investigación y el estrés enorme de no saber si estaba tomando una buena decisión financiera.",
    "Increíble la precisión del reporte, me dio la tranquilidad absoluta para sentarme a negociar el precio correcto sin dudar.",
    "Una herramienta indispensable. Pude tomar una decisión de compra importantísima con total seguridad y respaldo.",
    "El nivel de detalle es asombroso. Siento que por fin tengo el control total sobre lo que vale mi patrimonio.",
    "Valió cada centavo pagado. Este reporte literalmente me protegió de cometer un error que me hubiera costado muy caro.",
    "Me sorprendió muchísimo lo rápido y fácil que fue obtener información tan profesional, limpia y 100% confiable.",
    "Gracias a este avalúo, logré vender mi propiedad a un precio súper justo, muy rápido y sin complicaciones.",
    "Me dio una perspectiva clara y súper objetiva del mercado actual. Fue una excelente inversión para mi tranquilidad mental.",
    "Nunca imaginé que un proceso tan complejo y aburrido como valuar una casa pudiera resolverse de forma tan sencilla y moderna.",
    "La mejor herramienta para cualquier decisión inmobiliaria. Te entregan información de primera calidad al instante.",
    "Me siento muchísimo más seguro al momento de dar el anticipo para comprar, sabiendo que el precio está avalado por datos duros.",
    "Un auténtico salvavidas financiero. El reporte me mostró detalles de la zona que ni siquiera había considerado y subieron el valor.",
    "Eficiencia y exactitud en su máxima expresión. La plataforma me ahorró muchísimos dolores de cabeza e incertidumbre.",
    "Tener este nivel de certeza no tiene precio. Totalmente recomendado para cualquier persona que quiera evitar riesgos al vender.",
    "Súper transparentes con todo el proceso. Pude demostrarle al comprador por qué mi casa vale lo que pido.",
    "Me sacaron de un apuro rapidísimo. Urgía saber el valor comercial para un trámite y el sistema me lo dio en minutos.",
    "Me encantó la atención y el formato del PDF. 10/10, se ve súper profesional cuando lo mandas por WhatsApp.",
    "Si estás dudando en usarlo, hazlo. Me ahorré muchísimo dinero de pérdida por no saber en cuánto andaba la zona realmente.",
    "Fácil de usar, sin rollos técnicos. Me entregaron el reporte clarísimo y entendí perfecto de dónde salió el precio.",
    "Increíble lo potente que es esta Inteligencia Artificial. Me analizó cosas del entorno que un valuador tradicional jamás vio.",
    "Completamente satisfecho con el resultado. Me dio muchísima seguridad para no regalar mi propiedad.",
    "Recomendadísimo. Si vas a comprar casa, saca este avalúo primero para que no te vayan a ver la cara con el precio.",
    "Excelente plataforma. Te ahorra la burocracia de ir a contratar a alguien físico y esperar semanas por un papel.",
    "Los datos de plusvalía y servicios de la colonia están súper acertados. Definitivamente una inversión inteligentísima.",
    "La interfaz es amigable y te guía paso a paso. No necesitas ser un genio de las finanzas para sacar un avalúo profesional.",
    "Me encantó que pude descargar mi reporte en PDF y mandárselo a mi cliente al instante. Cero fricción, muy buen servicio.",
    "Superó mis expectativas. Pensé que sería algo muy básico por ser tan rápido, pero la cantidad de datos es nivel experto.",
    "Definitivamente la mejor opción costo-beneficio del mercado. Evitas fraudes, ahorras tiempo y ganas muchísima tranquilidad.",
    "Lo usé para calcular el valor de una propiedad y el margen de error fue nulo cuando lo comparé. Súper confiable."
  ];

  const [randomOptions, setRandomOptions] = useState([]);

  useEffect(() => {
    if (showPropValuModal && randomOptions.length === 0) {
      const shuffled = [...allOptions].sort(() => 0.5 - Math.random());
      setRandomOptions(shuffled.slice(0, 3));
    }
  }, [showPropValuModal]);

  const submitAppraiserReview = async () => {
    if (!appraiserRating) {
      toast.error("Por favor, selecciona una calificación (estrellas)");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await fetch(`${API}/reviews/appraiser`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         credentials: "include",
         body: JSON.stringify({
           valuador_id: valuation?.user_id || "unknown",
           valuation_id: valuationId,
           rating: appraiserRating,
           comment: appraiserComment
         })
      });
      setAppraiserReviewDone(true);
      toast.success("¡Gracias por tu calificación!");
    } catch (error) {
      toast.error("Error al enviar calificación");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const submitPropValuReview = async () => {
    setIsSubmittingReview(true);
    try {
      await fetch(`${API}/reviews/platform`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         credentials: "include",
         body: JSON.stringify({
           rating: propValuRating,
           comment: propValuComment
         })
      });
      setShowPropValuModal(false);
      toast.success("¡Gracias por ayudarnos a mejorar!");
    } catch (error) {
      toast.error("Error al enviar reseña de plataforma");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [valuation, setValuation] = useState(null);
  const [reportHtml, setReportHtml] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [showSlot2Ad, setShowSlot2Ad] = useState(false);
  const [slot2AdDone, setSlot2AdDone] = useState(false);
  const [showSlot3Ad, setShowSlot3Ad] = useState(false);

  // Cerrar slot2 solo cuando AMBOS terminaron: countdown del ad Y generación IA
  useEffect(() => {
    if (slot2AdDone && !isGenerating) {
      setShowSlot2Ad(false);
      setSlot2AdDone(false);
    }
  }, [slot2AdDone, isGenerating]);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchValuation();
  }, [valuationId]);

  const checkAndShowReviewModal = async () => {
    if (sessionStorage.getItem(`propvalu_review_seen_${valuationId}`)) return;
    sessionStorage.setItem(`propvalu_review_seen_${valuationId}`, "true");

    try {
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (!res.ok) {
        setShowPropValuModal(true);
        return;
      }
      const user = await res.json();
      const role = (user.role || user.tipo || "").toLowerCase();
      if (role === 'valuador' || role === 'inmobiliaria') {
        const count = user.count || user.valuations_count || user.evaluations_count || user.total_valuations || user.reportes_generados || 0;
        if (count > 0 && count % 10 === 0) {
          setShowPropValuModal(true);
        }
      } else {
        setShowPropValuModal(true);
      }
    } catch {
      setShowPropValuModal(true);
    }
  };

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
        // If already generated, we wait a bit and show modal if applicable
        setTimeout(checkAndShowReviewModal, 3000);
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
    // Show slot2 ad "durante la generación con IA" (only for non-private mode)
    if (valuation?.mode !== "private") setShowSlot2Ad(true);
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
      
      // Delay slightly before showing the review modal
      setTimeout(checkAndShowReviewModal, 2000);
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
    if (valuation?.mode !== "private") {
      // Show slot3 ad "antes de la descarga" for public/realtor users
      setShowSlot3Ad(true);
    } else {
      navigate(`/gracias/${valuationId}`, { state: { reportHtml } });
    }
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-200">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="col-span-2">
                  <p className="text-white/70 text-sm mb-1">Valor de Mercado Estimado</p>
                  <p className="text-2xl md:text-4xl font-bold font-['Outfit']">
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
          <div className="rounded-lg shadow-lg overflow-hidden rpt-wrap">
            <style>{`
              @media (max-width: 640px) {
                .rpt-wrap .page {
                  padding: 10px 10px 50px !important;
                  margin: 0 !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                /* Colapsar todos los grids inline a 1 columna */
                .rpt-wrap div[style*="grid-template-columns"]:not([style*="80px 1.5fr"]) {
                  grid-template-columns: 1fr !important;
                }
                /* Valor Físico: 2 columnas iguales */
                .rpt-wrap div[style*="80px 1.5fr"] {
                  grid-template-columns: 1fr 1fr !important;
                  align-items: start !important;
                  gap: 8px !important;
                }
                .rpt-wrap div[style*="80px 1.5fr"] > *:nth-child(1) {
                  display: flex !important;
                  justify-content: center !important;
                }
                .rpt-wrap div[style*="80px 1.5fr"] > *:nth-child(3) {
                  border-left: none !important;
                  border-right: none !important;
                }
                .rpt-wrap div[style*="80px 1.5fr"] > *:nth-child(4) {
                  text-align: left !important;
                }
                /* Clases CSS del reporte */
                .rpt-wrap .summary-cards-4 {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
                .rpt-wrap .info-grid-3 {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
                .rpt-wrap .data-grid-2,
                .rpt-wrap .value-grid-3,
                .rpt-wrap .services-grid-2,
                .rpt-wrap .tips-grid {
                  grid-template-columns: 1fr !important;
                }
                /* Texto: evitar corte de palabras en todas las celdas */
                .rpt-wrap span, .rpt-wrap div {
                  word-break: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                }
                /* Excepción: tabla comparables (sí necesita scroll) */
                .rpt-wrap .comparables-table {
                  display: block !important;
                  overflow-x: auto !important;
                  white-space: nowrap !important;
                }
                .rpt-wrap .comparables-table td,
                .rpt-wrap .comparables-table th {
                  white-space: nowrap !important;
                }
                /* Footer fuera del flujo absoluto */
                .rpt-wrap .footer-report {
                  position: relative !important;
                  bottom: auto !important;
                  left: auto !important;
                  right: auto !important;
                  margin-top: 20px;
                }
              }
            `}</style>
            <div
              ref={reportRef}
              className="bg-white"
              dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          </div>
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

      {/* CTA — directorio de inmobiliarias */}
      {result && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 no-print">
          <div className="rounded-xl border border-[#B7E4C7] bg-[#F0FDF4] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D9ED92] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <p className="font-semibold text-[#1B4332] text-sm">¿Quieres comprar, vender o rentar esta propiedad?</p>
                <p className="text-slate-600 text-xs mt-0.5">Encuentra inmobiliarias verificadas en tu zona que pueden acompañarte en el proceso.</p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/inmobiliarias")}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm shrink-0"
            >
              Ver directorio
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* CTA — calificar valuador */}
      {result && valuation?.mode === "private" && !appraiserReviewDone && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 no-print">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 text-sm">Califica el servicio de tu valuador</p>
                  <p className="text-amber-700 text-xs mt-0.5">Tu opinión ayuda a mantener la calidad de nuestra red.</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setAppraiserRating(star)}
                    className={`p-1 rounded-full transition-colors ${appraiserRating >= star ? "text-amber-500" : "text-amber-200 hover:text-amber-300"}`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            
            {appraiserRating > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-top-2">
                <Textarea 
                  placeholder="Escribe un breve comentario sobre el valuador (opcional)"
                  value={appraiserComment}
                  onChange={(e) => setAppraiserComment(e.target.value)}
                  className="bg-white border-amber-200 text-sm min-h-[80px]"
                />
                <Button
                  onClick={submitAppraiserReview}
                  disabled={isSubmittingReview}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isSubmittingReview ? "Enviando..." : "Enviar Calificación"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PropValu Review Modal */}
      <Dialog open={showPropValuModal} onOpenChange={setShowPropValuModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#1B4332] text-xl font-bold font-['Outfit'] flex items-center justify-center gap-2">
              <Star className="w-6 h-6 text-[#52B788] fill-current" />
              ¡Gracias por tu reseña!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600">
              Nos alegra que hayas tenido una gran experiencia. ¿Nos ayudarías calificando a PropValu?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setPropValuRating(star)}
                  className={`p-1 rounded-full transition-colors ${propValuRating >= star ? "text-[#52B788]" : "text-slate-200"}`}
                >
                  <Star className="w-10 h-10 fill-current" />
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Comentario rápido:</label>
              <div className="flex flex-col gap-2">
                {randomOptions.map((opt, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-[#F0FDF4] hover:border-[#52B788] hover:text-[#1B4332] whitespace-normal text-left py-2 px-3"
                    onClick={() => setPropValuComment(opt)}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Textarea
              placeholder="O escribe tu propio comentario..."
              value={propValuComment}
              onChange={(e) => setPropValuComment(e.target.value)}
              className="resize-none"
            />
          </div>
          
          <DialogFooter className="sm:justify-stretch">
            <Button 
              type="button" 
              onClick={submitPropValuReview}
              disabled={isSubmittingReview || !propValuComment}
              className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
            >
              {isSubmittingReview ? "Enviando..." : "Publicar reseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot 2 — durante generación con IA */}
      {showSlot2Ad && (
        <AdOverlay
          slot="slot2"
          zone={property?.municipality || property?.city || ""}
          onDone={() => setSlot2AdDone(true)}
        />
      )}

      {/* Slot 3 — antes de la descarga */}
      {showSlot3Ad && (
        <AdOverlay
          slot="slot3"
          zone={property?.municipality || property?.city || ""}
          onDone={() => {
            setShowSlot3Ad(false);
            navigate(`/gracias/${valuationId}`, { state: { reportHtml } });
          }}
        />
      )}

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 no-print">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
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
