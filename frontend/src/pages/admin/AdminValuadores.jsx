import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, FilterBar } from "@/components/AdminUI";
import { adminFetch } from "@/lib/adminFetch";
import {
  Search, ChevronDown, ShieldCheck, Phone, Mail, Ban, CheckCircle2, X,
  ChevronLeft, ChevronRight, ExternalLink, ClipboardList, BarChart2,
  Activity, Star, Eye, EyeOff, Users, TrendingUp, MapPin, Award,
  RefreshCw, AlertTriangle, MoreVertical, MessageSquare,
} from "lucide-react";

const KYC_STATUS_MAP = {
  pending:      "pendiente",
  under_review: "info_solicitada",
  approved:     "aprobado",
  rejected:     "rechazado",
};

function normalizeValuador(u) {
  return {
    id: u.user_id,
    nombre: u.name || u.email,
    email: u.email,
    telefono: u.phone || "",
    ciudad: u.municipio || u.ciudad || "—",
    plan: u.plan || "basico",
    estado: u.kyc_status === "pending" ? "kyc_pendiente" : (u.cuenta_estado || "activo"),
    kyc: KYC_STATUS_MAP[u.kyc_status] || "pendiente",
    certs: u.certificaciones || [],
    especialidades: u.especialidades || [],
    experiencia: u.experiencia || 0,
    calificacion: u.calificacion || 0,
    totalReportes: u.total_valuaciones || 0,
    ingresos: 0,
    quejas: u.total_quejas || 0,
    fecha_registro: u.created_at ? u.created_at.split("T")[0] : "-",
    cedula: u.cedula || "—",
    bio: u.bio || "",
    // campos directorio (podrían venir del backend o inicializarse aquí)
    directorio_visible: u.directorio_visible !== false,
    destacado: u.destacado || false,
    perfil_pct: u.perfil_pct || Math.min(100, 40
      + (u.phone ? 10 : 0)
      + (u.bio ? 15 : 0)
      + (u.cedula ? 15 : 0)
      + ((u.certificaciones?.length || 0) > 0 ? 20 : 0)),
  };
}

const PLAN_BADGE  = { enterprise: "bg-[#1B4332] text-white", pro: "bg-[#52B788] text-white", basico: "bg-slate-100 text-slate-600", despacho: "bg-blue-100 text-blue-700", corporativo: "bg-purple-100 text-purple-700", independiente: "bg-slate-100 text-slate-600" };
const KYC_BADGE   = { aprobado: "bg-green-100 text-green-700", pendiente: "bg-amber-100 text-amber-700", info_solicitada: "bg-orange-100 text-orange-700", rechazado: "bg-red-100 text-red-600" };
const KYC_LABEL   = { aprobado: "Verificado", pendiente: "Pendiente", info_solicitada: "Info solicitada", rechazado: "Rechazado" };
const ESTADO_BADGE= { activo: "bg-green-100 text-green-700", suspendido: "bg-red-100 text-red-600", kyc_pendiente: "bg-amber-100 text-amber-700" };

const TABS = [
  { id: "resumen",        label: "Resumen",         icon: BarChart2   },
  { id: "verificaciones", label: "Verificaciones",  icon: ShieldCheck },
  { id: "actividad",      label: "Actividad",       icon: Activity    },
];

const PAGE_SIZE = 8;

