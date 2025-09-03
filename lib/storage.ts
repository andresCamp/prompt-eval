import { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

const DEBUG = true; // Enable debug logging

export interface StorageOptions {
  pageId?: string;
  prefix?: string;
  version?: number;
}

export class PageScopedStorage implements SyncStorage<any> {
  private prefix: string;
  private version: number;
  private debugLabel: string;

  constructor(options: StorageOptions = {}) {
    const { pageId = 'default', prefix = 'snapshot', version = 1 } = options;
    // Use underscores instead of colons for better compatibility
    this.prefix = `${prefix}_${pageId}`;
    this.version = version;
    this.debugLabel = `[Storage ${this.prefix}]`;
    
    if (DEBUG) {
      console.log(`${this.debugLabel} Initialized with:`, {
        pageId,
        prefix,
        version,
        fullPrefix: this.prefix
      });
    }
  }

  private getFullKey(key: string): string {
    // Sanitize the key to remove any problematic characters
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fullKey = `${this.prefix}_${sanitizedKey}_v${this.version}`;
    if (DEBUG) {
      console.log(`${this.debugLabel} getFullKey:`, {
        input: key,
        sanitizedKey,
        output: fullKey
      });
    }
    return fullKey;
  }

  getItem(key: string): string | null {
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (DEBUG) {
        console.log(`${this.debugLabel} getItem:`, {
          key,
          fullKey,
          itemExists: item !== null,
          itemLength: item?.length || 0,
          rawItem: item ? item.substring(0, 200) : null
        });
      }
      
      if (item === null) return null;
      
      const parsed = JSON.parse(item);
      if (parsed._v !== this.version) {
        if (DEBUG) {
          console.warn(`${this.debugLabel} Version mismatch:`, {
            expected: this.version,
            actual: parsed._v
          });
        }
        this.removeItem(key);
        return null;
      }
      
      const result = JSON.stringify(parsed.data);
      if (DEBUG) {
        console.log(`${this.debugLabel} getItem success:`, {
          key,
          dataType: typeof parsed.data,
          dataKeys: parsed.data ? Object.keys(parsed.data) : null,
          resultLength: result.length
        });
      }
      
      return result;
    } catch (error) {
      console.error(`${this.debugLabel} Error reading from storage key ${key}:`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const fullKey = this.getFullKey(key);
      const parsedValue = JSON.parse(value);
      const wrapped = {
        _v: this.version,
        _t: Date.now(),
        data: parsedValue
      };
      
      if (DEBUG) {
        console.log(`${this.debugLabel} setItem:`, {
          key,
          fullKey,
          valueType: typeof parsedValue,
          valueKeys: parsedValue ? Object.keys(parsedValue) : null,
          wrappedKeys: Object.keys(wrapped),
          timestamp: wrapped._t
        });
      }
      
      const stringified = JSON.stringify(wrapped);
      localStorage.setItem(fullKey, stringified);
      
      if (DEBUG) {
        console.log(`${this.debugLabel} setItem success:`, {
          key,
          storedLength: stringified.length,
          verification: localStorage.getItem(fullKey)?.substring(0, 100)
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error(`${this.debugLabel} Storage quota exceeded. Attempting cleanup...`);
        this.performCleanup();
        
        try {
          const fullKey = this.getFullKey(key);
          localStorage.setItem(fullKey, value);
        } catch (retryError) {
          console.error(`${this.debugLabel} Failed to store after cleanup:`, retryError);
          throw error;
        }
      } else {
        console.error(`${this.debugLabel} Error writing to storage key ${key}:`, error);
        throw error;
      }
    }
  }

  removeItem(key: string): void {
    try {
      const fullKey = this.getFullKey(key);
      if (DEBUG) {
        console.log(`${this.debugLabel} removeItem:`, {
          key,
          fullKey,
          existedBefore: localStorage.getItem(fullKey) !== null
        });
      }
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`${this.debugLabel} Error removing storage key ${key}:`, error);
    }
  }

  subscribe?(
    key: string,
    callback: (value: string | null) => void,
    initialValue: string | null
  ): () => void {
    const fullKey = this.getFullKey(key);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === fullKey) {
        callback(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  private performCleanup(): void {
    const keys = Object.keys(localStorage);
    const prefixPattern = new RegExp(`^${this.prefix}_`);
    const oldVersionPattern = new RegExp(`_v(\\d+)$`);
    
    const keysToRemove: string[] = [];
    const keysByAge: { key: string; timestamp: number }[] = [];
    
    for (const key of keys) {
      if (prefixPattern.test(key)) {
        const versionMatch = key.match(oldVersionPattern);
        if (versionMatch && parseInt(versionMatch[1]) < this.version) {
          keysToRemove.push(key);
        } else {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed._t) {
                keysByAge.push({ key, timestamp: parsed._t });
              }
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length < 10) {
      keysByAge.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = keysByAge.slice(0, Math.floor(keysByAge.length * 0.2));
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
    }
  }

  cleanupPage(): void {
    const keys = Object.keys(localStorage);
    const prefixPattern = new RegExp(`^${this.prefix}_`);
    
    keys.forEach(key => {
      if (prefixPattern.test(key)) {
        localStorage.removeItem(key);
      }
    });
  }

  getAllKeys(): string[] {
    const keys = Object.keys(localStorage);
    const prefixPattern = new RegExp(`^${this.prefix}_`);
    const currentVersionPattern = new RegExp(`_v${this.version}$`);
    
    return keys
      .filter(key => prefixPattern.test(key) && currentVersionPattern.test(key))
      .map(key => {
        const prefixLength = this.prefix.length + 1;
        const versionSuffixLength = `_v${this.version}`.length;
        return key.slice(prefixLength, -versionSuffixLength);
      });
  }

  getStorageSize(): number {
    const keys = Object.keys(localStorage);
    const prefixPattern = new RegExp(`^${this.prefix}_`);
    
    let totalSize = 0;
    keys.forEach(key => {
      if (prefixPattern.test(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    });
    
    return totalSize;
  }
}

export function createPageScopedStorage(pageId: string): PageScopedStorage {
  // Sanitize pageId to remove special characters
  const sanitizedPageId = pageId.replace(/[^a-zA-Z0-9-_]/g, '_');
  return new PageScopedStorage({ pageId: sanitizedPageId });
}

export function createCellStorage(pageId: string, rowId: string, columnId: string): PageScopedStorage {
  // Sanitize all IDs to remove special characters
  const sanitizedPageId = pageId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const sanitizedRowId = rowId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const sanitizedColumnId = columnId.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return new PageScopedStorage({ 
    pageId: sanitizedPageId,
    prefix: `cell_${sanitizedRowId}_${sanitizedColumnId}`
  });
}

export function createThreadStorage(pageId: string, threadType: string, threadId: string): PageScopedStorage {
  // Sanitize all IDs to remove special characters
  const sanitizedPageId = pageId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const sanitizedThreadType = threadType.replace(/[^a-zA-Z0-9-_]/g, '_');
  const sanitizedThreadId = threadId.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return new PageScopedStorage({
    pageId: sanitizedPageId,
    prefix: `thread_${sanitizedThreadType}_${sanitizedThreadId}`
  });
}