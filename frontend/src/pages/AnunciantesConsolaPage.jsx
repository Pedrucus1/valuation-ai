import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2, Eye, BarChart2, X, Check, Monitor } from "lucide-react";
import { API } from "@/App";

const SLOTS = [
  {
    id: "comparables",
    label: "Búsqueda de Comparables",
    duration: "60 segundos",
    countdown: 60,
    desc: "Se muestra durante la búsqueda de comparables con IA. Alta visibilidad.",
    contextLabel: "Buscando inmuebles comparables…",
    contextSub: "Analizando mercado con inteligencia artificial",
  },
  {
    id: "generation",
    label: "Generación de Reporte",
    duration: "10 segundos",
    countdown: 10,
    desc: "Pantalla de carga mientras se genera el HTML del avalúo.",
    contextLabel: "Generando tu avalúo profesional…",
    contextSub: "Aplicando metodología de homologación",
  },
  {
    id: "download",
    label: "Descarga de PDF",
    duration: "10 segundos",
    countdown: 10,
    desc: "Contador regresivo antes de que el usuario descargue su reporte.",
    contextLabel: "¡Tu reporte está listo!",
    contextSub: "Podrás descargarlo en unos segundos",
  },
];

const EMPTY_FORM = {
  tag: "", title: "", body: "", slots: [],
  media_url: "", advertiser: "", geo: "",
  starts_at: "", ends_at: "",
};

// ── Countdown ring (animación CSS pura) ──────────────────────────────────────
const CountdownRing = ({ total, current, size = 56, stroke = 4 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = current / total;
  const dash = circ * pct;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#D9ED92" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s linear" }} />
    </svg>
  );
};

