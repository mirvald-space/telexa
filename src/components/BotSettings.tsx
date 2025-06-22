import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Bot, MessageCircle, Eye, EyeOff, ExternalLink, Info } from 'lucide-react';
import type { BotConfig } from '@/pages/Index';

interface BotSettingsProps {
  config: BotConfig;
  onSave: (config: BotConfig) => void;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ config, onSave }) => {
  const [chatId, setChatId] = useState(config.chat_id);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleSave = () => {
    onSave({ token: config.token, chat_id: chatId });
  };

  const testConnection = async () => {
    if (!chatId) {
      alert('Пожалуйста, укажите ID канала/чата');
      return;
    }
    
    setIsTestingConnection(true);
    try {
      // Проверяем, что бот добавлен в канал
      const response = await fetch(`/api/test-connection?chatId=${encodeURIComponent(chatId)}`);
      const data = await response.json();
      
      if (data.ok) {
        alert(`✅ Соединение успешно! Бот имеет доступ к каналу/чату.`);
      } else {
        alert(`❌ Соединение не удалось: ${data.error || 'Бот не имеет доступа к каналу/чату'}`);
      }
    } catch (error) {
      alert(`❌ Соединение не удалось: ${error}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Конфигурация бота
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-100 border-blue-200 text-blue-800">
            <AlertDescription className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Для работы с сервисом используйте нашего бота: <strong>@telexapost_bot</strong>
            </AlertDescription>
          </Alert>
          
          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              ID вашего канала/чата
            </Label>
            <Input
              id="chatId"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="@your_channel или -1001234567890"
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Сохранить настройки
            </Button>
            <Button
              onClick={testConnection}
              disabled={!chatId || isTestingConnection}
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {isTestingConnection ? 'Проверка...' : 'Проверить соединение'}
            </Button>
          </div>

          {/* Status */}
          {config.chat_id && (
            <Alert className="bg-green-100 border-green-200 text-green-800">
              <AlertDescription>
                ✅ Канал настроен и готов к отправке сообщений.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Инструкции по настройке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Добавьте нашего бота в ваш канал</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Найдите в Telegram бота <strong>@telexapost_bot</strong></li>
              <li>Добавьте его в ваш канал как администратора</li>
              <li>Дайте боту права на публикацию сообщений</li>
            </ul>
          </div>
        
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Получите ID вашего канала/чата</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Для публичных каналов: используйте @username_канала</li>
              <li>Для приватных каналов/групп: используйте числовой ID (например, -1001234567890)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Как найти числовой ID чата</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Добавьте @userinfobot в ваш канал</li>
              <li>Перешлите сообщение из вашего канала боту @userinfobot</li>
              <li>Он покажет вам ID канала</li>
              <li>Или используйте: <code className="bg-gray-100 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
            </ul>
          </div>

          <Alert className="bg-blue-100 border-blue-200 text-blue-800">
            <AlertDescription className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Нужна помощь? Посмотрите 
              <a 
                href="https://core.telegram.org/bots/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 ml-1"
              >
                документацию Telegram Bot API
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
