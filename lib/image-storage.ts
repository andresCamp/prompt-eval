/**
 * @fileoverview IndexedDB-based image storage for the image playground
 *
 * Uses IndexedDB to store large image data instead of localStorage
 * to avoid memory/quota issues. Images are stored with unique IDs
 * and the config only stores references to those IDs.
 *
 * Supports deduplication - same image content gets the same ID.
 */

interface ImageData {
  id: string;
  hash: string; // Content hash for deduplication
  data: string; // base64 encoded image
  timestamp: number;
  refCount: number; // Reference count for cleanup
  type: 'generated' | 'reference'; // Type of image
}

// Simple hash function for base64 strings
async function hashImage(base64: string): Promise<string> {
  // Use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(base64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to simple hash for environments without crypto
  let hash = 0;
  for (let i = 0; i < base64.length; i++) {
    const char = base64.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

class ImageStorage {
  private dbName = 'image-playground-storage';
  private storeName = 'images';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveImage(data: string, type: 'generated' | 'reference' = 'generated'): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const hash = await hashImage(data);

    // Check if image with this hash already exists
    const existingId = await this.findImageByHash(hash);
    if (existingId) {
      // Image already exists, increment reference count
      await this.incrementRefCount(existingId);
      return existingId;
    }

    // Create new image entry
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData: ImageData = {
      id,
      hash,
      data,
      timestamp: Date.now(),
      refCount: 1,
      type
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(imageData);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to save image'));
    });
  }

  private async findImageByHash(hash: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const imageData = cursor.value as ImageData;
          if (imageData.hash === hash) {
            resolve(imageData.id);
            return;
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error('Failed to find image by hash'));
    });
  }

  private async incrementRefCount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const imageData = getRequest.result as ImageData;
        if (imageData) {
          imageData.refCount = (imageData.refCount || 1) + 1;
          const putRequest = store.put(imageData);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error('Failed to update ref count'));
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(new Error('Failed to get image for ref count'));
    });
  }

  async releaseImage(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const imageData = getRequest.result as ImageData;
        if (imageData) {
          imageData.refCount = Math.max(0, (imageData.refCount || 1) - 1);

          if (imageData.refCount === 0) {
            // No more references, delete the image
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(new Error('Failed to delete image'));
          } else {
            // Still has references, just update the count
            const putRequest = store.put(imageData);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error('Failed to update ref count'));
          }
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(new Error('Failed to get image for release'));
    });
  }

  async getImage(id: string): Promise<string | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as ImageData | undefined;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(new Error('Failed to get image'));
    });
  }

  // For backward compatibility, deleteImage now uses releaseImage
  async deleteImage(id: string): Promise<void> {
    return this.releaseImage(id);
  }

  async clearOldImages(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - maxAgeMs;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const imageData = cursor.value as ImageData;
          if (imageData.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(new Error('Failed to clear old images'));
    });
  }

  async getAllImageIds(): Promise<string[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error('Failed to get image IDs'));
    });
  }
}

// Singleton instance
export const imageStorage = new ImageStorage();

// Helper functions for easy usage
export async function saveImage(base64Data: string, type?: 'generated' | 'reference'): Promise<string> {
  return imageStorage.saveImage(base64Data, type);
}

export async function saveReferenceImage(base64Data: string): Promise<string> {
  return imageStorage.saveImage(base64Data, 'reference');
}

export async function getImage(id: string): Promise<string | null> {
  return imageStorage.getImage(id);
}

export async function deleteImage(id: string): Promise<void> {
  return imageStorage.deleteImage(id);
}

export async function releaseImage(id: string): Promise<void> {
  return imageStorage.releaseImage(id);
}

export async function clearOldImages(maxAgeMs?: number): Promise<void> {
  return imageStorage.clearOldImages(maxAgeMs);
}

export async function getAllImageIds(): Promise<string[]> {
  return imageStorage.getAllImageIds();
}