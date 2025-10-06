/**
 * Type definitions for the GenerateText Playground
 * Simplified version for text generation without schema validation
 */

export interface GenerateTextModelThread {
  id: string;
  name: string;
  provider: string;
  model: string;
  visible: boolean;
}

export interface SystemPromptThread {
  id: string;
  name: string;
  prompt: string; // System prompt to guide the text generation
  variables?: Record<string, string>; // Variable values for ${variable} placeholders
  visible: boolean;
}

export interface PromptDataThread {
  id: string;
  name: string;
  prompt: string; // The input prompt for text generation
  variables?: Record<string, string>; // Variable values for ${variable} placeholders
  visible: boolean;
}

export interface GenerateTextExecutionThread {
  id: string;
  name: string;
  modelThread: GenerateTextModelThread;
  systemPromptThread: SystemPromptThread;
  promptDataThread: PromptDataThread;
  visible: boolean;
  isRunning?: boolean;
  result?: GenerateTextResult;
}

export interface GenerateTextResult {
  success: boolean;
  text?: string; // The generated text
  error?: string;
  duration?: number;
  finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface GenerateTextConfig {
  modelThreads: GenerateTextModelThread[];
  systemPromptThreads: SystemPromptThread[];
  promptDataThreads: PromptDataThread[];
  executionThreads: GenerateTextExecutionThread[];
  temperature?: number;
  maxOutputTokens?: number;
}