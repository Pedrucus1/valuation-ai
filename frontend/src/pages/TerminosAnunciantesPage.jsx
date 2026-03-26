import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-3 border-l-4 border-[#52B788] pl-3">
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const TerminosAnunciantesPage = () => {
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">
            Legal · Anunciantes
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Términos y Condiciones para Anunciantes
          </h1>
          <p className="text-slate-500 text-sm">
            Última actualización: 19 de marzo de 2026
          </p>
        </div>

        {/* Alerta destacada */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-8 flex gap-4">
          <ShieldCheck className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm mb-1">
              Declaración de responsabilidad civil, moral y penal
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Al registrarse como anunciante y aceptar estos términos, el anunciante reconoce y
              acepta plena responsabilidad civil, moral y penal por el contenido de sus anuncios.
              PropValu actúa únicamente como intermediario tecnológico y <strong>no tiene
              injerencia ni responsabilidad</strong> sobre el contenido publicado por los anunciantes.
              Al completar el registro, se genera automáticamente una declaración de responsabilidad
              descargable que sirve como comprobante de este acuerdo.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <Section title="1. Partes del acuerdo">
            <p>
              El presente contrato se celebra entre <strong>PropValu</strong> (en adelante "la
              Plataforma") y la persona física o moral que se registra como anunciante (en adelante
              "el Anunciante"). Al completar el proceso de registro, el Anunciante declara tener
              capacidad legal para contratar y obliga a la empresa que representa.
            </p>
          </Section>

          <Section title="2. Responsabilidad exclusiva del Anunciante sobre el contenido">
            <p>
              El Anunciante es el <strong>único y exclusivo responsable</strong> del contenido de
              todos los anuncios, creatividades, mensajes, imágenes, videos, textos y cualquier
              material publicitario que publique a través de la Plataforma, incluyendo, sin limitación:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Responsabilidad civil:</strong> el Anunciante responderá civil y
                patrimonialmente ante cualquier daño o perjuicio causado a terceros derivado del
                contenido de sus anuncios.
              </li>
              <li>
                <strong>Responsabilidad moral:</strong> el Anunciante garantiza que sus anuncios no
                afectan el honor, dignidad, reputación o imagen de personas físicas o morales.
              </li>
              <li>
                <strong>Responsabilidad penal:</strong> si el contenido del anuncio constituye un
                delito conforme a las leyes mexicanas (fraude, engaño al consumidor, difamación,
                entre otros), el Anunciante será el único sujeto a proceso ante las autoridades
                competentes.
              </li>
            </ul>
            <p>
              PropValu, sus directivos, accionistas, empleados y representantes quedan expresamente
              <strong> exonerados</strong> de toda responsabilidad civil, mercantil, administrativa,
              tributaria o penal derivada del contenido publicitario del Anunciante.
            </p>
          </Section>

          <Section title="3. Exoneración total de PropValu">
            <p>
              La Plataforma actúa exclusivamente como canal de distribución tecnológica de publicidad.
              PropValu <strong>no es co-responsable, garante ni aval</strong> de los productos,
              servicios, promociones, precios, afirmaciones o compromisos que el Anunciante realice
              a través de sus anuncios. Cualquier reclamación de un usuario final respecto a la
              publicidad del Anunciante deberá dirigirse directamente al Anunciante.
            </p>
          </Section>

          <Section title="4. Contenido prohibido">
            <p>Queda estrictamente prohibido publicar anuncios que contengan:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Publicidad engañosa o fraudulenta en términos de la LFPC (PROFECO).</li>
              <li>Material ilícito, pornográfico, violento, discriminatorio o que incite al odio.</li>
              <li>Publicidad de productos o servicios prohibidos por la legislación mexicana (alcohol a menores, tabaco sin advertencias, armas, etc.).</li>
              <li>Contenido que viole derechos de autor, marcas registradas o propiedad intelectual de terceros.</li>
              <li>Información falsa sobre precios, características de productos o servicios.</li>
              <li>Datos personales de terceros sin su consentimiento expreso.</li>
              <li>Material que afecte la imagen, honor o reputación de personas o empresas.</li>
            </ul>
            <p>
              PropValu se reserva el derecho de rechazar, pausar o eliminar cualquier anuncio que
              considere violatorio de estas prohibiciones, sin derecho a devolución por parte del
              Anunciante.
            </p>
          </Section>

          <Section title="5. Proceso de aprobación de creatividades">
            <p>
              Todas las creatividades subidas a la Plataforma quedarán en estado "Pendiente de
              revisión" hasta ser aprobadas por el equipo de PropValu. La revisión puede tardar hasta
              5 días hábiles. PropValu no garantiza la aprobación de ninguna creatividad. El rechazo
              de una creatividad no da derecho a reembolso de los presupuestos de campaña ya
              comprometidos.
            </p>
          </Section>

          <Section title="6. Tarifas y política de pagos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Slot 1 (Investigación, 60s): $30 MXN por impresión.</li>
              <li>Slot 2 (Generación IA, 30s): $20 MXN por impresión.</li>
              <li>Slot 3 (Descarga PDF, 15s): $5 MXN por impresión.</li>
              <li>Los precios no incluyen IVA; se añadirá 16% al momento de la facturación.</li>
              <li><strong>Política de no devoluciones:</strong> todos los pagos son finales e irrevocables. No se efectúan reembolsos por ningún motivo, incluyendo campañas rechazadas por incumplimiento de estas políticas.</li>
              <li>El cobro se realiza al momento de la aprobación de la campaña.</li>
            </ul>
          </Section>

          <Section title="7. Segmentación geográfica">
            <p>
              El Anunciante puede segmentar sus campañas a nivel Municipal, Estatal o Federal. La
              segmentación es una aproximación basada en la ubicación del inmueble valuado y no
              garantiza exclusividad geográfica ni un número mínimo de impresiones.
            </p>
          </Section>

          <Section title="8. Indemnización">
            <p>
              El Anunciante se compromete a indemnizar y mantener indemne a PropValu, sus directivos,
              empleados, accionistas y representantes legales, de y contra cualquier reclamo,
              demanda, responsabilidad, daño, costo (incluyendo honorarios de abogados) que surja
              del contenido de sus anuncios o del incumplimiento de estos Términos.
            </p>
          </Section>

          <Section title="9. Aceptación electrónica y declaración de responsabilidad">
            <p>
              Al marcar la casilla de aceptación durante el proceso de registro, el Anunciante firma
              electrónicamente el presente documento, lo cual tiene plena validez conforme a la
              legislación mexicana en materia de comercio electrónico (Código de Comercio, Art. 89-94).
            </p>
            <p>
              Una vez completado el registro, se generará automáticamente una{" "}
              <strong>Declaración de Responsabilidad Civil, Moral y Penal</strong> con los datos del
              Anunciante, disponible para descarga como respaldo del acuerdo celebrado.
            </p>
          </Section>

          <Section title="10. Ley aplicable">
            <p>
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Las controversias
              se someterán a los Tribunales de Guadalajara, Jalisco, renunciando al fuero que pudiera
              corresponder por domicilio.
            </p>
          </Section>

          <Section title="11. Contacto legal">
            <p>
              Para asuntos legales relacionados con publicidad:{" "}
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

export default TerminosAnunciantesPage;
