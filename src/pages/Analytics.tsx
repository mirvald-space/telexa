import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye, FileText, BarChart2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChannelAnalytics {
  id: string;
  channel_id: string;
  channel_title: string;
  subscribers_count: number;
  views_count: number;
  posts_count: number;
  average_views: number;
  last_updated: string;
}

interface TelegramChannelInfo {
  channel_info: {
    id: number;
    title: string;
    username?: string;
  };
  subscribers_count: number;
  views_count: number;
  posts_count: number;
  average_views: number;
  bot_status: string;
}

const Analytics = () => {
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadChannelAnalytics();
    }
  }, [user]);

  const loadChannelAnalytics = async () => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Получаем конфигурацию бота для получения ID канала и токена
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (configError) {
        throw configError;
      }

      if (!configData || configData.length === 0 || !configData[0].chat_ids || configData[0].chat_ids.length === 0) {
        setError("Нет данных о канале. Добавьте канал в настройках бота.");
        setLoading(false);
        return;
      }

      const channelId = configData[0].chat_ids[0]; // Берем первый канал из списка
      const botToken = configData[0].token;

      if (!botToken) {
        setError("Токен бота не настроен. Пожалуйста, настройте бота в профиле.");
        setLoading(false);
        return;
      }

      // Получаем аналитику канала из базы данных
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('channel_analytics')
        .select('*')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .single();

      if (analyticsError && analyticsError.code !== 'PGRST116') { // PGRST116 - no rows returned
        console.error('Error loading analytics data:', analyticsError);
      }

      if (analyticsData) {
        setChannelAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading channel analytics:', error);
      setError("Не удалось загрузить аналитику канала. Пожалуйста, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const updateChannelAnalytics = async () => {
    if (!user) {
      return;
    }

    setUpdating(true);
    setError(null);
    setBotStatus(null);
    try {
      // Получаем конфигурацию бота для получения ID канала и токена
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (configError) {
        throw configError;
      }

      if (!configData || configData.length === 0 || !configData[0].chat_ids || configData[0].chat_ids.length === 0) {
        throw new Error("Нет данных о канале. Добавьте канал в настройках бота.");
      }

      const channelId = configData[0].chat_ids[0]; // Берем первый канал из списка
      const botToken = configData[0].token;

      if (!botToken) {
        throw new Error("Токен бота не настроен. Пожалуйста, настройте бота в профиле.");
      }

      // Вызываем Edge Function для получения данных о канале через Telegram API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-channel-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          channelId,
          botToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при получении данных о канале");
      }

      const telegramData: { success: boolean, data: TelegramChannelInfo } = await response.json();
      
      if (!telegramData.success) {
        throw new Error("Не удалось получить данные о канале");
      }

      // Сохраняем статус бота для отображения предупреждения
      setBotStatus(telegramData.data.bot_status);

      // Проверяем, есть ли уже запись в базе данных
      const { data: existingAnalytics, error: getError } = await supabase
        .from('channel_analytics')
        .select('*')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .single();

      let updatedAnalytics;

      if (getError && getError.code === 'PGRST116') { // Запись не найдена
        // Создаем новую запись
        const { data: newAnalytics, error: insertError } = await supabase
          .from('channel_analytics')
          .insert({
            user_id: user.id,
            channel_id: channelId,
            channel_title: telegramData.data.channel_info.title,
            subscribers_count: telegramData.data.subscribers_count,
            views_count: telegramData.data.views_count,
            posts_count: telegramData.data.posts_count,
            average_views: telegramData.data.average_views,
            last_updated: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        updatedAnalytics = newAnalytics;
      } else if (getError) {
        throw getError;
      } else {
        // Обновляем существующую запись
        const { data: updatedData, error: updateError } = await supabase
          .from('channel_analytics')
          .update({
            channel_title: telegramData.data.channel_info.title,
            subscribers_count: telegramData.data.subscribers_count,
            views_count: telegramData.data.views_count,
            posts_count: telegramData.data.posts_count,
            average_views: telegramData.data.average_views,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingAnalytics.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        updatedAnalytics = updatedData;
      }

      setChannelAnalytics(updatedAnalytics);
      toast({
        title: "Данные обновлены",
        description: "Аналитика канала успешно обновлена",
      });
    } catch (error) {
      console.error('Error updating channel analytics:', error);
      setError(error.message || "Не удалось обновить аналитику канала");
      toast({
        title: "Ошибка обновления данных",
        description: error.message || "Не удалось обновить аналитику канала",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {botStatus && botStatus !== 'administrator' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Внимание</AlertTitle>
            <AlertDescription>
              Бот не является администратором канала. Некоторые данные могут быть недоступны или неточны. 
              Пожалуйста, добавьте бота как администратора канала для получения полной и точной статистики.
            </AlertDescription>
          </Alert>
        )}

        {botStatus === 'administrator' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Бот имеет права администратора</AlertTitle>
            <AlertDescription className="text-green-600">
              Бот является администратором канала и имеет доступ к статистике. Данные максимально точные.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-5 w-40" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-32" />
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-16 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : channelAnalytics ? (
          <>
            <Card className="flex  items-center  justify-between mb-6 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>{channelAnalytics.channel_title || 'Ваш канал'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  ID канала: {channelAnalytics.channel_id}
                </p>
                <p className="text-sm text-gray-500">
                  Последнее обновление: {formatDate(channelAnalytics.last_updated)}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={updateChannelAnalytics} 
                  disabled={updating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                  Обновить данные
                </Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Подписчики</CardTitle>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{channelAnalytics.subscribers_count.toLocaleString()}</div>
                  <p className="text-sm text-gray-500 mt-1">Всего подписчиков</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Просмотры</CardTitle>
                    <Eye className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{channelAnalytics.views_count.toLocaleString()}</div>
                  <p className="text-sm text-gray-500 mt-1">Всего просмотров</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Публикации</CardTitle>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{channelAnalytics.posts_count.toLocaleString()}</div>
                  <p className="text-sm text-gray-500 mt-1">Всего публикаций</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Средний охват</CardTitle>
                    <BarChart2 className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {channelAnalytics.average_views.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Просмотров на пост</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Нет данных о канале. Добавьте канал в настройках бота.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analytics;