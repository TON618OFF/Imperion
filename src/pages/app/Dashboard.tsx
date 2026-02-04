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
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Flame,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LeaderboardUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  completed_lessons: number;
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: currentUserStats } = useQuery({
    queryKey: ["current_user_stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [profileRes, xpRes, lessonsRes, streakRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, first_name, last_name, avatar_url")
          .eq("id", user!.id)
          .single(),
        supabase
          .from("user_xp")
          .select("xp, level")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("user_lesson_progress")
          .select("lesson_id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "завершён"),
        supabase
          .from("user_streaks")
          .select("current_streak, best_streak")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      return {
        profile: profileRes.data,
        xp: xpRes.data?.xp ?? 0,
        level: xpRes.data?.level ?? 1,
        completedLessons: lessonsRes.count ?? 0,
        currentStreak: streakRes.data?.current_streak ?? 0,
        bestStreak: streakRes.data?.best_streak ?? 0,
      };
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: xpData, error: xpError } = await supabase
        .from("user_xp")
        .select("user_id, xp, level")
        .order("xp", { ascending: false })
        .limit(20);

      if (xpError) throw xpError;

      const userIds = xpData.map((x) => x.user_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url")
        .in("id", userIds);

      if (profileError) throw profileError;

      const { data: lessonsCount, error: lessonsError } = await supabase
        .from("user_lesson_progress")
        .select("user_id", { count: "exact" })
        .in("user_id", userIds)
        .eq("status", "завершён");

      if (lessonsError) throw lessonsError;

      const lessonCountMap: Record<string, number> = {};
      if (lessonsCount) {
        for (const item of lessonsCount) {
          lessonCountMap[item.user_id] =
            (lessonCountMap[item.user_id] || 0) + 1;
        }
      }

      const combined: LeaderboardUser[] = xpData.map((xp) => {
        const profile = profiles?.find((p) => p.id === xp.user_id);
        return {
          id: xp.user_id,
          username: profile?.username ?? null,
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          xp: xp.xp,
          level: xp.level,
          completed_lessons: lessonCountMap[xp.user_id] || 0,
        };
      });

      return combined;
    },
  });

  const { data: totalStats } = useQuery({
    queryKey: ["total_stats"],
    queryFn: async () => {
      const [usersCount, lessonsCount, lecturesCount] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalUsers: usersCount.count ?? 0,
        totalLessons: lessonsCount.count ?? 0,
        totalLectures: lecturesCount.count ?? 0,
      };
    },
  });

  const topThree = leaderboard?.slice(0, 3) || [];
  const restOfLeaderboard = leaderboard?.slice(3) || [];

  const currentUserRank = leaderboard?.findIndex((u) => u.id === user?.id);
  const userRankDisplay =
    currentUserRank !== undefined && currentUserRank >= 0
      ? currentUserRank + 1
      : null;

  const getDisplayName = (user: LeaderboardUser) => {
    if (user.username) return `@${user.username}`;
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || "Анонимный пользователь";
  };

  const getInitials = (user: LeaderboardUser) => {
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName
      ? fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "??";
  };

  const getPodiumHeight = (position: number) => {
    if (position === 0) return "h-40"; // 1st place
    if (position === 1) return "h-32"; // 2nd place
    return "h-24"; // 3rd place
  };

  const getPodiumOrder = () => {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [topThree[0]];
    if (topThree.length === 2) return [topThree[1], topThree[0]];
    return [topThree[1], topThree[0], topThree[2]]; // 2nd, 1st, 3rd
  };

  const podiumUsers = getPodiumOrder();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent">
          Добро пожаловать в Imperion!
        </h1>
        <p className="text-muted-foreground mt-2">
          Платформа для изучения программирования. Соревнуйся с другими
          студентами и достигай новых высот!
        </p>
      </div>

      {/* User Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Ваш ранг
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {userRankDisplay ? `#${userRankDisplay}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              из {leaderboard?.length ?? 0} участников
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Уровень
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {currentUserStats?.level ?? 1}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentUserStats?.xp ?? 0} XP
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-400" />
              Уроки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {currentUserStats?.completedLessons ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">завершено</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              Серия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">
              {currentUserStats?.currentStreak ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">дней подряд</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Активные студенты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {totalStats?.totalUsers ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Доступно уроков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {totalStats?.totalLessons ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400" />
              Лекций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {totalStats?.totalLectures ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Section */}
      <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <CardTitle className="text-2xl">Таблица лидеров</CardTitle>
          </div>
          <CardDescription>
            Топ студентов платформы по количеству опыта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Podium for Top 3 */}
          {topThree.length > 0 && (
            <div className="relative">
              <div className="flex items-end justify-center gap-4 pb-6">
                {podiumUsers.map((user, displayIndex) => {
                  const actualPosition = topThree.findIndex(
                    (u) => u.id === user.id,
                  );
                  const podiumPosition =
                    actualPosition === 0
                      ? "🥇"
                      : actualPosition === 1
                        ? "🥈"
                        : "🥉";
                  const heightClass = getPodiumHeight(actualPosition);
                  const isFirst = actualPosition === 0;

                  return (
                    <div
                      key={user.id}
                      className={`flex flex-col items-center ${isFirst ? "order-2" : displayIndex === 0 ? "order-1" : "order-3"}`}
                    >
                      <div className="mb-3 relative">
                        <Avatar
                          className={`${isFirst ? "h-20 w-20" : "h-16 w-16"} border-2 ${isFirst ? "border-amber-400" : actualPosition === 1 ? "border-gray-400" : "border-orange-600"} shadow-lg`}
                        >
                          <AvatarImage
                            src={user.avatar_url || undefined}
                            alt={getDisplayName(user)}
                          />
                          <AvatarFallback
                            className={`text-sm font-bold ${isFirst ? "bg-amber-500/20" : actualPosition === 1 ? "bg-gray-500/20" : "bg-orange-500/20"}`}
                          >
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 text-2xl">
                          {podiumPosition}
                        </div>
                      </div>
                      <div className="text-center mb-2 px-2">
                        <div
                          className={`font-semibold ${isFirst ? "text-base" : "text-sm"} truncate max-w-[120px]`}
                        >
                          {getDisplayName(user)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Lvl {user.level} • {user.xp} XP
                        </div>
                      </div>
                      <div
                        className={`${heightClass} w-24 rounded-t-lg ${isFirst ? "bg-gradient-to-t from-amber-500/20 to-amber-500/30 border-2 border-amber-500/40" : actualPosition === 1 ? "bg-gradient-to-t from-gray-500/20 to-gray-500/30 border-2 border-gray-500/40" : "bg-gradient-to-t from-orange-600/20 to-orange-600/30 border-2 border-orange-600/40"} flex items-center justify-center`}
                      >
                        <div className="text-center">
                          <div
                            className={`${isFirst ? "text-2xl" : "text-xl"} font-bold`}
                          >
                            #{actualPosition + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Rest of Leaderboard */}
          <div className="space-y-2">
            {restOfLeaderboard.map((user, index) => {
              const position = index + 4;
              const isCurrentUser = user.id === currentUserStats?.profile?.id;

              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isCurrentUser ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                >
                  <div className="w-8 text-center font-bold text-muted-foreground">
                    #{position}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user.avatar_url || undefined}
                      alt={getDisplayName(user)}
                    />
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {getDisplayName(user)}
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          Вы
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.completed_lessons} уроков завершено
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      Lvl {user.level}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.xp.toLocaleString()} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {restOfLeaderboard.length === 0 && topThree.length < 3 && (
            <div className="text-center text-muted-foreground py-8">
              Пока недостаточно участников. Будь первым!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
