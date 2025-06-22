import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

enum AuthView {
  LOGIN = "login",
  REGISTER = "register",
  RESET_PASSWORD = "reset-password",
}

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<AuthView>(AuthView.LOGIN);
  
  // Если пользователь авторизован и загружен, перенаправляем на главную
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }
  
  // Показываем компонент сброса пароля отдельно
  if (view === AuthView.RESET_PASSWORD) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Сброс пароля</CardTitle>
            <CardDescription>
              Введите email, который вы использовали при регистрации
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm
              onCancel={() => setView(AuthView.LOGIN)}
              onSuccess={() => setView(AuthView.LOGIN)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            TelePost Scheduler
          </CardTitle>
          <CardDescription className="text-center">
            Планируйте и автоматизируйте отправку сообщений в Telegram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue={view} 
            value={view} 
            onValueChange={(value) => setView(value as AuthView)}
          >
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value={AuthView.LOGIN}>Вход</TabsTrigger>
              <TabsTrigger value={AuthView.REGISTER}>Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value={AuthView.LOGIN}>
              <LoginForm onForgotPassword={() => setView(AuthView.RESET_PASSWORD)} />
            </TabsContent>
            <TabsContent value={AuthView.REGISTER}>
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 