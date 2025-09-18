import { 
  cleanupCellSnapshotAtom, 
  cleanupThreadSnapshotAtom,
  cleanupAllSnapshots
} from '../atoms/snapshot-atoms';
import { PageScopedStorage } from '../storage';


export interface CleanupOptions {
  pageId: string;
  includeOrphaned?: boolean;
  maxAge?: number; // in milliseconds
  dryRun?: boolean;
}

export interface CleanupResult {
  totalCleaned: number;
  cellsCleaned: number;
  threadsCleaned: number;
  orphanedCleaned: number;
  bytesFreed: number;
  errors: string[];
}

export class SnapshotCleanup {
  private pageId: string;
  private storage: PageScopedStorage;

  constructor(pageId: string) {
    this.pageId = pageId;
    this.storage = new PageScopedStorage({ pageId });
  }

  cleanupThread(
    threadType: string,
    threadId: string,
    deleteFromStorage = true
  ): void {
    cleanupThreadSnapshotAtom(this.pageId, threadType, threadId);
    
    if (deleteFromStorage) {
      const key = `thread:${threadType}:${threadId}`;
      const storage = new PageScopedStorage({
        pageId: this.pageId,
        prefix: key
      });
      storage.cleanupPage();
    }
  }

  cleanupCell(
    rowId: string,
    columnId: string,
    executionId: string,
    deleteFromStorage = true
  ): void {
    cleanupCellSnapshotAtom(this.pageId, rowId, columnId, executionId);
    
    if (deleteFromStorage) {
      const key = `cell:${rowId}:${columnId}`;
      const storage = new PageScopedStorage({
        pageId: this.pageId,
        prefix: key
      });
      storage.cleanupPage();
    }
  }

  cleanupAllForPage(): void {
    cleanupAllSnapshots(this.pageId);
    this.storage.cleanupPage();
  }

  async performCleanup(options: CleanupOptions): Promise<CleanupResult> {
    const result: CleanupResult = {
      totalCleaned: 0,
      cellsCleaned: 0,
      threadsCleaned: 0,
      orphanedCleaned: 0,
      bytesFreed: 0,
      errors: []
    };

    const initialSize = this.storage.getStorageSize();
    const keys = this.storage.getAllKeys();
    const now = Date.now();

    for (const key of keys) {
      try {
        const rawData = this.storage.getItem(key, null);
        if (!rawData) continue;

        const snapshot = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const age = now - (snapshot.metadata?.timestamp || 0);

        let shouldClean = false;
        let cleanupType: 'cell' | 'thread' | 'orphaned' = 'orphaned';

        if (options.maxAge && age > options.maxAge) {
          shouldClean = true;
        }

        if (key.startsWith('thread:')) {
          cleanupType = 'thread';
          if (options.includeOrphaned && !this.isThreadActive(key)) {
            shouldClean = true;
          }
        } else if (key.startsWith('cell:')) {
          cleanupType = 'cell';
          if (options.includeOrphaned && !this.isCellActive(key)) {
            shouldClean = true;
          }
        } else if (options.includeOrphaned) {
          shouldClean = true;
        }

        if (shouldClean && !options.dryRun) {
          this.storage.removeItem(key);
          result.totalCleaned++;

          switch (cleanupType) {
            case 'cell':
              result.cellsCleaned++;
              break;
            case 'thread':
              result.threadsCleaned++;
              break;
            default:
              result.orphanedCleaned++;
          }
        } else if (shouldClean && options.dryRun) {
          result.totalCleaned++;
        }
      } catch (error) {
        result.errors.push(
          `Error processing key ${key}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    if (!options.dryRun) {
      const finalSize = this.storage.getStorageSize();
      result.bytesFreed = initialSize - finalSize;
    }

    return result;
  }

  private isThreadActive(key: string): boolean {
    // Check if thread is still referenced in the UI
    // This would be implemented based on your actual UI state management
    return false;
  }

  private isCellActive(key: string): boolean {
    // Check if cell is still referenced in the results grid
    // This would be implemented based on your actual UI state management
    return false;
  }

  findOrphanedSnapshots(): string[] {
    const keys = this.storage.getAllKeys();
    const orphaned: string[] = [];

    for (const key of keys) {
      if (!this.isSnapshotReferenced(key)) {
        orphaned.push(key);
      }
    }

    return orphaned;
  }

  private isSnapshotReferenced(key: string): boolean {
    // Check if snapshot is referenced by any active component
    // This would need to be implemented based on your actual component structure
    return false;
  }

  getStorageStats(): {
    totalSnapshots: number;
    cellSnapshots: number;
    threadSnapshots: number;
    totalSize: number;
    averageSize: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  } {
    const keys = this.storage.getAllKeys();
    let cellCount = 0;
    let threadCount = 0;
    let oldestTime: number | null = null;
    let newestTime: number | null = null;

    for (const key of keys) {
      if (key.startsWith('cell:')) {
        cellCount++;
      } else if (key.startsWith('thread:')) {
        threadCount++;
      }

      try {
        const data = this.storage.getItem(key, null);
        if (data) {
          const snapshot = typeof data === 'string' ? JSON.parse(data) : data;
          const timestamp = snapshot.metadata?.timestamp || snapshot._t;
          
          if (timestamp) {
            if (oldestTime === null || timestamp < oldestTime) {
              oldestTime = timestamp;
            }
            if (newestTime === null || timestamp > newestTime) {
              newestTime = timestamp;
            }
          }
        }
      } catch {
        // Skip corrupted entries
      }
    }

    const totalSize = this.storage.getStorageSize();
    const totalSnapshots = keys.length;

    return {
      totalSnapshots,
      cellSnapshots: cellCount,
      threadSnapshots: threadCount,
      totalSize,
      averageSize: totalSnapshots > 0 ? totalSize / totalSnapshots : 0,
      oldestSnapshot: oldestTime,
      newestSnapshot: newestTime
    };
  }

  schedulePeriodicalCleanup(
    intervalMs: number = 3600000, // 1 hour default
    maxAge: number = 86400000 // 24 hours default
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        await this.performCleanup({
          pageId: this.pageId,
          includeOrphaned: true,
          maxAge,
          dryRun: false
        });
      } catch (error) {
        console.error('Periodic cleanup failed:', error);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }
}

export function createCleanupManager(pageId: string): SnapshotCleanup {
  return new SnapshotCleanup(pageId);
}

export function cleanupOnUnmount(
  pageId: string,
  elementId: string,
  type: 'cell' | 'thread'
): () => void {
  return () => {
    const cleanup = new SnapshotCleanup(pageId);
    
    if (type === 'cell') {
      const [rowId, columnId, executionId] = elementId.split(':');
      cleanup.cleanupCell(rowId, columnId, executionId);
    } else {
      const [threadType, threadId] = elementId.split(':');
      cleanup.cleanupThread(threadType, threadId);
    }
  };
}