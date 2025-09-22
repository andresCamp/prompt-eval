import { atomFamily } from 'jotai/utils';
import { atomWithStorage } from 'jotai/utils';
import type { ImageGenerationConfig } from '@/components/image-playground/types';
import { createDefaultConfig } from '@/components/image-playground/defaults';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

// Custom storage that strips image data before persisting
const imageConfigStorage: SyncStorage<ImageGenerationConfig> = {
  getItem: (key: string, initialValue: ImageGenerationConfig) => {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return initialValue;

    try {
      return JSON.parse(storedValue) as ImageGenerationConfig;
    } catch {
      return initialValue;
    }
  },
  setItem: (key: string, value: ImageGenerationConfig) => {
    // Strip out base64 image data before persisting (keep only imageIds)
    const valueForStorage = {
      ...value,
      executionThreads: value.executionThreads.map(thread => ({
        ...thread,
        result: thread.result ? {
          ...thread.result,
          image: undefined // Don't persist base64 data
        } : thread.result
      }))
    };
    localStorage.setItem(key, JSON.stringify(valueForStorage));
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  }
};

export const imageConfigAtomFamily = atomFamily((chatId: string) =>
  atomWithStorage<ImageGenerationConfig>(
    `image-playground-config-${chatId}`,
    createDefaultConfig(),
    imageConfigStorage,
    { getOnInit: true }
  )
);
