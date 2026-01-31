import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function MentorLayout() {
  const { signOut, user } = useAuth();

  const { data: profile } = useQuery({
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

  const userRole = profile?.role || "пользователь";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px] animate-pulse-gold" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <header className="relative z-10 border-b border-primary/10 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/app"
              className="font-bold text-foreground flex items-center gap-2"
            >
              <span className="text-gradient-gold">Imperion</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-500">
                Панель ментора
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-4 text-sm">
              <NavLink
                to="/mentor"
                className="text-muted-foreground hover:text-foreground"
                activeClassName="text-primary"
              >
                Управление контентом
              </NavLink>
              {userRole === "администратор" && (
                <NavLink
                  to="/admin"
                  className="text-muted-foreground hover:text-foreground"
                  activeClassName="text-primary"
                >
                  Админ-панель
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться в приложение
              </Link>
            </Button>
            <div className="hidden sm:block text-sm text-muted-foreground">
              {user?.email}
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
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
