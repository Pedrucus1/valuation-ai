import { useState, useEffect, useRef } from "react";
import { API } from "@/App";

// House ads backfill (mismo set que backend, para renderizado inmediato sin latencia)
const HOUSE_ADS = [
  { tag: "Consejo PropValu", title: "El valor lo define la oferta y la demanda", body: "No existe un precio único para una propiedad. El valor real es el que un comprador informado está dispuesto a pagar en el mercado actual.", type: "house" },
  { tag: "¿Sabías que?", title: "El predial puede engañarte", body: "Las medidas del predial a menudo no coinciden con las escrituras. Siempre usa la superficie real de construcción para una valuación más precisa.", type: "house" },
  { tag: "Dato de mercado", title: "La ubicación vale más que los metros", body: "Una propiedad 30% más pequeña en una zona premium puede superar en valor a una grande en zona periférica. La plusvalía de la colonia es clave.", type: "house" },
  { tag: "Consejo PropValu", title: "Negocia con datos, no con intuición", body: "Conocer el precio por m² de los comparables activos en la zona te da ventaja real en cualquier negociación.", type: "house" },
  { tag: "¿Sabías que?", title: "La antigüedad deprecia el valor físico", body: "Una construcción pierde en promedio 2% de valor físico por año. Las remodelaciones recientes son uno de los factores que más incrementan el avalúo.", type: "house" },
];

/**
 * AdSlot — Componente de anuncio con countdown opcional.
 *
 * Props:
 *  slot        "comparables" | "generation" | "download"
 *  countdown   segundos de countdown (0 = sin countdown). Default 0.
 *  onComplete  callback cuando el countdown llega a 0 (o inmediato si countdown=0)
 *  className   clases extra para el contenedor
 *  compact     boolean — versión compacta (banner inferior)
 */
const AdSlot = ({ slot, countdown = 0, onComplete, className = "", compact = false }) => {
  const [ad, setAd] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(countdown);
  const impressionSent = useRef(false);

  // Cargar anuncio del backend
  useEffect(() => {
    let cancelled = false;
    const fallback = HOUSE_ADS[Math.floor(Math.random() * HOUSE_ADS.length)];
    setAd(fallback); // mostrar inmediatamente con house ad
    fetch(`${API}/ads/slot/${slot}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setAd(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slot]);

  // Registrar impresión una sola vez
  useEffect(() => {
    if (!ad || impressionSent.current || !ad.id) return;
    impressionSent.current = true;
    fetch(`${API}/ads/${ad.id}/impression`, { method: "POST" }).catch(() => {});
  }, [ad]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onComplete?.();
      return;
    }
    setSecondsLeft(countdown);
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!ad) return null;

  // ── Versión compacta (banner inferior) ──────────────────────────────
  if (compact) {
    return (
      <div className={`bg-[#1B4332] text-white px-4 py-3 flex items-center gap-4 ${className}`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#D9ED92] uppercase tracking-wide mb-0.5">{ad.tag}</p>
          <p className="text-sm text-white/90 truncate">{ad.title}</p>
        </div>
        {countdown > 0 && (
          <div className="shrink-0 w-9 h-9 rounded-full border-2 border-[#52B788] flex items-center justify-center">
            <span className="text-sm font-bold text-[#D9ED92]">{secondsLeft}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Versión full (pantalla o card) ───────────────────────────────────
  return (
    <div className={`w-full max-w-lg mx-auto ${className}`}>
      {/* Etiqueta publicidad */}
      {ad.type === "paid" && (
        <p className="text-xs text-white/30 text-right mb-1 uppercase tracking-widest">Publicidad</p>
      )}

      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
        <p className="text-xs font-bold text-[#D9ED92] uppercase tracking-widest mb-2">{ad.tag}</p>
        <h2 className="font-['Outfit'] text-xl font-bold text-white mb-3 leading-snug">{ad.title}</h2>
        <p className="text-white/80 text-sm leading-relaxed">{ad.body}</p>

        {/* Media si tiene imagen/video */}
        {ad.media_url && (
          <div className="mt-4 rounded-xl overflow-hidden">
            <img src={ad.media_url} alt={ad.title} className="w-full h-32 object-cover" />
          </div>
        )}
      </div>

      {/* Countdown */}
      {countdown > 0 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#52B788" strokeWidth="2.5"
                strokeDasharray={`${(secondsLeft / countdown) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{secondsLeft}</span>
          </div>
          <p className="text-white/50 text-xs">segundos para continuar</p>
        </div>
      )}
    </div>
  );
};

export default AdSlot;
