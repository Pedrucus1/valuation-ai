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

const TerminosPage = () => {
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
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-500 text-sm">
            Última actualización: 19 de marzo de 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <Section title="1. Aceptación de los términos">
            <p>
              Al acceder y utilizar la plataforma PropValu (en adelante "la Plataforma"), usted acepta
              quedar vinculado por los presentes Términos y Condiciones de Uso. Si no está de acuerdo
              con alguno de estos términos, deberá abstenerse de utilizar la Plataforma.
            </p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>
              PropValu proporciona estimaciones de valor de bienes inmuebles mediante modelos de
              inteligencia artificial y análisis de comparables de mercado. Los reportes generados
              por la Plataforma son <strong>estimaciones referenciales</strong> y no constituyen un
              avalúo oficial con validez legal ante notarías, instituciones financieras o autoridades
              fiscales.
            </p>
            <p>
              Para avalúos con validez legal, se requiere la intervención de un valuador certificado
              con cédula profesional vigente, la cual puede ser solicitada como servicio adicional
              a través de la Plataforma.
            </p>
          </Section>

          <Section title="3. Registro y cuentas de usuario">
            <p>
              Para acceder a ciertos servicios es necesario crear una cuenta. Usted es responsable
              de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades
              que ocurran bajo su cuenta. Notifique inmediatamente a PropValu ante cualquier uso no
              autorizado de su cuenta.
            </p>
          </Section>

          <Section title="4. Paquetes, créditos y pagos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA (16%).</li>
              <li>Los créditos adquiridos tienen vigencia mensual y no son acumulables al siguiente período.</li>
              <li><strong>Política de no devoluciones:</strong> todos los pagos son finales e irrevocables. No se realizan reembolsos bajo ninguna circunstancia, incluyendo valuaciones no utilizadas.</li>
              <li>El incumplimiento de pago por más de 30 días naturales resultará en la suspensión inmediata de la cuenta.</li>
              <li>Los reportes de avalúo de más de 3 meses pueden reutilizarse por un costo de recuperación de $80 MXN + actualización.</li>
            </ul>
          </Section>

          <Section title="5. Roles y acceso a la plataforma">
            <p>La Plataforma distingue los siguientes perfiles de usuario:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Público general:</strong> acceso a valuaciones individuales mediante pago por evento.</li>
              <li><strong>Valuador certificado:</strong> acceso a herramientas profesionales previa verificación de cédula (KYC). Los valuadores asignados a trabajos tienen un SLA de 24 horas para aceptar o rechazar la asignación.</li>
              <li><strong>Inmobiliaria:</strong> acceso a planes corporativos con créditos compartidos para el equipo.</li>
            </ul>
          </Section>

          <Section title="6. Limitación de responsabilidad">
            <p>
              PropValu proporciona el servicio "tal cual" y no garantiza la exactitud total de las
              estimaciones generadas por inteligencia artificial. El usuario acepta que:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Las estimaciones son referenciales y pueden diferir del valor de mercado real.</li>
              <li>PropValu no es responsable de decisiones de compraventa, financiamiento o inversión basadas en los reportes.</li>
              <li>La disponibilidad de comparables depende de fuentes de terceros y puede ser limitada en ciertas zonas geográficas.</li>
              <li>PropValu no garantiza disponibilidad ininterrumpida del servicio.</li>
            </ul>
          </Section>

          <Section title="7. Propiedad intelectual">
            <p>
              Todos los contenidos de la Plataforma —incluyendo diseño, código, modelos de IA, marca
              y reportes generados— son propiedad exclusiva de PropValu o sus licenciantes. Queda
              prohibida la reproducción, distribución o modificación sin autorización expresa por escrito.
            </p>
          </Section>

          <Section title="8. Conducta del usuario">
            <p>El usuario se compromete a no:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Ingresar información falsa o datos de inmuebles que no existen.</li>
              <li>Intentar acceder a cuentas de otros usuarios.</li>
              <li>Realizar ingeniería inversa del software o modelos de IA.</li>
              <li>Usar la Plataforma para actividades ilegales o fraudulentas.</li>
              <li>Automatizar consultas masivas sin autorización (scraping).</li>
            </ul>
          </Section>

          <Section title="9. Modificaciones al servicio">
            <p>
              PropValu se reserva el derecho de modificar, suspender o discontinuar cualquier aspecto
              del servicio en cualquier momento. Los usuarios con planes activos serán notificados con
              al menos 15 días de anticipación en caso de cambios materiales.
            </p>
          </Section>

          <Section title="10. Ley aplicable y jurisdicción">
            <p>
              Los presentes Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para
              cualquier controversia derivada del uso de la Plataforma, las partes se someten
              expresamente a la jurisdicción de los Tribunales de la Ciudad de Guadalajara, Jalisco,
              renunciando a cualquier otro fuero que pudiera corresponderles.
            </p>
          </Section>

          <Section title="11. Contacto">
            <p>
              Para consultas sobre estos Términos:{" "}
              <span className="text-[#52B788] font-semibold">legal@propvalu.mx</span>
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

export default TerminosPage;
