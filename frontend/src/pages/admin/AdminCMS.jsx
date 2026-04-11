import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { FileText, Save, CheckCircle2, AlertCircle, Eye, Edit2, Clock } from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

// Textos iniciales — en producción, cargar desde /api/admin/cms/:slug
const DOCUMENTOS_INICIALES = {
  terminos_generales: {
    slug: "terminos_generales",
    titulo: "Términos y Condiciones Generales",
    ruta: "/terminos",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Términos y Condiciones de Uso

**Versión:** 1.0 — Marzo 2026

## 1. Aceptación de los términos
Al acceder y usar PropValu, el usuario acepta quedar obligado por estos Términos y Condiciones.

## 2. Descripción del servicio
PropValu es una plataforma tecnológica de estimación de valor inmobiliario mediante inteligencia artificial. Los reportes generados son **estimaciones orientativas** y no constituyen avalúo oficial.

## 3. Limitación de responsabilidad
PropValu no se hace responsable de decisiones de inversión tomadas con base en sus reportes.

## 4. Propiedad intelectual
Todos los modelos de IA, algoritmos y diseño gráfico son propiedad de PropValu México.

## 5. Ley aplicable
Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.`,
  },
  privacidad: {
    slug: "privacidad",
    titulo: "Política de Privacidad",
    ruta: "/privacidad",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Política de Privacidad

**Última actualización:** Marzo 2026

## Datos que recopilamos
- Información del inmueble ingresada en el formulario de valuación
- Datos de registro (nombre, email, RFC para planes de pago)
- Cookies de sesión y analytics

## Uso de los datos
- Generación del reporte de valuación
- Mejora de los modelos de IA (datos anonimizados)
- Comunicación de actualizaciones del servicio

## Derechos ARCO
Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición escribiendo a privacidad@propvalu.mx.

## Cookies
Usamos cookies estrictamente necesarias para la sesión y cookies de análisis (Google Analytics). Puedes desactivarlas desde tu navegador.`,
  },
  politica_anuncios: {
    slug: "politica_anuncios",
    titulo: "Política de Contenido para Anunciantes",
    ruta: "/politica-anuncios",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Política de Contenido para Anunciantes

## Contenido permitido
- Servicios inmobiliarios legítimos (compraventa, arrendamiento, valuación)
- Productos financieros regulados (hipotecas, seguros, créditos)
- Servicios relacionados con el hogar (remodelación, mudanzas, seguros)

## Contenido prohibido
- Promesas de rendimiento garantizado
- Tasas de interés sin especificar si son fijas o variables
- Contenido engañoso, fraudulento o para adultos
- Más del 30% del texto en mayúsculas
- Información de contacto de terceros no autorizados

## Proceso de revisión
Todos los anuncios son revisados manualmente antes de publicarse. El proceso toma hasta 24 horas hábiles.

## Sanciones
El incumplimiento resulta en rechazo del anuncio. Tres rechazos consecutivos resultan en suspensión de la cuenta de anunciante.`,
  },
  codigo_etica: {
    slug: "codigo_etica",
    titulo: "Código de Ética para Valuadores",
    ruta: "/codigo-etica-valuadores",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Código de Ética para Valuadores

## Principios fundamentales
I. **Independencia** — criterio libre de presiones externas
II. **Objetividad** — basado en evidencia de mercado real
III. **Competencia** — solo encargos dentro del área de expertise
IV. **Confidencialidad** — proteger información del cliente
V. **Integridad** — honorarios únicamente del cliente contratante
VI. **Transparencia metodológica** — capacidad de explicar y defender el valor

## Conflicto de interés
No realizar avalúos de propiedades propias, de familiares directos, ni cuando exista interés económico directo en la operación.

## Conductas prohibidas
- Emitir valores "a modo" a solicitud del cliente
- Firmar reportes de inmuebles no analizados
- Compartir credenciales de la plataforma`,
  },
  terminos_valuadores: {
    slug: "terminos_valuadores",
    titulo: "Términos para Valuadores",
    ruta: "/terminos-valuadores",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Términos y Condiciones para Valuadores

**Versión:** 1.0 — Marzo 2026

## 1. Naturaleza del servicio y rol del valuador
PropValu es una plataforma tecnológica de apoyo para la elaboración de estimaciones de valor inmobiliario. El valuador actúa como profesional independiente y es el único responsable de las conclusiones de valor que emita.

## 2. Requisitos de registro y verificación de identidad
Para operar como valuador deberás presentar y mantener vigentes:
- Identificación oficial vigente (INE o pasaporte)
- Cédula profesional SEP en arquitectura, ingeniería civil o carrera afín
- Certificación de INDAABIN, IMC, CNBV o equivalente
- RFC activo y verificable ante el SAT
- Seguro de responsabilidad civil profesional vigente

## 3. Obligaciones del valuador
- Emitir reportes con base en criterio profesional independiente
- No emitir avalúos en propiedades con conflicto de interés
- Mantener confidencialidad sobre la información de sus clientes
- Cumplir el Código de Ética publicado en /codigo-etica-valuadores

## 4. Responsabilidad civil y profesional
El valuador asume plena responsabilidad civil, profesional y penal por los informes que emita. PropValu queda expresamente exonerada de cualquier reclamación derivada de errores u omisiones.

## 5. Encargos y comisión
La comisión de PropValu por encargos canalizados es del **15% del honorario pactado**.

## 6. Planes y facturación
Los planes se cobran mensual o anual anticipada. Los pagos no son reembolsables salvo falla imputable a PropValu. Cancelación disponible en cualquier momento; acceso hasta fin del período pagado.

## 7. Suspensión de cuenta
PropValu podrá suspender por: documentos vencidos, tres o más quejas fundamentadas, sanción de organismos reguladores, incumplimiento del Código de Ética.

## 8. Ley aplicable
Leyes de los Estados Unidos Mexicanos. Tribunales de Guadalajara, Jalisco.`,
  },
  terminos_inmobiliarias: {
    slug: "terminos_inmobiliarias",
    titulo: "Términos para Inmobiliarias",
    ruta: "/terminos-inmobiliarias",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Términos y Condiciones para Inmobiliarias

**Versión:** 1.0 — Marzo 2026

## 1. Descripción del servicio para inmobiliarias
PropValu ofrece a inmobiliarias y agentes verificados acceso a herramientas de estimación de valor, base de datos de comparables, reportes de mercado y red de peritos valuadores.

## 2. Requisitos de registro y verificación de identidad
Para operar como inmobiliaria deberás presentar:
- INE o pasaporte del representante legal
- RFC activo ante el SAT
- Acta constitutiva vigente (personas morales)
- Constancia de afiliación activa a AMPI, CIPS, CANACO u organismo reconocido
- Certificado de curso de intermediación CONOCER EC0461 o equivalente SEP
- Comprobante de domicilio del negocio (no mayor a 3 meses)

La cuenta permanece en estado **"Verificación Pendiente"** hasta la aprobación de documentos (hasta 3 días hábiles).

## 3. Obligaciones de la inmobiliaria
- Utilizar los reportes únicamente como referencia orientativa
- No presentar estimaciones como avalúos legales ante notarías, bancos o autoridades
- Mantener vigentes membresías y certificaciones
- No compartir credenciales con personas no autorizadas

## 4. Uso de los reportes y limitaciones
Los reportes son **estimaciones orientativas de mercado**. No constituyen avalúo oficial ni tienen validez ante el SAT, instituciones financieras ni notarías.

## 5. Planes, créditos y facturación
Los créditos no utilizados no se acumulan ni son reembolsables. Las facturas (CFDI) deben solicitarse dentro de los 5 días naturales siguientes al pago.

## 6. Directorio y visibilidad
Las inmobiliarias verificadas aparecen en el directorio público. PropValu no garantiza número mínimo de leads ni exclusividad de zona.

## 7. Suspensión y baja
Por: documentos vencidos, membresía cancelada, tres o más quejas fundadas, actividades contrarias a la ley, falta de pago mayor a 15 días.

## 8. Ley aplicable
Leyes de los Estados Unidos Mexicanos. Tribunales de Guadalajara, Jalisco.`,
  },
  terminos_anunciantes: {
    slug: "terminos_anunciantes",
    titulo: "Términos para Anunciantes",
    ruta: "/terminos-anunciantes",
    ultima_edicion: "2026-03-20",
    editor: "Admin PropValu",
    contenido: `# Términos y Condiciones para Anunciantes

**Versión:** 1.0 — Marzo 2026

## 1. Descripción del servicio publicitario
PropValu ofrece espacios publicitarios dentro de la plataforma para empresas del sector inmobiliario, financiero y de servicios relacionados con el hogar.

## 2. Tipos de anuncios disponibles
- **Slot sidebar** — banner lateral en resultados de valuación (300×250 px)
- **Slot cabecera** — banner superior en página principal (728×90 px)
- **Slot directorio** — destacado en directorio de valuadores o inmobiliarias
- **Slot reporte** — banner en reportes PDF descargables

## 3. Proceso de publicación
Todos los anuncios son revisados manualmente antes de publicarse. El proceso toma hasta 24 horas hábiles. El anunciante recibirá confirmación por email.

## 4. Contenido permitido
- Servicios inmobiliarios legítimos (compraventa, arrendamiento, valuación)
- Productos financieros regulados (hipotecas, seguros, créditos)
- Servicios relacionados con el hogar (remodelación, mudanzas, seguros del hogar)

## 5. Contenido prohibido
- Promesas de rendimiento garantizado o tasas sin especificar condiciones
- Contenido engañoso, fraudulento o para adultos
- Más del 30% del texto en mayúsculas
- Información de contacto de terceros no autorizados

## 6. Facturación y reembolsos
Los pagos se realizan anticipadamente por el período contratado (7, 15 o 30 días). No se realizan reembolsos por anuncios ya publicados. En caso de rechazo del anuncio, se emite crédito para un nuevo anuncio o reembolso total.

## 7. Métricas y reportes
El anunciante tiene acceso a métricas básicas: impresiones, clics y CTR durante el período activo, desde su consola de anunciante.

## 8. Suspensión de cuenta
Tres rechazos consecutivos de anuncios resultan en suspensión de la cuenta de anunciante. PropValu se reserva el derecho de rechazar cualquier anuncio sin expresión de causa.

## 9. Ley aplicable
Leyes de los Estados Unidos Mexicanos. Tribunales de Guadalajara, Jalisco.`,
  },
};

