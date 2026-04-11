import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Building2, Users, ShieldCheck, BarChart2, CreditCard,
  Search, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Clock, MapPin, Mail, Phone, AlertTriangle, Activity,
  Eye, FileText, Send, Download, Star,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const KYC_CFG = {
  approved: { label: "Aprobada",  cls: "bg-green-100 text-green-700" },
  pending:  { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rechazada", cls: "bg-red-100 text-red-600"   },
};
const ESTADO_CFG = {
  activo:     { label: "Activa",     cls: "bg-green-100 text-green-700" },
  suspendido: { label: "Suspendida", cls: "bg-red-100 text-red-600"   },
};

const Chip = ({ cfg }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg?.cls || "bg-slate-100 text-slate-500"}`}>
    {cfg?.label || "—"}
  </span>
);

/* ─── KPI card ─── */
const KpiCard = ({ icon: Icon, label, val, color, alerta }) => (
  <div className={`bg-white rounded-2xl border p-5 ${alerta ? "border-amber-200" : "border-slate-100"}`}>
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
  </div>
);

/* ─── Tab Resumen ─── */
const TabResumen = ({ inmobiliarias }) => {
  const total      = inmobiliarias.length;
  const aprobadas  = inmobiliarias.filter((r) => r.kyc_status === "approved").length;
  const pendientes = inmobiliarias.filter((r) => r.kyc_status === "pending").length;
  const creditos   = inmobiliarias.reduce((s, r) => s + (r.credits || 0), 0);
  const avaluosMes = inmobiliarias.reduce((s, r) => s + (r.avaluos_mes || 0), 0);
  const avaluosTotal = inmobiliarias.reduce((s, r) => s + (r.total_avaluos || 0), 0);

  const top5 = [...inmobiliarias]
    .sort((a, b) => (b.total_avaluos || 0) - (a.total_avaluos || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Building2}   label="Empresas registradas" val={total}            color="bg-blue-100 text-blue-600" />
        <KpiCard icon={ShieldCheck} label="Empresas aprobadas"   val={aprobadas}        color="bg-green-100 text-green-600" />
        <KpiCard icon={Clock}       label="Pendientes de revisión" val={pendientes}     color="bg-amber-100 text-amber-600" alerta={pendientes > 0} />
        <KpiCard icon={CreditCard}  label="Créditos en circulación" val={creditos}      color="bg-purple-100 text-purple-600" />
        <KpiCard icon={BarChart2}   label="Avalúos este mes"     val={avaluosMes}       color="bg-[#52B788]/20 text-[#1B4332]" />
        <KpiCard icon={FileText}    label="Avalúos histórico"    val={avaluosTotal}     color="bg-slate-100 text-slate-600" />
      </div>

      {/* Top empresas por actividad */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="font-semibold text-[#1B4332] text-sm mb-4">Top empresas por avalúos</p>
        {top5.length === 0 ? (
          <p className="text-sm text-slate-400">Sin datos aún.</p>
        ) : (
          <div className="space-y-3">
            {top5.map((r) => {
              const max = top5[0]?.total_avaluos || 1;
              const pct = Math.round(((r.total_avaluos || 0) / max) * 100);
              return (
                <div key={r.user_id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1B4332]">{r.company_name || r.email}</span>
                    <span className="text-slate-400">{r.total_avaluos || 0} avalúos</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#52B788] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Fila expandible de empresa ─── */
const FilaEmpresa = ({ r, onNotificar, onKYC }) => {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [notaModal, setNotaModal] = useState(false);
  const [notaMsj, setNotaMsj] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarDetalle = async () => {
    if (detalle) return;
    setCargandoDet(true);
    try {
      const d = await adminFetch(`/api/admin/inmobiliarias/${r.user_id}`);
      setDetalle(d);
    } catch { /* silencioso */ }
    setCargandoDet(false);
  };

  const toggleAbierto = () => {
    if (!abierto) cargarDetalle();
    setAbierto((v) => !v);
  };

  const enviarNota = async () => {
    if (!notaMsj.trim()) return;
    setEnviando(true);
    try {
      await adminFetch(`/api/admin/inmobiliarias/${r.user_id}/notificar`, {
        method: "POST",
        body: JSON.stringify({ mensaje: notaMsj, tipo: "info" }),
      });
      setNotaModal(false);
      setNotaMsj("");
      onNotificar?.();
    } catch (e) { alert("Error: " + e.message); }
    setEnviando(false);
  };

  const creditsLow = (r.credits ?? 0) <= 2;

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={toggleAbierto}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D9ED92]/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-[#1B4332]" />
            </div>
            <div>
              <p className="font-semibold text-[#1B4332] text-sm">{r.company_name || r.name || "—"}</p>
              <p className="text-[11px] text-slate-400">{r.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {[r.municipio, r.estado].filter(Boolean).join(", ") || "—"}
        </td>
        <td className="px-4 py-3">
          <Chip cfg={KYC_CFG[r.kyc_status] || { label: "Sin verificación", cls: "bg-slate-100 text-slate-400" }} />
        </td>
        <td className="px-4 py-3">
          <Chip cfg={ESTADO_CFG[r.cuenta_estado] || ESTADO_CFG.activo} />
        </td>
        <td className="px-4 py-3 text-sm text-slate-700 text-center">
          <span className={creditsLow ? "text-red-600 font-bold" : ""}>{r.credits ?? 0}</span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 text-center">{r.avaluos_mes ?? 0}</td>
        <td className="px-4 py-3 text-sm text-slate-400">{fmtFecha(r.created_at)}</td>
        <td className="px-4 py-3 text-right">
          {abierto ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={8} className="bg-slate-50 border-t border-slate-100 px-4 py-4">
            {cargandoDet ? (
              <p className="text-sm text-slate-400 py-4 text-center">Cargando detalle…</p>
            ) : (
              <div className="space-y-4">
                {/* Info básica */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Contacto</p>
                    <p className="font-medium text-[#1B4332]">{r.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Teléfono</p>
                    <p className="font-medium text-[#1B4332]">{r.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Asociación</p>
                    <p className="font-medium text-[#1B4332]">{r.asociacion || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Total avalúos</p>
                    <p className="font-medium text-[#1B4332]">{r.total_avaluos ?? 0}</p>
                  </div>
                </div>

                {/* Últimas valuaciones */}
                {detalle?.valuaciones?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Últimas valuaciones</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Dirección</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Estado</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Valor</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {detalle.valuaciones.map((v) => (
                            <tr key={v.valuation_id} className="bg-white">
                              <td className="px-3 py-2 text-slate-700">
                                {v.property_data?.street
                                  ? `${v.property_data.street}, ${v.property_data.municipio || ""}`
                                  : v.valuation_id?.slice(-8)}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  v.status === "completed" ? "bg-green-100 text-green-700" :
                                  v.status === "draft"     ? "bg-slate-100 text-slate-500" :
                                  "bg-amber-100 text-amber-600"
                                }`}>{v.status}</span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#1B4332]">
                                {v.final_value ? fmt(v.final_value) : "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-400">{fmtFecha(v.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setNotaModal(true); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar nota interna
                  </button>
                  {r.kyc_status === "pending" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onKYC(r.user_id, "aprobar"); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar verificación
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onKYC(r.user_id, "rechazar"); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar verificación
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}

      {/* Modal nota interna */}
      {notaModal && (
        <tr>
          <td colSpan={8}>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNotaModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-lg mb-1">Nota interna</h3>
                <p className="text-xs text-slate-400 mb-4">Para: {r.company_name || r.email}</p>
                <textarea
                  value={notaMsj}
                  onChange={(e) => setNotaMsj(e.target.value)}
                  placeholder="Escribe tu nota aquí…"
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#52B788]"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setNotaModal(false)} className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700">Cancelar</button>
                  <button
                    onClick={enviarNota}
                    disabled={enviando || !notaMsj.trim()}
                    className="text-sm font-semibold px-4 py-2 bg-[#1B4332] text-white rounded-xl hover:bg-[#40916C] disabled:opacity-50 transition-colors"
                  >
                    {enviando ? "Enviando…" : "Guardar nota"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/* ─── Tab Empresas ─── */
const TabEmpresas = ({ inmobiliarias, onReload }) => {
  const [q, setQ]           = useState("");
  const [filtroKyc, setFiltroKyc] = useState("todos");

  const filtradas = inmobiliarias.filter((r) => {
    const matchQ = !q || [r.company_name, r.email, r.name].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchK = filtroKyc === "todos" || r.kyc_status === filtroKyc;
    return matchQ && matchK;
  });

  const handleKYC = async (userId, accion) => {
    try {
      await adminFetch(`/api/admin/kyc/${userId}/${accion}`, { method: "POST", body: JSON.stringify({}) });
      onReload();
    } catch (e) { alert("Error: " + e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa, email…"
            className="text-sm flex-1 outline-none bg-transparent"
          />
        </div>
        <select
          value={filtroKyc}
          onChange={(e) => setFiltroKyc(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none"
        >
          <option value="todos">Todas las verificaciones</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Empresa</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Ubicación</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Verificación</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Estado</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Créditos</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Avalúos/mes</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Alta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Sin resultados</td>
                </tr>
              ) : (
                filtradas.map((r) => (
                  <FilaEmpresa key={r.user_id} r={r} onNotificar={onReload} onKYC={handleKYC} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Tab Nuevas Altas ─── */
const TabNuevasAltas = ({ inmobiliarias, onReload }) => {
  const pendientes = inmobiliarias
    .filter((r) => r.kyc_status === "pending")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleKYC = async (userId, accion) => {
    try {
      await adminFetch(`/api/admin/kyc/${userId}/${accion}`, { method: "POST", body: JSON.stringify({}) });
      onReload();
    } catch (e) { alert("Error: " + e.message); }
  };

  if (pendientes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="font-semibold text-[#1B4332]">Todo al día</p>
        <p className="text-sm text-slate-400 mt-1">No hay empresas pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{pendientes.length} empresa{pendientes.length !== 1 ? "s" : ""} esperando verificación</p>
      {pendientes.map((r) => (
        <div key={r.user_id} className="bg-white rounded-2xl border border-amber-100 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1B4332]">{r.company_name || r.name || "Sin nombre"}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                  {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                  {(r.municipio || r.estado) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[r.municipio, r.estado].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Alta: {fmtFecha(r.created_at)}</span>
                </div>
                {r.asociacion && (
                  <p className="text-xs text-slate-400 mt-1">Asociación: {r.asociacion}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleKYC(r.user_id, "aprobar")}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprobar
              </button>
              <button
                onClick={() => handleKYC(r.user_id, "rechazar")}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Rechazar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Tab Actividad ─── */
const TabActividad = ({ cargandoAct, actividad }) => {
  if (cargandoAct) {
    return <div className="text-center py-12 text-slate-400 text-sm">Cargando actividad…</div>;
  }
  if (!actividad.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Aún no hay valuaciones de inmobiliarias.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Empresa</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Propiedad</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Valor</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {actividad.map((v) => (
              <tr key={v.valuation_id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#1B4332] text-xs">{v.empresa}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {v.property_data?.street
                    ? `${v.property_data.street}${v.property_data.municipio ? ", " + v.property_data.municipio : ""}`
                    : v.valuation_id?.slice(-10)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.status === "completed" ? "bg-green-100 text-green-700" :
                    v.status === "draft"     ? "bg-slate-100 text-slate-500" :
                    "bg-amber-100 text-amber-600"
                  }`}>{v.status}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-[#1B4332]">
                  {v.final_value ? fmt(v.final_value) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-400">{fmtFecha(v.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Tab Directorio ─── */
const TabDirectorio = ({ inmobiliarias, onToggle }) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [guardando, setGuardando] = useState(null);

  const datos = inmobiliarias.map((r) => ({
    ...r,
    directorio_visible: r.directorio_visible !== false,
    destacado: r.destacado || false,
    perfil_pct: Math.min(100,
      (r.company_name ? 20 : 0) + (r.phone ? 15 : 0) +
      (r.municipio ? 15 : 0) + (r.kyc_status === "approved" ? 30 : 0) +
      (r.asociacion ? 20 : 0)
    ),
  }));

  const filtrados = datos.filter((r) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || (r.company_name || r.email).toLowerCase().includes(q) || (r.municipio || "").toLowerCase().includes(q);
    const matchF = filtro === "todos"
      || (filtro === "visibles"   && r.directorio_visible)
      || (filtro === "ocultas"    && !r.directorio_visible)
      || (filtro === "destacadas" && r.destacado);
    return matchQ && matchF;
  });

  const toggle = async (id, campo) => {
    setGuardando(`${id}-${campo}`);
    await onToggle(id, campo);
    setGuardando(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
        <Eye className="w-4 h-4 text-[#52B788] flex-shrink-0" />
        <span>
          <strong className="text-[#1B4332]">Directorio público:</strong> Las empresas visibles aparecen en <code className="bg-slate-100 px-1 rounded">/inmobiliarias</code>.
          Las <strong>Destacadas</strong> aparecen primero con badge especial. Solo empresas verificadas deberían ser visibles.
        </span>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por empresa o ciudad..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
          <option value="todos">Todas</option>
          <option value="visibles">Visibles en directorio</option>
          <option value="ocultas">Ocultas</option>
          <option value="destacadas">Destacadas</option>
        </select>
        <ChevronDown className="w-0 h-0 overflow-hidden" />
        <div className="text-xs text-slate-400 ml-auto">
          {datos.filter((r) => r.directorio_visible).length} visibles · {datos.filter((r) => r.destacado).length} destacadas
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                {["Empresa","Ciudad","Verificación","Plan","Perfil %","Visible","Destacada"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Sin resultados</td></tr>
              )}
              {filtrados.map((r) => (
                <tr key={r.user_id} className={`hover:bg-[#F0FAF5]/50 transition-colors ${!r.directorio_visible ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#D9ED92]/50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-[#1B4332]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1B4332]">{r.company_name || r.name || "—"}</p>
                        <p className="text-xs text-slate-400">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {[r.municipio, r.estado].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${KYC_CFG[r.kyc_status]?.cls || "bg-slate-100 text-slate-400"}`}>
                      {KYC_CFG[r.kyc_status]?.label || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.plan_tipo || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.perfil_pct >= 80 ? "bg-[#52B788]" : r.perfil_pct >= 50 ? "bg-amber-400" : "bg-red-300"}`}
                          style={{ width: `${r.perfil_pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{r.perfil_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(r.user_id, "directorio_visible")}
                      disabled={guardando === `${r.user_id}-directorio_visible`}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${r.directorio_visible ? "bg-[#52B788]" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.directorio_visible ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(r.user_id, "destacado")}
                      disabled={guardando === `${r.user_id}-destacado`}
                      className={`p-1.5 rounded-lg transition-colors ${r.destacado ? "text-amber-400 bg-amber-50" : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"}`}>
                      <Star className={`w-4 h-4 ${r.destacado ? "fill-amber-400" : ""}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Componente principal ─── */
const AdminInmobiliarias = () => {
  const [tab, setTab]                 = useState("resumen");
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [actividad, setActividad]     = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [cargandoAct, setCargandoAct] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    adminFetch("/api/admin/inmobiliarias")
      .then((d) => setInmobiliarias(d.inmobiliarias || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const cargarActividad = useCallback(() => {
    setCargandoAct(true);
    adminFetch("/api/admin/inmobiliarias-actividad")
      .then((d) => setActividad(d.valuaciones || []))
      .catch(() => {})
      .finally(() => setCargandoAct(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (tab === "actividad" && actividad.length === 0) cargarActividad();
  }, [tab]);

  const pendientesKyc = inmobiliarias.filter((r) => r.kyc_status === "pending").length;

  // Toggle directorio_visible / destacado
  const onToggleDirectorio = async (userId, campo) => {
    setInmobiliarias((prev) => prev.map((r) =>
      r.user_id === userId ? { ...r, [campo]: !r[campo] } : r
    ));
    try {
      await adminFetch(`/api/admin/inmobiliarias/${userId}/directorio`, {
        method: "PATCH",
        body: JSON.stringify({ [campo]: !inmobiliarias.find((r) => r.user_id === userId)?.[campo] }),
      });
    } catch { /* actualización local ya hecha */ }
  };

  const TABS = [
    { id: "resumen",    label: "Resumen",                                                               icon: BarChart2    },
    { id: "empresas",   label: `Empresas (${inmobiliarias.length})`,                                    icon: Building2    },
    { id: "directorio", label: "Directorio",                                                            icon: Eye          },
    { id: "nuevas",     label: pendientesKyc > 0 ? `Nuevas altas (${pendientesKyc})` : "Nuevas altas", icon: ShieldCheck  },
    { id: "actividad",  label: "Actividad",                                                             icon: Activity     },
  ];

  const descargarCSV = () => {
    const cols = ["Empresa", "Email", "Verificación", "Estado", "Créditos", "Avalúos/mes", "Total avalúos", "Alta"];
    const rows = inmobiliarias.map((r) =>
      [r.company_name || r.name || "", r.email, r.kyc_status || "", r.cuenta_estado || "",
       r.credits ?? 0, r.avaluos_mes ?? 0, r.total_avaluos ?? 0, r.created_at || ""].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_Inmobiliarias_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout badges={{ inmobiliarias: pendientesKyc }}>
      <div className="max-w-6xl mx-auto space-y-5">

        <PageHeader icon={Building2} title="Inmobiliarias"
          subtitle="Seguimiento de empresas, créditos y actividad">
          <button onClick={cargar} disabled={cargando}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-3 py-2.5 rounded-xl transition-colors">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
          <button onClick={descargarCSV}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </PageHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === id ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === "nuevas" && pendientesKyc > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendientesKyc}
                </span>
              )}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>
        ) : (
          <>
            {tab === "resumen"    && <TabResumen     inmobiliarias={inmobiliarias} />}
            {tab === "empresas"   && <TabEmpresas    inmobiliarias={inmobiliarias} onReload={cargar} />}
            {tab === "directorio" && <TabDirectorio  inmobiliarias={inmobiliarias} onToggle={onToggleDirectorio} />}
            {tab === "nuevas"     && <TabNuevasAltas inmobiliarias={inmobiliarias} onReload={cargar} />}
            {tab === "actividad"  && <TabActividad   cargandoAct={cargandoAct} actividad={actividad} />}
          </>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminInmobiliarias;
