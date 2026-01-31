import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { pistonExecute, type PistonLanguage } from "@/lib/piston";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  language: PistonLanguage;
};

type LessonItemRow = {
  id: string;
  lesson_id: string;
  content_markdown: string | null;
  starter_code: string | null;
  tests: any;
};

type SubmissionRow = {
  id: string;
  created_at: string;
  language: string;
  code: string;
  stdin: string | null;
  piston_result: any;
  passed: boolean | null;
};

export default function LessonDetail() {
  const { slug, language } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["lesson", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, slug, title, description, type, difficulty, language")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as LessonRow;
    },
  });

  const { data: item } = useQuery({
    queryKey: ["lesson_items_first", lesson?.id],
    enabled: !!lesson?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_items")
        .select("id, lesson_id, content_markdown, starter_code, tests")
        .eq("lesson_id", lesson!.id)
        .order("order_index", { ascending: true })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as LessonItemRow | null;
    },
  });

  const initialCode = useMemo(() => {
    if (item?.starter_code) return item.starter_code;
    if (!lesson) return "";
    switch (lesson.language) {
      case "python":
        return 'print("Hello, world!")\n';
      case "javascript":
        return "console.log('Hello, world!');\n";
      case "cpp":
        return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  cout << "Hello, world!" << endl;\n  return 0;\n}\n';
      case "c":
        return '#include <stdio.h>\n\nint main(){\n  printf("Hello, world!\\n");\n  return 0;\n}\n';
      case "go":
        return 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, world!")\n}\n';
    }
  }, [item?.starter_code, lesson]);

  const [code, setCode] = useState<string>("");
  const [stdin, setStdin] = useState<string>("");
  const [activeIO, setActiveIO] = useState<string>("output");
  const [runResult, setRunResult] = useState<{
    stdout?: string;
    stderr?: string;
    output?: string;
    code?: number;
    signal?: string;
  } | null>(null);

  useEffect(() => {
    setCode((prev) => (prev ? prev : initialCode));
  }, [initialCode]);

  const { data: submissions } = useQuery({
    queryKey: ["code_submissions", user?.id, lesson?.id],
    enabled: !!user?.id && !!lesson?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("code_submissions")
        .select("id, created_at, language, code, stdin, piston_result, passed")
        .eq("user_id", user!.id)
        .eq("lesson_id", lesson!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as SubmissionRow[];
    },
  });

  const expectedStdout = (item?.tests?.expected_stdout ?? null) as
    | string
    | null;

  const normalize = (s: string) => {
    const x = (s ?? "").replace(/\r\n/g, "\n");
    return x.replace(/[\s\n]+$/g, "");
  };

  const lastSubmissionPassed = !!(submissions ?? []).some((s) => s.passed);

  const languageExtensions = useMemo(() => {
    switch (lesson?.language) {
      case "python":
        return [python()];
      case "javascript":
        return [javascript()];
      case "cpp":
        return [cpp()];
      case "c":
        return [cpp()];
      case "go":
        return [];
      default:
        return [];
    }
  }, [lesson?.language]);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!lesson) throw new Error("Lesson is not loaded");
      if (!user) throw new Error("Not authenticated");

      const result = await pistonExecute({
        language: lesson.language,
        code,
        stdin,
      });

      const computedPassed =
        typeof expectedStdout === "string" && expectedStdout.length > 0
          ? normalize(result.stdout ?? result.output ?? "") ===
              normalize(expectedStdout) &&
            normalize(result.stderr ?? "") === "" &&
            (result.code ?? 0) === 0
          : false;

      const { error: insertError } = await supabase
        .from("code_submissions")
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          item_id: item?.id ?? null,
          language: lesson.language,
          code,
          stdin,
          piston_result: result,
          passed: computedPassed,
          score: null,
        });
      if (insertError) throw insertError;

      const { data: existingProgress, error: existingProgressError } =
        await supabase
          .from("user_lesson_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("lesson_id", lesson.id)
          .maybeSingle();
      if (existingProgressError) throw existingProgressError;

      if ((existingProgress?.status ?? "не_начат") !== "завершён") {
        const nowIso = new Date().toISOString();
        const { error: progressError } = await supabase
          .from("user_lesson_progress")
          .upsert({
            user_id: user.id,
            lesson_id: lesson.id,
            status: "в_процессе",
            started_at: nowIso,
            last_attempt_at: nowIso,
            updated_at: nowIso,
          });
        if (progressError) throw progressError;
      }

      return result;
    },
    onSuccess: (result) => {
      setRunResult(result);
      setActiveIO("output");
      qc.invalidateQueries({ queryKey: ["lesson_progress", user?.id] });
      qc.invalidateQueries({
        queryKey: ["code_submissions", user?.id, lesson?.id],
      });
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Не удалось выполнить код",
        description: e?.message ?? String(e),
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!lesson) throw new Error("Lesson is not loaded");
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("complete_lesson", {
        p_lesson_id: lesson.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Урок завершён",
        description: "Начисление XP и серия обновятся автоматически.",
      });
      qc.invalidateQueries({ queryKey: ["user_xp", user?.id] });
      qc.invalidateQueries({ queryKey: ["user_streaks", user?.id] });
      qc.invalidateQueries({ queryKey: ["lesson_progress", user?.id] });
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Не удалось завершить урок",
        description: e?.message ?? String(e),
      });
    },
  });

  if (lessonLoading) {
    return <div className="text-muted-foreground">Загрузка урока…</div>;
  }

  if (!lesson) {
    return (
      <div className="space-y-4">
        <div>Урок не найден</div>
        <Button asChild variant="outline">
          <Link to="/app/lessons">Назад к урокам</Link>
        </Button>
      </div>
    );
  }

  const metaBadge = (text: string) => (
    <Badge
      variant="secondary"
      className="bg-primary/10 text-primary border-primary/20"
    >
      {text}
    </Badge>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black">
            {lesson.title}{" "}
            <span className="text-gradient-gold">· практика</span>
          </h1>
          {lesson.description ? (
            <div className="text-muted-foreground max-w-2xl">
              {lesson.description}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {metaBadge(lesson.language)}
            <Badge
              variant="secondary"
              className="bg-secondary/50 text-foreground border-border"
            >
              {lesson.difficulty}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-secondary/50 text-foreground border-border"
            >
              {lesson.type}
            </Badge>
            {runMutation.isPending ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse">
                Выполняется…
              </Badge>
            ) : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link
            to={
              lesson?.language
                ? `/app/lessons/${lesson.language}`
                : "/app/lessons"
            }
          >
            К списку
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Материал</CardTitle>
            <CardDescription>Теория/условие задания</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {item?.content_markdown ?? ""}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Редактор</CardTitle>
              <CardDescription>Запуск в песочнице Piston</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeMirror
                value={code}
                height="320px"
                extensions={languageExtensions}
                theme={oneDark}
                onChange={(v) => setCode(v)}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || !lesson || !user}
                >
                  Запустить
                </Button>
                <Button
                  variant="imperial"
                  onClick={() => completeMutation.mutate()}
                  disabled={
                    completeMutation.isPending ||
                    !lesson ||
                    !user ||
                    !lastSubmissionPassed
                  }
                >
                  Завершить урок
                </Button>
              </div>

              {expectedStdout ? (
                <div className="text-xs text-muted-foreground">
                  Проверка: stdout должен совпасть с ожидаемым выводом
                  (игнорируя конечные пробелы/переводы строк).
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Проверка: для этого урока ещё не настроен expected output —
                  завершение будет недоступно.
                </div>
              )}

              <Separator className="bg-primary/10" />

              <Tabs value={activeIO} onValueChange={setActiveIO}>
                <TabsList className="bg-secondary/50 border border-border">
                  <TabsTrigger value="stdin">stdin</TabsTrigger>
                  <TabsTrigger value="output">output</TabsTrigger>
                </TabsList>

                <TabsContent value="stdin" className="mt-4">
                  <Textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="Ввод для программы (опционально)"
                    className="font-mono"
                  />
                </TabsContent>

                <TabsContent value="output" className="mt-4 space-y-3">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">stdout</div>
                    <Textarea
                      value={runResult?.stdout ?? ""}
                      readOnly
                      className="font-mono min-h-[100px]"
                      placeholder="stdout"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">stderr</div>
                    <Textarea
                      value={runResult?.stderr ?? ""}
                      readOnly
                      className="font-mono min-h-[100px]"
                      placeholder="stderr"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    exit code: {runResult?.code ?? "-"}
                    {runResult?.signal ? ` · signal: ${runResult.signal}` : ""}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Последние запуски</CardTitle>
              <CardDescription>
                Нажми на строку, чтобы восстановить код/ввод/результат
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[260px] rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Время</TableHead>
                      <TableHead>Язык</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(submissions ?? []).map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setCode(s.code);
                          setStdin(s.stdin ?? "");
                          setRunResult(s.piston_result ?? null);
                          setActiveIO("output");
                        }}
                      >
                        <TableCell>
                          {new Date(s.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{s.language}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              s.passed
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted/60 text-muted-foreground border-border"
                            }
                          >
                            {s.passed ? "passed" : "failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs">
                          {s.code}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
