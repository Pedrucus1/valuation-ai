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
const FichaTecnica = ({ fichaAvaluo, session, formatMXN, amenidades, instalaciones, espacios, texts, idioma, descripcionTexto }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  
  // Usar las fotos que existan, fallbacks si no hay
  const fotos = fichaAvaluo?.fotos || [];
  const heroImg = fotos[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';
  
  return (
    <div id="pv-ficha-root" className="w-[794px] mx-auto grid grid-cols-1 gap-10 font-sans tracking-tight">
      
      {/* ── HOJA 1 ── */}
      <div className="w-full aspect-[1/1.414] bg-[#0D0D0D] text-white flex flex-col overflow-hidden shadow-2xl relative">
        {/* Hero Image - Reducida opacidad del overlay a 50% para que se vea mejor */}
        <div className="h-[60%] relative overflow-hidden">
          <img src={heroImg} alt={dir} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent" />
          <div className="absolute inset-0 bg-[#0D0D0D]/10" />
          <div className="absolute bottom-10 left-10 right-10">
            <h1 className="text-4xl font-black mb-2 leading-tight uppercase tracking-widest text-white drop-shadow-lg">{dir}</h1>
            <p className="text-3xl font-black text-amber-400 drop-shadow-md">{precio}</p>
          </div>
          {/* Logo Badge */}
          <div className="absolute top-10 right-10 bg-[#0D0D0D]/80 backdrop-blur-md px-6 py-3 border border-white/10 shadow-xl">
            <span className="text-xs tracking-[0.3em] font-bold text-amber-400">OBSIDIAN</span>
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
              <stat.Icon className="w-4 h-4 text-amber-400 mb-1.5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-white/50 uppercase tracking-widest">{stat.label}</span>
              <span className="text-sm font-bold text-white mt-0.5">{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Highlight Features */}
        <div className="flex-1 p-10 flex flex-col justify-center bg-[#0D0D0D]">
          <div className="grid grid-cols-2 gap-8 h-full">
            <div className="flex flex-col justify-center border-l-2 border-amber-400 pl-6 h-full">
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">{idioma === 'es' ? 'Valoración' : 'Valuation'}</h3>
              <p className="text-5xl font-black text-white leading-none mb-3">A+</p>
              <p className="text-xs text-amber-400 uppercase tracking-widest font-bold">Premium Tier</p>
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-5">{idioma === 'es' ? 'Highlights' : 'Highlights'}</h3>
              <ul className="space-y-4">
                {(amenidades?.slice(0, 3) || []).map((am, i) => {
                  const { label, Icon: Ic } = parseFeatureItem(am);
                  return (
                    <li key={i} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-full border border-amber-400/30 flex items-center justify-center bg-amber-400/5 group-hover:bg-amber-400/20 transition-colors">
                        <Ic className="w-3.5 h-3.5 text-amber-400" />
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

      {/* ── HOJA 2 ── */}
      <div className="w-full aspect-[1/1.414] bg-[#0D0D0D] text-white flex flex-col overflow-hidden shadow-2xl">
        <div className="flex-1 flex flex-col p-10 gap-6 min-h-0 overflow-hidden">

          {/* Descripción */}
          {descripcionTexto && (
            <div>
              <h3 className="text-[9px] tracking-[0.3em] uppercase text-amber-400 font-bold mb-2 flex items-center gap-3">
                <span className="flex-1 h-px bg-white/10" />
                {idioma === 'es' ? 'Descripción' : 'Description'}
                <span className="flex-1 h-px bg-white/10" />
              </h3>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-4">{descripcionTexto}</p>
            </div>
          )}

          {/* Amenidades con íconos */}
          <div>
            <h3 className="text-[9px] tracking-[0.3em] uppercase text-amber-400 font-bold mb-3 flex items-center gap-3">
              <span className="flex-1 h-px bg-white/10" />
              {idioma === 'es' ? 'Amenidades de Lujo' : 'Luxury Amenities'}
              <span className="flex-1 h-px bg-white/10" />
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(amenidades?.length ? amenidades : ['Alberca privada', 'Seguridad 24/7', 'Casa Club', 'Gimnasio']).map((am, i) => {
                const { label, qty, Icon: Ic } = parseFeatureItem(am);
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <div className="p-1 rounded-full bg-amber-400/10 shrink-0">
                      <Ic className="w-3 h-3 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/80 capitalize block leading-tight">{label}</span>
                      {qty && <span className="text-[9px] font-bold text-amber-400">{qty}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instalaciones + Espacios */}
          <div className="flex gap-8">
            <div className="flex-1">
              <h3 className="text-[9px] tracking-[0.3em] uppercase text-amber-400 font-bold mb-2">{idioma === 'es' ? 'Instalaciones' : 'Installations'}</h3>
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
              <h3 className="text-[9px] tracking-[0.3em] uppercase text-amber-400 font-bold mb-2">{idioma === 'es' ? 'Espacios' : 'Spaces'}</h3>
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
            <h3 className="text-[9px] tracking-[0.3em] uppercase text-amber-400 font-bold mb-2 flex items-center gap-3">
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
            <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400/50 flex items-center justify-center overflow-hidden">
              <User className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[9px] text-white/50 uppercase tracking-[0.2em]">{texts.asesor}</p>
              <p className="text-sm font-bold text-white">{session?.user?.name || 'Asesor Inmobiliario'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <p className="text-[10px] text-amber-400 flex items-center gap-2"><Phone className="w-3 h-3" /> {session?.user?.phone || '+52 123 456 7890'}</p>
            <p className="text-[10px] text-amber-400 flex items-center gap-2"><Mail className="w-3 h-3" /> {session?.user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── STITCH OBSIDIAN: Facebook Post (3:2) ───────────────────────────────────
const FacebookPost = ({ fichaAvaluo, formatMXN, amenidades, session }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const heroImg = fichaAvaluo?.fotos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';
  
  return (
    <div id="pv-ficha-root" className="w-[800px] aspect-[3/2] bg-[#0D0D0D] relative overflow-hidden flex shadow-2xl">
      {/* Left: Image */}
      <div className="w-3/5 h-full relative">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0D0D0D]/40 to-[#0D0D0D]" />
        {/* Badge */}
        <div className="absolute top-6 left-6 bg-amber-400 text-black px-4 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-lg">
          Nuevo Ingreso
        </div>
      </div>
      
      {/* Right: Info */}
      <div className="w-2/5 h-full p-8 flex flex-col justify-center bg-[#0D0D0D] z-10 border-l border-white/5">
        <h2 className="text-2xl font-black text-white leading-tight mb-2 uppercase">{dir}</h2>
        <p className="text-3xl font-black text-amber-400 mb-6">{precio}</p>
        
        <div className="space-y-4 mb-8">
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

        <div className="pt-6 border-t border-white/10 mt-auto">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Contacto Directo</p>
          <p className="text-sm font-bold text-white">{session?.user?.phone || 'Enviar MD'}</p>
        </div>
      </div>
    </div>
  );
};

// ── STITCH OBSIDIAN: TikTok/Reels (9:16) ───────────────────────────────────
const ReelsPost = ({ fichaAvaluo, formatMXN, session }) => {
  const precio = fichaAvaluo?.valor ? formatMXN(fichaAvaluo.valor) : '$2,500,000';
  const dir = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const heroImg = fichaAvaluo?.fotos?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200';
  const recamaras = fichaAvaluo?.recamaras || '3';
  
  return (
    <div id="pv-ficha-root" className="w-[400px] aspect-[9/16] bg-[#0D0D0D] relative overflow-hidden shadow-2xl flex flex-col">
      {/* Top Image */}
      <div className="flex-1 relative overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-black/50" />
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <span className="text-[9px] border border-white/30 px-3 py-1 text-white/70 uppercase tracking-widest">Exclusivo</span>
        </div>

        {/* Bottom */}
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-amber-400 mb-2">Propiedad de Lujo</p>
          <h2 className="text-3xl font-black text-white leading-tight mb-2">{dir}</h2>
          <p className="text-4xl font-black text-amber-400 mb-6">{precio}</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Recámaras', value: recamaras, Icon: Bed },
              { label: 'Baños', value: fichaAvaluo?.banos || '—', Icon: Bath },
              { label: 'Área', value: fichaAvaluo?.construccion ? `${fichaAvaluo.construccion}m²` : '—', Icon: Square },
            ].map(({ label, value, Icon: Ic }, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                <Ic className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[8px] text-white/50 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Asesor</p>
              <p className="text-sm font-bold text-white">{session?.user?.name || 'Asesor Inmobiliario'}</p>
              <p className="text-[10px] text-amber-400">{session?.user?.email}</p>
            </div>
            <div className="bg-amber-400 text-black px-5 py-3 font-black text-sm uppercase tracking-widest">
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
  const { formato } = props;
  if (formato === 'post' || formato === 'horizontal') return <FacebookPost {...props} />;
  if (formato === 'reels') return <ReelsPost {...props} />;
  return <FichaTecnica {...props} />;
};

export default LayoutStitch;
