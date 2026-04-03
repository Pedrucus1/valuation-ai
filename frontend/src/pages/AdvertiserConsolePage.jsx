import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, LogOut, BarChart3, Megaphone, Image, FileText,
  Plus, Upload, X, Eye, CheckCircle, Clock, AlertCircle,
  Trash2, Pencil, Download, ChevronDown, ChevronUp, Play, TrendingUp, Monitor, Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API } from "@/App";

/* ─── Advertiser API helper ──────────────────────────────── */
const advertiserFetch = async (path, options = {}) => {
  const session = JSON.parse(localStorage.getItem("advertiser_session") || "{}");
  const token = session.session_token || "";
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), "X-Advertiser-Token": token },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
};

/* ─── Imagen → WebP comprimido ──────────────────────────── */

// Límite del archivo original antes de comprimir (en MB)
const MAX_IMAGE_ORIGINAL_MB = 10;
// Ancho máximo de salida en px (mantiene proporción)
const MAX_IMAGE_PX = 1920;
// Calidad WebP (0–1)
const WEBP_QUALITY = 0.80;

// Lee orientación EXIF para corregir imágenes rotadas de celular
const getExifOrientation = (file) =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) return resolve(1);
      let offset = 2;
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(1);
          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112)
              return resolve(view.getUint16(offset + i * 12 + 8, little));
          }
        } else if ((marker & 0xFF00) !== 0xFF00) break;
        else offset += view.getUint16(offset, false);
      }
      resolve(1);
    };
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });

const compressToWebP = async (file) => {
  const orientation = await getExifOrientation(file);
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      // Rotar si EXIF indica orientación != 1
      const rotate = [5,6,7,8].includes(orientation);
      if (rotate) { [w, h] = [h, w]; }
      const scale = w > MAX_IMAGE_PX ? MAX_IMAGE_PX / w : 1;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.save();
      if (orientation === 6) { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
      else if (orientation === 8) { ctx.translate(0, h); ctx.rotate(-Math.PI / 2); }
      else if (orientation === 3) { ctx.translate(w, h); ctx.rotate(Math.PI); }
      else if (orientation === 5) { ctx.translate(w, 0); ctx.scale(-1, 1); ctx.rotate(Math.PI / 2); }
      else if (orientation === 7) { ctx.translate(0, h); ctx.scale(-1, 1); ctx.rotate(-Math.PI / 2); }
      else if (orientation === 2) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      else if (orientation === 4) { ctx.translate(0, h); ctx.scale(1, -1); }
      ctx.drawImage(img, 0, 0, rotate ? h / scale : w / scale, rotate ? w / scale : h / scale);
      ctx.restore();
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject("No se pudo comprimir la imagen"); return; }
          const outName = file.name.replace(/\.[^.]+$/, ".webp");
          resolve(new File([blob], outName, { type: "image/webp" }));
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject("No se pudo cargar la imagen"); };
    img.src = objectUrl;
  });
};

/* ─── Constants ─────────────────────────────────────────── */

const SLOT_SPECS = {
  slot1: {
    name: "Slot 1 — Página de Comparables",
    label: "Slot 1",
    tag: "Máxima exposición",
    where: "Página de Comparables · aparece mientras el sistema busca avalúos similares",
    desc: "Tu anuncio ocupa la pantalla completa mientras el sistema busca y analiza comparables del mercado. El usuario no puede avanzar — atención total garantizada.",
    maxSizeMB: 50,
    acceptVideo: true,
    accept: "image/jpeg,image/png,video/mp4",
    dims: "1920×1080 px",
    maxPhotos: 20,
  },
  slot2: {
    name: "Slot 2 — Generación con IA",
    label: "Slot 2",
    tag: "Alta atención",
    where: "Página de Reporte · aparece mientras la IA genera el avalúo",
    desc: "Tu anuncio se muestra mientras la inteligencia artificial redacta el reporte personalizado. El usuario está en espera activa, con la pantalla frente a él.",
    maxSizeMB: 20,
    acceptVideo: true,
    accept: "image/jpeg,image/png,video/mp4",
    dims: "1920×1080 px",
    maxPhotos: 10,
  },
  slot3: {
    name: "Slot 3 — Antes de la Descarga",
    label: "Slot 3",
    tag: "Entrada accesible",
    where: "Página de Reporte · aparece justo antes de descargar el PDF",
    desc: "Tu anuncio aparece en pantalla completa justo antes de que el usuario descargue su reporte de valuación. Momento de alto interés e intención inmobiliaria.",
    maxSizeMB: 10,
    acceptVideo: false,
    accept: "image/jpeg,image/png",
    dims: "1200×628 px",
    maxPhotos: 5,
  },
};

// Duraciones disponibles por slot y precio por impresión
const DURATION_OPTIONS = [
  { seconds: 15, label: "15 segundos", slots: ["slot1", "slot2", "slot3"] },
  { seconds: 30, label: "30 segundos", slots: ["slot1", "slot2"] },
  { seconds: 60, label: "60 segundos", slots: ["slot1"] },
];

const AD_PRICES = {
  slot1: { 15: 15, 30: 25, 60: 38 },
  slot2: { 15: 10, 30: 18 },
  slot3: { 15: 5 },
};

// Zonas estáticas para segmentación estatal/federal
const ESTATAL_ZONES  = ["Jalisco", "CDMX", "Nuevo León", "Puebla", "Querétaro", "Estado de México"];
const FEDERAL_ZONES  = ["Todo México"];
// Fallback municipal mientras carga el backend
const MUNICIPAL_FALLBACK = ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Tlajomulco", "El Salto", "Puerto Vallarta"];

const MOCK_CAMPAIGNS = [
  {
    id: "c1",
    name: "Primavera GDL 2026",
    slot: "slot1",
    targeting: "Municipal",
    zone: "Zapopan",
    status: "active",
    impressions: 312,
    spend: 9360,
    start: "2026-03-01",
    end: "2026-03-31",
  },
  {
    id: "c2",
    name: "Crédito Hipotecario Q1",
    slot: "slot3",
    targeting: "Estatal",
    zone: "Jalisco",
    status: "paused",
    impressions: 88,
    spend: 440,
    start: "2026-02-15",
    end: "2026-03-15",
  },
];

const MOCK_CREATIVES = [
  {
    id: "cr1",
    name: "banner_casas_v1.jpg",
    slot: "slot1",
    type: "image",
    status: "aprobado",
    sizeLabel: "2.3 MB",
    uploaded: "2026-03-05",
    preview: null,
    campaign: "Primavera GDL 2026",
  },
  {
    id: "cr2",
    name: "hipoteca_30s.mp4",
    slot: "slot2",
    type: "video",
    status: "pendiente_revision",
    sizeLabel: "18.7 MB",
    uploaded: "2026-03-18",
    preview: null,
    campaign: null,
  },
];

const MOCK_TRANSACTIONS = [
  { id: "t1", date: "2026-03-01", concept: "Campaña — Primavera GDL 2026 (Slot 1)", amount: 9360, status: "pagado" },
  { id: "t2", date: "2026-02-15", concept: "Campaña — Crédito Hipotecario Q1 (Slot 3)", amount: 440, status: "pagado" },
];

const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "campanas", label: "Campañas", icon: Megaphone },
  { id: "facturacion", label: "Facturación", icon: FileText },
];

