import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Bold, Italic, Underline, Link, Code, List, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PostEditorProps {
  onSubmit: (post: {
    content: string;
    image_url?: string;
    scheduled_time: string;
    chat_id?: string;
  }) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [chatId, setChatId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Неверный тип файла",
        description: "Пожалуйста, загрузите файл изображения.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, you'd upload to Supabase Storage
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
        toast({
          title: "Изображение загружено",
          description: "Ваше изображение было добавлено в пост.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Требуется содержание",
        description: "Пожалуйста, введите содержание для вашего поста.",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "Требуется время публикации",
        description: "Пожалуйста, выберите время публикации поста.",
        variant: "destructive",
      });
      return;
    }

    if (scheduledDate <= new Date()) {
      toast({
        title: "Неверное время публикации",
        description: "Пожалуйста, выберите дату и время в будущем.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      content,
      image_url: imageUrl || undefined,
      scheduled_time: scheduledDate.toISOString(),
      chat_id: chatId || undefined,
    });

    // Reset form
    setContent('');
    setImageUrl('');
    setScheduledDate(undefined);
    setChatId('');
  };

  // Format text with HTML tags
  const formatText = useCallback((tag: string, attributes?: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = '';
    if (attributes) {
      formattedText = `<${tag} ${attributes}>${selectedText}</${tag}>`;
    } else {
      formattedText = `<${tag}>${selectedText}</${tag}>`;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Focus back on textarea and set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  // Insert link with prompt
  const insertLink = useCallback(() => {
    if (!textareaRef.current) return;
    
    const url = prompt('Введите URL ссылки:');
    if (!url) return;
    
    const linkText = prompt('Введите текст ссылки:', url);
    if (linkText === null) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const linkHtml = `<a href="${url}">${linkText || url}</a>`;
    const newContent = content.substring(0, start) + linkHtml + content.substring(end);
    setContent(newContent);
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + linkHtml.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  // Parse HTML for preview
  const renderFormattedContent = () => {
    // Преобразуем переносы строк в теги <br>
    const contentWithLineBreaks = content.replace(/\n/g, '<br>');
    return { __html: contentWithLineBreaks };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white border-gray-200 h-fit">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Создать новый пост
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-gray-700">Содержание поста</Label>
              
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
                        <Link className="h-4 w-4" />
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
                id="content"
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Напишите содержание вашего поста здесь... Используйте панель форматирования для стилизации текста"
                className="min-h-[120px] bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400 font-mono"
                maxLength={4096}
              />
              <div className="text-right text-sm text-gray-600">
                {content.length}/4096 символов
              </div>
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="text-gray-700">Изображение (опционально)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                } hover:border-blue-400 hover:bg-blue-50`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imageUrl ? (
                  <div className="space-y-4">
                    <img
                      src={imageUrl}
                      alt="Предпросмотр загрузки"
                      className="max-h-48 mx-auto rounded-lg shadow-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImageUrl('')}
                      className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Удалить изображение
                    </Button>
                  </div>
                ) :
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-gray-700 mb-2">Перетащите изображение сюда, или</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Выберите файл
                      </Button>
                    </div>
                  </div>
                }
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {/* Chat ID */}
            <div className="space-y-2">
              <Label htmlFor="chatId" className="text-gray-700">  
                ID канала/чата (опционально)
              </Label>
              <Input
                id="chatId"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="@your_channel или -1001234567890 (если не указано, используется значение из .env)"
                className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
              />
            </div>

            {/* Schedule Datetime */}
            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="text-gray-700">
                Время публикации
              </Label>
              <DateTimePicker date={scheduledDate} setDate={setScheduledDate} />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-fit bg-[#0088cc] hover:bg-[#0077b6] text-white"
            >
              Запланировать пост
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card - Always visible */}
      <Card className="bg-white border-gray-200 h-fit sticky top-4">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088cc]">
              <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h15.2c.2 0 .4 0 .6.1" />
              <path d="M22 6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2" />
            </svg>
            Предпросмотр в Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-[#F5F5F5] h-full min-h-[400px] flex flex-col">
            {/* Telegram header */}
            <div className="bg-[#0088cc] text-white p-3 flex items-center">
              <div className="flex-1">
                <div className="font-medium">Ваш канал</div>
                <div className="text-xs opacity-80">Предпросмотр сообщения</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </div>
            
            {/* Message bubble */}
            <div className="flex-1 p-4">
              <div className="bg-white rounded-lg shadow-sm p-3 max-w-[80%] relative">
                {imageUrl && (
                  <div className="mb-2">
                    <img
                      src={imageUrl}
                      alt="Предпросмотр поста"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
                {content ? (
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={renderFormattedContent()}
                  ></div>
                ) : (
                  <div className="text-gray-400 italic">Здесь будет отображаться текст вашего поста</div>
                )}
                
                <div className="text-xs text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
                  {scheduledDate ? (
                    <>
                      {new Date(scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
              
              {/* Channel info */}
              {chatId && (
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">@</span>
                  <span>{chatId}</span>
                </div>
              )}
            </div>
            
            {/* Telegram input area */}
            <div className="bg-white border-t border-gray-200 p-3 flex items-center gap-2">
              <div className="bg-gray-100 rounded-full flex-1 h-10"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088cc]">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 8.5a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5m-5 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5m10 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088cc]">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
