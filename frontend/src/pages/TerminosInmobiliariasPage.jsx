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
  const folio = `PV-INM-${Date.now()}`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Declaración de Aceptación — PropValu Inmobiliarias</title>
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
  <h1>PropValu México — Declaración de Aceptación de Términos para Inmobiliarias</h1>
  <div class="folio">
    <strong>Folio:</strong> ${folio} &nbsp;|&nbsp;
    <strong>Fecha de aceptación:</strong> ${fecha} &nbsp;|&nbsp;
    <strong>Versión:</strong> 1.0 — Marzo 2026
  </div>
  <span class="badge">✓ Aceptación electrónica registrada</span>
  <p>La inmobiliaria o agente inmobiliario que se registra declara bajo protesta de decir verdad que:</p>
  <h2>1. Actividad profesional</h2>
  <p>Se dedica de manera legal y habitual a la promoción y comercialización de bienes inmuebles, contando con los permisos y afiliaciones requeridos en su estado.</p>
  <h2>2. Afiliación y certificación</h2>
  <p>Cuenta con membresía activa en AMPI, CIPS, CANACO u organismo equivalente reconocido, y ha completado el curso de intermediación inmobiliaria (CONOCER EC0461 o equivalente estatal).</p>
  <h2>3. Veracidad de información</h2>
  <p>Toda la información proporcionada en el registro es verídica y los documentos presentados son auténticos y vigentes.</p>
  <h2>4. Responsabilidad por operaciones</h2>
  <p>Asume plena responsabilidad civil, profesional y legal por las operaciones inmobiliarias en que intervenga. PropValu actúa únicamente como herramienta tecnológica de apoyo y no es parte en ninguna transacción inmobiliaria.</p>
  <h2>5. Uso ético de la plataforma</h2>
  <p>No utilizará los servicios de PropValu para operaciones en conflicto de interés, elusión fiscal, lavado de activos o cualquier actividad contraria a la ley.</p>
  <div class="firma">
    <div class="firma-bloque">
      <div class="firma-linea">Firma del Representante</div>
      <p style="font-size:11px;color:#64748b;">Nombre, cargo y RFC</p>
    </div>
    <div class="firma-bloque">
      <div class="firma-linea">PropValu México</div>
      <p style="font-size:11px;color:#64748b;">Plataforma digital — Aceptación electrónica</p>
    </div>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:32px;text-align:center;">
    Aceptación electrónica con valor probatorio conforme al Código de Comercio de México (Art. 89-94). Conserve este archivo.
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PropValu_Terminos_Inmobiliaria_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

