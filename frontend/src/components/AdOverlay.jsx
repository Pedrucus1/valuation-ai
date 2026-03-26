import { useState, useEffect, useRef } from "react";
import { API } from "@/App";

/**
 * AdOverlay — Muestra un anuncio en pantalla completa con cuenta regresiva.
 *
 * Props:
 *   slot     — "slot1" | "slot2" | "slot3"
 *   zone     — municipio/zona del avalúo (ej. "Zapopan")
 *   onDone   — callback cuando termina el anuncio o no hay ad disponible
 */
const AdOverlay = ({ slot, zone = "", onDone }) => {
  const [ad, setAd] = useState(null);      // null = cargando, false = no hay ad
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/ads/active?slot=${slot}&zone=${encodeURIComponent(zone)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.ad) { onDone(); return; }
        setAd(data.ad);
        setSeconds(data.ad.duration);
      })
      .catch(() => { if (!cancelled) onDone(); });
    return () => { cancelled = true; };
  }, [slot, zone]);

  // Registrar impresión una sola vez
  useEffect(() => {
    if (ad && !trackedRef.current) {
      trackedRef.current = true;
      fetch(`${API}/ads/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_id: ad.ad_id, tipo: "impresion" }),
      }).catch(() => {});
    }
  }, [ad]);

  // Cuenta regresiva
  useEffect(() => {
    if (!ad) return;
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); onDone(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [ad]);

  // No hay ad → no renderizar nada (onDone ya fue llamado)
  if (ad === false || ad === null) return null;

  const handleClick = () => {
    if (!ad.link_url) return;
    fetch(`${API}/ads/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: ad.ad_id, tipo: "click" }),
    }).catch(() => {});
    const url = ad.link_type === "whatsapp"
      ? `https://wa.me/52${ad.link_url.replace(/\D/g, "")}`
      : ad.link_url;
    window.open(url, "_blank", "noopener");
  };

  const pct = ad ? Math.round((seconds / ad.duration) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
      {/* Contenido del anuncio */}
      <div
        className="relative w-full h-full cursor-pointer"
        onClick={handleClick}
      >
        {ad.file_type === "video" ? (
          <video
            src={ad.file_url}
            autoPlay
            muted={false}
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={ad.file_url}
            alt="Anuncio"
            className="w-full h-full object-contain"
          />
        )}

        {/* Overlay superior: empresa + cuenta regresiva */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-white/80 text-xs font-semibold tracking-wide">
            Publicidad · {ad.company_name}
          </span>
          <div className="flex items-center gap-3">
            {/* Barra de progreso */}
            <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-white text-sm font-bold tabular-nums w-5 text-right">
              {seconds}
            </span>
          </div>
        </div>

        {/* Botón CTA si hay enlace */}
        {ad.link_url && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <button
              onClick={handleClick}
              className="bg-white text-[#1B4332] font-bold text-sm px-6 py-2.5 rounded-full shadow-lg hover:bg-[#D9ED92] transition-colors"
            >
              {ad.link_type === "whatsapp" ? "💬 Contactar por WhatsApp" : "🌐 Visitar sitio"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdOverlay;
