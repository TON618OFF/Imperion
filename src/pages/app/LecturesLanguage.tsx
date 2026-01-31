import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function LecturesLanguage() {
  const { language } = useParams();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("order");

  const { data: lectures, isLoading } = useQuery({
    queryKey: ["lectures", language],
    enabled: !!language,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, slug, title, summary, language, order_index")
        .eq("published", true)
        .eq("language", language)
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

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();

    const filtered = (lectures ?? []).filter((l) => {
      const completed = progressByLectureId.get(l.id) ?? false;
      if (status !== "all") {
        if (status === "completed" && !completed) return false;
        if (status === "not_completed" && completed) return false;
      }

      if (!query) return true;
      const hay = `${l.title} ${l.summary ?? ""}`.toLowerCase();
      return hay.includes(query);
    });

    const sorted = [...filtered];

    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "status") {
      sorted.sort((a, b) => {
        const ca = progressByLectureId.get(a.id) ?? false;
        const cb = progressByLectureId.get(b.id) ?? false;
        return Number(cb) - Number(ca);
      });
    } else {
      sorted.sort((a, b) => a.order_index - b.order_index);
    }

    return sorted;
  }, [lectures, q, status, sort, progressByLectureId]);

  const languageTitle = (language ?? "").toUpperCase();

  if (isLoading) return <div className="text-muted-foreground">Загрузка лекций…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black">
            Лекции · <span className="text-gradient-gold">{languageTitle}</span>
          </h1>
          <div className="text-muted-foreground max-w-2xl">Структурированные конспекты. XP выдаётся только за первое завершение.</div>
        </div>

        <Button asChild variant="outline">
          <Link to="/app/lectures">К языкам</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по лекциям…" />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="completed">Прочитано</SelectItem>
            <SelectItem value="not_completed">Не прочитано</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">По порядку</SelectItem>
            <SelectItem value="title">По названию</SelectItem>
            <SelectItem value="status">Сначала непрочитанные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((l) => {
          const completed = progressByLectureId.get(l.id) ?? false;
          return (
            <Card key={l.id} className="bg-card/60 backdrop-blur border border-border rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{l.title}</CardTitle>
                    {l.summary ? <CardDescription>{l.summary}</CardDescription> : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      completed
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/60 text-muted-foreground border-border"
                    }
                  >
                    {completed ? "Прочитано" : "Не прочитано"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Формат: блоки + примеры + мини-выводы</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {l.language}
                  </Badge>
                </div>

                <Button asChild variant="imperial" className="w-full">
                  <Link to={`/app/lectures/${language}/${l.slug}`}>Открыть</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {items.length === 0 ? <div className="text-muted-foreground">Ничего не найдено.</div> : null}
      </div>
    </div>
  );
}
