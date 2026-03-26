import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Building2, ArrowLeft, ArrowRight, Check, Building, FileText,
  Briefcase, Mail, Phone, Lock, Eye, EyeOff, User, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API } from "@/App";

/* ─── Generador de declaración de responsabilidad ─── */
const downloadDeclaration = (data) => {
  const date = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Declaración de Responsabilidad Civil — PropValu</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 750px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; font-size: 13px; }
  .logo { font-size: 22px; font-weight: bold; color: #1B4332; margin-bottom: 6px; }
  .logo span { color: #52B788; }
  .subtitle { color: #52B788; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  h1 { color: #1B4332; font-size: 18px; border-bottom: 2px solid #52B788; padding-bottom: 10px; margin-top: 0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; background: #f5f9f7; padding: 14px 16px; border-radius: 8px; margin: 16px 0 24px; }
  .info-row { font-size: 12px; }
  .info-row strong { color: #1B4332; display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  h2 { font-size: 14px; color: #1B4332; margin-top: 24px; margin-bottom: 10px; }
  .clause { border-left: 3px solid #52B788; padding: 10px 14px; margin: 10px 0; background: #fafafa; font-size: 12.5px; }
  .clause strong { color: #1B4332; }
  .signature-box { margin-top: 36px; border-top: 1px solid #ccc; padding-top: 20px; }
  .stamp { border: 2px solid #1B4332; display: inline-block; padding: 10px 20px; color: #1B4332; font-size: 11px; margin-top: 14px; border-radius: 4px; background: #f5f9f7; }
  .stamp strong { display: block; font-size: 13px; color: #1B4332; margin-bottom: 4px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="logo">Prop<span>Valu</span></div>
<div class="subtitle">Portal de Anunciantes</div>
<h1>Declaración de Responsabilidad Civil, Moral y Penal del Anunciante</h1>

<div class="info-grid">
  <div class="info-row"><strong>Empresa / Marca</strong>${data.company_name}</div>
  <div class="info-row"><strong>RFC</strong>${data.rfc}</div>
  <div class="info-row"><strong>Representante Legal</strong>${data.contact_name}</div>
  <div class="info-row"><strong>Correo electrónico</strong>${data.email}</div>
  <div class="info-row"><strong>Giro / Industria</strong>${data.giro}</div>
  <div class="info-row"><strong>Fecha de aceptación</strong>${date}</div>
</div>

<h2>Cláusulas de Responsabilidad</h2>

<div class="clause">
  <strong>I. Responsabilidad exclusiva sobre el contenido publicitario.</strong>
  El Anunciante declara y acepta que es el único y exclusivo responsable del contenido de todos los
  anuncios, creatividades, mensajes, imágenes, videos y cualquier material publicitario que publique
  a través de la plataforma PropValu. PropValu actúa únicamente como intermediario tecnológico y no
  tiene injerencia, responsabilidad civil, moral ni penal sobre el contenido de los anuncios.
</div>

<div class="clause">
  <strong>II. Responsabilidad civil.</strong>
  El Anunciante responderá civil y patrimonialmente ante cualquier daño o perjuicio causado a
  terceros derivado del contenido de sus anuncios, incluyendo pero no limitándose a: engaño al
  consumidor, incumplimiento de ofertas, publicidad comparativa ilícita o daño a la reputación.
</div>

<div class="clause">
  <strong>III. Responsabilidad moral.</strong>
  El Anunciante garantiza que sus anuncios no afectan el honor, dignidad, reputación o imagen de
  personas físicas o morales. Cualquier reclamo por daño moral derivado del contenido publicitario
  será de exclusiva responsabilidad del Anunciante.
</div>

<div class="clause">
  <strong>IV. Responsabilidad penal.</strong>
  Si el contenido de algún anuncio constituye un delito conforme a las leyes mexicanas (fraude,
  engaño al consumidor, difamación, pornografía, incitación al odio, entre otros), el Anunciante
  será el único sujeto a proceso penal ante las autoridades competentes. PropValu colaborará con
  las autoridades en la medida que la ley lo requiera.
</div>

<div class="clause">
  <strong>V. Exoneración total de PropValu.</strong>
  PropValu, sus directivos, empleados, accionistas y representantes legales quedan expresamente
  exonerados de cualquier responsabilidad civil, mercantil, administrativa o penal que derive del
  contenido de los anuncios publicados por el Anunciante. El Anunciante acepta indemnizar y mantener
  indemne a PropValu ante cualquier reclamación de terceros.
</div>

<div class="clause">
  <strong>VI. Contenido prohibido.</strong>
  El Anunciante declara que sus anuncios no contendrán material ilícito, pornográfico, violento ni
  discriminatorio; publicidad de productos prohibidos por ley; información que viole la privacidad
  de personas; ni contenido que vulnere derechos fundamentales de terceros.
</div>

<div class="clause">
  <strong>VII. Cumplimiento legal.</strong>
  El Anunciante se obliga a cumplir con la Ley Federal de Protección al Consumidor (PROFECO), Ley
  Federal de Competencia Económica, Ley Federal del Derecho de Autor, normativas del SAT y toda
  legislación aplicable a su actividad publicitaria en México.
</div>

<div class="clause">
  <strong>VIII. Política de no devoluciones.</strong>
  El Anunciante acepta la política de no devoluciones de PropValu. Los pagos realizados por campañas
  publicitarias son finales e irrevocables bajo ninguna circunstancia, incluyendo campañas rechazadas
  por incumplimiento de estas políticas.
</div>

<div class="signature-box">
  <p style="font-size:12px; color:#555;">
    Al haber completado el proceso de registro en la plataforma PropValu y marcado la casilla de
    aceptación, el Anunciante declara haber leído, comprendido y aceptado íntegramente el presente
    documento, así como los Términos y Condiciones para Anunciantes y la Política de Privacidad de
    PropValu. Esta aceptación electrónica tiene plena validez conforme al Código de Comercio
    mexicano (Art. 89-94) en materia de comercio electrónico.
  </p>
  <div class="stamp">
    <strong>✓ Aceptado electrónicamente</strong>
    Fecha: ${date}<br>
    Empresa: ${data.company_name}<br>
    RFC: ${data.rfc}<br>
    Representante: ${data.contact_name}
  </div>
  <p style="font-size:10px; color:#888; margin-top:20px;">
    Documento generado automáticamente por PropValu · propvalu.mx · Folio: PV-AD-${Date.now()}
  </p>
</div>
</body>
</html>`;

  // Abre el documento en ventana nueva y dispara el diálogo de impresión
  // El usuario elige "Guardar como PDF" desde el diálogo nativo del navegador.
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      win.focus();
      win.print();
      // Liberar memoria después de que el diálogo se abra
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
  } else {
    // Fallback si el navegador bloquea popups: descarga como HTML
    const a = document.createElement("a");
    a.href = url;
    a.download = `PropValu_Declaracion_${data.rfc}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};

/* ─── Data ─────────────────────────────────────────────── */

const GIROS = [
  // Valuación y peritaje
  "Valuador inmobiliario independiente",
  "Despacho de valuación inmobiliaria",
  "Perito responsable de obra",
  "Perito judicial inmobiliario",
  // Inmobiliario y desarrollo
  "Inmobiliaria / Agencia de bienes raíces",
  "Desarrolladora inmobiliaria",
  "Constructora",
  "Arquitectura y diseño",
  "Administración de propiedades / Property Management",
  // Financiero y legal
  "Banco / Institución financiera",
  "Sofol / Sofom hipotecaria",
  "Notaría / Servicios jurídicos",
  "Gestoría y trámites legales",
  // Servicios relacionados
  "Decoración y diseño de interiores",
  "Remodelación y acabados",
  "Servicios de mudanza y logística",
  "Fotografía y video inmobiliario",
  "Home staging",
  "Paisajismo y jardinería",
  // Seguros y tecnología
  "Seguros de inmueble",
  "Tecnología / PropTech",
  // Otros
  "Gobierno / Municipal",
  "Comercio minorista",
  "Otra",
];

const REGIMENES = [
  "Persona Moral — Régimen General de Ley",
  "Persona Física con Actividad Empresarial y Profesional",
  "Régimen Simplificado de Confianza (RESICO)",
  "Régimen de Incorporación Fiscal (RIF)",
  "Régimen de Arrendamiento",
  "Sin obligaciones fiscales (S01)",
];

const USOS_CFDI = [
  "G01 — Adquisición de mercancías",
  "G02 — Devoluciones, descuentos o bonificaciones",
  "G03 — Gastos en general (publicidad, servicios, etc.)",
  "I01 — Construcciones",
  "I03 — Equipo de transporte",
  "I04 — Equipo de cómputo y accesorios",
  "I06 — Comunicaciones telefónicas y digitales",
  "I08 — Otra maquinaria y equipo",
  "D10 — Pagos por servicios educativos",
  "P01 — Por definir",
  "S01 — Sin efectos fiscales (persona moral sin fines lucrativos)",
];

/* ─── Component ─────────────────────────────────────────── */

const AdvertiserRegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultTab = location.state?.tab || "register";

  const [tab, setTab] = useState(defaultTab); // "login" | "register"
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/advertisers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginData.email, password: loginData.password }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "Correo o contraseña incorrectos");
        return;
      }
      const session = await res.json();
      localStorage.setItem("advertiser_session", JSON.stringify(session));
      toast.success(`Bienvenido, ${session.contact_name}`);
      navigate("/anunciantes/consola");
    } catch (err) {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const [data, setData] = useState({
    // Step 1 — Empresa
    company_name: "",
    rfc: "",
    giro: "",
    regimen: "",
    uso_cfdi: "",
    // Step 2 — Contacto
    contact_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    accept_terms: false,
  });

  const set = (field, value) => setData(p => ({ ...p, [field]: value }));

  /* ── Validations ── */
  const validateStep1 = () => {
    if (!data.company_name.trim()) {
      toast.error("Ingresa el nombre de la empresa o marca");
      return false;
    }
    if (!data.rfc.trim() || data.rfc.length < 12) {
      toast.error("El RFC debe tener al menos 12 caracteres");
      return false;
    }
    if (!data.giro) {
      toast.error("Selecciona el giro o industria");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.contact_name.trim()) { toast.error("Ingresa el nombre del representante"); return; }
    if (!data.email.trim()) { toast.error("Ingresa el correo electrónico"); return; }
    if (!data.phone.trim()) { toast.error("Ingresa el teléfono de contacto"); return; }
    if (data.password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (data.password !== data.confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    if (!data.accept_terms) { toast.error("Debes aceptar los términos y condiciones"); return; }

    setIsLoading(true);
    try {
      const res = await fetch(`${API}/advertisers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: data.company_name,
          contact_name: data.contact_name,
          email: data.email,
          phone: data.phone,
          rfc: data.rfc,
          giro: data.giro,
          regimen_fiscal: data.regimen_fiscal,
          uso_cfdi: data.uso_cfdi,
          password: data.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "Error al crear la cuenta");
        return;
      }
      const session = await res.json();
      localStorage.setItem("advertiser_session", JSON.stringify(session));
      downloadDeclaration(data);
      toast.success("Cuenta creada. Descargando tu declaración de responsabilidad...");
      navigate("/anunciantes/consola");
    } catch (err) {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-4 sm:py-8">
      <div className="w-full max-w-lg">

        {/* Logo + step indicator en una sola fila */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/anunciantes")}
          >
            <Building2 className="w-6 h-6 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
            <span className="text-slate-300 mx-1 hidden sm:block">|</span>
            <span className="text-xs font-medium text-slate-400 hidden sm:block">Anunciantes</span>
          </div>

          {tab === "register" && (
            <div className="flex items-center gap-2">
              {[{ id: 1, label: "Empresa" }, { id: 2, label: "Contacto" }].map((s, i, arr) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s.id ? "bg-[#52B788] text-white" : step === s.id ? "bg-[#1B4332] text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${step === s.id ? "text-[#1B4332]" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                  {i < arr.length - 1 && (
                    <div className={`w-6 h-0.5 mx-0.5 transition-all ${step > s.id ? "bg-[#52B788]" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {[
              { key: "login", label: "Iniciar sesión" },
              { key: "register", label: "Crear cuenta" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setStep(1); }}
                className={`flex-1 py-3 text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "text-[#1B4332] border-b-2 border-[#1B4332] bg-[#D9ED92]/40"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">

          {/* ── Login ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-0.5">Bienvenido</h2>
                <p className="text-xs text-slate-500">Accede a tu consola de anunciante.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1B4332]">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email" required placeholder="contacto@empresa.com"
                    className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                    value={loginData.email}
                    onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1B4332]">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"} required placeholder="••••••••"
                    className="pl-10 pr-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                    value={loginData.password}
                    onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}
                className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold h-9 text-sm">
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>

              <p className="text-center text-xs text-slate-500">
                ¿Sin cuenta?{" "}
                <button type="button" onClick={() => setTab("register")} className="text-[#52B788] font-semibold hover:underline">
                  Regístrate aquí
                </button>
              </p>
            </form>
          )}

          {/* ── Step 1: Datos empresa ── */}
          {tab === "register" && step === 1 && (
            <div className="space-y-3">
              <div>
                <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-0.5">Datos de la empresa</h2>
                <p className="text-xs text-slate-500">Para facturación y verificación fiscal.</p>
              </div>

              {/* Nombre + RFC en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">Empresa o marca *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Inmobiliaria XYZ S.A."
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={data.company_name} onChange={e => set("company_name", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">RFC *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="XYZ123456ABC"
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white uppercase"
                      value={data.rfc} maxLength={13}
                      onChange={e => set("rfc", e.target.value.toUpperCase())} />
                  </div>
                </div>
              </div>

              {/* Giro */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1B4332]">Giro / Industria *</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                  <select
                    className="w-full h-9 pl-10 pr-4 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
                    value={data.giro} onChange={e => set("giro", e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {GIROS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Régimen + CFDI en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">
                    Régimen fiscal <span className="text-slate-400 font-normal">(opcional)</span>
                  </Label>
                  <select
                    className="w-full h-9 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
                    value={data.regimen} onChange={e => set("regimen", e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">
                    Uso CFDI <span className="text-slate-400 font-normal">(opcional)</span>
                  </Label>
                  <select
                    className="w-full h-9 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
                    value={data.uso_cfdi} onChange={e => set("uso_cfdi", e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {USOS_CFDI.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <Button onClick={handleNext}
                className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold h-9 text-sm">
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Contacto y acceso ── */}
          {tab === "register" && step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-0.5">Datos de contacto</h2>
                <p className="text-xs text-slate-500">Credenciales de acceso a tu consola.</p>
              </div>

              {/* Nombre + Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">Representante *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input required placeholder="Nombre completo"
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={data.contact_name} onChange={e => set("contact_name", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">Teléfono *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="tel" required placeholder="33 1234 5678"
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={data.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Correo */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#1B4332]">Correo electrónico *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="email" required placeholder="contacto@empresa.com"
                    className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                    value={data.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">Contraseña *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showPassword ? "text" : "password"} required placeholder="••••••••"
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={data.password} onChange={e => set("password", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#1B4332]">Confirmar *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showPassword ? "text" : "password"} required placeholder="••••••••"
                      className="pl-10 h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={data.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between -mt-1">
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
                <span className="text-xs text-slate-400">Mínimo 8 caracteres</span>
              </div>

              {/* Términos */}
              <div className="flex items-start gap-2">
                <input type="checkbox" id="terms" className="mt-0.5 accent-[#52B788] w-4 h-4 flex-shrink-0"
                  checked={data.accept_terms} onChange={e => set("accept_terms", e.target.checked)} />
                <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed">
                  Acepto los{" "}
                  <span className="text-[#52B788] font-semibold cursor-pointer hover:underline"
                    onClick={() => window.open("/terminos-anunciantes", "_blank")}>
                    Términos para Anunciantes
                  </span>
                  {" "}(declaración de responsabilidad y política de no devoluciones) y la{" "}
                  <span className="text-[#52B788] font-semibold cursor-pointer hover:underline"
                    onClick={() => window.open("/privacidad", "_blank")}>
                    Política de Privacidad
                  </span>.
                </label>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-700 flex items-center gap-2">
                <Download className="w-4 h-4 flex-shrink-0" />
                Al registrarte se abrirá tu <strong className="mx-1">Declaración de Responsabilidad Civil</strong> — guárdala como PDF desde el diálogo de impresión.
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 h-9 text-sm">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
                <Button type="submit" disabled={isLoading}
                  className="flex-1 bg-[#52B788] hover:bg-[#40916C] text-white font-semibold h-9 text-sm">
                  {isLoading ? "Creando..." : "Crear cuenta"}
                </Button>
              </div>
            </form>
          )}

          </div>{/* end p-5 */}
        </div>{/* end card */}

        <p className="text-center text-xs text-slate-400 mt-3">
          <button onClick={() => navigate("/anunciantes")} className="text-slate-500 hover:underline">
            Ver tarifas y formatos
          </button>
        </p>
      </div>
    </div>
  );
};

export default AdvertiserRegisterPage;
