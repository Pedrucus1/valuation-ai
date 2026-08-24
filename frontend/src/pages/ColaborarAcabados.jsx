import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { API } from "@/App";
import DATA from "@/data/acabados_selectores.json";

// Fase 7 del plan de federación: entrada pública para que un colaborador acreditado
// del Atlas de colonias (no admin) proponga cambios al catálogo de acabados del
// Identificador de Edad. Mismo endpoint que usa AdminAcabados.jsx
// (POST /api/admin/acabados/propuestas), que ya acepta admin O clasificador
// acreditado (core/auth.py::require_admin_or_credentialed_contributor). Solo crea
// propuestas -- revisar/aprobar sigue siendo exclusivo del panel admin.

const NOMBRES_ELEMENTO = {
  muro: "Muro (interior)", cubierta: "Techo / cubierta", agua: "Manejo de agua (tinaco/cisterna)",
  piso: "Piso", herreria: "Herrería", cocina: "Cocina", azulejo_bano: "Azulejo de baño",
  puerta: "Puertas interiores", instalacion: "Instalación eléctrica", canceleria: "Cancelería",
  espejo: "Espejo del baño", wc: "Tipo de WC", lavabo: "Tipo de lavabo", griferia: "Tipo de grifería",
  fachada: "Acabado de fachada", servicio: "Patio / cuarto de servicio", niveles: "Niveles del edificio",
  carpinteria: "Clósets / carpintería", sanitaria: "Instalación sanitaria", estructura: "Estructura",
  ventaneria: "Ventanería", cochera: "Cochera / garaje", plafon: "Plafón interior",
  puerta_ingreso: "Puerta de ingreso", zocalos: "Zócalos", apagadores_placas: "Apagadores y placas",
  iluminacion_fija: "Iluminación fija", lamparas: "Lámparas", ventilacion_clima: "Ventilación y clima",
  domos_tragaluces: "Domos / tragaluces", escaleras: "Escaleras", barda_protecciones: "Barda / protecciones",
  gas_calentamiento: "Gas y calentador de agua",
};
const ELEMENTOS = DATA.elementos_principales;
const DECADAS = ["1900s", "1910s", "1920s", "1930s", "1940s", "1950s", "1960s",
  "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const ACCIONES = [
  { id: "agregar", label: "Agregar opción nueva" },
  { id: "corregir", label: "Corregir décadas de una opción existente" },
  { id: "eliminar", label: "Eliminar una opción" },
];
const FUENTES = [
  { id: "dictado_perito", label: "Dictado del perito" },
  { id: "inferido_texto", label: "Inferido de un texto/catálogo" },
  { id: "literatura_citada", label: "Literatura citada (con URL)" },
];
const EMPTY_FORM = {
  elemento: ELEMENTOS[0] || "", opcion: "", decadas: [], accion: "agregar",
  fuente_tipo: "dictado_perito", fuente_url: "", nota: "",
};
// Sin URL de producción todavía (atlas-colonias sigue sin desplegarse, ver
// PLAN_FEDERACION_ECOSISTEMA.md) -- se toma de env para no inventar un dominio.
const ATLAS_URL = process.env.REACT_APP_ATLAS_COLONIAS_URL || "";

