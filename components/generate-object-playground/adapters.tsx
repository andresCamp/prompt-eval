/**
 * @fileoverview Adapter functions for GenerateObject playground
 * Maps object-specific types to the generic ResultsGrid/ThreadCard interfaces
 */

import { ReactNode } from 'react';
import { Brain, Code, Cpu, FileJson } from 'lucide-react';
import { GenerateObjectExecutionThread, GenerateObjectResult } from './types';
import { ThreadFieldInfo } from '@/components/prompt-playground/shared/ThreadCard';
import { SortOption } from '@/components/prompt-playground/shared/ResultsGrid';
import { getGenerateObjectThreadKey, buildSnapshotFromObjectThread } from '@/lib/atoms';

// Thread extraction functions
export function getThreadId(thread: GenerateObjectExecutionThread): string {
  return thread.id;
}

export function getThreadName(thread: GenerateObjectExecutionThread): string {
  return thread.name;
}

export function getThreadVisible(thread: GenerateObjectExecutionThread): boolean {
  return thread.visible;
}

export function getThreadRunning(thread: GenerateObjectExecutionThread): boolean {
  return thread.isRunning || false;
}

export function getThreadResult(thread: GenerateObjectExecutionThread): GenerateObjectResult | undefined {
  return thread.result;
}

// Thread key/snapshot management
export function getThreadKey(thread: GenerateObjectExecutionThread, ns?: string): string {
  return getGenerateObjectThreadKey(thread, ns);
}

export function buildSnapshot(thread: GenerateObjectExecutionThread): unknown {
  return buildSnapshotFromObjectThread(thread);
}

// Result extraction functions
export function getResultText(result: GenerateObjectResult): string {
  return result.object ? JSON.stringify(result.object, null, 2) : '';
}

export function getResultError(result: GenerateObjectResult): string | undefined {
  return result.error;
}

export function getResultValidationError(result: GenerateObjectResult): boolean {
  return !!result.validationError;
}

export function getResultDuration(result: GenerateObjectResult): number | undefined {
  return result.duration;
}

export function getResultUsage(result: GenerateObjectResult): { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined {
  return result.usage;
}

export function getResultObject(result: GenerateObjectResult): unknown | undefined {
  return result.object;
}

// Rendering
export function renderResultContent(result: GenerateObjectResult): ReactNode {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
      {JSON.stringify(result.object, null, 2)}
    </pre>
  );
}

// Thread fields configuration
export function getThreadFields(thread: GenerateObjectExecutionThread): ThreadFieldInfo[] {
  return [
    {
      key: 'model',
      name: thread.modelThread.name,
      icon: Brain,
      color: 'text-blue-600'
    },
    {
      key: 'schema',
      name: thread.schemaThread.name,
      icon: Code,
      color: 'text-green-600'
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
    value: 'schema',
    label: 'Schema',
    color: 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 hover:text-green-900 dark:hover:text-green-100 data-[state=on]:bg-green-100 dark:data-[state=on]:bg-green-900 data-[state=on]:text-green-900 dark:data-[state=on]:text-green-100'
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
