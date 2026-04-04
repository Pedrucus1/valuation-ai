import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  TrendingUp, TrendingDown, Eye, MousePointer, BarChart2, DollarSign,
  Play, Pause, Users, Megaphone, ChevronDown, Download, Search,
  CheckCircle2, Clock, XCircle, RefreshCw,
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

/* ─── Tab Campañas ────────────────────────────────────────── */
const TabCampanas = ({ campaigns, onActivar, onPausar, cargando }) => {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSlot, setFiltroSlot]     = useState("todos");

  const filtrados = campaigns.filter((c) => {
    const matchS = filtroStatus === "todos" || c.status === filtroStatus;
    const matchSl = filtroSlot === "todos" || c.slot === filtroSlot;
    return matchS && matchSl;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
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
        <span className="text-xs text-slate-400 self-center">{filtrados.length} campaña{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{cargando ? "Cargando…" : "Sin campañas con esos filtros"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map((c) => {
            const st = STATUS_CFG[c.status] || STATUS_CFG.pending;
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
            const adv = c.advertiser || {};
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#1B4332] text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400">{adv.company_name || "—"} · {adv.email || ""}</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">{SLOT_LABELS[c.slot] || c.slot} · {c.ad_duration}s</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {/* Creatividades */}
                {c.creatives_total > 0 && (
                  <div className="flex gap-3 mb-3 text-[11px]">
                    <span className="text-green-600 font-semibold">✓ {c.creatives_aprobadas} aprobadas</span>
                    {c.creatives_pendientes > 0 && (
                      <span className="text-amber-600 font-semibold">⏳ {c.creatives_pendientes} pendientes</span>
                    )}
                    <span className="text-slate-400">{c.creatives_total} total</span>
                  </div>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div>
                    <p className="font-bold text-sm text-[#1B4332]">{(c.impressions || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Impresiones</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1B4332]">{c.clicks || 0}</p>
                    <p className="text-[10px] text-slate-400">Clicks</p>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${parseFloat(ctr) >= 3 ? "text-green-600" : "text-amber-500"}`}>{ctr}%</p>
                    <p className="text-[10px] text-slate-400">CTR</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1B4332]">{fmt(c.spend || 0)}</p>
                    <p className="text-[10px] text-slate-400">Gastado</p>
                  </div>
                </div>

                {/* Budget bar */}
                <BudgetBar spend={c.spend || 0} budget={c.budget || 0} />

                {/* Fechas */}
                <p className="text-[10px] text-slate-400 mt-2">
                  Inicio: {c.start || "—"} {c.end ? `· Fin: ${c.end}` : "· Sin fecha fin"}
                </p>

                {/* Acciones */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                  {c.status === "pending" && c.creatives_aprobadas > 0 && (
                    <button onClick={() => onActivar(c.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                      <Play className="w-3.5 h-3.5" /> Activar campaña
                    </button>
                  )}
                  {c.status === "pending" && c.creatives_aprobadas === 0 && (
                    <p className="text-[11px] text-amber-600 self-center">Aprobar creatividades primero en Moderación</p>
                  )}
                  {c.status === "active" && (
                    <button onClick={() => onPausar(c.id)}
                      className="flex items-center gap-1.5 border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                      <Pause className="w-3.5 h-3.5" /> Pausar
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button onClick={() => onActivar(c.id)}
                      className="flex items-center gap-1.5 border border-green-200 text-green-700 hover:bg-green-50 text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                      <Play className="w-3.5 h-3.5" /> Reactivar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

/* ─── Componente principal ────────────────────────────────── */
const AdminAdsAnalytics = () => {
  const [tab, setTab] = useState("resumen");
  const [campaigns, setCampaigns] = useState([]);
  const [anunciantes, setAnunciantes] = useState([]);
  const [cargando, setCargando] = useState(true);

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
    try {
      await adminFetch(`/api/admin/campaigns/${id}/activar`, { method: "POST", body: JSON.stringify({}) });
      cargar();
    } catch (e) { alert("Error: " + e.message); }
  };

  const pausar = async (id) => {
    try {
      await adminFetch(`/api/admin/campaigns/${id}/pausar`, { method: "POST", body: JSON.stringify({}) });
      cargar();
    } catch (e) { alert("Error: " + e.message); }
  };

  const verCampanasDeAnunciante = (advertiser_id) => {
    setTab("campanas");
  };

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
    { id: "resumen",     label: "Resumen",      icon: BarChart2 },
    { id: "campanas",    label: `Campañas (${campaigns.length})`, icon: Megaphone },
    { id: "anunciantes", label: `Anunciantes (${anunciantes.length})`, icon: Users },
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
        {tab === "campanas"    && <TabCampanas campaigns={campaigns} onActivar={activar} onPausar={pausar} cargando={cargando} />}
        {tab === "anunciantes" && <TabAnunciantes anunciantes={anunciantes} onVerCampanas={verCampanasDeAnunciante} cargando={cargando} />}
      </div>
    </AdminLayout>
  );
};

export default AdminAdsAnalytics;
