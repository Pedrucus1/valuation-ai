import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { FileText, Save, CheckCircle2, AlertCircle, Eye, Edit2, Clock } from "lucide-react";

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

        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Editor CMS Legal</h1>
          <p className="text-slate-400 text-sm mt-0.5">Edita los textos legales sin necesidad de deploy</p>
        </div>

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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Topbar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-[#F8F9FA]">
                <div>
                  <h2 className="font-semibold text-[#1B4332] text-sm">{doc.titulo}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Última edición: {doc.ultima_edicion} por {doc.editor}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {preview ? "Código" : "Preview"}
                  </button>
                  {!editando ? (
                    <button
                      onClick={iniciarEdicion}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-[#1B4332] text-white hover:bg-[#163828] px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditando(false)}
                        className="text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardar}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#52B788] text-white hover:bg-[#3fa070] px-3 py-1.5 rounded-xl transition-colors"
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
