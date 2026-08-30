import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../lib/types";

export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const redirectMap: Record<Role, string> = { PATIENT: "/dashboard", DOCTOR: "/doctor", ADMIN: "/admin" };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <Outlet />;
}
