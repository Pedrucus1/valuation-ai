import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-3 border-l-4 border-[#52B788] pl-3">
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacidadPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1B4332] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Building2 className="w-5 h-5 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">
            Legal
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Política de Privacidad
          </h1>
          <p className="text-slate-500 text-sm">
            Última actualización: 19 de marzo de 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <Section title="1. Quiénes somos">
            <p>
              PropValu es una plataforma tecnológica de estimación de valor de bienes inmuebles
              mediante inteligencia artificial, operada en México. Al utilizar nuestros servicios,
              usted acepta las prácticas descritas en esta Política de Privacidad.
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Datos de registro:</strong> nombre, correo electrónico, teléfono, contraseña (almacenada cifrada con bcrypt).</li>
              <li><strong>Datos del inmueble:</strong> ubicación, superficie, características físicas ingresadas en el formulario de valuación.</li>
              <li><strong>Datos fiscales (anunciantes):</strong> RFC, razón social, régimen fiscal, uso de CFDI.</li>
              <li><strong>Datos de navegación:</strong> dirección IP, tipo de dispositivo, navegador, páginas visitadas.</li>
              <li><strong>Datos de pago:</strong> los pagos son procesados por pasarelas de terceros; PropValu no almacena datos de tarjetas bancarias.</li>
            </ul>
          </Section>

          <Section title="3. Uso de la información">
            <p>Utilizamos sus datos para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Generar estimaciones de valor y reportes de avalúo.</li>
              <li>Crear y gestionar su cuenta de usuario.</li>
              <li>Procesar pagos y emitir facturas o CFDI cuando aplique.</li>
              <li>Enviar notificaciones relacionadas con sus valuaciones o cuenta.</li>
              <li>Mejorar nuestros modelos de inteligencia artificial y la plataforma.</li>
              <li>Enviar el Newsletter de Inteligencia de Mercado (solo con su consentimiento).</li>
            </ul>
          </Section>

          <Section title="4. Compartición de datos">
            <p>
              PropValu no vende ni renta su información personal a terceros. Podemos compartir datos con:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Proveedores de servicios tecnológicos (hosting, APIs de mapas, inteligencia artificial) bajo contratos de confidencialidad.</li>
              <li>Autoridades fiscales o judiciales cuando la ley así lo requiera.</li>
              <li>Valuadores certificados asignados a su solicitud, en el caso de planes con revisión humana.</li>
            </ul>
          </Section>

          <Section title="5. Seguridad de los datos">
            <p>
              Implementamos medidas técnicas y organizativas para proteger su información, incluyendo
              cifrado de contraseñas, conexiones HTTPS y acceso restringido a bases de datos. Sin embargo,
              ningún sistema es 100% infalible y no podemos garantizar seguridad absoluta.
            </p>
          </Section>

          <Section title="6. Retención de datos">
            <p>
              Los reportes de avalúo se retienen por un período de 3 meses desde su generación. Los datos
              de cuenta se conservan mientras la cuenta esté activa. Al solicitar la eliminación de su cuenta,
              sus datos serán anonimizados dentro de un plazo de 30 días hábiles.
            </p>
          </Section>

          <Section title="7. Cookies y tecnologías de seguimiento">
            <p>
              Utilizamos cookies de sesión para mantener su inicio de sesión activo. No utilizamos cookies
              de rastreo publicitario de terceros. Puede deshabilitar las cookies en la configuración de
              su navegador, aunque esto puede afectar la funcionalidad de la plataforma.
            </p>
          </Section>

          <Section title="8. Derechos ARCO">
            <p>
              De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares (LFPDPPP), usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse
              al tratamiento de sus datos personales. Para ejercer estos derechos, contáctenos en:{" "}
              <span className="text-[#52B788] font-semibold">privacidad@propvalu.mx</span>
            </p>
          </Section>

          <Section title="9. Cambios a esta política">
            <p>
              PropValu se reserva el derecho de actualizar esta Política de Privacidad. Los cambios
              sustanciales serán notificados por correo electrónico o mediante aviso destacado en la
              plataforma. El uso continuado del servicio después de una modificación constituye aceptación
              de los nuevos términos.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Para consultas sobre privacidad:{" "}
              <span className="text-[#52B788] font-semibold">privacidad@propvalu.mx</span>
            </p>
          </Section>
        </div>
      </main>

      <footer className="text-center py-8 text-slate-400 text-xs">
        © 2026 PropValu. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default PrivacidadPage;
