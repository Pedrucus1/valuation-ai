import {
  Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, CheckCircle2,
  Bed, Bath, Square, MapPin, Phone, Mail, User
} from 'lucide-react';

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

export default function LayoutStitchAsymmetry({
  fichaAvaluo,
  session,
  formatMXN,
  amenidades = [],
  instalaciones = [],
  espacios = [],
  descripcionTexto,
  texts,
  idioma,
  palette = {},
  puntosDestacados = [],
}) {
  const fotos = fichaAvaluo?.fotos || [];
  const direccion = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const precio = fichaAvaluo?.valor
    ? formatMXN(fichaAvaluo.valor)
    : '$2,500,000';
  const recamaras = fichaAvaluo?.recamaras ?? fichaAvaluo?.cuartos ?? '--';
  const banos = fichaAvaluo?.banos ?? '--';
  const terreno = fichaAvaluo?.terreno ? `${fichaAvaluo.terreno} m²` : '--';
  const construccion = fichaAvaluo?.construccion ? `${fichaAvaluo.construccion} m²` : '--';
  const estacionamiento = fichaAvaluo?.estacionamiento ?? fichaAvaluo?.cajones ?? '--';
  const ubicacion = fichaAvaluo?.colonia ?? fichaAvaluo?.municipio ?? '--';
  const asesor = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Asesor';
  const email = session?.user?.email ?? '';
  const telefono = session?.user?.phone ?? '';

  const descripcion =
    descripcionTexto ||
    'Una propuesta arquitectónica sin concesiones que fusiona precisión tectónica con la fluidez natural del entorno. Grandes volúmenes se abren sin fricción al horizonte, donde la alberca infinita actúa como extensión visual del paisaje. Cada detalle ha sido curado para eliminar el ruido visual y elevar la experiencia de habitar.';

  const heroImg = fotos[0] ?? null;

  // Asymmetry gallery: 2 large + 4 small (2×2)
  const bigImgs = fotos.slice(0, 2);
  const smallImgs = fotos.slice(2, 6);
  while (bigImgs.length < 2) bigImgs.push(null);
  while (smallImgs.length < 4) smallImgs.push(null);

  const serif = 'Playfair Display, Georgia, serif';
  const accent = palette?.accent || '#775a19';

  return (
    <div
      id="pv-ficha-root"
      className="bg-white shadow-2xl overflow-hidden flex flex-col border border-gray-300 relative font-sans"
      style={{ width: 794, height: 1123, padding: '0.6in', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header className="flex justify-between items-baseline border-b border-gray-300 pb-5 mb-6">
        <div>
          <h1
            className="text-[36px] tracking-tight leading-none font-bold uppercase text-black"
            style={{ fontFamily: serif }}
          >
            {direccion}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 uppercase tracking-widest">
            <MapPin size={14} />
            {ubicacion}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height:32, maxWidth:100, objectFit:'contain' }} />
            : <span style={{ fontSize:11, fontWeight:700, color:'#aaa', letterSpacing:'0.1em' }}>LOGO</span>}
        </div>
      </header>

      {/* Hero Image */}
      <section className="mb-6">
        <div className="w-full overflow-hidden" style={{ height: '240px' }}>
          {heroImg ? (
            <img
              alt="Vista principal"
              className="w-full h-full object-cover"
              src={heroImg}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs uppercase tracking-widest">Sin fotografía</span>
            </div>
          )}
        </div>
      </section>

      {/* Asymmetric: Narrative (8 cols) | Specs (4 cols) */}
      <section className="grid gap-8 mb-6 items-start" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Left: Narrative (wider) */}
        <div className="border-r border-gray-300 pr-8">
          <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
            Descripción
          </h2>
          <p
            className="text-[16px] text-gray-900 leading-relaxed italic border-l-4 pl-6 py-1 mb-4"
            style={{ borderColor: accent }}
          >
            {descripcion.split('. ')[0]}.
          </p>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            {descripcion.split('. ').slice(1).join('. ')}
          </p>

          {/* Puntos Destacados */}
          {puntosDestacados?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12, marginTop:12 }}>
              {puntosDestacados.slice(0,4).map((p,i) => (
                <span key={i} style={{
                  padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:600,
                  background: p.verificado ? (accent)+'15' : '#f8f8f8',
                  border: `1px solid ${p.verificado ? (accent)+'50' : '#ddd'}`,
                  color: p.verificado ? '#1a1a1a' : '#555',
                  display:'flex', alignItems:'center', gap:4
                }}>
                  {p.verificado && <span style={{ color: accent, fontWeight:900 }}>✓</span>}
                  {p.texto}
                </span>
              ))}
            </div>
          )}

          {/* Amenidades */}
          {amenidades?.length > 0 && (
            <section style={{ marginBottom:16, marginTop: puntosDestacados?.length > 0 ? 0 : 12 }}>
              <h2 style={{ fontSize:10, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:8 }}>Amenidades</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'6px 12px' }}>
                {amenidades.slice(0,6).map((a,i) => {
                  const { label, Icon } = parseFeatureItem(a);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                      <Icon size={12} style={{ color: accent, flexShrink:0 }} />
                      <span style={{ color:'#555' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: Specs (compact sidebar) */}
        <div className="space-y-4">
          <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">
            Especificaciones
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[11px] uppercase text-gray-700 font-medium">Precio</span>
              <span
                className="text-[20px] font-semibold"
                style={{ color: accent, fontFamily: serif }}
              >
                {precio}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[11px] uppercase text-gray-700 font-medium">Construcción</span>
              <span className="text-sm font-bold text-gray-800">{construccion}</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[11px] uppercase text-gray-700 font-medium">Terreno</span>
              <span className="text-sm font-bold text-gray-800">{terreno}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Bed size={16} className="text-black" />
                <span className="text-[13px] font-bold text-gray-800">{recamaras}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath size={16} className="text-black" />
                <span className="text-[13px] font-bold text-gray-800">{banos}</span>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-2">
              <Car size={16} className="text-black" />
              <span className="text-[13px] font-bold uppercase text-gray-800">{estacionamiento} cajones</span>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Gallery: 2 large + 2×2 small */}
      <section className="flex-grow">
        <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
          Perspectivas
        </h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {/* Large featured (col 1 & 2) */}
          {bigImgs.map((src, i) => (
            <div key={i} className="aspect-square bg-gray-200 overflow-hidden">
              {src ? (
                <img
                  alt={`Destacada ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  src={src}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Square size={24} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {/* Col 3: 2×2 grid of small images */}
          <div className="grid grid-cols-2 gap-3">
            {smallImgs.map((src, i) => (
              <div key={i} className="aspect-square bg-gray-200 overflow-hidden">
                {src ? (
                  <img
                    alt={`Interior ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    src={src}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Square size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-6 pt-6 border-t border-gray-300 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
            {session?.user?.photoURL
              ? <img src={session.user.photoURL} alt={asesor} className="w-full h-full object-cover" />
              : <User size={28} className="text-gray-400" />}
          </div>
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">{asesor}</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Asesor Inmobiliario</p>
            {(telefono || email) && (
              <p className="text-[11px] text-black mt-0.5">
                {telefono}{telefono && email ? ' | ' : ''}{email}
              </p>
            )}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:12, height:12, borderRadius:3, background: accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontWeight:900, fontSize:7 }}>P</span>
            </div>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#aaa' }}>propvalu.mx</span>
          </div>
          <p style={{ fontSize:9, color:'#aaa' }}>© {new Date().getFullYear()} {asesor.toUpperCase()}</p>
        </div>
      </footer>
    </div>
  );
}
