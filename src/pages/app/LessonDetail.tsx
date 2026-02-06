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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Play, Trophy, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

type TestCase = {
  input?: string;
  expected_output: string;
  description?: string;
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
  const [activeTab, setActiveTab] = useState<string>("result");
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    details: Array<{
      passed: boolean;
      expected: string;
      got: string;
      description?: string;
    }>;
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

  // Получаем тестовые случаи из данных урока
  const testCases: TestCase[] = useMemo(() => {
    if (!item?.tests) return [];

    // Поддержка старого формата (expected_stdout)
    if (
      item.tests.expected_stdout &&
      typeof item.tests.expected_stdout === "string"
    ) {
      return [
        {
          expected_output: item.tests.expected_stdout,
          description: "Основной тест",
        },
      ];
    }

    // Новый формат с массивом тестов
    if (Array.isArray(item.tests.test_cases)) {
      return item.tests.test_cases;
    }

    return [];
  }, [item?.tests]);

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

      // Запускаем тесты
      const results = [];
      let passedCount = 0;

      for (const testCase of testCases) {
        const result = await pistonExecute({
          language: lesson.language,
          code,
          stdin: testCase.input || "",
        });

        const output = normalize(result.stdout ?? result.output ?? "");
        const expectedOutput = normalize(testCase.expected_output);
        const passed = output === expectedOutput && (result.code ?? 0) === 0;

        if (passed) passedCount++;

        results.push({
          passed,
          expected: testCase.expected_output,
          got: result.stdout ?? result.output ?? "",
          description: testCase.description,
          stderr: result.stderr,
          exitCode: result.code,
        });
      }

      const allPassed =
        passedCount === testCases.length && testCases.length > 0;

      // Сохраняем submission
      const { error: insertError } = await supabase
        .from("code_submissions")
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          item_id: item?.id ?? null,
          language: lesson.language,
          code,
          stdin: "",
          piston_result: results,
          passed: allPassed,
          score: allPassed
            ? 100
            : Math.round((passedCount / testCases.length) * 100),
        });
      if (insertError) throw insertError;

      // Обновляем прогресс
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
            status: allPassed ? "завершён" : "в_процессе",
            started_at: nowIso,
            last_attempt_at: nowIso,
            updated_at: nowIso,
          });
        if (progressError) throw progressError;
      }

      return { passedCount, totalCount: testCases.length, results };
    },
    onSuccess: (result) => {
      setTestResults({
        passed: result.passedCount,
        total: result.totalCount,
        details: result.results,
      });
      setActiveTab("result");
      qc.invalidateQueries({ queryKey: ["lesson_progress", user?.id] });
      qc.invalidateQueries({
        queryKey: ["code_submissions", user?.id, lesson?.id],
      });

      if (result.passedCount === result.totalCount && result.totalCount > 0) {
        toast({
          title: "🎉 Все тесты пройдены!",
          description: "Отличная работа! Вы можете завершить урок.",
        });
      } else {
        toast({
          title: "Тесты не пройдены",
          description: `Пройдено ${result.passedCount} из ${result.totalCount} тестов. Попробуйте еще раз!`,
          variant: "destructive",
        });
      }
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
        title: "🏆 Урок завершён!",
        description: "XP начислен. Продолжайте обучение!",
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

  const canComplete =
    testResults &&
    testResults.passed === testResults.total &&
    testResults.total > 0;

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
            {testCases.length > 0 && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                {testCases.length} {testCases.length === 1 ? "тест" : "тестов"}
              </Badge>
            )}
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
            <CardTitle>Условие задачи</CardTitle>
            <CardDescription>Внимательно прочитайте требования</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ node, className, children, ...props }) => {
                    const isBlock = Boolean(className?.toString().startsWith("language-"));
                    if (isBlock) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className="bg-yellow-500/35 text-yellow-200 font-mono text-[0.9em]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {(() => {
                  const raw = item?.content_markdown ?? "";
                  // Двойные тильды ~~...~~ трактуем как инлайн-код (в GFM ~~ — зачёркивание)
                  const withCodeTildes = raw.replace(/~~([^~]+)~~/g, "`$1`");
                  return withCodeTildes;
                })()}
              </ReactMarkdown>
            </div>

            {testCases.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Примеры тестов:</h3>
                  {testCases.slice(0, 3).map((test, idx) => (
                    <Card key={idx} className="bg-muted/50">
                      <CardContent className="pt-4">
                        {test.description && (
                          <div className="text-sm font-medium mb-2">
                            {test.description}
                          </div>
                        )}
                        {test.input && (
                          <div className="mb-2">
                            <div className="text-xs text-muted-foreground mb-1">
                              Ввод:
                            </div>
                            <code className="text-xs bg-background p-2 rounded block">
                              {test.input}
                            </code>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Ожидаемый вывод:
                          </div>
                          <code className="text-xs bg-background p-2 rounded block">
                            {test.expected_output}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {testCases.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      + еще {testCases.length - 3} скрытых тестов
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Редактор кода</CardTitle>
              <CardDescription>
                Напишите решение и запустите тесты
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeMirror
                value={code}
                height="400px"
                extensions={languageExtensions}
                theme={oneDark}
                onChange={(v) => setCode(v)}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => runMutation.mutate()}
                  disabled={
                    runMutation.isPending ||
                    !lesson ||
                    !user ||
                    testCases.length === 0
                  }
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Запустить тесты
                </Button>
                <Button
                  variant="default"
                  className="bg-gradient-primary"
                  onClick={() => completeMutation.mutate()}
                  disabled={
                    completeMutation.isPending ||
                    !lesson ||
                    !user ||
                    !canComplete
                  }
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Завершить урок
                </Button>
              </div>

              {testCases.length === 0 && (
                <Alert>
                  <AlertTitle>Тесты не настроены</AlertTitle>
                  <AlertDescription>
                    Для этого урока еще не добавлены тестовые случаи. Обратитесь
                    к ментору.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader>
              <CardTitle>Результаты</CardTitle>
              <CardDescription>
                {testResults
                  ? `${testResults.passed} из ${testResults.total} тестов пройдено`
                  : "Запустите тесты для проверки решения"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-secondary/50 border border-border">
                  <TabsTrigger value="result">Результаты</TabsTrigger>
                  <TabsTrigger value="history">История</TabsTrigger>
                </TabsList>

                <TabsContent value="result" className="mt-4 space-y-3">
                  {testResults ? (
                    <div className="space-y-3">
                      {testResults.details.map((result, idx) => (
                        <Card
                          key={idx}
                          className={`${result.passed ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              {result.passed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 space-y-2">
                                <div className="font-medium">
                                  Тест #{idx + 1}{" "}
                                  {result.description
                                    ? `- ${result.description}`
                                    : ""}
                                </div>
                                {!result.passed && (
                                  <>
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">
                                        Ожидалось:
                                      </div>
                                      <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                                        {result.expected}
                                      </code>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">
                                        Получено:
                                      </div>
                                      <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                                        {result.got}
                                      </code>
                                    </div>
                                    {result.stderr && (
                                      <div className="space-y-1">
                                        <div className="text-xs text-red-400">
                                          Ошибки:
                                        </div>
                                        <code className="text-xs bg-background p-2 rounded block overflow-x-auto text-red-400">
                                          {result.stderr}
                                        </code>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Нажмите "Запустить тесты" для проверки вашего решения
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    {submissions && submissions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Clock className="w-4 h-4 inline mr-1" />
                              Время
                            </TableHead>
                            <TableHead>Результат</TableHead>
                            <TableHead>Действие</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-xs">
                                {new Date(s.created_at).toLocaleString("ru-RU")}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={s.passed ? "default" : "destructive"}
                                  className={
                                    s.passed
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : ""
                                  }
                                >
                                  {s.passed ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Пройдено
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 mr-1" />
                                      {s.piston_result?.score || 0}%
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setCode(s.code);
                                  }}
                                >
                                  Восстановить
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        История попыток пуста
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
