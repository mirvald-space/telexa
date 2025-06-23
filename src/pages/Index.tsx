import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PostEditor } from '@/components/PostEditor';
import { ScheduledPosts } from '@/components/ScheduledPosts';
import { Calendar as ScheduleCalendar } from '@/components/ScheduleCalendar';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Header } from '@/components/layout/Header';
import { StatsGrid } from '@/components/dashboard/StatsGrid';

export interface Post {
  id: string;
  content: string;
  image_url?: string;
  image_urls?: string[];
  scheduled_time: string;
  status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
  chat_ids?: string[];
  user_id?: string;
}

export interface BotConfig {
  token: string;
  chat_ids: string[]; // Единственное поле для хранения каналов
}

const Index = () => {
  const location = useLocation();
  const [activeView, setActiveView] = useState('dashboard');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    token: '',
    chat_ids: [],
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Обработка параметра view из URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam && ['dashboard', 'posts', 'editor'].includes(viewParam)) {
      setActiveView(viewParam);
    }
  }, [location.search]);

  // Load data from Supabase
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) {
      console.error('No user found for loadData');
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }

    console.log('Loading data for user:', user.id);
    setLoading(true);
    try {
      // Load posts for current user
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        throw postsError;
      }
      
      if (postsData) {
        console.log(`Loaded ${postsData.length} posts`);
        // Cast the data to match our Post interface
        const typedPosts: Post[] = postsData.map(post => ({
          id: post.id,
          content: post.content,
          image_url: post.image_url || undefined,
          image_urls: (post as any).image_urls || undefined,
          scheduled_time: post.scheduled_time,
          status: post.status as 'scheduled' | 'sent' | 'failed',
          created_at: post.created_at,
          chat_ids: (post as any).chat_ids || undefined,
          user_id: post.user_id || undefined
        }));
        setPosts(typedPosts);
      }

      // Load bot config for current user
      console.log('Loading bot config for user:', user.id);
      const { data: configData, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (configError) {
        console.error('Error loading bot config:', configError);
        throw configError;
      }
      
      console.log('Bot config data:', configData);
      
      if (configData && configData.length > 0) {
        // Логируем данные из базы
        console.log('Config data from DB:', configData[0]);
        
        // Проверяем наличие chat_ids и токена
        const chatIds = (configData[0] as any).chat_ids || [];
        const token = (configData[0] as any).token || import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
        console.log('Chat IDs from DB:', chatIds, 'Type:', typeof chatIds, 'Length:', chatIds ? chatIds.length : 0);
        console.log('Token from DB:', token);
        
        // Формируем конфиг
        const newConfig = {
          token: token, // Используем токен из базы данных
          chat_ids: chatIds
        };
        
        console.log('Setting bot config:', newConfig);
        setBotConfig(newConfig);
      } else {
        // Если конфигурации нет, устанавливаем дефолтные значения
        const defaultConfig = {
          token: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '', // Используем переменную TELEGRAM_BOT_TOKEN
          chat_ids: []
        };
        console.log('Setting default bot config:', defaultConfig);
        setBotConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить данные из базы данных.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save bot config to Supabase - ID каналов
  const saveBotConfig = async (config: BotConfig) => {
    if (!user) {
      console.error('No authenticated user found');
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('User ID for saving:', user.id);
      
      // Проверяем, что chat_ids - это массив строк
      const chatIdsToSave = Array.isArray(config.chat_ids) ? config.chat_ids.filter(Boolean) : [];
      
      if (chatIdsToSave.length === 0) {
        toast({
          title: "Ошибка сохранения настроек",
          description: "Необходимо указать хотя бы один ID канала",
          variant: "destructive",
        });
        return;
      }
      
      // Убедимся, что это массив строк для PostgreSQL
      const chatIdsArray = chatIdsToSave.map(id => String(id));
      
      console.log('Saving bot config with chat_ids:', chatIdsArray);
      
      // Напрямую вставляем новую конфигурацию, не удаляя старую
      const { error: insertError } = await supabase
        .from('bot_configs')
        .insert({
          token: botConfig.token, // Используем текущий токен из состояния
          chat_ids: chatIdsArray,
          user_id: user.id
        });

      if (insertError) {
        console.error('Error inserting bot config:', insertError);
        throw new Error(`Ошибка при сохранении настроек: ${insertError.message}`);
      }

      console.log('Bot config saved successfully');
      
      setBotConfig({
        token: botConfig.token, // Сохраняем текущий токен
        chat_ids: chatIdsArray
      });
      
      toast({
        title: "Настройки сохранены",
        description: chatIdsArray.length > 1 
          ? "ID ваших каналов были успешно сохранены." 
          : "ID вашего канала был успешно сохранен.",
      });
      
      // Reload posts with new config if needed
      loadData();
    } catch (error: any) {
      console.error('Error saving bot config:', error);
      toast({
        title: "Ошибка сохранения настроек",
        description: error.message || "Не удалось сохранить настройки каналов в базе данных.",
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
    
    if (botConfig.chat_ids.length === 0 && !postData.chat_ids) {
      toast({
        title: "Канал не настроен",
        description: "Пожалуйста, укажите ID канала в настройках или при создании поста.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Определяем ID канала для поста
      const chatIds = postData.chat_ids || (botConfig.chat_ids.length > 0 ? botConfig.chat_ids : []);
      
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          content: postData.content,
          image_urls: postData.image_urls,
          scheduled_time: postData.scheduled_time,
          chat_ids: chatIds,
          status: 'scheduled',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newPost: Post = {
        id: data.id,
        content: data.content,
        image_urls: (data as any).image_urls,
        scheduled_time: data.scheduled_time,
        status: data.status as 'scheduled' | 'sent' | 'failed',
        created_at: data.created_at,
        chat_ids: (data as any).chat_ids,
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
  const isConnected = botConfig.token && botConfig.chat_ids.length > 0;

  return (
    <main className="flex max-w-4xl flex-col mx-auto">
      {/* Хедер с навигацией и профилем */}
      <Header 
        activeView={activeView}
        onViewChange={setActiveView}
        postsCount={posts.length}
      />
      
      {/* Контент */}
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <StatsGrid 
                scheduledCount={scheduledCount}
                sentCount={sentCount}
                failedCount={failedCount}
                totalCount={posts.length}
              />

              {/* Schedule Calendar */}
              <ScheduleCalendar posts={posts} onPostClick={(post) => setActiveView('posts')} />
            </div>
          )}

          {/* Other Views */}
                {activeView === 'editor' && (
        <PostEditor onSubmit={addPost} botConfig={botConfig} />
      )}

          {activeView === 'posts' && (

                <ScheduledPosts 
                  posts={posts} 
                  onUpdate={updatePost} 
                  onDelete={deletePost} 
                />

          )}
    </main>
  );
};

export default Index;
