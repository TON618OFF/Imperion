import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  difficulty: string;
  type: string;
  order_index: number;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
};

export default function Lessons() {
  const { user } = useAuth();

  const statusMeta = (status: string) => {
    switch (status) {
      case "завершён":
        return {
          label: "Завершён",
          className: "bg-primary/10 text-primary border-primary/20",
        };
      case "в_процессе":
        return {
          label: "В процессе",
          className: "bg-secondary/60 text-foreground border-border",
        };
      default:
        return {
          label: "Не начат",
          className: "bg-muted/60 text-muted-foreground border-border",
        };
    }
  };

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, slug, title, description, language, difficulty, type, order_index",
        )
        .eq("published", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson_progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });

  const progressByLessonId = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p.status] as const),
  );

  const languages = useMemo(() => {
    const map = new Map<string, LessonRow[]>();
    for (const l of lessons ?? []) {
      const key = l.language;
      const prev = map.get(key) ?? [];
      prev.push(l);
      map.set(key, prev);
    }
    return Array.from(map.entries()).map(([language, items]) => ({
      language,
      items,
    }));
  }, [lessons]);

  if (isLoading)
    return <div className="text-muted-foreground">Загрузка уроков…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">
            Уроки <span className="text-gradient-gold">с практикой</span>
          </h1>
          <div className="text-muted-foreground max-w-2xl">
            Выбирай язык, проходи уровни от лёгких к сложным. Завершение и XP
            доступны только после успешного выполнения.
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {languages.map(({ language, items }) => {
          const total = items.length;
          const completed = items.filter(
            (l) => (progressByLessonId.get(l.id) ?? "не_начат") === "завершён",
          ).length;
          const inProgress = items.filter(
            (l) =>
              (progressByLessonId.get(l.id) ?? "не_начат") === "в_процессе",
          ).length;

          const preview = items
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .slice(0, 3);

          return (
            <Card
              key={language}
              className="group relative overflow-hidden bg-card/60 backdrop-blur border border-border rounded-2xl transition-all duration-300 hover:border-primary/30 hover:shadow-gold-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {language.toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Уровни: лёгкий → средний → сложный · Всего: {total}
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      statusMeta(
                        completed === total && total > 0
                          ? "завершён"
                          : inProgress > 0
                            ? "в_процессе"
                            : "не_начат",
                      ).className
                    }
                  >
                    {completed}/{total}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    Завершено: {completed}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-secondary/50 text-foreground border-border"
                  >
                    В процессе: {inProgress}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-secondary/50 text-foreground border-border"
                  >
                    Не начато: {Math.max(0, total - completed - inProgress)}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {preview.map((l) => {
                    const st = progressByLessonId.get(l.id) ?? "не_начат";
                    const meta = statusMeta(st);
                    return (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2"
                      >
                        <div className="text-sm truncate">{l.title}</div>
                        <Badge variant="outline" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                <Button asChild variant="imperial" className="w-full">
                  <Link to={`/app/lessons/${language}`}>Открыть раздел</Link>
                </Button>
              </CardContent>

              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
