import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, ExternalLink, Info, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { BotConfig } from '@/pages/Index';

interface BotSettingsProps {
  config: BotConfig;
  onSave: (config: BotConfig) => void;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ config, onSave }) => {
  console.log('BotSettings received config:', config);
  
  const [chatIds, setChatIds] = useState<string[]>(config.chat_ids || []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Обновляем состояние, когда меняется config
  useEffect(() => {
    console.log('BotSettings config changed:', config);
    setChatIds(config.chat_ids || []);
  }, [config]);

  const validateChatId = (id: string): boolean => {
    // Public channel username format: @channel_name
    const usernameRegex = /^@[a-zA-Z][a-zA-Z0-9_]{3,}$/;
    
    // Private channel/group ID format: -100xxxxxxxxxx
    const privateIdRegex = /^-100\d{9,}$/;
    
    return usernameRegex.test(id) || privateIdRegex.test(id);
  };

  const handleChatIdChange = (index: number, value: string) => {
    const newChatIds = [...chatIds];
    newChatIds[index] = value;
    setChatIds(newChatIds);
    setErrorMessage(null);
  };

  const addChannel = () => {
    if (chatIds.length < 2) {
      setChatIds([...chatIds, '']);
    }
  };

  const removeChannel = (index: number) => {
    const newChatIds = [...chatIds];
    newChatIds.splice(index, 1);
    setChatIds(newChatIds);
  };

  const handleSave = () => {
    // Фильтруем пустые значения
    const filteredChatIds = chatIds.filter(id => id.trim() !== '');
    
    if (filteredChatIds.length === 0) {
      setErrorMessage('Пожалуйста, укажите хотя бы один ID канала/чата');
      return;
    }
    
    // Validate all chat IDs
    for (let i = 0; i < filteredChatIds.length; i++) {
      if (!validateChatId(filteredChatIds[i])) {
        setErrorMessage(`Неверный формат ID для канала #${i + 1}. Используйте @username для публичных каналов или -100xxxxxxxxxx для приватных`);
        return;
      }
    }
    
    // Убедимся, что все ID каналов - строки
    const validChatIds = filteredChatIds.map(id => String(id.trim()));
    
    // Сохраняем только chat_ids
    const saveConfig = {
      token: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
      chat_ids: validChatIds
    };
    
    console.log('BotSettings sending config:', saveConfig);
    
    try {
      onSave(saveConfig);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error saving config:', error);
      setErrorMessage('Произошла ошибка при сохранении настроек');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
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
          
          {/* Chat IDs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                ID ваших каналов/чатов (максимум 2)
              </Label>
              {chatIds.length < 2 && (
                <Button 
                  type="button" 
                  onClick={addChannel} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Добавить канал
                </Button>
              )}
            </div>

            {chatIds.map((chatId, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={chatId}
                  onChange={(e) => handleChatIdChange(index, e.target.value)}
                  placeholder="@your_channel или -100xxxxxxxxxx"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
                />
                {chatIds.length > 1 && (
                  <Button 
                    type="button" 
                    onClick={() => removeChannel(index)} 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {errorMessage && (
              <Alert className="mt-2 bg-red-100 border-red-200 text-red-800">
                <AlertDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="bg-[#0088cc] hover:bg-[#0077b6] text-white"
            >
              Сохранить
            </Button>
          </div>

          {/* Status */}
          {chatIds.length > 0 && !errorMessage && (
            <Alert className="bg-green-100 border-green-200 text-green-800">
              <AlertDescription>
                ✅ {chatIds.length > 1 ? 'Каналы настроены' : 'Канал настроен'} и {chatIds.length > 1 ? 'готовы' : 'готов'} к отправке сообщений.
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
              <li><strong>Важно:</strong> Без добавления бота в канал отправка сообщений не будет работать</li>
            </ul>
          </div>
        
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Получите ID вашего канала/чата</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Для публичных каналов: используйте @username_канала</li>
              <li>Для приватных каналов/групп: используйте числовой ID в формате -100xxxxxxxxxx</li>
              <li><strong>Важно:</strong> ID приватного канала всегда начинается с -100, за которым следуют 9+ цифр</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Как найти числовой ID чата</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Добавьте @userinfobot в ваш канал</li>
              <li>Перешлите сообщение из вашего канала боту @userinfobot</li>
              <li>Он покажет вам ID канала (добавьте -100 перед полученным числом)</li>
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
