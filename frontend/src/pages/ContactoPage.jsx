import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, ArrowLeft, Mail, Phone, MapPin, MessageCircle, Send, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ContactoPage = () => {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", subject: "", message: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setIsLoading(false);
    setSent(true);
    toast.success("Mensaje enviado correctamente");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#1B4332] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Building2 className="w-5 h-5 text-[#1B4332]" />
            <span className="font-['Outfit'] text-lg font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold text-[#52B788] uppercase tracking-widest mb-2">
            Soporte
          </p>
          <h1 className="font-['Outfit'] text-3xl font-bold text-[#1B4332] mb-3">
            Contáctanos
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Estamos para ayudarte. Escríbenos y te respondemos en menos de 24 horas hábiles.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Info cards */}
          <div className="lg:col-span-2 space-y-4">
            {[
              {
                icon: <Mail className="w-5 h-5" />,
                label: "Correo electrónico",
                value: "hola@propvalu.mx",
                sub: "Respuesta en 24 hrs hábiles",
              },
              {
                icon: <Phone className="w-5 h-5" />,
                label: "Teléfono / WhatsApp",
                value: "+52 33 1234 5678",
                sub: "Lun–Vie 9:00–18:00",
              },
              {
                icon: <MapPin className="w-5 h-5" />,
                label: "Ubicación",
                value: "Guadalajara, Jalisco",
                sub: "México",
              },
              {
                icon: <MessageCircle className="w-5 h-5" />,
                label: "WhatsApp directo",
                value: "Escríbenos ahora",
                sub: "Abrir chat →",
                onClick: () => window.open("https://wa.me/523312345678", "_blank"),
              },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className={`bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 ${
                  item.onClick ? "cursor-pointer hover:border-[#52B788] hover:shadow-md transition-all" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#D9ED92]/40 flex items-center justify-center text-[#1B4332] flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</p>
                  <p className="text-[#1B4332] font-semibold text-sm">{item.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}

            {/* Áreas */}
            <div className="bg-[#1B4332] rounded-xl p-5 text-white">
              <p className="font-['Outfit'] font-bold text-sm mb-3">Áreas de contacto</p>
              {[
                ["Soporte técnico", "soporte@propvalu.mx"],
                ["Ventas y planes", "ventas@propvalu.mx"],
                ["Anunciantes", "anunciantes@propvalu.mx"],
                ["Legal y privacidad", "legal@propvalu.mx"],
              ].map(([label, email]) => (
                <div key={label} className="flex justify-between text-xs py-1.5 border-b border-white/10 last:border-0">
                  <span className="text-white/70">{label}</span>
                  <span className="text-[#D9ED92] font-medium">{email}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              {sent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#D9ED92] flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-[#1B4332]" />
                  </div>
                  <h3 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-2">
                    ¡Mensaje enviado!
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Te responderemos a <strong>{form.email}</strong> en las próximas 24 horas hábiles.
                  </p>
                  <Button
                    onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                    variant="outline"
                    className="border-[#52B788] text-[#1B4332] hover:bg-[#D9ED92]/20"
                  >
                    Enviar otro mensaje
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-1">
                      Envíanos un mensaje
                    </h2>
                    <p className="text-sm text-slate-400">
                      Los campos marcados con * son obligatorios.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-[#1B4332]">Nombre *</Label>
                      <Input
                        placeholder="Tu nombre completo"
                        className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-[#1B4332]">Teléfono</Label>
                      <Input
                        type="tel"
                        placeholder="33 1234 5678"
                        className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                        value={form.phone}
                        onChange={e => set("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[#1B4332]">Correo electrónico *</Label>
                    <Input
                      type="email"
                      placeholder="tu@correo.com"
                      className="bg-[#F0FAF5] border-[#B7E4C7] focus:border-[#52B788] focus:bg-white"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[#1B4332]">Asunto</Label>
                    <select
                      className="w-full h-10 px-3 text-sm border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] focus:border-[#52B788] focus:bg-white focus:outline-none text-slate-600 appearance-none"
                      value={form.subject}
                      onChange={e => set("subject", e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      <option>Soporte técnico</option>
                      <option>Preguntas sobre planes y precios</option>
                      <option>Información para anunciantes</option>
                      <option>Registro como valuador</option>
                      <option>Facturación o pagos</option>
                      <option>Privacidad y datos personales</option>
                      <option>Otro</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[#1B4332]">Mensaje *</Label>
                    <textarea
                      rows={5}
                      placeholder="Describe tu consulta con el mayor detalle posible..."
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-[#52B788] focus:outline-none resize-none text-slate-700"
                      value={form.message}
                      onChange={e => set("message", e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5"
                  >
                    {isLoading ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar mensaje
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-slate-400 text-xs">
        © 2026 PropValu. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default ContactoPage;


