import React, { useState, useEffect } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ScheduledPosts } from '@/components/ScheduledPosts';
import { BotSettings } from '@/components/BotSettings';
import { Calendar } from '@/components/ScheduleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Calendar as CalendarIcon, Settings, List, Clock, CheckCircle, AlertCircle, Plus, Activity, Bot } from 'lucide-react';
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
      
      setActiveView('posts');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center space-x-3 text-indigo-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-lg font-medium">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const sentCount = posts.filter(p => p.status === 'sent').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;
  const isConnected = botConfig.token && botConfig.chat_id;

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'editor', label: 'Create Post', icon: Plus },
    { id: 'posts', label: 'All Posts', icon: List },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'settings', label: 'Bot Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Telegram Scheduler</h1>
                <p className="text-sm text-gray-500">Automate your channel posts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                {isConnected ? 'Connected' : 'Not Connected'}
              </Badge>
              
              <Button 
                onClick={sendScheduledPosts}
                disabled={sendingPosts || scheduledCount === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="sm"
              >
                {sendingPosts ? 'Sending...' : 'Send Due Posts'}
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                    ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
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
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-blue-700">Scheduled</CardTitle>
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{scheduledCount}</div>
                  <p className="text-sm text-blue-600 mt-1">Ready to send</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-green-700">Sent</CardTitle>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{sentCount}</div>
                  <p className="text-sm text-green-600 mt-1">Successfully delivered</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-red-700">Failed</CardTitle>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-900">{failedCount}</div>
                  <p className="text-sm text-red-600 mt-1">Needs attention</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-purple-700">Total</CardTitle>
                    <List className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{posts.length}</div>
                  <p className="text-sm text-purple-600 mt-1">All posts</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription>Get started with common tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setActiveView('editor')}
                    className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Create New Post
                  </Button>
                  <Button 
                    onClick={() => setActiveView('calendar')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    View Calendar
                  </Button>
                  {!isConnected && (
                    <Button 
                      onClick={() => setActiveView('settings')}
                      variant="outline"
                      className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Setup Bot Connection
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>Setup guide for new users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        1
                      </div>
                      <div>
                        <p className="font-medium">Setup Telegram Bot</p>
                        <p className="text-gray-600">Create bot via @BotFather and get your token</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Add Bot to Channel</p>
                        <p className="text-gray-600">Make your bot an admin in your channel</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Start Scheduling</p>
                        <p className="text-gray-600">Create and schedule your first post</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Posts Preview */}
            {posts.length > 0 && (
              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Posts</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveView('posts')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {posts.slice(0, 3).map((post) => (
                      <div key={post.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
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
                          {post.status}
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
          <Card className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span>Create New Post</span>
              </CardTitle>
              <CardDescription>Schedule a new message for your Telegram channel</CardDescription>
            </CardHeader>
            <CardContent>
              <PostEditor onSubmit={addPost} />
            </CardContent>
          </Card>
        )}

        {activeView === 'posts' && (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <List className="w-5 h-5 text-blue-600" />
                <span>All Posts</span>
              </CardTitle>
              <CardDescription>Manage your scheduled and sent posts</CardDescription>
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
          <Card className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>Calendar View</span>
              </CardTitle>
              <CardDescription>Visual overview of your scheduled posts</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar posts={posts} onPostClick={(post) => setActiveView('posts')} />
            </CardContent>
          </Card>
        )}

        {activeView === 'settings' && (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Bot Settings</span>
              </CardTitle>
              <CardDescription>Configure your Telegram bot connection</CardDescription>
            </CardHeader>
            <CardContent>
              <BotSettings config={botConfig} onSave={saveBotConfig} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
