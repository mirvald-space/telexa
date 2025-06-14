import React, { useState, useEffect } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ScheduledPosts } from '@/components/ScheduledPosts';
import { BotSettings } from '@/components/BotSettings';
import { Calendar } from '@/components/ScheduleCalendar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Calendar as CalendarIcon, Settings, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [activeTab, setActiveTab] = useState('editor');
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
        title: "Error loading data",
        description: "Failed to load posts and settings from database.",
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
        title: "Bot settings saved",
        description: "Your Telegram bot configuration has been updated.",
      });
    } catch (error) {
      console.error('Error saving bot config:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save bot configuration to database.",
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
        title: "Post scheduled",
        description: `Your post has been scheduled for ${new Date(postData.scheduled_time).toLocaleString()}`,
      });
      
      setActiveTab('posts');
    } catch (error) {
      console.error('Error adding post:', error);
      toast({
        title: "Error scheduling post",
        description: "Failed to save post to database.",
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
        title: "Post updated",
        description: "Your post has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error updating post",
        description: "Failed to update post in database.",
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
        title: "Post deleted",
        description: "The scheduled post has been removed.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error deleting post",
        description: "Failed to delete post from database.",
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
          title: "Posts processed",
          description: `${sentCount} sent successfully, ${failedCount} failed`,
        });
      } else {
        toast({
          title: "No posts to send",
          description: "All scheduled posts are either in the future or already sent.",
        });
      }
    } catch (error) {
      console.error('Error sending posts:', error);
      toast({
        title: "Error sending posts",
        description: "Failed to send scheduled posts. Check your bot configuration.",
        variant: "destructive",
      });
    } finally {
      setSendingPosts(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const sentCount = posts.filter(p => p.status === 'sent').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Telegram Scheduler
          </h1>
          <p className="text-purple-200 text-lg">
            Schedule and manage your Telegram channel posts with ease
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-medium">Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-300">{scheduledCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-medium">Sent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">{sentCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-medium">Bot Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${botConfig.token && botConfig.chat_id ? 'text-green-300' : 'text-red-300'}`}>
                {botConfig.token && botConfig.chat_id ? 'Connected' : 'Not Set'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-medium">Send Now</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={sendScheduledPosts}
                disabled={sendingPosts || scheduledCount === 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                size="sm"
              >
                {sendingPosts ? 'Sending...' : 'Send Due Posts'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-md">
                <TabsTrigger value="editor" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Editor</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Posts</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="mt-6">
                <PostEditor onSubmit={addPost} />
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
                <Calendar posts={posts} onPostClick={(post) => setActiveTab('posts')} />
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <ScheduledPosts 
                  posts={posts} 
                  onUpdate={updatePost} 
                  onDelete={deletePost} 
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <BotSettings config={botConfig} onSave={saveBotConfig} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="mt-8 bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Telegram Integration</CardTitle>
          </CardHeader>
          <CardContent className="text-purple-200 space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">✅ Telegram Bot Ready:</h3>
              <p className="text-sm">
                Your app now includes real Telegram Bot API integration! Posts scheduled in the past will be sent automatically when you click "Send Due Posts" or when the automatic scheduler runs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🔄 Automatic Scheduling:</h3>
              <p className="text-sm">
                To enable automatic sending every minute, we'll need to set up a cron job. For now, use the "Send Due Posts" button to manually trigger sending of scheduled posts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Bot Setup Requirements:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Create a bot via @BotFather on Telegram</li>
                <li>Get your bot token and channel/chat ID</li>
                <li>Add the bot to your channel as an admin</li>
                <li>Configure the bot settings in the Settings tab</li>
                <li>Test with the "Send Due Posts" button</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
