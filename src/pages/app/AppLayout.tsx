import { Outlet, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Shield, GraduationCap } from "lucide-react";

export default function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["user_role", user?.id],
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
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });

  const userRole = profile?.role || "пользователь";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-dark overflow-hidden" />
      <div className="absolute inset-0 opacity-30 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-gold" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03] overflow-hidden pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <header className="relative z-10 border-b border-primary/10 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink
              to="/app"
              className="font-bold text-foreground"
              activeClassName="text-primary"
            >
              <span className="text-gradient-gold">Imperion</span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-4 text-sm">
              <NavLink
                to="/app/lessons"
                className="text-muted-foreground hover:text-foreground"
                activeClassName="text-primary"
              >
                Уроки
              </NavLink>
              <NavLink
                to="/app/lectures"
                className="text-muted-foreground hover:text-foreground"
                activeClassName="text-primary"
              >
                Лекции
              </NavLink>
              <NavLink
                to="/app/achievements"
                className="text-muted-foreground hover:text-foreground"
                activeClassName="text-primary"
              >
                Достижения
              </NavLink>
              <NavLink
                to="/app/profile"
                className="text-muted-foreground hover:text-foreground"
                activeClassName="text-primary"
              >
                Профиль
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {(userRole === "ментор" || userRole === "администратор") && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/mentor" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden lg:inline">Панель ментора</span>
                </Link>
              </Button>
            )}
            {userRole === "администратор" && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden lg:inline">Админ-панель</span>
                </Link>
              </Button>
            )}
            <div className="hidden sm:block text-sm text-muted-foreground">
              {user?.email}
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-10 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
