import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Trophy, Flame, Target, X, Medal, TrendingUp } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const META = 150;

const authHeaders = () => {
  const h = {};
  try { const t = JSON.parse(localStorage.getItem("pv_admin") || "{}")?.token; if (t) h["X-Admin-Token"] = t; } catch {}
  try { const ut = localStorage.getItem("pv_token"); if (ut) h["Authorization"] = `Bearer ${ut}`; } catch {}
  return h;
};

const reduce = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── Sonidito (Web Audio, sin archivos) ──────────────────────────────────────
function reproducirDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    [[880, 0], [1320, 0.08]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0 + delay); osc.stop(t0 + delay + 0.26);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

// ── 20 variantes de festejo al sumar un punto (variedad = divertido) ───────
const CELEBRACIONES_PUNTO = [
  { emoji: "🎯", texto: "+1 punto" },
  { emoji: "🎉", texto: "¡Sumaste una más!" },
  { emoji: "👏", texto: "¡Buen trabajo!" },
  { emoji: "🔥", texto: "¡Así se hace!" },
  { emoji: "⭐", texto: "¡Genial!" },
  { emoji: "🚀", texto: "¡Vas muy bien!" },
  { emoji: "👍", texto: "¡Nice!" },
  { emoji: "💚", texto: "¡A la lista!" },
  { emoji: "🏡", texto: "¡Dato guardado!" },
  { emoji: "🥳", texto: "¡Otra más!" },
  { emoji: "💯", texto: "¡Perfecto!" },
  { emoji: "✅", texto: "¡Confirmado!" },
  { emoji: "🙌", texto: "¡Sigue así!" },
  { emoji: "🤩", texto: "¡Excelente!" },
  { emoji: "😎", texto: "¡Correcto!" },
  { emoji: "🎈", texto: "¡Vamos!" },
  { emoji: "✨", texto: "¡Chido!" },
  { emoji: "👌", texto: "OK" },
  { emoji: "🌟", texto: "¡Anotado!" },
  { emoji: "💪", texto: "¡Bien ahí!" },
];

// ── Confeti canvas (sin librerías) ──────────────────────────────────────────
function lanzarConfeti(canvas, fuerte = false) {
  if (!canvas || reduce()) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;
  const colores = ["#1B4332", "#52B788", "#D9ED92", "#B08B4F", "#e74c3c", "#4a90d9"];
  const n = fuerte ? 220 : 110;
  const parts = Array.from({ length: n }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * (fuerte ? 16 : 11),
    vy: (Math.random() - 1) * (fuerte ? 15 : 11),
    g: 0.28 + Math.random() * 0.15,
    s: 5 + Math.random() * 7,
    c: colores[(Math.random() * colores.length) | 0],
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
  }));
  let t = 0;
  const dur = fuerte ? 160 : 110;
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
    });
    if (t++ < dur) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  })();
}