/* ─── KPI card ─── */
const KpiCard = ({ icon: Icon, label, val, sub, color, alerta, stripe }) => (
  <div className={`bg-white rounded-2xl border overflow-hidden ${alerta ? "border-amber-200" : "border-[#B7E4C7]"}`}>
    <div className={`h-1 ${stripe || "bg-[#52B788]"}`} />
    <div className="p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ─── Tab Resumen ─── */
const TabResumen = ({ valuadores }) => {
  const stats = {
    total:      valuadores.length,
    verificados:valuadores.filter((v) => v.kyc === "aprobado").length,
    pendientes: valuadores.filter((v) => v.kyc === "pendiente").length,
    activos:    valuadores.filter((v) => v.estado === "activo").length,
    quejas:     valuadores.reduce((s, v) => s + v.quejas, 0),
    reportes:   valuadores.reduce((s, v) => s + v.totalReportes, 0),
    ciudades:   [...new Set(valuadores.map((v) => v.ciudad).filter((c) => c !== "—"))].length,
  };

  const top5 = [...valuadores].sort((a, b) => b.totalReportes - a.totalReportes).slice(0, 5);
  const maxReportes = top5[0]?.totalReportes || 1;

  const byPlan = [
    { label: "Enterprise/Corporativo", val: valuadores.filter((v) => v.plan === "enterprise" || v.plan === "corporativo").length, color: "bg-[#1B4332]" },
    { label: "Pro/Despacho",           val: valuadores.filter((v) => v.plan === "pro" || v.plan === "despacho").length,           color: "bg-[#52B788]" },
    { label: "Básico/Independiente",   val: valuadores.filter((v) => v.plan === "basico" || v.plan === "independiente" || !v.plan).length, color: "bg-slate-300" },
  ];

  const ciudadesTop = Object.entries(
    valuadores.reduce((acc, v) => {
      if (v.ciudad && v.ciudad !== "—") acc[v.ciudad] = (acc[v.ciudad] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}       label="Valuadores registrados"  val={stats.total}      color="bg-blue-100 text-blue-600"       stripe="bg-blue-400" />
        <KpiCard icon={ShieldCheck} label="Verificados activos"     val={stats.verificados} color="bg-green-100 text-green-600"     stripe="bg-[#52B788]" />
        <KpiCard icon={AlertTriangle} label="Verificaciones pendientes" val={stats.pendientes} color="bg-amber-100 text-amber-600" stripe="bg-amber-400" alerta={stats.pendientes > 0} />
        <KpiCard icon={TrendingUp}  label="Reportes generados"      val={stats.reportes}   color="bg-purple-100 text-purple-600"   stripe="bg-purple-400" />
        <KpiCard icon={MapPin}      label="Ciudades con cobertura"  val={stats.ciudades}   color="bg-[#B7E4C7] text-[#1B4332]"    stripe="bg-[#2D6A4F]" />
        <KpiCard icon={Activity}    label="Valuadores activos"      val={stats.activos}    color="bg-green-50 text-green-700"      stripe="bg-green-300" />
        <KpiCard icon={MessageSquare} label="Quejas activas"         val={stats.quejas}    color={stats.quejas > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"} stripe={stats.quejas > 0 ? "bg-red-400" : "bg-slate-200"} alerta={stats.quejas > 0} />
        <KpiCard icon={Award}       label="Con plan Pro+"           val={valuadores.filter((v) => v.plan !== "basico" && v.plan !== "independiente").length} color="bg-[#D9ED92]/60 text-[#1B4332]" stripe="bg-[#D9ED92]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top por reportes */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-4">Top valuadores por reportes</p>
          {top5.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {top5.map((v, i) => (
                <div key={v.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1B4332] flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-[#D9ED92] text-[#1B4332]" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                      {v.nombre}
                    </span>
                    <span className="text-slate-400">{v.totalReportes} reportes</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#52B788] rounded-full" style={{ width: `${Math.round((v.totalReportes / maxReportes) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución por plan */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
            <p className="font-semibold text-[#1B4332] text-sm mb-4">Distribución por plan</p>
            <div className="space-y-3">
              {byPlan.map(({ label, val, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-[#1B4332]">{val}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${stats.total ? Math.round((val / stats.total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ciudades con más valuadores */}
          <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
            <p className="font-semibold text-[#1B4332] text-sm mb-3">Ciudades principales</p>
            <div className="flex flex-wrap gap-1.5">
              {ciudadesTop.length === 0 ? (
                <p className="text-xs text-slate-400">Sin datos.</p>
              ) : ciudadesTop.map(([ciudad, n]) => (
                <span key={ciudad} className="flex items-center gap-1 text-xs bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-2.5 py-1 rounded-full">
                  <MapPin className="w-2.5 h-2.5" />{ciudad} <span className="text-slate-400 font-semibold">{n}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ─── Visor de documentos valuador ─── */
const DocViewerValuador = ({ valuador, onClose }) => {
  const DOCS_REQ = ["INE/Pasaporte", "Cédula Prof.", "Certificación INDAABIN/IVS", "RFC", "Seguro RC"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Documentos KYC</h3>
            <p className="text-[#D9ED92]/70 text-xs mt-0.5">{valuador.nombre} · {valuador.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Datos registrados */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Cédula profesional", valuador.cedula],
              ["Experiencia",        `${valuador.experiencia} año${valuador.experiencia !== 1 ? "s" : ""}`],
              ["Plan",               valuador.plan],
              ["Registro",           valuador.fecha_registro],
              ["Especialidades",     valuador.especialidades?.join(", ") || "—"],
              ["Certificaciones",    valuador.certs?.join(", ") || "—"],
            ].map(([k, val]) => (
              <div key={k} className={`bg-[#F0FAF5] border rounded-xl p-3 ${val && val !== "—" ? "border-[#B7E4C7]" : "border-slate-100 opacity-60"}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}</p>
                <p className="text-sm text-[#1B4332] font-semibold mt-0.5 truncate">{val || "—"}</p>
              </div>
            ))}
          </div>
          {/* Archivos */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Archivos requeridos</p>
            <div className="flex flex-wrap gap-2">
              {DOCS_REQ.map((doc) => {
                const subido = valuador.certs?.length > 0 && ["INE/Pasaporte","Cédula Prof.","Certificación INDAABIN/IVS"].includes(doc);
                return (
                  <span key={doc} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${subido ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {subido ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {doc}
                  </span>
                );
              })}
            </div>
          </div>
          {valuador.bio && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Bio</p>
              <p className="text-xs text-slate-600 leading-relaxed">{valuador.bio}</p>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="text-sm font-semibold px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Tab Verificaciones ─── */
const TabVerificaciones = ({ valuadores, onApprobar, onRechazar, onSolicitarInfo }) => {
  const [modal, setModal] = useState(null);
  const [docViewer, setDocViewer] = useState(null);
  const [motivo, setMotivo] = useState("");
  const pendientes = valuadores.filter((v) => v.kyc === "pendiente" || v.kyc === "info_solicitada");

  if (pendientes.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
        <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-green-300" />
        <p className="text-sm font-semibold text-slate-600">Sin verificaciones pendientes</p>
        <p className="text-xs text-slate-400 mt-1">Todos los valuadores están al día</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendientes.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{v.nombre}</p>
                <p className="text-[#D9ED92]/70 text-xs">{v.email} · {v.ciudad}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
                <button
                  onClick={() => setDocViewer(v)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver docs
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Registro",        v.fecha_registro],
                  ["Cédula prof.",    v.cedula],
                  ["Experiencia",     `${v.experiencia} año${v.experiencia !== 1 ? "s" : ""}`],
                  ["Plan",            v.plan],
                  ["Ciudad",          v.ciudad],
                  ["Calificación",    v.calificacion > 0 ? `${v.calificacion.toFixed(1)} ★` : "Sin calif."],
                  ["Valuaciones",     v.totalReportes],
                  ["Quejas",          v.quejas || "—"],
                ].map(([k, val]) => (
                  <div key={k} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Especialidades y certificaciones */}
              {(v.especialidades?.length > 0 || v.certs?.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {v.especialidades?.map((e) => (
                    <span key={e} className="text-[11px] bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{e}</span>
                  ))}
                  {v.certs?.map((c) => (
                    <span key={c} className="text-[11px] bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-2.5 py-1 rounded-full font-semibold">{c}</span>
                  ))}
                </div>
              )}

              {/* Contacto */}
              <div className="flex flex-wrap gap-2 mb-4">
                <a href={`mailto:${v.email}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {v.email}
                </a>
                {v.telefono && (
                  <a href={`https://wa.me/52${v.telefono}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => onApprobar(v.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#163828] text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                  <ShieldCheck className="w-4 h-4" /> Aprobar
                </button>
                <button onClick={() => { setModal(v); setMotivo(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                  <X className="w-4 h-4" /> Rechazar
                </button>
                <button onClick={() => onSolicitarInfo(v.id)}
                  className="flex items-center gap-1.5 border border-amber-200 text-amber-700 hover:bg-amber-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  <MessageSquare className="w-4 h-4" /> Solicitar info
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Se enviará un email automático a {modal.email}</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
              placeholder="Ej: La cédula profesional no corresponde al nombre registrado..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { onRechazar(modal.id, motivo); setModal(null); }}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600">
                Confirmar rechazo
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {docViewer && <DocViewerValuador valuador={docViewer} onClose={() => setDocViewer(null)} />}
    </>
  );
};

/* ─── Tab Actividad ─── */
const TabActividad = ({ valuadores }) => {
  // Construir feed de actividad a partir de datos reales + mock
  const eventos = useMemo(() => {
    const feed = [];
    // Registros recientes
    [...valuadores]
      .filter((v) => v.fecha_registro && v.fecha_registro !== "-")
      .sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro))
      .slice(0, 5)
      .forEach((v) => {
        feed.push({
          id: `reg-${v.id}`, tipo: "registro",
          texto: `${v.nombre} se registró como valuador`,
          sub: `Plan ${v.plan} · ${v.ciudad}`,
          fecha: v.fecha_registro,
          color: "bg-blue-100 text-blue-600",
        });
      });
    // Valuadores verificados
    valuadores.filter((v) => v.kyc === "aprobado").slice(0, 3).forEach((v) => {
      feed.push({
        id: `kyc-${v.id}`, tipo: "verificacion",
        texto: `${v.nombre} fue verificado`,
        sub: `Cédula: ${v.cedula}`,
        fecha: v.fecha_registro,
        color: "bg-green-100 text-green-600",
      });
    });
    // Quejas
    valuadores.filter((v) => v.quejas > 0).forEach((v) => {
      feed.push({
        id: `queja-${v.id}`, tipo: "queja",
        texto: `${v.nombre} tiene ${v.quejas} queja(s) activa(s)`,
        sub: v.email,
        fecha: v.fecha_registro,
        color: "bg-red-100 text-red-600",
      });
    });
    return feed.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 20);
  }, [valuadores]);

  const TIPO_ICON = {
    registro:      <Users className="w-3.5 h-3.5" />,
    verificacion:  <ShieldCheck className="w-3.5 h-3.5" />,
    queja:         <AlertTriangle className="w-3.5 h-3.5" />,
  };

  if (eventos.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
        <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-400">Sin actividad registrada aún</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm divide-y divide-slate-50">
      {eventos.map((e) => (
        <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${e.color}`}>
            {TIPO_ICON[e.tipo]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700">{e.texto}</p>
            <p className="text-xs text-slate-400 mt-0.5">{e.sub}</p>
          </div>
          <span className="text-xs text-slate-300 flex-shrink-0">{e.fecha}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Main ─── */
const AdminValuadores = () => {
  const [activeTab, setActiveTab] = useState("resumen");
  const [valuadores, setValuadores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [planFiltro, setPlanFiltro] = useState("todos");
  const [kycFiltro, setKycFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);

  const cargar = () => {
    adminFetch("/api/admin/valuadores")
      .then((d) => setValuadores((d.valuadores || []).map(normalizeValuador)))
      .catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  // Directorio toggle
  const onToggle = async (id, campo) => {
    setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, [campo]: !v[campo] } : v));
    try {
      await adminFetch(`/api/admin/valuadores/${id}/directorio`, {
        method: "PATCH",
        body: JSON.stringify({ [campo]: !valuadores.find((v) => v.id === id)?.[campo] }),
      });
    } catch { /* silencioso — actualizar local ya hecho */ }
  };

  // KYC actions
  const onApprobar = async (id) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "aprobado", estado: "activo" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };
  const onRechazar = async (id, motivo) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo }) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "rechazado" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };
  const onSolicitarInfo = async (id) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/solicitar-info`, { method: "POST", body: JSON.stringify({}) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "info_solicitada" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };

  const suspender = async (id) => {
    const v = valuadores.find((x) => x.id === id);
    const nuevoEstado = v?.estado === "activo" ? "suspendido" : "activo";
    try {
      await adminFetch(`/api/admin/usuarios/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: nuevoEstado }) });
      setValuadores((p) => p.map((x) => x.id === id ? { ...x, estado: nuevoEstado } : x));
    } catch (e) { alert("Error: " + e.message); }
    setMenu(null);
  };

  // Tab Directorio legacy (tabla con filtros, para ver todos con acciones de gestión)
  const filtrados = useMemo(() => valuadores.filter((v) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || v.nombre.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.ciudad.toLowerCase().includes(q);
    const matchP = planFiltro === "todos" || v.plan === planFiltro;
    const matchK = kycFiltro === "todos" || v.kyc === kycFiltro;
    return matchQ && matchP && matchK;
  }).sort((a, b) => {
    const po = { enterprise: 0, corporativo: 0, pro: 1, despacho: 1, basico: 2, independiente: 2 };
    return (po[a.plan] ?? 2) - (po[b.plan] ?? 2) || b.totalReportes - a.totalReportes;
  }), [valuadores, busqueda, planFiltro, kycFiltro]);

  const totalPags = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const pendientesKyc = valuadores.filter((v) => v.kyc === "pendiente").length;

  const tabs = TABS.map((t) => ({
    ...t,
    badge: t.id === "verificaciones" && pendientesKyc > 0 ? pendientesKyc : null,
  }));

  return (
    <AdminLayout badges={{ kyc: pendientesKyc }}>
      <div className="max-w-6xl mx-auto space-y-5">

        <PageHeader icon={ClipboardList} title="Valuadores"
          subtitle={`${valuadores.length} registrados · ${valuadores.filter((v) => v.kyc === "aprobado").length} verificados · ${valuadores.filter((v) => v.directorio_visible).length} en directorio`}>
          <button onClick={cargar}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-3 py-2.5 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </PageHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === id ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        {activeTab === "resumen" && <TabResumen valuadores={valuadores} />}

        {activeTab === "verificaciones" && (
          <TabVerificaciones valuadores={valuadores}
            onApprobar={onApprobar} onRechazar={onRechazar} onSolicitarInfo={onSolicitarInfo} />
        )}

        {activeTab === "actividad" && <TabActividad valuadores={valuadores} />}

        {/* Lista completa — tab "gestión" inline (fuera de tabs, accesible desde menú) */}
        {activeTab === "resumen" && valuadores.length > 0 && (
          <AdminCard icon={ClipboardList}
            title={`Lista completa (${filtrados.length})`}
            action={null}>
            <div className="p-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Nombre, email o ciudad..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
              {[
                { val: planFiltro, set: (v) => { setPlanFiltro(v); setPagina(1); }, opts: [["todos","Todos los planes"],["enterprise","Enterprise"],["corporativo","Corporativo"],["pro","Pro"],["despacho","Despacho"],["basico","Básico"],["independiente","Independiente"]] },
                { val: kycFiltro, set: (v) => { setKycFiltro(v); setPagina(1); }, opts: [["todos","Verificación: Todos"],["aprobado","Aprobado"],["pendiente","Pendiente"],["info_solicitada","Info solicitada"],["rechazado","Rechazado"]] },
              ].map(({ val, set, opts }, i) => (
                <div key={i} className="relative">
                  <select value={val} onChange={(e) => set(e.target.value)}
                    className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <GradThead cols={["Valuador","Plan","Verificación","Estado","Directorio","Reportes","Quejas","Registro",""]} />
                <tbody className="divide-y divide-slate-50">
                  {paginados.map((v) => (
                    <tr key={v.id} className="hover:bg-[#F0FAF5]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#1B4332] leading-snug">{v.nombre}</p>
                        <p className="text-xs text-slate-400">{v.email}</p>
                        <p className="text-xs text-slate-300 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{v.ciudad}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[v.plan] || "bg-slate-100 text-slate-600"}`}>{v.plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[v.estado]}`}>
                          {v.estado === "kyc_pendiente" ? "Verif. pend." : v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onToggle(v.id, "directorio_visible")}
                          title={v.directorio_visible ? "Ocultar del directorio" : "Mostrar en directorio"}
                          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${v.directorio_visible ? "bg-[#52B788]" : "bg-slate-200"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${v.directorio_visible ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-semibold">{v.totalReportes}</td>
                      <td className="px-4 py-3">
                        {v.quejas > 0 ? <span className="text-sm font-bold text-red-500">{v.quejas}</span> : <span className="text-sm text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{v.fecha_registro}</td>
                      <td className="px-4 py-3 relative">
                        <button onClick={() => setMenu(menu === v.id ? null : v.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menu === v.id && (
                          <div className="absolute right-4 top-10 z-20 bg-white border border-[#B7E4C7] rounded-xl shadow-lg py-1 w-44">
                            <button onClick={() => { setModal(v); setMenu(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                              <ExternalLink className="w-4 h-4" /> Ver detalle
                            </button>
                            <a href={`https://wa.me/52${v.telefono}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50">
                              <Phone className="w-4 h-4" /> WhatsApp
                            </a>
                            <a href={`mailto:${v.email}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                              <Mail className="w-4 h-4" /> Email
                            </a>
                            {v.kyc === "pendiente" && (
                              <a href="/admin/kyc"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50">
                                <ShieldCheck className="w-4 h-4" /> Revisar verificación
                              </a>
                            )}
                            <button onClick={() => suspender(v.id)}
                              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 ${v.estado === "activo" ? "text-red-600" : "text-green-600"}`}>
                              {v.estado === "activo" ? <><Ban className="w-4 h-4" /> Suspender</> : <><CheckCircle2 className="w-4 h-4" /> Reactivar</>}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPags > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#B7E4C7]">
                <span className="text-xs text-slate-400">{(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: totalPags }, (_, i) => (
                    <button key={i} onClick={() => setPagina(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${pagina === i + 1 ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </AdminCard>
        )}
      </div>

      {/* Modal detalle */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-white text-lg">{modal.nombre}</h2>
                <p className="text-[#D9ED92]/70 text-sm">{modal.email} · {modal.ciudad}</p>
              </div>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-white/50 hover:text-white" /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ["Cédula", modal.cedula],
                  ["Plan", modal.plan],
                  ["Experiencia", `${modal.experiencia} años`],
                  ["Reportes", modal.totalReportes],
                  ["Calificación", modal.calificacion > 0 ? `${modal.calificacion} ⭐` : "Sin calificaciones"],
                  ["Quejas", modal.quejas || "—"],
                  ["Verificación", KYC_LABEL[modal.kyc]],
                  ["Directorio", modal.directorio_visible ? "Visible" : "Oculto"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/52${modal.telefono}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-bold">
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
                <a href={`mailto:${modal.email}`}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50">
                  <Mail className="w-4 h-4" /> Email
                </a>
                <button onClick={() => setModal(null)}
                  className="px-4 border border-slate-200 text-slate-400 rounded-xl py-2.5 text-sm hover:bg-slate-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminValuadores;
