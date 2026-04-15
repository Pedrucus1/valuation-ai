import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, SectionLabel } from "@/components/AdminUI";
import { adminFetch, getAdminToken } from "@/lib/adminFetch";
import { API } from "@/App";
import {
  ShieldCheck, FileText, CheckCircle2, XCircle,
  MessageSquare, Clock, ChevronDown, ExternalLink, X,
} from "lucide-react";

const KYC_STATUS_MAP = {
  pending:      "pendiente",
  under_review: "en_revision",
  approved:     "aprobado",
  rejected:     "rechazado",
};

function normalizeKYC(u) {
  return {
    id: u.user_id,
    nombre: u.name || u.email,
    email: u.email,
    representante: u.representante || null,
    fecha: u.created_at ? u.created_at.split("T")[0] : "-",
    estado: KYC_STATUS_MAP[u.kyc_status] || "pendiente",
    docs: (u.documentos || []).map((d) => ({
      nombre: d.doc_tipo,
      estado: d.estado || "subido",
      doc_id: d.doc_id || null,
    })),
    plan_solicitado: u.plan || "-",
    notas: u.kyc_solicitud_info || "",
  };
}

const ESTADO_KYC = {
  pendiente:       { label: "Nuevo",            cls: "bg-amber-100 text-amber-700" },
  en_revision:     { label: "En revisión",      cls: "bg-blue-100 text-blue-700" },
  aprobado:        { label: "Aprobado ✅",       cls: "bg-green-100 text-green-700" },
  rechazado:       { label: "Rechazado",        cls: "bg-red-100 text-red-600" },
  info_solicitada: { label: "Info solicitada",  cls: "bg-orange-100 text-orange-700" },
};