// ── Ad Card as it renders inside the app ─────────────────────────────────────
const AdCardMock = ({ tag, title, body, media_url, slot, countdown }) => {
  const slotDef = SLOTS.find(s => s.id === slot);
  const total = slotDef?.countdown || 10;
  const [count, setCount] = useState(countdown ?? total);
  const timerRef = useRef(null);

  useEffect(() => {
    setCount(countdown ?? total);
    clearInterval(timerRef.current);
    if ((countdown ?? total) > 0) {
      timerRef.current = setInterval(() => {
        setCount(c => {
          if (c <= 1) { clearInterval(timerRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, title, body, tag, media_url]);

  return (
    <div className="bg-[#1B4332] rounded-2xl p-5 w-full max-w-sm mx-auto shadow-xl">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-[#D9ED92] uppercase tracking-widest">
          {tag || "Publicidad"}
        </span>
        {/* Countdown ring */}
        <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
          <CountdownRing total={total} current={count} size={44} stroke={3} />
          <span className="absolute text-white font-bold text-xs">{count}</span>
        </div>
      </div>

      {/* Image */}
      {media_url && (
        <div className="rounded-xl overflow-hidden mb-3">
          <img src={media_url} alt=""
            className="w-full h-32 object-cover"
            onError={e => { e.target.style.display = "none"; }} />
        </div>
      )}

      {/* Title */}
      <h3 className="font-['Outfit'] text-base font-bold text-white mb-1.5 leading-snug">
        {title || <span className="text-white/30 italic">Título de tu anuncio</span>}
      </h3>

      {/* Body */}
      <p className="text-white/75 text-xs leading-relaxed">
        {body || <span className="italic text-white/25">Descripción de tu anuncio aparecerá aquí…</span>}
      </p>

      {/* CTA hint */}
      <p className="mt-3 text-[10px] text-white/30 text-center">
        Este espacio es un mensaje de nuestros anunciantes
      </p>
    </div>
  );
};

// ── Slot context wrapper ─────────────────────────────────────────────────────
const SlotContextPreview = ({ slot, form }) => {
  const slotDef = SLOTS.find(s => s.id === slot);
  if (!slotDef) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-[#F8F9FA]">
      {/* Mock browser bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-300" />
          <div className="w-3 h-3 rounded-full bg-yellow-300" />
          <div className="w-3 h-3 rounded-full bg-green-300" />
        </div>
        <div className="flex-1 bg-slate-100 rounded-full text-xs text-slate-400 px-3 py-1 font-mono truncate">
          propvalu.mx/{slot === "comparables" ? "comparables/val_abc123" : slot === "generation" ? "reporte/val_abc123" : "gracias/val_abc123"}
        </div>
      </div>

      {/* Page context */}
      <div className="bg-[#F8F9FA] px-6 py-5">
        {/* Top context UI */}
        <div className="text-center mb-5">
          {/* Mock nav */}
          <div className="flex items-center justify-between mb-4 opacity-40">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-[#1B4332]" />
              <div className="w-16 h-3 rounded bg-slate-300" />
            </div>
            <div className="w-20 h-6 rounded-full bg-slate-200" />
          </div>

          {/* Spinner / status */}
          <div className="flex flex-col items-center mb-5">
            {slot !== "download" && (
              <div className="w-10 h-10 rounded-full border-4 border-[#52B788] border-t-transparent animate-spin mb-3" />
            )}
            {slot === "download" && (
              <div className="w-10 h-10 rounded-full bg-[#52B788] flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <p className="font-['Outfit'] text-base font-bold text-[#1B4332]">{slotDef.contextLabel}</p>
            <p className="text-xs text-slate-500 mt-1">{slotDef.contextSub}</p>
          </div>
        </div>

        {/* The actual ad */}
        <AdCardMock
          tag={form.tag}
          title={form.title}
          body={form.body}
          media_url={form.media_url}
          slot={slot}
        />

        {/* Bottom context UI */}
        <div className="mt-5 flex justify-center">
          {slot === "download" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-40 h-9 rounded-xl bg-slate-200 flex items-center justify-center">
                <span className="text-xs text-slate-400">Descarga disponible en {SLOTS.find(s=>s.id===slot)?.countdown}s…</span>
              </div>
              <p className="text-xs text-slate-400">Botón de descarga desbloqueado al terminar el contador</p>
            </div>
          ) : (
            <div className="w-48 h-2 rounded-full bg-slate-200 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const AnunciantesConsolaPage = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [previewSlot, setPreviewSlot] = useState(null);

  // Identificador del anunciante (almacenado por DevLogin o auth real)
  const userId = localStorage.getItem("propvalu_user_id") || "user_local_dev";
  const authHeaders = { "Content-Type": "application/json", "X-User-Id": userId };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSlot = (slotId) => {
    setForm(f => {
      const next = f.slots.includes(slotId)
        ? f.slots.filter(s => s !== slotId)
        : [...f.slots, slotId];
      // Auto-select first slot for preview
      if (next.length && !next.includes(previewSlot)) setPreviewSlot(next[0]);
      return { ...f, slots: next };
    });
  };

  // Sync previewSlot when form.slots changes externally
  useEffect(() => {
    if (form.slots.length && !form.slots.includes(previewSlot)) {
      setPreviewSlot(form.slots[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.slots]);

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`${API}/anunciante/ads`, {
        credentials: "include",
        headers: { "X-User-Id": userId },
      });
      if (r.ok) setAds(await r.json());
      else toast.error("Error al cargar anuncios");
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAds(); }, []);

  const handleSave = async () => {
    if (!form.title) { toast.error("El título es obligatorio"); return; }
    if (!form.slots.length) { toast.error("Selecciona al menos un slot"); return; }

    setIsSaving(true);
    try {
      const url = editingId ? `${API}/anunciante/ads/${editingId}` : `${API}/anunciante/ads`;
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          geo: form.geo || null,
          media_url: form.media_url || null,
          advertiser: form.advertiser || null,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Error al guardar"); }
      toast.success(editingId ? "Anuncio actualizado" : "Anuncio creado");
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setPreviewSlot(null);
      fetchAds();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (ad) => {
    const slots = ad.slots || [];
    setForm({
      tag: ad.tag || "",
      title: ad.title || "",
      body: ad.body || "",
      slots,
      media_url: ad.media_url || "",
      advertiser: ad.advertiser || "",
      geo: ad.geo || "",
      starts_at: ad.starts_at ? new Date(ad.starts_at).toISOString().slice(0, 16) : "",
      ends_at: ad.ends_at ? new Date(ad.ends_at).toISOString().slice(0, 16) : "",
    });
    setPreviewSlot(slots[0] || null);
    setEditingId(ad.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este anuncio?")) return;
    try {
      const r = await fetch(`${API}/anunciante/ads/${id}`, {
        method: "DELETE", credentials: "include",
        headers: { "X-User-Id": userId },
      });
      if (r.ok) { toast.success("Anuncio eliminado"); fetchAds(); }
      else toast.error("Error al eliminar");
    } catch { toast.error("Error de conexión"); }
  };

  const handleToggleActive = async (ad) => {
    try {
      const r = await fetch(`${API}/anunciante/ads/${ad.id}`, {
        method: "PUT", credentials: "include",
        headers: authHeaders,
        body: JSON.stringify({ active: !ad.active }),
      });
      if (r.ok) { toast.success(ad.active ? "Anuncio pausado" : "Anuncio activado"); fetchAds(); }
    } catch { toast.error("Error"); }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreviewSlot(null);
  };

  // Show preview of an existing ad
  const handlePreviewAd = (ad) => {
    setForm({
      tag: ad.tag || "",
      title: ad.title || "",
      body: ad.body || "",
      slots: ad.slots || [],
      media_url: ad.media_url || "",
      advertiser: ad.advertiser || "",
      geo: ad.geo || "",
      starts_at: "",
      ends_at: "",
    });
    setPreviewSlot((ad.slots || [])[0] || null);
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const slotLabel = (id) => SLOTS.find(s => s.id === id)?.label || id;
  const hasContent = form.title || form.tag || form.body || form.media_url;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 hidden sm:block">Consola de Anunciantes</span>
            <Button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setPreviewSlot(null); }}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Creatividad
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Formulario + Previsualización ───────────────────────── */}
        {showForm && (
          <Card className="border-0 shadow-md ring-2 ring-[#52B788]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
                  {editingId ? "Editar Anuncio" : "Nueva Creatividad"}
                </h2>
                <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Two-column: form + preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda — Formulario */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sub-col izq */}
                    <div className="flex flex-col gap-4">
                      <Field label="Etiqueta / Categoría" hint='Ej. "Publicidad", "Oferta Especial"'>
                        <input value={form.tag} onChange={e => set("tag", e.target.value)}
                          placeholder="Publicidad" className={inputCls} />
                      </Field>

                      <Field label="Título *" hint="Máximo 70 caracteres recomendados">
                        <input value={form.title} onChange={e => set("title", e.target.value)}
                          placeholder="¡Nuevos deptos desde $1.8M!" className={inputCls} maxLength={100} />
                        <p className="text-xs text-slate-400 text-right">{form.title.length}/100</p>
                      </Field>

                      <Field label="Descripción">
                        <textarea value={form.body} onChange={e => set("body", e.target.value)}
                          placeholder="Ubicación premium. Amenidades completas. Preventa exclusiva." rows={3}
                          className={`${inputCls} resize-none`} maxLength={280} />
                        <p className="text-xs text-slate-400 text-right">{form.body.length}/280</p>
                      </Field>

                      <Field label="URL de imagen (opcional)">
                        <input value={form.media_url} onChange={e => set("media_url", e.target.value)}
                          placeholder="https://..." className={inputCls} />
                      </Field>
                    </div>

                    {/* Sub-col der */}
                    <div className="flex flex-col gap-4">
                      <Field label="Slots donde aparece *" hint="Selecciona uno o más">
                        <div className="flex flex-col gap-2">
                          {SLOTS.map(slot => (
                            <button key={slot.id} type="button" onClick={() => toggleSlot(slot.id)}
                              className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                                form.slots.includes(slot.id)
                                  ? "bg-[#f0faf4] border-[#52B788] text-[#1B4332]"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}>
                              <div className="flex items-start gap-2">
                                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                  form.slots.includes(slot.id) ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"
                                }`}>
                                  {form.slots.includes(slot.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold">{slot.label}</p>
                                  <p className="text-xs text-slate-500">{slot.duration} · {slot.desc}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Anunciante / Empresa">
                        <input value={form.advertiser} onChange={e => set("advertiser", e.target.value)}
                          placeholder="Grupo Inmobiliario XYZ" className={inputCls} />
                      </Field>

                      <Field label="Segmentación geográfica" hint="Vacío = nacional">
                        <input value={form.geo} onChange={e => set("geo", e.target.value)}
                          placeholder="Ciudad de México" className={inputCls} />
                      </Field>

                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Fecha inicio">
                          <input type="datetime-local" value={form.starts_at} onChange={e => set("starts_at", e.target.value)}
                            className={inputCls} />
                        </Field>
                        <Field label="Fecha fin">
                          <input type="datetime-local" value={form.ends_at} onChange={e => set("ends_at", e.target.value)}
                            className={inputCls} />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#52B788] hover:bg-[#40916C] text-white gap-2">
                      {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Publicar anuncio"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="border-slate-300 text-slate-600">
                      Cancelar
                    </Button>
                  </div>
                </div>

                {/* Columna derecha — Previsualización en contexto */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-600">Previsualización en contexto</p>
                  </div>

                  {/* Slot tabs */}
                  {form.slots.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {form.slots.map(s => {
                        const def = SLOTS.find(sl => sl.id === s);
                        return (
                          <button key={s}
                            onClick={() => setPreviewSlot(s)}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                              previewSlot === s
                                ? "bg-[#1B4332] text-white"
                                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                            }`}>
                            {def?.label || s}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Preview or placeholder */}
                  {hasContent && previewSlot ? (
                    <SlotContextPreview slot={previewSlot} form={form} />
                  ) : !form.slots.length ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white h-64 text-slate-400">
                      <Monitor className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">Selecciona al menos un slot</p>
                      <p className="text-xs mt-1">para ver la previsualización</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white h-64 text-slate-400">
                      <Monitor className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">Escribe título o descripción</p>
                      <p className="text-xs mt-1">para ver la previsualización</p>
                    </div>
                  )}

                  {/* Slot info */}
                  {previewSlot && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                      <span className="font-semibold">
                        {SLOTS.find(s => s.id === previewSlot)?.label}:
                      </span>{" "}
                      {SLOTS.find(s => s.id === previewSlot)?.desc}
                      <span className="ml-2 text-amber-600 font-bold">
                        ({SLOTS.find(s => s.id === previewSlot)?.duration})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Listado de creatividades ────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-bold text-slate-700">Mis Creatividades</p>
              {ads.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-2.5 py-1 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] inline-block" />
                    {ads.filter(a => a.active).length} activos
                  </span>
                  {ads.filter(a => !a.active).length > 0 && (
                    <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      {ads.filter(a => !a.active).length} pausados
                    </span>
                  )}
                  <span className="text-slate-400 font-medium">
                    {ads.reduce((s, a) => s + (a.impressions || 0), 0).toLocaleString("es-MX")} impresiones totales
                  </span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="spinner" />
              </div>
            ) : ads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BarChart2 className="w-10 h-10 mb-3" />
                <p className="text-sm">Aún no tienes creatividades.</p>
                <p className="text-xs mt-1">Haz clic en "Nueva Creatividad" para comenzar.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ads.map(ad => (
                  <div key={ad.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    {/* Estado */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${ad.active ? "bg-[#52B788]" : "bg-slate-300"}`} />
                      <span className="text-xs text-slate-400">{ad.active ? "Activo" : "Pausado"}</span>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {ad.tag && (
                          <span className="text-xs font-bold text-[#52B788] uppercase tracking-wide">{ad.tag}</span>
                        )}
                        {ad.advertiser && (
                          <span className="text-xs text-slate-400">— {ad.advertiser}</span>
                        )}
                        {ad.geo && (
                          <Badge variant="secondary" className="text-xs">{ad.geo}</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 text-sm mb-1 truncate">{ad.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">{ad.body}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(ad.slots || []).map(s => (
                          <span key={s} className="text-xs bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-2 py-0.5 rounded-full">
                            {slotLabel(s)}
                          </span>
                        ))}
                      </div>
                      {(ad.starts_at || ad.ends_at) && (
                        <p className="text-xs text-slate-400 mt-1.5">
                          {ad.starts_at ? `Desde: ${new Date(ad.starts_at).toLocaleDateString("es-MX")}` : ""}
                          {ad.starts_at && ad.ends_at ? " · " : ""}
                          {ad.ends_at ? `Hasta: ${new Date(ad.ends_at).toLocaleDateString("es-MX")}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Métricas */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#1B4332]">{(ad.impressions || 0).toLocaleString("es-MX")}</p>
                      <p className="text-xs text-slate-400">impresiones</p>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => handlePreviewAd(ad)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Previsualizar">
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(ad)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] hover:bg-[#D9ED92]/30 transition-colors"
                        title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActive(ad)}
                        className={`p-1.5 rounded-lg transition-colors ${ad.active ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50" : "text-[#52B788] hover:text-[#1B4332] hover:bg-[#D9ED92]/30"}`}
                        title={ad.active ? "Pausar" : "Activar"}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ad.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info de tarifas */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white">
          <CardContent className="p-6">
            <p className="font-['Outfit'] text-base font-bold mb-3">Tarifas por impresión</p>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              {[
                { duration: "15 seg", price: "$5.00" },
                { duration: "30 seg", price: "$20.00" },
                { duration: "60 seg", price: "$30.00" },
              ].map(t => (
                <div key={t.duration} className="bg-white/10 rounded-xl py-3 px-2">
                  <p className="text-[#D9ED92] font-bold text-lg">{t.price}</p>
                  <p className="text-white/70 text-xs">por impresión</p>
                  <p className="text-white/60 text-xs mt-1">{t.duration}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/50 text-center">
              Segmentación: Local · Estatal · Nacional · Para activar campañas y gestionar facturación contacta a{" "}
              <span className="text-[#D9ED92]">anunciantes@propvalu.mx</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300";

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
    {children}
  </div>
);

export default AnunciantesConsolaPage;