const AdminCMS = () => {
  const [docs, setDocs] = useState(DOCUMENTOS_INICIALES);
  const [seleccionado, setSeleccionado] = useState("terminos_generales");
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [preview, setPreview] = useState(false);

  const doc = docs[seleccionado];

  // Cargar contenido del slug activo desde el backend
  useEffect(() => {
    adminFetch(`/api/admin/cms/${seleccionado}`)
      .then((data) => {
        if (data.contenido) {
          setDocs((p) => ({
            ...p,
            [seleccionado]: {
              ...p[seleccionado],
              contenido: data.contenido,
              ultima_edicion: data.editado_at
                ? new Date(data.editado_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
                : p[seleccionado].ultima_edicion,
              editor: data.editado_por || p[seleccionado].editor,
            },
          }));
        }
      })
      .catch(() => {});
  }, [seleccionado]);

  const iniciarEdicion = () => {
    setDraft(doc.contenido);
    setEditando(true);
    setPreview(false);
  };

  const guardar = async () => {
    try {
      await adminFetch(`/api/admin/cms/${seleccionado}`, {
        method: "PUT",
        body: JSON.stringify({ contenido: draft }),
      });
      setDocs((p) => ({
        ...p,
        [seleccionado]: {
          ...p[seleccionado],
          contenido: draft,
          ultima_edicion: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }),
          editor: JSON.parse(localStorage.getItem("pv_admin") || "{}").nombre || "Admin",
        },
      }));
      setEditando(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        <PageHeader icon={FileText} title="Editor CMS Legal"
          subtitle="Edita los textos legales sin necesidad de deploy" />

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Documento guardado correctamente</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Selector de documentos */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Documentos</p>
            {Object.values(docs).map((d) => (
              <button
                key={d.slug}
                onClick={() => { setSeleccionado(d.slug); setEditando(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  seleccionado === d.slug
                    ? "border-[#52B788] bg-[#52B788]/10 text-[#1B4332] font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="leading-snug">{d.titulo}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{d.ruta}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Editor principal */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              {/* Topbar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#B7E4C7] bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <div>
                  <h2 className="font-semibold text-white text-sm">{doc.titulo}</h2>
                  <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Última edición: {doc.ultima_edicion} por {doc.editor}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-white/30 text-white hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {preview ? "Código" : "Preview"}
                  </button>
                  {!editando ? (
                    <button
                      onClick={iniciarEdicion}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditando(false)}
                        className="text-xs font-semibold border border-white/30 text-white hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardar}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#D9ED92] text-[#1B4332] hover:bg-white px-3 py-1.5 rounded-xl transition-colors font-bold"
                      >
                        <Save className="w-3.5 h-3.5" /> Guardar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5">
                {editando ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={24}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                  />
                ) : preview ? (
                  <div className="prose prose-sm max-w-none">
                    {doc.contenido.split("\n").map((line, i) => {
                      if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-[#1B4332] text-xl mb-3">{line.slice(2)}</h1>;
                      if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-[#1B4332] text-base mt-5 mb-2">{line.slice(3)}</h2>;
                      if (line.startsWith("- ")) return <li key={i} className="text-slate-600 text-sm ml-4">{line.slice(2)}</li>;
                      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-slate-700 text-sm">{line.replace(/\*\*/g, "")}</p>;
                      if (line.trim() === "") return <div key={i} className="h-2" />;
                      return <p key={i} className="text-slate-600 text-sm leading-relaxed">{line}</p>;
                    })}
                  </div>
                ) : (
                  <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                    {doc.contenido}
                  </pre>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-[#1B4332]/5 border border-[#52B788]/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#1B4332]">Nota:</strong> Los cambios guardados aquí se reflejan inmediatamente en el sitio público (
                <a href={doc.ruta} target="_blank" rel="noopener noreferrer" className="text-[#52B788] hover:underline">{doc.ruta}</a>
                ). En producción, conectar con un endpoint <code className="bg-slate-100 px-1 rounded">/api/admin/cms/{`{slug}`}</code> que persista en base de datos.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCMS;
