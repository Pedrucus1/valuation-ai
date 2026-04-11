import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { CheckCircle2, XCircle, ExternalLink, MessageSquare, Clock, Eye, X, AlertTriangle, Image, Play, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/AdminUI";
import { API } from "@/App";

function normalizeAnuncio(a) {
  return {
    id: a.ad_id,
    anunciante: a.anunciante,
    email: a.email,
    tipo: a.tipo,
    titulo: a.titulo,
    descripcion: a.descripcion,
    imagen_url: a.imagen_url,
    link_web: a.link_web,
    link_wa: a.link_wa,
    fecha_envio: a.created_at ? a.created_at.split("T")[0] : "-",
    estado: a.estado,
    flags: a.flags || [],
    motivo: a.motivo_rechazo || "",
  };
}

const FLAG_LABELS = {
  mayusculas_exceso:    { label: "Muchas mayúsculas",    cls: "bg-yellow-100 text-yellow-700" },
  garantias_absolutas:  { label: "Garantías absolutas",  cls: "bg-orange-100 text-orange-700" },
  contenido_adulto:     { label: "Contenido adulto",     cls: "bg-red-100 text-red-600" },
  spam:                 { label: "Posible spam",         cls: "bg-red-100 text-red-600" },
};

const PreviewCard = ({ anuncio, onAccion }) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-semibold text-[#1B4332] text-sm">{anuncio.anunciante}</p>
            <p className="text-xs text-slate-400">{anuncio.email} · {anuncio.fecha_envio}</p>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
              {anuncio.tipo.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {anuncio.flags.map((f) => (
              <span key={f} className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${FLAG_LABELS[f]?.cls}`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {FLAG_LABELS[f]?.label}
              </span>
            ))}
          </div>
        </div>

        {/* Preview del anuncio */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-100">
            Vista previa del anuncio
          </div>
          <div className="p-4">
            {anuncio.imagen_url ? (
              <img src={anuncio.imagen_url} alt="banner" className="w-full rounded-lg mb-3 max-h-28 object-cover" />
            ) : (
              <div className="w-full h-20 bg-slate-100 rounded-lg flex items-center justify-center mb-3 text-slate-300 text-xs">
                Sin imagen · texto only
              </div>
            )}
            <p className="font-bold text-[#1B4332] text-sm">{anuncio.titulo}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{anuncio.descripcion}</p>
            <div className="flex gap-2 mt-3">
              {anuncio.link_web && (
                <a href={anuncio.link_web} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Abrir sitio
                </a>
              )}
              {anuncio.link_wa && (
                <a href={`https://wa.me/52${anuncio.link_wa}`} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-[11px] text-green-600 hover:underline">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={() => onAccion(anuncio.id, "aprobado")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprobar
          </button>
          <button
            onClick={() => onAccion(anuncio.id, "rechazado")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" /> Rechazar
          </button>
          <button
            onClick={() => onAccion(anuncio.id, "info")}
            className="flex items-center gap-1.5 border border-orange-200 text-orange-700 hover:bg-orange-50 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Creatividades de anunciantes ─── */
const CreativeCard = ({ cr, onAccion }) => {
  const backendBase = (API || "").replace("/api", "");
  const src = cr.file_url ? `${backendBase}${cr.file_url}` : null;

  return (
    <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
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
          <button
            onClick={() => onAccion(cr.id, "aprobar")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprobar
          </button>
          <button
            onClick={() => onAccion(cr.id, "rechazar")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" /> Rechazar
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminModeracion = () => {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [modal, setModal] = useState(null);
  const [motivo, setMotivo] = useState("");

  // Creatividades de anunciantes (nuevo sistema)
  const [creatividades, setCreatividades] = useState([]);
  const [modalCreative, setModalCreative] = useState(null);
  const [motivoCreative, setMotivoCreative] = useState("");

  // Campañas listas para activar (creatives aprobadas, status pending)
  const [campanasListas, setCampanasListas] = useState([]);
  const [activando, setActivando] = useState(null);

  const cargar = () => {
    adminFetch("/api/admin/anuncios?estado=pendiente")
      .then((d) => setPendientes((d.anuncios || []).map(normalizeAnuncio)))
      .catch(() => {});
    adminFetch("/api/admin/anuncios")
      .then((d) => setHistorial(
        (d.anuncios || [])
          .filter((a) => a.estado !== "pendiente")
          .map(normalizeAnuncio)
      ))
      .catch(() => {});
    adminFetch("/api/admin/creatives?status=pendiente_revision")
      .then((d) => setCreatividades(d.creatives || []))
      .catch(() => {});
    adminFetch("/api/admin/campaigns?status=pending")
      .then((d) => {
        const listas = (d.campaigns || []).filter(
          (c) => c.creatives_aprobadas > 0 && c.creatives_pendientes === 0
        );
        setCampanasListas(listas);
      })
      .catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const accion = (id, accionTipo) => {
    if (accionTipo === "rechazado") {
      setMotivo("");
      setModal({ id, accion: accionTipo });
    } else {
      aplicarAccion(id, accionTipo, "");
    }
  };

  const aplicarAccion = async (id, accionTipo, motivoTexto) => {
    try {
      if (accionTipo === "aprobado") {
        await adminFetch(`/api/admin/anuncios/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      } else if (accionTipo === "rechazado") {
        await adminFetch(`/api/admin/anuncios/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo: motivoTexto }) });
      }
      cargar();
    } catch (e) {
      alert("Error: " + e.message);
    }
    setModal(null);
    setMotivo("");
  };

  const accionCreative = (id, tipo) => {
    if (tipo === "rechazar") {
      setMotivoCreative("");
      setModalCreative({ id });
    } else {
      aplicarAccionCreative(id, "aprobar", "");
    }
  };

  const aplicarAccionCreative = async (id, tipo, motivoTexto) => {
    try {
      if (tipo === "aprobar") {
        await adminFetch(`/api/admin/creatives/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      } else {
        await adminFetch(`/api/admin/creatives/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo: motivoTexto }) });
      }
      cargar();
    } catch (e) {
      alert("Error: " + e.message);
    }
    setModalCreative(null);
    setMotivoCreative("");
  };

  const activarCampana = async (id) => {
    setActivando(id);
    try {
      await adminFetch(`/api/admin/campaigns/${id}/activar`, { method: "POST", body: JSON.stringify({}) });
      cargar();
    } catch (e) {
      alert("Error: " + e.message);
    }
    setActivando(null);
  };

  const badges = { ads: pendientes.length + creatividades.length + campanasListas.length };

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-3xl mx-auto space-y-5">

        <PageHeader icon={Megaphone} title="Moderación de Anuncios"
          subtitle={`Revisa el contenido antes de publicarlo · ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`} />

        {/* Pendientes */}
        {pendientes.length > 0 ? (
          <div className="space-y-4">
            {pendientes.map((a) => (
              <PreviewCard key={a.id} anuncio={a} onAccion={accion} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-[#B7E4C7]">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-300" />
            <p className="text-sm font-semibold">No hay anuncios pendientes de moderación</p>
            <p className="text-xs text-slate-300 mt-1">Excelente — todo al día</p>
          </div>
        )}

        {/* Creatividades de anunciantes (nuevo sistema) */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Creatividades de anunciantes — {creatividades.length} pendiente{creatividades.length !== 1 ? "s" : ""}
          </p>
          {creatividades.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creatividades.map((cr) => (
                <CreativeCard key={cr.id} cr={cr} onAccion={accionCreative} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-[#B7E4C7]">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <p className="text-sm">Sin creatividades pendientes</p>
            </div>
          )}
        </div>

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
                  <button
                    onClick={() => activarCampana(c.id)}
                    disabled={activando === c.id}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {activando === c.id ? "Activando…" : "Activar campaña"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Historial reciente</p>
            <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm divide-y divide-slate-50">
              {historial.map((h) => (
                <div key={h.id} className="flex items-center gap-4 px-5 py-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${h.estado === "aprobado" ? "bg-green-100" : "bg-red-100"}`}>
                    {h.estado === "aprobado"
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1B4332] truncate">{h.titulo}</p>
                    <p className="text-xs text-slate-400">{h.anunciante}</p>
                    {h.motivo && <p className="text-xs text-red-500 mt-0.5">Motivo: {h.motivo}</p>}
                  </div>
                  <span className="text-xs text-slate-300 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {h.fecha}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal rechazo creatividad */}
      {modalCreative && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModalCreative(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <textarea
              value={motivoCreative}
              onChange={(e) => setMotivoCreative(e.target.value)}
              rows={3}
              placeholder="Ej: El contenido no cumple con la política de anuncios..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => aplicarAccionCreative(modalCreative.id, "rechazar", motivoCreative)}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors"
              >
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

      {/* Modal rechazo */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Se enviará un email automático al anunciante con este motivo.</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: El anuncio contiene promesas de garantía no verificables..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => aplicarAccion(modal.id, "rechazado", motivo)}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Confirmar rechazo
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminModeracion;
