import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Save,
  FileText,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: string;
  language: string;
  order_index: number;
  estimated_minutes: number | null;
  published: boolean;
};

type Lecture = {
  id: string;
  slug: string;
  language: string;
  title: string;
  summary: string | null;
  order_index: number;
  published: boolean;
};

type LectureSection = {
  id: string;
  lecture_id: string;
  title: string | null;
  order_index: number;
  content_markdown: string;
};

type LessonItem = {
  id: string;
  lesson_id: string;
  order_index: number;
  content_markdown: string | null;
  starter_code: string | null;
  solution_code: string | null;
  tests: any;
  max_attempts: number | null;
};

type LessonHint = {
  id: string;
  item_id: string;
  order_index: number;
  hint_markdown: string;
  penalty_xp: number;
};

export default function MentorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lectureDialogOpen, setLectureDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [sectionsDialogOpen, setSectionsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [editingLessonForContent, setEditingLessonForContent] =
    useState<Lesson | null>(null);
  const [editingLectureForSections, setEditingLectureForSections] =
    useState<Lecture | null>(null);

  // Форма для урока
  const [lessonForm, setLessonForm] = useState({
    slug: "",
    title: "",
    description: "",
    type: "practice",
    difficulty: "лёгкий",
    language: "python",
    order_index: 0,
    estimated_minutes: 30,
    published: false,
  });

  // Форма для контента урока
  const [contentForm, setContentForm] = useState({
    content_markdown: "",
    starter_code: "",
    expected_stdout: "",
    hints: [] as string[],
  });

  // Форма для лекции
  const [lectureForm, setLectureForm] = useState({
    slug: "",
    language: "python",
    title: "",
    summary: "",
    order_index: 0,
    published: false,
  });

  // Форма для секций лекций
  const [sectionsForm, setSectionsForm] = useState<
    {
      title: string;
      content_markdown: string;
    }[]
  >([]);

  // Загрузка уроков
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["mentor_lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });

  // Загрузка контента урока (lesson_items и hints)
  const { data: lessonContent, refetch: refetchContent } = useQuery({
    queryKey: ["lesson_content", editingLessonForContent?.id],
    enabled: !!editingLessonForContent?.id,
    queryFn: async () => {
      if (!editingLessonForContent?.id) return null;

      // Получаем lesson_items
      const { data: items, error: itemsError } = await supabase
        .from("lesson_items")
        .select("*")
        .eq("lesson_id", editingLessonForContent.id)
        .order("order_index", { ascending: true });
      if (itemsError) throw itemsError;

      // Получаем hints для первого item
      let hints: LessonHint[] = [];
      if (items && items.length > 0) {
        const { data: hintsData, error: hintsError } = await supabase
          .from("lesson_hints")
          .select("*")
          .eq("item_id", items[0].id)
          .order("order_index", { ascending: true });
        if (hintsError) throw hintsError;
        hints = hintsData as LessonHint[];
      }

      return { items: items as LessonItem[], hints };
    },
  });

  // Загрузка лекций
  const { data: lectures, isLoading: lecturesLoading } = useQuery({
    queryKey: ["mentor_lectures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Lecture[];
    },
  });

  // Создание/обновление урока
  const lessonMutation = useMutation({
    mutationFn: async (lesson: typeof lessonForm & { id?: string }) => {
      if (lesson.id) {
        const { error } = await supabase
          .from("lessons")
          .update({
            slug: lesson.slug,
            title: lesson.title,
            description: lesson.description || null,
            type: lesson.type,
            difficulty: lesson.difficulty,
            language: lesson.language,
            order_index: lesson.order_index,
            estimated_minutes: lesson.estimated_minutes || null,
            published: lesson.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({
          slug: lesson.slug,
          title: lesson.title,
          description: lesson.description || null,
          type: lesson.type,
          difficulty: lesson.difficulty,
          language: lesson.language,
          order_index: lesson.order_index,
          estimated_minutes: lesson.estimated_minutes || null,
          published: lesson.published,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor_lessons"] });
      setLessonDialogOpen(false);
      setEditingLesson(null);
      resetLessonForm();
      toast({
        title: "Успешно",
        description: editingLesson ? "Урок обновлён" : "Урок создан",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  // Удаление урока
  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor_lessons"] });
      toast({
        title: "Успешно",
        description: "Урок удалён",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  // Создание/обновление лекции
  const lectureMutation = useMutation({
    mutationFn: async (lecture: typeof lectureForm & { id?: string }) => {
      if (lecture.id) {
        const { error } = await supabase
          .from("lectures")
          .update({
            slug: lecture.slug,
            language: lecture.language,
            title: lecture.title,
            summary: lecture.summary || null,
            order_index: lecture.order_index,
            published: lecture.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lecture.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lectures").insert({
          slug: lecture.slug,
          language: lecture.language,
          title: lecture.title,
          summary: lecture.summary || null,
          order_index: lecture.order_index,
          published: lecture.published,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor_lectures"] });
      setLectureDialogOpen(false);
      setEditingLecture(null);
      resetLectureForm();
      toast({
        title: "Успешно",
        description: editingLecture ? "Лекция обновлена" : "Лекция создана",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  // Удаление лекции
  const deleteLectureMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lectures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor_lectures"] });
      toast({
        title: "Успешно",
        description: "Лекция удалена",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const resetLessonForm = () => {
    setLessonForm({
      slug: "",
      title: "",
      description: "",
      type: "practice",
      difficulty: "лёгкий",
      language: "python",
      order_index: 0,
      estimated_minutes: 30,
      published: false,
    });
  };

  const resetContentForm = () => {
    setContentForm({
      content_markdown: "",
      starter_code: "",
      expected_stdout: "",
      hints: [],
    });
  };

  // Сохранение контента урока
  const saveContentMutation = useMutation({
    mutationFn: async () => {
      if (!editingLessonForContent) throw new Error("No lesson selected");

      // Удаляем старые данные
      const { error: deleteItemsError } = await supabase
        .from("lesson_items")
        .delete()
        .eq("lesson_id", editingLessonForContent.id);
      if (deleteItemsError) throw deleteItemsError;

      // Создаем новый lesson_item
      const { data: newItem, error: insertItemError } = await supabase
        .from("lesson_items")
        .insert({
          lesson_id: editingLessonForContent.id,
          order_index: 1,
          content_markdown: contentForm.content_markdown || null,
          starter_code: contentForm.starter_code || null,
          tests: { expected_stdout: contentForm.expected_stdout },
          max_attempts: null,
        })
        .select()
        .single();
      if (insertItemError) throw insertItemError;

      // Добавляем подсказки
      if (contentForm.hints.length > 0 && newItem) {
        const hintsToInsert = contentForm.hints
          .filter((h) => h.trim())
          .map((hint, index) => ({
            item_id: newItem.id,
            order_index: index + 1,
            hint_markdown: hint,
            penalty_xp: 0,
          }));

        if (hintsToInsert.length > 0) {
          const { error: hintsError } = await supabase
            .from("lesson_hints")
            .insert(hintsToInsert);
          if (hintsError) throw hintsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson_content"] });
      setContentDialogOpen(false);
      setEditingLessonForContent(null);
      resetContentForm();
      toast({
        title: "Успешно",
        description: "Контент урока сохранён",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  // Загрузка секций лекции
  const { data: lectureSections } = useQuery({
    queryKey: ["lecture_sections", editingLectureForSections?.id],
    enabled: !!editingLectureForSections?.id,
    queryFn: async () => {
      if (!editingLectureForSections?.id) return [];

      const { data, error } = await supabase
        .from("lecture_sections")
        .select("*")
        .eq("lecture_id", editingLectureForSections.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as LectureSection[];
    },
  });

  // Сохранение секций лекции
  const saveSectionsMutation = useMutation({
    mutationFn: async () => {
      if (!editingLectureForSections) throw new Error("No lecture selected");

      // Удаляем старые секции
      const { error: deleteError } = await supabase
        .from("lecture_sections")
        .delete()
        .eq("lecture_id", editingLectureForSections.id);
      if (deleteError) throw deleteError;

      // Добавляем новые секции
      if (sectionsForm.length > 0) {
        const sectionsToInsert = sectionsForm
          .filter((s) => s.title.trim() || s.content_markdown.trim())
          .map((section, index) => ({
            lecture_id: editingLectureForSections.id,
            title: section.title || null,
            order_index: index + 1,
            content_markdown: section.content_markdown,
          }));

        if (sectionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("lecture_sections")
            .insert(sectionsToInsert);
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lecture_sections"] });
      setSectionsDialogOpen(false);
      setEditingLectureForSections(null);
      setSectionsForm([]);
      toast({
        title: "Успешно",
        description: "Секции лекции сохранены",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const resetLectureForm = () => {
    setLectureForm({
      slug: "",
      language: "python",
      title: "",
      summary: "",
      order_index: 0,
      published: false,
    });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description || "",
      type: lesson.type,
      difficulty: lesson.difficulty,
      language: lesson.language,
      order_index: lesson.order_index,
      estimated_minutes: lesson.estimated_minutes || 30,
      published: lesson.published,
    });
    setLessonDialogOpen(true);
  };

  const handleEditLecture = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setLectureForm({
      slug: lecture.slug,
      language: lecture.language,
      title: lecture.title,
      summary: lecture.summary || "",
      order_index: lecture.order_index,
      published: lecture.published,
    });
    setLectureDialogOpen(true);
  };

  const handleSaveLesson = () => {
    if (editingLesson) {
      lessonMutation.mutate({ ...lessonForm, id: editingLesson.id });
    } else {
      lessonMutation.mutate(lessonForm);
    }
  };

  const handleSaveLecture = () => {
    if (editingLecture) {
      lectureMutation.mutate({ ...lectureForm, id: editingLecture.id });
    } else {
      lectureMutation.mutate(lectureForm);
    }
  };

  const handleManageContent = async (lesson: Lesson) => {
    setEditingLessonForContent(lesson);
    setContentDialogOpen(true);

    // Загружаем существующий контент
    const { data: items, error: itemsError } = await supabase
      .from("lesson_items")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("order_index", { ascending: true });

    if (!itemsError && items && items.length > 0) {
      const item = items[0] as LessonItem;

      // Загружаем подсказки
      const { data: hints, error: hintsError } = await supabase
        .from("lesson_hints")
        .select("*")
        .eq("item_id", item.id)
        .order("order_index", { ascending: true });

      setContentForm({
        content_markdown: item.content_markdown || "",
        starter_code: item.starter_code || "",
        expected_stdout: (item.tests as any)?.expected_stdout || "",
        hints:
          !hintsError && hints ? hints.map((h: any) => h.hint_markdown) : [],
      });
    } else {
      resetContentForm();
    }
  };

  const addHint = () => {
    setContentForm({
      ...contentForm,
      hints: [...contentForm.hints, ""],
    });
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...contentForm.hints];
    newHints[index] = value;
    setContentForm({
      ...contentForm,
      hints: newHints,
    });
  };

  const removeHint = (index: number) => {
    setContentForm({
      ...contentForm,
      hints: contentForm.hints.filter((_, i) => i !== index),
    });
  };

  const handleManageSections = async (lecture: Lecture) => {
    setEditingLectureForSections(lecture);
    setSectionsDialogOpen(true);

    // Загружаем существующие секции
    const { data: sections, error } = await supabase
      .from("lecture_sections")
      .select("*")
      .eq("lecture_id", lecture.id)
      .order("order_index", { ascending: true });

    if (!error && sections && sections.length > 0) {
      setSectionsForm(
        sections.map((s: any) => ({
          title: s.title || "",
          content_markdown: s.content_markdown || "",
        })),
      );
    } else {
      setSectionsForm([{ title: "", content_markdown: "" }]);
    }
  };

  const addSection = () => {
    setSectionsForm([...sectionsForm, { title: "", content_markdown: "" }]);
  };

  const updateSection = (
    index: number,
    field: "title" | "content_markdown",
    value: string,
  ) => {
    const newSections = [...sectionsForm];
    newSections[index][field] = value;
    setSectionsForm(newSections);
  };

  const removeSection = (index: number) => {
    setSectionsForm(sectionsForm.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">
            Панель <span className="text-gradient-gold">Ментора</span>
          </h1>
          <div className="text-muted-foreground max-w-2xl">
            Управление уроками и лекциями платформы Imperion-Pro
          </div>
        </div>
      </div>

      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="lessons">
            <GraduationCap className="w-4 h-4 mr-2" />
            Уроки
          </TabsTrigger>
          <TabsTrigger value="lectures">
            <BookOpen className="w-4 h-4 mr-2" />
            Лекции
          </TabsTrigger>
        </TabsList>

        {/* Вкладка с уроками */}
        <TabsContent value="lessons" className="space-y-4">
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Управление уроками</CardTitle>
                <CardDescription>
                  Создавайте, редактируйте и удаляйте уроки
                </CardDescription>
              </div>
              <Dialog
                open={lessonDialogOpen}
                onOpenChange={(open) => {
                  setLessonDialogOpen(open);
                  if (!open) {
                    setEditingLesson(null);
                    resetLessonForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="imperial">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать урок
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLesson ? "Редактировать урок" : "Создать урок"}
                    </DialogTitle>
                    <DialogDescription>
                      Заполните форму для{" "}
                      {editingLesson ? "редактирования" : "создания"} урока
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-slug">Slug (URL)</Label>
                      <Input
                        id="lesson-slug"
                        value={lessonForm.slug}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, slug: e.target.value })
                        }
                        placeholder="hello-world-python"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-title">Название</Label>
                      <Input
                        id="lesson-title"
                        value={lessonForm.title}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            title: e.target.value,
                          })
                        }
                        placeholder="Hello World на Python"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-description">Описание</Label>
                      <Textarea
                        id="lesson-description"
                        value={lessonForm.description}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Научитесь выводить текст на экран"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-language">Язык</Label>
                        <Select
                          value={lessonForm.language}
                          onValueChange={(value) =>
                            setLessonForm({ ...lessonForm, language: value })
                          }
                        >
                          <SelectTrigger id="lesson-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="javascript">
                              JavaScript
                            </SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                            <SelectItem value="c">C</SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-difficulty">Сложность</Label>
                        <Select
                          value={lessonForm.difficulty}
                          onValueChange={(value) =>
                            setLessonForm({ ...lessonForm, difficulty: value })
                          }
                        >
                          <SelectTrigger id="lesson-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="лёгкий">Лёгкий</SelectItem>
                            <SelectItem value="средний">Средний</SelectItem>
                            <SelectItem value="сложный">Сложный</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-type">Тип</Label>
                        <Select
                          value={lessonForm.type}
                          onValueChange={(value) =>
                            setLessonForm({ ...lessonForm, type: value })
                          }
                        >
                          <SelectTrigger id="lesson-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="theory">Теория</SelectItem>
                            <SelectItem value="practice">Практика</SelectItem>
                            <SelectItem value="exam">Экзамен</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-minutes">Время (мин)</Label>
                        <Input
                          id="lesson-minutes"
                          type="number"
                          value={lessonForm.estimated_minutes}
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              estimated_minutes: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-order">Порядок</Label>
                      <Input
                        id="lesson-order"
                        type="number"
                        value={lessonForm.order_index}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            order_index: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="lesson-published"
                        checked={lessonForm.published}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            published: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="lesson-published">Опубликовать</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLessonDialogOpen(false);
                        setEditingLesson(null);
                        resetLessonForm();
                      }}
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleSaveLesson}
                      disabled={lessonMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Язык</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Порядок</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : lessons && lessons.length > 0 ? (
                      lessons.map((lesson) => (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-medium">
                            {lesson.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {lesson.language.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{lesson.difficulty}</TableCell>
                          <TableCell>{lesson.type}</TableCell>
                          <TableCell>{lesson.order_index}</TableCell>
                          <TableCell>
                            {lesson.published ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                Опубликован
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Черновик</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleManageContent(lesson)}
                                title="Управление контентом"
                              >
                                <FileText className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteLessonMutation.mutate(lesson.id)
                                }
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Нет уроков
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Диалог управления контентом урока */}
        <Dialog
          open={contentDialogOpen}
          onOpenChange={(open) => {
            setContentDialogOpen(open);
            if (!open) {
              setEditingLessonForContent(null);
              resetContentForm();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Управление контентом: {editingLessonForContent?.title}
              </DialogTitle>
              <DialogDescription>
                Настройте задание, стартовый код, ожидаемый результат и
                подсказки
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="content-markdown">
                  Описание задания (Markdown)
                </Label>
                <Textarea
                  id="content-markdown"
                  value={contentForm.content_markdown}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      content_markdown: e.target.value,
                    })
                  }
                  placeholder="# Задание&#10;&#10;Напишите программу, которая..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="starter-code">Стартовый код</Label>
                <Textarea
                  id="starter-code"
                  value={contentForm.starter_code}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      starter_code: e.target.value,
                    })
                  }
                  placeholder={`print("Hello, world!")  # для Python&#10;console.log("Hello");  // для JavaScript`}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expected-stdout">
                  Ожидаемый результат (expected_stdout)
                </Label>
                <Textarea
                  id="expected-stdout"
                  value={contentForm.expected_stdout}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      expected_stdout: e.target.value,
                    })
                  }
                  placeholder="Hello, world!"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Это значение будет сравниваться с выводом программы (stdout).
                  Конечные пробелы и переводы строк игнорируются.
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Подсказки</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHint}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить подсказку
                  </Button>
                </div>
                {contentForm.hints.length > 0 ? (
                  <div className="space-y-2">
                    {contentForm.hints.map((hint, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={hint}
                          onChange={(e) => updateHint(index, e.target.value)}
                          placeholder={`Подсказка ${index + 1}`}
                          rows={2}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHint(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Подсказки не добавлены
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setContentDialogOpen(false);
                  setEditingLessonForContent(null);
                  resetContentForm();
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => saveContentMutation.mutate()}
                disabled={saveContentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить контент
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Вкладка с лекциями */}
        <TabsContent value="lectures" className="space-y-4">
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Управление лекциями</CardTitle>
                <CardDescription>
                  Создавайте, редактируйте и удаляйте лекции
                </CardDescription>
              </div>
              <Dialog
                open={lectureDialogOpen}
                onOpenChange={(open) => {
                  setLectureDialogOpen(open);
                  if (!open) {
                    setEditingLecture(null);
                    resetLectureForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="imperial">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать лекцию
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLecture
                        ? "Редактировать лекцию"
                        : "Создать лекцию"}
                    </DialogTitle>
                    <DialogDescription>
                      Заполните форму для{" "}
                      {editingLecture ? "редактирования" : "создания"} лекции
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lecture-slug">Slug (URL)</Label>
                      <Input
                        id="lecture-slug"
                        value={lectureForm.slug}
                        onChange={(e) =>
                          setLectureForm({
                            ...lectureForm,
                            slug: e.target.value,
                          })
                        }
                        placeholder="intro-to-python"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lecture-title">Название</Label>
                      <Input
                        id="lecture-title"
                        value={lectureForm.title}
                        onChange={(e) =>
                          setLectureForm({
                            ...lectureForm,
                            title: e.target.value,
                          })
                        }
                        placeholder="Введение в Python"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lecture-summary">Краткое описание</Label>
                      <Textarea
                        id="lecture-summary"
                        value={lectureForm.summary}
                        onChange={(e) =>
                          setLectureForm({
                            ...lectureForm,
                            summary: e.target.value,
                          })
                        }
                        placeholder="Основы языка программирования Python"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lecture-language">Язык</Label>
                      <Select
                        value={lectureForm.language}
                        onValueChange={(value) =>
                          setLectureForm({ ...lectureForm, language: value })
                        }
                      >
                        <SelectTrigger id="lecture-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="cpp">C++</SelectItem>
                          <SelectItem value="c">C</SelectItem>
                          <SelectItem value="go">Go</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lecture-order">Порядок</Label>
                      <Input
                        id="lecture-order"
                        type="number"
                        value={lectureForm.order_index}
                        onChange={(e) =>
                          setLectureForm({
                            ...lectureForm,
                            order_index: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="lecture-published"
                        checked={lectureForm.published}
                        onChange={(e) =>
                          setLectureForm({
                            ...lectureForm,
                            published: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="lecture-published">Опубликовать</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLectureDialogOpen(false);
                        setEditingLecture(null);
                        resetLectureForm();
                      }}
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleSaveLecture}
                      disabled={lectureMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Язык</TableHead>
                      <TableHead>Порядок</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lecturesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : lectures && lectures.length > 0 ? (
                      lectures.map((lecture) => (
                        <TableRow key={lecture.id}>
                          <TableCell className="font-medium">
                            {lecture.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {lecture.language.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{lecture.order_index}</TableCell>
                          <TableCell>
                            {lecture.published ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                Опубликована
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Черновик</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleManageSections(lecture)}
                                title="Управление секциями"
                              >
                                <FileText className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLecture(lecture)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteLectureMutation.mutate(lecture.id)
                                }
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Нет лекций
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Диалог управления контентом урока */}
        <Dialog
          open={contentDialogOpen}
          onOpenChange={(open) => {
            setContentDialogOpen(open);
            if (!open) {
              setEditingLessonForContent(null);
              resetContentForm();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Управление контентом: {editingLessonForContent?.title}
              </DialogTitle>
              <DialogDescription>
                Настройте задание, стартовый код, ожидаемый результат и
                подсказки
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="content-markdown">
                  Описание задания (Markdown)
                </Label>
                <Textarea
                  id="content-markdown"
                  value={contentForm.content_markdown}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      content_markdown: e.target.value,
                    })
                  }
                  placeholder="# Задание&#10;&#10;Напишите программу, которая..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="starter-code">Стартовый код</Label>
                <Textarea
                  id="starter-code"
                  value={contentForm.starter_code}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      starter_code: e.target.value,
                    })
                  }
                  placeholder={`print("Hello, world!")  # для Python&#10;console.log("Hello");  // для JavaScript`}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expected-stdout">
                  Ожидаемый результат (expected_stdout)
                </Label>
                <Textarea
                  id="expected-stdout"
                  value={contentForm.expected_stdout}
                  onChange={(e) =>
                    setContentForm({
                      ...contentForm,
                      expected_stdout: e.target.value,
                    })
                  }
                  placeholder="Hello, world!"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Это значение будет сравниваться с выводом программы (stdout).
                  Конечные пробелы и переводы строк игнорируются.
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Подсказки</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHint}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить подсказку
                  </Button>
                </div>
                {contentForm.hints.length > 0 ? (
                  <div className="space-y-2">
                    {contentForm.hints.map((hint, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={hint}
                          onChange={(e) => updateHint(index, e.target.value)}
                          placeholder={`Подсказка ${index + 1}`}
                          rows={2}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHint(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Подсказки не добавлены
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setContentDialogOpen(false);
                  setEditingLessonForContent(null);
                  resetContentForm();
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => saveContentMutation.mutate()}
                disabled={saveContentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить контент
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Диалог управления секциями лекций */}
        <Dialog
          open={sectionsDialogOpen}
          onOpenChange={(open) => {
            setSectionsDialogOpen(open);
            if (!open) {
              setEditingLectureForSections(null);
              setSectionsForm([]);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Управление секциями: {editingLectureForSections?.title}
              </DialogTitle>
              <DialogDescription>
                Добавьте секции с теоретическим материалом для лекции
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Секции лекции</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSection}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить секцию
                </Button>
              </div>

              {sectionsForm.length > 0 ? (
                <div className="space-y-6">
                  {sectionsForm.map((section, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Секция {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`section-title-${index}`}>
                            Заголовок секции
                          </Label>
                          <Input
                            id={`section-title-${index}`}
                            value={section.title}
                            onChange={(e) =>
                              updateSection(index, "title", e.target.value)
                            }
                            placeholder="Например: Введение"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`section-content-${index}`}>
                            Контент (Markdown)
                          </Label>
                          <Textarea
                            id={`section-content-${index}`}
                            value={section.content_markdown}
                            onChange={(e) =>
                              updateSection(
                                index,
                                "content_markdown",
                                e.target.value,
                              )
                            }
                            placeholder="# Заголовок&#10;&#10;Текст с **форматированием**&#10;&#10;```python&#10;print('Пример кода')&#10;```"
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Секции не добавлены. Нажмите "Добавить секцию" для начала.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSectionsDialogOpen(false);
                  setEditingLectureForSections(null);
                  setSectionsForm([]);
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => saveSectionsMutation.mutate()}
                disabled={saveSectionsMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить секции
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
}
