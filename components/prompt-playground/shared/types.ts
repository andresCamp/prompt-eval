/**
 * @fileoverview Type definitions for pipeline threading system
 * 
 * This system allows threading at every stage of the prompt pipeline:
 * Model -> Data -> System Prompt -> Initial Message -> User Message -> Output
 * 
 * Each stage can have multiple threads, and all combinations are executed
 * as individual threads in the final output.
 */

// Original types needed by existing components
export const AVAILABLE_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral' },
];

export const AVAILABLE_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

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
}

export interface BiographerResponse {
  name: string;
  response: string;
  loading: boolean;
  error?: string;
  duration?: number;
  wordCount?: number;
  tokenCount?: number;
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
}

export interface DataThread {
  id: string;
  name: string;
  data: string;
}

export interface SystemPromptThread {
  id: string;
  name: string;
  prompt: string;
}

export interface InitialMessageThread {
  id: string;
  name: string;
  message: string;
}

export interface UserMessageThread {
  id: string;
  name: string;
  message: string;
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
}

export interface PipelineConfig {
  modelThreads: ModelThread[];
  dataThreads: DataThread[];
  systemPromptThreads: SystemPromptThread[];
  initialMessageThreads: InitialMessageThread[];
  userMessageThreads: UserMessageThread[];
  executionThreads: ExecutionThread[];
  openSections: {
    models: boolean;
    data: boolean;
    systemPrompts: boolean;
    initialMessages: boolean;
    userMessages: boolean;
    results: boolean;
  };
  copiedStates: Record<string, boolean>;
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