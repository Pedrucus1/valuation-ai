import { useState, useEffect, useRef } from "react";
import { API } from "@/App";

/**
 * AdOverlay — Anuncio a pantalla completa con cuenta regresiva.
 *
 * Regla (excluyente, nunca ambos, nunca vacío):
 *  - Si hay campaña PAGADA para el slot → se muestra (video 1 sola vez, SIN loop; o imagen).
 *  - Si el video termina antes de acabar el tiempo → se rellena con un texto "casa".
 *  - Si NO hay campaña pagada → se muestra un texto "casa" durante el tiempo del slot.
 *
 * Props: slot ("slot1"|"slot2"|"slot3"), zone (municipio), onDone (al terminar).
 */
const SLOT_DURATION = { slot1: 60, slot2: 30, slot3: 15 };

// Textos "casa" (fallback sin campaña pagada / relleno cuando el video acaba antes).
const HOUSE_ADS = [
  { tag: "Consejo PropValu", title: "Negocia con datos reales", body: "Conocer el precio por m² de comparables activos en la zona te da ventaja real en cualquier negociación." },
  { tag: "¿Sabías que?", title: "La ubicación vale más que los metros", body: "Una propiedad 30% más pequeña en zona premium puede superar en valor a una grande en periferia. La plusvalía de la colonia es clave." },
  { tag: "Dato de mercado", title: "El cap rate revela la rentabilidad real", body: "Un cap rate del 5-7% anual es saludable en México. Menos del 4% suele indicar sobrevaloración para inversión de renta." },
  { tag: "Consejo PropValu", title: "5 comparables bien elegidos valen más que 20 mal filtrados", body: "Misma zona, mismo tipo, m² similares. La homologación precisa hace la diferencia en el avalúo final." },
  { tag: "¿Sabías que?", title: "Las fotos profesionales venden 3x más rápido", body: "Las propiedades con fotografía de calidad reciben hasta 3 veces más contactos en portales." },
];

const AdOverlay = ({ slot, zone = "", onDone }) => {
  const [ad, setAd] = useState(null);          // null=cargando, false=sin campaña (usar casa), obj=pagada
  const [seconds, setSeconds] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const timerRef = useRef(null);
  const trackedRef = useRef(false);
  const doneRef = useRef(false);
  const houseRef = useRef(HOUSE_ADS[Math.floor(Math.random() * HOUSE_ADS.length)]);

  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone?.(); } };

  // Resolver campaña pagada (o marcar false = usar texto casa)
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/ads/active?slot=${slot}&zone=${encodeURIComponent(zone)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setAd(data.ad || false); })
      .catch(() => { if (!cancelled) setAd(false); });
    return () => { cancelled = true; };
  }, [slot, zone]);

  // Cuenta regresiva: arranca cuando ya se resolvió el ad (pagado o casa).
  useEffect(() => {
    if (ad === null) return;
    const dur = (ad && ad.duration) || SLOT_DURATION[slot] || 30;
    setSeconds(dur);
    timerRef.current = setInterval(() => {
      setSeconds((s) => { if (s <= 1) { clearInterval(timerRef.current); finish(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad]);

  // Registrar impresión una vez (solo pagada)
  useEffect(() => {
    if (ad && !trackedRef.current) {
      trackedRef.current = true;
      fetch(`${API}/ads/track`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_id: ad.ad_id, tipo: "impresion" }),
      }).catch(() => {});
    }
  }, [ad]);

  if (ad === null) return null; // brevísima carga, no parpadear

  const handleClick = () => {
    if (!ad || !ad.link_url) return;
    fetch(`${API}/ads/track`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: ad.ad_id, tipo: "click" }),
    }).catch(() => {});
    const url = ad.link_type === "whatsapp"
      ? `https://wa.me/52${ad.link_url.replace(/\D/g, "")}`
      : ad.link_url;
    window.open(url, "_blank", "noopener");
  };

  // ¿Mostrar texto casa? Sin campaña pagada, o el video pagado ya terminó antes de tiempo.
  const showHouse = !ad || (ad.file_type === "video" && videoEnded);
  const totalDur = (ad && ad.duration) || SLOT_DURATION[slot] || 30;
  const pct = Math.round((seconds / totalDur) * 100);
  // Creativos subidos viven en el backend (/uploads/...); un src relativo resolvería contra
  // el frontend → 404 (video negro). Prefijar sólo esos; URLs absolutas quedan igual.
  const adSrc = ad && (String(ad.file_url || "").startsWith("/uploads")
    ? `${API.replace("/api", "")}${ad.file_url}`
    : ad.file_url);

  return (
    // Popup centrado (consistente con el del análisis), NO pantalla completa.
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      {showHouse ? (
        // Texto casa: tarjeta verde de marca (excluyente con el video/imagen)
        <div className="relative bg-[#1B4332] rounded-2xl shadow-2xl border border-white/15 w-full max-w-lg p-8 text-center">
          <span className="absolute top-3 left-4 text-white/60 text-[11px] font-semibold">Publicidad · PropValu</span>
          <span className="absolute top-3 right-4 text-white text-sm font-bold tabular-nums">{seconds}</span>
          <div className="mt-4">
            <p className="text-[11px] font-bold text-[#D9ED92] uppercase tracking-widest mb-3">{houseRef.current.tag}</p>
            <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug">{houseRef.current.title}</h2>
            <p className="text-white/80 text-base leading-relaxed">{houseRef.current.body}</p>
          </div>
          <div className="mt-6 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#52B788] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        // Media: la tarjeta se ajusta al formato (horizontal o vertical) vía max-h/max-w.
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black" onClick={handleClick}>
          {ad.file_type === "video" ? (
            <video
              src={adSrc}
              autoPlay
              muted={false}
              playsInline
              onEnded={() => setVideoEnded(true)}
              className="block max-h-[86vh] max-w-[92vw] object-contain cursor-pointer"
            />
          ) : (
            <img src={adSrc} alt="Anuncio" className="block max-h-[86vh] max-w-[92vw] object-contain cursor-pointer" />
          )}

          {/* Overlay superior: etiqueta + cuenta regresiva */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/60 to-transparent">
            <span className="text-white/80 text-xs font-semibold tracking-wide">Publicidad · {ad.company_name || ""}</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-white text-sm font-bold tabular-nums w-5 text-right">{seconds}</span>
            </div>
          </div>

          {/* CTA solo para pagada con enlace */}
          {ad.link_url && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
              <button onClick={handleClick}
                className="bg-white text-[#1B4332] font-bold text-sm px-6 py-2.5 rounded-full shadow-lg hover:bg-[#D9ED92] transition-colors whitespace-nowrap">
                {ad.link_type === "whatsapp" ? "💬 Contactar por WhatsApp" : "🌐 Visitar sitio"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdOverlay;
