import { useRef } from "react";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  Database,
  HardDrive,
  FileDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function AdminDashboard() {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  // Статистика пользователей
  const { data: usersCount } = useQuery({
    queryKey: ["admin_users_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Статистика уроков
  const { data: lessonsCount } = useQuery({
    queryKey: ["admin_lessons_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Статистика лекций
  const { data: lecturesCount } = useQuery({
    queryKey: ["admin_lectures_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lectures")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Статистика достижений
  const { data: achievementsCount } = useQuery({
    queryKey: ["admin_achievements_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("achievements")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Распределение пользователей по ролям
  const { data: usersByRole } = useQuery({
    queryKey: ["admin_users_by_role"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("role");
      if (error) throw error;

      const roleCount: Record<string, number> = {};
      data?.forEach((profile) => {
        const role = profile.role || "пользователь";
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      return Object.entries(roleCount).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Распределение уроков по языкам
  const { data: lessonsByLanguage } = useQuery({
    queryKey: ["admin_lessons_by_language"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("language");
      if (error) throw error;

      const langCount: Record<string, number> = {};
      data?.forEach((lesson) => {
        const lang = lesson.language;
        langCount[lang] = (langCount[lang] || 0) + 1;
      });

      return Object.entries(langCount).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
      }));
    },
  });

  // Распределение уроков по сложности
  const { data: lessonsByDifficulty } = useQuery({
    queryKey: ["admin_lessons_by_difficulty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("difficulty");
      if (error) throw error;

      const diffCount: Record<string, number> = {};
      data?.forEach((lesson) => {
        const diff = lesson.difficulty;
        diffCount[diff] = (diffCount[diff] || 0) + 1;
      });

      return Object.entries(diffCount).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Активность пользователей (последние 7 дней)
  const { data: userActivity } = useQuery({
    queryKey: ["admin_user_activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xp_transactions")
        .select("created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );
      if (error) throw error;

      const activityByDay: Record<string, number> = {};
      data?.forEach((transaction) => {
        const date = new Date(transaction.created_at).toLocaleDateString(
          "ru-RU",
        );
        activityByDay[date] = (activityByDay[date] || 0) + 1;
      });

      return Object.entries(activityByDay)
        .map(([date, count]) => ({
          date,
          активность: count,
        }))
        .sort(
          (a, b) =>
            new Date(a.date.split(".").reverse().join("-")).getTime() -
            new Date(b.date.split(".").reverse().join("-")).getTime(),
        );
    },
  });

  // Топ пользователей по XP
  const { data: topUsers } = useQuery({
    queryKey: ["admin_top_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_xp")
        .select("user_id, xp, level")
        .order("xp", { ascending: false })
        .limit(10);
      if (error) throw error;

      const userIds = data?.map((u) => u.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data?.map((u) => {
        const profile = profileMap.get(u.user_id);
        return {
          name:
            profile?.username ||
            `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
            "Пользователь",
          xp: u.xp,
          level: u.level,
        };
      });
    },
  });

  const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

  const handleExportPDF = async () => {
    const el = reportRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentW = pageW - 2 * margin;
      const contentH = pageH - 2 * margin;
      const ratio = canvas.width / canvas.height;
      let w = contentW;
      let h = contentW / ratio;
      if (h > contentH) {
        h = contentH;
        w = contentH * ratio;
      }
      pdf.addImage(imgData, "PNG", margin, margin, w, h);
      pdf.save(`imperion-admin-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Не удалось сформировать PDF. Убедитесь, что данные загружены.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">
            Панель <span className="text-gradient-gold">Администратора</span>
          </h1>
          <div className="text-muted-foreground max-w-2xl">
            Полная статистика и аналитика платформы Imperion
          </div>
        </div>
        <Button onClick={handleExportPDF} variant="imperial">
          <FileDown className="w-4 h-4 mr-2" />
          Экспорт в PDF
        </Button>
      </div>

      {/* Основная статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего пользователей
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Зарегистрировано на платформе
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Уроки</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessonsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Практических уроков</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лекции</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lecturesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Теоретических лекций
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Достижения</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievementsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Доступно для получения
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Активность (последние 7 дней)</CardTitle>
            <CardDescription>Количество выполненных заданий</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="активность"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Уроки по языкам</CardTitle>
            <CardDescription>
              Распределение уроков по языкам программирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lessonsByLanguage || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Распределение по ролям</CardTitle>
            <CardDescription>Пользователи по ролям в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usersByRole || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(usersByRole || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader>
            <CardTitle>Уроки по сложности</CardTitle>
            <CardDescription>
              Распределение уроков по уровням сложности
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lessonsByDifficulty || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(lessonsByDifficulty || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Топ пользователей */}
      <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
        <CardHeader>
          <CardTitle>Топ 10 пользователей по XP</CardTitle>
          <CardDescription>Лидеры платформы по опыту</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topUsers?.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Уровень {user.level}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {user.xp} XP
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Информация о базе данных */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">База данных</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип:</span>
                <span className="text-sm font-medium">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Провайдер:
                </span>
                <span className="text-sm font-medium">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  Активна
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bucket:</span>
                <span className="text-sm font-medium">avatars</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Публичный:
                </span>
                <span className="text-sm font-medium">Да</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  Активен
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Скрытый блок для экспорта в PDF: белый фон, чёрный текст, минимальные отступы A4 */}
      <div
        ref={reportRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "210mm",
          maxWidth: "794px",
          padding: "8mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold" }}>
          Отчёт панели администратора — Imperion
        </h1>
        <p style={{ margin: "0 0 12px 0", color: "#000000" }}>
          {new Date().toLocaleDateString("ru-RU", { dateStyle: "long" })}
        </p>
        <section style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "bold" }}>
            Основные показатели
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#000000" }}>
            <tbody>
              <tr><td style={{ padding: "2px 8px 2px 0" }}>Пользователи:</td><td style={{ fontWeight: "bold" }}>{usersCount ?? 0}</td></tr>
              <tr><td style={{ padding: "2px 8px 2px 0" }}>Уроки:</td><td style={{ fontWeight: "bold" }}>{lessonsCount ?? 0}</td></tr>
              <tr><td style={{ padding: "2px 8px 2px 0" }}>Лекции:</td><td style={{ fontWeight: "bold" }}>{lecturesCount ?? 0}</td></tr>
              <tr><td style={{ padding: "2px 8px 2px 0" }}>Достижения:</td><td style={{ fontWeight: "bold" }}>{achievementsCount ?? 0}</td></tr>
            </tbody>
          </table>
        </section>
        <section style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "bold" }}>
            Топ 10 по XP
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", color: "#000000" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "left" }}>#</th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "left" }}>Имя</th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "left" }}>Уровень</th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>XP</th>
              </tr>
            </thead>
            <tbody>
              {(topUsers ?? []).map((u, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{u.name}</td>
                  <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{u.level}</td>
                  <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{u.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "bold" }}>Роли</h2>
          <p style={{ margin: 0, color: "#000000" }}>
            {(usersByRole ?? []).map((r) => `${r.name}: ${r.value}`).join("; ") || "—"}
          </p>
        </section>
        <section style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "bold" }}>Уроки по языкам</h2>
          <p style={{ margin: 0, color: "#000000" }}>
            {(lessonsByLanguage ?? []).map((l) => `${l.name}: ${l.value}`).join("; ") || "—"}
          </p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "bold" }}>Сложность</h2>
          <p style={{ margin: 0, color: "#000000" }}>
            {(lessonsByDifficulty ?? []).map((d) => `${d.name}: ${d.value}`).join("; ") || "—"}
          </p>
        </section>
      </div>
    </div>
  );
}
