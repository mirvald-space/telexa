import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Bot, MessageCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import type { BotConfig } from '@/pages/Index';

interface BotSettingsProps {
  config: BotConfig;
  onSave: (config: BotConfig) => void;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ config, onSave }) => {
  const [token, setToken] = useState(config.token);
  const [chatId, setChatId] = useState(config.chat_id);
  const [showToken, setShowToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleSave = () => {
    onSave({ token, chat_id: chatId });
  };

  const testConnection = async () => {
    if (!token) return;
    
    setIsTestingConnection(true);
    try {
      // In a real app, this would make an actual API call to Telegram
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        alert(`✅ Соединение успешно! Бот: @${data.result.username}`);
      } else {
        alert(`❌ Соединение не удалось: ${data.description}`);
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
          {/* Bot Token */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Токен бота
            </Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"
                className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              ID канала/чата
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
              disabled={!token || isTestingConnection}
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {isTestingConnection ? 'Проверка...' : 'Проверить соединение'}
            </Button>
          </div>

          {/* Status */}
          {config.token && config.chat_id && (
            <Alert className="bg-green-100 border-green-200 text-green-800">
              <AlertDescription>
                ✅ Бот настроен и готов к отправке сообщений.
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
            <h3 className="font-semibold text-gray-900 mb-2">1. Создайте Telegram-бота</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Откройте Telegram и найдите @BotFather</li>
              <li>Отправьте команду /newbot</li>
              <li>Выберите имя и username для вашего бота</li>
              <li>Скопируйте токен бота (выглядит как: 1234567890:ABCdef...)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Получите ID вашего канала/чата</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Для публичных каналов: используйте @username_канала</li>
              <li>Для приватных каналов/групп: используйте числовой ID (например, -1001234567890)</li>
              <li>Добавьте вашего бота в канал как администратора</li>
              <li>Дайте боту разрешение на публикацию сообщений</li>
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
