import { atomWithStorage } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// Module config - persists by page by default
export const configAtom = atomWithStorage<GenerateObjectConfig>(
  'generate-object-config',
  {
    modelThreads: [],
    schemaThreads: [],
    systemPromptThreads: [],
    promptDataThreads: [],
    executionThreads: []
  },
  undefined,
  { getOnInit: true }
);