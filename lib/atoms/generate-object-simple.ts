import { atomWithStorage } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// ONE ATOM. That's it. No complexity.
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

// Simple lock state
export const isLockedAtom = atomWithStorage<boolean>(
  'generate-object-locked', 
  false,
  undefined,
  { getOnInit: true }
);