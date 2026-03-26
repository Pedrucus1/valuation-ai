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

const PoliticaAnunciosPage = () => {
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
            <Building2 className="w-5 h-5 text-[#52B788]" />
            <span className="font-['Outfit'] font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-2">
            Política de Contenido de Anuncios
          </h1>
          <p className="text-slate-400 text-sm">Última actualización: 1 de marzo de 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

          <Section title="1. Objeto">
            <p>
              La presente Política regula los requisitos y restricciones aplicables a los anuncios
              publicados en PropValu ("la Plataforma"). Al enviar un anuncio, el Anunciante acepta
              íntegramente estas condiciones.
            </p>
          </Section>

          <Section title="2. Contenido permitido">
            <p>Solo se aceptan anuncios relacionados con:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Servicios inmobiliarios: compraventa, arrendamiento, administración de propiedades.</li>
              <li>Servicios financieros vinculados a bienes raíces: crédito hipotecario, seguros de inmueble.</li>
              <li>Servicios profesionales del sector: valuación, arquitectura, ingeniería civil, notaría.</li>
              <li>Software y herramientas para el sector inmobiliario.</li>
              <li>Desarrollos y proyectos inmobiliarios debidamente registrados ante autoridad competente.</li>
            </ul>
          </Section>

          <Section title="3. Contenido prohibido">
            <p>Queda estrictamente prohibido publicar anuncios que:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Contengan información falsa, engañosa o que induzca a error al consumidor.</li>
              <li>Prometan rendimientos garantizados o retornos de inversión sin sustento técnico.</li>
              <li>Ofrezcan servicios de valuación sin cédula profesional o certificación vigente.</li>
              <li>Incluyan comparaciones denigratorias con competidores identificados por nombre.</li>
              <li>Hagan referencia a precios que no reflejen el valor real de mercado de manera dolosa.</li>
              <li>Contengan lenguaje discriminatorio por razón de raza, género, religión, discapacidad u origen.</li>
              <li>Enlacen a sitios con contenido ilegal, malware, phishing o spam.</li>
              <li>Promuevan esquemas piramidales, fraudes o inversiones no reguladas.</li>
              <li>Utilicen imágenes o materiales sin los derechos de uso correspondientes.</li>
              <li>Sean dirigidos a menores de edad.</li>
            </ul>
          </Section>

          <Section title="4. Requisitos de formato">
            <p>Los anuncios deberán cumplir las siguientes especificaciones técnicas:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Imagen principal:</strong> mínimo 800×400 px, formato JPG o PNG, máximo 2 MB.</li>
              <li><strong>Título:</strong> máximo 60 caracteres, sin uso excesivo de mayúsculas (más del 50% del texto).</li>
              <li><strong>Descripción:</strong> máximo 200 caracteres, sin datos de contacto directos (teléfonos, emails).</li>
              <li><strong>URL de destino:</strong> debe ser HTTPS. No se permiten acortadores de URL.</li>
              <li><strong>Logo:</strong> fondo blanco o transparente, mínimo 200×200 px.</li>
            </ul>
          </Section>

          <Section title="5. Proceso de revisión">
            <p>
              Todo anuncio enviado pasa por un proceso de revisión manual antes de su publicación:
            </p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>El Anunciante envía el anuncio desde la Consola de Anunciante.</li>
              <li>El equipo de moderación de PropValu revisa el contenido en un plazo máximo de 48 horas hábiles.</li>
              <li>Si el anuncio cumple esta Política, se activa automáticamente en los slots contratados.</li>
              <li>En caso de rechazo, se notifica al Anunciante por correo con el motivo específico.</li>
              <li>El Anunciante puede corregir y reenviar el anuncio hasta 3 veces sin costo adicional.</li>
            </ol>
          </Section>

          <Section title="6. Auto-regulación y banderas automáticas">
            <p>
              La Plataforma emplea un sistema automatizado que detecta de forma preliminar:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Uso excesivo de mayúsculas (&gt;50% del texto).</li>
              <li>Términos que implican garantías absolutas: "garantizado", "sin riesgo", "100% seguro".</li>
              <li>Palabras incluidas en la lista negra de contenido prohibido.</li>
              <li>URLs de destino que no responden o no son HTTPS.</li>
            </ul>
            <p className="mt-2">
              Las banderas automáticas no implican rechazo definitivo; el equipo de moderación las
              revisa manualmente antes de tomar una decisión.
            </p>
          </Section>

          <Section title="7. Suspensión y eliminación">
            <p>
              PropValu se reserva el derecho de suspender o eliminar cualquier anuncio que viole
              esta Política, sin previo aviso y sin derecho a reembolso del periodo no gozado en
              los siguientes casos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Contenido fraudulento o que cause daño a usuarios de la Plataforma.</li>
              <li>Reincidencia después de dos rechazos por la misma causa.</li>
              <li>Orden judicial o requerimiento de autoridad competente.</li>
              <li>Queja fundada de usuario verificada por el equipo de moderación.</li>
            </ul>
          </Section>

          <Section title="8. Responsabilidad del Anunciante">
            <p>
              El Anunciante es el único responsable del contenido de su anuncio y de que éste cumpla
              con la legislación mexicana aplicable, incluyendo sin limitación: Ley Federal de
              Protección al Consumidor (LFPC), Ley Federal de Competencia Económica (LFCE),
              Normas Oficiales Mexicanas en materia de publicidad (NOM-038-SCFI) y legislación
              en materia de protección de datos personales (LFPDPPP).
            </p>
            <p>
              PropValu no asume responsabilidad por daños derivados del contenido de los anuncios
              publicados por los Anunciantes.
            </p>
          </Section>

          <Section title="9. Modificaciones a esta Política">
            <p>
              PropValu puede actualizar esta Política en cualquier momento. Los cambios entran en
              vigor al publicarse en la Plataforma. El uso continuado del servicio de publicidad
              tras la publicación de cambios implica la aceptación de la nueva versión.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Para dudas sobre esta Política o el proceso de revisión de anuncios, contacta a
              nuestro equipo de moderación en:{" "}
              <a
                href="mailto:anuncios@propvalu.mx"
                className="text-[#52B788] font-semibold hover:underline"
              >
                anuncios@propvalu.mx
              </a>
            </p>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-8">
        <div className="max-w-3xl mx-auto px-6 text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 PropValu. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate("/privacidad")} className="hover:text-[#1B4332] transition-colors">Privacidad</button>
            <button onClick={() => navigate("/terminos")} className="hover:text-[#1B4332] transition-colors">Términos</button>
            <button onClick={() => navigate("/terminos-anunciantes")} className="hover:text-[#1B4332] transition-colors">Términos Anunciantes</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PoliticaAnunciosPage;
