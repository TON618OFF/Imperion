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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  BookOpen,
  Flame,
  GraduationCap,
  Shield,
  User as UserIcon,
} from "lucide-react";

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
          <CardHeader className="pb-2">
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
          <CardHeader className="pb-2">
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
          <CardHeader className="pb-2">
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
          <CardHeader className="pb-2">
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

      {isEditing ? (
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Редактирование</CardTitle>
            <CardDescription>Обнови данные и аватар</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Имя</div>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Фамилия</div>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Никнейм</div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">О себе</div>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Новый аватар</div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
              {avatarFile ? (
                <div className="text-xs text-muted-foreground">
                  Выбран файл: {avatarFile.name}
                </div>
              ) : null}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
