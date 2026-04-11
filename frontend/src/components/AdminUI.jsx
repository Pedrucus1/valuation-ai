/**
 * AdminUI — componentes visuales compartidos para todas las páginas admin.
 * Importar en cada página: import { PageHeader, AdminCard, GradThead, FilterBar } from "@/components/AdminUI";
 */
import { Search } from "lucide-react";

/* ── Hero de página ─────────────────────────────────────────────────── */
export const PageHeader = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl px-6 py-5">
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        {Icon && <Icon className="w-5 h-5 text-[#D9ED92] mb-1.5" />}
        <h1 className="font-['Outfit'] text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-[#D9ED92]/70 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  </div>
);

/* ── Header de sección dentro de tarjeta ────────────────────────────── */
export const SH = ({ icon: Icon, title, children }) => (
  <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center justify-between">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[#D9ED92]" />}
      <span className="font-['Outfit'] font-semibold text-white text-sm">{title}</span>
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

/* ── Tarjeta con header degradado ───────────────────────────────────── */
export const AdminCard = ({ icon, title, children, className = "", action }) => (
  <div className={`bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden ${className}`}>
    {title && <SH icon={icon} title={title}>{action}</SH>}
    {children}
  </div>
);

/* ── Barra de filtros con header ────────────────────────────────────── */
export const FilterBar = ({ children, title = "Filtros y búsqueda" }) => (
  <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
    <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center gap-2">
      <Search className="w-4 h-4 text-[#D9ED92]" />
      <span className="font-['Outfit'] font-semibold text-white text-sm">{title}</span>
    </div>
    <div className="p-4 flex flex-wrap gap-3">
      {children}
    </div>
  </div>
);

/* ── thead con degradado ─────────────────────────────────────────────── */
export const GradThead = ({ cols }) => (
  <thead>
    <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
      {cols.map((col, i) => (
        <th
          key={i}
          className={`text-left px-4 py-3 text-xs font-semibold text-[#D9ED92]/80 uppercase tracking-wide whitespace-nowrap ${typeof col === "object" ? (col.className || "") : ""}`}
        >
          {typeof col === "object" ? col.label : col}
        </th>
      ))}
    </tr>
  </thead>
);

/* ── Estado vacío consistente ───────────────────────────────────────── */
export const EmptyState = ({ icon: Icon, title, sub }) => (
  <div className="text-center py-14">
    {Icon && <Icon className="w-10 h-10 mx-auto mb-3 text-slate-200" />}
    <p className="text-sm font-medium text-slate-400">{title}</p>
    {sub && <p className="text-xs text-slate-300 mt-1">{sub}</p>}
  </div>
);

/* ── Botón de acción primario ───────────────────────────────────────── */
export const PrimaryBtn = ({ icon: Icon, children, className = "", ...props }) => (
  <button
    className={`flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors ${className}`}
    {...props}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

/* ── Chip de label de sección ───────────────────────────────────────── */
export const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-2">{children}</p>
);
