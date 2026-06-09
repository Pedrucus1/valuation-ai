import React from 'react';
import { MapPin, Phone, Mail, User, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Fingerprint, Sofa, Home, CheckCircle2, Bed, Bath, Square } from 'lucide-react';

// ── Parser de íconos (mismo que LayoutClasico) ──────────────────────────────
const parseFeatureItem = (str) => {
  const raw = (str || '').trim();
  const numMatch = raw.match(/\b(\d+(?:m2|m²)?)\b/i);
  const qty = numMatch ? numMatch[1] : null;
  let label = qty ? raw.replace(qty, '').replace(/\s+/, ' ').trim() : raw;
  const lower = label.toLowerCase();
  let Icon = CheckCircle2;
  if (lower.includes('alberca') || lower.includes('piscina')) Icon = Waves;
  else if (lower.includes('aire') || lower.includes('acondicionado')) Icon = Wind;
  else if (lower.includes('auto') || lower.includes('cochera') || lower.includes('estacionamiento')) Icon = Car;
  else if (lower.includes('camara') || lower.includes('circuito') || lower.includes('cctv')) Icon = Camera;
  else if (lower.includes('jardin') || lower.includes('arbol') || lower.includes('areas verdes')) Icon = Trees;
  else if (lower.includes('gym') || lower.includes('gimnasio')) Icon = Dumbbell;
  else if (lower.includes('seguridad') || lower.includes('vigilancia') || lower.includes('caseta')) Icon = Shield;
  else if (lower.includes('cava') || lower.includes('vino')) Icon = Wine;
  else if (lower.includes('smart') || lower.includes('inteligente')) Icon = Monitor;
  else if (lower.includes('biometrico') || lower.includes('huella')) Icon = Fingerprint;
  else if (lower.includes('sala') || lower.includes('family')) Icon = Sofa;
  else if (lower.includes('casa club')) Icon = Home;
  return { label, qty, Icon };
};

