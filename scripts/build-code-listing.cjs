const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const files = [
  "src/App.tsx", "src/main.tsx", "src/index.css", "src/vite-env.d.ts",
  "src/auth/AuthProvider.tsx",
  "src/components/MarkdownEditor.tsx", "src/components/NavLink.tsx", "src/components/ProtectedRoute.tsx", "src/components/RoleProtectedRoute.tsx", "src/components/ScrollToTop.tsx",
  "src/components/landing/Features.tsx", "src/components/landing/Footer.tsx", "src/components/landing/Header.tsx", "src/components/landing/Hero.tsx", "src/components/landing/LanguageCards.tsx",
  "src/components/ui/accordion.tsx", "src/components/ui/alert-dialog.tsx", "src/components/ui/alert.tsx", "src/components/ui/aspect-ratio.tsx", "src/components/ui/avatar.tsx",
  "src/components/ui/badge.tsx", "src/components/ui/breadcrumb.tsx", "src/components/ui/button.tsx", "src/components/ui/calendar.tsx", "src/components/ui/card.tsx",
  "src/components/ui/carousel.tsx", "src/components/ui/chart.tsx", "src/components/ui/checkbox.tsx", "src/components/ui/collapsible.tsx", "src/components/ui/command.tsx",
  "src/components/ui/context-menu.tsx", "src/components/ui/dialog.tsx", "src/components/ui/drawer.tsx", "src/components/ui/dropdown-menu.tsx", "src/components/ui/form.tsx",
  "src/components/ui/hover-card.tsx", "src/components/ui/input-otp.tsx", "src/components/ui/input.tsx", "src/components/ui/label.tsx", "src/components/ui/menubar.tsx",
  "src/components/ui/navigation-menu.tsx", "src/components/ui/pagination.tsx", "src/components/ui/popover.tsx", "src/components/ui/progress.tsx", "src/components/ui/radio-group.tsx",
  "src/components/ui/resizable.tsx", "src/components/ui/scroll-area.tsx", "src/components/ui/select.tsx", "src/components/ui/separator.tsx", "src/components/ui/sheet.tsx",
  "src/components/ui/sidebar.tsx", "src/components/ui/skeleton.tsx", "src/components/ui/slider.tsx", "src/components/ui/sonner.tsx", "src/components/ui/switch.tsx",
  "src/components/ui/table.tsx", "src/components/ui/tabs.tsx", "src/components/ui/textarea.tsx", "src/components/ui/toast.tsx", "src/components/ui/toaster.tsx",
  "src/components/ui/toggle-group.tsx", "src/components/ui/toggle.tsx", "src/components/ui/tooltip.tsx", "src/components/ui/use-toast.ts",
  "src/hooks/use-mobile.tsx", "src/hooks/use-toast.ts",
  "src/lib/pdfExport.ts", "src/lib/piston.ts", "src/lib/supabaseClient.ts", "src/lib/utils.ts",
  "src/pages/Auth.tsx", "src/pages/Index.tsx", "src/pages/NotFound.tsx",
  "src/pages/admin/AdminDashboard.tsx", "src/pages/admin/AdminLayout.tsx",
  "src/pages/app/Achievements.tsx", "src/pages/app/AppLayout.tsx", "src/pages/app/Dashboard.tsx", "src/pages/app/LectureDetail.tsx", "src/pages/app/Lectures.tsx",
  "src/pages/app/LecturesLanguage.tsx", "src/pages/app/LessonDetail.tsx", "src/pages/app/Lessons.tsx", "src/pages/app/LessonsLanguage.tsx", "src/pages/app/Profile.backup.tsx", "src/pages/app/Profile.tsx",
  "src/pages/auth/AuthLayout.tsx", "src/pages/auth/Login.tsx", "src/pages/auth/Register.tsx",
  "src/pages/mentor/MentorDashboard.tsx", "src/pages/mentor/MentorLayout.tsx",
  "src/test/example.test.ts", "src/test/setup.ts",
];

const outPath = path.join(root, "docs", "poyasnitelnaya-zapiska-1-4-kod-programmy.md");
const lines = [
  "# 1.4. Код программы",
  "",
  "Ниже приведён полный код всех модулей приложения в порядке, соответствующем таблице описания модулей (п. 1.3). Для каждого файла указан относительный путь (relative path) и содержимое файла.",
  "",
  "---",
  "",
];

for (const f of files) {
  const winPath = f.replace(/\//g, "\\");
  const fullPath = path.join(root, f);
  if (!fs.existsSync(fullPath)) {
    lines.push(winPath + ":");
    lines.push("(файл не найден)");
    lines.push("");
    continue;
  }
  const content = fs.readFileSync(fullPath, "utf8");
  lines.push(winPath + ":");
  lines.push(content);
  if (!content.endsWith("\n")) lines.push("");
  lines.push("");
}

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Written", outPath, "lines:", lines.length);
