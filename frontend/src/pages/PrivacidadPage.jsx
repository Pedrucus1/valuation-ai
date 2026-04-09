import { useNavigate } from "react-router-dom";

export default function PrivacidadPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
          >
            ← Volver al inicio
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
          <p className="text-gray-500 text-sm">Última actualización: marzo 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <p>
              En <strong>PropValu</strong> recopilamos información que nos proporcionas directamente al utilizar nuestros
              servicios: datos del inmueble a valuar (superficie, ubicación, características), información de contacto
              cuando creas una cuenta, y datos de uso de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Uso de la información</h2>
            <p>Utilizamos tu información para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Generar valuaciones y reportes inmobiliarios precisos.</li>
              <li>Mejorar nuestros modelos de inteligencia artificial.</li>
              <li>Enviarte notificaciones relacionadas con tus valuaciones (solo si lo autorizas).</li>
              <li>Cumplir con obligaciones legales y fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Compartición de datos</h2>
            <p>
              No vendemos tu información personal a terceros. Podemos compartir datos agregados y anonimizados con fines
              estadísticos o de investigación de mercado. Los datos del inmueble pueden ser utilizados para enriquecer
              nuestra base de comparables, siempre de forma anonimizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tu información contra accesos no autorizados,
              pérdida o alteración. La comunicación entre tu navegador y nuestros servidores se realiza mediante cifrado
              HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Tus derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Acceder a los datos que tenemos sobre ti.</li>
              <li>Solicitar la corrección o eliminación de tus datos.</li>
              <li>Oponerte al tratamiento de tus datos para fines de marketing.</li>
              <li>Solicitar la portabilidad de tus datos.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, contáctanos en{" "}
              <a href="mailto:privacidad@propvalu.mx" className="text-blue-600 hover:underline">
                privacidad@propvalu.mx
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
            <p>
              Utilizamos cookies de sesión para mantener tu inicio de sesión activo y cookies analíticas para entender
              cómo se utiliza la plataforma. Puedes configurar tu navegador para rechazar cookies, aunque esto puede
              afectar algunas funciones del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. Te notificaremos sobre cambios significativos por correo
              electrónico o mediante un aviso destacado en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta política, escríbenos a{" "}
              <a href="mailto:privacidad@propvalu.mx" className="text-blue-600 hover:underline">
                privacidad@propvalu.mx
              </a>
              .
            </p>
          </section>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">PropValu · Todos los derechos reservados · México</p>
      </div>
    </div>
  );
}