const TerminosInmobiliariasPage = () => {
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
            Legal · Inmobiliarias
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Términos y Condiciones para Inmobiliarias
          </h1>
          <p className="text-slate-500 text-sm">Última actualización: 20 de marzo de 2026</p>
        </div>

        {/* Alerta descarga */}
        <div className="flex items-start gap-3 bg-[#1B4332]/5 border border-[#52B788]/30 rounded-xl p-4 mb-8">
          <ShieldCheck className="w-5 h-5 text-[#52B788] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#1B4332]">
            <strong>Aceptación requerida al registrarse.</strong> Al completar tu registro como
            inmobiliaria o agente en PropValu, aceptas estos términos electrónicamente.
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

          <Section title="1. Descripción del servicio para inmobiliarias">
            <p>
              PropValu ofrece a inmobiliarias y agentes inmobiliarios verificados acceso a herramientas
              de estimación de valor, base de datos de comparables, reportes de mercado y red de
              peritos valuadores. La plataforma actúa como apoyo tecnológico y no como parte en
              ninguna operación de compraventa o arrendamiento.
            </p>
          </Section>

          <Section title="2. Requisitos de registro y verificación de identidad">
            <p>Para operar como inmobiliaria en PropValu deberás presentar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>INE o pasaporte del representante legal (persona física) o apoderado (persona moral)</li>
              <li>RFC activo ante el SAT — persona física o moral</li>
              <li>Acta constitutiva vigente (únicamente para personas morales)</li>
              <li>
                <strong>Constancia de afiliación activa</strong> a AMPI, CIPS, CANACO u organismo
                inmobiliario reconocido, con número de membresía y fecha de vigencia
              </li>
              <li>
                <strong>Certificado de curso de intermediación inmobiliaria:</strong> CONOCER EC0461
                o equivalente estatal reconocido por SEP
              </li>
              <li>Comprobante de domicilio del negocio (no mayor a 3 meses)</li>
              <li>Seguro de responsabilidad civil profesional (recomendado, requerido para Plan Pro)</li>
            </ul>
            <p>
              La cuenta permanece en estado <strong>"Verificación Pendiente"</strong> hasta la revisión y
              aprobación de los documentos por parte del equipo PropValu, lo cual puede tomar hasta
              3 días hábiles.
            </p>
          </Section>

          <Section title="3. Asociaciones y certificaciones reconocidas">
            <p>PropValu reconoce las siguientes afiliaciones para efectos de verificación:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AMPI — Asociación Mexicana de Profesionales Inmobiliarios (cualquier sección)</li>
              <li>CIPS — Certified International Property Specialist</li>
              <li>CONOCER EC0461 — estándar de competencia laboral en intermediación inmobiliaria</li>
              <li>CANACO — Cámaras de Comercio locales con padrón inmobiliario activo</li>
              <li>Otras asociaciones estatales reconocidas por la AMPI nacional</li>
            </ul>
            <p>
              PropValu podrá ampliar o modificar esta lista. Una membresía no afiliada a estas
              organizaciones requiere validación adicional a criterio del equipo de verificación.
            </p>
          </Section>

          <Section title="4. Obligaciones de la inmobiliaria">
            <p>La inmobiliaria o agente se compromete a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Utilizar los reportes de PropValu únicamente como referencia orientativa, explicando a sus clientes que no constituyen avalúo oficial</li>
              <li>No presentar estimaciones de PropValu como avalúos legales ante notarías, bancos o autoridades</li>
              <li>Mantener vigentes membresías, certificaciones y documentos presentados en su expediente de verificación</li>
              <li>No compartir sus credenciales de acceso con personas no autorizadas</li>
              <li>No utilizar la plataforma para operaciones con recursos de procedencia ilícita</li>
              <li>Reportar de inmediato cualquier acceso no autorizado a su cuenta</li>
            </ul>
          </Section>

          <Section title="5. Uso de los reportes y limitaciones">
            <p>
              Los reportes generados en PropValu son <strong>estimaciones orientativas de mercado</strong>.
              No constituyen avalúo oficial, no tienen validez ante el SAT para efectos fiscales,
              ni ante instituciones financieras para créditos hipotecarios, ni ante notarías para
              escrituración.
            </p>
            <p>
              Para operaciones que requieren avalúo con validez legal, la inmobiliaria deberá
              contratar a un perito valuador certificado, lo cual puede gestionarse a través de
              la red de valuadores de PropValu.
            </p>
          </Section>

          <Section title="6. Responsabilidad de PropValu">
            <p>
              PropValu no es responsable de decisiones de inversión, compraventa o arrendamiento
              tomadas con base en sus reportes. La plataforma no garantiza la exactitud de los
              comparables obtenidos de portales inmobiliarios de terceros, ni la disponibilidad
              continua del servicio.
            </p>
          </Section>

          <Section title="7. Planes, créditos y facturación">
            <p>
              Los planes de inmobiliaria incluyen créditos de valuación con vigencia mensual o anual.
              Los créditos no utilizados no se acumulan ni son reembolsables. Los pagos realizados
              no son devueltos salvo falla imputable exclusivamente a PropValu.
            </p>
            <p>
              Para solicitar factura (CFDI), la inmobiliaria deberá ingresar sus datos fiscales
              (RFC, nombre o razón social, código postal, uso del CFDI) dentro de los 5 días
              naturales siguientes al pago. No se emiten facturas retroactivas fuera de este plazo.
            </p>
          </Section>

          <Section title="8. Directorio y visibilidad">
            <p>
              Las inmobiliarias con verificación aprobada aparecen en el directorio público de PropValu,
              pudiendo recibir leads de clientes de la plataforma. PropValu no garantiza un número
              mínimo de leads ni exclusividad de zona.
            </p>
            <p>
              El logo de la inmobiliaria verificada podrá aparecer en el carousel de afiliados de
              la página principal, previa autorización expresa de la inmobiliaria.
            </p>
          </Section>

          <Section title="9. Suspensión y baja">
            <p>PropValu podrá suspender o dar de baja la cuenta por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Documentos vencidos o no renovados dentro del plazo notificado</li>
              <li>Membresía o certificación cancelada o no renovada</li>
              <li>Tres o más quejas fundadas de clientes</li>
              <li>Uso de la plataforma para actividades contrarias a la ley</li>
              <li>Falta de pago de más de 15 días en plan activo</li>
            </ul>
          </Section>

          <Section title="10. Legislación aplicable">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Las partes
              se someten a los tribunales de Guadalajara, Jalisco, renunciando a cualquier otro
              fuero que pudiera corresponderles.
            </p>
          </Section>

        </div>

        {/* Links relacionados */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Ver también:</span>
          <button onClick={() => navigate("/privacidad")}
            className="text-[#52B788] hover:underline font-medium">
            Política de Privacidad
          </button>
          <span>·</span>
          <button onClick={() => navigate("/terminos")}
            className="text-[#52B788] hover:underline font-medium">
            Términos Generales
          </button>
          <span>·</span>
          <button onClick={() => navigate("/para-inmobiliarias")}
            className="text-[#52B788] hover:underline font-medium">
            Planes para Inmobiliarias
          </button>
        </div>
      </main>
    </div>
  );
};

export default TerminosInmobiliariasPage;
