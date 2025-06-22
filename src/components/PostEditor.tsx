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
      <Card className="bg-white border-gray-200">
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
        <CardHeader>
          <CardTitle className="text-gray-900 text-lg">Предпросмотр</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 min-h-[200px]">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Предпросмотр поста"
                className="w-full max-w-md rounded-lg shadow-lg"
              />
            )}
            {content ? (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={renderFormattedContent()}
              ></div>
            ) : (
              <div className="text-gray-400 italic">Здесь будет отображаться предпросмотр вашего поста</div>
            )}
            {chatId && (
              <div className="text-sm text-gray-500 mt-2">
                Отправка в: {chatId}
              </div>
            )}
            {scheduledDate && (
              <div className="text-sm text-gray-500 mt-2">
                Запланировано на: {scheduledDate.toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
