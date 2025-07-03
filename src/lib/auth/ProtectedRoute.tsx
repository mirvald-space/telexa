import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
  redirectTo?: string;
};

export function ProtectedRoute({ redirectTo = "/" }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Показываем спиннер во время проверки состояния аутентификации
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на главную страницу
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Если пользователь авторизован, показываем дочерние роуты
  return <Outlet />;
} 