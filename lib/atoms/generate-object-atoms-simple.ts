import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import type { GenerateObjectConfig } from '@/components/generate-object-playground/types';

// Simple approach: Just use regular atoms + manual localStorage
export const configAtom = atom<GenerateObjectConfig>({
  modelThreads: [],
  schemaThreads: [],
  systemPromptThreads: [],
  promptDataThreads: [],
  executionThreads: []
});

export const isLockedAtom = atom<boolean>(false);

// Actions
export const saveToStorageAtom = atom(
  null,
  (get, set) => {
    const config = get(configAtom);
    console.log('💾 Saving to localStorage:', config);
    localStorage.setItem('generate-object-config', JSON.stringify(config));
    localStorage.setItem('generate-object-locked', 'true');
    set(isLockedAtom, true);
  }
);

export const clearStorageAtom = atom(
  null,
  (get, set) => {
    console.log('🗑️ Clearing localStorage');
    localStorage.removeItem('generate-object-config');
    localStorage.removeItem('generate-object-locked');
    set(isLockedAtom, false);
  }
);

export const loadFromStorageAtom = atom(
  null,
  (get, set) => {
    if (typeof window === 'undefined') return { loaded: false, hasData: false };
    
    const savedConfig = localStorage.getItem('generate-object-config');
    const isLocked = localStorage.getItem('generate-object-locked') === 'true';
    
    console.log('📥 Loading from localStorage:', { savedConfig: !!savedConfig, isLocked });
    
    if (isLocked && savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        set(configAtom, parsed);
        set(isLockedAtom, true);
        console.log('✅ Loaded config from storage:', parsed);
        return { loaded: true, hasData: true };
      } catch (error) {
        console.error('❌ Failed to parse saved config:', error);
        set(isLockedAtom, false);
        return { loaded: true, hasData: false };
      }
    } else {
      set(isLockedAtom, false);
      console.log('🏗️ No saved config or unlocked - will use defaults');
      return { loaded: true, hasData: false };
    }
  }
);