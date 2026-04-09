import { useNavigate } from "react-router-dom";

export default function TerminosPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos de Uso</h1>
          <p className="text-gray-500 text-sm">Última actualización: marzo 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder y utilizar <strong>PropValu</strong> ("la Plataforma"), aceptas estar sujeto a estos Términos
              de Uso. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Descripción del servicio</h2>
            <p>
              PropValu es una plataforma de valuación inmobiliaria asistida por inteligencia artificial. Los reportes y
              estimaciones generados son de carácter referencial y no constituyen una valuación formal con validez
              jurídica o fiscal, salvo que sean emitidos por un valuador certificado a través de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Registro y cuenta</h2>
            <p>
              Para acceder a funciones avanzadas debes crear una cuenta. Eres responsable de mantener la confidencialidad
              de tus credenciales y de todas las actividades realizadas desde tu cuenta. Debes notificarnos de inmediato
              cualquier uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Uso permitido</h2>
            <p>Puedes utilizar la Plataforma para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Obtener estimaciones de valor de mercado de inmuebles.</li>
              <li>Consultar comparables de mercado en tu zona de interés.</li>
              <li>Generar reportes de valuación para uso interno o con clientes.</li>
              <li>Registrarte como valuador certificado y ofrecer servicios.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Uso prohibido</h2>
            <p>Queda prohibido:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Usar la Plataforma para actividades ilegales o fraudulentas.</li>
              <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
              <li>Copiar, distribuir o modificar el contenido de la Plataforma sin autorización.</li>
              <li>Usar herramientas automatizadas (bots, scrapers) para extraer datos.</li>
              <li>Suplantar la identidad de otro usuario o de PropValu.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Pagos y suscripciones</h2>
            <p>
              Algunos servicios de PropValu están sujetos a pago. Los precios están expresados en pesos mexicanos (MXN)
              e incluyen IVA cuando aplica. Las suscripciones se renuevan automáticamente salvo que las canceles antes
              del período de renovación. No se realizan reembolsos por períodos parciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Limitación de responsabilidad</h2>
            <p>
              PropValu no garantiza la exactitud total de las valuaciones generadas. Las estimaciones se basan en datos
              de mercado disponibles y modelos estadísticos que pueden tener márgenes de error. PropValu no será
              responsable por decisiones de inversión o comerciales tomadas con base en los reportes generados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la Plataforma, incluyendo el software, algoritmos, diseño y marca, es propiedad de
              PropValu o de sus licenciantes. Queda prohibida su reproducción sin autorización expresa por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor
              al ser publicados en la Plataforma. El uso continuado del servicio implica la aceptación de los términos
              modificados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá
              a la jurisdicción de los tribunales competentes de la Ciudad de México.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre estos términos, escríbenos a{" "}
              <a href="mailto:legal@propvalu.mx" className="text-blue-600 hover:underline">
                legal@propvalu.mx
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
