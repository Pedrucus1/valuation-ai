import { useState, useEffect, useRef } from "react";
import { ExternalLink, MessageCircle, Clock } from "lucide-react";

/* ─── Duración por slot ─────────────────────────────── */
const SLOT_DURATION = { slot1: 60, slot2: 30, slot3: 15 };

/* ─── House ads (fallback si no hay campaña pagada) ─── */
const HOUSE_ADS = [
  {
    tag: "Consejo PropValu",
    title: "Negocia con datos reales",
    body: "Conocer el precio por m² de comparables activos en la zona te da ventaja real en cualquier negociación, ya seas comprador o vendedor.",
    bg: "from-[#1B4332] to-[#2D6A4F]",
    link_type: null,
    link_url: null,
    company: null,
  },
  {
    tag: "¿Sabías que?",
    title: "La ubicación vale más que los metros",
    body: "Una propiedad 30% más pequeña en zona premium puede superar en valor a una grande en zona periférica. La plusvalía de la colonia es clave.",
    bg: "from-[#2D6A4F] to-[#40916C]",
    link_type: null,
    link_url: null,
    company: null,
  },
  {
    tag: "PropValu Pro",
    title: "Valuaciones certificadas para tu inmobiliaria",
    body: "Planes mensuales con créditos ilimitados, reportes en PDF y soporte de valuadores certificados. Ideal para equipos de asesores.",
    bg: "from-[#40916C] to-[#1B4332]",
    link_type: "web",
    link_url: "/para-inmobiliarias",
    company: "PropValu",
  },
  {
    tag: "Dato de mercado",
    title: "El cap rate revela la rentabilidad real",
    body: "Un cap rate del 5-7% anual es saludable en México. Propiedades con cap rate menor al 4% suelen estar sobrevaloradas para inversión de renta.",
    bg: "from-[#1B4332] to-[#52B788]",
    link_type: null,
    link_url: null,
    company: null,
  },
  {
    tag: "Consejo PropValu",
    title: "5 comparables bien elegidos valen más que 20 mal filtrados",
    body: "Misma zona, mismo tipo de inmueble, m² similares. La homologación precisa hace la diferencia en el avalúo final.",
    bg: "from-[#2D6A4F] to-[#1B4332]",
    link_type: null,
    link_url: null,
    company: null,
  },
  {
    tag: "¿Sabías que?",
    title: "Las fotos profesionales venden 3x más rápido",
    body: "Las propiedades con fotografías de calidad reciben hasta 3 veces más contactos en portales. La primera impresión es siempre digital.",
    bg: "from-[#1B4332] to-[#2D6A4F]",
    link_type: null,
    link_url: null,
    company: null,
  },
];

/* ─── Helper: construir URL del enlace ──────────────── */
const buildUrl = (link_type, link_url) => {
  if (!link_url) return null;
  if (link_type === "whatsapp") {
    const num = link_url.replace(/\D/g, "");
    return `https://wa.me/${num.startsWith("52") ? num : "52" + num}`;
  }
  return link_url; // web
};

/* ─── Componente ────────────────────────────────────── */
const AdRenderer = ({ slot = "slot1", zone = "", onComplete }) => {
  const [ad, setAd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const houseAdRef = useRef(null);

  /* Resolver qué ad mostrar */
  useEffect(() => {
    const duration = SLOT_DURATION[slot] || 30;
    setTimeLeft(duration);

    let resolved = null;

    try {
      const raw = localStorage.getItem("advertiser_campaigns");
      const campaigns = raw ? JSON.parse(raw) : [];
      const active = campaigns.filter(
        (c) => c.slot === slot && c.status === "active" && c.link_url
      );

      // Preferir campaña que coincida con la zona del inmueble
      const zoneMatch = active.find(
        (c) =>
          zone &&
          c.zone &&
          zone.toLowerCase().includes(c.zone.toLowerCase())
      );
      const picked = zoneMatch || active[0] || null;

      if (picked) {
        resolved = {
          isPaid: true,
          tag: "Publicidad",
          title: picked.name,
          body: `Campaña activa en ${picked.zone || "tu zona"}.`,
          bg: "from-[#1B4332] to-[#2D6A4F]",
          link_type: picked.link_type || "web",
          link_url: picked.link_url,
          company: picked.company_name || null,
        };
      }
    } catch {
      /* ignorar errores de parseo */
    }

    if (!resolved) {
      // House ad aleatorio (distinto en cada mount)
      if (!houseAdRef.current) {
        houseAdRef.current =
          HOUSE_ADS[Math.floor(Math.random() * HOUSE_ADS.length)];
      }
      resolved = { isPaid: false, ...houseAdRef.current };
    }

    setAd(resolved);

    // Iniciar countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDone(true);
          onComplete?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [slot, zone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClickAd = () => {
    if (!ad?.link_url) return;
    const url = buildUrl(ad.link_type, ad.link_url);
    if (!url) return;
    // Si es ruta interna (empieza con /)
    if (url.startsWith("/")) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const hasLink = !!(ad?.link_url);
  const isWhatsApp = ad?.link_type === "whatsapp";

  if (!ad || timeLeft === null) return null;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-br ${ad.bg} shadow-xl`}
    >
      {/* Contenido principal */}
      <div className="px-6 pt-6 pb-4">
        {/* Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
            {ad.tag}
          </span>
          {ad.isPaid && ad.company && (
            <span className="text-white/60 text-xs">
              por {ad.company}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="text-white font-['Outfit'] text-xl font-bold leading-snug mb-2">
          {ad.title}
        </h3>

        {/* Body */}
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          {ad.body}
        </p>

        {/* CTA — Haz click aquí */}
        {hasLink && (
          <button
            onClick={handleClickAd}
            className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all border border-white/30 hover:border-white/50 cursor-pointer"
          >
            {isWhatsApp ? (
              <MessageCircle className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Haz click aquí
          </button>
        )}
      </div>

      {/* Barra de progreso + countdown */}
      <div className="px-6 pb-5">
        <div className="flex items-center justify-between text-white/50 text-xs mb-1.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {done ? "Listo" : `Continúa en ${timeLeft}s`}
          </span>
          {!ad.isPaid && (
            <span className="text-white/40 text-[10px]">Casa PropValu</span>
          )}
        </div>
        {/* Barra */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${done ? 100 : (1 - timeLeft / (SLOT_DURATION[slot] || 30)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Botón de saltar (solo si ya terminó o hay link) */}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="text-white text-center">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm font-semibold">Continuando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdRenderer;
