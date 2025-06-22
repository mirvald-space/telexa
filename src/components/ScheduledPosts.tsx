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
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Render HTML content safely
  const renderFormattedContent = (content: string) => {
    // Преобразуем переносы строк в теги <br>
    const contentWithLineBreaks = content.replace(/\n/g, '<br>');
    return { __html: contentWithLineBreaks };
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
                                        onClick={insertLink}
                                        className="h-8 w-8 p-0"
                                      >
                                        <LinkIcon className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Ссылка</p>
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
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto text-gray-500 text-xs"
                                    >
                                      Помощь по форматированию
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Справка по форматированию текста</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 text-sm">
                                      <p>Для форматирования текста используется HTML-разметка, которая поддерживается Telegram.</p>
                                      
                                      <div className="space-y-2">
                                        <h3 className="font-medium">Доступные форматы:</h3>
                                        <ul className="list-disc pl-5 space-y-2">
                                          <li><code>&lt;b&gt;текст&lt;/b&gt;</code> - <b>жирный текст</b></li>
                                          <li><code>&lt;i&gt;текст&lt;/i&gt;</code> - <i>курсив</i></li>
                                          <li><code>&lt;u&gt;текст&lt;/u&gt;</code> - <u>подчеркнутый текст</u></li>
                                          <li><code>&lt;s&gt;текст&lt;/s&gt;</code> - <s>зачеркнутый текст</s></li>
                                          <li><code>&lt;code&gt;текст&lt;/code&gt;</code> - <code>моноширинный текст</code></li>
                                          <li><code>&lt;pre&gt;текст&lt;/pre&gt;</code> - предварительно отформатированный текст</li>
                                          <li><code>&lt;a href="URL"&gt;текст ссылки&lt;/a&gt;</code> - <a href="#">ссылка</a></li>
                                          <li><code>&lt;br&gt;</code> - перенос строки (добавляется автоматически при нажатии Enter)</li>
                                        </ul>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <h3 className="font-medium">Списки:</h3>
                                        <ul className="list-disc pl-5">
                                          <li>
                                            Маркированный список:
                                            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
                                              &lt;ul&gt;<br/>
                                              &nbsp;&nbsp;&lt;li&gt;Пункт 1&lt;/li&gt;<br/>
                                              &nbsp;&nbsp;&lt;li&gt;Пункт 2&lt;/li&gt;<br/>
                                              &lt;/ul&gt;
                                            </pre>
                                          </li>
                                          <li>
                                            Нумерованный список:
                                            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs">
                                              &lt;ol&gt;<br/>
                                              &nbsp;&nbsp;&lt;li&gt;Первый пункт&lt;/li&gt;<br/>
                                              &nbsp;&nbsp;&lt;li&gt;Второй пункт&lt;/li&gt;<br/>
                                              &lt;/ol&gt;
                                            </pre>
                                          </li>
                                        </ul>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <h3 className="font-medium">Пример:</h3>
                                        <div className="bg-gray-100 p-3 rounded">
                                          <div className="mb-2 font-mono text-xs">
                                            Привет! Это <b>жирный</b> и <i>курсивный</i> текст.<br/>
                                            Посетите наш <a href="https://t.me/example">канал</a>!<br/>
                                            <code>Код</code>
                                          </div>
                                          <div className="border-t border-gray-300 pt-2 mt-2">
                                            <p className="text-xs text-gray-500">HTML-код:</p>
                                            <pre className="text-xs mt-1">
                                              Привет! Это &lt;b&gt;жирный&lt;/b&gt; и &lt;i&gt;курсивный&lt;/i&gt; текст.<br/>
                                              Посетите наш &lt;a href="https://t.me/example"&gt;канал&lt;/a&gt;!<br/>
                                              &lt;code&gt;Код&lt;/code&gt;
                                            </pre>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
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
                                <div className="mt-4 border rounded-md p-3 bg-gray-50">
                                  <Label className="text-sm text-gray-500 mb-2 block">Предпросмотр:</Label>
                                  <div 
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={renderFormattedContent(editContent)}
                                  ></div>
                                </div>
                              )}
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
                    <div dangerouslySetInnerHTML={renderFormattedContent(post.content)} />
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
