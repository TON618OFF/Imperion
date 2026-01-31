import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  difficulty: string;
  type: string;
  order_index: number;
  estimated_minutes: number | null;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
};

const difficultyRank: Record<string, number> = {
  лёгкий: 1,
  средний: 2,
  сложный: 3,
};

export default function LessonsLanguage() {
  const { language } = useParams();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("order");

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons", language],
    enabled: !!language,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, slug, title, description, language, difficulty, type, order_index, estimated_minutes",
        )
        .eq("published", true)
        .eq("language", language)
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

  const progressByLessonId = useMemo(
    () =>
      new Map((progress ?? []).map((p) => [p.lesson_id, p.status] as const)),
    [progress],
  );

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();

    const filtered = (lessons ?? []).filter((l) => {
      if (difficulty !== "all" && l.difficulty !== difficulty) return false;

      const st = progressByLessonId.get(l.id) ?? "не_начат";
      if (status !== "all" && st !== status) return false;

      if (!query) return true;
      const hay = `${l.title} ${l.description ?? ""}`.toLowerCase();
      return hay.includes(query);
    });

    const sorted = [...filtered];

    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "difficulty") {
      sorted.sort(
        (a, b) =>
          (difficultyRank[a.difficulty] ?? 99) -
          (difficultyRank[b.difficulty] ?? 99),
      );
    } else if (sort === "status") {
      const rank: Record<string, number> = {
        завершён: 1,
        в_процессе: 2,
        не_начат: 3,
      };
      sorted.sort((a, b) => {
        const sa = progressByLessonId.get(a.id) ?? "не_начат";
        const sb = progressByLessonId.get(b.id) ?? "не_начат";
        return (rank[sa] ?? 99) - (rank[sb] ?? 99);
      });
    } else {
      sorted.sort((a, b) => a.order_index - b.order_index);
    }

    return sorted;
  }, [lessons, q, difficulty, status, sort, progressByLessonId]);

  const statusMeta = (s: string) => {
    switch (s) {
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

  const languageTitle = (language ?? "").toUpperCase();

  if (isLoading)
    return <div className="text-muted-foreground">Загрузка уроков…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black">
            Уроки · <span className="text-gradient-gold">{languageTitle}</span>
          </h1>
          <div className="text-muted-foreground max-w-2xl">
            Вертикальная карта уровней: от простого к сложному. Доступ к
            завершению открывается только после успешного запуска.
          </div>
        </div>

        <Button asChild variant="outline">
          <Link to="/app/lessons">К языкам</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по урокам…"
        />

        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger>
            <SelectValue placeholder="Сложность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сложности</SelectItem>
            <SelectItem value="лёгкий">Лёгкий</SelectItem>
            <SelectItem value="средний">Средний</SelectItem>
            <SelectItem value="сложный">Сложный</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="не_начат">Не начат</SelectItem>
            <SelectItem value="в_процессе">В процессе</SelectItem>
            <SelectItem value="завершён">Завершён</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">По порядку</SelectItem>
            <SelectItem value="difficulty">По сложности</SelectItem>
            <SelectItem value="title">По названию</SelectItem>
            <SelectItem value="status">По прогрессу</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {items.map((l, idx) => {
          const st = progressByLessonId.get(l.id) ?? "не_начат";
          const meta = statusMeta(st);

          return (
            <div key={l.id} className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-primary/10" />

              <div className="relative pl-12">
                <div className="absolute left-0 top-5 h-8 w-8 rounded-full border border-border bg-card/80 backdrop-blur grid place-items-center text-sm font-semibold text-amber-200">
                  {idx + 1}
                </div>

                <Card className="group bg-card/60 backdrop-blur border border-border rounded-2xl transition-all duration-300 hover:border-primary/30 hover:shadow-gold-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {l.title}
                        </CardTitle>
                        {l.description ? (
                          <CardDescription>{l.description}</CardDescription>
                        ) : null}
                      </div>
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-secondary/50 text-foreground border-border"
                      >
                        {l.difficulty}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-secondary/50 text-foreground border-border"
                      >
                        {l.type}
                      </Badge>
                      {typeof l.estimated_minutes === "number" ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          ~{l.estimated_minutes} мин
                        </Badge>
                      ) : null}
                    </div>

                    <Button asChild variant="imperial" className="w-full">
                      <Link to={`/app/lessons/${language}/${l.slug}`}>
                        Открыть уровень
                      </Link>
                    </Button>
                  </CardContent>

                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
                </Card>
              </div>
            </div>
          );
        })}

        {items.length === 0 ? (
          <div className="text-muted-foreground">
            Ничего не найдено по заданным фильтрам.
          </div>
        ) : null}
      </div>
    </div>
  );
}
