import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type LectureRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  language: string;
};

type LectureSectionRow = {
  id: string;
  lecture_id: string;
  title: string | null;
  content_markdown: string;
};

export default function LectureDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: lecture, isLoading } = useQuery({
    queryKey: ["lecture", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, slug, title, summary, language")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as LectureRow;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["lecture_sections", lecture?.id],
    enabled: !!lecture?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lecture_sections")
        .select("id, lecture_id, title, content_markdown")
        .eq("lecture_id", lecture!.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LectureSectionRow[];
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const lastSectionId = sections?.[sections.length - 1]?.id ?? null;

      const { error } = await supabase.rpc("complete_lecture", {
        p_lecture_id: lecture!.id,
        p_last_section_id: lastSectionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Лекция завершена", description: "XP начислится автоматически." });
      qc.invalidateQueries({ queryKey: ["user_xp", user?.id] });
      qc.invalidateQueries({ queryKey: ["lecture_progress", user?.id] });
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Не удалось обновить прогресс",
        description: e?.message ?? String(e),
      });
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Загрузка лекции…</div>;
  if (!lecture) {
    return (
      <div className="space-y-4">
        <div>Лекция не найдена</div>
        <Button asChild variant="outline">
          <Link to="/app/lectures">Назад к лекциям</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">
            {lecture.title} <span className="text-gradient-gold">· теория</span>
          </h1>
          {lecture.summary ? <div className="text-muted-foreground max-w-2xl">{lecture.summary}</div> : null}
          <div className="mt-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {lecture.language}
            </Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to={lecture?.language ? `/app/lectures/${lecture.language}` : "/app/lectures"}>К списку</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {(sections ?? []).map((s) => (
          <Card key={s.id} className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="group-hover:text-primary transition-colors">{s.title ?? "Раздел"}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content_markdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="imperial" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
          Отметить как прочитано
        </Button>
      </div>
    </div>
  );
}
