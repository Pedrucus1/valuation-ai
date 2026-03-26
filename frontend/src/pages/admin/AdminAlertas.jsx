import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Bell, BellOff, CheckCircle2, AlertTriangle, XCircle,
  Clock, Mail, Smartphone, Save, Plus, X, RefreshCw,
} from "lucide-react";

const CANAL_CFG = {
  email:  { label: "Email",    icon: <Mail className="w-3.5 h-3.5" />,       cls: "bg-blue-100 text-blue-700" },
  inapp:  { label: "In-app",   icon: <Bell className="w-3.5 h-3.5" />,       cls: "bg-purple-100 text-purple-700" },
  sms:    { label: "SMS",      icon: <Smartphone className="w-3.5 h-3.5" />, cls: "bg-green-100 text-green-700" },
};

const NIVEL_CFG = {
  info:  "bg-blue-50 border-blue-100 text-blue-700",
  warn:  "bg-yellow-50 border-yellow-100 text-yellow-700",
  error: "bg-red-50 border-red-100 text-red-600",
};

const AdminAlertas = () => {
  const [config, setConfig] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [guardado, setGuardado] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [emailDestino, setEmailDestino] = useState("admin@propvalu.mx");
  const [testEnviando, setTestEnviando] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/alertas")
      .then((d) => {
        setConfig(d.alertas || []);
        setEmailDestino(d.email_destino || "admin@propvalu.mx");
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const toggleAlerta = (id) => {
    setConfig((p) => p.map((a) => a.id === id ? { ...a, activa: !a.activa } : a));
    setCambios(true);
  };

  const toggleCanal = (id, canal) => {
    setConfig((p) => p.map((a) => {
      if (a.id !== id) return a;
      const tiene = a.canales.includes(canal);
      return { ...a, canales: tiene ? a.canales.filter((c) => c !== canal) : [...a.canales, canal] };
    }));
    setCambios(true);
  };

  const guardar = async () => {
    try {
      await adminFetch("/api/admin/alertas", {
        method: "PUT",
        body: JSON.stringify({ alertas: config, email_destino: emailDestino }),
      });
      setGuardado(true);
      setCambios(false);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  const enviarTest = async (id) => {
    setTestEnviando(id);
    await new Promise((r) => setTimeout(r, 1200));
    setTestEnviando(null);
    alert(`Alerta de prueba "${id}" — integrar SendGrid para envío real a ${emailDestino}`);
  };

  const noLeidas = notifs.filter((n) => !n.leida).length;
  const marcarTodasLeidas = () => setNotifs((p) => p.map((n) => ({ ...n, leida: true })));

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Alertas Automáticas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Configura cuándo y cómo recibes notificaciones del sistema</p>
          </div>
          <button onClick={guardar} disabled={!cambios}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Save className="w-4 h-4" />{cambios ? "Guardar cambios" : "Sin cambios"}
          </button>
        </div>

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Configuración de alertas guardada</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Config alertas */}
          <div className="lg:col-span-2 space-y-3">

            {/* Email destino */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-semibold mb-1">Email de destino para alertas</p>
                <input type="email" value={emailDestino} onChange={(e) => { setEmailDestino(e.target.value); setCambios(true); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
            </div>

            {/* Lista de alertas */}
            {cargando && (
              <div className="text-center py-10 text-slate-400 text-sm">Cargando configuración…</div>
            )}
            {!cargando && config.map((alerta) => (
              <div key={alerta.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-opacity ${alerta.activa ? "border-slate-100 opacity-100" : "border-slate-100 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[#1B4332] text-sm">{alerta.nombre}</h3>
                      {alerta.veces_hoy > 0 && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                          ×{alerta.veces_hoy} hoy
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">{alerta.descripcion}</p>
                    {alerta.umbral && (
                      <p className="text-xs text-slate-300 mt-0.5">Umbral: {alerta.umbral} {alerta.umbral_label}</p>
                    )}
                  </div>
                  <button onClick={() => toggleAlerta(alerta.id)}
                    className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${alerta.activa ? "bg-[#52B788]" : "bg-slate-200"}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${alerta.activa ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Canales */}
                  <div className="flex gap-1.5">
                    {Object.entries(CANAL_CFG).map(([key, cfg]) => (
                      <button key={key} onClick={() => toggleCanal(alerta.id, key)}
                        disabled={!alerta.activa}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                          alerta.canales.includes(key)
                            ? cfg.cls + " border-transparent"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}>
                        {cfg.icon}{cfg.label}
                      </button>
                    ))}
                  </div>

                  {/* Última activación */}
                  {alerta.ultima_activacion && (
                    <span className="text-[11px] text-slate-300 flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      Última: {new Date(alerta.ultima_activacion).toLocaleDateString("es-MX")}
                    </span>
                  )}

                  {/* Botón test */}
                  <button onClick={() => enviarTest(alerta.id)} disabled={!alerta.activa || testEnviando === alerta.id}
                    className="text-[11px] font-semibold text-slate-400 border border-slate-200 hover:text-[#1B4332] hover:border-slate-300 px-2.5 py-1 rounded-xl transition-colors disabled:opacity-30 ml-auto">
                    {testEnviando === alerta.id
                      ? <><RefreshCw className="w-3 h-3 inline animate-spin mr-1" />Enviando...</>
                      : "Enviar prueba"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Panel notificaciones recientes */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1B4332]" />
                  <h2 className="font-semibold text-[#1B4332] text-sm">Notificaciones</h2>
                  {noLeidas > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{noLeidas}</span>
                  )}
                </div>
                {noLeidas > 0 && (
                  <button onClick={marcarTodasLeidas} className="text-xs text-slate-400 hover:text-[#1B4332]">
                    Marcar leídas
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {notifs.length === 0 ? (
                  <p className="text-xs text-slate-300 text-center py-6">Sin notificaciones recientes</p>
                ) : notifs.map((n) => (
                  <div key={n.id} className={`px-4 py-3 flex gap-3 ${n.leida ? "opacity-60" : ""}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.leida ? "bg-slate-200" : "bg-red-400"}`} />
                    <div>
                      <p className="text-xs text-slate-600 leading-snug">{n.mensaje}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{n.hora}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-[#1B4332]">Canales disponibles</p>
              <p><strong>In-app</strong> — campana en el panel admin (ya implementado)</p>
              <p><strong>Email</strong> — vía SendGrid (mismo canal que broadcast)</p>
              <p className="text-slate-400"><strong>SMS</strong> — disponible cuando haya 50+ valuadores activos (Twilio)</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAlertas;
