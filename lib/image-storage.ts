/**
 * @fileoverview IndexedDB-based image storage for the image playground
 *
 * Uses IndexedDB to store large image data instead of localStorage
 * to avoid memory/quota issues. Images are stored with unique IDs
 * and the config only stores references to those IDs.
 */

interface ImageData {
  id: string;
  data: string; // base64 encoded image
  timestamp: number;
}

class ImageStorage {
  private dbName = 'image-playground-storage';
  private storeName = 'images';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

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

  async saveImage(data: string): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData: ImageData = {
      id,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(imageData);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to save image'));
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

  async deleteImage(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete image'));
    });
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
export async function saveImage(base64Data: string): Promise<string> {
  return imageStorage.saveImage(base64Data);
}

export async function getImage(id: string): Promise<string | null> {
  return imageStorage.getImage(id);
}

export async function deleteImage(id: string): Promise<void> {
  return imageStorage.deleteImage(id);
}

export async function clearOldImages(maxAgeMs?: number): Promise<void> {
  return imageStorage.clearOldImages(maxAgeMs);
}

export async function getAllImageIds(): Promise<string[]> {
  return imageStorage.getAllImageIds();
}