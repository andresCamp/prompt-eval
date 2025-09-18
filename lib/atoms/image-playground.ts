import { atomFamily } from 'jotai/utils';
import { atomWithStorage } from 'jotai/utils';
import type { ImageGenerationConfig } from '@/components/image-playground/types';
import { createDefaultConfig } from '@/components/image-playground/defaults';

export const imageConfigAtomFamily = atomFamily((chatId: string) =>
  atomWithStorage<ImageGenerationConfig>(
    `image-playground-config-${chatId}`,
    createDefaultConfig(),
    undefined,
    { getOnInit: true }
  )
);
