import { env } from '@/lib/env';

export interface XAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface XAICompletionRequest {
  messages: XAIMessage[];
  model: string;
  stream?: boolean;
  temperature?: number;
}

export interface XAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Client for interacting with the xAI API
 */
export const xaiClient = {
  /**
   * Generate content using the xAI API
   * @param messages Array of messages in the conversation
   * @param options Additional options for the API call
   * @returns The response from the xAI API
   */
  async generateContent(
    messages: XAIMessage[],
    options: {
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<XAICompletionResponse> {
    const apiKey = env.XAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('XAI API key is not configured');
    }

    const payload: XAICompletionRequest = {
      messages,
      model: options.model || 'grok-3-latest',
      stream: false,
      temperature: options.temperature ?? 0.7,
    };

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`xAI API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling xAI API:', error);
      throw error;
    }
  },
}; 