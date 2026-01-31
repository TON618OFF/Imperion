import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";

type LectureRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  language: string;
  order_index: number;
};

type LectureProgressRow = {
  lecture_id: string;
  completed: boolean;
};

export default function Lectures() {
  const { user } = useAuth();

  const { data: lectures, isLoading } = useQuery({
    queryKey: ["lectures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, slug, title, summary, language, order_index")
        .eq("published", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lecture_progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lecture_progress")
        .select("lecture_id, completed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as LectureProgressRow[];
    },
  });

  const progressByLectureId = useMemo(
    () => new Map((progress ?? []).map((p) => [p.lecture_id, p.completed] as const)),
    [progress],
  );

  const languages = useMemo(() => {
    const map = new Map<string, LectureRow[]>();
    for (const l of lectures ?? []) {
      const key = l.language;
      const prev = map.get(key) ?? [];
      prev.push(l);
      map.set(key, prev);
    }
    return Array.from(map.entries()).map(([language, items]) => ({ language, items }));
  }, [lectures]);

  if (isLoading) return <div className="text-muted-foreground">Загрузка лекций…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-black">
          Лекции <span className="text-gradient-gold">и конспекты</span>
        </h1>
        <div className="text-muted-foreground max-w-2xl">Теория по языкам и темам — коротко, структурировано, с примерами.</div>
      </div>

      <div className="space-y-4">
        {languages.map(({ language, items }) => {
          const total = items.length;
          const completed = items.filter((l) => progressByLectureId.get(l.id) ?? false).length;
          const preview = items
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .slice(0, 4);

          return (
            <Card
              key={language}
              className="relative overflow-hidden bg-card/60 backdrop-blur border border-border rounded-2xl"
            >
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {language.toUpperCase()} <span className="text-gradient-gold">· лекции</span>
                    </CardTitle>
                    <CardDescription>Прочитано: {completed}/{total} · XP выдаётся только один раз за лекцию</CardDescription>
                  </div>

                  <Button asChild variant="imperial">
                    <Link to={`/app/lectures/${language}`}>Открыть раздел</Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="grid gap-3 md:grid-cols-2">
                {preview.map((l) => {
                  const isDone = progressByLectureId.get(l.id) ?? false;
                  return (
                    <div
                      key={l.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{l.title}</div>
                        {l.summary ? <div className="text-xs text-muted-foreground">{l.summary}</div> : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isDone
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }
                      >
                        {isDone ? "Прочитано" : "Не прочитано"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>

              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
