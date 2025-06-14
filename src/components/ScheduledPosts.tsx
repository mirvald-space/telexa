
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Edit, Trash, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@/pages/Index';

interface ScheduledPostsProps {
  posts: Post[];
  onUpdate: (postId: string, updates: Partial<Post>) => void;
  onDelete: (postId: string) => void;
}

export const ScheduledPosts: React.FC<ScheduledPostsProps> = ({
  posts,
  onUpdate,
  onDelete,
}) => {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const { toast } = useToast();

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditScheduledTime(post.scheduled_time.slice(0, 16)); // Format for datetime-local
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;

    if (!editContent.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }

    const scheduleDate = new Date(editScheduledTime);
    if (scheduleDate <= new Date() && editingPost.status === 'scheduled') {
      toast({
        title: "Invalid schedule time",
        description: "Please select a future date and time for scheduled posts.",
        variant: "destructive",
      });
      return;
    }

    onUpdate(editingPost.id, {
      content: editContent,
      scheduled_time: new Date(editScheduledTime).toISOString(),
    });

    setEditingPost(null);
    setEditContent('');
    setEditScheduledTime('');
  };

  const handleDelete = (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      onDelete(postId);
    }
  };

  const getStatusIcon = (status: Post['status']) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Post['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'sent':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Set minimum datetime to current time
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Scheduled Posts</h2>
        <div className="text-purple-300">
          {posts.length} post{posts.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {sortedPosts.length === 0 ? (
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardContent className="py-12 text-center">
            <Send className="w-12 h-12 mx-auto text-purple-300 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
            <p className="text-purple-300">
              Create your first scheduled post using the editor tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedPosts.map((post) => (
            <Card key={post.id} className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(post.status)} border flex items-center gap-1`}>
                      {getStatusIcon(post.status)}
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </Badge>
                    <div className="text-purple-300 text-sm flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.scheduled_time).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === 'scheduled' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(post)}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Scheduled Post</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-content">Content</Label>
                              <Textarea
                                id="edit-content"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[120px] bg-white/10 border-white/20 text-white"
                                maxLength={4096}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-schedule">Schedule Time</Label>
                              <Input
                                id="edit-schedule"
                                type="datetime-local"
                                value={editScheduledTime}
                                min={minDateTime}
                                onChange={(e) => setEditScheduledTime(e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setEditingPost(null)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveEdit}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                              >
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-full max-w-sm rounded-lg shadow-lg"
                    />
                  )}
                  <p className="text-white whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between text-sm text-purple-300 border-t border-white/10 pt-3">
                    <span>Created: {new Date(post.created_at).toLocaleString()}</span>
                    {post.chat_id && (
                      <span>Chat ID: {post.chat_id}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
