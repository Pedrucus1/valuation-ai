import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Search, ChevronDown, MoreVertical, Star, ShieldCheck,
  MessageSquare, Phone, Mail, Ban, CheckCircle2, X,
  ChevronLeft, ChevronRight, ExternalLink,
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
    experiencia: u.experiencia || 0,
    calificacion: u.calificacion || 0,
    totalReportes: u.total_valuaciones || 0,
    ingresos: 0,
    quejas: u.total_quejas || 0,
    fecha_registro: u.created_at ? u.created_at.split("T")[0] : "-",
    cedula: u.cedula || "—",
  };
}

const PLAN_BADGE  = { enterprise: "bg-[#1B4332] text-white", pro: "bg-[#52B788] text-white", basico: "bg-slate-100 text-slate-600" };
const KYC_BADGE   = { aprobado: "bg-green-100 text-green-700", pendiente: "bg-yellow-100 text-yellow-700", info_solicitada: "bg-orange-100 text-orange-700", rechazado: "bg-red-100 text-red-600" };
const KYC_LABEL   = { aprobado: "Aprobado", pendiente: "Pendiente", info_solicitada: "Info Solicitada", rechazado: "Rechazado" };
const ESTADO_BADGE= { activo: "bg-green-100 text-green-700", suspendido: "bg-red-100 text-red-600", kyc_pendiente: "bg-yellow-100 text-yellow-700" };

const PAGE_SIZE = 6;

const AdminValuadores = () => {
  const [busqueda, setBusqueda] = useState("");
  const [planFiltro, setPlanFiltro] = useState("todos");
  const [kycFiltro, setKycFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [valuadores, setValuadores] = useState([]);

  useEffect(() => {
    adminFetch("/api/admin/valuadores")
      .then((d) => setValuadores((d.valuadores || []).map(normalizeValuador)))
      .catch(() => {});
  }, []);

  const filtrados = useMemo(() => valuadores.filter((v) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || v.nombre.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.ciudad.toLowerCase().includes(q);
    const matchP = planFiltro === "todos" || v.plan === planFiltro;
    const matchK = kycFiltro === "todos" || v.kyc === kycFiltro;
    return matchQ && matchP && matchK;
  }).sort((a, b) => {
    const po = { enterprise: 0, pro: 1, basico: 2 };
    return (po[a.plan] - po[b.plan]) || b.totalReportes - a.totalReportes;
  }), [valuadores, busqueda, planFiltro, kycFiltro]);

  const total = filtrados.length;
  const totalPags = Math.ceil(total / PAGE_SIZE);
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const suspender = async (id) => {
    const v = valuadores.find((x) => x.id === id);
    const nuevoEstado = v?.estado === "activo" ? "suspendido" : "activo";
    try {
      await adminFetch(`/api/admin/usuarios/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setValuadores((p) => p.map((x) => x.id === id ? { ...x, estado: nuevoEstado } : x));
    } catch (e) {
      alert("Error: " + e.message);
    }
    setMenu(null);
  };

  return (
    <AdminLayout badges={{ kyc: valuadores.filter((v) => v.kyc === "pendiente").length }}>
      <div className="max-w-6xl mx-auto space-y-5">

        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Directorio Valuadores</h1>
          <p className="text-slate-400 text-sm mt-0.5">{valuadores.length} registrados · {valuadores.filter((v) => v.kyc === "aprobado").length} verificados</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por nombre, email o ciudad..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          {[
            { val: planFiltro, set: (v) => { setPlanFiltro(v); setPagina(1); }, opts: [["todos","Todos los planes"],["enterprise","Enterprise"],["pro","Pro"],["basico","Básico"]] },
            { val: kycFiltro, set: (v) => { setKycFiltro(v); setPagina(1); }, opts: [["todos","KYC: Todos"],["aprobado","Aprobado"],["pendiente","Pendiente"],["info_solicitada","Info solicitada"],["rechazado","Rechazado"]] },
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

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-slate-100">
                  {["Valuador","Plan","KYC","Estado","Reportes","Ingresos","Quejas","Registro",""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginados.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1B4332] leading-snug">{v.nombre}</p>
                        <p className="text-xs text-slate-400">{v.email}</p>
                        <p className="text-xs text-slate-300">{v.ciudad}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[v.plan]}`}>{v.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[v.estado]}`}>
                        {v.estado === "kyc_pendiente" ? "KYC Pend." : v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-semibold">{v.totalReportes}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">${v.ingresos.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {v.quejas > 0
                        ? <span className="text-sm font-bold text-red-500">{v.quejas}</span>
                        : <span className="text-sm text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{v.fecha_registro}</td>
                    <td className="px-4 py-3 relative">
                      <button onClick={() => setMenu(menu === v.id ? null : v.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menu === v.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44">
                          <button onClick={() => { setModal(v); setMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                            <ExternalLink className="w-4 h-4" /> Ver detalle
                          </button>
                          <a href={`https://wa.me/52${v.telefono}`} target="_blank" rel="noopener noreferrer"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50">
                            <Phone className="w-4 h-4" /> WhatsApp
                          </a>
                          <a href={`mailto:${v.email}`}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                            <Mail className="w-4 h-4" /> Email
                          </a>
                          {v.kyc === "pendiente" && (
                            <a href="/admin/kyc"
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50">
                              <ShieldCheck className="w-4 h-4" /> Revisar KYC
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
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, total)} de {total}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30 hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPags }, (_, i) => (
                  <button key={i} onClick={() => setPagina(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${pagina === i + 1 ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30 hover:bg-slate-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="font-bold text-[#1B4332] text-lg">{modal.nombre}</h2>
                <p className="text-slate-400 text-sm">{modal.email} · {modal.ciudad}</p>
              </div>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ["Cédula", modal.cedula], ["Plan", modal.plan], ["Experiencia", `${modal.experiencia} años`],
                ["Reportes", modal.totalReportes], ["Ingresos generados", `$${modal.ingresos.toLocaleString()}`],
                ["Calificación", modal.calificacion > 0 ? `${modal.calificacion} ⭐` : "Sin calificaciones"],
                ["Quejas", modal.quejas], ["KYC", KYC_LABEL[modal.kyc]],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#F8F9FA] rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                  <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <a href={`https://wa.me/52${modal.telefono}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#1ebe5d] transition-colors">
                <Phone className="w-4 h-4" /> WhatsApp
              </a>
              <a href={`mailto:${modal.email}`}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                <Mail className="w-4 h-4" /> Email
              </a>
              <button onClick={() => setModal(null)}
                className="px-4 border border-slate-200 text-slate-400 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminValuadores;
