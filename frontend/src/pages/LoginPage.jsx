import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Building2, Eye, EyeOff, User, Mail, Lock, Phone, Briefcase,
  ArrowLeft, ArrowRight, Check, Upload, X, MapPin, FileText,
  CheckSquare, Square, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API } from "@/App";

/* ─── Static data ───────────────────────────────────────── */

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const SERVICIOS_VALUADOR = [
  { key: "infonavit",       label: "Infonavit" },
  { key: "fovissste",       label: "Fovissste" },
  { key: "comerciales",     label: "Comerciales" },
  { key: "catastrales",     label: "Catastrales" },
  { key: "opinion_valor",   label: "Opinión de valor" },
  { key: "avaluo_mejora",   label: "Avalúo de mejora" },
  { key: "inspeccion",      label: "Inspección de vivienda" },
  { key: "peritajes",       label: "Peritajes" },
  { key: "tramites",        label: "Trámites estatales o municipales" },
  { key: "obras_publicas",  label: "Obras públicas y catastro" },
  { key: "otros",           label: "Otros" },
];

const PERITAJES_TIPOS = [
  "Estructural",
  "Peritaje de obra",
  "Daños (incendio, inundación, sismo)",
  "Remate hipotecario",
  "Legal / Judicial",
  "Valuación de activos",
  "Siniestros",
];

// Empresas registradas como Titular (mock — en producción vendrá del backend)
const EMPRESAS_AFILIADAS = [
  "Inmobiliaria Guadalajara S.A.",
  "Propiedades del Bajío",
  "Century 21 GDL Norte",
];

/* ─── Helpers ───────────────────────────────────────────── */

const FileUploadField = ({ label, hint, accept = ".pdf,.jpg,.jpeg,.png", value, onChange, required }) => {
  const inputRef = useRef(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-[#1B4332]">
        {label}{required && " *"}
      </Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div
        className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${
          value ? "border-[#52B788] bg-[#D9ED92]/10" : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <CheckSquare className="w-4 h-4 text-[#52B788] shrink-0" />
            <span className="text-sm text-[#1B4332] font-medium truncate flex-1">{value.name}</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null); }}
              className="text-slate-400 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-400">Seleccionar archivo…</span>
          </>
        )}
      </div>
      <p className="text-xs text-slate-300">PDF, JPG o PNG · máx. 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => onChange(e.target.files[0] || null)}
      />
    </div>
  );
};

