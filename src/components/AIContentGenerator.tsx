import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useAIContent } from '@/hooks/use-ai-content';

interface AIContentGeneratorProps {
  onContentGenerated: (content: string) => void;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  onContentGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const { generateContent, isGenerating } = useAIContent({
    temperature: 0.7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;
    
    const content = await generateContent(prompt);
    if (content) {
      onContentGenerated(content);
      setPrompt('');
    }
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Генерация контента с помощью AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="text-gray-700">
              Опишите, какой пост вы хотите создать
            </Label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Например: Напиши пост о новых функциях Telegram с эмодзи и хештегами"
              className="min-h-[80px] bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-400"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Сгенерировать контент
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 