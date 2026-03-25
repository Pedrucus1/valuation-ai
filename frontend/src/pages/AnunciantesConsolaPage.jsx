import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Plus, Edit2, Trash2, Eye, BarChart2, X, Check, Monitor,
  Megaphone, ImageIcon, TrendingUp, Calendar, MapPin, Clock,
  MousePointerClick, Layers, Activity, ChevronDown, ChevronUp,
  Send, Pause, Play, DollarSign, Target,
} from "lucide-react";
import { API } from "@/App";

// ── Slots ─────────────────────────────────────────────────────────────────────
const SLOTS = [
  { id: "comparables", label: "Busqueda de Comparables", duration: "60 seg", countdown: 60,
    desc: "Se muestra durante la busqueda de comparables con IA. Alta visibilidad.",
    contextLabel: "Buscando inmuebles comparables...", contextSub: "Analizando mercado con inteligencia artificial" },
  { id: "generation", label: "Generacion de Reporte", duration: "10 seg", countdown: 10,
    desc: "Pantalla de carga mientras se genera el HTML del avaluo.",
    contextLabel: "Generando tu avaluo profesional...", contextSub: "Aplicando metodologia de homologacion" },
  { id: "download", label: "Descarga de PDF", duration: "10 seg", countdown: 10,
    desc: "Contador regresivo antes de que el usuario descargue su reporte.",
    contextLabel: "Tu reporte esta listo!", contextSub: "Podras descargarlo en unos segundos" },
];

const TABS = [
  { id: "campanias",    label: "Campanas",      icon: Megaphone },
  { id: "creatividades",label: "Creatividades", icon: ImageIcon },
  { id: "metricas",     label: "Metricas",      icon: TrendingUp },
];