const DOC_ESTADO = {
  subido:     { label: "Subido",     cls: "text-green-600",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ratificado: { label: "Ratificado", cls: "text-indigo-600", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  pendiente:  { label: "Faltante",   cls: "text-amber-600",  icon: <Clock className="w-3.5 h-3.5" /> },
  rechazado:  { label: "Rechazado",  cls: "text-red-500",    icon: <XCircle className="w-3.5 h-3.5" /> },
};

const KYCCard = ({ solicitud, onAccion }) => {
  const [expandida, setExpandida] = useState(false);
  const [docs, setDocs] = useState(solicitud.docs);
  const docsOk = docs.filter((d) => d.estado === "subido" || d.estado === "ratificado").length;
  const pct = Math.round((docsOk / Math.max(docs.length, 1)) * 100);

  const ratificarDoc = async (doc_id) => {
    const res = await fetch(`${API}/admin/kyc/ratificar/${doc_id}`, {
      method: "POST",
      headers: { "X-Admin-Token": getAdminToken() },
    });
    if (!res.ok) return alert("No se pudo ratificar el documento");
    setDocs((prev) => prev.map((d) => d.doc_id === doc_id ? { ...d, estado: "ratificado" } : d));
  };

  return (
    <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpandida((p) => !p)}
      >
        <div className="w-10 h-10 rounded-full bg-[#D9ED92] flex items-center justify-center text-[#1B4332] font-bold text-sm flex-shrink-0">
          {solicitud.nombre.split(" ").slice(-2).map((p) => p[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#1B4332] text-sm">{solicitud.nombre}</p>
              <p className="text-xs text-slate-400">{solicitud.email}</p>
              {solicitud.representante && (
                <p className="text-xs text-slate-400">Rep: {solicitud.representante}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ESTADO_KYC[solicitud.estado].cls}`}>
                {ESTADO_KYC[solicitud.estado].label}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandida ? "rotate-180" : ""}`} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${pct === 100 ? "bg-[#52B788]" : "bg-amber-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{docsOk}/{solicitud.docs.length} docs · Plan {solicitud.plan_solicitado}</span>
          </div>
        </div>
      </div>

      {expandida && (
        <div className="border-t border-[#B7E4C7] p-5 space-y-4 bg-[#F8FDF9]">
          {/* Documentos */}
          <div>
            <SectionLabel>Documentos</SectionLabel>
            <div className="space-y-2">
              {docs.map((doc) => {
                const est = DOC_ESTADO[doc.estado] || DOC_ESTADO.pendiente;
                return (
                  <div key={doc.nombre} className="flex items-center gap-2 bg-white rounded-lg border border-[#B7E4C7] px-3 py-2">
                    <span className={est.cls}>{est.icon}</span>
                    <span className="text-sm text-slate-600 flex-1">{doc.nombre}</span>
                    {doc.doc_id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const res = await fetch(`${API}/admin/kyc/doc/${doc.doc_id}`, {
                              headers: { "X-Admin-Token": getAdminToken() },
                            });
                            if (!res.ok) return alert("No se pudo abrir el documento");
                            const blob = await res.blob();
                            window.open(URL.createObjectURL(blob), "_blank");
                          }}
                          className="text-[11px] text-[#52B788] hover:underline flex items-center gap-0.5"
                        >
                          Ver <ExternalLink className="w-3 h-3" />
                        </button>
                        {doc.estado !== "ratificado" && (
                          <button
                            onClick={() => ratificarDoc(doc.doc_id)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 border border-indigo-200 rounded-md px-1.5 py-0.5 hover:bg-indigo-50"
                          >
                            <ShieldCheck className="w-3 h-3" /> Ratificar
                          </button>
                        )}
                        {doc.estado === "ratificado" && (
                          <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Ratificado
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={`text-[11px] ${est.cls}`}>{est.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {solicitud.notas && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
              <strong>Nota al valuador:</strong> {solicitud.notas}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onAccion(solicitud.id, "aprobado")}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
            </button>
            <button
              onClick={() => onAccion(solicitud.id, "rechazado")}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Rechazar
            </button>
            <button
              onClick={() => onAccion(solicitud.id, "info_solicitada")}
              className="flex items-center gap-1.5 border border-orange-300 text-orange-700 hover:bg-orange-50 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Solicitar información
            </button>
          </div>
          <p className="text-[11px] text-slate-300">Solicitud: {solicitud.fecha} · ID: {solicitud.id}</p>
        </div>
      )}
    </div>
  );
};

const AdminKYC = () => {
  const [tab, setTab] = useState("valuadores");
  const [vKyc, setVKyc] = useState([]);
  const [iKyc, setIKyc] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);

  const cargarKYC = () => {
    adminFetch("/api/admin/kyc?tipo=appraiser")
      .then((data) => setVKyc((data.usuarios || []).map(normalizeKYC)))
      .catch(() => {});
    adminFetch("/api/admin/kyc?tipo=realtor")
      .then((data) => setIKyc((data.usuarios || []).map(normalizeKYC)))
      .catch(() => {});
  };

  useEffect(() => { cargarKYC(); }, []);

  const accionKYC = (id, accion) => setConfirmacion({ id, accion });

  const confirmarAccion = async () => {
    const { id, accion } = confirmacion;
    setConfirmacion(null);
    try {
      if (accion === "aprobado") {
        await adminFetch(`/api/admin/kyc/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      } else if (accion === "rechazado") {
        await adminFetch(`/api/admin/kyc/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo: "" }) });
      } else if (accion === "info_solicitada") {
        await adminFetch(`/api/admin/kyc/${id}/solicitar-info`, { method: "POST", body: JSON.stringify({ mensaje: "" }) });
      }
      cargarKYC();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const cola = tab === "valuadores" ? vKyc : iKyc;
  const pendientes = cola.filter((k) => k.estado === "pendiente" || k.estado === "en_revision" || k.estado === "info_solicitada");
  const procesados = cola.filter((k) => k.estado === "aprobado" || k.estado === "rechazado");
  const badges = { kyc: vKyc.filter((k) => k.estado === "pendiente").length + iKyc.filter((k) => k.estado === "pendiente").length };

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-3xl mx-auto space-y-5">

        <PageHeader icon={ShieldCheck} title="Verificación de cuentas"
          subtitle={`${pendientes.length} solicitudes activas · ${procesados.length} procesadas`} />

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: "valuadores",    label: "Valuadores",    count: vKyc.filter((k) => k.estado === "pendiente").length },
            { key: "inmobiliarias", label: "Inmobiliarias", count: iKyc.filter((k) => k.estado === "pendiente").length },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === key ? "bg-[#1B4332] text-white" : "bg-white border border-[#B7E4C7] text-slate-600 hover:border-[#52B788]"
              }`}>
              <ShieldCheck className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === key ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <AdminCard icon={ShieldCheck} title={`Pendientes de revisión (${pendientes.length})`}>
            <div className="p-4 space-y-4">
              {pendientes.map((k) => <KYCCard key={k.id} solicitud={k} onAccion={accionKYC} />)}
            </div>
          </AdminCard>
        )}

        {/* Procesados */}
        {procesados.length > 0 && (
          <AdminCard icon={CheckCircle2} title={`Procesados recientemente (${procesados.length})`}>
            <div className="p-4 space-y-4">
              {procesados.map((k) => <KYCCard key={k.id} solicitud={k} onAccion={accionKYC} />)}
            </div>
          </AdminCard>
        )}

        {pendientes.length === 0 && procesados.length === 0 && (
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm text-center py-16 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay solicitudes de verificación en este momento.</p>
          </div>
        )}
      </div>

      {/* Modal confirmación */}
      {confirmacion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
              <h2 className="font-['Outfit'] font-bold text-white">Confirmar acción</h2>
              <button onClick={() => setConfirmacion(null)}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                ¿Confirmas cambiar el estado a{" "}
                <strong className={confirmacion.accion === "aprobado" ? "text-green-600" : confirmacion.accion === "rechazado" ? "text-red-600" : "text-orange-600"}>
                  {ESTADO_KYC[confirmacion.accion]?.label}
                </strong>?
                {confirmacion.accion === "aprobado" && " El usuario recibirá email de confirmación y podrá operar en la plataforma."}
                {confirmacion.accion === "rechazado" && " El usuario recibirá email indicando el motivo del rechazo."}
                {confirmacion.accion === "info_solicitada" && " Se enviará email al usuario solicitando los documentos faltantes."}
              </p>
              <div className="flex gap-2">
                <button onClick={confirmarAccion}
                  className="flex-1 bg-[#1B4332] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#163828] transition-colors">
                  Confirmar
                </button>
                <button onClick={() => setConfirmacion(null)}
                  className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminKYC;
