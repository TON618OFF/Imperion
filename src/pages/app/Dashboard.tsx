import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: xp } = useQuery({
    queryKey: ["user_xp", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_xp")
        .select("xp, level")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: streak } = useQuery({
    queryKey: ["user_streaks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_streaks")
        .select("current_streak, best_streak")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать</CardTitle>
          <CardDescription>Базовая панель прогресса</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">Пользователь: {user?.email}</div>
          <div className="text-sm">Уровень: {xp?.level ?? 1}</div>
          <div className="text-sm">Опыт: {xp?.xp ?? 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Серия обучения</CardTitle>
          <CardDescription>Дни подряд</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">Текущая серия: {streak?.current_streak ?? 0}</div>
          <div className="text-sm">Лучшая серия: {streak?.best_streak ?? 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}
