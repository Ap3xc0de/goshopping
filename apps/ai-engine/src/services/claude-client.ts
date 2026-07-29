import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export interface GenerateParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatParams {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
}

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || config.anthropic.apiKey,
    });
    this.model = config.anthropic.model;
  }

  async generate(params: GenerateParams): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? config.generation.maxTokens,
      temperature: params.temperature ?? config.generation.temperature,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    return textBlock.text;
  }

  async chat(params: ChatParams): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 2048,
      temperature: 0.7,
      system: params.systemPrompt,
      messages: params.messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    return textBlock.text;
  }
}
