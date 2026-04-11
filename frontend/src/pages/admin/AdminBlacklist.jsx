import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { Plus, X, Save, CheckCircle2, AlertTriangle, Globe, Type } from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

// En producción: GET/PUT /api/admin/blacklist
const PALABRAS_INICIALES = [
  "garantizado", "garantizamos", "100% seguro", "sin riesgo", "gana dinero fácil",
  "inversión garantizada", "rendimiento asegurado", "paga cero impuestos",
  "lavado de dinero", "prestamista particular", "dinero urgente", "sin buró",
  "COMPRA YA", "LLAMA AHORA", "GRATIS GRATIS", "¡¡¡", "???",
];

const DOMINIOS_INICIALES = [
  "bit.ly", "tinyurl.com", "ow.ly", "t.co", "goo.gl",
  "scam-inmuebles.mx", "fraude-realty.com",
];

const AdminBlacklist = () => {
  const [palabras, setPalabras] = useState(PALABRAS_INICIALES);
  const [dominios, setDominios] = useState(DOMINIOS_INICIALES);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [nuevoDominio, setNuevoDominio] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [testTexto, setTestTexto] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/blacklist")
      .then((data) => {
        if (data.palabras?.length) setPalabras(data.palabras);
        if (data.dominios?.length) setDominios(data.dominios);
      })
      .catch(() => {});
  }, []);

  const agregarPalabra = () => {
    const val = nuevaPalabra.trim().toLowerCase();
    if (!val || palabras.includes(val)) return;
    setPalabras((p) => [...p, val]);
    setNuevaPalabra("");
    setCambios(true);
  };

  const eliminarPalabra = (p) => {
    setPalabras((prev) => prev.filter((x) => x !== p));
    setCambios(true);
  };

  const agregarDominio = () => {
    const val = nuevoDominio.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!val || dominios.includes(val)) return;
    setDominios((p) => [...p, val]);
    setNuevoDominio("");
    setCambios(true);
  };

  const eliminarDominio = (d) => {
    setDominios((prev) => prev.filter((x) => x !== d));
    setCambios(true);
  };

  const guardar = async () => {
    try {
      await adminFetch("/api/admin/blacklist", {
        method: "PUT",
        body: JSON.stringify({ palabras, dominios }),
      });
      setGuardado(true);
      setCambios(false);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  // Verificar el texto de prueba
  const matchesPalabra = testTexto
    ? palabras.filter((p) => testTexto.toLowerCase().includes(p.toLowerCase()))
    : [];
  const matchesDominio = testTexto
    ? dominios.filter((d) => testTexto.toLowerCase().includes(d.toLowerCase()))
    : [];
  const testOk = testTexto && matchesPalabra.length === 0 && matchesDominio.length === 0;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        <PageHeader icon={Type} title="Blacklist de Anuncios"
          subtitle="Palabras y dominios que activan revisión manual automática">
          <button onClick={guardar} disabled={!cambios}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Save className="w-4 h-4" />
            {cambios ? "Guardar cambios" : "Sin cambios"}
          </button>
        </PageHeader>

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Blacklist actualizada correctamente</span>
          </div>
        )}

        {/* Cómo funciona */}
        <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl p-4 text-sm text-slate-600">
          <p className="font-semibold text-[#1B4332] mb-1">¿Cómo funciona?</p>
          <p className="text-xs leading-relaxed">
            Al subir un anuncio, el sistema escanea el título y descripción. Si detecta una palabra o dominio de esta lista,
            el anuncio se marca automáticamente con un flag <strong>⚠️</strong> en el panel de moderación para revisión manual.
            No bloquea el anuncio directamente — siempre hay revisión humana final.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Palabras */}
          <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-[#1B4332]" />
              <h2 className="font-semibold text-[#1B4332] text-sm">Palabras y frases ({palabras.length})</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={nuevaPalabra}
                onChange={(e) => setNuevaPalabra(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarPalabra()}
                placeholder="Agregar palabra o frase..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              />
              <button onClick={agregarPalabra}
                className="flex items-center gap-1 bg-[#1B4332] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#163828] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
              {palabras.map((p) => (
                <span key={p}
                  className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {p}
                  <button onClick={() => eliminarPalabra(p)}
                    className="text-red-400 hover:text-red-600 transition-colors ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {palabras.length === 0 && <p className="text-xs text-slate-300">Sin palabras en la lista.</p>}
            </div>
          </div>

          {/* Dominios */}
          <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[#1B4332]" />
              <h2 className="font-semibold text-[#1B4332] text-sm">Dominios bloqueados ({dominios.length})</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={nuevoDominio}
                onChange={(e) => setNuevoDominio(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarDominio()}
                placeholder="ej: bit.ly o scam.com"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              />
              <button onClick={agregarDominio}
                className="flex items-center gap-1 bg-[#1B4332] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#163828] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {dominios.map((d) => (
                <div key={d}
                  className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-sm font-mono text-orange-700">{d}</span>
                  </div>
                  <button onClick={() => eliminarDominio(d)}
                    className="text-orange-300 hover:text-orange-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {dominios.length === 0 && <p className="text-xs text-slate-300">Sin dominios en la lista.</p>}
            </div>
          </div>
        </div>

        {/* Tester */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <h2 className="font-semibold text-[#1B4332] text-sm mb-3">
            Probador — verifica si un texto sería marcado
          </h2>
          <textarea
            value={testTexto}
            onChange={(e) => setTestTexto(e.target.value)}
            rows={3}
            placeholder="Pega aquí el título o descripción de un anuncio para verificar..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
          />

          {testTexto && (
            <div className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
              testOk
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {testOk
                ? <><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> Este texto pasaría la revisión automática sin flags.</>
                : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Este texto sería marcado para revisión manual:</p>
                      {matchesPalabra.length > 0 && (
                        <p className="text-xs mt-1">
                          <strong>Palabras:</strong>{" "}
                          {matchesPalabra.map((p) => (
                            <span key={p} className="bg-red-200 px-1 rounded mr-1">{p}</span>
                          ))}
                        </p>
                      )}
                      {matchesDominio.length > 0 && (
                        <p className="text-xs mt-1">
                          <strong>Dominios:</strong>{" "}
                          {matchesDominio.map((d) => (
                            <span key={d} className="bg-orange-200 px-1 rounded mr-1 font-mono">{d}</span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBlacklist;
