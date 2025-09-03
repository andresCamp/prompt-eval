import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// Lock state - atomWithStorage only
export const isLockedAtom = atomWithStorage<boolean>(
  'generate-object-locked', 
  false,
  undefined,
  { getOnInit: true }
);

// Config storage - atomWithStorage only  
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

// Track if we've initialized defaults (to prevent re-setting after unlock)
export const initializedAtom = atom<boolean>(false);

// Lock action - just set the flag
export const lockAtom = atom(
  null,
  (get, set) => {
    console.log('🔒 Locking - config already persisted by atomWithStorage');
    set(isLockedAtom, true);
  }
);

// Unlock action - RESET both atoms 
export const unlockAtom = atom(
  null,
  (get, set) => {
    console.log('🔓 Unlocking - calling RESET on storage atoms');
    set(configAtom, RESET);
    set(isLockedAtom, RESET); 
    set(initializedAtom, false); // Allow defaults to be set again
  }
);