// Contexto exacto que ve el usuario cuando aparece el anuncio
const SLOT_CONTEXT = {
  // Slot 1: ComparablesPage — pantalla de carga mientras busca comparables de mercado
  slot1: {
    countdown: 60,
    contextLabel: "Buscando comparables de mercado…",
    contextSub: "Analizando propiedades similares en la zona",
    urlPath: "comparables/val_abc123",
    spinner: true,
  },
  // Slot 2: ReportPage — overlay mientras la IA redacta el avalúo
  slot2: {
    countdown: 30,
    contextLabel: "Generando tu avalúo profesional…",
    contextSub: "Aplicando metodología de homologación INDAABIN",
    urlPath: "reporte/val_abc123",
    spinner: true,
  },
  // Slot 3: ReportPage — overlay antes de que el usuario descargue el PDF
  slot3: {
    countdown: 15,
    contextLabel: "¡Tu reporte está listo!",
    contextSub: "Podrás descargarlo al finalizar el contador",
    urlPath: "reporte/val_abc123",
    spinner: false,
  },
};

/* ─── Countdown ring ──────────────────────────────────── */
const CountdownRing = ({ total, current, size = 44, stroke = 3 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (current / total);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#D9ED92" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s linear" }} />
    </svg>
  );
};

/* ─── AdCardMock — carrusel de imágenes como se ve en pantalla ─── */
const AdCardMock = ({ images, slot, campaignName, adDuration }) => {
  const ctx = SLOT_CONTEXT[slot] || SLOT_CONTEXT.slot3;
  const total = adDuration ?? ctx.countdown;
  const secsPerImage = images.length > 1 ? Math.floor(total / images.length) : total;
  const [count, setCount] = useState(total);
  const [imgIdx, setImgIdx] = useState(0);
  const countRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    setCount(total);
    setImgIdx(0);
    clearInterval(countRef.current);
    clearInterval(imgRef.current);

    countRef.current = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(countRef.current); return 0; }
      return c - 1;
    }), 1000);

    if (images.length > 1) {
      imgRef.current = setInterval(() => {
        setImgIdx(i => (i + 1) % images.length);
      }, secsPerImage * 1000);
    }

    return () => { clearInterval(countRef.current); clearInterval(imgRef.current); };
  }, [slot, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = images[imgIdx];
  const src = current?.preview || (current?.file_url ? `${API.replace("/api","")}${current.file_url}` : null);

  return (
    <div className="bg-[#1B4332] rounded-2xl overflow-hidden w-full h-full flex flex-col shadow-xl">
      {/* Imagen 1:1 — flex-1 para ocupar espacio disponible */}
      <div className="relative flex-1 min-h-0">
        {src ? (
          (current?.file_type || current?.type) === "video"
            ? <video src={src} className="absolute inset-0 w-full h-full object-cover" muted autoPlay loop />
            : <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D6A4F]">
            <Image className="w-10 h-10 text-white/20" />
          </div>
        )}
        {/* Indicadores de imagen */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex gap-1 justify-center">
            {images.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
        {/* Label publicidad — esquina superior izquierda */}
        <span className="absolute top-2 left-2 text-[9px] font-bold text-white/70 bg-black/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
          Publicidad
        </span>
      </div>
      <p className="text-[10px] text-white/30 text-center py-1.5">
        Este espacio es un mensaje de nuestros anunciantes · {count}s restantes
      </p>
    </div>
  );
};

/* ─── Advertencia de formato por dispositivo ─────────────── */
const FormatWarning = () => (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-2">
    <p className="font-bold text-amber-900 flex items-center gap-1.5">
      ⚠️ Recomendaciones de formato
    </p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      <div>
        <p className="font-semibold text-amber-900">Imágenes</p>
        <p>Proporción cuadrada <strong>1:1</strong> recomendada.</p>
        <p>Las imágenes en 16:9 o retrato se recortarán en móvil.</p>
      </div>
      <div>
        <p className="font-semibold text-amber-900">Video</p>
        <p>Horizontal <strong>16:9</strong> para mejor visualización en desktop.</p>
        <p>Vertical 9:16 se ve mejor en móvil.</p>
      </div>
    </div>
    <div className="border-t border-amber-200 pt-2 grid grid-cols-2 gap-x-4">
      <div className="flex items-center gap-1.5">
        <span>📱</span>
        <span><strong>Móvil:</strong> el anuncio ocupa ~390 px de ancho</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>🖥️</span>
        <span><strong>Desktop:</strong> ancho completo de la pantalla</span>
      </div>
    </div>
  </div>
);

/* ─── Helpers ─────────────────────────────────────────── */

const statusBadge = (status) => {
  const map = {
    active: { label: "Activa", className: "bg-green-100 text-green-700" },
    paused: { label: "Pausada", className: "bg-amber-100 text-amber-700" },
    pending: { label: "En revisión", className: "bg-amber-100 text-amber-700" },
    rejected: { label: "Rechazada", className: "bg-red-100 text-red-700" },
    aprobado: { label: "Aprobada", className: "bg-green-100 text-green-700" },
    pendiente_revision: { label: "En revisión", className: "bg-amber-100 text-amber-700" },
    rechazado: { label: "Rechazada", className: "bg-red-100 text-red-700" },
    pagado: { label: "Pagado", className: "bg-green-100 text-green-700" },
  };
  const s = map[status] || { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
};

const formatMXN = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

/* ─── Component ─────────────────────────────────────────── */

const LS_CAMPAIGNS = "advertiser_campaigns";
const LS_CREATIVES = "advertiser_creatives";

const AdvertiserConsolePage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");

  // Zones from backend (ads_disponible: true)
  const [municipalZones, setMunicipalZones] = useState(MUNICIPAL_FALLBACK);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCamp, setNewCamp] = useState({
    name: "", slot: "slot1", ad_duration: 15, targeting: "Municipal", zone: "", budget: "",
    duration_type: "agotar", start: "", end: "", link_type: "web", link_url: "",
  });

  // Expanded campaign panel
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);

  // Creatives
  const [creatives, setCreatives] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Transactions
  const [transactions, setTransactions] = useState([]);

  // Preview modal
  const [previewItem, setPreviewItem] = useState(null); // { images, slot, campaignName }
  const [previewMode, setPreviewMode] = useState("mobile"); // "mobile" | "desktop"

  // Edit modal
  const [editCamp, setEditCamp] = useState(null); // null = cerrado, objeto = campaña a editar

  // Preview countdown (sincronizado con AdCardMock)
  const [previewCount, setPreviewCount] = useState(0);
  useEffect(() => {
    if (!previewItem) return;
    const total = previewItem.adDuration ?? SLOT_CONTEXT[previewItem.slot]?.countdown ?? 15;
    setPreviewCount(total);
    const t = setInterval(() => setPreviewCount(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [previewItem]);

  /* ── Auth + carga desde backend ── */
  useEffect(() => {
    const stored = localStorage.getItem("advertiser_session");
    if (!stored) {
      navigate("/anunciantes/registro", { state: { tab: "login" } });
      return;
    }
    const sess = JSON.parse(stored);
    setSession(sess);

    // Cargar campañas, creatividades y transacciones desde backend
    advertiserFetch("/advertisers/campaigns")
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => {});

    advertiserFetch("/advertisers/creatives")
      .then(data => setCreatives(data.creatives || []))
      .catch(() => {});

    advertiserFetch("/advertisers/transactions")
      .then(data => setTransactions(data.transactions || []))
      .catch(() => {});

    // Cargar zonas con publicidad activa
    fetch(`${API.replace("/api", "")}/api/admin/zonas-cobertura`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const zonas = data?.zonas?.filter(z => z.ads_disponible).map(z => z.municipio);
        if (zonas?.length) setMunicipalZones(zonas);
      })
      .catch(() => {});
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("advertiser_session");
    navigate("/anunciantes");
  };

  /* ── Pause / reactivate campaigns ── */
  const handlePausarCampaign = async (campaignId, e) => {
    e.stopPropagation();
    try {
      await advertiserFetch(`/advertisers/campaigns/${campaignId}/pausar`, { method: "POST" });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: "paused" } : c));
      toast.success("Campaña pausada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReactivarCampaign = async (campaignId, e) => {
    e.stopPropagation();
    try {
      await advertiserFetch(`/advertisers/campaigns/${campaignId}/reactivar`, { method: "POST" });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: "active" } : c));
      toast.success("Campaña reactivada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCampaign = async (campaignId, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar esta campaña? Esta acción no se puede deshacer.")) return;
    try {
      await advertiserFetch(`/advertisers/campaigns/${campaignId}`, { method: "DELETE" });
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (expandedCampaignId === campaignId) setExpandedCampaignId(null);
      toast.success("Campaña eliminada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editCamp) return;
    try {
      const data = await advertiserFetch(`/advertisers/campaigns/${editCamp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCamp.name, slot: editCamp.slot, ad_duration: editCamp.ad_duration,
          targeting: editCamp.targeting, zone: editCamp.zone, budget: Number(editCamp.budget),
          duration_type: editCamp.duration_type, start: editCamp.start,
          end: editCamp.end || null, link_type: editCamp.link_type,
          link_url: editCamp.link_url,
        }),
      });
      setCampaigns(prev => prev.map(c => c.id === editCamp.id ? data.campaign : c));
      setEditCamp(null);
      toast.success("Campaña actualizada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ── Campaign creation ── */
  const setNewCampField = (k, v) => setNewCamp(p => ({ ...p, [k]: v }));

  // Zonas disponibles según targeting seleccionado
  const targetingZones = {
    Municipal: municipalZones,
    Estatal: ESTATAL_ZONES,
    Federal: FEDERAL_ZONES,
  };

  const VALUACIONES_MES = 850; // promedio mensual de valuaciones en la plataforma

  const currentPrice = AD_PRICES[newCamp.slot]?.[newCamp.ad_duration] ?? 5;

  const estimatedImpressions =
    newCamp.budget && Number(newCamp.budget) > 0
      ? Math.floor(Number(newCamp.budget) / currentPrice)
      : null;

  // Frecuencia: de cada N valuaciones, cuántas verán el anuncio
  const estimatedFreq = estimatedImpressions !== null && estimatedImpressions > 0
    ? Math.min(Math.round(VALUACIONES_MES / estimatedImpressions * 10) / 10, VALUACIONES_MES)
    : null;
  const coveragePct = estimatedImpressions !== null
    ? Math.min(Math.round((estimatedImpressions / VALUACIONES_MES) * 100), 100)
    : null;

  const handleCreateCampaign = async () => {
    if (!newCamp.name.trim()) { toast.error("Ingresa el nombre de la campaña"); return; }
    if (!newCamp.zone) { toast.error("Selecciona la zona"); return; }
    if (!newCamp.budget || Number(newCamp.budget) <= 0) { toast.error("Ingresa el presupuesto"); return; }
    if (!newCamp.start) { toast.error("Selecciona la fecha de inicio"); return; }
    if (newCamp.duration_type === "fechas" && !newCamp.end) { toast.error("Selecciona la fecha de fin"); return; }

    try {
      const data = await advertiserFetch("/advertisers/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCamp.name, slot: newCamp.slot, ad_duration: newCamp.ad_duration,
          targeting: newCamp.targeting, zone: newCamp.zone, budget: Number(newCamp.budget),
          duration_type: newCamp.duration_type, start: newCamp.start,
          end: newCamp.end || null, link_type: newCamp.link_type,
          link_url: newCamp.link_url.trim(),
        }),
      });
      const campaign = data.campaign;
      setCampaigns(p => [campaign, ...p]);
      setNewCamp({ name: "", slot: "slot1", ad_duration: 15, targeting: "Municipal", zone: "", budget: "", duration_type: "agotar", start: "", end: "", link_type: "web", link_url: "" });
      setShowNewCampaign(false);
      setSelectedCampaignId(campaign.id);
      setExpandedCampaignId(campaign.id);
      setActiveTab("campanas");
      toast.success("Campaña creada — ahora sube tu creatividad.");
    } catch (err) {
      toast.error(err.message || "Error al crear campaña");
    }
  };

  /* ── Creative upload ── */
  const validateSingleFile = async (file, slot) => {
    const spec = SLOT_SPECS[slot];
    if (!["image/jpeg", "image/png", "video/mp4"].includes(file.type))
      return "Formato no admitido. Usa JPG, PNG o MP4";
    if (file.type === "video/mp4" && !spec.acceptVideo)
      return "Este slot solo acepta imágenes JPG/PNG";
    // Videos: límite del slot. Imágenes: límite de original antes de comprimir
    const sizeLimitMB = file.type === "video/mp4" ? spec.maxSizeMB : MAX_IMAGE_ORIGINAL_MB;
    if (file.size > sizeLimitMB * 1024 * 1024)
      return `El archivo excede el máximo de ${sizeLimitMB} MB`;
    if (file.type === "video/mp4" && spec.maxDuration) {
      try {
        await new Promise((resolve, reject) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            video.duration > spec.maxDuration
              ? reject(`El video excede ${spec.maxDuration}s`)
              : resolve();
          };
          video.onerror = () => reject("No se pudo leer el video");
          video.src = URL.createObjectURL(file);
        });
      } catch (msg) { return msg; }
    }
    return null;
  };

  const handleFilesSelected = async (files, campaignSlot, campaignMaxPhotos) => {
    setUploadError("");
    const fileArr = Array.from(files);

    // Si selecciona un video, reemplaza todo y solo admite 1
    if (fileArr.some(f => f.type === "video/mp4")) {
      if (fileArr.length > 1) { setUploadError("Solo puedes subir un video a la vez"); return; }
      const err = await validateSingleFile(fileArr[0], campaignSlot);
      if (err) { setUploadError(err); return; }
      setUploadItems([{ file: fileArr[0], previewUrl: URL.createObjectURL(fileArr[0]), type: "video" }]);
      setUploadName(fileArr[0].name);
      return;
    }

    // Fotos: acumular sin superar maxPhotos de la campaña
    const currentImages = uploadItems.filter(i => i.type === "image");
    const remaining = campaignMaxPhotos - currentImages.length;
    if (remaining <= 0) {
      setUploadError(`Límite alcanzado: ${campaignMaxPhotos} fotos para este formato`);
      return;
    }
    const toAdd = fileArr.slice(0, remaining);
    const validated = [];
    for (const f of toAdd) {
      const err = await validateSingleFile(f, campaignSlot);
      if (err) { setUploadError(err); return; }
      // Comprimir a WebP solo si vale la pena: archivo grande o dimensiones > MAX_IMAGE_PX
      let compressed = f;
      const needsCompression = await new Promise(resolve => {
        if (f.size > 300 * 1024) { resolve(true); return; } // > 300 KB → comprimir siempre
        const url = URL.createObjectURL(f);
        const img = new window.Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img.naturalWidth > MAX_IMAGE_PX || img.naturalHeight > MAX_IMAGE_PX); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        img.src = url;
      });
      if (needsCompression) {
        try {
          compressed = await compressToWebP(f);
        } catch {
          // Si falla la compresión, usar original
        }
      }
      const previewUrl = URL.createObjectURL(compressed);
      const origMB = (f.size / 1024 / 1024).toFixed(1);
      const compMB = (compressed.size / 1024 / 1024).toFixed(1);
      validated.push({
        file: compressed,
        previewUrl,
        type: "image",
        origMB,
        compMB,
      });
    }
    if (fileArr.length > remaining) {
      toast.info(`Solo se agregaron ${remaining} foto(s) — límite de la campaña: ${campaignMaxPhotos}`);
    }
    setUploadItems(prev => [...prev.filter(i => i.type === "image"), ...validated]);
    if (!uploadName) setUploadName(toAdd[0].name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFilesSelected(e.dataTransfer.files);
  };

  const removeUploadItem = (idx) => {
    setUploadItems(prev => prev.filter((_, i) => i !== idx));
  };

  const resetUpload = () => {
    setUploadItems([]);
    setUploadError("");
    setUploadName("");
  };

  const handleUploadSubmit = async () => {
    if (uploadItems.length === 0) { toast.error("Selecciona al menos un archivo"); return; }
    if (!selectedCampaignId) { toast.error("Selecciona una campaña"); return; }
    setIsUploading(true);
    try {
      const session = JSON.parse(localStorage.getItem("advertiser_session") || "{}");
      const token = session.session_token || "";
      const results = [];

      for (const item of uploadItems) {
        const fd = new FormData();
        fd.append("campaign_id", selectedCampaignId);
        fd.append("name", uploadName || item.file.name.replace(/\.[^.]+$/, ""));
        fd.append("file", item.file);
        const res = await fetch(`${API}/advertisers/creatives/upload`, {
          method: "POST",
          headers: { "X-Advertiser-Token": token },
          body: fd,
        });
        if (!res.ok) throw new Error("Error al subir archivo");
        const data = await res.json();
        results.push(data.creative);
      }

      const selCamp = campaigns.find(c => c.id === selectedCampaignId);
      // Enrich with local preview for immediate display
      const enriched = results.map((c, i) => ({
        ...c,
        slot: selCamp?.slot ?? null,
        sizeLabel: `${(uploadItems[i]?.file.size / 1024 / 1024).toFixed(1)} MB`,
        preview: uploadItems[i]?.previewUrl || null,
      }));
      setCreatives(p => [...enriched, ...p]);
      resetUpload();
      toast.success("Creatividad enviada. Pendiente de revisión por PropValu.");
    } catch (err) {
      toast.error(err.message || "Error al subir. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCreative = (id) => {
    setCreatives(p => p.filter(c => c.id !== id));
    toast.success("Creatividad eliminada");
  };

  if (!session) return null;

  /* ────────────────────────────────────────────────────── */
  /*  Tab renderers                                          */
  /* ────────────────────────────────────────────────────── */

  const renderResumen = () => {
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;
    const approvedCreatives = creatives.filter(c => c.status === "aprobado").length;

    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Impresiones totales", value: totalImpressions.toLocaleString("es-MX"), icon: TrendingUp, accent: true },
            { label: "Gasto total", value: formatMXN(totalSpend), icon: BarChart3, accent: false },
            { label: "Campañas activas", value: activeCampaigns, icon: Megaphone, accent: false },
            { label: "Creatividades aprobadas", value: approvedCreatives, icon: CheckCircle, accent: false },
            { label: "Saldo a favor", value: formatMXN(0), icon: TrendingUp, accent: false },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border p-4 shadow-sm ${s.accent ? "bg-[#1B4332] border-[#1B4332]" : "bg-white border-[#B7E4C7]"}`}>
              <s.icon className={`w-4 h-4 mb-2 ${s.accent ? "text-[#D9ED92]" : "text-[#52B788]"}`} />
              <p className={`font-['Outfit'] text-xl font-bold ${s.accent ? "text-white" : "text-[#1B4332]"}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 ${s.accent ? "text-[#D9ED92]/80" : "text-slate-500"}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA comprar */}
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-['Outfit'] text-base font-bold text-white">¿Listo para llegar a más compradores?</p>
            <p className="text-sm text-white/70 mt-0.5">Crea una nueva campaña y activa tu anuncio en minutos.</p>
          </div>
          <Button
            onClick={() => { setShowNewCampaign(true); setActiveTab("campanas"); }}
            className="bg-[#52B788] hover:bg-[#40916C] text-white font-semibold text-sm shrink-0 px-5"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva campaña
          </Button>
        </div>

        {/* Recent campaigns */}
        <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
            <p className="font-['Outfit'] font-bold text-white">Campañas recientes</p>
            <button onClick={() => setActiveTab("campanas")} className="text-xs text-[#D9ED92] font-semibold hover:underline">
              Ver todas
            </button>
          </div>
          {campaigns.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400">
              <Megaphone className="w-7 h-7 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aún no tienes campañas.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0FAF5]">
              {campaigns.slice(0, 3).map(c => (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F0FAF5] transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-[#1B4332]">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{SLOT_SPECS[c.slot]?.label} · {c.ad_duration ?? "—"}s · {SLOT_SPECS[c.slot]?.where} · {c.targeting}: {c.zone}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1B4332]">{(c.impressions || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">impresiones</p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCampanas = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Mis campañas</h2>
        <Button
          onClick={() => setShowNewCampaign(true)}
          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva campaña
        </Button>
      </div>

      {/* Campaign list */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aún no tienes campañas. Crea la primera.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                  {["Campaña", "Slot", "Zona", "Impresiones", "Gasto", "Estado", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0FAF5]">
                {campaigns.map(c => (
                  <>
                    <tr
                      key={c.id}
                      className="hover:bg-[#F0FAF5] transition-colors cursor-pointer"
                      onClick={() => {
                        const isExpanding = expandedCampaignId !== c.id;
                        setExpandedCampaignId(isExpanding ? c.id : null);
                        if (isExpanding) {
                          setSelectedCampaignId(c.id);
                          setUploadItems([]);
                          setUploadError("");
                        }
                      }}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#1B4332]">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.start}{c.end ? ` → ${c.end}` : " (sin fecha fin)"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600">{SLOT_SPECS[c.slot]?.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.ad_duration ?? "—"}s · ${AD_PRICES[c.slot]?.[c.ad_duration] ?? "—"} MXN/imp</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600">{c.targeting}</p>
                        <p className="text-xs text-slate-400">{c.zone}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#1B4332]">
                        {c.impressions.toLocaleString("es-MX")}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#1B4332]">
                        {formatMXN(c.spend)}
                      </td>
                      <td className="px-5 py-4">
                        {statusBadge(c.status)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {c.status === "pending" && (
                            <>
                              <button
                                title="Editar campaña"
                                onClick={(e) => { e.stopPropagation(); setEditCamp({ ...c, budget: c.budget ?? "", ad_duration: c.ad_duration ?? 15 }); }}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Eliminar campaña"
                                onClick={(e) => handleDeleteCampaign(c.id, e)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {c.status === "active" && (
                            <button
                              title="Pausar campaña"
                              onClick={(e) => handlePausarCampaign(c.id, e)}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {c.status === "paused" && (
                            <button
                              title="Reactivar campaña"
                              onClick={(e) => handleReactivarCampaign(c.id, e)}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-slate-400">
                            {expandedCampaignId === c.id
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />
                            }
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable images panel */}
                    {expandedCampaignId === c.id && (() => {
                      const spec = SLOT_SPECS[c.slot];
                      const campImages = creatives.filter(cr => cr.campaign_id === c.id);
                      const videoCreative = campImages.find(cr => (cr.file_type || cr.type) === "video");
                      const imageCreatives = campImages.filter(cr => (cr.file_type || cr.type) === "image").slice(0, spec.maxPhotos);
                      const adDuration = c.ad_duration ?? 15;
                      const secsPer = imageCreatives.length > 0
                        ? Math.max(1, Math.floor(adDuration / imageCreatives.length))
                        : adDuration;
                      const canAddMore = !videoCreative && imageCreatives.length < spec.maxPhotos;

                      // Upload form state for this campaign
                      const isThisCampSelected = selectedCampaignId === c.id;
                      const imageItems = uploadItems.filter(i => i.type === "image");
                      const videoItem = uploadItems.find(i => i.type === "video");
                      const hasItems = uploadItems.length > 0;
                      const canAddUpload = isThisCampSelected && !videoItem && imageItems.length < spec.maxPhotos;

                      return (
                        <tr key={`${c.id}-expanded`}>
                          <td colSpan={7} className="px-0 py-0">
                            <div className="border-t border-[#B7E4C7] bg-[#F0FAF5]" onClick={e => e.stopPropagation()}>

                              {/* Panel header */}
                              <div className="px-5 py-3 bg-[#E8F5EE] border-b border-[#B7E4C7] flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#1B4332]">
                                    {spec.label} · {adDuration}s
                                    {videoCreative
                                      ? " · 1 video"
                                      : spec.acceptVideo
                                        ? ` · ${imageCreatives.length} de ${spec.maxPhotos} imágenes o 1 video · ${secsPer}seg c/u`
                                        : ` · ${imageCreatives.length} de ${spec.maxPhotos} imágenes · ${secsPer}seg c/u`
                                    }
                                  </p>
                                  <p className="text-xs text-[#2D6A4F] font-medium mt-0.5">📍 {spec.where}</p>
                                  <p className="text-xs font-medium mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                    <span className="text-[#2D6A4F]">📷 JPG/PNG hasta {MAX_IMAGE_ORIGINAL_MB} MB</span>
                                    <span className="text-slate-400">→ se comprime a WebP automáticamente</span>
                                    {spec.acceptVideo && (
                                      <span className="text-[#2D6A4F]">🎬 MP4 hasta {spec.maxSizeMB} MB</span>
                                    )}
                                    {!spec.acceptVideo && (
                                      <span className="text-amber-500 font-semibold">Solo imágenes — este slot no acepta video</span>
                                    )}
                                  </p>
                                </div>
                                {campImages.length > 0 && (
                                  <button
                                    onClick={() => setPreviewItem({ images: imageCreatives, slot: c.slot, campaignName: c.name, adDuration: c.ad_duration ?? 15 })}
                                    className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview
                                  </button>
                                )}
                              </div>

                              {/* Image grid */}
                              <div className="p-5">
                                {campImages.length === 0 && !hasItems ? (
                                  <div className="text-center py-6 text-slate-400">
                                    <Image className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs mb-3">Aún no hay imágenes para esta campaña.</p>
                                    {canAddMore && (
                                      <button
                                        className="inline-flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                        onClick={() => {
                                          setSelectedCampaignId(c.id);
                                          fileInputRef.current?.click();
                                        }}
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        Subir imágenes
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                                    {/* Existing approved/pending creatives */}
                                    {videoCreative ? (
                                      <div className="relative group rounded-lg overflow-hidden aspect-video bg-slate-100 col-span-2">
                                        {(videoCreative.preview || videoCreative.file_url)
                                          ? <video
                                              src={videoCreative.preview || `${API.replace("/api","")}${videoCreative.file_url}`}
                                              className="w-full h-full object-cover"
                                              muted
                                            />
                                          : <div className="w-full h-full flex items-center justify-center">
                                              <Play className="w-6 h-6 text-slate-400" />
                                            </div>
                                        }
                                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                                          Video · {spec.adDuration}s
                                        </span>
                                        {videoCreative.status === "pendiente_revision" && (
                                          <span className="absolute top-1 left-1 bg-amber-400/90 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                                            Revisión
                                          </span>
                                        )}
                                        {videoCreative.status === "rechazado" && (
                                          <span className="absolute top-1 left-1 bg-red-500/90 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                                            Rechazado
                                          </span>
                                        )}
                                        <button
                                          onClick={() => handleDeleteCreative(videoCreative.id)}
                                          className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-3 h-3 text-red-500" />
                                        </button>
                                      </div>
                                    ) : (
                                      imageCreatives.map((img, idx) => (
                                        <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-video bg-slate-100">
                                          {(img.preview || img.file_url)
                                            ? <img
                                                src={img.preview || `${API.replace("/api","")}${img.file_url}`}
                                                alt={img.name}
                                                className="w-full h-full object-cover"
                                              />
                                            : <div className="w-full h-full flex items-center justify-center">
                                                <Image className="w-4 h-4 text-slate-300" />
                                              </div>
                                          }
                                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                                            {idx + 1} · {secsPer}s
                                          </span>
                                          {img.status === "pendiente_revision" && (
                                            <span className="absolute top-1 left-1 bg-amber-400/90 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                                              Revisión
                                            </span>
                                          )}
                                          {img.status === "rechazado" && (
                                            <span className="absolute top-1 left-1 bg-red-500/90 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                                              Rechazado
                                            </span>
                                          )}
                                          <button
                                            onClick={() => handleDeleteCreative(img.id)}
                                            className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="w-3 h-3 text-red-500" />
                                          </button>
                                        </div>
                                      ))
                                    )}

                                    {/* Add more button */}
                                    {canAddMore && (
                                      <button
                                        className="aspect-video rounded-lg border-2 border-dashed border-[#52B788] flex flex-col items-center justify-center gap-1 hover:bg-[#D9ED92]/20 transition-colors"
                                        onClick={() => {
                                          setSelectedCampaignId(c.id);
                                          fileInputRef.current?.click();
                                        }}
                                      >
                                        <Plus className="w-5 h-5 text-[#52B788]" />
                                        <span className="text-[10px] text-[#52B788] font-semibold">Agregar</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Hidden file input */}
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept={spec.accept}
                                  multiple={!videoItem}
                                  className="hidden"
                                  onChange={e => {
                                    if (e.target.files.length)
                                      handleFilesSelected(e.target.files, c.slot, spec.maxPhotos);
                                  }}
                                />

                                {/* Upload form — only when this campaign is selected and has pending items */}
                                {isThisCampSelected && hasItems && (
                                  <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden mt-2">
                                    <div className="px-5 py-3 border-b border-[#B7E4C7] bg-[#F0FAF5] flex items-center justify-between">
                                      <div>
                                        <h3 className="font-semibold text-[#1B4332] text-sm">Subir creatividad</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {spec.acceptVideo
                                            ? `Video MP4 (máx. ${spec.maxSizeMB} MB) o hasta ${spec.maxPhotos} imágenes en secuencia`
                                            : `Hasta ${spec.maxPhotos} imágenes — se convierten a WebP automáticamente`}
                                        </p>
                                      </div>
                                      <button onClick={resetUpload} className="text-xs text-red-400 hover:text-red-500 font-medium">
                                        Limpiar
                                      </button>
                                    </div>
                                    <div className="p-5 space-y-4">

                                      <FormatWarning />

                                      {/* Dropzone — show if can add more */}
                                      {canAddUpload && (
                                        <div
                                          className="border-2 border-dashed border-[#B7E4C7] rounded-xl p-6 text-center cursor-pointer hover:border-[#52B788] hover:bg-[#D9ED92]/10 transition-all"
                                          onClick={() => fileInputRef.current?.click()}
                                          onDrop={handleDrop}
                                          onDragOver={e => e.preventDefault()}
                                        >
                                          <Upload className="w-6 h-6 mx-auto mb-2 text-[#52B788]" />
                                          <p className="text-sm font-semibold text-[#1B4332]">
                                            <span className="text-[#52B788]">Agregar más fotos</span> ({imageItems.length}/{spec.maxPhotos})
                                          </p>
                                          <p className="text-xs text-slate-400 mt-1">
                                            {spec.acceptVideo
                                              ? `JPG/PNG → WebP (máx. ${MAX_IMAGE_ORIGINAL_MB} MB c/u) · MP4 máx. ${spec.maxSizeMB} MB`
                                              : `JPG/PNG → WebP automáticamente (máx. ${MAX_IMAGE_ORIGINAL_MB} MB c/u)`}
                                          </p>
                                        </div>
                                      )}

                                      {uploadError && (
                                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                          {uploadError}
                                        </div>
                                      )}

                                      {/* Video preview */}
                                      {videoItem && (
                                        <div className="relative bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                                          <video src={videoItem.previewUrl} controls className="max-h-56 max-w-full rounded-xl" />
                                          <button onClick={() => setUploadItems([])}
                                            className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm">
                                            <X className="w-4 h-4 text-slate-600" />
                                          </button>
                                        </div>
                                      )}

                                      {/* Foto grid (pending upload) */}
                                      {imageItems.length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-slate-500">
                                              Secuencia: {imageItems.length} foto{imageItems.length > 1 ? "s" : ""} · {imageItems.length * Math.max(1, Math.floor(spec.adDuration / imageItems.length))}s total
                                            </p>
                                            <p className="text-xs text-slate-400">
                                              {spec.maxPhotos - imageItems.length} espacio{spec.maxPhotos - imageItems.length !== 1 ? "s" : ""} restante{spec.maxPhotos - imageItems.length !== 1 ? "s" : ""}
                                            </p>
                                          </div>
                                          <div className="grid grid-cols-4 gap-2">
                                            {imageItems.map((item, idx) => (
                                              <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video bg-slate-100">
                                                <img src={item.previewUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <button onClick={() => removeUploadItem(idx)} className="bg-white rounded-full p-1 shadow">
                                                    <X className="w-3 h-3 text-red-500" />
                                                  </button>
                                                </div>
                                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                                  {idx + 1} · {Math.max(1, Math.floor(spec.adDuration / imageItems.length))}s
                                                </span>
                                                {item.compMB && (
                                                  <span className="absolute top-1 right-1 bg-[#1B4332]/80 text-[#D9ED92] text-[9px] font-bold px-1 rounded">
                                                    WebP {item.compMB}MB
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Nombre + envío */}
                                      <div className="space-y-3 pt-2">
                                        <div className="space-y-1.5">
                                          <Label className="text-sm font-semibold text-[#1B4332]">
                                            Nombre de la creatividad <span className="text-slate-400 font-normal">(editable)</span>
                                          </Label>
                                          <Input
                                            value={uploadName}
                                            onChange={e => setUploadName(e.target.value)}
                                            className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                                          />
                                        </div>
                                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                                          <strong>Revisión requerida:</strong> PropValu revisará el material antes de activarlo.
                                          Tiempo estimado: 1–2 días hábiles.
                                        </div>
                                        <Button onClick={handleUploadSubmit} disabled={isUploading}
                                          className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold">
                                          <Upload className="w-4 h-4 mr-2" />
                                          {isUploading ? "Subiendo..." : "Enviar para revisión"}
                                        </Button>
                                      </div>

                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-t-2xl shrink-0">
              <h3 className="font-['Outfit'] text-lg font-bold text-white">Nueva campaña</h3>
              <button onClick={() => setShowNewCampaign(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — 2 columnas en PC */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* ── Columna izquierda: placement + duración ── */}
              <div className="space-y-5">

                {/* Paso 1 — Dónde aparece */}
                <div>
                  <Label className="text-sm font-bold text-[#1B4332]">1. ¿Dónde aparece tu anuncio? *</Label>
                  <p className="text-xs text-slate-500 mt-0.5 mb-2">Tus anuncios ocupan la pantalla completa — el usuario no puede cerrarlos.</p>
                  <div className="space-y-2">
                    {Object.entries(SLOT_SPECS).map(([key, spec]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const availableDurations = DURATION_OPTIONS.filter(d => d.slots.includes(key));
                          const currentOk = availableDurations.some(d => d.seconds === newCamp.ad_duration);
                          setNewCampField("slot", key);
                          if (!currentOk) setNewCampField("ad_duration", availableDurations[0].seconds);
                        }}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                          newCamp.slot === key
                            ? "border-[#52B788] bg-[#D9ED92]/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            newCamp.slot === key ? "border-[#52B788] bg-[#52B788]" : "border-slate-300"
                          }`}>
                            {newCamp.slot === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                newCamp.slot === key ? "bg-[#1B4332] text-[#D9ED92]" : "bg-slate-100 text-slate-600"
                              }`}>{spec.label}</span>
                              <span className={`text-xs font-semibold ${newCamp.slot === key ? "text-[#1B4332]" : "text-slate-700"}`}>{spec.tag}</span>
                            </div>
                            <p className={`text-xs mt-1 ${newCamp.slot === key ? "text-[#2D6A4F]" : "text-slate-500"}`}>
                              📍 {spec.where}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paso 2 — Duración */}
                <div>
                  <Label className="text-sm font-bold text-[#1B4332]">2. ¿Cuánto tiempo dura tu anuncio? *</Label>
                  <p className="text-xs text-slate-500 mt-0.5 mb-2">Las opciones disponibles dependen del slot seleccionado.</p>
                  <div className="space-y-2">
                    {DURATION_OPTIONS.filter(d => d.slots.includes(newCamp.slot)).map(d => {
                      const price = AD_PRICES[newCamp.slot]?.[d.seconds] ?? 0;
                      const selected = newCamp.ad_duration === d.seconds;
                      return (
                        <button
                          key={d.seconds}
                          type="button"
                          onClick={() => setNewCampField("ad_duration", d.seconds)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                            selected ? "border-[#52B788] bg-[#D9ED92]/20" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              selected ? "border-[#52B788] bg-[#52B788]" : "border-slate-300"
                            }`}>
                              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className={`text-sm font-semibold ${selected ? "text-[#1B4332]" : "text-slate-700"}`}>{d.label}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${selected ? "text-[#1B4332]" : "text-slate-600"}`}>${price} MXN</span>
                            <span className="text-xs text-slate-400"> / impresión</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormatWarning />

                {/* Aviso */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                  <p>Las campañas quedan <strong>En revisión</strong> hasta ser aprobadas. Sin cobro hasta la aprobación.</p>
                  <p>El saldo solo se consume cuando hay valuaciones activas en tu zona. Si la campaña termina por fecha con saldo restante, el crédito queda disponible por <strong>3 meses</strong> para usarse en otra campaña.</p>
                </div>
              </div>

              {/* ── Columna derecha: campos ── */}
              <div className="space-y-4">

                {/* 3. Nombre */}
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-[#1B4332]">3. Nombre de la campaña *</Label>
                  <Input
                    placeholder="ej. Primavera GDL 2026"
                    className={`border focus:border-[#52B788] bg-[#F0FAF5] transition-colors ${newCamp.name ? "border-[#52B788]" : "border-slate-300"}`}
                    value={newCamp.name}
                    onChange={e => setNewCampField("name", e.target.value)}
                  />
                </div>

                {/* 4. Segmentación + Zona */}
                <div>
                  <Label className="text-sm font-bold text-[#1B4332] block mb-1">4. Segmentación y zona *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="w-full h-10 px-3 text-sm border rounded-lg focus:border-[#52B788] focus:bg-[#F0FAF5] focus:outline-none text-[#1B4332] appearance-none transition-colors bg-[#F0FAF5] border-[#52B788]"
                      value={newCamp.targeting}
                      onChange={e => { setNewCampField("targeting", e.target.value); setNewCampField("zone", ""); }}
                    >
                      {Object.keys(targetingZones).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      className={`w-full h-10 px-3 text-sm border rounded-lg focus:border-[#52B788] focus:outline-none text-[#1B4332] appearance-none transition-colors !bg-[#F0FAF5] ${newCamp.zone ? "border-[#52B788]" : "border-slate-300"}`}
                      value={newCamp.zone}
                      onChange={e => setNewCampField("zone", e.target.value)}
                    >
                      <option value="">Seleccionar zona...</option>
                      {(targetingZones[newCamp.targeting] || []).map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Presupuesto */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-[#1B4332]">5. Presupuesto (MXN) *</Label>
                  <Input
                    type="number" min={0} placeholder="ej. 5000"
                    className={`border focus:border-[#52B788] bg-[#F0FAF5] transition-colors ${newCamp.budget ? "border-[#52B788]" : "border-slate-300"}`}
                    value={newCamp.budget}
                    onChange={e => setNewCampField("budget", e.target.value)}
                  />
                  {estimatedImpressions !== null && (
                    <div className="rounded-lg border border-[#B7E4C7] bg-[#F0FAF5] p-3 space-y-2 mt-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">Impresiones estimadas</span>
                        <span className="font-bold text-[#1B4332]">≈ {estimatedImpressions.toLocaleString("es-MX")} veces</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">Cobertura del mes</span>
                        <span className="font-bold text-[#1B4332]">{coveragePct >= 100 ? "100% de valuaciones" : `${coveragePct}% de valuaciones`}</span>
                      </div>
                      {coveragePct < 100 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-700">Frecuencia de aparición</span>
                          <span className="font-bold text-[#1B4332]">
                            {estimatedFreq <= 1 ? "aparece en cada valuación" : `1 de cada ${estimatedFreq} valuaciones`}
                          </span>
                        </div>
                      )}
                      <div className="w-full bg-white rounded-full h-2 border border-[#B7E4C7] overflow-hidden">
                        <div className="h-full bg-[#52B788] rounded-full transition-all duration-300" style={{ width: `${Math.min(coveragePct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-slate-600">
                        Precio por impresión: <strong>${currentPrice} MXN</strong>.
                        Tu anuncio se activa automáticamente según la segmentación y el formato elegidos.
                      </p>
                    </div>
                  )}
                </div>

                {/* 6. Vigencia */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#1B4332]">6. Vigencia de la campaña *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        key: "agotar",
                        emoji: "⏳",
                        label: "Hasta agotar saldo",
                        bullets: ["Corre sin fecha de fin", "Se detiene al usar todas las impresiones", "El saldo solo baja cuando hay avalúos en tu zona"],
                      },
                      {
                        key: "fechas",
                        emoji: "📅",
                        label: "Por fechas",
                        bullets: ["Tú defines inicio y fin", "Se pausa al llegar a la fecha de fin", "Saldo restante como crédito por 3 meses"],
                      },
                    ].map(({ key, emoji, label, bullets }) => (
                      <button key={key} type="button"
                        onClick={() => { setNewCampField("duration_type", key); setNewCampField("end", ""); }}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          newCamp.duration_type === key
                            ? "border-[#52B788] bg-[#D9ED92]/30"
                            : "border-slate-200 bg-white hover:border-[#52B788]/40 hover:bg-[#D9ED92]/10"
                        }`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">{emoji}</span>
                          <span className={`text-sm font-bold ${newCamp.duration_type === key ? "text-[#1B4332]" : "text-slate-700"}`}>{label}</span>
                        </div>
                        <ul className="space-y-1">
                          {bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug">
                              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${newCamp.duration_type === key ? "bg-[#52B788]" : "bg-slate-300"}`} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Fechas */}
                <div className={`grid gap-3 ${newCamp.duration_type === "fechas" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-[#1B4332]">7. Fecha de inicio *</Label>
                    <Input type="date"
                      className={`border focus:border-[#52B788] !bg-[#F0FAF5] transition-colors ${newCamp.start ? "border-[#52B788]" : "border-slate-300"}`}
                      value={newCamp.start} onChange={e => setNewCampField("start", e.target.value)} />
                  </div>
                  {newCamp.duration_type === "fechas" && (
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-[#1B4332]">Fecha de fin *</Label>
                      <Input type="date"
                        className={`border focus:border-[#52B788] !bg-[#F0FAF5] transition-colors ${newCamp.end ? "border-[#52B788]" : "border-slate-300"}`}
                        value={newCamp.end} onChange={e => setNewCampField("end", e.target.value)} />
                    </div>
                  )}
                </div>

                {/* 8. Enlace */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-[#1B4332]">8. Enlace de destino</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ key: "web", label: "🌐 Sitio web" }, { key: "whatsapp", label: "💬 WhatsApp" }].map(({ key, label }) => (
                      <button key={key} type="button"
                        onClick={() => { setNewCampField("link_type", key); setNewCampField("link_url", ""); }}
                        className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                          newCamp.link_type === key
                            ? "border-[#52B788] bg-[#D9ED92]/20 text-[#1B4332]"
                            : "border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder={newCamp.link_type === "whatsapp" ? "3312345678 (sin +52)" : "https://tuempresa.com/promo"}
                    className={`border focus:border-[#52B788] bg-[#F0FAF5] transition-colors ${newCamp.link_url ? "border-[#52B788]" : "border-slate-300"}`}
                    value={newCamp.link_url} onChange={e => setNewCampField("link_url", e.target.value)}
                  />
                  {newCamp.link_type === "whatsapp" && newCamp.link_url
                    ? <p className="text-xs text-[#1B4332] font-semibold">→ wa.me/52{newCamp.link_url.replace(/\D/g, "")}</p>
                    : <p className="text-xs text-slate-500">El usuario será enviado a {newCamp.link_type === "whatsapp" ? "tu WhatsApp" : "este sitio web"} al hacer clic.</p>
                  }
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5 border-t border-slate-100 pt-4 shrink-0">
              <Button variant="outline" onClick={() => setShowNewCampaign(false)}
                className="border-slate-200 text-slate-700">Cancelar</Button>
              <Button onClick={handleCreateCampaign}
                className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold">
                Crear campaña
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFacturacion = () => (
    <div className="space-y-5">
      <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Facturación</h2>
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin transacciones todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                  {["Fecha", "Concepto", "Monto", "Estado", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-white/80 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0FAF5]">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#F0FAF5] transition-colors">
                    <td className="px-5 py-4 text-slate-500">{t.date}</td>
                    <td className="px-5 py-4 text-[#1B4332] font-medium">{t.concept}</td>
                    <td className="px-5 py-4 font-bold text-[#1B4332]">{formatMXN(t.amount)}</td>
                    <td className="px-5 py-4">{statusBadge(t.status)}</td>
                    <td className="px-5 py-4">
                      <button className="text-[#52B788] hover:text-[#40916C] flex items-center gap-1 text-xs font-semibold">
                        <Download className="w-3 h-3" />
                        CFDI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Las facturas son emitidas automáticamente al aprobar cada campaña. Para solicitar una
        factura adicional contacta a{" "}
        <span className="text-[#52B788] font-semibold">facturacion@propvalu.mx</span>
      </p>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-6 h-6 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </a>
          <span className="text-slate-300 mx-2">|</span>
          <span className="text-sm font-semibold text-slate-600">
            {session.company_name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { setShowNewCampaign(true); setActiveTab("campanas"); }}
            className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Comprar anuncios
          </Button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1.5 shadow-sm mb-8 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#1B4332]"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "resumen" && renderResumen()}
        {activeTab === "campanas" && renderCampanas()}
        {activeTab === "facturacion" && renderFacturacion()}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-auto py-4 px-6 flex items-center justify-center gap-6 text-xs text-slate-400">
        <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="hover:text-[#52B788] transition-colors">
          Política de privacidad
        </a>
        <span className="text-slate-200">|</span>
        <a href="/terminos" target="_blank" rel="noopener noreferrer" className="hover:text-[#52B788] transition-colors">
          Términos del servicio
        </a>
        <span className="text-slate-200">|</span>
        <a href="/terminos-anunciantes" target="_blank" rel="noopener noreferrer" className="hover:text-[#52B788] transition-colors">
          Términos para anunciantes
        </a>
      </footer>

      {/* ── Edit Campaign Modal ── */}
      {editCamp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-t-2xl shrink-0">
              <h3 className="font-['Outfit'] text-lg font-bold text-white">Editar campaña</h3>
              <button onClick={() => setEditCamp(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Solo puedes editar campañas que aún no han iniciado.
              </p>

              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#1B4332]">Nombre *</Label>
                <Input value={editCamp.name} onChange={e => setEditCamp(p => ({ ...p, name: e.target.value }))}
                  className="border !bg-[#F0FAF5] border-[#52B788] focus:border-[#52B788]" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#1B4332]">Dónde aparece *</Label>
                <div className="space-y-1.5">
                  {Object.entries(SLOT_SPECS).map(([key, spec]) => (
                    <button key={key} type="button"
                      onClick={() => {
                        const avail = DURATION_OPTIONS.filter(d => d.slots.includes(key));
                        const ok = avail.some(d => d.seconds === editCamp.ad_duration);
                        setEditCamp(p => ({ ...p, slot: key, ad_duration: ok ? p.ad_duration : avail[0].seconds }));
                      }}
                      className={`w-full p-2.5 rounded-xl border-2 text-left text-sm transition-all ${editCamp.slot === key ? "border-[#52B788] bg-[#D9ED92]/20 text-[#1B4332] font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      📍 {spec.where}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#1B4332]">Duración *</Label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.filter(d => d.slots.includes(editCamp.slot)).map(d => {
                    const price = AD_PRICES[editCamp.slot]?.[d.seconds] ?? 0;
                    const sel = editCamp.ad_duration === d.seconds;
                    return (
                      <button key={d.seconds} type="button"
                        onClick={() => setEditCamp(p => ({ ...p, ad_duration: d.seconds }))}
                        className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${sel ? "border-[#52B788] bg-[#D9ED92]/20 text-[#1B4332]" : "border-slate-200 text-slate-600"}`}>
                        {d.label}<br /><span className="font-normal">${price}/imp</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-[#1B4332]">Presupuesto (MXN) *</Label>
                  <Input type="number" value={editCamp.budget}
                    onChange={e => setEditCamp(p => ({ ...p, budget: e.target.value }))}
                    className="border !bg-[#F0FAF5] border-[#52B788] focus:border-[#52B788]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-[#1B4332]">Fecha de inicio *</Label>
                  <Input type="date" value={editCamp.start}
                    onChange={e => setEditCamp(p => ({ ...p, start: e.target.value }))}
                    className="border !bg-[#F0FAF5] border-[#52B788] focus:border-[#52B788]" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#1B4332]">Enlace de destino</Label>
                <Input value={editCamp.link_url}
                  onChange={e => setEditCamp(p => ({ ...p, link_url: e.target.value }))}
                  placeholder={editCamp.link_type === "whatsapp" ? "3312345678" : "https://..."}
                  className="border !bg-[#F0FAF5] border-[#52B788] focus:border-[#52B788]" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-slate-100 shrink-0">
              <Button variant="outline" onClick={() => setEditCamp(null)} className="border-slate-200 text-slate-700">Cancelar</Button>
              <Button onClick={handleSaveEdit} className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold">Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-start pt-4 pb-4 gap-3" onClick={() => setPreviewItem(null)}>

          {/* Toggle + cerrar */}
          <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${previewMode === "mobile" ? "bg-white text-[#1B4332]" : "text-white/60 hover:text-white"}`}
              >
                <Monitor className="w-4 h-4 rotate-90" style={{ transform: "rotate(0deg) scaleX(0.65)" }} />
                Móvil
              </button>
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${previewMode === "desktop" ? "bg-white text-[#1B4332]" : "text-white/60 hover:text-white"}`}
              >
                <Monitor className="w-4 h-4" />
                PC
              </button>
            </div>
            <button onClick={() => setPreviewItem(null)} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Simulación de pantalla */}
          <div
            className="relative bg-[#F8F9FA] shadow-2xl overflow-hidden flex flex-col"
            style={previewMode === "mobile"
              ? { width: "min(390px, 92vw)", height: "min(760px, 86vh)", borderRadius: 24 }
              : { width: "min(960px, 95vw)", height: "min(620px, 86vh)", borderRadius: 12 }
            }
            onClick={e => e.stopPropagation()}
          >
            {/* Barra del browser */}
            <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="flex gap-1.5">
                {["bg-red-300","bg-yellow-300","bg-green-300"].map(c => <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}
              </div>
              <div className="flex-1 bg-slate-100 rounded-full text-[11px] text-slate-400 px-2.5 py-0.5 font-mono truncate">
                propvalu.mx/{SLOT_CONTEXT[previewItem.slot]?.urlPath}
              </div>
              <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-slate-600 ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido — sin scroll, todo ajustado al alto disponible */}
            <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-2">

              {/* Contexto — línea + texto compacto */}
              <div className="flex flex-col items-center shrink-0 gap-1">
                <div className="flex items-center justify-center gap-2 w-full">
                  <p className="font-['Outfit'] text-sm font-bold text-[#1B4332] text-center leading-tight">{SLOT_CONTEXT[previewItem.slot]?.contextLabel}</p>
                  <span className="text-xs font-bold text-[#52B788] tabular-nums shrink-0">{previewCount}s</span>
                </div>
                <p className="text-[11px] text-slate-500 text-center leading-tight">{SLOT_CONTEXT[previewItem.slot]?.contextSub}</p>
                {SLOT_CONTEXT[previewItem.slot]?.spinner
                  ? <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-[#52B788] rounded-full animate-[slide_1.4s_ease-in-out_infinite]" style={{ width: "40%" }} />
                    </div>
                  : <div className="w-full h-0.5 bg-[#52B788] rounded-full mt-0.5" />
                }
              </div>

              {/* El anuncio — ocupa todo el espacio restante en 1:1 */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="w-full h-full" style={{ maxWidth: previewMode === "desktop" ? 380 : "100%" }}>
                  <AdCardMock images={previewItem.images} slot={previewItem.slot} campaignName={previewItem.campaignName} adDuration={previewItem.adDuration} />
                </div>
              </div>
            </div>

            {/* Chip de slot */}
            <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-1.5 text-center">
              <span className="text-[11px] text-slate-400">
                Slot <span className="font-semibold text-[#1B4332]">{SLOT_SPECS[previewItem.slot]?.label}</span>
                {" · "}{previewItem.adDuration ?? "—"}s
                {previewItem.images.length > 1 && ` · ${previewItem.images.length} imgs en carrusel`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertiserConsolePage;
