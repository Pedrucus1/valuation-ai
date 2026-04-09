import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Star, ArrowRight, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";
import AdSlot from "@/components/AdSlot";

const RATING_LABELS = {
  1: "Muy malo",
  2: "Malo",
  3: "Regular",
  4: "Bueno",
  5: "¡Excelente!",
};

const ThankYouPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [reportHtml, setReportHtml] = useState(location.state?.reportHtml || null);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Slot de descarga: 10s de anuncio antes de habilitar el botón
  const [showDownloadAd, setShowDownloadAd] = useState(true);
  const [downloadReady, setDownloadReady] = useState(false);

  // Fetch report HTML if not passed via navigation state
  useEffect(() => {
    if (reportHtml || !valuationId) return;
    fetch(`${API}/valuations/${valuationId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setReportHtml(data.report_html || null))
      .catch(() => {});
  }, [valuationId]);

  const handleDownload = () => {
    if (!reportHtml) {
      toast.error("El reporte no está disponible. Regresa a verlo primero.");
      return;
    }
    const printWindow = window.open("", "_blank");
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
    toast.info("Usa 'Guardar como PDF' en el diálogo de impresión");
  };

  const handleSubmit = async () => {
    if (selected === 0) {
      toast.error("Selecciona una calificación");
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch(`${API}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valuation_id: valuationId,
          stars: selected,
          comment: comment.trim() || null,
          author: name.trim() || "Usuario verificado",
        }),
      });
    } catch {
      const existing = JSON.parse(localStorage.getItem("propvalu_ratings") || "[]");
      existing.push({
        stars: selected,
        comment: comment.trim() || null,
        author: name.trim() || "Usuario verificado",
        date: new Date().toISOString(),
      });
      localStorage.setItem("propvalu_ratings", JSON.stringify(existing));
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/comprar`;
    const text = "Conoce el valor real de tu propiedad con PropValu — análisis con IA en minutos.";
    if (navigator.share) {
      await navigator.share({ title: "PropValu", text, url });
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  const activeStars = hovered || selected;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf4] via-white to-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {/* Hero celebration */}
        <div className="text-center mb-8">
          {/* Animated badge */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#D9ED92] to-[#52B788] shadow-lg mb-5 animate-bounce-once">
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <circle cx="24" cy="24" r="22" fill="#1B4332" />
              <path d="M13 25l8 8 14-16" stroke="#D9ED92" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-['Outfit'] text-3xl font-extrabold text-[#1B4332] mb-2">
            ¡Tu reporte está listo!
          </h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            El avalúo fue generado con éxito. Descárgalo cuando quieras.
          </p>
        </div>

        {/* Slot de descarga: 10s de anuncio antes de habilitar el botón */}
        {showDownloadAd ? (
          <div className="bg-gradient-to-br from-[#1B4332] to-[#081C15] rounded-2xl p-6 mb-6 text-white shadow-xl">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-4 text-center">
              Tu reporte estará listo en un momento
            </p>
            <AdSlot
              slot="download"
              countdown={10}
              onComplete={() => { setShowDownloadAd(false); setDownloadReady(true); }}
              className="mb-0"
            />
          </div>
        ) : (
          /* Download card */
          <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 mb-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#D9ED92]" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">Reporte de Valuación</p>
                <p className="text-white/60 text-xs">Metodología CNBV / SHF / INDAABIN · PDF</p>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              className="w-full bg-[#D9ED92] text-[#1B4332] hover:bg-[#c8e070] font-bold text-base py-5 rounded-xl gap-2"
              disabled={!reportHtml}
            >
              <Download className="w-5 h-5" />
              {reportHtml ? "Descargar PDF" : "Cargando reporte…"}
            </Button>
            <p className="text-white/40 text-xs text-center mt-3">
              Estimación realizada con inteligencia de PropValu
            </p>
          </div>
        )}

        {/* Rating card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          {!submitted ? (
            <>
              <div className="text-center mb-5">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-1">
                  ¿Cómo fue tu experiencia?
                </h2>
                <p className="text-xs text-slate-400">
                  Tu opinión nos ayuda a mejorar
                </p>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(n)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 transition-all ${
                        n <= activeStars
                          ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="h-6 flex items-center justify-center mb-4">
                {activeStars > 0 && (
                  <p className="text-sm font-semibold text-[#1B4332]">
                    {RATING_LABELS[activeStars]}
                  </p>
                )}
              </div>

              {/* Name */}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                maxLength={60}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300 mb-3"
              />

              {/* Comment */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos tu experiencia (opcional)…"
                rows={3}
                maxLength={300}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300 mb-4"
              />

              <Button
                onClick={handleSubmit}
                disabled={selected === 0 || isSubmitting}
                className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-semibold rounded-xl"
              >
                {isSubmitting ? "Enviando…" : "Enviar calificación"}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-8 h-8 ${
                      n <= selected
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <p className="font-bold text-[#1B4332] text-lg mb-1">
                ¡Gracias{name ? `, ${name.split(" ")[0]}` : ""}!
              </p>
              <p className="text-xs text-slate-500">
                Tu opinión puede aparecer en nuestra página principal.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/comprar")}
            variant="outline"
            className="flex-1 border-[#1B4332] text-[#1B4332] hover:bg-[#f0faf4] gap-2 font-semibold"
          >
            Nueva valuación
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartir PropValu
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ThankYouPage;
