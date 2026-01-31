import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка…</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
