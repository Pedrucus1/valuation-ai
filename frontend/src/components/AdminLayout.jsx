import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Building2, LayoutDashboard, Users, ShieldCheck, Megaphone,
  MessageSquare, LogOut, Menu, X, ChevronRight, Bell,
  UserCog, ClipboardList, Send, Activity, FileText,
  DollarSign, MapPin, BarChart2, Ban,
} from "lucide-react";

const NAV_GRUPOS = [
  {
    grupo: "Operaciones",
    items: [
      { label: "Dashboard",    icon: LayoutDashboard, href: "/admin" },
      { label: "Usuarios",     icon: Users,           href: "/admin/usuarios" },
      { label: "Verificación", icon: ShieldCheck,     href: "/admin/kyc",     badge: "kyc" },
      { label: "Quejas",       icon: MessageSquare,   href: "/admin/feedback",badge: "quejas" },
      { label: "Valuadores",     icon: ClipboardList,   href: "/admin/valuadores" },
      { label: "Inmobiliarias",  icon: Building2,       href: "/admin/inmobiliarias", badge: "inmobiliarias" },
    ],
  },
  {
    grupo: "Publicidad",
    items: [
      { label: "Publicidad",   icon: Megaphone,       href: "/admin/ads-analytics", badge: "ads" },
    ],
  },
  {
    grupo: "Comunicación",
    items: [
      { label: "Broadcast",    icon: Send,            href: "/admin/broadcast" },
      { label: "Scraper",      icon: Activity,        href: "/admin/scraper" },
      { label: "CMS Legal",    icon: FileText,        href: "/admin/cms" },
    ],
  },
  {
    grupo: "Finanzas y datos",
    items: [
      { label: "CFDI",         icon: DollarSign,      href: "/admin/cfdi" },
      { label: "Ingresos",     icon: BarChart2,       href: "/admin/reportes" },
      { label: "Cobertura",    icon: MapPin,          href: "/admin/cobertura" },
    ],
  },
  {
    grupo: "Control avanzado",
    items: [
      { label: "Alertas",      icon: Bell,            href: "/admin/alertas" },
      { label: "Precios",      icon: DollarSign,      href: "/admin/precios" },
      { label: "Mantenimiento",icon: Activity,        href: "/admin/mantenimiento" },
    ],
  },
  {
    grupo: "Sistema",
    items: [
      { label: "Roles Admin",  icon: UserCog,         href: "/admin/roles" },
    ],
  },
];

// Aplanar para buscar badges
const NAV = NAV_GRUPOS.flatMap((g) => g.items);

const ROL_LABEL = {
  superadmin: { label: "Super Admin", cls: "bg-[#D9ED92] text-[#1B4332]" },
  moderador:  { label: "Moderador",   cls: "bg-blue-100 text-blue-700" },
  finanzas:   { label: "Finanzas",    cls: "bg-purple-100 text-purple-700" },
  soporte:    { label: "Soporte",     cls: "bg-orange-100 text-orange-700" },
  contenido:  { label: "Contenido",   cls: "bg-pink-100 text-pink-700" },
};

/* ── Sidebar content — definida FUERA de AdminLayout para evitar remount en cada render ── */
const SidebarContent = ({ location, badges, admin, rolInfo, handleLogout, setSidebarOpen }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
      <Building2 className="w-6 h-6 text-[#52B788]" />
      <span className="font-['Outfit'] text-lg font-bold text-white">
        Prop<span className="text-[#52B788]">Valu</span>
        <span className="text-[#52B788] text-xs font-semibold ml-1 opacity-70">Admin</span>
      </span>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      {NAV_GRUPOS.map(({ grupo, items }) => (
        <div key={grupo}>
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 mb-1">{grupo}</p>
          <div className="space-y-0.5">
            {items.map(({ label, icon: Icon, href, badge }) => {
              const active = location.pathname === href;
              const count = badge ? (badges[badge] || 0) : 0;
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#52B788]/20 text-[#52B788]"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                  {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>

    {/* Admin info + logout */}
    <div className="px-4 py-4 border-t border-white/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#52B788]/20 flex items-center justify-center text-[#52B788] text-xs font-bold">
          {(admin.nombre || "A").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{admin.nombre || "Admin"}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rolInfo.cls}`}>
            {rolInfo.label}
          </span>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 text-white/40 hover:text-red-400 text-xs py-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  </div>
);

const AdminLayout = ({ children, badges = {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const admin = JSON.parse(localStorage.getItem("pv_admin") || "{}");
  const rolInfo = ROL_LABEL[admin.rol] || ROL_LABEL.moderador;

  const handleLogout = () => {
    localStorage.removeItem("pv_admin");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0D1F18] border-r border-white/5 fixed inset-y-0 left-0 z-30">
        <SidebarContent location={location} badges={badges} admin={admin} rolInfo={rolInfo} handleLogout={handleLogout} setSidebarOpen={setSidebarOpen} />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0D1F18] border-r border-white/5 lg:hidden transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-4 right-4">
          <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent location={location} badges={badges} admin={admin} rolInfo={rolInfo} handleLogout={handleLogout} setSidebarOpen={setSidebarOpen} />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-[#1B4332]"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb / sección activa */}
            <div className="hidden lg:flex items-center gap-2">
              {(() => {
                const active = NAV.find(n => n.href === location.pathname);
                return active ? (
                  <>
                    <span className="text-slate-300 text-xs">PropValu Admin</span>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="font-['Outfit'] font-semibold text-[#1B4332] text-sm">{active.label}</span>
                  </>
                ) : (
                  <span className="font-['Outfit'] font-bold text-[#1B4332] text-sm">PropValu Admin</span>
                );
              })()}
            </div>
            <h1 className="font-['Outfit'] font-bold text-[#1B4332] text-sm lg:hidden">
              PropValu Admin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-slate-400 hover:text-[#1B4332] transition-colors">
              <Bell className="w-5 h-5" />
              {(badges.kyc || 0) + (badges.ads || 0) + (badges.inmobiliarias || 0) + (badges.quejas || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <Link to="/" target="_blank" className="text-xs text-slate-400 hover:text-[#1B4332] transition-colors hidden sm:block">
              Ver sitio ↗
            </Link>
            {/* Admin chip */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
              <div className="w-5 h-5 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-[10px] font-bold">
                {(admin.nombre || "A").charAt(0)}
              </div>
              <span className="text-xs font-medium text-slate-600">{admin.nombre || "Admin"}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
