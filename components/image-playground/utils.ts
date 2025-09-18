import { generateId } from '@/components/prompt-playground/shared/utils';
import {
  ImageExecutionThread,
  ImageGenerationConfig,
  ImagePromptThread,
} from './types';

export function buildExecutionThreads(
  prompts: ImagePromptThread[],
  previous: ImageExecutionThread[]
): ImageExecutionThread[] {
  const newThreads: ImageExecutionThread[] = [];

  prompts.filter(prompt => prompt.visible).forEach(prompt => {
    const name = prompt.name;
    const existing = previous.find(thread => thread.promptThread?.id === prompt.id);
    newThreads.push({
      id: existing?.id ?? generateId(),
      name,
      promptThread: prompt,
      visible: existing?.visible ?? prompt.visible,
      isRunning: existing?.isRunning ?? false,
      result: existing?.result
    });
  });

  return newThreads;
}

export function updateExecutionThread(
  config: ImageGenerationConfig,
  threadId: string,
  updates: Partial<ImageExecutionThread>
): ImageGenerationConfig {
  return {
    ...config,
    executionThreads: config.executionThreads.map(thread =>
      thread.id === threadId ? { ...thread, ...updates } : thread
    )
  };
}
