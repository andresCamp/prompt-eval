import { atomWithStorage } from 'jotai/utils';
import { atomFamily } from 'jotai/utils';
import type { GenerateTextConfig } from '@/components/generate-text-playground/types';

// Chat-specific config atom factory - creates unique storage per chatId
export const configAtomFamily = atomFamily((chatId: string) =>
  atomWithStorage<GenerateTextConfig>(
    `generate-text-chat-config-${chatId}`,
    {
      modelThreads: [],
      systemPromptThreads: [],
      promptDataThreads: [],
      executionThreads: []
    },
    undefined,
    { getOnInit: true }
  )
);