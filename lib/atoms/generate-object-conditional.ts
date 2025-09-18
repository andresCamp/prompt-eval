import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// Lock state - always persistent
export const isLockedAtom = atomWithStorage<boolean>(
  'generate-object-locked', 
  false,
  undefined,
  { getOnInit: true }
);

// Regular atom for working config
export const workingConfigAtom = atom<GenerateObjectConfig>({
  modelThreads: [],
  schemaThreads: [],
  systemPromptThreads: [],
  promptDataThreads: [],
  executionThreads: []
});

// Conditional storage - only when locked
const conditionalStorage = {
  getItem: (key: string, initialValue: unknown) => {
    // Only read from storage if we're locked
    const isLocked = localStorage.getItem('generate-object-locked') === 'true';
    if (!isLocked) {
      console.log('🔓 Not locked - ignoring stored config');
      return initialValue;
    }
    const stored = localStorage.getItem(key);
    console.log('📥 Reading from storage (locked):', !!stored);
    if (stored === null) return initialValue;
    try {
      return JSON.parse(stored);
    } catch {
      return initialValue;
    }
  },
  setItem: (key: string, value: unknown) => {
    // Only save to storage if we're locked
    const isLocked = localStorage.getItem('generate-object-locked') === 'true';
    if (isLocked) {
      console.log('💾 Saving to storage (locked)');
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      console.log('🔓 Not locked - not saving to storage');
    }
  },
  removeItem: (key: string) => {
    console.log('🗑️ Removing from storage');
    localStorage.removeItem(key);
  }
};

// Config atom that only persists when locked
export const configAtom = atomWithStorage<GenerateObjectConfig>(
  'generate-object-config',
  {
    modelThreads: [],
    schemaThreads: [],
    systemPromptThreads: [],
    promptDataThreads: [],
    executionThreads: []
  },
  conditionalStorage,
  { getOnInit: true }
);