const CAMPAIGN_STATUSES = [
  { id: "all",      label: "Todas" },
  { id: "draft",    label: "Borrador",     color: "bg-slate-100 text-slate-600 border-slate-200" },
  { id: "review",   label: "En revision",  color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "approved", label: "Aprobada",      color: "bg-[#f0faf4] text-[#1B4332] border-[#b7e4c7]" },
  { id: "paused",   label: "Pausada",       color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const EMPTY_FORM = { tag: "", title: "", body: "", slots: [], media_url: "", advertiser: "", geo: "", starts_at: "", ends_at: "", campaign_id: "" };
const EMPTY_CAMPAIGN = { name: "", budget: "", starts_at: "", ends_at: "", geo: "", objective: "awareness" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN  = (n) => (n || 0).toLocaleString("es-MX");
const fmtD  = (d) => d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "--";
const ctr   = (imp, clk) => imp > 0 ? ((clk / imp) * 100).toFixed(1) + "%" : "--";

const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300";
const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
    {children}
  </div>
);

const statusBadge = (status) => {
  const s = CAMPAIGN_STATUSES.find(cs => cs.id === status);
  return s ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>{s.label}</span> : null;
};

const KpiCard = ({ label, value, sub, icon: Icon, color = "text-[#1B4332]" }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-['Outfit'] ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

const SlotBar = ({ label, value, max, color = "bg-[#52B788]" }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold text-[#1B4332]">{fmtN(value)}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.max((value / Math.max(max, 1)) * 100, value > 0 ? 4 : 0)}%` }} />
    </div>
  </div>
);

// ── Countdown ring ─────────────────────────────────────────────────────────────
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

// ── AdCardMock ─────────────────────────────────────────────────────────────────
const AdCardMock = ({ tag, title, body, media_url, slot }) => {
  const slotDef = SLOTS.find(s => s.id === slot);
  const total = slotDef?.countdown || 10;
  const [count, setCount] = useState(total);
  const timerRef = useRef(null);
  useEffect(() => {
    setCount(total);
    clearInterval(timerRef.current);
    if (total > 0) {
      timerRef.current = setInterval(() => setCount(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; }), 1000);
    }
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, title, body, tag, media_url]);
  return (
    <div className="bg-[#1B4332] rounded-2xl p-5 w-full max-w-sm mx-auto shadow-xl">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-[#D9ED92] uppercase tracking-widest">{tag || "Publicidad"}</span>
        <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
          <CountdownRing total={total} current={count} />
          <span className="absolute text-white font-bold text-xs">{count}</span>
        </div>
      </div>
      {media_url && <div className="rounded-xl overflow-hidden mb-3"><img src={media_url} alt="" className="w-full h-32 object-cover" onError={e => { e.target.style.display = "none"; }} /></div>}
      <h3 className="font-['Outfit'] text-base font-bold text-white mb-1.5 leading-snug">{title || <span className="text-white/30 italic">Titulo del anuncio</span>}</h3>
      <p className="text-white/75 text-xs leading-relaxed">{body || <span className="italic text-white/25">Descripcion aparecera aqui...</span>}</p>
      <p className="mt-3 text-[10px] text-white/30 text-center">Este espacio es un mensaje de nuestros anunciantes</p>
    </div>
  );
};

// ── SlotContextPreview ─────────────────────────────────────────────────────────
const SlotContextPreview = ({ slot, form }) => {
  const slotDef = SLOTS.find(s => s.id === slot);
  if (!slotDef) return null;
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-[#F8F9FA]">
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          {["bg-red-300","bg-yellow-300","bg-green-300"].map(c => <div key={c} className={`w-3 h-3 rounded-full ${c}`} />)}
        </div>
        <div className="flex-1 bg-slate-100 rounded-full text-xs text-slate-400 px-3 py-1 font-mono truncate">
          propvalu.mx/{slot === "comparables" ? "comparables/val_abc" : slot === "generation" ? "reporte/val_abc" : "gracias/val_abc"}
        </div>
      </div>
      <div className="bg-[#F8F9FA] px-6 py-5">
        <div className="flex items-center justify-between mb-4 opacity-40">
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-[#1B4332]" /><div className="w-16 h-3 rounded bg-slate-300" /></div>
          <div className="w-20 h-6 rounded-full bg-slate-200" />
        </div>
        <div className="flex flex-col items-center mb-5">
          {slot !== "download"
            ? <div className="w-10 h-10 rounded-full border-4 border-[#52B788] border-t-transparent animate-spin mb-3" />
            : <div className="w-10 h-10 rounded-full bg-[#52B788] flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>}
          <p className="font-['Outfit'] text-base font-bold text-[#1B4332]">{slotDef.contextLabel}</p>
          <p className="text-xs text-slate-500 mt-1">{slotDef.contextSub}</p>
        </div>
        <AdCardMock tag={form.tag} title={form.title} body={form.body} media_url={form.media_url} slot={slot} />
        <div className="mt-5 flex justify-center">
          {slot === "download"
            ? <div className="w-40 h-9 rounded-xl bg-slate-200 flex items-center justify-center"><span className="text-xs text-slate-400">Descarga en {slotDef.countdown}s...</span></div>
            : <div className="w-48 h-2 rounded-full bg-slate-200 animate-pulse" />}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: METRICAS
// ═══════════════════════════════════════════════════════════════════════════════
const TabMetricas = ({ ads, campaigns, isLoading }) => {
  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="spinner" /></div>;
  if (ads.length === 0) return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <TrendingUp className="w-10 h-10 mb-3" />
          <p className="text-sm">No hay datos de metricas aun.</p>
          <p className="text-xs mt-1">Crea tu primera creatividad para empezar a medir.</p>
        </div>
      </CardContent>
    </Card>
  );

  const totalImp  = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClk  = ads.reduce((s, a) => s + (a.clicks || 0), 0);
  const ctrGlobal = ctr(totalImp, totalClk);
  const active    = ads.filter(a => a.active).length;

  const impBySlot = SLOTS.map(sl => ({
    ...sl,
    imp: ads.filter(a => (a.slots||[]).includes(sl.id)).reduce((s,a)=>s+(a.impressions||0),0),
    clk: ads.filter(a => (a.slots||[]).includes(sl.id)).reduce((s,a)=>s+(a.clicks||0),0),
  }));
  const maxImp = Math.max(...impBySlot.map(s=>s.imp), 1);
  const maxClk = Math.max(...impBySlot.map(s=>s.clk), 1);

  const topImp = [...ads].sort((a,b)=>(b.impressions||0)-(a.impressions||0)).slice(0,5);
  const topClk = [...ads].sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,5);

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Impresiones totales" value={fmtN(totalImp)} sub="veces mostrado" icon={Layers} color="text-[#1B4332]" />
        <KpiCard label="Clicks totales"      value={fmtN(totalClk)} sub="interacciones"  icon={MousePointerClick} color="text-blue-600" />
        <KpiCard label="CTR global"           value={ctrGlobal}      sub="clicks / impresiones" icon={Activity} color="text-purple-600" />
        <KpiCard label="Creatividades activas" value={active}        sub={`de ${ads.length} totales`} icon={Eye} color="text-[#52B788]" />
      </div>

      {/* Barras por slot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#52B788]" /> Impresiones por slot
            </p>
            <div className="flex flex-col gap-3">
              {impBySlot.map(sl => <SlotBar key={sl.id} label={sl.label} value={sl.imp} max={maxImp} color="bg-[#52B788]" />)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-blue-500" /> Clicks por slot
            </p>
            <div className="flex flex-col gap-3">
              {impBySlot.map(sl => <SlotBar key={sl.id} label={sl.label} value={sl.clk} max={maxClk} color="bg-blue-400" />)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por campana */}
      {campaigns.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">Rendimiento por campana</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Campana</th>
                    <th className="text-center px-4 py-3 font-semibold">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold">Creatividades</th>
                    <th className="text-right px-4 py-3 font-semibold">Impresiones</th>
                    <th className="text-right px-4 py-3 font-semibold">Clicks</th>
                    <th className="text-right px-4 py-3 font-semibold">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{c.ads_count || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1B4332]">{fmtN(c.impressions)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{fmtN(c.clicks)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-600">{ctr(c.impressions, c.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla por creatividad */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">Rendimiento por creatividad</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Anuncio</th>
                  <th className="text-right px-4 py-3 font-semibold">Impresiones</th>
                  <th className="text-right px-4 py-3 font-semibold">Clicks</th>
                  <th className="text-right px-4 py-3 font-semibold">CTR</th>
                  <th className="text-center px-4 py-3 font-semibold">Primera imp.</th>
                  <th className="text-center px-4 py-3 font-semibold">Ultimo click</th>
                  <th className="text-center px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ads.map(ad => (
                  <tr key={ad.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800 truncate max-w-[180px]">{ad.title}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(ad.slots||[]).map(s => (
                          <span key={s} className="text-xs bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-1.5 py-0.5 rounded-full">
                            {SLOTS.find(sl=>sl.id===s)?.label || s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#1B4332]">{fmtN(ad.impressions)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{fmtN(ad.clicks)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-600">{ctr(ad.impressions, ad.clicks)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{fmtD(ad.first_impression || ad.created_at)}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{fmtD(ad.last_click)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ad.active ? "bg-[#f0faf4] text-[#1B4332] border border-[#b7e4c7]" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        {ad.active ? "Activo" : "Pausado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#52B788]" />
              <p className="text-sm font-bold text-slate-700">Top 5 por impresiones</p>
            </div>
            <div className="divide-y divide-slate-100">
              {topImp.map((ad,i) => (
                <div key={ad.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i===0?"bg-[#D9ED92] text-[#1B4332]":"bg-slate-100 text-slate-400"}`}>{i+1}</span>
                  <p className="flex-1 text-sm text-slate-700 truncate">{ad.title}</p>
                  <span className="font-bold text-[#1B4332] text-sm shrink-0">{fmtN(ad.impressions)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-bold text-slate-700">Top 5 por clicks</p>
            </div>
            <div className="divide-y divide-slate-100">
              {topClk.map((ad,i) => (
                <div key={ad.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i===0?"bg-blue-100 text-blue-700":"bg-slate-100 text-slate-400"}`}>{i+1}</span>
                  <p className="flex-1 text-sm text-slate-700 truncate">{ad.title}</p>
                  <span className="font-bold text-blue-600 text-sm shrink-0">{fmtN(ad.clicks)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarifas */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white">
        <CardContent className="p-6">
          <p className="font-['Outfit'] text-base font-bold mb-3">Tarifas por impresion</p>
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            {[{d:"15 seg",p:"$5.00"},{d:"30 seg",p:"$20.00"},{d:"60 seg",p:"$30.00"}].map(t=>(
              <div key={t.d} className="bg-white/10 rounded-xl py-3 px-2">
                <p className="text-[#D9ED92] font-bold text-lg">{t.p}</p>
                <p className="text-white/70 text-xs">por impresion</p>
                <p className="text-white/60 text-xs mt-1">{t.d}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 text-center">
            Para facturacion y activar campanas contacta a <span className="text-[#D9ED92]">anunciantes@propvalu.mx</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CAMPANAS
// ═══════════════════════════════════════════════════════════════════════════════
const TabCampanias = ({ campaigns, isLoading, onNewCampaign, onEditCampaign, onDeleteCampaign, onStatusChange, onAddCreative }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="spinner" /></div>;

  const filtered = statusFilter === "all" ? campaigns : campaigns.filter(c => c.status === statusFilter);

  if (campaigns.length === 0) return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Megaphone className="w-10 h-10 mb-3" />
          <p className="text-sm">No tienes campanas creadas.</p>
          <p className="text-xs mt-1">Crea tu primera campana para organizar tus anuncios.</p>
          <Button onClick={onNewCampaign} className="mt-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nueva Campana
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {CAMPAIGN_STATUSES.map(s => (
          <button key={s.id} onClick={() => setStatusFilter(s.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all border ${
              statusFilter === s.id
                ? "bg-[#1B4332] text-white border-[#1B4332]"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}>
            {s.label}
            {s.id !== "all" && <span className="ml-1.5 opacity-70">({campaigns.filter(c => c.status === s.id).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No hay campanas con estado "{CAMPAIGN_STATUSES.find(s=>s.id===statusFilter)?.label}"</p>
      )}

      {/* Campaign cards */}
      {filtered.map(camp => {
        const open = expandedId === camp.id;
        const campAds = camp.ads || [];
        const activeAds = campAds.filter(a => a.active).length;
        return (
          <Card key={camp.id} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Campaign header */}
              <button
                onClick={() => setExpandedId(open ? null : camp.id)}
                className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f0faf4] border border-[#b7e4c7] flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-[#1B4332]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-['Outfit'] font-bold text-slate-800">{camp.name}</p>
                    {statusBadge(camp.status)}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />{campAds.length} creatividad{campAds.length!==1?"es":""}</span>
                    {(camp.starts_at || camp.ends_at) && (
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtD(camp.starts_at)}{camp.ends_at ? ` - ${fmtD(camp.ends_at)}` : " - continua"}</span>
                    )}
                    {camp.geo && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{camp.geo}</span>}
                    {camp.budget > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />${fmtN(camp.budget)} MXN</span>}
                  </div>
                </div>
                {/* Campaign metrics */}
                <div className="flex gap-4 text-right shrink-0">
                  <div><p className="text-xl font-bold text-[#1B4332]">{fmtN(camp.impressions)}</p><p className="text-xs text-slate-400">impresiones</p></div>
                  <div><p className="text-xl font-bold text-blue-600">{fmtN(camp.clicks)}</p><p className="text-xs text-slate-400">clicks</p></div>
                  <div><p className="text-xl font-bold text-purple-600">{ctr(camp.impressions, camp.clicks)}</p><p className="text-xs text-slate-400">CTR</p></div>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-3" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-3" />}
              </button>

              {/* Expanded: actions + creatives */}
              {open && (
                <div className="border-t border-slate-100">
                  {/* Action bar */}
                  <div className="px-5 py-3 bg-slate-50 flex items-center gap-2 flex-wrap">
                    <Button size="sm" onClick={() => onAddCreative(camp.id)} className="bg-[#52B788] hover:bg-[#40916C] text-white gap-1.5 text-xs h-8">
                      <Plus className="w-3.5 h-3.5" /> Agregar creatividad
                    </Button>
                    {camp.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => onStatusChange(camp.id, "review")} className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Send className="w-3.5 h-3.5" /> Enviar a revision
                      </Button>
                    )}
                    {camp.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => onStatusChange(camp.id, "paused")} className="gap-1.5 text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Pause className="w-3.5 h-3.5" /> Pausar campana
                      </Button>
                    )}
                    {camp.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => onStatusChange(camp.id, "review")} className="gap-1.5 text-xs h-8 border-[#b7e4c7] text-[#1B4332] hover:bg-[#f0faf4]">
                        <Play className="w-3.5 h-3.5" /> Reactivar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onEditCampaign(camp)} className="gap-1.5 text-xs h-8">
                      <Edit2 className="w-3.5 h-3.5" /> Editar campana
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Eliminar campana "${camp.name}" y todas sus creatividades?`)) onDeleteCampaign(camp.id); }}
                      className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </Button>
                  </div>

                  {/* Creatives list */}
                  {campAds.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-400">
                      <p className="text-sm">Esta campana no tiene creatividades.</p>
                      <p className="text-xs mt-1">Agrega tu primera creatividad para que tu campana empiece a funcionar.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      <div className="px-5 py-2 flex items-center gap-3 text-xs text-slate-400 uppercase tracking-wide font-semibold bg-slate-50/50">
                        {activeAds > 0 && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#52B788]" />{activeAds} activa{activeAds!==1?"s":""}</span>}
                      </div>
                      {campAds.map(ad => (
                        <div key={ad.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${ad.active?"bg-[#52B788]":"bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{ad.title}</p>
                            <div className="flex gap-1.5 mt-0.5">
                              {(ad.slots||[]).map(s=><span key={s} className="text-xs bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-1.5 py-0.5 rounded-full">{SLOTS.find(sl=>sl.id===s)?.label||s}</span>)}
                            </div>
                          </div>
                          <div className="flex gap-4 text-right text-sm shrink-0">
                            <div><span className="font-bold text-[#1B4332]">{fmtN(ad.impressions)}</span><span className="text-xs text-slate-400 ml-1">imp.</span></div>
                            <div><span className="font-bold text-blue-600">{fmtN(ad.clicks)}</span><span className="text-xs text-slate-400 ml-1">clk</span></div>
                            <div><span className="font-bold text-purple-600">{ctr(ad.impressions,ad.clicks)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CREATIVIDADES
// ═══════════════════════════════════════════════════════════════════════════════
const TabCreatividades = ({ ads, campaigns, isLoading, onEdit, onDelete, onToggle, onPreview, onNew }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-0">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-bold text-slate-700">Mis Creatividades</p>
        {ads.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] inline-block" />{ads.filter(a=>a.active).length} activos
            </span>
            {ads.filter(a=>!a.active).length>0 && (
              <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{ads.filter(a=>!a.active).length} pausados
              </span>
            )}
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><div className="spinner" /></div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ImageIcon className="w-10 h-10 mb-3" />
          <p className="text-sm">Aun no tienes creatividades.</p>
          <p className="text-xs mt-1">Haz clic en "Nueva Creatividad" para comenzar.</p>
          <Button onClick={onNew} className="mt-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nueva Creatividad
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {ads.map(ad => {
            const camp = campaigns.find(c => c.id === ad.campaign_id);
            return (
              <div key={ad.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${ad.active?"bg-[#52B788]":"bg-slate-300"}`} />
                  <span className="text-xs text-slate-400">{ad.active?"Activo":"Pausado"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {ad.tag && <span className="text-xs font-bold text-[#52B788] uppercase tracking-wide">{ad.tag}</span>}
                    {camp && <span className="text-xs text-slate-400">Campana: {camp.name}</span>}
                    {ad.geo && <Badge variant="secondary" className="text-xs">{ad.geo}</Badge>}
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1 truncate">{ad.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">{ad.body}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(ad.slots||[]).map(s=>(
                      <span key={s} className="text-xs bg-[#f0faf4] border border-[#b7e4c7] text-[#1B4332] px-2 py-0.5 rounded-full">
                        {SLOTS.find(sl=>sl.id===s)?.label||s}
                      </span>
                    ))}
                  </div>
                  {(ad.starts_at||ad.ends_at) && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      {ad.starts_at?`Desde: ${new Date(ad.starts_at).toLocaleDateString("es-MX")}`:""}
                      {ad.starts_at&&ad.ends_at?" - ":""}
                      {ad.ends_at?`Hasta: ${new Date(ad.ends_at).toLocaleDateString("es-MX")}`:""}
                    </p>
                  )}
                </div>
                {/* Metrics inline */}
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-base font-bold text-[#1B4332]">{fmtN(ad.impressions)}</p>
                  <p className="text-xs text-slate-400">impresiones</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">{fmtN(ad.clicks)}</p>
                  <p className="text-xs text-slate-400">clicks</p>
                  <p className="text-xs font-semibold text-purple-600">{ctr(ad.impressions,ad.clicks)} CTR</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={()=>onPreview(ad)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Previsualizar"><Monitor className="w-4 h-4" /></button>
                  <button onClick={()=>onEdit(ad)}    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] hover:bg-[#D9ED92]/30 transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={()=>onToggle(ad)}  className={`p-1.5 rounded-lg transition-colors ${ad.active?"text-amber-400 hover:text-amber-600 hover:bg-amber-50":"text-[#52B788] hover:text-[#1B4332] hover:bg-[#D9ED92]/30"}`} title={ad.active?"Pausar":"Activar"}><Eye className="w-4 h-4" /></button>
                  <button onClick={()=>onDelete(ad.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AnunciantesConsolaPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("campanias");
  const [ads, setAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creative form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [previewSlot, setPreviewSlot] = useState(null);

  // Campaign form
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  const userId = localStorage.getItem("propvalu_user_id") || "user_local_dev";
  const authHeaders = { "Content-Type": "application/json", "X-User-Id": userId };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCamp = (k, v) => setCampaignForm(f => ({ ...f, [k]: v }));

  const toggleSlot = (slotId) => {
    setForm(f => {
      const next = f.slots.includes(slotId) ? f.slots.filter(s=>s!==slotId) : [...f.slots,slotId];
      if (next.length && !next.includes(previewSlot)) setPreviewSlot(next[0]);
      return { ...f, slots: next };
    });
  };

  useEffect(() => {
    if (form.slots.length && !form.slots.includes(previewSlot)) setPreviewSlot(form.slots[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.slots]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [adsR, campsR] = await Promise.all([
        fetch(`${API}/anunciante/ads`, { credentials: "include", headers: { "X-User-Id": userId } }),
        fetch(`${API}/anunciante/campaigns`, { credentials: "include", headers: { "X-User-Id": userId } }),
      ]);
      if (adsR.ok) setAds(await adsR.json());
      if (campsR.ok) setCampaigns(await campsR.json());
    } catch { toast.error("No se pudo conectar con el servidor"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Campaign CRUD ───────────────────────────────────────────────────────────
  const handleSaveCampaign = async () => {
    if (!campaignForm.name) { toast.error("El nombre de campana es obligatorio"); return; }
    setIsSavingCampaign(true);
    try {
      const url = editingCampaignId ? `${API}/anunciante/campaigns/${editingCampaignId}` : `${API}/anunciante/campaigns`;
      const r = await fetch(url, {
        method: editingCampaignId ? "PUT" : "POST", credentials: "include", headers: authHeaders,
        body: JSON.stringify(campaignForm),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Error"); }
      const saved = await r.json();
      toast.success(editingCampaignId ? "Campana actualizada" : "Campana creada");
      setShowCampaignForm(false); setEditingCampaignId(null); setCampaignForm(EMPTY_CAMPAIGN);

      // Si es nueva, preguntar si quiere crear creatividad
      if (!editingCampaignId) {
        await fetchAll();
        if (window.confirm("Campana creada. Quieres agregar una creatividad ahora?")) {
          handleAddCreativeToCampaign(saved.id);
        }
      } else {
        fetchAll();
      }
    } catch (e) { toast.error(e.message); }
    finally { setIsSavingCampaign(false); }
  };

  const handleEditCampaign = (camp) => {
    setCampaignForm({
      name: camp.name || "", budget: camp.budget || "",
      starts_at: camp.starts_at ? new Date(camp.starts_at).toISOString().slice(0,16) : "",
      ends_at: camp.ends_at ? new Date(camp.ends_at).toISOString().slice(0,16) : "",
      geo: camp.geo || "", objective: camp.objective || "awareness",
    });
    setEditingCampaignId(camp.id); setShowCampaignForm(true);
    setActiveTab("campanias"); window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleDeleteCampaign = async (id) => {
    try {
      const r = await fetch(`${API}/anunciante/campaigns/${id}`, { method: "DELETE", credentials: "include", headers: { "X-User-Id": userId } });
      if (r.ok) { toast.success("Campana eliminada"); fetchAll(); }
      else toast.error("Error al eliminar");
    } catch { toast.error("Error de conexion"); }
  };

  const handleCampaignStatusChange = async (id, status) => {
    try {
      const r = await fetch(`${API}/anunciante/campaigns/${id}`, {
        method: "PUT", credentials: "include", headers: authHeaders, body: JSON.stringify({ status }),
      });
      if (r.ok) { toast.success("Estado actualizado"); fetchAll(); }
    } catch { toast.error("Error"); }
  };

  const handleAddCreativeToCampaign = (campaignId) => {
    setForm({ ...EMPTY_FORM, campaign_id: campaignId });
    setShowForm(true); setEditingId(null); setPreviewSlot(null);
    setActiveTab("creatividades");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewCampaign = () => {
    setShowCampaignForm(true); setEditingCampaignId(null); setCampaignForm(EMPTY_CAMPAIGN);
    setActiveTab("campanias"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelCampaign = () => { setShowCampaignForm(false); setEditingCampaignId(null); setCampaignForm(EMPTY_CAMPAIGN); };

  // ── Creative CRUD ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title) { toast.error("El titulo es obligatorio"); return; }
    if (!form.slots.length) { toast.error("Selecciona al menos un slot"); return; }
    setIsSaving(true);
    try {
      const url = editingId ? `${API}/anunciante/ads/${editingId}` : `${API}/anunciante/ads`;
      const r = await fetch(url, {
        method: editingId?"PUT":"POST", credentials: "include", headers: authHeaders,
        body: JSON.stringify({ ...form, starts_at:form.starts_at||null, ends_at:form.ends_at||null, geo:form.geo||null, media_url:form.media_url||null, advertiser:form.advertiser||null, campaign_id:form.campaign_id||null }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error||"Error al guardar"); }
      toast.success(editingId?"Anuncio actualizado":"Anuncio creado");
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setPreviewSlot(null);
      fetchAll();
    } catch(e) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (ad) => {
    const slots = ad.slots||[];
    setForm({ tag:ad.tag||"", title:ad.title||"", body:ad.body||"", slots, media_url:ad.media_url||"", advertiser:ad.advertiser||"", geo:ad.geo||"",
      starts_at: ad.starts_at ? new Date(ad.starts_at).toISOString().slice(0,16) : "",
      ends_at:   ad.ends_at   ? new Date(ad.ends_at).toISOString().slice(0,16)   : "",
      campaign_id: ad.campaign_id || "" });
    setPreviewSlot(slots[0]||null); setEditingId(ad.id); setShowForm(true);
    setActiveTab("creatividades"); window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar este anuncio?")) return;
    try {
      const r = await fetch(`${API}/anunciante/ads/${id}`, { method:"DELETE", credentials:"include", headers:{"X-User-Id":userId} });
      if (r.ok) { toast.success("Anuncio eliminado"); fetchAll(); }
      else toast.error("Error al eliminar");
    } catch { toast.error("Error de conexion"); }
  };

  const handleToggleActive = async (ad) => {
    try {
      const r = await fetch(`${API}/anunciante/ads/${ad.id}`, {
        method:"PUT", credentials:"include", headers:authHeaders, body:JSON.stringify({ active:!ad.active }),
      });
      if (r.ok) { toast.success(ad.active?"Anuncio pausado":"Anuncio activado"); fetchAll(); }
    } catch { toast.error("Error"); }
  };

  const handleCancel = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setPreviewSlot(null); };

  const handlePreviewAd = (ad) => {
    setForm({ tag:ad.tag||"", title:ad.title||"", body:ad.body||"", slots:ad.slots||[], media_url:ad.media_url||"", advertiser:ad.advertiser||"", geo:ad.geo||"", starts_at:"", ends_at:"", campaign_id:ad.campaign_id||"" });
    setPreviewSlot((ad.slots||[])[0]||null); setEditingId(null); setShowForm(true);
    setActiveTab("creatividades"); window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleNew = () => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setPreviewSlot(null); setActiveTab("creatividades"); };

  const hasContent = form.title||form.tag||form.body||form.media_url;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={()=>navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Prop<span className="text-[#52B788]">Valu</span></span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 hidden sm:block">Consola de Anunciantes</span>
            {activeTab === "campanias" ? (
              <Button onClick={handleNewCampaign} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2">
                <Plus className="w-4 h-4" /> Nueva Campana
              </Button>
            ) : (
              <Button onClick={handleNew} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2">
                <Plus className="w-4 h-4" /> Nueva Creatividad
              </Button>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-slate-100">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab===tab.id ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Campaign form ──────────────────────────────────────────── */}
        {showCampaignForm && activeTab === "campanias" && (
          <Card className="border-0 shadow-md ring-2 ring-[#52B788]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
                  {editingCampaignId ? "Editar Campana" : "Nueva Campana"}
                </h2>
                <button onClick={handleCancelCampaign} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nombre de la campana *" hint="Ej. Primavera 2026, Lanzamiento CDMX">
                  <input value={campaignForm.name} onChange={e=>setCamp("name",e.target.value)} placeholder="Mi campana" className={inputCls} />
                </Field>
                <Field label="Presupuesto (MXN)" hint="Opcional - para tu referencia">
                  <input type="number" value={campaignForm.budget} onChange={e=>setCamp("budget",e.target.value)} placeholder="5000" className={inputCls} />
                </Field>
                <Field label="Fecha inicio">
                  <input type="datetime-local" value={campaignForm.starts_at} onChange={e=>setCamp("starts_at",e.target.value)} className={inputCls} />
                </Field>
                <Field label="Fecha fin">
                  <input type="datetime-local" value={campaignForm.ends_at} onChange={e=>setCamp("ends_at",e.target.value)} className={inputCls} />
                </Field>
                <Field label="Segmentacion geografica" hint="Vacio = nacional">
                  <input value={campaignForm.geo} onChange={e=>setCamp("geo",e.target.value)} placeholder="Ciudad de Mexico" className={inputCls} />
                </Field>
                <Field label="Objetivo">
                  <select value={campaignForm.objective} onChange={e=>setCamp("objective",e.target.value)} className={inputCls}>
                    <option value="awareness">Reconocimiento de marca</option>
                    <option value="clicks">Generar clicks</option>
                    <option value="conversions">Conversiones</option>
                  </select>
                </Field>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveCampaign} disabled={isSavingCampaign} className="bg-[#52B788] hover:bg-[#40916C] text-white gap-2">
                  {isSavingCampaign ? "Guardando..." : editingCampaignId ? "Guardar cambios" : "Crear campana"}
                </Button>
                <Button variant="outline" onClick={handleCancelCampaign} className="border-slate-300 text-slate-600">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Creative form ──────────────────────────────────────────── */}
        {showForm && activeTab === "creatividades" && (
          <Card className="border-0 shadow-md ring-2 ring-[#52B788]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">{editingId?"Editar Anuncio":"Nueva Creatividad"}</h2>
                <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4">
                      {/* Campaign selector */}
                      <Field label="Campana" hint="Asigna esta creatividad a una campana">
                        <select value={form.campaign_id} onChange={e=>set("campaign_id",e.target.value)} className={inputCls}>
                          <option value="">Sin campana asignada</option>
                          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Etiqueta / Categoria" hint='Ej. "Publicidad", "Oferta Especial"'>
                        <input value={form.tag} onChange={e=>set("tag",e.target.value)} placeholder="Publicidad" className={inputCls} />
                      </Field>
                      <Field label="Titulo *" hint="Maximo 70 caracteres recomendados">
                        <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Nuevos deptos desde $1.8M!" className={inputCls} maxLength={100} />
                        <p className="text-xs text-slate-400 text-right">{form.title.length}/100</p>
                      </Field>
                      <Field label="Descripcion">
                        <textarea value={form.body} onChange={e=>set("body",e.target.value)} placeholder="Ubicacion premium. Amenidades completas." rows={3} className={`${inputCls} resize-none`} maxLength={280} />
                        <p className="text-xs text-slate-400 text-right">{form.body.length}/280</p>
                      </Field>
                      <Field label="URL de imagen (opcional)">
                        <input value={form.media_url} onChange={e=>set("media_url",e.target.value)} placeholder="https://..." className={inputCls} />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-4">
                      <Field label="Slots donde aparece *" hint="Selecciona uno o mas">
                        <div className="flex flex-col gap-2">
                          {SLOTS.map(slot=>(
                            <button key={slot.id} type="button" onClick={()=>toggleSlot(slot.id)}
                              className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${form.slots.includes(slot.id)?"bg-[#f0faf4] border-[#52B788] text-[#1B4332]":"bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                              <div className="flex items-start gap-2">
                                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${form.slots.includes(slot.id)?"bg-[#52B788] border-[#52B788]":"border-slate-300"}`}>
                                  {form.slots.includes(slot.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div><p className="text-xs font-semibold">{slot.label}</p><p className="text-xs text-slate-500">{slot.duration} - {slot.desc}</p></div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Anunciante / Empresa">
                        <input value={form.advertiser} onChange={e=>set("advertiser",e.target.value)} placeholder="Grupo Inmobiliario XYZ" className={inputCls} />
                      </Field>
                      <Field label="Segmentacion geografica" hint="Vacio = nacional">
                        <input value={form.geo} onChange={e=>set("geo",e.target.value)} placeholder="Ciudad de Mexico" className={inputCls} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Fecha inicio"><input type="datetime-local" value={form.starts_at} onChange={e=>set("starts_at",e.target.value)} className={inputCls} /></Field>
                        <Field label="Fecha fin"><input type="datetime-local" value={form.ends_at} onChange={e=>set("ends_at",e.target.value)} className={inputCls} /></Field>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#52B788] hover:bg-[#40916C] text-white gap-2">
                      {isSaving?"Guardando...":editingId?"Guardar cambios":"Publicar anuncio"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="border-slate-300 text-slate-600">Cancelar</Button>
                  </div>
                </div>
                {/* Preview */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-slate-400" /><p className="text-sm font-bold text-slate-600">Previsualizacion en contexto</p></div>
                  {form.slots.length>0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {form.slots.map(s=>{
                        const def=SLOTS.find(sl=>sl.id===s);
                        return <button key={s} onClick={()=>setPreviewSlot(s)}
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${previewSlot===s?"bg-[#1B4332] text-white":"bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                          {def?.label||s}
                        </button>;
                      })}
                    </div>
                  )}
                  {hasContent && previewSlot
                    ? <SlotContextPreview slot={previewSlot} form={form} />
                    : <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white h-64 text-slate-400">
                        <Monitor className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">{!form.slots.length?"Selecciona al menos un slot":"Escribe titulo o descripcion"}</p>
                        <p className="text-xs mt-1">para ver la previsualizacion</p>
                      </div>
                  }
                  {previewSlot && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                      <span className="font-semibold">{SLOTS.find(s=>s.id===previewSlot)?.label}:</span>{" "}
                      {SLOTS.find(s=>s.id===previewSlot)?.desc}
                      <span className="ml-2 text-amber-600 font-bold">({SLOTS.find(s=>s.id===previewSlot)?.duration})</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "campanias"     && <TabCampanias campaigns={campaigns} isLoading={isLoading} onNewCampaign={handleNewCampaign} onEditCampaign={handleEditCampaign} onDeleteCampaign={handleDeleteCampaign} onStatusChange={handleCampaignStatusChange} onAddCreative={handleAddCreativeToCampaign} />}
        {activeTab === "creatividades" && <TabCreatividades ads={ads} campaigns={campaigns} isLoading={isLoading} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleActive} onPreview={handlePreviewAd} onNew={handleNew} />}
        {activeTab === "metricas"      && <TabMetricas ads={ads} campaigns={campaigns} isLoading={isLoading} />}
      </div>
    </div>
  );
};

export default AnunciantesConsolaPage;
