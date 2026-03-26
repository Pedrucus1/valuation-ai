import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Download, ShieldCheck } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-3 border-l-4 border-[#52B788] pl-3">
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

function downloadDeclaracion() {
  const fecha = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const folio = `PV-VAL-${Date.now()}`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Declaración de Aceptación — PropValu Valuadores</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1e293b; }
    h1 { color: #1B4332; border-bottom: 3px solid #52B788; padding-bottom: 12px; }
    .folio { background: #f1f5f9; padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #1B4332; font-size: 15px; margin-top: 24px; }
    p, li { font-size: 13px; line-height: 1.7; }
    .firma { margin-top: 48px; border-top: 1px solid #cbd5e1; padding-top: 24px; display: flex; justify-content: space-between; }
    .firma-bloque { text-align: center; }
    .firma-linea { border-top: 1px solid #334155; width: 200px; margin: 0 auto 8px; padding-top: 8px; font-size: 12px; }
    .badge { display: inline-block; background: #D9ED92; color: #1B4332; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>PropValu México — Declaración de Aceptación de Términos para Valuadores</h1>
  <div class="folio">
    <strong>Folio:</strong> ${folio} &nbsp;|&nbsp;
    <strong>Fecha de aceptación:</strong> ${fecha} &nbsp;|&nbsp;
    <strong>Versión:</strong> 1.0 — Marzo 2026
  </div>
  <span class="badge">✓ Aceptación electrónica registrada</span>
  <p>El valuador profesional que se registra en la plataforma PropValu declara bajo protesta de decir verdad que:</p>
  <h2>1. Credenciales profesionales</h2>
  <p>Cuenta con cédula profesional vigente expedida por la SEP y/o certificación de organismos reconocidos (INDAABIN, IMC, CNBV), y que los documentos presentados en el proceso KYC son auténticos y vigentes.</p>
  <h2>2. Responsabilidad profesional</h2>
  <p>Asume plena responsabilidad civil, profesional y legal por los avalúos y reportes que emita a través de la plataforma. PropValu actúa únicamente como canal tecnológico y no es responsable de las conclusiones de valor emitidas.</p>
  <h2>3. Código de ética</h2>
  <p>Se compromete a cumplir el Código de Ética publicado en /codigo-etica-valuadores: independencia, objetividad, confidencialidad y prohibición de conflicto de interés.</p>
  <h2>4. Veracidad de información</h2>
  <p>Los comparables seleccionados, ajustes aplicados y datos de la propiedad valuada son verídicos y corresponden a su mejor conocimiento y criterio profesional.</p>
  <h2>5. Vigencia de documentos</h2>
  <p>Mantendrá vigentes sus documentos (seguro RC, membresías, cédula) y notificará a PropValu cualquier cambio en su situación profesional o inhabilitación.</p>
  <h2>6. Prohibiciones</h2>
  <p>No utilizará la plataforma para emitir avalúos en conflicto de interés, para propiedades donde sea parte interesada, ni para eludir regulaciones fiscales o legales.</p>
  <h2>7. Consecuencias del incumplimiento</h2>
  <p>El incumplimiento de estos términos podrá resultar en suspensión inmediata de la cuenta, reporte a organismos reguladores y ejercicio de acciones legales.</p>
  <div class="firma">
    <div class="firma-bloque">
      <div class="firma-linea">Firma del Valuador</div>
      <p style="font-size:11px;color:#64748b;">Nombre completo y cédula profesional</p>
    </div>
    <div class="firma-bloque">
      <div class="firma-linea">PropValu México</div>
      <p style="font-size:11px;color:#64748b;">Plataforma digital — Aceptación electrónica</p>
    </div>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:32px;text-align:center;">
    Este documento constituye aceptación electrónica con valor probatorio conforme al Código de Comercio de México (Art. 89-94).
    Conserve este archivo como constancia.
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PropValu_Terminos_Valuador_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

const TerminosValuadoresPage = () => {
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
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
            Legal · Valuadores
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Términos y Condiciones para Valuadores
          </h1>
          <p className="text-slate-500 text-sm">Última actualización: 20 de marzo de 2026</p>
        </div>

        {/* Alerta descarga */}
        <div className="flex items-start gap-3 bg-[#1B4332]/5 border border-[#52B788]/30 rounded-xl p-4 mb-8">
          <ShieldCheck className="w-5 h-5 text-[#52B788] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#1B4332]">
            <strong>Aceptación requerida al registrarse.</strong> Al completar tu registro como valuador
            en PropValu, aceptas estos términos electrónicamente. Puedes descargar una copia firmada
            como constancia.
          </div>
          <button
            onClick={downloadDeclaracion}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] bg-[#D9ED92] hover:bg-[#c5d97e] px-3 py-2 rounded-lg whitespace-nowrap transition-colors ml-auto flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <Section title="1. Naturaleza del servicio y rol del valuador">
            <p>
              PropValu es una plataforma tecnológica que proporciona herramientas de apoyo para la
              elaboración de estimaciones de valor inmobiliario. El valuador registrado actúa como
              profesional independiente y es el único responsable de las conclusiones de valor que
              emita mediante la plataforma.
            </p>
            <p>
              PropValu no es una empresa de valuación ni una asociación profesional. La plataforma
              no avala, garantiza ni certifica los avalúos individuales emitidos por cada valuador.
            </p>
          </Section>

          <Section title="2. Requisitos de registro (KYC)">
            <p>Para operar como valuador en PropValu deberás presentar y mantener vigentes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identificación oficial vigente (INE o pasaporte)</li>
              <li>Cédula profesional expedida por la SEP en arquitectura, ingeniería civil o carrera afín</li>
              <li>Certificación de organismo reconocido: INDAABIN, IMC, CNBV o equivalente</li>
              <li>RFC activo y verificable ante el SAT</li>
              <li>Seguro de responsabilidad civil profesional con vigencia activa</li>
              <li>Fotografía profesional para el directorio público</li>
            </ul>
            <p>
              PropValu se reserva el derecho de solicitar documentación adicional y de rechazar
              o suspender registros que no cumplan con los requisitos o que presenten información
              inconsistente.
            </p>
          </Section>

          <Section title="3. Obligaciones del valuador">
            <p>El valuador se compromete a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Emitir reportes con base en su criterio profesional independiente</li>
              <li>Seleccionar únicamente comparables que respondan al mercado real</li>
              <li>No emitir avalúos en propiedades donde tenga conflicto de interés (propiedad propia, de familiar, de cliente habitual)</li>
              <li>Mantener confidencialidad sobre la información de sus clientes</li>
              <li>Actualizar sus documentos ante cualquier cambio en su situación profesional</li>
              <li>Notificar de inmediato cualquier sanción, inhabilitación o proceso disciplinario</li>
              <li>Cumplir el Código de Ética publicado en <strong>/codigo-etica-valuadores</strong></li>
            </ul>
          </Section>

          <Section title="4. Responsabilidad civil y profesional">
            <p>
              El valuador asume plena responsabilidad civil, profesional y, en su caso, penal por
              los informes que emita. PropValu queda expresamente exonerada de cualquier reclamación
              derivada de errores, omisiones o negligencia en los avalúos.
            </p>
            <p>
              En caso de queja fundamentada de un cliente, PropValu podrá suspender preventivamente
              la cuenta del valuador mientras realiza la investigación correspondiente.
            </p>
          </Section>

          <Section title="5. Encargos y red de valuadores">
            <p>
              PropValu podrá canalizar encargos de clientes o instituciones hacia valuadores
              verificados. La aceptación de un encargo es voluntaria. La comisión de la plataforma
              por encargos canalizados será del <strong>15% del honorario pactado</strong>, salvo
              acuerdo distinto por escrito.
            </p>
            <p>
              PropValu no garantiza un volumen mínimo de encargos ni exclusividad territorial.
            </p>
          </Section>

          <Section title="6. Planes y facturación">
            <p>
              Los planes de suscripción (Independiente, Despacho, Pro, Enterprise) se cobran de forma
              mensual o anual anticipada. Los pagos no son reembolsables salvo falla imputable
              exclusivamente a PropValu.
            </p>
            <p>
              PropValu se reserva el derecho de modificar los precios con 30 días de anticipación.
              El valuador podrá cancelar su suscripción en cualquier momento; el acceso se mantendrá
              hasta el fin del período ya pagado.
            </p>
          </Section>

          <Section title="7. Propiedad intelectual y datos">
            <p>
              Los reportes generados pertenecen al valuador y a su cliente. PropValu conserva el
              derecho de utilizar datos agregados y anonimizados de los avalúos para mejorar sus
              modelos de inteligencia artificial y estadísticas de mercado.
            </p>
          </Section>

          <Section title="8. Suspensión y cancelación de cuenta">
            <p>PropValu podrá suspender o cancelar la cuenta de un valuador por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Documentos vencidos, falsos o no presentados dentro del plazo</li>
              <li>Tres o más quejas fundamentadas de clientes</li>
              <li>Sanción o inhabilitación por organismos reguladores</li>
              <li>Uso de la plataforma para actividades contrarias a la ley</li>
              <li>Incumplimiento del Código de Ética</li>
            </ul>
          </Section>

          <Section title="9. Modificaciones a estos términos">
            <p>
              PropValu podrá actualizar estos términos notificando al valuador por email con al menos
              15 días de anticipación. El uso continuo de la plataforma tras la notificación
              constituye aceptación de los nuevos términos.
            </p>
          </Section>

          <Section title="10. Legislación aplicable">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier
              controversia las partes se someten a los tribunales competentes de la ciudad de
              Guadalajara, Jalisco, renunciando a cualquier otro fuero que pudiera corresponderles.
            </p>
          </Section>
        </div>

        {/* Links relacionados */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Ver también:</span>
          <button onClick={() => navigate("/codigo-etica-valuadores")}
            className="text-[#52B788] hover:underline font-medium">
            Código de Ética para Valuadores
          </button>
          <span>·</span>
          <button onClick={() => navigate("/privacidad")}
            className="text-[#52B788] hover:underline font-medium">
            Política de Privacidad
          </button>
          <span>·</span>
          <button onClick={() => navigate("/terminos")}
            className="text-[#52B788] hover:underline font-medium">
            Términos Generales
          </button>
        </div>
      </main>
    </div>
  );
};

export default TerminosValuadoresPage;
