import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Send, CheckCircle2, AlertCircle, ChevronDown, Paperclip, X } from "lucide-react";
import { API } from "@/App";

const TIPOS = [
  { value: "bug", label: "🐛 Error técnico / Bug" },
  { value: "sugerencia", label: "💡 Sugerencia de mejora" },
  { value: "queja_valuador", label: "⚠️ Queja sobre un valuador" },
  { value: "calificacion_valuador", label: "⭐ Calificación de valuador" },
  { value: "queja_anuncio", label: "🚫 Queja sobre un anuncio" },
  { value: "queja_general", label: "📋 Queja general del servicio" },
];

const VALUADORES_MOCK = [
  { id: "v1", nombre: "Ing. Roberto Sánchez Ávila", ciudad: "Guadalajara" },
  { id: "v2", nombre: "Arq. María Fernanda López", ciudad: "Zapopan" },
  { id: "v3", nombre: "Ing. Carlos Mendoza Ruiz", ciudad: "Tlaquepaque" },
  { id: "v4", nombre: "Arq. Sofía Torres Herrera", ciudad: "Tonalá" },
  { id: "v5", nombre: "Ing. Jorge Ramírez Castro", ciudad: "Puerto Vallarta" },
];

const ESTRELLAS = [1, 2, 3, 4, 5];

