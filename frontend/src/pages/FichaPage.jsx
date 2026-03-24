import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowLeft, Download, RefreshCw, Image } from "lucide-react";
import { API } from "@/App";

const PRICE_OPTIONS = [
  { value: "min", label: "Precio Mínimo", desc: "Venta rápida / cierre seguro", color: "bg-amber-50 border-amber-300 text-amber-800" },
  { value: "mid", label: "Precio Justo de Mercado", desc: "Recomendado — valor equilibrado", color: "bg-[#f0faf4] border-[#52B788] text-[#1B4332]" },
  { value: "max", label: "Precio Máximo", desc: "Margen para negociación", color: "bg-blue-50 border-blue-300 text-blue-800" },
];

const FichaPage = () => {
  const { valuationId } = useParams();
  const navigate = useNavigate();
  const [valuation, setValuation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fichaHtml, setFichaHtml] = useState(null);

  // Form state
  const [pricePoint, setPricePoint] = useState("mid");
  const [broker, setBroker] = useState({
    name: "",
    agency: "",
    phone: "",
    email: "",
    social: "",
    logo_url: "",
    photo_url: "",
  });

  useEffect(() => {
    fetch(`${API}/valuations/${valuationId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setValuation(data);
        if (data.ficha_html) setFichaHtml(data.ficha_html);
      })
      .catch(() => { toast.error("No se encontró la valuación"); navigate("/dashboard"); })
      .finally(() => setIsLoading(false));
  }, [valuationId]);

  const handleGenerate = async () => {
    if (!valuation?.result) {
      toast.error("Primero debes generar el reporte de la valuación");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`${API}/valuations/${valuationId}/generate-ficha`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_point: pricePoint, broker }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al generar ficha");
      }
      const data = await res.json();
      setFichaHtml(data.ficha_html);
      toast.success("¡Ficha generada!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!fichaHtml) return;
    const w = window.open("", "_blank");
    w.document.write(fichaHtml);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
    toast.info("Usa 'Guardar como PDF' en el diálogo de impresión");
  };

  const fmt = (v) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="spinner"></div>
      </div>
    );
  }

  const result = valuation?.result;
  const prop = valuation?.property_data;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-[#1B4332] -ml-3 mb-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Image className="w-6 h-6 text-[#1B4332]" />
              <h1 className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Ficha Comercial</h1>
            </div>
          </div>
          {fichaHtml && (
            <Button onClick={handleDownload} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2">
              <Download className="w-4 h-4" /> Descargar PDF
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: configuración */}
        <div className="flex flex-col gap-5">

          {/* Resumen de la propiedad */}
          {prop && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Propiedad</p>
                <p className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
                  {prop.property_type} en {prop.neighborhood}
                </p>
                <p className="text-sm text-slate-500">{prop.municipality}, {prop.state}</p>
                {result && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Mínimo</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(result.value_range_min)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Justo</p>
                      <p className="text-sm font-bold text-[#1B4332]">{fmt(result.estimated_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Máximo</p>
                      <p className="text-sm font-bold text-slate-700">{fmt(result.value_range_max)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Punto de precio */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Precio en la ficha</p>
              <div className="flex flex-col gap-2">
                {PRICE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPricePoint(opt.value)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                      pricePoint === opt.value ? opt.color + " border-2 ring-2 ring-offset-1 ring-[#52B788]" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-semibold text-sm">{opt.label}</span>
                    {result && (
                      <span className="ml-2 font-bold">
                        {fmt(opt.value === "min" ? result.value_range_min : opt.value === "max" ? result.value_range_max : result.estimated_value)}
                      </span>
                    )}
                    <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Datos del broker */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Información del Broker</p>
              <div className="flex flex-col gap-3">
                {[
                  { key: "name", label: "Nombre del agente", placeholder: "Ej. María González" },
                  { key: "agency", label: "Nombre de la agencia", placeholder: "Ej. Century 21 / ERA / etc." },
                  { key: "phone", label: "Teléfono", placeholder: "Ej. +52 55 1234 5678" },
                  { key: "email", label: "Correo electrónico", placeholder: "agente@inmobiliaria.com" },
                  { key: "social", label: "Redes sociales", placeholder: "@usuario en Instagram/FB" },
                  { key: "photo_url", label: "URL foto del broker (opcional)", placeholder: "https://..." },
                  { key: "logo_url", label: "URL logo de la agencia (opcional)", placeholder: "https://..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                    <input
                      value={broker[key]}
                      onChange={e => setBroker(b => ({ ...b, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !result}
            className="w-full bg-[#52B788] hover:bg-[#40916C] text-white font-semibold py-5 text-base gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generando ficha..." : fichaHtml ? "Regenerar Ficha" : "Generar Ficha Comercial"}
          </Button>

          {!result && (
            <p className="text-xs text-amber-600 text-center -mt-2">
              ⚠️ Primero debes generar el reporte de valuación desde la página de reporte.
            </p>
          )}
        </div>

        {/* Panel derecho: preview */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vista Previa</p>
          {fichaHtml ? (
            <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-white">
              <iframe
                srcDoc={fichaHtml}
                title="Vista previa ficha"
                className="w-full"
                style={{ height: "800px", border: "none" }}
              />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center" style={{ height: "400px" }}>
              <Image className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm text-center px-6">
                Completa el formulario y haz clic en "Generar Ficha Comercial"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FichaPage;
