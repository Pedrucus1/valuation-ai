import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft, Search, Download, FileX } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";
import { downloadReportPdf } from "@/lib/downloadReportPdf";

const RecuperarPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [items, setItems] = useState([]);
  const [descargandoId, setDescargandoId] = useState(null);

  const buscar = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Ingresa un correo válido");
      return;
    }
    setBuscando(true);
    setBuscado(false);
    try {
      const res = await fetch(`${API}/vault/recuperar?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error("No se pudo buscar. Intenta de nuevo.");
    } finally {
      setBuscando(false);
      setBuscado(true);
    }
  };

  const descargar = async (valuationId) => {
    setDescargandoId(valuationId);
    try {
      const res = await fetch(
        `${API}/vault/recuperar/${valuationId}?email=${encodeURIComponent(email.trim())}`
      );
      if (!res.ok) throw new Error("no encontrado");
      const data = await res.json();
      const fileName = data.report_html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "Reporte PropValu";
      const ok = await downloadReportPdf(data.report_html, fileName);
      if (ok) toast.success("Reporte descargado en PDF");
      else toast.error("No se pudo generar el PDF. Intenta de nuevo.");
    } catch {
      toast.error("No se pudo recuperar ese reporte.");
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf4] via-white to-[#F8F9FA]">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1B4332] mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <h1 className="font-['Outfit'] text-2xl font-extrabold text-[#1B4332] mb-1">
          Recuperar mi avalúo
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Ingresa el correo con el que guardaste tu respaldo.
        </p>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="tu@correo.com"
              type="email"
              className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300"
            />
            <Button
              onClick={buscar}
              disabled={buscando}
              className="bg-[#52B788] hover:bg-[#40916C] text-white font-semibold rounded-xl px-4"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {buscado && items.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <FileX className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No encontramos respaldos activos con ese correo.</p>
          </div>
        )}

        {items.map((it) => (
          <div key={it.valuation_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[#1B4332] text-sm truncate">
                {it.colonia || it.direccion || "Avalúo"}{it.municipio ? `, ${it.municipio}` : ""}
              </p>
              <p className="text-slate-400 text-xs">
                Vigente hasta {it.expira_en ? new Date(it.expira_en).toLocaleDateString("es-MX") : "—"}
              </p>
            </div>
            <Button
              onClick={() => descargar(it.valuation_id)}
              disabled={descargandoId === it.valuation_id}
              variant="outline"
              className="shrink-0 border-[#1B4332] text-[#1B4332] hover:bg-[#f0faf4] gap-2"
            >
              <Download className="w-4 h-4" />
              {descargandoId === it.valuation_id ? "Generando…" : "Descargar"}
            </Button>
          </div>
        ))}
      </main>
    </div>
  );
};

export default RecuperarPage;