// ── STITCH OBSIDIAN: Ficha Técnica (A4 2 páginas) ──────────────────────────
const FichaTecnica = ({ fichaAvaluo, session, formatMXN, amenidades, instalaciones, espacios, texts, idioma, descripcionTexto, palette = {} }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const accent = palette?.accent || '#f59e0b';

  // Usar las fotos que existan, fallbacks si no hay
  const fotos = fichaAvaluo?.fotos || [];
  const heroImg = fotos[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';

  return (
    <div id="pv-ficha-root" className="w-[794px] mx-auto grid grid-cols-1 gap-10 font-sans tracking-tight">

      {/* ── HOJA 1 ── fixed A4 794×1123px */}
      <div className="bg-[#0D0D0D] text-white flex flex-col overflow-hidden shadow-2xl relative" style={{ width: 794, height: 1123 }}>
        {/* Hero Image */}
        <div className="h-[60%] relative overflow-hidden">
          <img src={heroImg} alt={dir} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent" />
          <div className="absolute inset-0 bg-[#0D0D0D]/10" />
          <div className="absolute bottom-10 left-10 right-10">
            <h1 className="text-4xl font-black mb-2 leading-tight uppercase tracking-widest text-white drop-shadow-lg">{dir}</h1>
            <p className="text-3xl font-black drop-shadow-md" style={{ color: accent }}>{precio}</p>
          </div>
          {/* Logo / Badge */}
          <div className="absolute top-10 right-10 bg-[#0D0D0D]/80 backdrop-blur-md px-6 py-3 border border-white/10 shadow-xl">
            {session?.user?.picture
              ? <img src={session.user.picture} style={{ height: 24, maxWidth: 80, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} alt="Logo" />
              : <span className="text-xs tracking-[0.3em] font-bold" style={{ color: accent }}>OBSIDIAN</span>}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="h-24 bg-[#111] grid grid-cols-4 divide-x divide-white/10 shrink-0 border-y border-white/5 shadow-inner z-10 relative">
          {[
            { label: 'Terreno', val: fichaAvaluo?.terreno ? `${fichaAvaluo.terreno}m²` : '—', Icon: MapPin },
            { label: 'Construcción', val: fichaAvaluo?.construccion ? `${fichaAvaluo.construccion}m²` : '—', Icon: Square },
            { label: 'Recámaras', val: fichaAvaluo?.recamaras || '—', Icon: Bed },
            { label: 'Baños', val: fichaAvaluo?.banos || '—', Icon: Bath },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-2 group hover:bg-white/5 transition-colors">
              <stat.Icon className="w-4 h-4 mb-1.5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" style={{ color: accent }} />
              <span className="text-[10px] text-white/50 uppercase tracking-widest">{stat.label}</span>
              <span className="text-sm font-bold text-white mt-0.5">{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Highlight Features */}
        <div className="flex-1 p-10 flex flex-col justify-center bg-[#0D0D0D]">
          <div className="grid grid-cols-2 gap-8 h-full">
            <div className="flex flex-col justify-center pl-6 h-full" style={{ borderLeft: `2px solid ${accent}` }}>
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">{idioma === 'es' ? 'Valoración' : 'Valuation'}</h3>
              <p className="text-5xl font-black text-white leading-none mb-3">A+</p>
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color: accent }}>Premium Tier</p>
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-5">{idioma === 'es' ? 'Highlights' : 'Highlights'}</h3>

              {/* descripcionTexto snippet in Hoja 1 */}
              {descripcionTexto && (
                <p className="text-[10px] text-white/50 leading-relaxed mb-4 line-clamp-2">{descripcionTexto}</p>
              )}

              {/* puntosDestacados chips in Hoja 1 */}
              {/* (passed via props at LayoutStitch level — FichaTecnica receives them if present) */}

              <ul className="space-y-4">
                {(amenidades?.slice(0, 3) || []).map((am, i) => {
                  const { label, Icon: Ic } = parseFeatureItem(am);
                  return (
                    <li key={i} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors" style={{ borderColor: accent + '4d', background: accent + '0d' }}>
                        <Ic className="w-3.5 h-3.5" style={{ color: accent }} />
                      </div>
                      <span className="text-sm font-bold tracking-wide text-white/90 uppercase">{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOJA 2 ── fixed A4 794×1123px */}
      <div className="bg-[#0D0D0D] text-white flex flex-col overflow-hidden shadow-2xl" style={{ width: 794, height: 1123 }}>
        <div className="flex-1 flex flex-col p-10 gap-6 min-h-0 overflow-hidden">

          {/* Descripción */}
          {descripcionTexto && (
            <div>
              <h3 className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2 flex items-center gap-3" style={{ color: accent }}>
                <span className="flex-1 h-px bg-white/10" />
                {idioma === 'es' ? 'Descripción' : 'Description'}
                <span className="flex-1 h-px bg-white/10" />
              </h3>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-4">{descripcionTexto}</p>
            </div>
          )}

          {/* Amenidades con íconos */}
          <div>
            <h3 className="text-[9px] tracking-[0.3em] uppercase font-bold mb-3 flex items-center gap-3" style={{ color: accent }}>
              <span className="flex-1 h-px bg-white/10" />
              {idioma === 'es' ? 'Amenidades de Lujo' : 'Luxury Amenities'}
              <span className="flex-1 h-px bg-white/10" />
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(amenidades?.length ? amenidades : ['Alberca privada', 'Seguridad 24/7', 'Casa Club', 'Gimnasio']).map((am, i) => {
                const { label, qty, Icon: Ic } = parseFeatureItem(am);
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <div className="p-1 rounded-full shrink-0" style={{ background: accent + '1a' }}>
                      <Ic className="w-3 h-3" style={{ color: accent }} />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/80 capitalize block leading-tight">{label}</span>
                      {qty && <span className="text-[9px] font-bold" style={{ color: accent }}>{qty}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instalaciones + Espacios */}
          <div className="flex gap-8">
            <div className="flex-1">
              <h3 className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2" style={{ color: accent }}>{idioma === 'es' ? 'Instalaciones' : 'Installations'}</h3>
              <ul className="space-y-1.5">
                {(instalaciones?.length ? instalaciones : ['Paneles Solares', 'Cisterna 10,000L']).map((inst, i) => {
                  const { label, qty, Icon: Ic } = parseFeatureItem(inst);
                  return (
                    <li key={i} className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <div className="flex items-center gap-2"><Ic className="w-3 h-3 text-white/40" /><span className="text-[10px] text-white/70">{label}</span></div>
                      {qty && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">{qty}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex-1">
              <h3 className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2" style={{ color: accent }}>{idioma === 'es' ? 'Espacios' : 'Spaces'}</h3>
              <ul className="space-y-1.5">
                {(espacios?.length ? espacios : ['Sala de TV', 'Comedor']).map((esp, i) => {
                  const { label, qty, Icon: Ic } = parseFeatureItem(esp);
                  return (
                    <li key={i} className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <div className="flex items-center gap-2"><Ic className="w-3 h-3 text-white/40" /><span className="text-[10px] text-white/70">{label}</span></div>
                      {qty && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">{qty}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Galería ampliada — hasta 6 fotos */}
          <div className="shrink-0">
            <h3 className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2 flex items-center gap-3" style={{ color: accent }}>
              <span className="flex-1 h-px bg-white/10" />
              {idioma === 'es' ? 'Galería' : 'Gallery'}
              <span className="flex-1 h-px bg-white/10" />
            </h3>
            <div className="grid grid-cols-3 gap-2 h-36">
              {Array.from({ length: 6 }, (_, i) => fotos[i + 1]).map((f, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-white/5">
                  {f
                    ? <img src={f} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-white/10 text-[8px]">PHOTO</span>
                      </div>}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Asesor */}
        <div className="shrink-0 border-t border-white/10 px-10 py-5 flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden" style={{ background: accent + '33', borderColor: accent + '80' }}>
              {session?.user?.photoURL
                ? <img src={session.user.photoURL} className="w-full h-full object-cover" alt="" />
                : <User className="w-6 h-6" style={{ color: accent }} />}
            </div>
            <div>
              <p className="text-[9px] text-white/50 uppercase tracking-[0.2em]">{texts?.asesor || 'Asesor'}</p>
              <p className="text-sm font-bold text-white">{session?.user?.name || 'Asesor Inmobiliario'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <p className="text-[10px] flex items-center gap-2" style={{ color: accent }}><Phone className="w-3 h-3" /> {session?.user?.phone || '+52 123 456 7890'}</p>
            <p className="text-[10px] flex items-center gap-2" style={{ color: accent }}><Mail className="w-3 h-3" /> {session?.user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── STITCH OBSIDIAN: Facebook Post (3:2) ───────────────────────────────────
const FacebookPost = ({ fichaAvaluo, formatMXN, amenidades, session, palette = {} }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const heroImg = fichaAvaluo?.fotos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';
  const accent = palette?.accent || '#f59e0b';
  const banos = fichaAvaluo?.banos ?? '--';
  const terreno = fichaAvaluo?.terreno ? `${fichaAvaluo.terreno}m²` : '--';
  const construccion = fichaAvaluo?.construccion ? `${fichaAvaluo.construccion}m²` : '--';

  return (
    <div id="pv-ficha-root" className="bg-[#0D0D0D] relative overflow-hidden flex shadow-2xl" style={{ width: 1200, height: 800 }}>
      {/* Left: Image */}
      <div className="w-3/5 h-full relative">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0D0D0D]/40 to-[#0D0D0D]" />
        {/* Logo top-left */}
        <div className="absolute top-6 left-6">
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 36, maxWidth: 120, objectFit: 'contain' }} />
            : null}
        </div>
        {/* Badge top-right */}
        <div className="absolute top-6 right-6 text-black px-4 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-lg" style={{ background: accent }}>
          Nuevo Ingreso
        </div>
      </div>

      {/* Right: Info */}
      <div className="w-2/5 h-full p-8 flex flex-col justify-center bg-[#0D0D0D] z-10 border-l border-white/5">
        <h2 className="text-2xl font-black text-white leading-tight mb-2 uppercase">{dir}</h2>
        <p className="text-3xl font-black mb-6" style={{ color: accent }}>{precio}</p>

        <div className="space-y-4 mb-6">
          {(amenidades?.slice(0, 3) || []).map((am, i) => {
            const { label, Icon: Ic } = parseFeatureItem(am);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-white/5 border border-white/10"><Ic className="w-4 h-4 text-white/50" /></div>
                <span className="text-sm font-bold text-white/80">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Specs row: construccion + banos + terreno */}
        <div className="flex gap-6 mb-6 pt-4 border-t border-white/10">
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-widest">Construcción</p>
            <p className="text-sm font-bold text-white">{construccion}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-widest">Baños</p>
            <p className="text-sm font-bold text-white">{banos}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-widest">Terreno</p>
            <p className="text-sm font-bold text-white">{terreno}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 mt-auto">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Contacto Directo</p>
          <p className="text-sm font-bold text-white">{session?.user?.phone || 'Enviar MD'}</p>
        </div>
      </div>
    </div>
  );
};

// ── STITCH OBSIDIAN: TikTok/Reels (9:16) ───────────────────────────────────
const ReelsPost = ({ fichaAvaluo, formatMXN, session, palette = {} }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const heroImg = fichaAvaluo?.fotos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';
  const accent = palette?.accent || '#f59e0b';
  const recamaras = fichaAvaluo?.recamaras || '3';
  const banos = fichaAvaluo?.banos ?? '--';
  const terreno = fichaAvaluo?.terreno ? `${fichaAvaluo.terreno}m²` : '--';

  return (
    <div id="pv-ficha-root" className="bg-[#0D0D0D] relative overflow-hidden shadow-2xl flex flex-col" style={{ width: 1080, height: 1920 }}>
      {/* Top Image */}
      <div className="flex-1 relative overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-black/50" />

        {/* Logo top */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: 'contain' }} />
            : <span className="text-[18px] border border-white/30 px-6 py-2 text-white/70 uppercase tracking-widest">Exclusivo</span>}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-16">
          <p className="text-[18px] tracking-[0.2em] uppercase font-bold mb-4" style={{ color: accent }}>Propiedad de Lujo</p>
          <h2 className="text-6xl font-black text-white leading-tight mb-4">{dir}</h2>
          <p className="text-7xl font-black mb-12" style={{ color: accent }}>{precio}</p>

          {/* Stats grid: recamaras + banos + construccion + terreno */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Recámaras', value: recamaras, Icon: Bed },
              { label: 'Baños', value: banos, Icon: Bath },
              { label: 'Área', value: fichaAvaluo?.construccion ? `${fichaAvaluo.construccion}m²` : '—', Icon: Square },
              { label: 'Terreno', value: terreno, Icon: MapPin },
            ].map(({ label, value, Icon: Ic }, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
                <Ic className="w-8 h-8 mx-auto mb-2" style={{ color: accent }} />
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="text-[16px] text-white/50 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] text-white/50 uppercase tracking-widest">Asesor</p>
              <p className="text-2xl font-bold text-white">{session?.user?.name || 'Asesor Inmobiliario'}</p>
              <p className="text-[18px]" style={{ color: accent }}>{session?.user?.email}</p>
            </div>
            <div className="text-black px-10 py-6 font-black text-2xl uppercase tracking-widest" style={{ background: accent }}>
              Contáctame
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Componente Principal ───────────────────────────────────────────────────
const LayoutStitch = (props) => {
  const { formato, palette = {} } = props;
  if (formato === 'post' || formato === 'horizontal') return <FacebookPost {...props} palette={palette} />;
  if (formato === 'reels') return <ReelsPost {...props} palette={palette} />;
  return <FichaTecnica {...props} palette={palette} />;
};

export default LayoutStitch;
