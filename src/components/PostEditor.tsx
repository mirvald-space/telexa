import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PostEditorProps {
  onSubmit: (post: {
    content: string;
    image_url?: string;
    scheduled_time: string;
  }) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    if (!scheduledTime) {
      toast({
        title: "Требуется время публикации",
        description: "Пожалуйста, выберите время публикации поста.",
        variant: "destructive",
      });
      return;
    }

    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
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
      scheduled_time: scheduledTime,
    });

    // Reset form
    setContent('');
    setImageUrl('');
    setScheduledTime('');
  };

  // Set minimum datetime to current time
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Создать новый пост
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-gray-700">Содержание поста</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Напишите содержание вашего поста здесь... Вы можете использовать форматирование Telegram как *жирный* и _курсив_"
                className="min-h-[120px] bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
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
                ) : (
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
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {/* Schedule Datetime */}
            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Время публикации
              </Label>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <Input
                  id="scheduledTime"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={minDateTime}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Запланировать пост
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {(content || imageUrl) && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Предпросмотр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Предпросмотр поста"
                  className="w-full max-w-md rounded-lg shadow-lg"
                />
              )}
              {content && (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {content}
                </p>
              )}
              {scheduledTime && (
                <div className="text-sm text-gray-600 border-t border-gray-200 pt-3 mt-3">
                  📅 Запланировано на: {new Date(scheduledTime).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
