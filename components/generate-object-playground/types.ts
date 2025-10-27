/**
 * Type definitions for the GenerateObject Playground
 * Simplified version for JSON-to-JSON transformation with schema validation
 */

export interface SchemaThread {
  id: string;
  name: string;
  schema: string; // Zod schema as string
  schemaDescription?: string;
  visible: boolean;
  isExpanded?: boolean; // Default: true - controls card collapse state
}

export interface SystemPromptThread {
  id: string;
  name: string;
  prompt: string; // System prompt to guide the transformation
  variables?: Record<string, string>; // Variable values for ${variable} placeholders
  visible: boolean;
  isExpanded?: boolean; // Default: true - controls card collapse state
}

export interface PromptDataThread {
  id: string;
  name: string;
  prompt: string; // The prompt (can be JSON data or text)
  variables?: Record<string, string>; // Variable values for ${variable} placeholders
  visible: boolean;
  isExpanded?: boolean; // Default: true - controls card collapse state
}

export interface GenerateObjectModelThread {
  id: string;
  name: string;
  provider: string;
  model: string;
  visible: boolean;
  isExpanded?: boolean; // Default: true - controls card collapse state
}

export interface GenerateObjectExecutionThread {
  id: string;
  name: string;
  modelThread: GenerateObjectModelThread;
  schemaThread: SchemaThread;
  systemPromptThread: SystemPromptThread;
  promptDataThread: PromptDataThread;
  visible: boolean;
  isRunning?: boolean;
  result?: GenerateObjectResult;
}

export interface GenerateObjectResult {
  success: boolean;
  object?: unknown; // The generated JSON object
  error?: string;
  validationError?: string;
  duration?: number;
  finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface GenerateObjectConfig {
  modelThreads: GenerateObjectModelThread[];
  schemaThreads: SchemaThread[];
  systemPromptThreads: SystemPromptThread[];
  promptDataThreads: PromptDataThread[];
  executionThreads: GenerateObjectExecutionThread[];
  temperature?: number;
  maxOutputTokens?: number;
  outputMode?: 'object' | 'array' | 'no-schema';
}

