/**
 * @fileoverview Adapter functions for GenerateText playground
 * Maps text-specific types to the generic ResultsGrid/ThreadCard interfaces
 */

import { ReactNode } from 'react';
import { Brain, Cpu, FileJson } from 'lucide-react';
import { GenerateTextExecutionThread, GenerateTextResult } from './types';
import { ThreadFieldInfo } from '@/components/prompt-playground/shared/ThreadCard';
import { SortOption } from '@/components/prompt-playground/shared/ResultsGrid';
import { getGenerateTextThreadKey, buildSnapshotFromThread } from '@/lib/atoms';

// Thread extraction functions
export function getThreadId(thread: GenerateTextExecutionThread): string {
  return thread.id;
}

export function getThreadName(thread: GenerateTextExecutionThread): string {
  return thread.name;
}

export function getThreadVisible(thread: GenerateTextExecutionThread): boolean {
  return thread.visible;
}

export function getThreadRunning(thread: GenerateTextExecutionThread): boolean {
  return thread.isRunning || false;
}

export function getThreadResult(thread: GenerateTextExecutionThread): GenerateTextResult | undefined {
  return thread.result;
}

// Thread key/snapshot management
export function getThreadKey(thread: GenerateTextExecutionThread, ns?: string): string {
  return getGenerateTextThreadKey(thread, ns);
}

export function buildSnapshot(thread: GenerateTextExecutionThread): unknown {
  return buildSnapshotFromThread(thread);
}

// Result extraction functions
export function getResultText(result: GenerateTextResult): string {
  return result.text || '';
}

export function getResultError(result: GenerateTextResult): string | undefined {
  return result.error;
}

export function getResultValidationError(_result: GenerateTextResult): boolean {
  return false; // Text generation doesn't have validation errors
}

export function getResultDuration(result: GenerateTextResult): number | undefined {
  return result.duration;
}

export function getResultUsage(result: GenerateTextResult): { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined {
  return result.usage;
}

export function getResultObject(result: GenerateTextResult): unknown | undefined {
  return result.text;
}

// Rendering
export function renderResultContent(result: GenerateTextResult, _threadId: string): ReactNode {
  return (
    <div className="text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
      {result.text}
    </div>
  );
}

// Thread fields configuration
export function getThreadFields(thread: GenerateTextExecutionThread): ThreadFieldInfo[] {
  return [
    {
      key: 'model',
      name: thread.modelThread.name,
      icon: Brain,
      color: 'text-blue-600'
    },
    {
      key: 'system',
      name: thread.systemPromptThread.name,
      icon: Cpu,
      color: 'text-yellow-600'
    },
    {
      key: 'prompt',
      name: thread.promptDataThread.name,
      icon: FileJson,
      color: 'text-orange-600'
    }
  ];
}

// Sort options
export const sortOptions: SortOption[] = [
  {
    value: 'model',
    label: 'Model',
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-900 dark:hover:text-blue-100 data-[state=on]:bg-blue-100 dark:data-[state=on]:bg-blue-900 data-[state=on]:text-blue-900 dark:data-[state=on]:text-blue-100'
  },
  {
    value: 'system',
    label: 'System',
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800 hover:text-yellow-900 dark:hover:text-yellow-100 data-[state=on]:bg-yellow-100 dark:data-[state=on]:bg-yellow-900 data-[state=on]:text-yellow-900 dark:data-[state=on]:text-yellow-100'
  },
  {
    value: 'prompt',
    label: 'Prompt',
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-800 hover:text-orange-900 dark:hover:text-orange-100 data-[state=on]:bg-orange-100 dark:data-[state=on]:bg-orange-900 data-[state=on]:text-orange-900 dark:data-[state=on]:text-orange-100'
  },
  {
    value: 'status',
    label: 'Status'
  }
];
