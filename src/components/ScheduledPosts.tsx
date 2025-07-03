import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Edit, Trash, Send, AlertCircle, CheckCircle, Bold, Italic, Underline, Link as LinkIcon, Code, List, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@/pages/Index';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScheduledPostsProps {
  posts: Post[];
  onUpdate: (postId: string, updates: Partial<Post>) => void;
  onDelete: (postId: string) => void;
  botConfig?: {
    chat_ids: string[];
  };
}

export const ScheduledPosts: React.FC<ScheduledPostsProps> = ({
  posts,
  onUpdate,
  onDelete,
  botConfig,
}) => {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState<Date | undefined>(undefined);
  const [selectedChatId, setSelectedChatId] = useState('');
  const { toast } = useToast();
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditScheduledTime(new Date(post.scheduled_time));
    setSelectedChatId(post.chat_ids && post.chat_ids.length > 0 ? post.chat_ids[0] : '');
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

    if (!editScheduledTime) {
      toast({
        title: "Требуется время публикации",
        description: "Пожалуйста, выберите время публикации поста.",
        variant: "destructive",
      });
      return;
    }

    if (editScheduledTime <= new Date() && editingPost.status === 'scheduled') {
      toast({
        title: "Неверное время публикации",
        description: "Пожалуйста, выберите дату и время в будущем для запланированных постов.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedChatId) {
      toast({
        title: "Выберите канал",
        description: "Пожалуйста, выберите канал для публикации.",
        variant: "destructive",
      });
      return;
    }

    onUpdate(editingPost.id, {
      content: editContent,
      scheduled_time: editScheduledTime.toISOString(),
      chat_ids: [selectedChatId],
    });

    setEditingPost(null);
    setEditContent('');
    setEditScheduledTime(undefined);
    setSelectedChatId('');
  };

  // Format channel name for display
  const formatChannelName = (chatId: string) => {
    if (chatId.startsWith('@')) {
      return chatId; // Already in a readable format
    } else if (chatId.startsWith('-100')) {
      return `Приватный канал (${chatId})`;
    }
    return chatId;
  };

  // Format text with HTML tags
  const formatText = useCallback((tag: string, attributes?: string) => {
    if (!editTextareaRef.current) return;

    const textarea = editTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);
    
    let formattedText = '';
    if (attributes) {
      formattedText = `<${tag} ${attributes}>${selectedText}</${tag}>`;
    } else {
      formattedText = `<${tag}>${selectedText}</${tag}>`;
    }
    
    const newContent = editContent.substring(0, start) + formattedText + editContent.substring(end);
    setEditContent(newContent);
    
    // Focus back on textarea and set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editContent]);

  // Insert link with prompt
  const insertLink = useCallback(() => {
    if (!editTextareaRef.current) return;
    
    const url = prompt('Введите URL ссылки:');
    if (!url) return;
    
    const linkText = prompt('Введите текст ссылки:', url);
    if (linkText === null) return;
    
    const textarea = editTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const linkHtml = `<a href="${url}">${linkText || url}</a>`;
    const newContent = editContent.substring(0, start) + linkHtml + editContent.substring(end);
    setEditContent(newContent);
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + linkHtml.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editContent]);

  // Handle delete
  const handleDelete = (postId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      onDelete(postId);
    }
  };

  // Render formatted content
  const renderFormattedContent = (content: string) => {
    return { __html: content };
  };

  // Sort posts by scheduled time
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Запланированные посты</h2>
      
      {sortedPosts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Нет запланированных постов</h3>
          <p>Создайте новый пост, используя форму выше.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => (
            <Card key={post.id} className="bg-white border-gray-200">
              <CardHeader className="flex flex-row items-start justify-between p-4 pb-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={post.status === 'sent' ? 'default' : 'outline'} 
                      className={post.status === 'sent' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                        : post.status === 'failed'
                          ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-100'
                          : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100'
                      }
                    >
                      {post.status === 'sent' && (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {post.status === 'failed' && (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {post.status === 'scheduled' && (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {post.status === 'sent' ? 'Отправлено' : post.status === 'failed' ? 'Ошибка' : 'Запланировано'}
                    </Badge>
                    {post.chat_ids && post.chat_ids.length > 0 && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                        {formatChannelName(post.chat_ids[0])}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(post.scheduled_time).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
                        <div className="space-y-6 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-content" className="text-gray-700">Содержание поста</Label>
                            
                            {/* Formatting Toolbar */}
                            <div className="flex flex-wrap gap-1 mb-2 p-1 bg-gray-50 border border-gray-300 rounded-md">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('b')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Bold className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Жирный</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('i')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Italic className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Курсив</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('u')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Underline className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Подчеркнутый</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={insertLink}
                                      className="h-8 w-8 p-0"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Вставить ссылку</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('code')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Code className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Код</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('ul')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <List className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Маркированный список</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => formatText('ol')}
                                      className="h-8 w-8 p-0"
                                    >
                                      <ListOrdered className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Нумерованный список</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            <Textarea
                              id="edit-content"
                              ref={editTextareaRef}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[120px] bg-gray-50 border-gray-300 text-gray-900 font-mono"
                              maxLength={4096}
                            />
                            
                            {/* Preview */}
                            {editContent && (
                              <div className="mt-4 border rounded-md overflow-hidden">
                                <div className="bg-[#0088cc] text-white p-2 text-xs">
                                  <div className="font-medium">Предпросмотр в Telegram</div>
                                </div>
                                <div className="bg-[#F5F5F5] p-3">
                                  <div className="bg-white rounded-lg shadow-sm p-3 max-w-[80%] relative">
                                    <div 
                                      className="prose prose-sm max-w-none text-gray-800"
                                      dangerouslySetInnerHTML={renderFormattedContent(editContent)}
                                    ></div>
                                    <div className="text-xs text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
                                      {editScheduledTime ? (
                                        <>
                                          {editScheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                            <path d="M12 6v6l4 2" />
                                          </svg>
                                        </>
                                      ) : (
                                        <>
                                          {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                            <path d="M12 6v6l4 2" />
                                          </svg>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Channel Selection */}
                          {botConfig && (
                            <div className="space-y-2">
                              <Label htmlFor="edit-channel" className="text-gray-700">
                                Выберите канал для публикации
                              </Label>
                              <Select 
                                value={selectedChatId} 
                                onValueChange={setSelectedChatId}
                              >
                                <SelectTrigger className="bg-gray-50 border-gray-300">
                                  <SelectValue placeholder="Выберите канал" />
                                </SelectTrigger>
                                <SelectContent>
                                  {botConfig.chat_ids?.map((chatId, index) => (
                                    <SelectItem key={index} value={chatId}>
                                      {formatChannelName(chatId)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* DateTime Picker */}
                          <div className="space-y-2">
                            <Label htmlFor="edit-schedule" className="text-gray-700">Время публикации</Label>
                            <DateTimePicker date={editScheduledTime} setDate={setEditScheduledTime} />
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
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="bg-[#F5F5F5] rounded-lg p-3">
                  <div className="bg-white rounded-lg shadow-sm p-3 max-w-[80%] relative">
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <div dangerouslySetInnerHTML={renderFormattedContent(post.content)} />
                    </div>
                    <div className="text-xs text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
                      {new Date(post.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={post.status === 'sent' ? "text-green-500" : "text-gray-400"}>
                        {post.status === 'sent' ? (
                          <>
                            <path d="M20 6 9 17l-5-5" />
                          </>
                        ) : (
                          <>
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            <path d="M12 6v6l4 2" />
                          </>
                        )}
                      </svg>
                    </div>
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
