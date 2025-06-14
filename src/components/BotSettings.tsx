
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
        alert(`✅ Connection successful! Bot: @${data.result.username}`);
      } else {
        alert(`❌ Connection failed: ${data.description}`);
      }
    } catch (error) {
      alert(`❌ Connection failed: ${error}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bot Token */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Bot Token
            </Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"
                className="bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-purple-300 hover:text-white hover:bg-white/10"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Channel/Chat ID
            </Label>
            <Input
              id="chatId"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="@your_channel or -1001234567890"
              className="bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              Save Configuration
            </Button>
            <Button
              onClick={testConnection}
              disabled={!token || isTestingConnection}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {/* Status */}
          {config.token && config.chat_id && (
            <Alert className="bg-green-500/20 border-green-500/30 text-green-300">
              <AlertDescription>
                ✅ Bot is configured and ready to send messages.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-purple-200">
          <div>
            <h3 className="font-semibold text-white mb-2">1. Create a Telegram Bot</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot command</li>
              <li>Choose a name and username for your bot</li>
              <li>Copy the bot token (looks like: 1234567890:ABCdef...)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">2. Get Your Channel/Chat ID</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>For public channels: Use @channel_username</li>
              <li>For private channels/groups: Use the numeric ID (e.g., -1001234567890)</li>
              <li>Add your bot to the channel as an administrator</li>
              <li>Give the bot permission to post messages</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">3. Finding Numeric Chat ID</h3>
            <ul className="space-y-1 text-sm list-disc list-inside ml-4">
              <li>Add @userinfobot to your channel</li>
              <li>Forward a message from your channel to @userinfobot</li>
              <li>It will show you the channel ID</li>
              <li>Or use: <code className="bg-white/10 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
            </ul>
          </div>

          <Alert className="bg-blue-500/20 border-blue-500/30 text-blue-300">
            <AlertDescription className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Need help? Check the 
              <a 
                href="https://core.telegram.org/bots/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-200"
              >
                Telegram Bot API documentation
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
