import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Bold, Italic, Underline, Link, Code, List, ListOrdered, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TelegramPreview } from './TelegramPreview';

interface PostEditorProps {
  onSubmit: (post: {
    content: string;
    image_urls?: string[];
    scheduled_time: string;
    chat_id?: string;
  }) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Обрабатываем все перетащенные файлы
      Array.from(e.dataTransfer.files).forEach(file => {
        handleFile(file);
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Обрабатываем все выбранные файлы
      Array.from(e.target.files).forEach(file => {
        handleFile(file);
      });
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

    // Ограничение на количество изображений (максимум 10 для Telegram)
    if (imageUrls.length >= 10) {
      toast({
        title: "Достигнут лимит изображений",
        description: "Telegram позволяет отправлять максимум 10 изображений в одном сообщении.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, you'd upload to Supabase Storage
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrls(prev => [...prev, e.target!.result as string]);
        toast({
          title: "Изображение загружено",
          description: "Ваше изображение было добавлено в пост.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
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
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      scheduled_time: scheduledDate.toISOString(),
      chat_id: chatId || undefined,
    });

    // Reset form
    setContent('');
    setImageUrls([]);
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
              <Label className="text-gray-700">Изображения (опционально, до 10 шт.)</Label>
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
                {imageUrls.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Изображение ${index + 1}`}
                            className="h-24 w-full object-cover rounded-lg shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {imageUrls.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Добавить ещё изображение
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-gray-700 mb-2">Перетащите изображения сюда, или</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Выберите файлы
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  multiple
                />
              </div>
              {imageUrls.length > 0 && (
                <div className="text-sm text-gray-600">
                  {imageUrls.length}/10 изображений
                </div>
              )}
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

      {/* Используем компонент TelegramPreview вместо встроенного предпросмотра */}
      <TelegramPreview 
        content={content}
        imageUrls={imageUrls}
        chatId={chatId}
        scheduledDate={scheduledDate}
      />
    </div>
  );
};
