import { useState } from 'react';
import { xaiClient, XAIMessage } from '@/integrations/xai';
import { useToast } from './use-toast';

export interface UseAIContentOptions {
  model?: string;
  temperature?: number;
}

export function useAIContent(options: UseAIContentOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  /**
   * Generate content using the xAI API
   * @param prompt The user prompt for content generation
   * @param systemPrompt Optional system prompt to guide the AI
   * @returns The generated content or null if there was an error
   */
  const generateContent = async (
    prompt: string,
    systemPrompt: string = 'You are a helpful assistant for creating engaging Telegram posts.'
  ): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const messages: XAIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const response = await xaiClient.generateContent(messages, {
        model: options.model,
        temperature: options.temperature
      });

      const generatedContent = response.choices[0]?.message.content || '';
      return generatedContent;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      toast({
        title: 'Ошибка генерации контента',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateContent,
    isGenerating,
    error
  };
} 