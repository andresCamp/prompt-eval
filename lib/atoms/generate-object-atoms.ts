import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import type {
  GenerateObjectConfig,
} from '@/components/generate-object-playground/types';

// Lock state atom - persistent
export const isLockedAtom = atomWithStorage<boolean>(
  'generate-object-locked',
  false,
  undefined,
  { getOnInit: true }
);

// Config atom - only persists when locked
export const generateObjectConfigAtom = atomWithStorage<GenerateObjectConfig>(
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

// Current working config - this is what components use
export const workingConfigAtom = atom<GenerateObjectConfig>(
  {
    modelThreads: [],
    schemaThreads: [],
    systemPromptThreads: [],
    promptDataThreads: [],
    executionThreads: []
  }
);

// Lock/unlock actions
export const lockConfigAtom = atom(
  null,
  (get, set) => {
    const currentConfig = get(workingConfigAtom);
    console.log('🔒 Locking config:', currentConfig);
    set(generateObjectConfigAtom, currentConfig);
    set(isLockedAtom, true);
  }
);

export const unlockConfigAtom = atom(
  null,
  (get, set) => {
    console.log('🔓 Unlocking config - clearing storage');
    set(generateObjectConfigAtom, RESET);
    set(isLockedAtom, false);
    // Keep current working config as-is, just clear storage
  }
);