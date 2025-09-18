import { PageScopedStorage } from '../storage';
import type { ThreadSnapshot, CellSnapshot } from '../types/snapshot';
import { validateSnapshot, generateSnapshotHash } from './snapshot';

export interface RecoveryResult {
  success: boolean;
  recovered: number;
  failed: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

export class SnapshotRecovery {
  private storage: PageScopedStorage;
  
  constructor(storage: PageScopedStorage) {
    this.storage = storage;
  }

  async recoverSnapshots(): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: true,
      recovered: 0,
      failed: 0,
      errors: []
    };

    const keys = this.storage.getAllKeys();
    
    for (const key of keys) {
      try {
        const rawData = this.storage.getItem(key);
        if (!rawData) {
          result.errors.push({
            key,
            error: 'No data found'
          });
          result.failed++;
          continue;
        }

        const snapshot = JSON.parse(rawData);
        
        if (!validateSnapshot(snapshot)) {
          const repaired = this.attemptRepair(snapshot);
          
          if (repaired && validateSnapshot(repaired)) {
            this.storage.setItem(key, JSON.stringify(repaired));
            result.recovered++;
          } else {
            this.storage.removeItem(key);
            result.errors.push({
              key,
              error: 'Invalid snapshot structure - removed'
            });
            result.failed++;
          }
        } else {
          result.recovered++;
        }
      } catch (error) {
        result.errors.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.failed++;
        
        this.storage.removeItem(key);
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  private attemptRepair(snapshot: any): any | null {
    try {
      if (!snapshot.metadata) {
        snapshot.metadata = {
          id: `recovered:${Date.now()}`,
          timestamp: Date.now(),
          version: 1,
          hash: '',
          pageId: 'unknown'
        };
      }

      if (!snapshot.metadata.hash || snapshot.metadata.hash === '') {
        snapshot.metadata.hash = generateSnapshotHash(
          snapshot.value || snapshot.result
        );
      }

      if (!snapshot.metadata.timestamp) {
        snapshot.metadata.timestamp = Date.now();
      }

      if (!snapshot.metadata.version) {
        snapshot.metadata.version = 1;
      }

      if ('value' in snapshot && !('type' in snapshot)) {
        snapshot.type = 'unknown';
      }

      if ('result' in snapshot && !('rowId' in snapshot)) {
        snapshot.rowId = 'unknown';
        snapshot.columnId = 'unknown';
      }

      return snapshot;
    } catch {
      return null;
    }
  }

  async backupSnapshots(): Promise<string> {
    const keys = this.storage.getAllKeys();
    const backup: Record<string, any> = {};
    
    for (const key of keys) {
      try {
        const data = this.storage.getItem(key);
        if (data) {
          backup[key] = JSON.parse(data);
        }
      } catch {
        // Skip corrupted entries
      }
    }

    const backupData = {
      version: 1,
      timestamp: Date.now(),
      snapshots: backup
    };

    return JSON.stringify(backupData, null, 2);
  }

  async restoreSnapshots(backupData: string): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: true,
      recovered: 0,
      failed: 0,
      errors: []
    };

    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.snapshots) {
        throw new Error('Invalid backup format');
      }

      for (const [key, snapshot] of Object.entries(backup.snapshots)) {
        try {
          if (validateSnapshot(snapshot)) {
            this.storage.setItem(key, JSON.stringify(snapshot));
            result.recovered++;
          } else {
            result.errors.push({
              key,
              error: 'Invalid snapshot in backup'
            });
            result.failed++;
          }
        } catch (error) {
          result.errors.push({
            key,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.failed++;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        key: 'backup',
        error: error instanceof Error ? error.message : 'Invalid backup data'
      });
    }

    result.success = result.failed === 0;
    return result;
  }

  migrateSnapshots(fromVersion: number, toVersion: number): RecoveryResult {
    const result: RecoveryResult = {
      success: true,
      recovered: 0,
      failed: 0,
      errors: []
    };

    const keys = this.storage.getAllKeys();
    
    for (const key of keys) {
      try {
        const rawData = this.storage.getItem(key);
        if (!rawData) continue;

        const snapshot = JSON.parse(rawData);
        
        if (snapshot.metadata?.version === fromVersion) {
          const migrated = this.migrateSnapshot(snapshot, toVersion);
          
          if (migrated) {
            this.storage.setItem(key, JSON.stringify(migrated));
            result.recovered++;
          } else {
            result.failed++;
            result.errors.push({
              key,
              error: 'Migration failed'
            });
          }
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  private migrateSnapshot(snapshot: any, toVersion: number): any | null {
    try {
      const migrated = { ...snapshot };
      
      // Add migration logic here based on version differences
      // For now, just update the version number
      migrated.metadata.version = toVersion;
      migrated.metadata.hash = generateSnapshotHash(
        migrated.value || migrated.result
      );
      
      return migrated;
    } catch {
      return null;
    }
  }
}

export function createRecoveryManager(pageId: string): SnapshotRecovery {
  const storage = new PageScopedStorage({ pageId });
  return new SnapshotRecovery(storage);
}

export class SnapshotErrorBoundary {
  static handleError(error: Error, context: string): void {
    console.error(`Snapshot error in ${context}:`, error);
    
    if (error.name === 'QuotaExceededError') {
      this.handleQuotaError();
    } else if (error.message.includes('JSON')) {
      this.handleParseError(context);
    }
  }

  private static handleQuotaError(): void {
    console.warn('Storage quota exceeded. Attempting automatic cleanup...');
    
    // Get all storage keys and remove oldest snapshots
    const keys = Object.keys(localStorage);
    const snapshotKeys = keys.filter(k => k.startsWith('snapshot:'));
    
    const keysWithTime: Array<{ key: string; time: number }> = [];
    
    for (const key of snapshotKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          keysWithTime.push({
            key,
            time: parsed._t || parsed.metadata?.timestamp || 0
          });
        }
      } catch {
        // Remove corrupted entries
        localStorage.removeItem(key);
      }
    }
    
    // Remove oldest 20% of snapshots
    keysWithTime.sort((a, b) => a.time - b.time);
    const toRemove = Math.ceil(keysWithTime.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(keysWithTime[i].key);
    }
  }

  private static handleParseError(context: string): void {
    console.warn(`JSON parse error in ${context}. Data may be corrupted.`);
  }
}