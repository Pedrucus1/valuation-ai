import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Scale, CheckCircle2 } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-['Outfit'] text-lg font-bold text-[#1B4332] mb-3 border-l-4 border-[#52B788] pl-3">
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const Principio = ({ numero, titulo, descripcion }) => (
  <div className="flex gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-slate-100 mb-3">
    <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {numero}
    </div>
    <div>
      <p className="font-semibold text-[#1B4332] text-sm mb-1">{titulo}</p>
      <p className="text-slate-500 text-sm leading-relaxed">{descripcion}</p>
    </div>
  </div>
);

const CodigoEticaPage = () => {
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
            Ética Profesional · Valuadores
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Código de Ética para Valuadores
          </h1>
          <p className="text-slate-500 text-sm">Última actualización: 20 de marzo de 2026</p>
        </div>

        {/* Banner introductorio */}
        <div className="flex items-start gap-3 bg-[#1B4332] text-white rounded-xl p-5 mb-8">
          <Scale className="w-6 h-6 flex-shrink-0 mt-0.5 text-[#D9ED92]" />
          <div>
            <p className="font-semibold text-sm mb-1">Compromiso ético como condición de membresía</p>
            <p className="text-xs text-white/75 leading-relaxed">
              Todo valuador registrado en PropValu acepta y se compromete a cumplir este Código
              de Ética como condición indispensable para operar en la plataforma. Su incumplimiento
              puede resultar en la suspensión o cancelación definitiva de la cuenta.
              Este código está basado en los principios del INDAABIN, IMC y estándares
              internacionales de valuación (IVS — International Valuation Standards).
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          <Section title="Principios fundamentales">
            <Principio
              numero="I"
              titulo="Independencia"
              descripcion="El valuador debe emitir su opinión de valor de manera completamente independiente, libre de presiones, influencias o instrucciones de cualquier parte interesada, incluyendo al cliente que contrata el servicio. La conclusión de valor debe reflejar exclusivamente el criterio técnico profesional del valuador."
            />
            <Principio
              numero="II"
              titulo="Objetividad"
              descripcion="Las conclusiones de valor deben basarse en evidencia de mercado real, análisis técnico riguroso y metodología reconocida (INDAABIN, SHF, CNBV). El valuador no debe favorecer valores que convengan al interés de ninguna parte: ni al vendedor, ni al comprador, ni a instituciones financieras."
            />
            <Principio
              numero="III"
              titulo="Competencia"
              descripcion="El valuador solo deberá aceptar encargos para los cuales tiene la formación, experiencia y conocimiento del mercado suficientes. Ante dudas sobre su competencia para un tipo de inmueble o zona geográfica específica, deberá declinar el encargo o asociarse con un especialista."
            />
            <Principio
              numero="IV"
              titulo="Confidencialidad"
              descripcion="Toda información recibida del cliente en relación con el inmueble valuado es estrictamente confidencial. El valuador no revelará datos, precios, nombres ni circunstancias de la operación a terceros, salvo requerimiento legal expreso de autoridad competente."
            />
            <Principio
              numero="V"
              titulo="Integridad"
              descripcion="El valuador actuará con honestidad en todos los aspectos de su práctica profesional. No aceptará honorarios o beneficios adicionales de partes distintas al cliente que contrató el servicio, y reportará cualquier intento de soborno o coerción a PropValu y a las autoridades."
            />
            <Principio
              numero="VI"
              titulo="Transparencia metodológica"
              descripcion="El valuador debe ser capaz de explicar y defender su metodología, la selección de comparables, los ajustes aplicados y la conclusión de valor ante cualquier instancia. El uso de herramientas de inteligencia artificial (como las de PropValu) no exime al valuador de comprender y validar los resultados."
            />
          </Section>

          <Section title="Conflicto de interés">
            <p>
              El valuador <strong>debe declarar y abstenerse</strong> de realizar avalúos en los
              siguientes casos sin consentimiento escrito expreso de todas las partes:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>El inmueble a valuar es de su propiedad o de un familiar en línea directa (cónyuge, padres, hijos, hermanos)</li>
              <li>Tiene interés económico directo en la operación de compraventa o arrendamiento</li>
              <li>Tiene relación comercial habitual con el cliente que pueda comprometer su independencia</li>
              <li>Previamente valuó el mismo inmueble para una parte contraria en un litigio activo</li>
              <li>Es socio, empleado o contratista del vendedor o comprador</li>
            </ul>
            <p className="mt-3">
              Ante cualquier duda sobre un posible conflicto, la conducta correcta es <strong>declararlo
              y consultar con PropValu</strong> antes de aceptar el encargo.
            </p>
          </Section>

          <Section title="Obligaciones específicas en el uso de PropValu">
            <div className="space-y-3">
              {[
                ["Validación de IA", "Los resultados generados por los modelos de inteligencia artificial de PropValu son un punto de partida, no una conclusión. El valuador es responsable de validar, ajustar y firmar el reporte con base en su criterio profesional."],
                ["Selección de comparables", "El valuador seleccionará únicamente comparables que respondan al mercado real del inmueble sujeto. No inflará ni deprimirá artificialmente el valor ajustando comparables no representativos."],
                ["Datos verídicos", "La información capturada en el formulario (superficie, estado de conservación, características) debe corresponder fielmente a la realidad del inmueble, ya sea por visita física o por información verificada del cliente."],
                ["Firmado del reporte", "Al emitir un reporte con folio oficial de PropValu, el valuador certifica que lo revisó, validó y respalda su contenido con su cédula profesional."],
                ["Reporte de irregularidades", "Si el valuador detecta intentos de fraude, lavado de activos o manipulación de valores por parte del cliente, deberá reportarlo a PropValu y, si aplica, a las autoridades competentes."],
              ].map(([titulo, desc]) => (
                <div key={titulo} className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-600">
                    <strong className="text-slate-700">{titulo}:</strong> {desc}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Conductas prohibidas">
            <ul className="list-disc pl-5 space-y-2">
              <li>Emitir valores inflados o deprimidos a solicitud del cliente ("a modo")</li>
              <li>Firmar reportes de inmuebles que no fueron analizados o visitados</li>
              <li>Compartir credenciales de la plataforma con terceros no autorizados</li>
              <li>Usar reportes de PropValu con su cédula para encargos contratados fuera de la plataforma sin reportar la operación</li>
              <li>Hacer publicidad falsa sobre sus credenciales o experiencia en el directorio de PropValu</li>
              <li>Contactar directamente a clientes referidos por PropValu para ofrecer servicios por fuera de la plataforma durante los primeros 6 meses del encargo</li>
            </ul>
          </Section>

          <Section title="Consecuencias del incumplimiento">
            <p>Las violaciones a este Código de Ética podrán resultar en:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1B4332] text-white">
                    <th className="text-left p-3 rounded-tl-lg font-semibold text-xs">Gravedad</th>
                    <th className="text-left p-3 font-semibold text-xs">Ejemplo</th>
                    <th className="text-left p-3 rounded-tr-lg font-semibold text-xs">Consecuencia</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Leve", "Error metodológico sin dolo, falta de actualización de documentos", "Advertencia por escrito + plazo de corrección de 15 días"],
                    ["Moderada", "Conflicto de interés no declarado, datos incorrectos en reporte", "Suspensión temporal 30 días + revisión de expediente"],
                    ["Grave", "Avalúo 'a modo' demostrable, falsedad en documentos de verificación", "Cancelación definitiva + reporte a INDAABIN / autoridades"],
                  ].map(([grav, ej, cons], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-3 font-semibold text-[#1B4332]">{grav}</td>
                      <td className="p-3 text-slate-500">{ej}</td>
                      <td className="p-3 text-slate-600">{cons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Proceso de denuncia">
            <p>
              Cualquier persona (cliente, colega o tercero) puede reportar una presunta violación
              a este Código a través de:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>El formulario de quejas en <strong>/feedback</strong> (categoría "Queja de valuador")</li>
              <li>Email directo a <strong>etica@propvalu.mx</strong></li>
            </ul>
            <p className="mt-3">
              Todas las denuncias son confidenciales. PropValu realizará una investigación en un
              plazo máximo de 10 días hábiles y notificará el resultado al denunciante y al
              valuador investigado.
            </p>
          </Section>

          <Section title="Marco normativo de referencia">
            <p>Este Código se basa y es compatible con:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Código de Ética Profesional del INDAABIN</li>
              <li>Normas de Valuación del Instituto Mexicano de Valuación (IMC)</li>
              <li>International Valuation Standards (IVS) — edición vigente</li>
              <li>Ley Federal de Responsabilidades Profesionales</li>
              <li>Código Civil Federal (responsabilidad civil profesional)</li>
            </ul>
          </Section>

        </div>

        {/* Links relacionados */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Ver también:</span>
          <button onClick={() => navigate("/terminos-valuadores")}
            className="text-[#52B788] hover:underline font-medium">
            Términos para Valuadores
          </button>
          <span>·</span>
          <button onClick={() => navigate("/feedback")}
            className="text-[#52B788] hover:underline font-medium">
            Reportar una conducta
          </button>
          <span>·</span>
          <button onClick={() => navigate("/para-valuadores")}
            className="text-[#52B788] hover:underline font-medium">
            Planes para Valuadores
          </button>
        </div>
      </main>
    </div>
  );
};

export default CodigoEticaPage;
