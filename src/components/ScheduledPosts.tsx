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
        title: "Требуется содержание",
        description: "Пожалуйста, введите содержание для вашего поста.",
        variant: "destructive",
      });
      return;
    }

    const scheduleDate = new Date(editScheduledTime);
    if (scheduleDate <= new Date() && editingPost.status === 'scheduled') {
      toast({
        title: "Неверное время публикации",
        description: "Пожалуйста, выберите дату и время в будущем для запланированных постов.",
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
    if (confirm('Вы уверены, что хотите удалить этот пост?')) {
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

      {sortedPosts.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Send className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Пока нет постов</h3>
            <p className="text-gray-600">
              Создайте свой первый запланированный пост с помощью редактора.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedPosts.map((post) => (
            <Card key={post.id} className="bg-white border-gray-200 hover:bg-gray-50 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(post.status)} border flex items-center gap-1`}>
                      {getStatusIcon(post.status)}
                      {post.status === 'scheduled' ? 'Запланирован' : 
                       post.status === 'sent' ? 'Отправлен' : 'Ошибка'}
                    </Badge>
                    <div className="text-gray-600 text-sm flex items-center gap-1">
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
                            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Редактировать запланированный пост</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-content" className="text-gray-700">Содержание</Label>
                              <Textarea
                                id="edit-content"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[120px] bg-gray-50 border-gray-300 text-gray-900"
                                maxLength={4096}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-schedule" className="text-gray-700">Время публикации</Label>
                              <Input
                                id="edit-schedule"
                                type="datetime-local"
                                value={editScheduledTime}
                                min={minDateTime}
                                onChange={(e) => setEditScheduledTime(e.target.value)}
                                className="bg-gray-50 border-gray-300 text-gray-900"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setEditingPost(null)}
                                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                              >
                                Отмена
                              </Button>
                              <Button
                                onClick={handleSaveEdit}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                              >
                                Сохранить изменения
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
                      className="bg-white border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-gray-900">
                    {post.content.split('\n').map((line, idx) => (
                      <p key={idx} className="mb-2">
                        {line}
                      </p>
                    ))}
                  </div>
                  {post.image_url && (
                    <div className="mt-4">
                      <img
                        src={post.image_url}
                        alt="Изображение поста"
                        className="rounded-lg max-h-64 mx-auto"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
