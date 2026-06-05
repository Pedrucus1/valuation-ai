import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, EmptyState, FilterBar, PrimaryBtn } from "@/components/AdminUI";
import { Mail, Users, UserCheck, UserX, RefreshCw, Search, Send, Sparkles } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

// Fallback just in case they install react-quill instead of react-quill-new
// import ReactQuill from "react-quill";
// import "react-quill/dist/quill.snow.css";

const ROL_LABELS = { public: "Público", appraiser: "Valuador", realtor: "Inmobiliaria" };

export default function AdminNewsletter() {
  const [data, setData] = useState({ total: 0, activos: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [filtroRol, setFiltroRol] = useState("");

  // Campaign State
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [audience, setAudience] = useState([]); // Empty array means 'all' if we allow it, but let's use ['all']
  const [sending, setSending] = useState(false);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filtroActivo) params.set("activo", filtroActivo);
      if (filtroRol) params.set("rol", filtroRol);
      const res = await adminFetch(`/api/admin/newsletter/subscribers?${params}`);
      setData(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filtroActivo, filtroRol]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const darDeBaja = async (id) => {
    await adminFetch(`/api/admin/newsletter/subscribers/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleSendCampaign = async () => {
    if (!subject || !htmlContent) return alert("Asunto y contenido son obligatorios");
    if (!confirm("¿Seguro que deseas enviar esta campaña a la audiencia seleccionada?")) return;
    
    setSending(true);
    try {
      const res = await adminFetch("/api/admin/newsletter/send", {
        method: "POST",
        body: JSON.stringify({
          subject,
          html_content: htmlContent,
          audience: audience.length > 0 ? audience : ["all"]
        })
      });
      alert(`Campaña iniciada. Enviando a ${res.recipients_count} suscriptores.`);
      setSubject("");
      setHtmlContent("");
    } catch (e) {
      alert("Error enviando campaña: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const generateAI = async (tipo) => {
    if (!aiPrompt) return alert("Ingresa un prompt para la IA");
    setGeneratingAI(true);
    try {
      const res = await adminFetch("/api/admin/newsletter/generate-text", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, tipo })
      });
      
      if (tipo === "subject") {
        setAiResult(res.generated_text);
      } else {
        setHtmlContent(prev => prev + res.generated_text);
      }
    } catch (e) {
      alert("Error con la IA: " + e.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const toggleAudience = (rol) => {
    setAudience(prev => 
      prev.includes(rol) ? prev.filter(r => r !== rol) : [...prev, rol]
    );
  };

  const visible = data.items.filter(s =>
    !search || s.email.toLowerCase().includes(search.toLowerCase()) || (s.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  const inactivos = data.total - data.activos;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <PageHeader icon={Mail} title="Consola de Email Marketing" subtitle="Campañas y administración de suscriptores" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Redactar Campaña */}
          <AdminCard icon={Send} title="Redactar Campaña">
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Audiencia</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="checkbox" checked={audience.length === 0 || audience.includes("all")} onChange={() => setAudience(["all"])} />
                    Todos
                  </label>
                  {Object.entries(ROL_LABELS).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-1.5 text-sm text-slate-600">
                      <input 
                        type="checkbox" 
                        checked={audience.includes(val) && !audience.includes("all")} 
                        onChange={() => {
                          let newAudience = audience.filter(a => a !== "all");
                          if (newAudience.includes(val)) newAudience = newAudience.filter(a => a !== val);
                          else newAudience.push(val);
                          setAudience(newAudience);
                        }} 
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asunto del Correo</label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                  placeholder="Ej: Novedades en PropValu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuerpo del Correo</label>
                <div className="bg-white rounded-lg">
                  <ReactQuill 
                    theme="snow" 
                    value={htmlContent} 
                    onChange={setHtmlContent} 
                    className="h-48 mb-12"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSendCampaign}
                  disabled={sending}
                  className="bg-[#1B4332] text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-[#1B4332]/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Enviando..." : "Enviar Campaña"}
                </button>
              </div>
            </div>
          </AdminCard>

          {/* Asistente IA */}
          <AdminCard icon={Sparkles} title="Asistente IA">
            <div className="p-5 flex flex-col gap-4 bg-gradient-to-br from-indigo-50 to-white rounded-b-xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">¿De qué trata el correo?</label>
                <textarea 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                  rows={4}
                  placeholder="Ej: Anunciar nueva función de reportes en PDF y desear feliz año nuevo..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => generateAI("subject")}
                  disabled={generatingAI}
                  className="flex-1 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-indigo-50 text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Generar Asuntos
                </button>
                <button 
                  onClick={() => generateAI("body")}
                  disabled={generatingAI}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Generar Cuerpo
                </button>
              </div>

              {aiResult && (
                <div className="mt-4 p-4 bg-white border border-indigo-100 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Sugerencias de la IA:</h4>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{aiResult}</pre>
                  <button 
                    onClick={() => { setSubject(aiResult.split('\n')[0].replace(/["*]/g, '').trim()); setAiResult(null); }}
                    className="mt-3 text-xs text-indigo-600 hover:underline"
                  >
                    Usar la primera opción como asunto
                  </button>
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users,     label: "Total suscriptores", value: data.total,   iconBg: "bg-[#F0FAF5]", iconColor: "text-[#1B4332]" },
            { icon: UserCheck, label: "Activos",             value: data.activos, iconBg: "bg-green-50",  iconColor: "text-emerald-600" },
            { icon: UserX,     label: "Dados de baja",       value: inactivos,    iconBg: "bg-slate-50",  iconColor: "text-slate-400" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className="h-1 bg-[#52B788]" />
              <div className="p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.iconBg}`}>
                  <k.icon className={`w-4 h-4 ${k.iconColor}`} />
                </div>
                <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{loading ? "…" : k.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <FilterBar title="Filtros y búsqueda">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar email o nombre…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <select
            value={filtroActivo}
            onChange={e => setFiltroActivo(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Dados de baja</option>
          </select>
          <select
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          >
            <option value="">Todos los roles</option>
            <option value="public">Público</option>
            <option value="appraiser">Valuador</option>
            <option value="realtor">Inmobiliaria</option>
          </select>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </FilterBar>

        {/* Tabla */}
        <AdminCard icon={Users} title={`Suscriptores${visible.length !== data.total ? ` — ${visible.length} mostrados` : ` — ${data.total} total`}`}>
          <div className="p-0">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
            ) : visible.length === 0 ? (
              <EmptyState icon={Mail} title="Sin suscriptores con estos filtros" sub="Prueba con otros criterios de búsqueda" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <GradThead cols={["Email", "Nombre", "Rol", "Suscripción", "Estado", ""]} />
                  <tbody>
                    {visible.map(s => (
                      <tr key={s.subscriber_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{s.email}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.nombre || <span className="text-slate-300 italic">—</span>}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                            {ROL_LABELS[s.rol] || s.rol}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">
                          {s.fecha_suscripcion ? new Date(s.fecha_suscripcion).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          {s.activo
                            ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Activo</span>
                            : <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">Dado de baja</span>
                          }
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {s.activo && (
                            <button
                              onClick={() => darDeBaja(s.subscriber_id)}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              Dar de baja
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>

      </div>
    </AdminLayout>
  );
}
