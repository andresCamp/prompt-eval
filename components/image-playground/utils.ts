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

  // Process ALL prompts, not just visible ones, to preserve cached images
  prompts.forEach(prompt => {
    const name = prompt.name;
    const existing = previous.find(thread => thread.promptThread?.id === prompt.id);
    newThreads.push({
      id: existing?.id ?? generateId(),
      name,
      promptThread: prompt,
      visible: prompt.visible, // Use the prompt's current visibility
      isRunning: existing?.isRunning ?? false,
      result: existing?.result // Preserve the result (including cached images)
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
