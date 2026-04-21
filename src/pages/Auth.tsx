import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Auth() {
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "signup" ? "signup" : "login",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Вход: логин + пароль
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Регистрация: фамилия, имя, email, логин, пароль, повтор пароля
  const [signupLastName, setSignupLastName] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  useEffect(() => {
    const isRecoveryMode = searchParams.get("type") === "recovery";

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && !isRecoveryMode) {
        navigate("/app");
      }
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetDialogOpen(true);
        return;
      }
      if (session && !isRecoveryMode) {
        navigate("/app");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get("type") === "recovery") {
      setResetDialogOpen(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", loginUsername.trim())
        .maybeSingle();

      if (profileError) {
        toast({
          title: "Ошибка",
          description: profileError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!profile) {
        toast({
          title: "Ошибка входа",
          description: "Пользователь с таким логином не найден",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: email, error: emailError } = await supabase.rpc(
        "get_user_email_by_id",
        { user_id: profile.id },
      );

      if (emailError || !email) {
        toast({
          title: "Ошибка",
          description: "Не удалось получить данные пользователя",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginPassword,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          toast({
            title: "Ошибка входа",
            description: "Неверный логин или пароль",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Что-то пошло не так. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupLastName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите фамилию",
        variant: "destructive",
      });
      return;
    }
    if (!signupFirstName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите имя",
        variant: "destructive",
      });
      return;
    }
    if (!signupUsername.trim() || signupUsername.length < 3) {
      toast({
        title: "Ошибка",
        description: "Логин должен содержать минимум 3 символа",
        variant: "destructive",
      });
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(signupUsername)) {
      toast({
        title: "Ошибка",
        description: "Логин может содержать только латинские буквы и цифры",
        variant: "destructive",
      });
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }
    if (signupPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", signupUsername)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Ошибка регистрации",
          description: "Этот логин уже занят",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: signupFirstName,
            last_name: signupLastName,
            username: signupUsername,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Ошибка регистрации",
            description: "Этот email уже зарегистрирован",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка",
            description: error.message,
            variant: "destructive",
          });
        }
        setIsLoading(false);
        return;
      }

      if (signUpData.user) {
        await new Promise((r) => setTimeout(r, 500));

        const { data: profileResult, error: profileError } = await supabase.rpc(
          "initialize_user_profile",
          {
            p_user_id: signUpData.user.id,
            p_first_name: signupFirstName,
            p_last_name: signupLastName,
            p_username: signupUsername,
          },
        );

        if (profileError) {
          toast({
            title: "Ошибка создания профиля",
            description: profileError.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (profileResult && !profileResult.success) {
          await new Promise((r) => setTimeout(r, 1000));
          const { data: retryResult, error: retryError } = await supabase.rpc(
            "initialize_user_profile",
            {
              p_user_id: signUpData.user.id,
              p_first_name: signupFirstName,
              p_last_name: signupLastName,
              p_username: signupUsername,
            },
          );

          if (retryError || (retryResult && !retryResult.success)) {
            toast({
              title: "Ошибка создания профиля",
              description: retryResult?.error ?? "Не удалось создать профиль",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }

        toast({
          title: "Регистрация успешна!",
          description: "Проверьте email для подтверждения или войдите в аккаунт",
        });
        setActiveTab("login");
        setLoginUsername(signupUsername);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Что-то пошло не так. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите email для восстановления",
        variant: "destructive",
      });
      return;
    }

    setIsForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        {
          redirectTo: `${window.location.origin}/auth?type=recovery`,
        },
      );
      if (error) throw error;
      toast({
        title: "Письмо отправлено",
        description: "Проверьте почту и перейдите по ссылке восстановления",
      });
      setForgotDialogOpen(false);
      setForgotEmail("");
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error, "Не удалось отправить письмо"),
        variant: "destructive",
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Новый пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast({
        title: "Пароль обновлён",
        description: "Теперь вы можете войти с новым паролем",
      });
      setResetDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/auth");
    } catch (error: unknown) {
      toast({
        title: "Ошибка",
        description: getErrorMessage(error, "Не удалось сменить пароль"),
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          На главную
        </Link>

        <Card className="glass-card border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-glow-pulse">
                <Code2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Imperion</CardTitle>
            <CardDescription>
              Платформа для изучения программирования
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>

              {/* Вход: логин + пароль */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Логин</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="ivan123"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="border-border focus:border-primary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setForgotDialogOpen(true)}
                    >
                      Забыли пароль?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Вход...
                      </>
                    ) : (
                      "Войти"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Регистрация: фамилия, имя, email, логин, пароль, повтор пароля */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      placeholder="Иванов"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                      className="border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      placeholder="Иван"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      className="border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="ivan@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Логин</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="ivan123"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="border-border focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Латинские буквы и цифры, минимум 3 символа
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Минимум 6 символов"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="border-border focus:border-primary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Повтор пароля</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="border-border focus:border-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Регистрация...
                      </>
                    ) : (
                      "Создать аккаунт"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Восстановление пароля</DialogTitle>
            <DialogDescription>
              Укажите email, на который будет отправлена ссылка для смены пароля
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="ivan@example.com"
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isForgotLoading}>
              {isForgotLoading ? "Отправка..." : "Отправить ссылку"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Смена пароля</DialogTitle>
            <DialogDescription>
              Введите новый пароль для вашего аккаунта
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Новый пароль</Label>
              <Input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">Повторите пароль</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isResetLoading}>
              {isResetLoading ? "Смена..." : "Изменить пароль"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
