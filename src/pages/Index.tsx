import React, { useState, useEffect } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ScheduledPosts } from '@/components/ScheduledPosts';
import { BotSettings } from '@/components/BotSettings';
import { Calendar as ScheduleCalendar } from '@/components/ScheduleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Calendar as CalendarIcon, Settings, List, Clock, CheckCircle, AlertCircle, Plus, Activity, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserMenu } from '@/components/auth/UserMenu';

export interface Post {
  id: string;
  content: string;
  image_url?: string;
  scheduled_time: string;
  status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
  chat_id?: string;
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

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
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
          chat_id: post.chat_id || undefined
        }));
        setPosts(typedPosts);
      }

      // Load bot config
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (configError) throw configError;
      if (configData && configData.length > 0) {
        setBotConfig({
          token: configData[0].token,
          chat_id: configData[0].chat_id
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить посты и настройки из базы данных.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save bot config to Supabase
  const saveBotConfig = async (config: BotConfig) => {
    try {
      // Delete existing configs and insert new one
      await supabase.from('bot_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      const { error } = await supabase
        .from('bot_configs')
        .insert([{
          token: config.token,
          chat_id: config.chat_id
        }]);

      if (error) throw error;

      setBotConfig(config);
      toast({
        title: "Настройки бота сохранены",
        description: "Конфигурация вашего Telegram-бота была обновлена.",
      });
    } catch (error) {
      console.error('Error saving bot config:', error);
      toast({
        title: "Ошибка сохранения настроек",
        description: "Не удалось сохранить конфигурацию бота в базе данных.",
        variant: "destructive",
      });
    }
  };

  // Add new post to Supabase
  const addPost = async (postData: Omit<Post, 'id' | 'created_at' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          content: postData.content,
          image_url: postData.image_url,
          scheduled_time: postData.scheduled_time,
          chat_id: botConfig.chat_id,
          status: 'scheduled'
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
        chat_id: data.chat_id
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
    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId);

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
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

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
    setSendingPosts(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-message');
      
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

  const navigation = [
    { id: 'dashboard', label: 'Дашборд', icon: Activity },
    { id: 'editor', label: 'Создать пост', icon: Plus },
    { id: 'posts', label: 'Все посты', icon: List },
    { id: 'calendar', label: 'Календарь', icon: CalendarIcon },
    { id: 'settings', label: 'Настройки бота', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Хедер с навигацией и профилем */}
      <header className="border-b bg-card shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">TelePost Scheduler</h1>
            <div className="lg:flex gap-2 items-center hidden">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('dashboard')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Дашборд
              </Button>
              <Button
                variant={activeView === 'posts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('posts')}
              >
                <List className="h-4 w-4 mr-2" />
                Посты
              </Button>
              <Button
                variant={activeView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('calendar')}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Календарь
              </Button>
              <Button
                variant={activeView === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={sendScheduledPosts} disabled={sendingPosts}>
              {sendingPosts ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Отправить запланированные
            </Button>
            <UserMenu />
          </div>
        </div>
        
        {/* Мобильная навигация */}
        <div className="flex lg:hidden border-t overflow-x-auto">
          <Button
            variant={activeView === 'dashboard' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveView('dashboard')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Дашборд
          </Button>
          <Button
            variant={activeView === 'posts' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveView('posts')}
          >
            <List className="h-4 w-4 mr-2" />
            Посты
          </Button>
          <Button
            variant={activeView === 'calendar' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveView('calendar')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Календарь
          </Button>
          <Button
            variant={activeView === 'settings' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveView('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </Button>
        </div>
      </header>
      
      {/* Контент */}
      <main className="flex-1 overflow-auto bg-muted/40 p-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeView === item.id
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

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

              {/* Recent Posts Preview */}
              {posts.length > 0 && (
                <Card className="border-gray-200 bg-white mt-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Недавние посты</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveView('posts')}
                      >
                        Смотреть все
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {posts.slice(0, 3).map((post) => (
                        <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {post.content.slice(0, 60)}...
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(post.scheduled_time).toLocaleString()}
                            </p>
                          </div>
                          <Badge 
                            variant={post.status === 'sent' ? 'default' : post.status === 'failed' ? 'destructive' : 'secondary'}
                            className="ml-3"
                          >
                            {post.status === 'scheduled' ? 'запланирован' : 
                             post.status === 'sent' ? 'отправлен' : 'ошибка'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Other Views */}
          {activeView === 'editor' && (
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Send className="w-5 h-5 text-gray-600" />
                  <span>Создать новый пост</span>
                </CardTitle>
                <CardDescription>Запланировать новое сообщение для вашего Телеграм-канала</CardDescription>
              </CardHeader>
              <CardContent>
                <PostEditor onSubmit={addPost} />
              </CardContent>
            </Card>
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

          {activeView === 'calendar' && (
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                  <span>Календарь</span>
                </CardTitle>
                <CardDescription>Визуальный обзор ваших запланированных постов</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleCalendar posts={posts} onPostClick={(post) => setActiveView('posts')} />
              </CardContent>
            </Card>
          )}

          {activeView === 'settings' && (
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span>Настройки бота</span>
                </CardTitle>
                <CardDescription>Настройка подключения вашего Телеграм-бота</CardDescription>
              </CardHeader>
              <CardContent>
                <BotSettings config={botConfig} onSave={saveBotConfig} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