// ── Componente principal ────────────────────────────────────────────────────
const GamificacionVerificador = forwardRef((props, ref) => {
  const [stats, setStats] = useState(null);   // {hoy,total,record_dia,por_dia,progreso_meta}
  const [abierto, setAbierto] = useState(false);
  const [board, setBoard] = useState(null);
  const [rango, setRango] = useState("trimestre");
  const [festejo, setFestejo] = useState(null); // {tipo:'punto'|'record'|'meta', texto}
  const canvasRef = useRef(null);
  const recordRef = useRef(0);
  const metaRef = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/gamificacion/mis-puntos`, { credentials: "include", headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setStats(d);
        recordRef.current = d.record_dia?.count || 0;
        metaRef.current = (d.total || 0) >= META;
      }
    } catch {}
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cargarBoard = useCallback(async (rg) => {
    try {
      const r = await fetch(`${API}/api/gamificacion/leaderboard?rango=${rg}`, { credentials: "include", headers: authHeaders() });
      if (r.ok) setBoard(await r.json());
    } catch {}
  }, []);

  // Llamado por el verificador tras cada guardado exitoso: {hoy, record, puntos}
  useImperativeHandle(ref, () => ({
    registrarPunto({ hoy, record, puntos }) {
      setStats(s => ({ ...(s || {}), hoy, total: puntos, record_dia: { ...(s?.record_dia || {}), count: record } }));
      const nuevoRecordDia = hoy != null && hoy > (recordRef.current || 0) && hoy > 1;
      const cruzaMeta = !metaRef.current && puntos != null && puntos >= META;
      recordRef.current = Math.max(recordRef.current || 0, record || hoy || 0);
      if (cruzaMeta) {
        metaRef.current = true;
        setFestejo({ tipo: "meta", texto: `¡Llegaste a ${META} puntos! 🏆` });
        setTimeout(() => lanzarConfeti(canvasRef.current, true), 30);
      } else if (nuevoRecordDia) {
        setFestejo({ tipo: "record", texto: `¡Nuevo récord del día: ${hoy}! 🎉` });
        setTimeout(() => lanzarConfeti(canvasRef.current, false), 30);
      } else {
        const c = CELEBRACIONES_PUNTO[(Math.random() * CELEBRACIONES_PUNTO.length) | 0];
        setFestejo({ tipo: "punto", texto: c.texto, emoji: c.emoji });
      }
      reproducirDing();
      setTimeout(() => setFestejo(null), cruzaMeta ? 4200 : nuevoRecordDia ? 3200 : 1200);
    },
  }), []);

  const abrirPanel = () => { setAbierto(true); cargarBoard(rango); };
  const hoy = stats?.hoy ?? 0, total = stats?.total ?? 0, record = stats?.record_dia?.count ?? 0;
  const pct = Math.min(100, Math.round((total / META) * 100));

  return (
    <>
      {/* Barra de stats */}
      <div className="flex items-center gap-3 flex-wrap bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-xl px-4 py-2.5 text-white">
        <div className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-[#D9ED92]" /><span className="text-sm">Hoy <b className="text-[#D9ED92]">{hoy}</b></span></div>
        <div className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-[#D9ED92]" /><span className="text-sm">Récord <b>{record}</b></span></div>
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
          <Target className="w-4 h-4 text-[#D9ED92]" />
          <div className="flex-1">
            <div className="flex justify-between text-[10px] opacity-80"><span>Meta {META}</span><span>{total}/{META}</span></div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-[#D9ED92] transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <button onClick={abrirPanel} className="bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors">
          <Medal className="w-3.5 h-3.5" /> Mi récord / Concurso
        </button>
      </div>

      {/* Overlay de festejo */}
      {festejo && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {festejo.tipo === "punto" ? (
            <div className="animate-[floatUp_1.1s_ease-out] text-3xl font-black text-[#1B4332] drop-shadow flex items-center gap-2">
              <span>{festejo.emoji}</span><span>{festejo.texto}</span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl border-4 border-[#D9ED92] px-8 py-6 text-center animate-[pop_0.4s_ease-out]">
              <div className="text-6xl mb-2">{festejo.tipo === "meta" ? "🏆" : "🎉"}</div>
              <div className="text-7xl mb-1">{festejo.tipo === "meta" ? "🥳" : "🙌"}</div>
              <p className="text-xl font-black text-[#1B4332] font-['Outfit']">{festejo.texto}</p>
              {festejo.tipo === "meta" && <p className="text-sm text-[#52B788] mt-1 font-semibold">¡Vas por el premio del trimestre! 🎊</p>}
            </div>
          )}
        </div>
      )}

      {/* Panel récord + concurso */}
      {abierto && (
        <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2"><Trophy className="w-6 h-6 text-[#D9ED92]" /><h3 className="font-bold text-lg font-['Outfit']">Mi récord y concurso</h3></div>
              <button onClick={() => setAbierto(false)} className="hover:bg-white/20 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Hoy", hoy, "🔥"], ["Récord/día", record, "🏆"], ["Total", total, "⭐"]].map(([l, v, e]) => (
                  <div key={l} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl py-3">
                    <div className="text-2xl">{e}</div><div className="text-2xl font-black text-[#1B4332]">{v}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{l}</div>
                  </div>
                ))}
              </div>
              {/* Meta */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>🎯 Meta {META} puntos</span><span>{total}/{META}</span></div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#52B788] to-[#D9ED92]" style={{ width: `${pct}%` }} /></div>
                {total >= META ? <p className="text-xs text-[#52B788] font-bold mt-1">¡Meta lograda! 🎉</p> : <p className="text-[11px] text-slate-500 mt-1">Te faltan <b>{META - total}</b> para tu premio.</p>}
              </div>
              {/* Historial por día */}
              {stats?.por_dia?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Últimos días</p>
                  <div className="flex items-end gap-1 h-24">
                    {stats.por_dia.slice(-21).map((d, i) => {
                      const mx = Math.max(...stats.por_dia.map(x => x.count), 1);
                      return <div key={i} className="flex-1 bg-[#52B788] rounded-t hover:bg-[#1B4332] transition-colors" style={{ height: `${Math.max(3, (d.count / mx) * 100)}%` }} title={`${d.fecha}: ${d.count}`} />;
                    })}
                  </div>
                </div>
              )}
              {/* Leaderboard / concurso */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Medal className="w-3.5 h-3.5" /> Concurso</p>
                  <select value={rango} onChange={e => { setRango(e.target.value); cargarBoard(e.target.value); }} className="text-xs border border-slate-200 rounded-md px-2 py-1">
                    <option value="mes">Este mes</option><option value="trimestre">Trimestre</option><option value="anio">Año</option><option value="historico">Histórico</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  {board?.ranking?.length ? board.ranking.slice(0, 15).map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i < 3 ? "bg-[#F0FAF5] border border-[#B7E4C7]" : "bg-slate-50"}`}>
                      <span className="text-lg w-6 text-center">{["🥇", "🥈", "🥉"][i] || `${i + 1}`}</span>
                      <span className="flex-1 text-sm text-slate-700 truncate">{r.estimador}</span>
                      <span className="font-bold text-[#1B4332]">{r.count}</span>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">Aún no hay datos del concurso en este rango.</p>}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">🏅 Se premia a los primeros lugares cada <b>trimestre</b> y al cierre <b>anual</b>. ¡Sigue sumando!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes floatUp { 0%{transform:translateY(20px) scale(.6);opacity:0} 30%{opacity:1} 100%{transform:translateY(-60px) scale(1.2);opacity:0} }
      `}</style>
    </>
  );
});

export default GamificacionVerificador;
