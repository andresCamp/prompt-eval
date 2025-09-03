import type { 
  SnapshotDiff, 
  SnapshotComparison,
  ThreadSnapshot,
  CellSnapshot
} from '../types/snapshot';

export function deepCompare(obj1: any, obj2: any, path: string = ''): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];

  if (obj1 === obj2) {
    return [{
      type: 'unchanged',
      path,
      oldValue: obj1,
      newValue: obj2
    }];
  }

  if (obj1 === null || obj1 === undefined) {
    return [{
      type: 'added',
      path,
      newValue: obj2
    }];
  }

  if (obj2 === null || obj2 === undefined) {
    return [{
      type: 'removed',
      path,
      oldValue: obj1
    }];
  }

  if (typeof obj1 !== typeof obj2) {
    return [{
      type: 'modified',
      path,
      oldValue: obj1,
      newValue: obj2
    }];
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      return [{
        type: 'modified',
        path,
        oldValue: obj1,
        newValue: obj2
      }];
    }
    return [{
      type: 'unchanged',
      path,
      oldValue: obj1,
      newValue: obj2
    }];
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLength = Math.max(obj1.length, obj2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      
      if (i >= obj1.length) {
        diffs.push({
          type: 'added',
          path: itemPath,
          newValue: obj2[i]
        });
      } else if (i >= obj2.length) {
        diffs.push({
          type: 'removed',
          path: itemPath,
          oldValue: obj1[i]
        });
      } else {
        diffs.push(...deepCompare(obj1[i], obj2[i], itemPath));
      }
    }
    
    return diffs;
  }

  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  for (const key of keys) {
    const keyPath = path ? `${path}.${key}` : key;
    
    if (!(key in obj1)) {
      diffs.push({
        type: 'added',
        path: keyPath,
        newValue: obj2[key]
      });
    } else if (!(key in obj2)) {
      diffs.push({
        type: 'removed',
        path: keyPath,
        oldValue: obj1[key]
      });
    } else {
      diffs.push(...deepCompare(obj1[key], obj2[key], keyPath));
    }
  }
  
  return diffs;
}

export function createComparison(
  oldValue: any,
  newValue: any,
  path: string = ''
): SnapshotComparison {
  const diffs = deepCompare(oldValue, newValue, path);
  
  const summary = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0
  };
  
  for (const diff of diffs) {
    summary[diff.type]++;
  }
  
  return {
    hasChanges: summary.added > 0 || summary.removed > 0 || summary.modified > 0,
    totalChanges: summary.added + summary.removed + summary.modified,
    diffs: diffs.filter(d => d.type !== 'unchanged'),
    summary
  };
}

export function compareThreadSnapshots(
  snapshot1: ThreadSnapshot | null,
  snapshot2: ThreadSnapshot | null
): SnapshotComparison {
  if (!snapshot1 && !snapshot2) {
    return {
      hasChanges: false,
      totalChanges: 0,
      diffs: [],
      summary: { added: 0, removed: 0, modified: 0, unchanged: 1 }
    };
  }
  
  const value1 = snapshot1?.value ?? null;
  const value2 = snapshot2?.value ?? null;
  
  return createComparison(value1, value2, 'thread');
}

export function compareCellSnapshots(
  snapshot1: CellSnapshot | null,
  snapshot2: CellSnapshot | null
): SnapshotComparison {
  if (!snapshot1 && !snapshot2) {
    return {
      hasChanges: false,
      totalChanges: 0,
      diffs: [],
      summary: { added: 0, removed: 0, modified: 0, unchanged: 1 }
    };
  }
  
  const result1 = snapshot1?.result ?? null;
  const result2 = snapshot2?.result ?? null;
  
  return createComparison(result1, result2, 'cell.result');
}

export function generateSnapshotHash(value: any): string {
  const str = JSON.stringify(value);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(36);
}

export function validateSnapshot(snapshot: any): boolean {
  if (!snapshot) return false;
  
  if (!snapshot.metadata) return false;
  if (!snapshot.metadata.id) return false;
  if (!snapshot.metadata.timestamp) return false;
  if (!snapshot.metadata.version) return false;
  if (!snapshot.metadata.hash) return false;
  
  const calculatedHash = generateSnapshotHash(snapshot.value || snapshot.result);
  return calculatedHash === snapshot.metadata.hash;
}

export function formatDiffPath(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, '[$1]')
    .replace(/^\./, '')
    .replace(/\./g, ' → ');
}

export function getDiffDescription(diff: SnapshotDiff): string {
  const formattedPath = formatDiffPath(diff.path);
  
  switch (diff.type) {
    case 'added':
      return `Added: ${formattedPath}`;
    case 'removed':
      return `Removed: ${formattedPath}`;
    case 'modified':
      return `Modified: ${formattedPath}`;
    case 'unchanged':
      return `Unchanged: ${formattedPath}`;
    default:
      return `Unknown change: ${formattedPath}`;
  }
}

export function filterSignificantDiffs(diffs: SnapshotDiff[]): SnapshotDiff[] {
  return diffs.filter(diff => {
    if (diff.type === 'unchanged') return false;
    
    if (diff.path.includes('metadata')) return false;
    if (diff.path.includes('timestamp')) return false;
    if (diff.path.includes('_t')) return false;
    if (diff.path.includes('_v')) return false;
    
    return true;
  });
}

export function groupDiffsByType(diffs: SnapshotDiff[]): Record<string, SnapshotDiff[]> {
  const grouped: Record<string, SnapshotDiff[]> = {
    added: [],
    removed: [],
    modified: [],
    unchanged: []
  };
  
  for (const diff of diffs) {
    grouped[diff.type].push(diff);
  }
  
  return grouped;
}

export function mergeSnapshots<T extends ThreadSnapshot | CellSnapshot>(
  base: T,
  changes: Partial<T>
): T {
  return {
    ...base,
    ...changes,
    metadata: {
      ...base.metadata,
      timestamp: Date.now(),
      hash: generateSnapshotHash(changes.value || (changes as any).result || base.value || (base as any).result)
    }
  };
}