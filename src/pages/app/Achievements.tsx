import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AchievementRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  rarity: string;
  points: number;
};

type UserAchievementRow = {
  achievement_id: string;
  earned_at: string;
};

export default function Achievements() {
  const { user } = useAuth();

  const rarityBadge = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "bg-primary/15 text-primary border-primary/30";
      case "epic":
        return "bg-secondary/60 text-foreground border-border";
      case "rare":
        return "bg-secondary/60 text-foreground border-border";
      default:
        return "bg-muted/60 text-muted-foreground border-border";
    }
  };

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id, slug, title, description, rarity, points")
        .eq("published", true)
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AchievementRow[];
    },
  });

  const { data: earned } = useQuery({
    queryKey: ["user_achievements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as UserAchievementRow[];
    },
  });

  const earnedById = new Map((earned ?? []).map((x) => [x.achievement_id, x.earned_at] as const));

  if (isLoading) return <div className="text-muted-foreground">Загрузка достижений…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-black">
          Достижения <span className="text-gradient-gold">и награды</span>
        </h1>
        <div className="text-muted-foreground max-w-2xl">Награды за прогресс, лекции и серии обучения.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(achievements ?? []).map((a) => {
          const earnedAt = earnedById.get(a.id);
          return (
            <Card
              key={a.id}
              className={
                "group relative bg-card/60 backdrop-blur border border-border rounded-2xl transition-all duration-300 hover:border-primary/30 hover:shadow-gold-sm " +
                (earnedAt ? "border-primary/40" : "opacity-80")
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{a.title}</CardTitle>
                  <Badge variant="outline" className={rarityBadge(a.rarity)}>
                    {a.rarity}
                  </Badge>
                </div>
                <CardDescription>{a.description ?? ""}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    +{a.points} XP
                  </Badge>
                  {earnedAt ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      получено
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted/60 text-muted-foreground border-border">
                      не получено
                    </Badge>
                  )}
                </div>
              </CardContent>

              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
