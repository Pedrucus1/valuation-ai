import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowLeft, CheckCircle, Clock, XCircle, Shield } from "lucide-react";
import { API } from "@/App";

const MEXICAN_STATES = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];

const STEPS = [
  { id: 1, label: "Datos personales" },
  { id: 2, label: "Credenciales profesionales" },
  { id: 3, label: "Cobertura y perfil" },
  { id: 4, label: "Confirmación" },
];

const KYCRegistroPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", curp: "",
    cedula_number: "", cnbv_number: "", despacho: "",
    states_coverage: [], city_coverage: "", bio: "",
    ine_doc_url: "", cedula_doc_url: "", photo_url: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleState = (state) => {
    setForm(f => ({
      ...f,
      states_coverage: f.states_coverage.includes(state)
        ? f.states_coverage.filter(s => s !== state)
        : [...f.states_coverage, state],
    }));
  };

  const checkExisting = async () => {
    if (!form.email) return;
    try {
      const r = await fetch(`${API}/kyc/status?email=${encodeURIComponent(form.email)}`);
      if (r.ok) {
        const data = await r.json();
        setApplicationStatus(data);
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.cedula_number) {
      toast.error("Completa los campos obligatorios: nombre, correo y cédula profesional");
      return;
    }
    setIsSubmitting(true);
    try {
      const r = await fetch(`${API}/kyc/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 409) {
          setApplicationStatus(data.application);
          setSubmitted(true);
          return;
        }
        throw new Error(data.error || "Error al enviar solicitud");
      }
      setApplicationStatus(data);
      setSubmitted(true);
      toast.success("¡Solicitud enviada! Revisaremos tus documentos en 1-2 días hábiles.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = ({ label, field, placeholder, required = false, type = "text", hint }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      <input
        type={type}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300"
      />
    </div>
  );

  // ── Estado de solicitud existente ─────────────────────────────────
  if (submitted && applicationStatus) {
    const statusConfig = {
      pending: { icon: <Clock className="w-10 h-10 text-amber-500" />, title: "Solicitud en revisión", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
      approved: { icon: <CheckCircle className="w-10 h-10 text-[#52B788]" />, title: "¡Solicitud aprobada!", color: "text-[#1B4332]", bg: "bg-[#f0faf4] border-[#52B788]" },
      rejected: { icon: <XCircle className="w-10 h-10 text-red-500" />, title: "Solicitud rechazada", color: "text-red-600", bg: "bg-red-50 border-red-200" },
    };
    const cfg = statusConfig[applicationStatus.status] || statusConfig.pending;

    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">{cfg.icon}</div>
          <h2 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">{cfg.title}</h2>
          <div className={`rounded-xl border p-4 mb-6 text-left ${cfg.bg}`}>
            <p className="text-sm font-semibold text-slate-700 mb-1">Folio: <span className="font-mono">{applicationStatus.id}</span></p>
            <p className="text-sm text-slate-600">Solicitante: <strong>{applicationStatus.full_name}</strong></p>
            <p className="text-sm text-slate-600">Cédula: <strong>{applicationStatus.cedula_number}</strong></p>
            <p className="text-sm text-slate-500 mt-2">
              Enviada: {new Date(applicationStatus.created_at).toLocaleDateString('es-MX')}
            </p>
            {applicationStatus.reviewer_notes && (
              <p className="text-sm text-slate-600 mt-2 border-t pt-2">
                Notas: {applicationStatus.reviewer_notes}
              </p>
            )}
          </div>
          {applicationStatus.status === 'pending' && (
            <p className="text-xs text-slate-500 mb-4">
              Revisaremos tus documentos en 1-2 días hábiles. Te notificaremos por correo a <strong>{applicationStatus.email}</strong>.
            </p>
          )}
          {applicationStatus.status === 'approved' && (
            <p className="text-xs text-[#1B4332] mb-4">
              Tu cuenta ya tiene acceso al perfil de valuador. Puedes iniciar sesión para acceder a tu dashboard.
            </p>
          )}
          <Button onClick={() => navigate("/")} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
            Ir al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <Button variant="ghost" onClick={() => navigate("/para-valuadores")} className="text-[#1B4332] -ml-3 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#1B4332]" />
            <h1 className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Registro de Valuador Profesional</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Verificación KYC — INE + Cédula Profesional</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step > s.id ? "bg-[#52B788] text-white" :
                step === s.id ? "bg-[#1B4332] text-white" :
                "bg-slate-200 text-slate-500"
              }`}>
                {step > s.id ? "✓" : s.id}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${step === s.id ? "text-[#1B4332]" : "text-slate-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? "bg-[#52B788]" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            {/* PASO 1: Datos personales */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Datos Personales</h2>
                <InputField field="full_name" label="Nombre completo" placeholder="Nombre tal como aparece en tu cédula" required />
                <InputField field="email" label="Correo electrónico" type="email" placeholder="correo@despacho.com" required
                  hint="Usa el correo con el que iniciarás sesión en PropValu"
                />
                <InputField field="phone" label="Teléfono / WhatsApp" placeholder="+52 55 1234 5678" />
                <InputField field="curp" label="CURP" placeholder="18 caracteres" hint="Opcional — para validación de identidad" />
                <InputField field="despacho" label="Nombre del despacho / empresa" placeholder="Ej. Vergara Valuaciones S.C." />
                <InputField field="photo_url" label="URL de tu foto profesional" placeholder="https://..." hint="Opcional — aparecerá en tu perfil público" />
              </div>
            )}

            {/* PASO 2: Credenciales profesionales */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Credenciales Profesionales</h2>
                <InputField field="cedula_number" label="Número de cédula profesional" placeholder="Ej. 12345678" required
                  hint="Emitida por la SEP — se verifica en el Registro Nacional de Profesionistas"
                />
                <InputField field="cnbv_number" label="Número de registro CNBV / INDAABIN" placeholder="Ej. AV-1234"
                  hint="Si aplica — para avalúos bancarios o gobierno"
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    URL del documento INE (foto) <span className="text-slate-400 font-normal text-xs">— opcional por ahora</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-1">Puedes compartir un link de Google Drive o Dropbox con la imagen de tu INE vigente</p>
                  <input
                    value={form.ine_doc_url}
                    onChange={e => set("ine_doc_url", e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    URL del documento cédula profesional <span className="text-slate-400 font-normal text-xs">— opcional por ahora</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-1">Foto o PDF de tu cédula profesional vigente</p>
                  <input
                    value={form.cedula_doc_url}
                    onChange={e => set("cedula_doc_url", e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-700 font-semibold">⚠️ Validación anual</p>
                  <p className="text-xs text-amber-600 mt-1">PropValu requiere renovación de documentos cada 12 meses para mantener el perfil activo.</p>
                </div>
              </div>
            )}

            {/* PASO 3: Cobertura y perfil */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Área de Cobertura y Perfil</h2>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Estados donde operas <span className="text-slate-400 font-normal text-xs">(selecciona todos los que apliquen)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                    {MEXICAN_STATES.map(state => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => toggleState(state)}
                        className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                          form.states_coverage.includes(state)
                            ? "bg-[#f0faf4] border-[#52B788] text-[#1B4332] font-semibold"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {form.states_coverage.includes(state) ? "✓ " : ""}{state}
                      </button>
                    ))}
                  </div>
                </div>
                <InputField field="city_coverage" label="Ciudad(es) principal(es) de operación" placeholder="Ej. CDMX, Guadalajara, Monterrey" />
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Breve presentación profesional <span className="text-slate-400 font-normal text-xs">— opcional</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-1">Aparecerá en tu perfil público. Máximo 300 caracteres.</p>
                  <textarea
                    value={form.bio}
                    onChange={e => set("bio", e.target.value.slice(0, 300))}
                    rows={3}
                    placeholder="Ej. Valuador con 10 años de experiencia en zona metropolitana, especializado en inmuebles residenciales y comerciales..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-700 placeholder:text-slate-300 resize-none"
                  />
                  <p className="text-xs text-slate-400 text-right mt-1">{form.bio.length}/300</p>
                </div>
              </div>
            )}

            {/* PASO 4: Confirmación */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Revisión y Confirmación</h2>
                <div className="bg-[#f0faf4] border border-[#b7e4c7] rounded-xl p-5 space-y-2">
                  <Row label="Nombre" value={form.full_name} />
                  <Row label="Correo" value={form.email} />
                  <Row label="Teléfono" value={form.phone || "—"} />
                  <Row label="Cédula profesional" value={form.cedula_number} />
                  <Row label="Registro CNBV/INDAABIN" value={form.cnbv_number || "—"} />
                  <Row label="Despacho" value={form.despacho || "—"} />
                  <Row label="Cobertura" value={form.states_coverage.length > 0 ? form.states_coverage.join(", ") : "—"} />
                  <Row label="Ciudad principal" value={form.city_coverage || "—"} />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs text-blue-700 font-semibold">📋 Proceso de revisión</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Nuestro equipo revisará tu solicitud en 1-2 días hábiles. Verificaremos tu cédula en el
                    Registro Nacional de Profesionistas de la SEP. Recibirás una notificación por correo.
                  </p>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                  <input type="checkbox" id="terms" className="mt-0.5 accent-[#52B788]" required />
                  <label htmlFor="terms" className="text-xs text-slate-600">
                    Acepto los <span className="text-[#1B4332] font-semibold underline cursor-pointer">Términos y Condiciones</span> de PropValu,
                    incluyendo la comisión del 20% sobre trabajos asignados y la renovación anual de documentos.
                  </label>
                </div>
              </div>
            )}

            {/* Navegación entre pasos */}
            <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="border-slate-300 text-slate-600">
                  ← Anterior
                </Button>
              ) : <div />}
              {step < 4 ? (
                <Button
                  onClick={() => {
                    if (step === 1 && !form.full_name) { toast.error("Ingresa tu nombre completo"); return; }
                    if (step === 1 && !form.email) { toast.error("Ingresa tu correo electrónico"); return; }
                    if (step === 2 && !form.cedula_number) { toast.error("Ingresa tu número de cédula profesional"); return; }
                    if (step === 1) checkExisting();
                    setStep(s => s + 1);
                  }}
                  className="bg-[#52B788] hover:bg-[#40916C] text-white gap-2"
                >
                  Continuar →
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-700 text-right max-w-xs truncate">{value}</span>
  </div>
);

export default KYCRegistroPage;
