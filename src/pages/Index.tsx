
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
  const { toast } = useToast();

  // Load data from localStorage (simulating Supabase for now)
  useEffect(() => {
    const savedPosts = localStorage.getItem('telegram-posts');
    const savedConfig = localStorage.getItem('bot-config');
    
    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    }
    
    if (savedConfig) {
      setBotConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Save posts to localStorage
  const savePosts = (updatedPosts: Post[]) => {
    setPosts(updatedPosts);
    localStorage.setItem('telegram-posts', JSON.stringify(updatedPosts));
  };

  // Save bot config
  const saveBotConfig = (config: BotConfig) => {
    setBotConfig(config);
    localStorage.setItem('bot-config', JSON.stringify(config));
    toast({
      title: "Bot settings saved",
      description: "Your Telegram bot configuration has been updated.",
    });
  };

  // Add new post
  const addPost = (postData: Omit<Post, 'id' | 'created_at' | 'status'>) => {
    const newPost: Post = {
      ...postData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      status: 'scheduled',
      chat_id: botConfig.chat_id
    };
    
    const updatedPosts = [...posts, newPost];
    savePosts(updatedPosts);
    
    toast({
      title: "Post scheduled",
      description: `Your post has been scheduled for ${new Date(postData.scheduled_time).toLocaleString()}`,
    });
    
    setActiveTab('posts');
  };

  // Update post
  const updatePost = (postId: string, updates: Partial<Post>) => {
    const updatedPosts = posts.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    );
    savePosts(updatedPosts);
    
    toast({
      title: "Post updated",
      description: "Your post has been successfully updated.",
    });
  };

  // Delete post
  const deletePost = (postId: string) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    savePosts(updatedPosts);
    
    toast({
      title: "Post deleted",
      description: "The scheduled post has been removed.",
    });
  };

  // Check for posts to send (would be replaced with proper scheduling service)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const postsToSend = posts.filter(post => 
        post.status === 'scheduled' && 
        new Date(post.scheduled_time) <= now
      );

      if (postsToSend.length > 0 && botConfig.token && botConfig.chat_id) {
        postsToSend.forEach(post => {
          // Simulate sending (would use actual Telegram Bot API)
          console.log('Sending post:', post);
          updatePost(post.id, { status: 'sent' });
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [posts, botConfig]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            <CardTitle className="text-white">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-purple-200 space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Supabase Setup:</h3>
              <p className="text-sm">
                Connect to Supabase using the green button in the top right. The app will need tables for posts and bot configurations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Telegram Bot Setup:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Create a bot via @BotFather on Telegram</li>
                <li>Get your bot token and channel/chat ID</li>
                <li>Add the bot to your channel as an admin</li>
                <li>Configure the bot settings in the Settings tab</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
