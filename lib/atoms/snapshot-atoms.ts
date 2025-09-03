import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { 
  createPageScopedStorage, 
  createCellStorage, 
  createThreadStorage 
} from '../storage';
import type { 
  ThreadSnapshot, 
  CellSnapshot, 
  ModuleSnapshot,
  SnapshotState,
  SnapshotComparison
} from '../types/snapshot';

const DEBUG = true;

export const createThreadSnapshotAtom = (
  pageId: string,
  threadType: string,
  threadId: string,
  initialValue: any = null
) => {
  const atomKey = `${threadType}:${threadId}`;
  
  if (DEBUG) {
    console.log('[Atom] Creating thread snapshot atom:', {
      pageId,
      threadType,
      threadId,
      atomKey,
      hasInitialValue: initialValue !== null
    });
  }
  
  const storage = createThreadStorage(pageId, threadType, threadId);
  
  const baseAtom = atomWithStorage<ThreadSnapshot | null>(
    atomKey,
    initialValue,
    storage,
    { getOnInit: true }
  );

  const isLockedAtom = atom(
    (get) => {
      const snapshot = get(baseAtom);
      const isLocked = snapshot?.isLocked ?? false;
      if (DEBUG) {
        console.log('[Atom] isLockedAtom read:', {
          atomKey,
          hasSnapshot: snapshot !== null,
          isLocked,
          snapshotKeys: snapshot ? Object.keys(snapshot) : null
        });
      }
      return isLocked;
    }
  );

  const stateAtom = atom<SnapshotState>(
    (get) => {
      const snapshot = get(baseAtom);
      if (!snapshot) return 'unlocked';
      if (!snapshot.isLocked) return 'unlocked';
      
      return 'locked';
    }
  );

  const lockAtom = atom(
    null,
    (get, set, value: any) => {
      const snapshot: ThreadSnapshot = {
        metadata: {
          id: `${threadType}:${threadId}:${Date.now()}`,
          timestamp: Date.now(),
          version: 1,
          hash: generateHash(value),
          pageId
        },
        type: threadType as any,
        threadId,
        value,
        isLocked: true
      };
      
      if (DEBUG) {
        console.log('[Atom] Locking thread:', {
          atomKey,
          snapshot,
          valueType: typeof value,
          valueKeys: value ? Object.keys(value) : null
        });
      }
      
      set(baseAtom, snapshot);
    }
  );

  const unlockAtom = atom(
    null,
    (_get, set) => {
      if (DEBUG) {
        console.log('[Atom] Unlocking thread:', { atomKey });
      }
      set(baseAtom, RESET);
    }
  );

  return {
    snapshotAtom: baseAtom,
    isLockedAtom,
    stateAtom,
    lockAtom,
    unlockAtom
  };
};

export const createCellSnapshotAtom = (
  pageId: string,
  rowId: string,
  columnId: string,
  executionId: string
) => {
  const atomKey = `${executionId}`;
  
  if (DEBUG) {
    console.log('[Atom] Creating cell snapshot atom:', {
      pageId,
      rowId,
      columnId,
      executionId,
      atomKey
    });
  }
  
  const storage = createCellStorage(pageId, rowId, columnId);
  
  const baseAtom = atomWithStorage<CellSnapshot | null>(
    atomKey,
    null,
    storage,
    { getOnInit: true }
  );
  
  // Debug hydration on mount
  if (DEBUG) {
    const checkHydration = () => {
      const storageKeys = Object.keys(localStorage).filter(k => k.includes(rowId) && k.includes(columnId));
      console.log('[Atom] Cell hydration check:', {
        atomKey,
        rowId,
        columnId,
        relatedStorageKeys: storageKeys,
        storageValues: storageKeys.map(k => ({
          key: k,
          value: localStorage.getItem(k)?.substring(0, 100)
        }))
      });
    };
    // Delay to ensure atom is initialized
    setTimeout(checkHydration, 100);
  }

  const isLockedAtom = atom(
    (get) => {
      const snapshot = get(baseAtom);
      const isLocked = snapshot?.isLocked ?? false;
      if (DEBUG) {
        console.log('[Atom] Cell isLockedAtom read:', {
          atomKey,
          rowId,
          columnId,
          hasSnapshot: snapshot !== null,
          isLocked,
          snapshotKeys: snapshot ? Object.keys(snapshot) : null
        });
      }
      return isLocked;
    }
  );

  const hasChangesAtom = atom(
    (get) => {
      const snapshot = get(baseAtom);
      if (!snapshot || !snapshot.isLocked) return false;
      
      return false;
    }
  );

  const lockAtom = atom(
    null,
    (get, set, result: CellSnapshot['result']) => {
      const snapshot: CellSnapshot = {
        metadata: {
          id: `cell:${rowId}:${columnId}:${Date.now()}`,
          timestamp: Date.now(),
          version: 1,
          hash: generateHash(result),
          pageId
        },
        rowId,
        columnId,
        executionId,
        result,
        isLocked: true
      };
      
      if (DEBUG) {
        console.log('[Atom] Locking cell:', {
          atomKey,
          rowId,
          columnId,
          snapshot,
          resultKeys: Object.keys(result)
        });
      }
      
      set(baseAtom, snapshot);
    }
  );

  const unlockAtom = atom(
    null,
    (_get, set) => {
      if (DEBUG) {
        console.log('[Atom] Unlocking cell:', { atomKey, rowId, columnId });
      }
      set(baseAtom, RESET);
    }
  );

  return {
    snapshotAtom: baseAtom,
    isLockedAtom,
    hasChangesAtom,
    lockAtom,
    unlockAtom
  };
};

