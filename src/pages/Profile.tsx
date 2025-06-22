import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotSettings } from '@/components/BotSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Bot, LogOut } from 'lucide-react';
import type { BotConfig } from '@/pages/Index';
import { Header } from '@/components/layout/Header';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [botConfig, setBotConfig] = useState<BotConfig>({ token: '@telexapost_bot', chat_id: '' });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Определяем активный вид для согласованности с главной страницей
  const [activeView, setActiveView] = useState('dashboard');
  
  // Обработчик изменения вида, который будет перенаправлять на главную страницу
  const handleViewChange = (view: string) => {
    navigate(`/?view=${view}`);
  };

  useEffect(() => {
    if (user) {
      loadBotConfig();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const loadBotConfig = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setBotConfig({
          token: '@telexapost_bot',
          chat_id: data[0].chat_id
        });
      }
    } catch (error) {
      console.error('Error loading bot config:', error);
      toast({
        title: "Ошибка загрузки настроек",
        description: "Не удалось загрузить настройки бота.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBotConfig = async (config: BotConfig) => {
    if (!user) return;
    
    try {
      await supabase.from('bot_configs').delete().eq('user_id', user.id);
      
      const { error } = await supabase
        .from('bot_configs')
        .insert([{
          token: '@telexapost_bot',
          chat_id: config.chat_id,
          user_id: user.id
        }]);

      if (error) throw error;

      setBotConfig({
        token: '@telexapost_bot',
        chat_id: config.chat_id
      });
      
      toast({
        title: "Настройки сохранены",
        description: "ID вашего канала был успешно сохранен.",
      });
    } catch (error) {
      console.error('Error saving bot config:', error);
      toast({
        title: "Ошибка сохранения настроек",
        description: "Не удалось сохранить ID канала в базе данных.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (

<main className="max-w-4xl mx-auto flex flex-col">
      <Header 
        showNavigation={true}
        activeView={activeView}
        onViewChange={handleViewChange}
      />


              <Tabs defaultValue="bot">
                <TabsList className="mb-6">
                  <TabsTrigger value="bot">Настройки бота</TabsTrigger>
                  <TabsTrigger value="account">Настройки аккаунта</TabsTrigger>
                </TabsList>
                <TabsContent value="bot">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                    </div>
                  ) : (
                    <BotSettings config={botConfig} onSave={saveBotConfig} />
                  )}
                </TabsContent>
                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Настройки аккаунта</CardTitle>
                      <CardDescription>
                        Управление настройками вашего аккаунта
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col items-center justify-center py-6">
                        <Avatar className="h-24 w-24 mb-4">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email || 'User'}`} />
                          <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-semibold">{user.email || 'Пользователь'}</h3>
                        <p className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded">{user.email}</p>
                      </div>

                      <Button 
                        variant="destructive" 
                        className="w-full" 
                        onClick={() => {
                          signOut();
                          navigate('/auth');
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Выйти из аккаунта
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>


</main>
  );
};

export default Profile; 