/* ─── Component ─────────────────────────────────────────── */

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultTab  = location.state?.tab  || "login";
  const defaultRole = location.state?.role || "appraiser";

  const [tab, setTab]               = useState(defaultTab);
  const [regStep, setRegStep]       = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);

  /* ── Login state ── */
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  /* ── Register state ── */
  const [regData, setRegData] = useState({
    // Paso 1
    role: defaultRole,
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    company_name: "",

    // Modo de participación (aplica a valuador e inmobiliaria)
    modo_perfil: "",  // "basico" | "completo"

    // Paso 2 Valuador
    services: {
      infonavit: false, fovissste: false, comerciales: false,
      catastrales: false, opinion_valor: false, avaluo_mejora: false,
      inspeccion: false, peritajes: false, tramites: false,
      obras_publicas: false, otros: false,
    },
    peritajes_tipos: [],
    peritajes_otros: "",
    servicios_otros_lista: [""],
    estado: "",
    municipios: [""],

    // Cuestionario perfil completo
    q_experiencia: "",
    q_equipo: "",           // "solo" | "1-3" | "4-10" | "10+"
    q_oficina: false,
    q_dir_oficina: "",
    q_maps_url: "",
    q_tiempo_entrega: "",
    q_seguro_rc: false,
    q_unidad_valuacion: "",
    q_software: "",
    q_idiomas: "",

    // Paso 2 Inmobiliaria
    inmobiliaria_tipo: "",   // "titular" | "asesor"
    asociacion: "",
    cursos_inmobiliarios: "",
    num_asesores: "",
    empresa_afiliada: "",
    aceptaTerminos: false,
  });

  const [files, setFiles] = useState({
    ine_frente: null,
    ine_vuelta: null,
    cedula: null,
    foto_profesional: null,
    // Básico adicional
    firma_autografa: null,
    comprobante_experiencia: null,
    comprobante_adicional: null,
    // Condicionales por servicio
    carta_unidad: null,
    comprobante_catastro: null,
    // Perfil completo
    comprobante_domicilio: null,
    carta_recomendacion: null,
    curriculum: null,
    avaluo_muestra_1: null,
    avaluo_muestra_2: null,
    avaluo_muestra_3: null,
    // Inmobiliaria
    cert_asociacion: null,
    credencial_empresa: null,
    cert_curso_inmobiliario: null,
  });

  const setReg = (k, v) => setRegData(p => ({ ...p, [k]: v }));
  const setFile = (k, v) => setFiles(p => ({ ...p, [k]: v }));

  const toggleService = (key) =>
    setRegData(p => ({ ...p, services: { ...p.services, [key]: !p.services[key] } }));

  const togglePeritajeTipo = (tipo) =>
    setRegData(p => ({
      ...p,
      peritajes_tipos: p.peritajes_tipos.includes(tipo)
        ? p.peritajes_tipos.filter(t => t !== tipo)
        : [...p.peritajes_tipos, tipo],
    }));

  /* ── Step counts ── */
  const STEPS = regData.role === "appraiser"
    ? ["Datos básicos", "Modo y servicios", "Documentos"]
    : ["Datos básicos", "Modo y perfil", "Documentos"];

  /* ── Validations per step ── */
  const validateStep = (step) => {
    if (step === 1) {
      if (!regData.role)            { toast.error("Selecciona si eres Valuador o Inmobiliaria"); return false; }
      if (!regData.name.trim())     { toast.error("Ingresa tu nombre completo"); return false; }
      if (regData.role === "realtor" && !regData.company_name.trim()) { toast.error("Ingresa el nombre de la empresa"); return false; }
      if (!regData.email.trim())    { toast.error("Ingresa tu correo electrónico"); return false; }
      if (!regData.phone.trim())    { toast.error("Ingresa tu teléfono"); return false; }
      if (regData.password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return false; }
      if (regData.password !== regData.confirmPassword) { toast.error("Las contraseñas no coinciden"); return false; }
      return true;
    }
    if (step === 2) {
      if (!regData.modo_perfil) { toast.error("Selecciona cómo quieres participar en PropValu"); return false; }
      if (!regData.estado)    { toast.error("Selecciona el estado donde darás el servicio"); return false; }
      if (!regData.municipios[0]?.trim()) { toast.error("Ingresa al menos un municipio o población"); return false; }
      if (regData.role === "appraiser") {
        const anyService = Object.values(regData.services).some(Boolean);
        if (!anyService) { toast.error("Selecciona al menos un tipo de servicio"); return false; }
        if (!regData.q_experiencia) { toast.error("Indica tus años de experiencia"); return false; }
      }
      if (regData.role === "realtor") {
        if (!regData.inmobiliaria_tipo) { toast.error("Selecciona si eres Titular o Asesor"); return false; }
        if (regData.inmobiliaria_tipo === "titular" && !regData.asociacion.trim()) {
          toast.error("Ingresa la asociación inmobiliaria a la que perteneces"); return false;
        }
        if (regData.inmobiliaria_tipo === "asesor" && !regData.empresa_afiliada) {
          toast.error("Selecciona la empresa afiliada"); return false;
        }
      }
      return true;
    }
    return true; // step 3 docs are optional (validated individually below)
  };

  const handleNext = () => {
    if (validateStep(regStep)) setRegStep(s => s + 1);
  };

  const navigateByRole = (user) => {
    if (user.role === "appraiser") {
      navigate("/dashboard/valuador", { state: { user } });
    } else if (user.role === "realtor") {
      navigate("/dashboard/inmobiliaria", { state: { user } });
    } else {
      navigate("/dashboard", { state: { user } });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Error al iniciar sesión");
      toast.success(`Bienvenido, ${data.name}`);
      navigateByRole(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Submit (step 3) ── */
  const handleRegister = async (e) => {
    e.preventDefault();

    // Validate required docs
    if (regData.role === "appraiser") {
      if (!files.ine_frente)              { toast.error("Sube el frente de tu INE"); return; }
      if (!files.cedula)                  { toast.error("Sube tu Cédula Profesional"); return; }
      if (!files.foto_profesional)        { toast.error("Sube tu foto profesional"); return; }
      if (!files.comprobante_experiencia) { toast.error("Sube el comprobante de experiencia"); return; }
    }
    if (regData.role === "realtor" && regData.inmobiliaria_tipo === "titular") {
      if (!files.cert_asociacion) { toast.error("Sube el certificado de la asociación"); return; }
    }
    if (regData.role === "realtor" && regData.inmobiliaria_tipo === "asesor") {
      if (!files.credencial_empresa)       { toast.error("Sube tu credencial de empresa"); return; }
      if (!files.cert_curso_inmobiliario)  { toast.error("Sube tu certificación de curso inmobiliario"); return; }
    }
    if (!regData.aceptaTerminos) {
      toast.error("Debes aceptar los Términos del Servicio y la Política de Privacidad para continuar");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Crear cuenta
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:         regData.name,
          email:        regData.email,
          password:     regData.password,
          role:         regData.role,
          phone:        regData.phone,
          company_name: regData.company_name || undefined,
          estado:       regData.estado,
          municipio:    regData.municipios.filter(m => m.trim()).join(", "),
          municipios:   regData.municipios.filter(m => m.trim()),
          modo_perfil:  regData.modo_perfil,
          services:     regData.role === "appraiser" ? regData.services : undefined,
          servicios_otros: regData.servicios_otros_lista.filter(s => s.trim()),
          peritajes_tipos: regData.peritajes_tipos,
          peritajes_otros: regData.peritajes_otros || undefined,
          q_experiencia:     regData.q_experiencia || undefined,
          q_unidad_valuacion: regData.q_unidad_valuacion || undefined,
          ...(regData.modo_perfil === "completo" ? {
            q_equipo:         regData.q_equipo || undefined,
            q_oficina:        regData.q_oficina,
            q_dir_oficina:    regData.q_dir_oficina || undefined,
            q_maps_url:       regData.q_maps_url || undefined,
            q_tiempo_entrega: regData.q_tiempo_entrega || undefined,
            q_seguro_rc:      regData.q_seguro_rc,
            q_software:       regData.q_software || undefined,
            q_idiomas:        regData.q_idiomas || undefined,
          } : {}),
          inmobiliaria_tipo: regData.role === "realtor" ? regData.inmobiliaria_tipo : undefined,
          asociacion:   regData.asociacion || undefined,
          cursos:       regData.cursos_inmobiliarios || undefined,
          num_asesores: regData.num_asesores || undefined,
          empresa_afiliada: regData.empresa_afiliada || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail);

      // 2. Subir archivos usando la cookie de sesión que acaba de crearse
      const archivosASubir = Object.entries(files).filter(([, f]) => f !== null);
      if (archivosASubir.length > 0) {
        const errores = [];
        for (const [doc_tipo, file] of archivosASubir) {
          const fd = new FormData();
          fd.append("doc_tipo", doc_tipo);
          fd.append("file", file);
          const upRes = await fetch(`${API}/kyc/upload`, {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          if (!upRes.ok) errores.push(doc_tipo);
        }
        if (errores.length > 0) {
          toast.warning(`Cuenta creada, pero algunos documentos no se pudieron subir: ${errores.join(", ")}. Súbelos desde tu expediente.`);
        }
      }

      toast.success(
        regData.role === "appraiser"
          ? "Registro completado. Te contactaremos para una entrevista de verificación."
          : "Registro completado. Tu cuenta está en revisión — te avisaremos por correo."
      );
      navigateByRole(data);
    } catch (err) {
      toast.error(err.message || "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  /* ────────────────────────────────────────────────────── */

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Rol */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "appraiser", label: "Soy Valuador",     desc: "Perito certificado",  icon: <User className="w-5 h-5" /> },
          { value: "realtor",   label: "Soy Inmobiliaria", desc: "Agencia, broker o asesor", icon: <Briefcase className="w-5 h-5" /> },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setReg("role", opt.value)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              regData.role === opt.value
                ? "border-[#52B788] bg-[#D9ED92]/20"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`mb-1 ${regData.role === opt.value ? "text-[#1B4332]" : "text-slate-400"}`}>
              {opt.icon}
            </div>
            <p className={`text-sm font-semibold ${regData.role === opt.value ? "text-[#1B4332]" : "text-slate-600"}`}>
              {opt.label}
            </p>
            <p className="text-xs text-slate-400">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          {regData.role === "realtor" ? "Nombre del representante" : "Nombre completo"} *
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            required placeholder="Nombre completo"
            className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
            value={regData.name}
            onChange={e => setReg("name", e.target.value)}
          />
        </div>
      </div>

      {/* Empresa (realtor) */}
      {regData.role === "realtor" && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Nombre de la empresa *</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              required placeholder="Inmobiliaria XYZ S.A."
              className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.company_name}
              onChange={e => setReg("company_name", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Correo */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Correo electrónico *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="email" required placeholder="tu@correo.com"
            className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
            value={regData.email}
            onChange={e => setReg("email", e.target.value)}
          />
        </div>
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Teléfono *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="tel" required placeholder="33 1234 5678"
            className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
            value={regData.phone}
            onChange={e => setReg("phone", e.target.value)}
          />
        </div>
      </div>

      {/* Contraseñas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Contraseña *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"} required placeholder="••••••"
              className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.password}
              onChange={e => setReg("password", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Confirmar *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"} required placeholder="••••••"
              className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.confirmPassword}
              onChange={e => setReg("confirmPassword", e.target.value)}
            />
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setShowPassword(s => !s)}
        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {showPassword ? "Ocultar" : "Mostrar"} contraseña
      </button>
    </div>
  );

  const ModoSelector = ({ rol }) => (
    <div>
      <Label className="text-sm font-semibold text-[#1B4332] mb-3 block">¿Cómo quieres participar en PropValu? *</Label>
      <div className="grid grid-cols-1 gap-3">

        {/* Opción básica */}
        <button type="button" onClick={() => setReg("modo_perfil", "basico")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            regData.modo_perfil === "basico" ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 hover:border-slate-300 bg-white"
          }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">🖥️</span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${regData.modo_perfil === "basico" ? "text-[#1B4332]" : "text-slate-700"}`}>
                Solo valuaciones en plataforma
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {rol === "appraiser"
                  ? "Usa PropValu para hacer tus propios avalúos. Requiere INE y cédula profesional."
                  : "Solicita valuaciones para tu portafolio. Requiere documentos básicos de empresa."}
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
              regData.modo_perfil === "basico" ? "border-[#52B788] bg-[#52B788]" : "border-slate-300"
            }`}>
              {regData.modo_perfil === "basico" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </button>

        {/* Opción afiliado */}
        <button type="button" onClick={() => setReg("modo_perfil", "completo")}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            regData.modo_perfil === "completo" ? "border-[#1B4332] bg-[#1B4332]/5" : "border-slate-200 hover:border-slate-300 bg-white"
          }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">🏆</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold ${regData.modo_perfil === "completo" ? "text-[#1B4332]" : "text-slate-700"}`}>
                  {rol === "appraiser" ? "Valuador Afiliado PropValu" : "Inmobiliaria Afiliada PropValu"}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332]">Recomendado</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {rol === "appraiser"
                  ? "Además de usar la plataforma, PropValu te manda encargos de clientes e inmobiliarias en tu zona."
                  : "Además de solicitar valuaciones, tu empresa aparece en el directorio y recibes servicios prioritarios."}
              </p>
              {/* Pitch expandido cuando está seleccionado */}
              {regData.modo_perfil === "completo" && (
                <div className="mt-3 space-y-2.5 border-t border-[#1B4332]/10 pt-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#1B4332] mb-1">Lo que obtienes</p>
                    <div className="space-y-1">
                      {(rol === "appraiser" ? [
                        "Encargos directos de clientes e inmobiliarias en tu zona",
                        "80% de comisión — PropValu retiene solo el 20%",
                        "Perfil verificado con medallitas en el directorio público",
                        "Prioridad en la asignación según calificación y cercanía",
                        "Notificación por WhatsApp y correo de cada encargo",
                      ] : [
                        "Perfil verificado en el directorio de inmobiliarias PropValu",
                        "Valuadores certificados asignados a tus propiedades",
                        "Reporte mensual de mercado por zona",
                        "Soporte dedicado en planes Estándar y Premier",
                      ]).map(item => (
                        <p key={item} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0 mt-0.5" />{item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 mb-1">Tus compromisos</p>
                    <div className="space-y-1">
                      {(rol === "appraiser" ? [
                        "Responder cada encargo en menos de 24 horas",
                        "Cumplir con los estándares de calidad PropValu",
                        "Mantener tu expediente completo y vigente",
                      ] : [
                        "Documentación de empresa completa y vigente",
                        "Pago mensual o anual del plan contratado",
                      ]).map(item => (
                        <p key={item} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>{item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {rol === "appraiser"
                      ? "Requiere expediente completo (CV, domicilio, avalúos de muestra) + entrevista de verificación por videollamada."
                      : "Requiere documentación adicional de la empresa + entrevista de verificación."}
                  </p>
                </div>
              )}
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
              regData.modo_perfil === "completo" ? "border-[#1B4332] bg-[#1B4332]" : "border-slate-300"
            }`}>
              {regData.modo_perfil === "completo" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </button>

      </div>
    </div>
  );

  const renderStep2Appraiser = () => (
    <div className="space-y-5">

      <ModoSelector rol="appraiser" />

      {/* Servicios */}
      <div>
        <Label className="text-sm font-semibold text-[#1B4332] mb-3 block">
          Tipos de servicio que realizas *
        </Label>
        <div className="space-y-2">
          {SERVICIOS_VALUADOR.map(s => (
            <div key={s.key}>
              <button
                type="button"
                onClick={() => toggleService(s.key)}
                className="flex items-center gap-2.5 w-full text-left group"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  regData.services[s.key]
                    ? "bg-[#52B788] border-[#52B788]"
                    : "border-slate-300 group-hover:border-[#52B788]"
                }`}>
                  {regData.services[s.key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm font-medium ${regData.services[s.key] ? "text-[#1B4332]" : "text-slate-600"}`}>
                  {s.label}
                </span>
              </button>

              {/* Peritajes: subtypes */}
              {s.key === "peritajes" && regData.services.peritajes && (
                <div className="ml-7 mt-2 space-y-1.5 pl-3 border-l-2 border-[#D9ED92]">
                  <p className="text-xs text-slate-500 font-semibold mb-1">Tipo de peritaje:</p>
                  {PERITAJES_TIPOS.map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => togglePeritajeTipo(tipo)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        regData.peritajes_tipos.includes(tipo)
                          ? "bg-[#52B788] border-[#52B788]"
                          : "border-slate-300"
                      }`}>
                        {regData.peritajes_tipos.includes(tipo) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-xs text-slate-600">{tipo}</span>
                    </button>
                  ))}
                  <div className="space-y-1 mt-2">
                    <Label className="text-xs font-medium text-slate-500">Otro tipo de peritaje:</Label>
                    <Input
                      placeholder="Especifica..."
                      className="h-8 text-xs bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={regData.peritajes_otros}
                      onChange={e => setReg("peritajes_otros", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Otros: múltiples líneas */}
              {s.key === "otros" && regData.services.otros && (
                <div className="ml-7 mt-2 space-y-2">
                  {regData.servicios_otros_lista.map((val, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder={`Servicio ${idx + 1}...`}
                        className="h-8 text-xs bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                        value={val}
                        onChange={e => {
                          const list = [...regData.servicios_otros_lista];
                          list[idx] = e.target.value;
                          setReg("servicios_otros_lista", list);
                        }}
                      />
                      {regData.servicios_otros_lista.length > 1 && (
                        <button type="button" onClick={() => setReg("servicios_otros_lista", regData.servicios_otros_lista.filter((_, i) => i !== idx))}
                          className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setReg("servicios_otros_lista", [...regData.servicios_otros_lista, ""])}
                    className="flex items-center gap-1 text-xs text-[#52B788] font-semibold hover:underline">
                    <span className="text-base leading-none">+</span> Agregar otro servicio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Experiencia */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-[#1B4332]">Años de experiencia valuando *</Label>
        <p className="text-xs text-slate-400">Aparecerá como medalla en tu perfil público.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {[
            { val: "Menos de 1 año", medal: null,  label: "Menos de 1 año" },
            { val: "1-3 años",       medal: "🥉",  label: "1 – 3 años" },
            { val: "3-5 años",       medal: "🥈",  label: "3 – 5 años" },
            { val: "5-10 años",      medal: "🥈",  label: "5 – 10 años" },
            { val: "Más de 10 años", medal: "🥇",  label: "Más de 10 años" },
          ].map(({ val, medal, label }) => (
            <button key={val} type="button" onClick={() => setReg("q_experiencia", val)}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                regData.q_experiencia === val
                  ? "border-[#52B788] bg-[#F0FAF5] text-[#1B4332]"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              {medal && <span className="text-base">{medal}</span>}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cobertura */}
      <div>
        <Label className="text-sm font-semibold text-[#1B4332] mb-3 block flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#52B788]" />
          Zona de cobertura *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Estado</Label>
            <select
              className="w-full h-9 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
              value={regData.estado}
              onChange={e => setReg("estado", e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Municipio / Población</Label>
            <Input
              placeholder="ej. Zapopan"
              className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.municipio}
              onChange={e => setReg("municipio", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2Realtor = () => (
    <div className="space-y-5">

      <ModoSelector rol="realtor" />

      {/* Tipo de cuenta */}
      <div>
        <Label className="text-sm font-semibold text-[#1B4332] mb-3 block">
          Tipo de cuenta *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "titular", label: "Titular", desc: "Dueño o gerente de la empresa" },
            { value: "asesor",  label: "Asesor",  desc: "Agente afiliado a una empresa" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReg("inmobiliaria_tipo", opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                regData.inmobiliaria_tipo === opt.value
                  ? "border-[#52B788] bg-[#D9ED92]/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className={`text-sm font-semibold ${regData.inmobiliaria_tipo === opt.value ? "text-[#1B4332]" : "text-slate-600"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Titular: asociación, cursos, num_asesores */}
      {regData.inmobiliaria_tipo === "titular" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Asociación inmobiliaria a la que perteneces *</Label>
            <Input
              placeholder="ej. AMPI Jalisco, CANACO, etc."
              className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.asociacion}
              onChange={e => setReg("asociacion", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Cursos de inmobiliario autorizado <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input
              placeholder="ej. Certificación AMPI, Curso CANACO 2024..."
              className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.cursos_inmobiliarios}
              onChange={e => setReg("cursos_inmobiliarios", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">¿Cuántos asesores vas a inscribir? <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input
              type="number" min={0} placeholder="ej. 5"
              className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
              value={regData.num_asesores}
              onChange={e => setReg("num_asesores", e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Los asesores recibirán un enlace para registrarse y seleccionar tu empresa.
            </p>
          </div>
        </>
      )}

      {/* Asesor: empresa afiliada */}
      {regData.inmobiliaria_tipo === "asesor" && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Empresa afiliada *</Label>
          <select
            className="w-full h-10 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
            value={regData.empresa_afiliada}
            onChange={e => setReg("empresa_afiliada", e.target.value)}
          >
            <option value="">Seleccionar empresa...</option>
            {EMPRESAS_AFILIADAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <p className="text-xs text-slate-400">
            Si tu empresa no aparece en la lista, pide al titular que se registre primero.
          </p>
        </div>
      )}

      {/* Cobertura */}
      <div>
        <Label className="text-sm font-semibold text-[#1B4332] mb-3 block flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#52B788]" />
          Zona de cobertura *
        </Label>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Estado</Label>
            <select
              className="w-full h-9 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-[#1B4332] appearance-none"
              value={regData.estado}
              onChange={e => setReg("estado", e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Municipios / Poblaciones</Label>
            <div className="space-y-2">
              {regData.municipios.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder={`ej. ${["Zapopan","Guadalajara","Tlaquepaque","Tonalá"][idx] || "Municipio"}`}
                    className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                    value={m}
                    onChange={e => {
                      const list = [...regData.municipios];
                      list[idx] = e.target.value;
                      setReg("municipios", list);
                    }}
                  />
                  {regData.municipios.length > 1 && (
                    <button type="button"
                      onClick={() => setReg("municipios", regData.municipios.filter((_, i) => i !== idx))}
                      className="text-slate-300 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={() => setReg("municipios", [...regData.municipios, ""])}
                className="flex items-center gap-1 text-xs text-[#52B788] font-semibold hover:underline">
                <span className="text-base leading-none">+</span> Agregar municipio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3Appraiser = () => (
    <div className="space-y-6">

      {/* Documentos básicos */}
      <div>
        <p className="text-sm font-semibold text-[#1B4332] mb-1">Documentos de identificación</p>
        <p className="text-xs text-slate-500 mb-4">Requeridos para todos los valuadores.</p>
        <div className="space-y-4">
          <FileUploadField label="INE — Frente" hint="Identificación oficial vigente, cara frontal"
            value={files.ine_frente} onChange={v => setFile("ine_frente", v)} required />
          <FileUploadField label="INE — Vuelta" hint="Identificación oficial vigente, cara trasera"
            value={files.ine_vuelta} onChange={v => setFile("ine_vuelta", v)} />
          <FileUploadField
            label="Cédula Profesional"
            hint="Cédula de Arquitecto, Ing. Civil, Ing. Estructural, Perito Valuador u otra carrera afín, verificable en el Registro Nacional de Profesionistas (SEP-DGP)."
            value={files.cedula} onChange={v => setFile("cedula", v)} required />
          <FileUploadField
            label="Foto profesional *"
            hint="Fotografía reciente de frente, fondo neutro, con vestimenta formal. Aparecerá en los reportes y opiniones que generes en PropValu."
            value={files.foto_profesional} onChange={v => setFile("foto_profesional", v)} required />
          <FileUploadField
            label="Comprobante de experiencia"
            hint={`Documenta los ${regData.q_experiencia || "años de trabajo"} que indicaste. Acepta cualquiera de: título o cédula de maestría en valuación, avalúo o dictamen firmado con fecha que acredite antigüedad, constancia o carta de un Colegio de Valuadores (CIEP, COVAC, AMPI, SVM, COPEVI u otro), o credencial de agremiado activo.`}
            value={files.comprobante_experiencia} onChange={v => setFile("comprobante_experiencia", v)} required />
          <FileUploadField
            label="Firma autógrafa digital"
            hint="Escanea o fotografía tu firma manuscrita sobre papel blanco, o sube una imagen de tu firma digital personalizada. Se usará en las opiniones y reportes que generes en PropValu. (No es la e.firma del SAT.)"
            value={files.firma_autografa} onChange={v => setFile("firma_autografa", v)} />
          <FileUploadField
            label="Comprobante adicional (opcional)"
            hint="Cualquier documento que refuerce tu trayectoria como valuador: tarjeta de presentación profesional, captura de tu sitio web o perfil en LinkedIn, directorio de colegio, membresía activa, etc."
            value={files.comprobante_adicional} onChange={v => setFile("comprobante_adicional", v)} />
        </div>
      </div>

      {/* Documentos condicionales por tipo de servicio */}
      {(regData.services.infonavit || regData.services.fovissste) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Documentos — Infonavit / Fovissste</p>
            <p className="text-xs text-amber-700">Necesarios porque indicaste que realizas avalúos para Infonavit o Fovissste.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Unidad de Valuación con la que trabajas *</Label>
            <Input
              placeholder="ej. Valuarte, Itevu, Ceval, nombre de la UV..."
              className="h-9 text-sm bg-white border-amber-300 focus:border-amber-500 focus:outline-none"
              value={regData.q_unidad_valuacion} onChange={e => setReg("q_unidad_valuacion", e.target.value)} />
            <p className="text-xs text-slate-500">Si trabajas de forma independiente escribe "Independiente".</p>
          </div>
          <FileUploadField
            label="Carta de SHF o de la Unidad de Valuación"
            hint="Carta de la SHF, de la UV con la que colaboras, o cualquier oficio que acredite tu habilitación para realizar avalúos Infonavit/Fovissste."
            value={files.carta_unidad} onChange={v => setFile("carta_unidad", v)} />
        </div>
      )}

      {(regData.services.catastrales || regData.services.obras_publicas) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-sky-800 mb-0.5">Documentos — Catastro / Obras públicas</p>
            <p className="text-xs text-sky-700">Necesarios porque indicaste que realizas avalúos catastrales u obras públicas.</p>
          </div>
          <FileUploadField
            label="Comprobante catastral"
            hint="Cualquiera de: credencial de perito valuador catastral, oficio de habilitación municipal o estatal, o un avalúo catastral previo con tu nombre y firma."
            value={files.comprobante_catastro} onChange={v => setFile("comprobante_catastro", v)} />
        </div>
      )}

      {/* Documentos y cuestionario para perfil completo */}
      {regData.modo_perfil === "completo" && (
        <>
          {/* Documentos adicionales */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[#1B4332]">Documentos adicionales</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B4332] text-white">Perfil completo</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Necesarios para que PropValu te asigne encargos externos.</p>
            <div className="space-y-4">
              <FileUploadField label="Comprobante de domicilio de oficina o trabajo"
                hint="Recibo de luz, agua, internet o renta a nombre del valuador o de la empresa, con la dirección de trabajo (no mayor a 3 meses). También se acepta recibo de celular a tu nombre."
                value={files.comprobante_domicilio} onChange={v => setFile("comprobante_domicilio", v)} required />
              <FileUploadField label="Carta de recomendación"
                hint="De un cliente, empresa o colegio de valuadores"
                value={files.carta_recomendacion} onChange={v => setFile("carta_recomendacion", v)} />
              <FileUploadField label="Currículum vitae"
                hint="PDF con tu experiencia profesional"
                value={files.curriculum} onChange={v => setFile("curriculum", v)} required />
              <div>
                <p className="text-sm font-semibold text-[#1B4332] mb-1">3 avalúos de muestra</p>
                <p className="text-xs text-slate-500 mb-3">Pueden ser opinión de valor, comercial, catastral u otro. Omite los datos del cliente.</p>
                <div className="space-y-3">
                  <FileUploadField label="Avalúo muestra 1" value={files.avaluo_muestra_1} onChange={v => setFile("avaluo_muestra_1", v)} required />
                  <FileUploadField label="Avalúo muestra 2" value={files.avaluo_muestra_2} onChange={v => setFile("avaluo_muestra_2", v)} />
                  <FileUploadField label="Avalúo muestra 3" value={files.avaluo_muestra_3} onChange={v => setFile("avaluo_muestra_3", v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Cuestionario de perfil */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[#1B4332]">Cuestionario de perfil</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B4332] text-white">Perfil completo</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Nos ayuda a asignarte los encargos más adecuados a tu perfil.</p>
            <div className="space-y-4">

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Personas en tu equipo de trabajo *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[["solo","Solo yo"],["1-3","1 a 3"],["4-10","4 a 10"],["10+","Más de 10"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setReg("q_equipo", val)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        regData.q_equipo === val ? "border-[#52B788] bg-[#F0FAF5] text-[#1B4332]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tiempo promedio de entrega de un avalúo</Label>
                <select className="w-full h-9 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:outline-none text-[#1B4332] appearance-none"
                  value={regData.q_tiempo_entrega} onChange={e => setReg("q_tiempo_entrega", e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {["24 horas","2-3 días","3-5 días","1 semana","Más de 1 semana"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setReg("q_oficina", !regData.q_oficina)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${regData.q_oficina ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"}`}>
                  {regData.q_oficina && <Check className="w-3 h-3 text-white" />}
                </button>
                <Label className="text-sm text-slate-600 cursor-pointer" onClick={() => setReg("q_oficina", !regData.q_oficina)}>
                  Tengo oficina física
                </Label>
              </div>

              {regData.q_oficina && (
                <div className="ml-8 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Dirección de oficina</Label>
                    <Input placeholder="Calle, número, colonia, municipio"
                      className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={regData.q_dir_oficina} onChange={e => setReg("q_dir_oficina", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Ubicación en Google Maps (liga)</Label>
                    <Input placeholder="https://maps.google.com/..."
                      className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={regData.q_maps_url} onChange={e => setReg("q_maps_url", e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setReg("q_seguro_rc", !regData.q_seguro_rc)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${regData.q_seguro_rc ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"}`}>
                  {regData.q_seguro_rc && <Check className="w-3 h-3 text-white" />}
                </button>
                <Label className="text-sm text-slate-600 cursor-pointer" onClick={() => setReg("q_seguro_rc", !regData.q_seguro_rc)}>
                  Cuento con seguro de responsabilidad civil <span className="text-slate-400 font-normal">(no indispensable)</span>
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Software que utilizas</Label>
                <Input placeholder="ej. SIAP, Excel, AutoCAD, OPUS..."
                  className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                  value={regData.q_software} onChange={e => setReg("q_software", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Idiomas (además del español)</Label>
                <Input placeholder="ej. Inglés, Francés..."
                  className="h-9 text-sm bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                  value={regData.q_idiomas} onChange={e => setReg("q_idiomas", e.target.value)} />
              </div>

            </div>
          </div>
        </>
      )}

      {/* Términos y privacidad */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1B4332]">Términos y Política de Privacidad</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Antes de continuar, lee y descarga los siguientes documentos:
        </p>
        <div className="flex flex-col gap-2">
          <a href="/terminos-valuadores" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#1B4332] font-medium underline underline-offset-2 hover:text-[#52B788]">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Términos del Servicio para Valuadores (descargar / leer)
          </a>
          <a href="/privacidad" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#1B4332] font-medium underline underline-offset-2 hover:text-[#52B788]">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Política de Privacidad y Tratamiento de Datos Personales
          </a>
        </div>
        <button type="button"
          onClick={() => setReg("aceptaTerminos", !regData.aceptaTerminos)}
          className="flex items-center gap-3 mt-1">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            regData.aceptaTerminos ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"
          }`}>
            {regData.aceptaTerminos && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-slate-600 text-left">
            He leído y acepto los <strong>Términos del Servicio</strong> y la <strong>Política de Privacidad</strong>, incluyendo el tratamiento de mis datos personales conforme a la LFPDPPP.
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-[#D9ED92]/30 border border-[#52B788]/30 p-4 flex gap-3">
        <Info className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#1B4332] mb-1">¿Qué sigue?</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            El equipo PropValu revisará tus documentos y se pondrá en contacto contigo
            <strong> vía telefónica o entrevista virtual</strong> para completar la verificación.
            Te notificaremos por correo cuando tu cuenta sea aprobada.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3Realtor = () => (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-[#1B4332] mb-1">Documentos requeridos</p>
        <p className="text-xs text-slate-500 mb-4">
          {regData.inmobiliaria_tipo === "titular"
            ? "Como titular, sube el certificado que acredita a tu empresa ante una asociación inmobiliaria."
            : "Como asesor, sube tu credencial de empresa y tu certificación de curso inmobiliario."}
        </p>
      </div>

      {regData.inmobiliaria_tipo === "titular" && (
        <FileUploadField
          label="Certificado de asociación inmobiliaria"
          hint="Documento que acredita tu membresía en AMPI, CANACO u otra asociación"
          value={files.cert_asociacion}
          onChange={v => setFile("cert_asociacion", v)}
          required
        />
      )}

      {regData.inmobiliaria_tipo === "asesor" && (
        <>
          <FileUploadField
            label="Credencial de empresa"
            hint="Identificación o credencial emitida por tu empresa afiliada"
            value={files.credencial_empresa}
            onChange={v => setFile("credencial_empresa", v)}
            required
          />
          <FileUploadField
            label="Certificación de curso inmobiliario profesional"
            hint="Diploma o certificado de curso autorizado (AMPI, CANACO, CIPS, etc.)"
            value={files.cert_curso_inmobiliario}
            onChange={v => setFile("cert_curso_inmobiliario", v)}
            required
          />
        </>
      )}

      {/* Términos y privacidad */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1B4332]">Términos y Política de Privacidad</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Antes de continuar, lee y descarga los siguientes documentos:
        </p>
        <div className="flex flex-col gap-2">
          <a href="/terminos-inmobiliarias" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#1B4332] font-medium underline underline-offset-2 hover:text-[#52B788]">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Términos del Servicio para Inmobiliarias (descargar / leer)
          </a>
          <a href="/privacidad" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#1B4332] font-medium underline underline-offset-2 hover:text-[#52B788]">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Política de Privacidad y Tratamiento de Datos Personales
          </a>
        </div>
        <button type="button"
          onClick={() => setReg("aceptaTerminos", !regData.aceptaTerminos)}
          className="flex items-center gap-3 mt-1">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            regData.aceptaTerminos ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"
          }`}>
            {regData.aceptaTerminos && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-slate-600 text-left">
            He leído y acepto los <strong>Términos del Servicio</strong> y la <strong>Política de Privacidad</strong>, incluyendo el tratamiento de mis datos personales conforme a la LFPDPPP.
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-[#D9ED92]/30 border border-[#52B788]/30 p-4 flex gap-3">
        <Info className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#1B4332] mb-1">¿Qué sigue?</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            El equipo PropValu revisará tus documentos y se pondrá en contacto contigo
            <strong> vía telefónica o entrevista virtual</strong>. Recibirás un correo cuando
            tu cuenta sea activada.
          </p>
        </div>
      </div>
    </div>
  );

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-10">
      <div className={`w-full transition-all ${tab === "register" && regStep > 1 ? "max-w-lg" : "max-w-md"}`}>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate("/")}>
          <Building2 className="w-8 h-8 text-[#1B4332]" />
          <span className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">
            Prop<span className="text-[#52B788]">Valu</span>
          </span>
        </div>

        {/* Step indicator — solo en registro */}
        {tab === "register" && (
          <div className="flex items-center justify-center gap-1 mb-6">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done    = regStep > n;
              const active  = regStep === n;
              return (
                <div key={n} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done ? "bg-[#52B788] text-white" : active ? "bg-[#1B4332] text-white" : "bg-slate-200 text-slate-400"
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-[#1B4332]" : "text-slate-400"}`}>
                    {label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${done ? "bg-[#52B788]" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {[
              { key: "login",    label: "Iniciar Sesión" },
              { key: "register", label: "Registrarse" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setRegStep(1); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "text-[#1B4332] border-b-2 border-[#52B788] bg-[#D9ED92]/10"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── LOGIN ── */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email" required placeholder="tu@correo.com"
                      className="pl-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={loginData.email}
                      onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"} required placeholder="••••••••"
                      className="pl-10 pr-10 bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
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
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5">
                  {isLoading ? "Ingresando..." : "Ingresar"}
                </Button>
                <p className="text-center text-sm text-slate-500">
                  ¿Sin cuenta?{" "}
                  <button type="button" onClick={() => setTab("register")}
                    className="text-[#52B788] font-semibold hover:underline">
                    Regístrate aquí
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTRO ── */}
            {tab === "register" && (
              <form onSubmit={handleRegister}>

                {regStep === 1 && renderStep1()}
                {regStep === 2 && regData.role === "appraiser" && renderStep2Appraiser()}
                {regStep === 2 && regData.role === "realtor"   && renderStep2Realtor()}
                {regStep === 3 && regData.role === "appraiser" && renderStep3Appraiser()}
                {regStep === 3 && regData.role === "realtor"   && renderStep3Realtor()}

                {/* Navigation buttons */}
                <div className={`flex gap-3 mt-6 ${regStep > 1 ? "justify-between" : ""}`}>
                  {regStep > 1 && (
                    <Button type="button" variant="outline"
                      onClick={() => setRegStep(s => s - 1)}
                      className="border-slate-200 text-slate-600">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
                    </Button>
                  )}

                  {regStep < 3 ? (
                    <Button type="button" onClick={handleNext}
                      className={`bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold ${regStep === 1 ? "w-full" : "flex-1"}`}>
                      Continuar <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading}
                      className="flex-1 bg-[#52B788] hover:bg-[#40916C] text-white font-semibold">
                      {isLoading ? "Enviando..." : "Enviar solicitud"}
                    </Button>
                  )}
                </div>

                {regStep === 1 && (
                  <p className="text-center text-sm text-slate-500 mt-4">
                    ¿Ya tienes cuenta?{" "}
                    <button type="button" onClick={() => setTab("login")}
                      className="text-[#52B788] font-semibold hover:underline">
                      Inicia sesión
                    </button>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          ¿Eres público general?{" "}
          <button onClick={() => navigate("/comprar")} className="text-[#1B4332] font-semibold hover:underline">
            Obtén tu valuación aquí
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

