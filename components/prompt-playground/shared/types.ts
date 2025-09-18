/**
 * @fileoverview Type definitions for pipeline threading system
 * 
 * This system allows threading at every stage of the prompt pipeline:
 * Model -> Data -> System Prompt -> Initial Message -> User Message -> Output
 * 
 * Each stage can have multiple threads, and all combinations are executed
 * as individual threads in the final output.
 */

// ---------------------------------------------
// Provider / Model options
// ---------------------------------------------

export const AVAILABLE_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' }
] as const;

export const AVAILABLE_MODELS = [
  // Anthropic
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (2025-05-14)' },
  { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (2025-02-19)' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (2024-10-22)' },
  // Google
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash Lite (Preview 06-17)' },
  // OpenAI
  { value: 'gpt-4o', label: 'GPT-4o' },
  // Groq
  { value: 'moonshotai/kimi-k2-instruct', label: 'Kimi-K2 Instruct' }
] as const;

// Map every model slug to its provider. Use this to automatically set provider
// when a user picks a model.
export const MODEL_PROVIDER_MAP: Record<string, string> = {
  // Anthropic
  'claude-sonnet-4-20250514': 'anthropic',
  'claude-3-7-sonnet-20250219': 'anthropic',
  'claude-3-5-sonnet-20241022': 'anthropic',
  // Google
  'gemini-2.5-flash': 'google',
  'gemini-2.5-flash-lite-preview-06-17': 'google',
  // OpenAI
  'gpt-4o': 'openai',
  // Groq native & others
  'moonshotai/kimi-k2-instruct': 'groq'
};

export interface SelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface CopyButtonProps {
  text: string;
  buttonId: string;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, buttonId: string) => void;
  disabled?: boolean;
  variant?: "default" | "link" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export interface MetricsProps {
  duration?: number;
  tokenCount?: number;
  wordCount?: number;
  cost?: number;
}

export interface BiographerResponse {
  name: string;
  response: string;
  loading: boolean;
  error?: string;
  duration?: number;
  wordCount?: number;
  tokenCount?: number;
  cost?: number; // Cost in USD
  promptTokens?: number;
  completionTokens?: number;
}

// Legacy types for backward compatibility
export interface TestModuleProps {
  module: {
    id: string;
    name: string;
    selectedProvider: string;
    selectedModel: string;
    systemPrompt: string;
    initialMessage: string;
    userMessage: string;
    responses: BiographerResponse[];
    isRunning: boolean;
    copiedStates: Record<string, boolean>;
    openSections: {
      main: boolean;
      config: boolean;
      systemPrompt: boolean;
      initialMessage: boolean;
      userMessage: boolean;
    };
  };
  biographerData: unknown[];
  onUpdateModule: (id: string, updates: Partial<TestModuleProps['module']>) => void;
  onRunTest: (id: string) => void;
  onDuplicateModule: (id: string) => void;
  onDeleteModule: (id: string) => void;
  canDelete: boolean;
}

export interface TestThreadProps {
  thread: {
    id: string;
    name: string;
    selectedProvider: string;
    selectedModel: string;
    responses: BiographerResponse[];
    isRunning: boolean;
    copiedStates: Record<string, boolean>;
    systemPrompt: string;
    initialMessage: string;
    userMessage: string;
  };
  onUpdateThread: (id: string, updates: Partial<TestThreadProps['thread']>) => void;
  onRunThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  canDelete: boolean;
}

// New pipeline threading types
export interface ModelThread {
  id: string;
  name: string;
  provider: string;
  model: string;
  visible: boolean; // New visibility property
}

export interface DataThread {
  id: string;
  name: string;
  data: string;
  visible: boolean; // New visibility property
}

export interface SystemPromptThread {
  id: string;
  name: string;
  prompt: string;
  visible: boolean; // New visibility property
}

export interface InitialMessageThread {
  id: string;
  name: string;
  message: string;
  visible: boolean; // New visibility property
}

export interface UserMessageThread {
  id: string;
  name: string;
  message: string;
  visible: boolean; // New visibility property
}

export interface ExecutionThread {
  id: string;
  name: string;
  modelThread: ModelThread;
  dataThread: DataThread;
  systemPromptThread: SystemPromptThread;
  initialMessageThread: InitialMessageThread;
  userMessageThread: UserMessageThread;
  responses: BiographerResponse[];
  isRunning: boolean;
  copiedStates: Record<string, boolean>;
  visible: boolean; // New visibility property for execution threads
}

export interface PipelineConfig {
  modelThreads: ModelThread[];
  dataThreads: DataThread[];
  systemPromptThreads: SystemPromptThread[];
  initialMessageThreads: InitialMessageThread[];
  userMessageThreads: UserMessageThread[];
  executionThreads: ExecutionThread[];
  /** Additional conversation turns beyond the first (which uses userMessageThreads). */
  turns?: ConversationTurn[];
  openSections: {
    models: boolean;
    data: boolean;
    systemPrompts: boolean;
    initialMessages: boolean;
    userMessages: boolean;
    results: boolean;
  };
  // New visibility state for sections
  visibility: {
    models: boolean;
    data: boolean;
    systemPrompts: boolean;
    initialMessages: boolean;
    userMessages: boolean;
  };
  copiedStates: Record<string, boolean>;
  // Batching configuration for large combo sets
  batchConfig: {
    maxConcurrent: number; // Maximum concurrent API calls
    batchSize: number; // Size of each batch
  };
}

export interface ConversationTurn {
  id: string;
  name: string;
  userMessageThreads: UserMessageThread[];
  executionThreads: ExecutionThread[];
}

export interface ThreadableSectionProps<T> {
  title: string;
  threads: T[];
  onThreadsChange: (threads: T[]) => void;
  renderThread: (thread: T, index: number, onUpdate: (updates: Partial<T>) => void, onDelete: () => void) => React.ReactNode;
  createNewThread: () => T;
  defaultOpen?: boolean;
}

export interface ThreadRenderProps<T> {
  thread: T;
  index: number;
  onUpdate: (updates: Partial<T>) => void;
  onDelete: () => void;
}

export interface ExecutionResultsProps {
  threads: ExecutionThread[];
  onRunThread: (threadId: string) => void;
  onRunAll: () => void;
  onCopyResponse: (threadId: string, name: string) => void;
}

export type ThreadableStage = 'models' | 'data' | 'systemPrompts' | 'initialMessages' | 'userMessages'; 