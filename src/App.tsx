import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AppLayout from "./pages/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Profile from "./pages/app/Profile";
import Lessons from "./pages/app/Lessons";
import LessonsLanguage from "./pages/app/LessonsLanguage";
import Lectures from "./pages/app/Lectures";
import LecturesLanguage from "./pages/app/LecturesLanguage";
import Achievements from "./pages/app/Achievements";
import LessonDetail from "./pages/app/LessonDetail";
import LectureDetail from "./pages/app/LectureDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import MentorDashboard from "./pages/mentor/MentorDashboard";
import MentorLayout from "./pages/mentor/MentorLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            <Route path="/app" element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="lessons" element={<Lessons />} />
                <Route path="lessons/:language" element={<LessonsLanguage />} />
                <Route
                  path="lessons/:language/:slug"
                  element={<LessonDetail />}
                />
                <Route path="lectures" element={<Lectures />} />
                <Route
                  path="lectures/:language"
                  element={<LecturesLanguage />}
                />
                <Route
                  path="lectures/:language/:slug"
                  element={<LectureDetail />}
                />
                <Route path="achievements" element={<Achievements />} />
              </Route>
            </Route>

            <Route
              path="/admin"
              element={<RoleProtectedRoute allowedRoles={["администратор"]} />}
            >
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
              </Route>
            </Route>

            <Route
              path="/mentor"
              element={
                <RoleProtectedRoute
                  allowedRoles={["ментор", "администратор"]}
                />
              }
            >
              <Route element={<MentorLayout />}>
                <Route index element={<MentorDashboard />} />
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
