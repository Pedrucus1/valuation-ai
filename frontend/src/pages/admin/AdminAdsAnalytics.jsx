import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { API } from "@/App";
import {
  TrendingUp, TrendingDown, Eye, MousePointer, BarChart2, DollarSign,
  Play, Pause, Users, Megaphone, ChevronDown, Download, Search,
  CheckCircle2, Clock, XCircle, RefreshCw, ShieldAlert, Image, AlertTriangle, X, MessageSquare,
  Ban, Plus, Save, Globe, Type,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

const SLOT_LABELS = {
  slot1: "Slot 1 · Comparables",
  slot2: "Slot 2 · Generación IA",
  slot3: "Slot 3 · Antes de descarga",
};

const STATUS_CFG = {
  active:   { label: "Activa",    cls: "bg-green-100 text-green-700" },
  pending:  { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  paused:   { label: "Pausada",   cls: "bg-slate-100 text-slate-500" },
  rejected: { label: "Rechazada", cls: "bg-red-100 text-red-600" },
  expired:  { label: "Vencida",   cls: "bg-slate-100 text-slate-400" },
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const MiniBar = ({ datos = [], color }) => {
  const max = Math.max(...datos, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {datos.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div className="rounded-sm" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
};

const BudgetBar = ({ spend = 0, budget = 0 }) => {
  const pct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#52B788";
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>Gastado: <strong className="text-slate-600">{fmt(spend)}</strong></span>
        <span>Total: <strong className="text-slate-600">{fmt(budget)}</strong></span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-right text-[10px] text-slate-400 mt-0.5">{pct}% consumido</div>
    </div>
  );
};

/* ─── Tab Resumen ─────────────────────────────────────────── */
const TabResumen = ({ campaigns, anunciantes }) => {
  const activas   = campaigns.filter((c) => c.status === "active");
  const pendientes = campaigns.filter((c) => c.status === "pending");
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalImp  = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClk  = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const ctr       = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(1) : "0.0";

  const bySlot = ["slot1", "slot2", "slot3"].map((slot) => {
    const slotCamps = activas.filter((c) => c.slot === slot);
    return {
      slot,
      campanas: slotCamps.length,
      impressions: slotCamps.reduce((s, c) => s + (c.impressions || 0), 0),
      spend: slotCamps.reduce((s, c) => s + (c.spend || 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Campañas activas",    val: activas.length,           icon: Megaphone,    color: "bg-green-100 text-green-600" },
          { label: "Campañas pendientes", val: pendientes.length,        icon: Clock,        color: "bg-amber-100 text-amber-600" },
          { label: "Anunciantes",         val: anunciantes.length,       icon: Users,        color: "bg-blue-100 text-blue-600" },
          { label: "Impresiones totales", val: totalImp.toLocaleString(),icon: Eye,          color: "bg-purple-100 text-purple-600" },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Ingresos / CTR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 col-span-2">
          <p className="font-semibold text-[#1B4332] text-sm mb-4">Presupuesto total</p>
          <BudgetBar spend={totalSpend} budget={totalBudget} />
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div>
              <p className="font-bold text-[#1B4332]">{fmt(totalBudget)}</p>
              <p className="text-[11px] text-slate-400">Invertido (total)</p>
            </div>
            <div>
              <p className="font-bold text-[#1B4332]">{fmt(totalSpend)}</p>
              <p className="text-[11px] text-slate-400">Gastado</p>
            </div>
            <div>
              <p className="font-bold text-[#1B4332]">{fmt(totalBudget - totalSpend)}</p>
              <p className="text-[11px] text-slate-400">Disponible</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-4">Engagement</p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-slate-400">CTR promedio</p>
              <p className={`font-bold text-xl ${parseFloat(ctr) >= 3 ? "text-green-600" : "text-amber-500"}`}>{ctr}%</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Clicks totales</p>
              <p className="font-bold text-xl text-[#1B4332]">{totalClk.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Por slot */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="font-semibold text-[#1B4332] text-sm mb-4">Rendimiento por slot</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {bySlot.map(({ slot, campanas, impressions, spend }) => (
            <div key={slot} className="border border-slate-100 rounded-xl p-4">
              <p className="font-semibold text-[#1B4332] text-xs mb-3">{SLOT_LABELS[slot]}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-bold text-sm text-[#1B4332]">{campanas}</p>
                  <p className="text-[10px] text-slate-400">Campañas</p>
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1B4332]">{impressions.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Impr.</p>
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1B4332]">{fmt(spend)}</p>
                  <p className="text-[10px] text-slate-400">Gastado</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Tarjeta de campaña con moderación inline ──────────────── */
const CampanaCard = ({ c, onActivar, onPausar, onReload }) => {
  const [expandido, setExpandido]     = useState(false);
  const [modalRechazo, setModalRechazo] = useState(null); // { creative_id }
  const [motivo, setMotivo]           = useState("");
  const [procesando, setProcesando]   = useState(null);

  const backendBase = (API || "").replace("/api", "");
  const st  = STATUS_CFG[c.status] || STATUS_CFG.pending;
  const adv = c.advertiser || {};
  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
  const creatives = c.creatives || [];
  const hayFlags  = c.flags && c.flags.length > 0;

  const accionCreative = async (creativeId, tipo, mot = "") => {
    setProcesando(creativeId);
    try {
      const path = `/api/admin/campaigns/${c.id}/creatives/${creativeId}/${tipo}`;
      await adminFetch(path, { method: "POST", body: JSON.stringify({ motivo: mot }) });
      onReload();
    } catch (e) { alert("Error: " + e.message); }
    setProcesando(null);
    setModalRechazo(null);
  };

  const statusBorderCls = {
    aprobado:           "border-2 border-green-400",
    pendiente_revision: "border-2 border-amber-400",
    rechazado:          "border-2 border-red-400 opacity-60",
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${hayFlags ? "border-red-200" : "border-slate-100"}`}>
      <div className="p-5">

        {/* Alerta blacklist */}
        {hayFlags && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <span className="font-bold">Alerta blacklist: </span>
              {c.flags.map((f) => f.replace("dominio_bl:", "dominio: ").replace("palabra_bl:", "palabra: ")).join(" · ")}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="font-bold text-[#1B4332] text-base leading-snug">{c.name}</p>
            <p className="text-sm text-slate-500 mt-0.5">{adv.company_name || "—"} · {adv.email || ""}</p>
            <p className="text-sm text-slate-400 mt-0.5">{SLOT_LABELS[c.slot] || c.slot} · {c.ad_duration}s</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${st.cls}`}>
            {st.label}
          </span>
        </div>

        {/* Tira de miniaturas */}
        {creatives.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Creatividades · {c.creatives_aprobadas} aprobadas
              {c.creatives_pendientes > 0 && <span className="text-amber-500 ml-2">· {c.creatives_pendientes} pendientes</span>}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {creatives.map((cr) => {
                const src = cr.file_url ? `${backendBase}${cr.file_url}` : null;
                const borderCls = statusBorderCls[cr.status] || "border border-slate-200";
                return (
                  <div key={cr.id} className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-slate-50 ${borderCls}`}>
                    {src ? (
                      cr.file_type === "video"
                        ? <video src={src} className="w-full h-full object-cover" muted />
                        : <img src={src} alt={cr.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Image className="w-6 h-6" />
                      </div>
                    )}
                    {/* Badge de estado sobre la miniatura */}
                    <div className="absolute bottom-0 left-0 right-0 text-center">
                      {cr.status === "aprobado" && (
                        <span className="bg-green-500 text-white text-[9px] font-bold px-1 block">✓</span>
                      )}
                      {cr.status === "pendiente_revision" && (
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1 block">?</span>
                      )}
                      {cr.status === "rechazado" && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1 block">✗</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-center bg-slate-50 rounded-xl p-3">
          <div>
            <p className="font-bold text-base text-[#1B4332]">{(c.impressions || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Impresiones</p>
          </div>
          <div>
            <p className="font-bold text-base text-[#1B4332]">{c.clicks || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Clicks</p>
          </div>
          <div>
            <p className={`font-bold text-base ${parseFloat(ctr) >= 3 ? "text-green-600" : "text-amber-500"}`}>{ctr}%</p>
            <p className="text-xs text-slate-400 mt-0.5">CTR</p>
          </div>
          <div>
            <p className="font-bold text-base text-[#1B4332]">{fmt(c.spend || 0)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Gastado</p>
          </div>
        </div>

        {/* Budget bar */}
        <BudgetBar spend={c.spend || 0} budget={c.budget || 0} />

        {/* Fechas + enlace */}
        <div className="mt-3 text-xs text-slate-400 space-y-0.5">
          <p>Inicio: <span className="text-slate-600">{c.start || "—"}</span>{c.end ? <> · Fin: <span className="text-slate-600">{c.end}</span></> : " · Sin fecha fin"}</p>
          {c.link_url && (
            <p>Enlace: <span className="text-blue-500 truncate">{c.link_url}</span></p>
          )}
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
          {c.status === "pending" && c.creatives_aprobadas > 0 && (
            <button onClick={() => onActivar(c.id)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Play className="w-4 h-4" /> Activar campaña
            </button>
          )}
          {c.status === "pending" && c.creatives_aprobadas === 0 && (
            <p className="text-sm text-amber-600 self-center">Aprueba al menos una creatividad para activar</p>
          )}
          {c.status === "active" && (
            <button onClick={() => onPausar(c.id)}
              className="flex items-center gap-1.5 border border-amber-200 text-amber-700 hover:bg-amber-50 text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Pause className="w-4 h-4" /> Pausar
            </button>
          )}
          {c.status === "paused" && (
            <button onClick={() => onActivar(c.id)}
              className="flex items-center gap-1.5 border border-green-200 text-green-700 hover:bg-green-50 text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Play className="w-4 h-4" /> Reactivar
            </button>
          )}
          {creatives.length > 0 && (
            <button onClick={() => setExpandido((v) => !v)}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ml-auto">
              <Eye className="w-4 h-4" />
              {expandido ? "Ocultar" : "Moderar creatividades"}
              {c.creatives_pendientes > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.creatives_pendientes}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Panel de moderación inline expandible */}
      {expandido && (
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500 mb-3">Todas las creatividades — haz clic para aprobar o rechazar</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creatives.map((cr) => {
              const src = cr.file_url ? `${backendBase}${cr.file_url}` : null;
              const isPending = cr.status === "pendiente_revision";
              return (
                <div key={cr.id} className={`bg-white rounded-xl border overflow-hidden ${isPending ? "border-amber-200" : "border-slate-100"}`}>
                  {/* Imagen/video */}
                  <div className="bg-slate-50 border-b border-slate-100">
                    {src ? (
                      cr.file_type === "video"
                        ? <video src={src} className="w-full max-h-48 object-contain" muted controls />
                        : <img src={src} alt={cr.name} className="w-full max-h-48 object-contain" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-slate-300">
                        <Image className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-[#1B4332] truncate">{cr.name || "Sin nombre"}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        cr.status === "aprobado"           ? "bg-green-100 text-green-700" :
                        cr.status === "pendiente_revision" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {cr.status === "aprobado" ? "Aprobada" : cr.status === "pendiente_revision" ? "Pendiente" : "Rechazada"}
                      </span>
                    </div>
                    {cr.motivo_rechazo && (
                      <p className="text-xs text-red-500 mb-2">Motivo: {cr.motivo_rechazo}</p>
                    )}
                    <p className="text-xs text-slate-400 mb-3">{cr.file_type === "video" ? "Video" : "Imagen"} · {cr.uploaded_at?.split("T")[0] || "—"}</p>
                    {(isPending || cr.status === "rechazado") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => accionCreative(cr.id, "aprobar")}
                          disabled={procesando === cr.id}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <button
                          onClick={() => { setMotivo(""); setModalRechazo({ id: cr.id }); }}
                          disabled={procesando === cr.id}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </div>
                    )}
                    {cr.status === "aprobado" && (
                      <button
                        onClick={() => { setMotivo(""); setModalRechazo({ id: cr.id }); }}
                        className="w-full text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-lg py-1.5 transition-colors"
                      >
                        Revocar aprobación
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal motivo de rechazo */}
      {modalRechazo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalRechazo(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#1B4332] text-base">Motivo de rechazo</h2>
              <button onClick={() => setModalRechazo(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
              rows={3} placeholder="Ej: El contenido no cumple con la política de anuncios…"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-red-300" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => accionCreative(modalRechazo.id, "rechazar", motivo)}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors">
                Confirmar rechazo
              </button>
              <button onClick={() => setModalRechazo(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Tab Campañas ────────────────────────────────────────── */
const TabCampanas = ({ campaigns, onActivar, onPausar, onReload, cargando }) => {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSlot, setFiltroSlot]     = useState("todos");

  const filtrados = campaigns.filter((c) => {
    const matchS = filtroStatus === "todos" || c.status === filtroStatus;
    const matchSl = filtroSlot === "todos" || c.slot === filtroSlot;
    return matchS && matchSl;
  });

  const conFlags = filtrados.filter((c) => c.flags?.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {[
          { val: filtroStatus, set: setFiltroStatus, opts: [["todos","Todos los estados"],["active","Activas"],["pending","Pendientes"],["paused","Pausadas"]] },
          { val: filtroSlot,   set: setFiltroSlot,   opts: [["todos","Todos los slots"],["slot1","Slot 1"],["slot2","Slot 2"],["slot3","Slot 3"]] },
        ].map(({ val, set, opts }, i) => (
          <div key={i} className="relative">
            <select value={val} onChange={(e) => set(e.target.value)}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        ))}
        <span className="text-sm text-slate-400">{filtrados.length} campaña{filtrados.length !== 1 ? "s" : ""}</span>
        {conFlags > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl">
            <AlertTriangle className="w-4 h-4" /> {conFlags} con alerta de blacklist
          </span>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{cargando ? "Cargando…" : "Sin campañas con esos filtros"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtrados.map((c) => (
            <CampanaCard key={c.id} c={c} onActivar={onActivar} onPausar={onPausar} onReload={onReload} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Tab Anunciantes ─────────────────────────────────────── */
const TabAnunciantes = ({ anunciantes, onVerCampanas, cargando }) => {
  const [q, setQ] = useState("");
  const filtrados = anunciantes.filter((a) =>
    !q || a.company_name?.toLowerCase().includes(q.toLowerCase()) || a.email?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar anunciante…"
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{cargando ? "Cargando…" : "Sin anunciantes registrados"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Empresa</th>
                <th className="px-5 py-3 text-left">Contacto</th>
                <th className="px-4 py-3 text-center">Campañas</th>
                <th className="px-4 py-3 text-center">Activas</th>
                <th className="px-4 py-3 text-right">Invertido</th>
                <th className="px-4 py-3 text-right">Gastado</th>
                <th className="px-4 py-3 text-center">Alta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[#1B4332] text-sm">{a.company_name}</p>
                    <p className="text-[11px] text-slate-400">{a.email}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{a.contact_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-[#1B4332]">{a.campaigns_total}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-sm ${a.campaigns_activas > 0 ? "text-green-600" : "text-slate-400"}`}>
                      {a.campaigns_activas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-[#1B4332]">{fmt(a.total_budget)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{fmt(a.total_spend)}</td>
                  <td className="px-4 py-3 text-center text-[11px] text-slate-400">
                    {a.created_at ? a.created_at.split("T")[0] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onVerCampanas(a.advertiser_id)}
                      className="text-[11px] text-[#52B788] hover:text-[#1B4332] font-semibold whitespace-nowrap">
                      Ver campañas →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Tab Moderación ──────────────────────────────────────── */
const FLAG_LABELS = {
  mayusculas_exceso:   { label: "Muchas mayúsculas",   cls: "bg-yellow-100 text-yellow-700" },
  garantias_absolutas: { label: "Garantías absolutas", cls: "bg-orange-100 text-orange-700" },
  contenido_adulto:    { label: "Contenido adulto",    cls: "bg-red-100 text-red-600" },
  spam:                { label: "Posible spam",         cls: "bg-red-100 text-red-600" },
};

const CreativeCard = ({ cr, onAccion }) => {
  const backendBase = (API || "").replace("/api", "");
  const src = cr.file_url ? `${backendBase}${cr.file_url}` : null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="font-semibold text-[#1B4332] text-sm">{cr.company_name || cr.advertiser_id}</p>
            <p className="text-xs text-slate-400">{cr.campaign_name} · {cr.name}</p>
            <p className="text-xs text-slate-300 mt-0.5">{cr.uploaded_at ? cr.uploaded_at.split("T")[0] : "-"}</p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
            {cr.file_type === "video" ? "Video" : "Imagen"}
          </span>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-slate-50">
          {src ? (
            cr.file_type === "video"
              ? <video src={src} className="w-full max-h-40 object-contain" muted controls />
              : <img src={src} alt={cr.name} className="w-full max-h-40 object-contain" />
          ) : (
            <div className="w-full h-24 flex items-center justify-center text-slate-300">
              {cr.file_type === "video" ? <Play className="w-8 h-8" /> : <Image className="w-8 h-8" />}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAccion(cr.id, "aprobar")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
            <CheckCircle2 className="w-4 h-4" /> Aprobar
          </button>
          <button onClick={() => onAccion(cr.id, "rechazar")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
            <XCircle className="w-4 h-4" /> Rechazar
          </button>
        </div>
      </div>
    </div>
  );
};

const TabModeracion = ({ campaigns, onActivar, activando, onReload }) => {
  const [creatividades, setCreatividades] = useState([]);
  const [modalCreative, setModalCreative] = useState(null);
  const [motivoCreative, setMotivoCreative] = useState("");

  const campanasListas = campaigns.filter(
    (c) => c.status === "pending" && c.creatives_aprobadas > 0 && c.creatives_pendientes === 0
  );

  const cargarCreatives = useCallback(() => {
    adminFetch("/api/admin/creatives?status=pendiente_revision")
      .then((d) => setCreatividades(d.creatives || []))
      .catch(() => {});
  }, []);

  useEffect(() => { cargarCreatives(); }, [cargarCreatives]);

  const accionCreative = (id, tipo) => {
    if (tipo === "rechazar") { setMotivoCreative(""); setModalCreative({ id }); }
    else aplicarAccion(id, "aprobar", "");
  };

  const aplicarAccion = async (id, tipo, motivo) => {
    try {
      if (tipo === "aprobar")
        await adminFetch(`/api/admin/creatives/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      else
        await adminFetch(`/api/admin/creatives/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo }) });
      cargarCreatives();
      onReload();
    } catch (e) { alert("Error: " + e.message); }
    setModalCreative(null);
  };

  return (
    <div className="space-y-6">
      {/* Campañas listas para activar */}
      {campanasListas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-green-500" />
            Campañas listas para activar — {campanasListas.length}
          </p>
          <div className="space-y-3">
            {campanasListas.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1B4332] text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.advertiser?.company_name || "—"} · {c.slot} · {c.ad_duration}s</p>
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                    ✓ {c.creatives_aprobadas} creatividad{c.creatives_aprobadas !== 1 ? "es" : ""} aprobada{c.creatives_aprobadas !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => onActivar(c.id)} disabled={activando === c.id}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                  <Play className="w-3.5 h-3.5" />
                  {activando === c.id ? "Activando…" : "Activar campaña"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creatividades pendientes */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Creatividades pendientes — {creatividades.length}
        </p>
        {creatividades.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creatividades.map((cr) => (
              <CreativeCard key={cr.id} cr={cr} onAccion={accionCreative} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
            <p className="text-sm">Sin creatividades pendientes</p>
          </div>
        )}
      </div>

      {/* Modal rechazo */}
      {modalCreative && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModalCreative(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <textarea value={motivoCreative} onChange={(e) => setMotivoCreative(e.target.value)}
              rows={3} placeholder="Ej: El contenido no cumple con la política de anuncios..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => aplicarAccion(modalCreative.id, "rechazar", motivoCreative)}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors">
                Confirmar rechazo
              </button>
              <button onClick={() => setModalCreative(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Tab Blacklist ───────────────────────────────────────── */
const PALABRAS_DEFAULT = [
  "garantizado","garantizamos","100% seguro","sin riesgo","gana dinero fácil",
  "inversión garantizada","rendimiento asegurado","paga cero impuestos",
  "lavado de dinero","prestamista particular","dinero urgente","sin buró",
  "COMPRA YA","LLAMA AHORA","GRATIS GRATIS","¡¡¡","???",
];
const DOMINIOS_DEFAULT = ["bit.ly","tinyurl.com","ow.ly","t.co","goo.gl","scam-inmuebles.mx","fraude-realty.com"];

const TabBlacklist = () => {
  const [palabras, setPalabras] = useState(PALABRAS_DEFAULT);
  const [dominios, setDominios] = useState(DOMINIOS_DEFAULT);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [nuevoDominio, setNuevoDominio] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [testTexto, setTestTexto] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/blacklist")
      .then((d) => {
        if (d.palabras?.length) setPalabras(d.palabras);
        if (d.dominios?.length) setDominios(d.dominios);
      }).catch(() => {});
  }, []);

  const addPalabra = () => {
    const v = nuevaPalabra.trim().toLowerCase();
    if (!v || palabras.includes(v)) return;
    setPalabras((p) => [...p, v]); setNuevaPalabra(""); setCambios(true);
  };
  const addDominio = () => {
    const v = nuevoDominio.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!v || dominios.includes(v)) return;
    setDominios((p) => [...p, v]); setNuevoDominio(""); setCambios(true);
  };
  const guardar = async () => {
    try {
      await adminFetch("/api/admin/blacklist", { method: "PUT", body: JSON.stringify({ palabras, dominios }) });
      setGuardado(true); setCambios(false); setTimeout(() => setGuardado(false), 3000);
    } catch (e) { alert("Error: " + e.message); }
  };

  const matchesPalabra = testTexto ? palabras.filter((p) => testTexto.toLowerCase().includes(p.toLowerCase())) : [];
  const matchesDominio = testTexto ? dominios.filter((d) => testTexto.toLowerCase().includes(d.toLowerCase())) : [];
  const testOk = testTexto && matchesPalabra.length === 0 && matchesDominio.length === 0;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Palabras y dominios que activan revisión manual en moderación. No bloquean el anuncio directamente.</p>
        <button onClick={guardar} disabled={!cambios}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          <Save className="w-4 h-4" /> {cambios ? "Guardar" : "Sin cambios"}
        </button>
      </div>
      {guardado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-semibold">Blacklist actualizada</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Palabras */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-[#1B4332]" />
            <h2 className="font-semibold text-[#1B4332] text-sm">Palabras y frases ({palabras.length})</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={nuevaPalabra} onChange={(e) => setNuevaPalabra(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPalabra()} placeholder="Agregar frase..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
            <button onClick={addPalabra} className="bg-[#1B4332] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#163828] transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
            {palabras.map((p) => (
              <span key={p} className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                {p}
                <button onClick={() => { setPalabras((x) => x.filter((y) => y !== p)); setCambios(true); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        {/* Dominios */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#1B4332]" />
            <h2 className="font-semibold text-[#1B4332] text-sm">Dominios bloqueados ({dominios.length})</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={nuevoDominio} onChange={(e) => setNuevoDominio(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDominio()} placeholder="ej: bit.ly"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
            <button onClick={addDominio} className="bg-[#1B4332] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#163828] transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {dominios.map((d) => (
              <div key={d} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-sm font-mono text-orange-700">{d}</span>
                </div>
                <button onClick={() => { setDominios((x) => x.filter((y) => y !== d)); setCambios(true); }}>
                  <X className="w-4 h-4 text-orange-300 hover:text-orange-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Tester */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-[#1B4332] text-sm mb-3">Probador — verifica si un texto sería marcado</h2>
        <textarea value={testTexto} onChange={(e) => setTestTexto(e.target.value)} rows={3}
          placeholder="Pega aquí el texto de un anuncio para verificar..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
        {testTexto && (
          <div className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${testOk ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {testOk ? <><CheckCircle2 className="w-4 h-4 mt-0.5" /> Pasaría la revisión sin flags.</> : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Sería marcado para revisión:</p>
                  {matchesPalabra.length > 0 && <p className="text-xs mt-1"><strong>Palabras:</strong> {matchesPalabra.map((p) => <span key={p} className="bg-red-200 px-1 rounded mr-1">{p}</span>)}</p>}
                  {matchesDominio.length > 0 && <p className="text-xs mt-1"><strong>Dominios:</strong> {matchesDominio.map((d) => <span key={d} className="bg-orange-200 px-1 rounded mr-1 font-mono">{d}</span>)}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Componente principal ────────────────────────────────── */
const AdminAdsAnalytics = () => {
  const [tab, setTab] = useState("resumen");
  const [campaigns, setCampaigns] = useState([]);
  const [anunciantes, setAnunciantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [activando, setActivando] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([
      adminFetch("/api/admin/campaigns").then((d) => setCampaigns(d.campaigns || [])),
      adminFetch("/api/admin/anunciantes").then((d) => setAnunciantes(d.anunciantes || [])),
    ])
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const activar = async (id) => {
    setActivando(id);
    try {
      await adminFetch(`/api/admin/campaigns/${id}/activar`, { method: "POST", body: JSON.stringify({}) });
      cargar();
    } catch (e) { alert("Error: " + e.message); }
    setActivando(null);
  };

  const pausar = async (id) => {
    try {
      await adminFetch(`/api/admin/campaigns/${id}/pausar`, { method: "POST", body: JSON.stringify({}) });
      cargar();
    } catch (e) { alert("Error: " + e.message); }
  };

  const verCampanasDeAnunciante = () => { setTab("campanas"); };

  const pendingMod = campaigns.filter(
    (c) => c.status === "pending" && c.creatives_aprobadas > 0 && c.creatives_pendientes === 0
  ).length;

  const descargarCSV = () => {
    const cols = ["ID", "Campaña", "Anunciante", "Slot", "Duración", "Status", "Impresiones", "Clicks", "Gastado", "Presupuesto", "Inicio", "Fin"];
    const rows = campaigns.map((c) =>
      [c.id, c.name, c.advertiser?.company_name || "", c.slot, c.ad_duration,
       c.status, c.impressions || 0, c.clicks || 0, c.spend || 0, c.budget || 0, c.start || "", c.end || ""].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_Campanas_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: "resumen",      label: "Resumen",                                                        icon: BarChart2  },
    { id: "campanas",     label: `Campañas (${campaigns.length})`,                                 icon: Megaphone  },
    { id: "anunciantes",  label: `Anunciantes (${anunciantes.length})`,                            icon: Users      },
    { id: "moderacion",   label: pendingMod > 0 ? `Moderación (${pendingMod})` : "Moderación",    icon: ShieldAlert },
    { id: "blacklist",    label: "Blacklist",                                                       icon: Ban        },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Panel de Publicidad</h1>
            <p className="text-slate-400 text-sm mt-0.5">Campañas, anunciantes y métricas en tiempo real</p>
          </div>
          <div className="flex gap-2">
            <button onClick={cargar} disabled={cargando}
              className="flex items-center gap-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm px-3 py-2 rounded-xl transition-colors">
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            </button>
            <button onClick={descargarCSV}
              className="flex items-center gap-2 border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === id ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "resumen"     && <TabResumen campaigns={campaigns} anunciantes={anunciantes} />}
        {tab === "campanas"    && <TabCampanas campaigns={campaigns} onActivar={activar} onPausar={pausar} onReload={cargar} cargando={cargando} />}
        {tab === "anunciantes" && <TabAnunciantes anunciantes={anunciantes} onVerCampanas={verCampanasDeAnunciante} cargando={cargando} />}
        {tab === "moderacion"  && <TabModeracion campaigns={campaigns} onActivar={activar} activando={activando} onReload={cargar} />}
        {tab === "blacklist"   && <TabBlacklist />}
      </div>
    </AdminLayout>
  );
};

export default AdminAdsAnalytics;
