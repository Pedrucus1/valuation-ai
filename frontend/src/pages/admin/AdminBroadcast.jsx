import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard } from "@/components/AdminUI";
import { Send, Users, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const SEGMENTOS = [
  { value: "todos_valuadores",   label: "Todos los valuadores activos",            count: 38 },
  { value: "plan_basico",        label: "Valuadores plan Básico",                  count: 12 },
  { value: "plan_pro",           label: "Valuadores plan Pro",                     count: 21 },
  { value: "plan_enterprise",    label: "Valuadores Enterprise",                   count: 5  },
  { value: "kyc_pendiente",      label: "Con verificación pendiente",              count: 2  },
  { value: "sin_actividad_30d",  label: "Sin actividad en 30+ días",              count: 7  },
  { value: "guadalajara",        label: "Valuadores en Guadalajara / ZMG",        count: 24 },
  { value: "todos_inmobiliarias",label: "Todas las inmobiliarias activas",        count: 15 },
];

const PLANTILLAS = [
  {
    id: "bienvenida",
    nombre: "Bienvenida a nuevo plan",
    asunto: "¡Bienvenido a PropValu Pro!",
    cuerpo: "Hola {{nombre}},\n\nTu cuenta PropValu ya está activa con el plan Pro. A partir de hoy tienes acceso a:\n\n- Reportes con sello oficial y QR de verificación\n- Selección avanzada de comparables\n- Prioridad en la asignación de encargos\n\nCualquier duda, escríbenos a soporte@propvalu.mx\n\nSaludos,\nEquipo PropValu",
  },
  {
    id: "actualiza_documentos",
    nombre: "Recordatorio: actualiza tu documentación",
    asunto: "Tu seguro RC está por vencer — actualiza tu verificación",
    cuerpo: "Hola {{nombre}},\n\nDetectamos que tu seguro de responsabilidad civil vence en los próximos 15 días.\n\nPara mantener tu cuenta activa, sube el documento renovado antes del {{fecha_vencimiento}}.\n\nIngresa a: propvalu.mx/dashboard/valuador\n\nEquipo PropValu",
  },
  {
    id: "nueva_funcionalidad",
    nombre: "Nueva funcionalidad disponible",
    asunto: "Novedad: ahora puedes agregar fotos directamente desde tu celular",
    cuerpo: "Hola {{nombre}},\n\nYa puedes capturar y subir fotos del inmueble desde tu teléfono al llenar el formulario de valuación.\n\nSigue mejorando con PropValu,\nEquipo PropValu",
  },
];

const HISTORIAL = [
  { id: "b1", asunto: "Recuerda completar tu verificación", segmento: "kyc_pendiente", enviados: 2, abiertos: 2, fecha: "2026-03-18" },
  { id: "b2", asunto: "¡Aumentó la demanda en Tlaquepaque!", segmento: "guadalajara", enviados: 24, abiertos: 18, fecha: "2026-03-15" },
];

const AdminBroadcast = () => {
  const [segmento, setSegmento] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [preview, setPreview] = useState(false);

  const seg = SEGMENTOS.find((s) => s.value === segmento);

  const cargarPlantilla = (id) => {
    const p = PLANTILLAS.find((t) => t.id === id);
    if (p) { setAsunto(p.asunto); setCuerpo(p.cuerpo); }
    setPlantillaSeleccionada(id);
  };

  const enviar = async () => {
    if (!segmento || !asunto.trim() || !cuerpo.trim()) return;
    setEnviando(true);
    await new Promise((r) => setTimeout(r, 1200));
    setResultado({ enviados: seg.count, asunto, segmento: seg.label });
    setEnviando(false);
    setSegmento(""); setAsunto(""); setCuerpo(""); setPlantillaSeleccionada("");
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        <PageHeader icon={Send} title="Broadcast Email"
          subtitle="Envía mensajes segmentados a valuadores e inmobiliarias" />

        {resultado && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">Email enviado correctamente</p>
              <p className="text-xs text-green-600 mt-0.5">
                «{resultado.asunto}» → {resultado.enviados} destinatarios ({resultado.segmento})
              </p>
            </div>
            <button onClick={() => setResultado(null)} className="text-green-400 hover:text-green-600">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-4">

            <AdminCard icon={Users} title="Segmento de destinatarios">
              <div className="p-5">
                <div className="relative">
                  <select value={segmento} onChange={(e) => setSegmento(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 pr-10">
                    <option value="">— Seleccionar segmento —</option>
                    {SEGMENTOS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label} ({s.count})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {seg && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#1B4332] bg-[#D9ED92]/30 rounded-xl px-4 py-2.5">
                    <Users className="w-4 h-4 text-[#52B788]" />
                    <strong>{seg.count}</strong> destinatarios recibirán este email
                  </div>
                )}
              </div>
            </AdminCard>

            <AdminCard icon={Send} title="Plantillas">
              <div className="p-5 grid grid-cols-1 gap-2">
                {PLANTILLAS.map((p) => (
                  <button key={p.id} type="button" onClick={() => cargarPlantilla(p.id)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      plantillaSeleccionada === p.id
                        ? "border-[#52B788] bg-[#52B788]/10 text-[#1B4332] font-semibold"
                        : "border-slate-200 text-slate-600 hover:border-[#52B788]/50"
                    }`}>
                    {p.nombre}
                  </button>
                ))}
              </div>
            </AdminCard>

            <AdminCard icon={Send} title="Redactar mensaje">
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                    Asunto <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={asunto} onChange={(e) => setAsunto(e.target.value)}
                    placeholder="Asunto del email..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                    Cuerpo <span className="text-red-500">*</span>
                  </label>
                  <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={10}
                    placeholder="Escribe el mensaje aquí... Usa {{nombre}} para personalizar."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
                  <p className="text-xs text-slate-400 mt-1">Variables: {"{{nombre}}"} · {"{{fecha_vencimiento}}"} · {"{{plan}}"}</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                    {preview ? "Ocultar preview" : "Vista previa"}
                  </button>
                  <button type="button" onClick={enviar}
                    disabled={!segmento || !asunto.trim() || !cuerpo.trim() || enviando}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    <Send className="w-4 h-4" />
                    {enviando ? "Enviando..." : `Enviar${seg ? ` a ${seg.count} destinatarios` : ""}`}
                  </button>
                </div>
                {preview && asunto && (
                  <div className="border border-[#B7E4C7] rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-4 py-2 text-xs text-[#D9ED92]/70 font-semibold uppercase tracking-wide">
                      Vista previa
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-sm text-[#1B4332] mb-2">{asunto}</p>
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                        {cuerpo.replace("{{nombre}}", "Ing. Roberto Sánchez").replace("{{fecha_vencimiento}}", "15 de abril de 2026").replace("{{plan}}", "Pro")}
                      </pre>
                    </div>
                  </div>
                )}
                {!segmento && asunto && (
                  <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Selecciona un segmento antes de enviar.
                  </div>
                )}
              </div>
            </AdminCard>
          </div>

          {/* Historial + info canal */}
          <div className="space-y-4">
            <AdminCard icon={Send} title="Historial reciente">
              <div className="p-4">
                {HISTORIAL.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin envíos aún.</p>
                ) : (
                  <div className="space-y-3">
                    {HISTORIAL.map((h) => (
                      <div key={h.id} className="border border-[#B7E4C7] rounded-xl p-3">
                        <p className="text-xs font-semibold text-[#1B4332] leading-snug">{h.asunto}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{h.segmento}</p>
                        <div className="flex justify-between mt-2 text-[11px]">
                          <span className="text-slate-500">{h.enviados} enviados</span>
                          <span className="text-[#52B788] font-semibold">{Math.round((h.abiertos / h.enviados) * 100)}% abiertos</span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1">{h.fecha}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminCard>

            <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-[#1B4332]">Canal actual: Email</p>
              <p>Proveedor: SendGrid (gratis hasta 100/día)</p>
              <p className="text-slate-400">WhatsApp API disponible cuando haya 50+ valuadores</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBroadcast;