function Shell({ children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Building2 className="w-6 h-6 text-[#1B4332]" />
        <span className="font-semibold text-[#1B4332] font-['Outfit']">PropValu</span>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

export default function ColaborarAcabados() {
  const [authState, setAuthState] = useState("loading"); // loading | anon | ok
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsCredential, setNeedsCredential] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => setAuthState(res.ok ? "ok" : "anon"))
      .catch(() => setAuthState("anon"));
  }, []);

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDecada = (d) => setField({
    decadas: form.decadas.includes(d) ? form.decadas.filter((x) => x !== d) : [...form.decadas, d],
  });

  const enviar = useCallback(async () => {
    if (!form.opcion.trim()) { setError("Escribe el nombre de la opción."); return; }
    if (form.accion !== "eliminar" && form.decadas.length === 0) { setError("Marca al menos una década."); return; }
    setSaving(true); setError(""); setNeedsCredential(false);
    try {
      const res = await fetch(`${API}/admin/acabados/propuestas`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 403) { setNeedsCredential(true); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      setSent(true);
    } catch (e) {
      setError(e.message || "No se pudo enviar la propuesta.");
    } finally {
      setSaving(false);
    }
  }, [form]);

  if (authState === "loading") {
    return <Shell><p className="text-slate-500 text-center py-10">Cargando…</p></Shell>;
  }

  if (authState === "anon") {
    return (
      <Shell>
        <Card><CardContent className="p-6 text-center">
          <h1 className="text-xl font-bold text-[#1B4332] font-['Outfit'] mb-2">Aporta al catálogo de acabados</h1>
          <p className="text-slate-600 mb-4">Necesitas iniciar sesión en PropValu para proponer cambios.</p>
          <Button onClick={() => (window.location.href = "/login")}>Iniciar sesión</Button>
        </CardContent></Card>
      </Shell>
    );
  }

  if (needsCredential) {
    return (
      <Shell>
        <Card><CardContent className="p-6 text-center">
          <h1 className="text-xl font-bold text-[#1B4332] font-['Outfit'] mb-2">Se requiere acreditación</h1>
          <p className="text-slate-600 mb-4">
            Necesitas ser clasificador acreditado del Atlas de colonias, con el mismo correo de tu
            cuenta de PropValu, y alcance de historia/acabados aprobado.
          </p>
          {ATLAS_URL ? (
            <a href={ATLAS_URL} target="_blank" rel="noreferrer">
              <Button variant="outline">Registrarme en el Atlas de colonias</Button>
            </a>
          ) : (
            <p className="text-sm text-slate-400">
              El Atlas de colonias aún no tiene sitio público — pregunta al equipo cómo registrarte.
            </p>
          )}
        </CardContent></Card>
      </Shell>
    );
  }

  if (sent) {
    return (
      <Shell>
        <Card><CardContent className="p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[#1B4332] font-['Outfit'] mb-2">Propuesta enviada</h1>
          <p className="text-slate-600 mb-4">Quedó en revisión. El catálogo original no se modifica todavía.</p>
          <Button variant="outline" onClick={() => { setForm({ ...EMPTY_FORM }); setSent(false); }}>Enviar otra propuesta</Button>
        </CardContent></Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-[#1B4332] font-['Outfit'] mb-1">Aporta al catálogo de acabados</h1>
      <p className="text-slate-500 text-sm mb-6">
        Propuestas auditables. Solo se incorporan al catálogo después de revisión y nunca sobrescriben
        el diccionario fuente.
      </p>
      <Card><CardContent className="p-6 flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Elemento</label>
          <select value={form.elemento} onChange={(e) => setField({ elemento: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
            {ELEMENTOS.map((e) => <option key={e} value={e}>{NOMBRES_ELEMENTO[e] || e}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Acción</label>
          <select value={form.accion} onChange={(e) => setField({ accion: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
            {ACCIONES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Opción (nombre exacto)</label>
          <input value={form.opcion} onChange={(e) => setField({ opcion: e.target.value })}
            placeholder="Ej: Porcelanato gran formato en fachada"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
        </div>

        {form.accion !== "eliminar" && (
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Décadas</label>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {DECADAS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDecada(d)}
                  className={`px-2 py-1.5 rounded-lg border text-xs ${form.decadas.includes(d) ? "border-[#52B788] bg-[#F0FAF5] font-medium text-[#1B4332]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fuente</label>
          <select value={form.fuente_tipo} onChange={(e) => setField({ fuente_tipo: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
            {FUENTES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>

        {form.fuente_tipo === "literatura_citada" && (
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">URL de la fuente</label>
            <input type="url" value={form.fuente_url} onChange={(e) => setField({ fuente_url: e.target.value })}
              placeholder="https://…"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Nota (opcional)</label>
          <input value={form.nota} onChange={(e) => setField({ nota: e.target.value })}
            placeholder="Contexto extra para el revisor"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <Button onClick={enviar} disabled={saving}>{saving ? "Enviando…" : "Enviar propuesta"}</Button>
      </CardContent></Card>
    </Shell>
  );
}
