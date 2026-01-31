import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

type RoleProtectedRouteProps = {
  allowedRoles: string[];
  redirectTo?: string;
};

export default function RoleProtectedRoute({
  allowedRoles,
  redirectTo = "/app",
}: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const userRole = profile?.role || "пользователь";

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