const FeedbackPage = () => {
  const navigate = useNavigate();

  const [tipo, setTipo] = useState("");
  const [valuadorId, setValuadorId] = useState("");
  const [estrellas, setEstrellas] = useState(0);
  const [estrellasHover, setEstrellasHover] = useState(0);
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [autoriza, setAutoriza] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [folio, setFolio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const esQueja = tipo === "queja_valuador";
  const esCalificacion = tipo === "calificacion_valuador";
  const necesitaValuador = esQueja || esCalificacion;

  const descMinLen = tipo === "sugerencia" ? 30 : 50;
  const descValida = descripcion.trim().length >= descMinLen;

  const puedeEnviar =
    tipo &&
    descValida &&
    (!necesitaValuador || valuadorId) &&
    (!esCalificacion || estrellas > 0) &&
    autoriza &&
    !enviando;

  const handleArchivo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("El archivo no debe superar 5 MB.");
      return;
    }
    setError("");
    setArchivo(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    setError("");

    const payload = {
      tipo,
      descripcion: descripcion.trim(),
      email: contacto.trim() || null,
      nombre: nombre.trim() || "Anónimo",
      valuador_id: valuadorId || null,
      calificacion: esCalificacion ? estrellas : null,
    };

    try {
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al enviar, intenta de nuevo.");
      const data = await res.json();
      setFolio(data.folio || `PV-FB-${Date.now()}`);
      setEnviado(true);
    } catch (err) {
      setError(err.message || "Error al enviar el reporte.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#D9ED92] flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-[#1B4332]" />
          </div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332] mb-2">
            ¡Reporte recibido!
          </h1>
          <p className="text-slate-500 text-sm mb-4">
            Tu reporte fue registrado con el folio:
          </p>
          <p className="font-mono text-sm bg-[#F8F9FA] rounded-lg px-4 py-2 text-[#1B4332] font-bold mb-6">
            {folio}
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Revisaremos tu reporte en un plazo máximo de <strong>10 días hábiles</strong>.
            Si proporcionaste un correo o teléfono, te notificaremos el resultado.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-[#1B4332] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#163828] transition-colors"
            >
              Ir al inicio
            </button>
            <button
              onClick={() => {
                setEnviado(false);
                setTipo("");
                setValuadorId("");
                setEstrellas(0);
                setDescripcion("");
                setNombre("");
                setContacto("");
                setAutoriza(false);
                setArchivo(null);
                setFolio("");
              }}
              className="w-full border border-slate-200 text-slate-600 rounded-xl py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Enviar otro reporte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1B4332] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Building2 className="w-5 h-5 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">
            Comunidad · Retroalimentación
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Quejas y Sugerencias
          </h1>
          <p className="text-slate-500 text-sm">
            Tu opinión nos ayuda a mejorar. Todos los reportes son revisados por nuestro equipo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tipo de reporte */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <label className="block text-sm font-semibold text-[#1B4332] mb-3">
              ¿Qué tipo de reporte es? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTipo(t.value); setValuadorId(""); setEstrellas(0); }}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    tipo === t.value
                      ? "border-[#52B788] bg-[#52B788]/10 text-[#1B4332] font-semibold"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de valuador */}
          {necesitaValuador && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <label className="block text-sm font-semibold text-[#1B4332] mb-3">
                Selecciona el valuador <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={valuadorId}
                  onChange={(e) => setValuadorId(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788] pr-10"
                >
                  <option value="">— Selecciona un valuador —</option>
                  {VALUADORES_MOCK.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} · {v.ciudad}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {esCalificacion && valuadorId && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#1B4332] mb-2">
                    Calificación <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-2">
                    {ESTRELLAS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEstrellas(s)}
                        onMouseEnter={() => setEstrellasHover(s)}
                        onMouseLeave={() => setEstrellasHover(0)}
                        className="text-2xl transition-transform hover:scale-110"
                      >
                        <span className={(estrellasHover || estrellas) >= s ? "text-yellow-400" : "text-slate-200"}>
                          ★
                        </span>
                      </button>
                    ))}
                    {estrellas > 0 && (
                      <span className="text-sm text-slate-400 self-center ml-1">
                        {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][estrellas]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          {tipo && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <label className="block text-sm font-semibold text-[#1B4332] mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Mínimo {descMinLen} caracteres. Cuéntanos con detalle qué ocurrió.
              </p>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                placeholder={
                  tipo === "bug"
                    ? "Describe el error: ¿qué hacías?, ¿qué esperabas que pasara?, ¿qué pasó?"
                    : tipo === "sugerencia"
                    ? "¿Qué mejoraría tu experiencia con PropValu?"
                    : tipo === "queja_valuador"
                    ? "¿Qué ocurrió? Incluye fecha aproximada del encargo y el número de reporte si lo tienes."
                    : tipo === "calificacion_valuador"
                    ? "Cuéntanos sobre tu experiencia con este valuador."
                    : tipo === "queja_anuncio"
                    ? "¿Qué anuncio te molestó y por qué? ¿Incumple alguna política?"
                    : "Describe tu queja con el mayor detalle posible."
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788]"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${descValida ? "text-[#52B788]" : "text-slate-400"}`}>
                  {descripcion.trim().length}/{descMinLen} mínimo
                </span>
                <span className="text-xs text-slate-400">{descripcion.length} / 2000</span>
              </div>

              {/* Adjunto */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Adjunto opcional (max 5 MB)</p>
                {archivo ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                    <Paperclip className="w-4 h-4 text-[#52B788]" />
                    <span className="flex-1 truncate">{archivo.name}</span>
                    <button type="button" onClick={() => setArchivo(null)}>
                      <X className="w-4 h-4 text-slate-400 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer border border-dashed border-slate-200 rounded-xl px-4 py-3 hover:border-[#52B788]/50 hover:bg-slate-50 transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <span>Adjuntar imagen o PDF</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleArchivo} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Datos de contacto */}
          {tipo && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-[#1B4332] mb-4">
                Tus datos (opcionales pero recomendados)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nombre o alias</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre (o déjalo vacío para reporte anónimo)"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email o WhatsApp</label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Para notificarte del resultado"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Autorización y envío */}
          {tipo && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoriza}
                  onChange={(e) => setAutoriza(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1B4332]"
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  Confirmo que la información proporcionada es verídica y autorizo a PropValu
                  a procesarla conforme a su{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/privacidad")}
                    className="text-[#52B788] hover:underline font-medium"
                  >
                    Política de Privacidad
                  </button>
                  .
                </span>
              </label>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!puedeEnviar}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[#1B4332] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#163828] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {enviando ? "Enviando..." : "Enviar reporte"}
              </button>

              {!descValida && descripcion.length > 0 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Necesitas al menos {descMinLen} caracteres en la descripción.
                </p>
              )}
            </div>
          )}
        </form>

        {/* Info estados */}
        <div className="mt-8 bg-[#1B4332]/5 border border-[#52B788]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#1B4332] mb-2">¿Qué pasa después de enviar?</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Recibido</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">En revisión</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Resuelto</span>
            <span className="text-slate-300">|</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">Cerrado</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Plazo máximo de respuesta: 10 días hábiles.</p>
        </div>
      </main>
    </div>
  );
};

export default FeedbackPage;
