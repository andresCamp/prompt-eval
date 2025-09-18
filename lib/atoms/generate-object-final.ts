import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// Lock state - persistent
export const isLockedAtom = atomWithStorage<boolean>(
  'generate-object-locked',
  false,
  undefined,
  { getOnInit: true }
);

// Config storage - persistent when locked, cleared when unlocked
export const storedConfigAtom = atomWithStorage<GenerateObjectConfig | null>(
  'generate-object-config',
  null,
  undefined,
  { getOnInit: true }
);

// Working config - what the UI actually uses
export const configAtom = atom<GenerateObjectConfig>({
  modelThreads: [],
  schemaThreads: [],
  systemPromptThreads: [],
  promptDataThreads: [],
  executionThreads: []
});

// Lock action - save current working config to storage
export const lockAtom = atom(
  null,
  (get, set) => {
    const currentConfig = get(configAtom);
    console.log('🔒 Locking - saving config to storage');
    set(storedConfigAtom, currentConfig);
    set(isLockedAtom, true);
  }
);

// Unlock action - clear storage
export const unlockAtom = atom(
  null,
  (get, set) => {
    console.log('🔓 Unlocking - clearing storage');
    set(storedConfigAtom, RESET);
    set(isLockedAtom, false);
    // Working config stays as-is
  }
);

// Hydration action - load from storage if locked
export const hydrateAtom = atom(
  null,
  (get, set) => {
    const isLocked = get(isLockedAtom);
    const storedConfig = get(storedConfigAtom);
    
    console.log('💧 Hydrating:', { isLocked, hasStored: !!storedConfig });
    
    if (isLocked && storedConfig) {
      console.log('📥 Restoring from storage:', storedConfig);
      set(configAtom, storedConfig);
      return 'restored';
    } else {
      console.log('🏗️ Using defaults (unlocked or no stored data)');
      return 'defaults';
    }
  }
);