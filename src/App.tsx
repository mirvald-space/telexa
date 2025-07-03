import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PromoPage from "./pages/Promo";

const queryClient = new QueryClient();

// Компонент для роутинга приложения
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<PromoPage />} />
        
        {/* Защищенные маршруты */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          {/* Добавьте другие защищенные маршруты здесь */}
        </Route>
        
        {/* Маршрут для обработки сброса пароля */}
        <Route path="/reset-password" element={<Auth />} />
        
        {/* Маршрут 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
