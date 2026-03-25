import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ContactoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending (no real endpoint yet)
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
          >
            ← Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacto</h1>
          <p className="text-gray-500 text-sm">
            ¿Tienes dudas, comentarios o necesitas soporte? Estamos aquí para ayudarte.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-2xl mb-2">📧</div>
            <p className="text-xs text-gray-500 mb-1">Correo general</p>
            <a href="mailto:hola@propvalu.mx" className="text-sm font-medium text-blue-600 hover:underline">
              hola@propvalu.mx
            </a>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-2xl mb-2">🛠️</div>
            <p className="text-xs text-gray-500 mb-1">Soporte técnico</p>
            <a href="mailto:soporte@propvalu.mx" className="text-sm font-medium text-blue-600 hover:underline">
              soporte@propvalu.mx
            </a>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-2xl mb-2">🤝</div>
            <p className="text-xs text-gray-500 mb-1">Alianzas comerciales</p>
            <a href="mailto:ventas@propvalu.mx" className="text-sm font-medium text-blue-600 hover:underline">
              ventas@propvalu.mx
            </a>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Mensaje enviado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Hemos recibido tu mensaje y te responderemos en un plazo de 24–48 horas hábiles.
              </p>
              <button
                onClick={() => navigate("/")}
                className="text-sm px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Envíanos un mensaje</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Correo electrónico *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="tu@correo.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Asunto *</label>
                  <select
                    name="asunto"
                    required
                    value={form.asunto}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecciona un asunto</option>
                    <option value="soporte">Soporte técnico</option>
                    <option value="facturacion">Facturación y pagos</option>
                    <option value="valuador">Registro como valuador</option>
                    <option value="anunciante">Publicidad en la plataforma</option>
                    <option value="alianza">Alianza o integración</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Mensaje *</label>
                  <textarea
                    name="mensaje"
                    required
                    value={form.mensaje}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe tu consulta con el mayor detalle posible..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando…" : "Enviar mensaje"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">PropValu · Todos los derechos reservados · México</p>
      </div>
    </div>
  );
}