const cellSnapshotAtomsMap = new Map<string, ReturnType<typeof createCellSnapshotAtom>>();

export const getCellSnapshotAtoms = (
  pageId: string,
  rowId: string,
  columnId: string,
  executionId: string
) => {
  const key = `${pageId}_${rowId}_${columnId}_${executionId}`;
  
  if (DEBUG) {
    console.log('[Atom] getCellSnapshotAtoms:', {
      key,
      exists: cellSnapshotAtomsMap.has(key),
      mapSize: cellSnapshotAtomsMap.size,
      pageId,
      rowId,
      columnId,
      executionId
    });
  }
  
  if (!cellSnapshotAtomsMap.has(key)) {
    if (DEBUG) {
      console.log('[Atom] Creating new cell snapshot atoms for key:', key);
    }
    cellSnapshotAtomsMap.set(
      key,
      createCellSnapshotAtom(pageId, rowId, columnId, executionId)
    );
  }
  
  return cellSnapshotAtomsMap.get(key)!;
};

export const cleanupCellSnapshotAtom = (
  pageId: string,
  rowId: string,
  columnId: string,
  executionId: string
) => {
  const key = `${pageId}_${rowId}_${columnId}_${executionId}`;
  cellSnapshotAtomsMap.delete(key);
};

const threadSnapshotAtomsMap = new Map<string, ReturnType<typeof createThreadSnapshotAtom>>();

export const getThreadSnapshotAtoms = (
  pageId: string,
  threadType: string,
  threadId: string,
  initialValue?: any
) => {
  const key = `${pageId}_${threadType}_${threadId}`;
  
  if (DEBUG) {
    console.log('[Atom] getThreadSnapshotAtoms:', {
      key,
      exists: threadSnapshotAtomsMap.has(key),
      mapSize: threadSnapshotAtomsMap.size,
      hasInitialValue: initialValue !== undefined
    });
  }
  
  if (!threadSnapshotAtomsMap.has(key)) {
    if (DEBUG) {
      console.log('[Atom] Creating new thread snapshot atoms for key:', key);
    }
    threadSnapshotAtomsMap.set(
      key,
      createThreadSnapshotAtom(pageId, threadType, threadId, initialValue)
    );
  }
  
  return threadSnapshotAtomsMap.get(key)!;
};

export const cleanupThreadSnapshotAtom = (
  pageId: string,
  threadType: string,
  threadId: string
) => {
  const key = `${pageId}_${threadType}_${threadId}`;
  threadSnapshotAtomsMap.delete(key);
};

export const pageSnapshotAtom = atom<ModuleSnapshot | null>(null);

export const allCellSnapshotsAtom = atom(
  (get) => {
    const snapshots: CellSnapshot[] = [];
    
    cellSnapshotAtomsMap.forEach((atoms) => {
      const snapshot = get(atoms.snapshotAtom);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    });
    
    return snapshots;
  }
);

export const allThreadSnapshotsAtom = atom(
  (get) => {
    const snapshots: ThreadSnapshot[] = [];
    
    threadSnapshotAtomsMap.forEach((atoms) => {
      const snapshot = get(atoms.snapshotAtom);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    });
    
    return snapshots;
  }
);

export const totalLockedCellsAtom = atom(
  (get) => {
    let count = 0;
    
    cellSnapshotAtomsMap.forEach((atoms) => {
      if (get(atoms.isLockedAtom)) {
        count++;
      }
    });
    
    return count;
  }
);

export const totalLockedThreadsAtom = atom(
  (get) => {
    let count = 0;
    
    threadSnapshotAtomsMap.forEach((atoms) => {
      if (get(atoms.isLockedAtom)) {
        count++;
      }
    });
    
    return count;
  }
);

function generateHash(value: any): string {
  const str = JSON.stringify(value);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(36);
}

export const cleanupAllSnapshots = (pageId: string) => {
  cellSnapshotAtomsMap.forEach((atoms, key) => {
    if (key.startsWith(pageId)) {
      cellSnapshotAtomsMap.delete(key);
    }
  });
  
  threadSnapshotAtomsMap.forEach((atoms, key) => {
    if (key.startsWith(pageId)) {
      threadSnapshotAtomsMap.delete(key);
    }
  });
  
  const storage = createPageScopedStorage(pageId);
  storage.cleanupPage();
};