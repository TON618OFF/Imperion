import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  BookOpen,
  Code2,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  KeyRound,
  Shield,
  User as UserIcon,
} from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  c: "C",
  go: "Go",
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, avatar_url, bio")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

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
      return data ?? null;
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
      return data ?? null;
    },
  });

  const { data: earnedAchievementsCount } = useQuery({
    queryKey: ["user_achievements_count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_achievements")
        .select("achievement_id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: completedLessonsCount } = useQuery({
    queryKey: ["user_completed_lessons_count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "завершён");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: completedLecturesCount } = useQuery({
    queryKey: ["user_completed_lectures_count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_lecture_progress")
        .select("lecture_id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("completed", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: languageStats } = useQuery({
    queryKey: ["v_user_language_stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_user_language_stats")
        .select("language, lessons_completed, submissions_count, total_xp")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as {
        language: string;
        lessons_completed: number;
        submissions_count: number;
        total_xp: number;
      }[];
    },
  });

  const { data: totalsByLanguage } = useQuery({
    queryKey: ["totals_by_language"],
    queryFn: async () => {
      const [lessonsRes, lecturesRes] = await Promise.all([
        supabase.from("lessons").select("language").eq("published", true),
        supabase.from("lectures").select("language").eq("published", true),
      ]);
      if (lessonsRes.error) throw lessonsRes.error;
      if (lecturesRes.error) throw lecturesRes.error;
      const lessonTotals: Record<string, number> = {};
      (lessonsRes.data ?? []).forEach((r: { language: string }) => {
        lessonTotals[r.language] = (lessonTotals[r.language] ?? 0) + 1;
      });
      const lectureTotals: Record<string, number> = {};
      (lecturesRes.data ?? []).forEach((r: { language: string }) => {
        lectureTotals[r.language] = (lectureTotals[r.language] ?? 0) + 1;
      });
      return { lessonTotals, lectureTotals };
    },
  });

  const { data: lecturesCompletedByLanguage } = useQuery({
    queryKey: ["user_lectures_by_language", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lecture_progress")
        .select("lecture_id, lectures(language)")
        .eq("user_id", user!.id)
        .eq("completed", true);
      if (error) throw error;
      const byLang: Record<string, number> = {};
      (data ?? []).forEach((r: { lectures: { language: string } | null }) => {
        const lang = r.lectures?.language;
        if (lang) {
          byLang[lang] = (byLang[lang] ?? 0) + 1;
        }
      });
      return byLang;
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const update: Partial<ProfileRow> = {
        first_name: firstName || null,
        last_name: lastName || null,
        username: username || null,
        bio: bio || null,
      };

      let avatarUrl: string | null = null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const path = `${user!.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
        update.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", user!.id);
      if (error) throw error;

      return avatarUrl;
    },
    onSuccess: () => {
      setAvatarFile(null);
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Профиль сохранён" });
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Не удалось сохранить профиль",
        description: e?.message ?? String(e),
      });
    },
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Email не найден");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Неверный текущий пароль");
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Пароль успешно изменён" });
    },
    onError: (e: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка смены пароля",
        description: e?.message ?? String(e),
      });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Новый пароль должен быть не менее 6 символов",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароли не совпадают",
      });
      return;
    }
    if (!currentPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Введите текущий пароль",
      });
      return;
    }
    passwordChangeMutation.mutate();
  };

  if (isLoading)
    return <div className="text-muted-foreground">Загрузка профиля…</div>;
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Профиль</h1>
          <div className="text-muted-foreground">
            Для этого аккаунта ещё нет записи профиля.
          </div>
        </div>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Создать профиль</CardTitle>
            <CardDescription>
              Догонялка создаст базовые записи в профиле и статистике.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="imperial"
              onClick={async () => {
                const { error } = await supabase.rpc("bootstrap_current_user");
                if (error) {
                  toast({
                    variant: "destructive",
                    title: "Не удалось создать профиль",
                    description: error.message,
                  });
                  return;
                }
                await qc.invalidateQueries({ queryKey: ["profile", user?.id] });
              }}
            >
              Создать
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  const avatarAlt = profile.username || displayName || user?.email || "avatar";
  const initials = (profile.username || displayName || user?.email || "U")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Профиль</h1>
          <div className="text-muted-foreground">
            Витрина и статистика аккаунта
          </div>
        </div>

        <Button variant="imperial" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? "Закрыть редактирование" : "Редактировать"}
        </Button>
      </div>

      <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0 rounded-2xl border border-border bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={avatarAlt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center">
                    <div className="flex items-center gap-2 text-amber-200/90">
                      <UserIcon className="h-5 w-5" />
                      <span className="text-lg font-semibold tracking-wide">
                        {initials}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-semibold">
                    {profile.username ? `@${profile.username}` : "Без никнейма"}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                    <Shield className="h-3.5 w-3.5" />
                    Аккаунт Imperion
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {displayName || "Имя не указано"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user?.email}
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-right">
              <div className="text-sm text-muted-foreground">Уровень</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent">
                {xp?.level ?? 1}
              </div>
              <div className="text-sm text-muted-foreground">
                XP: {xp?.xp ?? 0}
              </div>
            </div>
          </div>

          {profile.bio ? (
            <div className="mt-5 text-sm text-muted-foreground">
              {profile.bio}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-200" />
              Достижения
            </CardTitle>
            <CardDescription>Получено</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {earnedAchievementsCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-200" />
              Уроки
            </CardTitle>
            <CardDescription>Завершено</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedLessonsCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-200" />
              Лекции
            </CardTitle>
            <CardDescription>Завершено</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedLecturesCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-200" />
              Серия
            </CardTitle>
            <CardDescription>Дней подряд</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {streak?.current_streak ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Лучшая: {streak?.best_streak ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Статистика по языкам */}
      <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-5 w-5 text-amber-200" />
            Статистика по языкам
          </CardTitle>
          <CardDescription className="mt-1">
            Уроки, лекции, отправки кода и XP по каждому языку программирования.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {!languageStats?.length && !lecturesCompletedByLanguage && (
            <p className="text-sm text-muted-foreground py-2">
              Пока нет активности по языкам. Начните уроки или лекции, чтобы здесь появилась статистика.
            </p>
          )}
          {(languageStats?.length ?? 0) > 0 ||
          (lecturesCompletedByLanguage && Object.keys(lecturesCompletedByLanguage).length > 0) ? (
            <div className="space-y-4">
              {Array.from(
                new Set([
                  ...(languageStats?.map((s) => s.language) ?? []),
                  ...(lecturesCompletedByLanguage ? Object.keys(lecturesCompletedByLanguage) : []),
                ])
              )
                .sort()
                .map((lang) => {
                  const stat = languageStats?.find((s) => s.language === lang);
                  const lessonsTotal = totalsByLanguage?.lessonTotals?.[lang] ?? 0;
                  const lecturesTotal = totalsByLanguage?.lectureTotals?.[lang] ?? 0;
                  const lecturesDone = lecturesCompletedByLanguage?.[lang] ?? 0;
                  const lessonsDone = stat?.lessons_completed ?? 0;
                  const submissions = stat?.submissions_count ?? 0;
                  const xp = stat?.total_xp ?? 0;
                  const hasAny = lessonsDone > 0 || lecturesDone > 0 || submissions > 0;
                  if (!hasAny && lessonsTotal === 0 && lecturesTotal === 0) return null;
                  return (
                    <div
                      key={lang}
                      className="rounded-xl border border-border/80 bg-muted/5 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {LANGUAGE_LABELS[lang] ?? lang}
                        </span>
                        {xp > 0 && (
                          <span className="text-sm text-amber-200/90 font-medium">
                            {xp} XP
                          </span>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3 text-sm">
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <div className="text-muted-foreground mb-1">Уроки</div>
                          <div className="font-medium tabular-nums text-foreground">
                            {lessonsDone}
                            {lessonsTotal > 0 && ` / ${lessonsTotal}`}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <div className="text-muted-foreground mb-1">Лекции</div>
                          <div className="font-medium tabular-nums text-foreground">
                            {lecturesDone}
                            {lecturesTotal > 0 && ` / ${lecturesTotal}`}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <div className="text-muted-foreground mb-1">Отправки кода</div>
                          <div className="font-medium tabular-nums text-foreground">{submissions}</div>
                        </div>
                      </div>
                      {(lessonsTotal > 0 || lecturesTotal > 0) && (
                        <div className="space-y-1.5">
                          {lessonsTotal > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary/70 transition-all"
                                  style={{
                                    width: `${Math.min(100, (lessonsDone / lessonsTotal) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12 shrink-0">
                                {lessonsDone}/{lessonsTotal}
                              </span>
                            </div>
                          )}
                          {lecturesTotal > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-500/70 transition-all"
                                  style={{
                                    width: `${Math.min(100, (lecturesDone / lecturesTotal) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12 shrink-0">
                                {lecturesDone}/{lecturesTotal}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isEditing ? (
        <div className="grid gap-8 lg:grid-cols-[1fr,minmax(320px,400px)]">
          {/* Личные данные */}
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                Личные данные
              </CardTitle>
              <CardDescription className="mt-1">
                Имя, фамилия, логин и описание. Логин используется для входа.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Аватар */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end pb-3">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {avatarFile ? (
                      <img
                        src={URL.createObjectURL(avatarFile)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-avatar" className="text-sm font-medium">
                      Фото профиля
                    </Label>
                    <div className="flex items-center w-full min-w-[240px] max-w-[320px] rounded-md border border-border bg-background px-3 py-2 min-h-[2.5rem] focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:outline-none">
                      <Input
                        id="profile-avatar"
                        type="file"
                        accept="image/*"
                        className="h-auto min-h-0 w-full max-w-full border-0 bg-transparent p-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/20 file:px-3 file:py-2 file:text-xs file:font-medium file:min-h-[1.75rem] focus-visible:outline-none focus-visible:ring-0"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    {avatarFile && (
                      <p className="text-xs text-muted-foreground truncate max-w-[320px]">
                        {avatarFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/50" />

              {/* Имя и фамилия */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-firstName" className="text-sm font-medium">
                    Имя
                  </Label>
                  <Input
                    id="profile-firstName"
                    placeholder="Иван"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-lastName" className="text-sm font-medium">
                    Фамилия
                  </Label>
                  <Input
                    id="profile-lastName"
                    placeholder="Иванов"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Логин */}
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-sm font-medium">
                  Логин
                </Label>
                <Input
                  id="profile-username"
                  placeholder="ivan123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Только латинские буквы и цифры, 3–50 символов. Нужен для входа в аккаунт.
                </p>
              </div>

              {/* О себе */}
              <div className="space-y-2">
                <Label htmlFor="profile-bio" className="text-sm font-medium">
                  О себе
                </Label>
                <Textarea
                  id="profile-bio"
                  placeholder="Кратко расскажите о себе (по желанию)"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="min-h-[100px] resize-y border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="imperial"
                  size="default"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Сохранение…" : "Сохранить"}
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    setFirstName(profile.first_name ?? "");
                    setLastName(profile.last_name ?? "");
                    setUsername(profile.username ?? "");
                    setBio(profile.bio ?? "");
                    setAvatarFile(null);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Смена пароля */}
          <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden h-fit">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
                  <KeyRound className="h-4 w-4 text-amber-200" />
                </div>
                Смена пароля
              </CardTitle>
              <CardDescription className="mt-1">
                Введите текущий пароль и задайте новый. После смены войдите с новым паролем.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-xl border border-border/80 bg-muted/10 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm font-medium">
                    Текущий пароль
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords ? "text" : "password"}
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="h-10 border-border bg-background/50 pr-10 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label={showPasswords ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    Новый пароль
                  </Label>
                  <Input
                    id="new-password"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Минимум 6 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-10 border-border bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Повторите новый пароль
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-10 border-border bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={handlePasswordChange}
                  disabled={
                    passwordChangeMutation.isPending ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {passwordChangeMutation.isPending ? "Смена…" : "Изменить пароль"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
