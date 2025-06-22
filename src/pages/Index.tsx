import React, { useState, useEffect } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ScheduledPosts } from '@/components/ScheduledPosts';
import { Calendar as ScheduleCalendar } from '@/components/ScheduleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, List, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Header } from '@/components/layout/Header';

export interface Post {
  id: string;
  content: string;
  image_url?: string;
  scheduled_time: string;
  status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
  chat_id?: string;
  user_id?: string;
}

export interface BotConfig {
  token: string;
  chat_id: string;
}

const Index = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig>({ token: '', chat_id: '' });
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sendingPosts, setSendingPosts] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load data from Supabase
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Load posts for current user
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (postsData) {
        // Cast the data to match our Post interface
        const typedPosts: Post[] = postsData.map(post => ({
          id: post.id,
          content: post.content,
          image_url: post.image_url || undefined,
          scheduled_time: post.scheduled_time,
          status: post.status as 'scheduled' | 'sent' | 'failed',
          created_at: post.created_at,
          chat_id: post.chat_id || undefined,
          user_id: post.user_id || undefined
        }));
        setPosts(typedPosts);
      }

      // Load bot config for current user
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (configError) throw configError;
      if (configData && configData.length > 0) {
        setBotConfig({
          token: '@telexapost_bot', // Используем имя бота сервиса
          chat_id: configData[0].chat_id
        });
      } else {
        // Если конфигурации нет, устанавливаем имя бота сервиса
        setBotConfig({
          token: '@telexapost_bot',
          chat_id: ''
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить посты из базы данных.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save bot config to Supabase - только ID канала
  const saveBotConfig = async (config: BotConfig) => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete existing configs for this user and insert new one
      await supabase.from('bot_configs').delete().eq('user_id', user.id);
      
      const { error } = await supabase
        .from('bot_configs')
        .insert([{
          token: '@telexapost_bot', // Используем имя бота сервиса
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
      
      // Reload posts with new config if needed
      loadData();
    } catch (error) {
      console.error('Error saving bot config:', error);
      toast({
        title: "Ошибка сохранения настроек",
        description: "Не удалось сохранить ID канала в базе данных.",
        variant: "destructive",
      });
    }
  };

  // Add new post to Supabase
  const addPost = async (postData: Omit<Post, 'id' | 'created_at' | 'status' | 'user_id'>) => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }
    
    if (!botConfig.chat_id && !postData.chat_id) {
      toast({
        title: "Канал не настроен",
        description: "Пожалуйста, укажите ID канала в настройках или при создании поста.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          content: postData.content,
          image_url: postData.image_url,
          scheduled_time: postData.scheduled_time,
          chat_id: postData.chat_id || botConfig.chat_id, // Используем ID канала из поста или из настроек
          status: 'scheduled',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newPost: Post = {
        id: data.id,
        content: data.content,
        image_url: data.image_url,
        scheduled_time: data.scheduled_time,
        status: data.status as 'scheduled' | 'sent' | 'failed',
        created_at: data.created_at,
        chat_id: data.chat_id,
        user_id: data.user_id
      };

      setPosts(prev => [newPost, ...prev]);
      
      toast({
        title: "Пост запланирован",
        description: `Ваш пост запланирован на ${new Date(postData.scheduled_time).toLocaleString()}`,
      });
      
      setActiveView('posts');
    } catch (error) {
      console.error('Error adding post:', error);
      toast({
        title: "Ошибка планирования поста",
        description: "Не удалось сохранить пост в базе данных.",
        variant: "destructive",
      });
    }
  };

  // Update post in Supabase
  const updatePost = async (postId: string, updates: Partial<Post>) => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, ...updates } : post
      ));
      
      toast({
        title: "Пост обновлен",
        description: "Ваш пост был успешно обновлен.",
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Ошибка обновления поста",
        description: "Не удалось обновить пост в базе данных.",
        variant: "destructive",
      });
    }
  };

  // Delete post from Supabase
  const deletePost = async (postId: string) => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPosts(prev => prev.filter(post => post.id !== postId));
      
      toast({
        title: "Пост удален",
        description: "Запланированный пост был удален.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Ошибка удаления поста",
        description: "Не удалось удалить пост из базы данных.",
        variant: "destructive",
      });
    }
  };

  // Manually trigger sending posts (for testing)
  const sendScheduledPosts = async () => {
    if (!user) {
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }
    
    setSendingPosts(true);
    try {
      // Передаем ID пользователя в функцию для обработки только его постов
      const { data, error } = await supabase.functions.invoke('send-telegram-message', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;

      // Reload posts to see updated statuses
      await loadData();
      
      if (data.results && data.results.length > 0) {
        const sentCount = data.results.filter(r => r.status === 'sent').length;
        const failedCount = data.results.filter(r => r.status === 'failed').length;
        
        toast({
          title: "Посты обработаны",
          description: `${sentCount} отправлено успешно, ${failedCount} с ошибками`,
        });
      } else {
        toast({
          title: "Нет постов для отправки",
          description: "Все запланированные посты либо в будущем, либо уже отправлены.",
        });
      }
    } catch (error) {
      console.error('Error sending posts:', error);
      toast({
        title: "Ошибка отправки постов",
        description: "Не удалось отправить запланированные посты. Проверьте конфигурацию бота.",
        variant: "destructive",
      });
    } finally {
      setSendingPosts(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3 text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          <span className="text-lg font-medium">Загрузка вашего рабочего пространства...</span>
        </div>
      </div>
    );
  }

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const sentCount = posts.filter(p => p.status === 'sent').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;
  const isConnected = botConfig.token && botConfig.chat_id;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Хедер с навигацией и профилем */}
      <Header 
        activeView={activeView}
        onViewChange={setActiveView}
        onSendScheduled={sendScheduledPosts}
        sendingPosts={sendingPosts}
      />
      
      {/* Контент */}
      <main className="flex-1 overflow-auto bg-muted/40 p-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600">Запланировано</CardTitle>
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{scheduledCount}</div>
                    <p className="text-sm text-gray-500 mt-1">Готово к отправке</p>
                  </CardContent>
                </Card>
                
                <Card className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600">Отправлено</CardTitle>
                      <CheckCircle className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{sentCount}</div>
                    <p className="text-sm text-gray-500 mt-1">Успешно доставлено</p>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600">С ошибками</CardTitle>
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{failedCount}</div>
                    <p className="text-sm text-gray-500 mt-1">Требуют внимания</p>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600">Всего</CardTitle>
                      <List className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{posts.length}</div>
                    <p className="text-sm text-gray-500 mt-1">Все посты</p>
                  </CardContent>
                </Card>
              </div>

              {/* Schedule Calendar */}
              <ScheduleCalendar posts={posts} onPostClick={(post) => setActiveView('posts')} />
            </div>
          )}

          {/* Other Views */}
          {activeView === 'editor' && (
                <PostEditor onSubmit={addPost} />
          )}

          {activeView === 'posts' && (
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <List className="w-5 h-5 text-gray-600" />
                  <span>Все посты</span>
                </CardTitle>
                <CardDescription>Управление запланированными и отправленными постами</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduledPosts 
                  posts={posts} 
                  onUpdate={updatePost} 
                  onDelete={deletePost} 
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
