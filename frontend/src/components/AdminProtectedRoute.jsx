import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Verifica que haya sesión de admin en localStorage.
// En producción, reemplazar por verificación de JWT con /api/admin/me
const AdminProtectedRoute = ({ children, rolesPermitidos }) => {
  const navigate = useNavigate();

  const admin = JSON.parse(localStorage.getItem("pv_admin") || "null");

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login", { replace: true });
      return;
    }
    // Sesión expira en 8 horas
    if (Date.now() - admin.ts > 8 * 60 * 60 * 1000) {
      localStorage.removeItem("pv_admin");
      navigate("/admin/login", { replace: true });
      return;
    }
    // Verificar rol si se especificaron roles permitidos
    if (rolesPermitidos && !rolesPermitidos.includes(admin.rol)) {
      navigate("/admin", { replace: true });
    }
  }, [navigate, admin, rolesPermitidos]);

  if (!admin) return null;

  return children;
};

export default AdminProtectedRoute;
