import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';
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

// Lock-related atoms
export const isLockedAtom = atom(false);
export const lockAtom = atom(null, (_get, set) => {
  set(isLockedAtom, true);
});
export const unlockAtom = atom(null, (_get, set) => {
  set(isLockedAtom, false);
});