/**
 * IndexedDB Manager for storing large file chunks and download data
 * Better than localStorage for large files (no 5-10MB limit)
 */

const DB_NAME = "TransferAppDB";
const DB_VERSION = 1;
const UPLOAD_STORE = "uploadState";
const DOWNLOAD_STORE = "downloadState";
const CHUNKS_STORE = "chunks";

export interface UploadStateDB {
  id: string;
  collectionId?: string;
  files: Array<{
    fileId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedChunks: number[];
    totalChunks: number;
    uploadedSize: number;
    isPaused: boolean;
    timestamp: number;
    mail: string;
    settings: {
      expirationTime: number;
      password?: string;
      emailNotification: boolean;
    };
  }>;
  currentFileIndex: number;
  totalSize: number;
  uploadedSize: number;
  isPaused: boolean;
  timestamp: number;
}

export interface DownloadStateDB {
  id: string;
  collectionId: string;
  fileName: string;
  totalSize: number;
  downloadedSize: number;
  isPaused: boolean;
  timestamp: number;
}

export interface ChunkData {
  id: string; // `${collectionId}_${fileId}_${chunkNumber}` or `download_${collectionId}_${chunkNumber}`
  collectionId: string;
  fileId?: string;
  chunkNumber: number;
  data: Uint8Array;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
          db.createObjectStore(UPLOAD_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(DOWNLOAD_STORE)) {
          db.createObjectStore(DOWNLOAD_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          const chunkStore = db.createObjectStore(CHUNKS_STORE, {
            keyPath: "id",
          });
          chunkStore.createIndex("collectionId", "collectionId", {
            unique: false,
          });
          chunkStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Save upload state
   */
  async saveUploadState(state: UploadStateDB): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOAD_STORE], "readwrite");
      const store = transaction.objectStore(UPLOAD_STORE);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load upload state
   */
  async loadUploadState(id: string = "current"): Promise<UploadStateDB | null> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOAD_STORE], "readonly");
      const store = transaction.objectStore(UPLOAD_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const state = request.result as UploadStateDB | undefined;

        // Check if state has expired (7 days)
        if (state && Date.now() - state.timestamp > 7 * 24 * 60 * 60 * 1000) {
          this.clearUploadState(id);
          resolve(null);
        } else {
          resolve(state || null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear upload state
   */
  async clearUploadState(id: string = "current"): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOAD_STORE], "readwrite");
      const store = transaction.objectStore(UPLOAD_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save download state
   */
  async saveDownloadState(state: DownloadStateDB): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOWNLOAD_STORE], "readwrite");
      const store = transaction.objectStore(DOWNLOAD_STORE);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load download state
   */
  async loadDownloadState(id: string): Promise<DownloadStateDB | null> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOWNLOAD_STORE], "readonly");
      const store = transaction.objectStore(DOWNLOAD_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const state = request.result as DownloadStateDB | undefined;

        // Check if state has expired (1 day)
        if (state && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
          this.clearDownloadState(id);
          resolve(null);
        } else {
          resolve(state || null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear download state
   */
  async clearDownloadState(id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOWNLOAD_STORE], "readwrite");
      const store = transaction.objectStore(DOWNLOAD_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a chunk
   */
  async saveChunk(chunk: ChunkData): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readwrite");
      const store = transaction.objectStore(CHUNKS_STORE);
      const request = store.put(chunk);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load a chunk
   */
  async loadChunk(id: string): Promise<ChunkData | null> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readonly");
      const store = transaction.objectStore(CHUNKS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load all chunks for a collection
   */
  async loadChunksByCollection(collectionId: string): Promise<ChunkData[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readonly");
      const store = transaction.objectStore(CHUNKS_STORE);
      const index = store.index("collectionId");
      const request = index.getAll(collectionId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a chunk
   */
  async deleteChunk(id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readwrite");
      const store = transaction.objectStore(CHUNKS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all chunks for a collection
   */
  async deleteChunksByCollection(collectionId: string): Promise<void> {
    await this.ensureInit();
    const chunks = await this.loadChunksByCollection(collectionId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readwrite");
      const store = transaction.objectStore(CHUNKS_STORE);

      let completed = 0;
      let hasError = false;

      if (chunks.length === 0) {
        resolve();
        return;
      }

      chunks.forEach((chunk) => {
        const request = store.delete(chunk.id);

        request.onsuccess = () => {
          completed++;
          if (completed === chunks.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });
    });
  }

  /**
   * Clean up old chunks (older than 7 days)
   */
  async cleanupOldChunks(): Promise<void> {
    await this.ensureInit();
    const expirationTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], "readwrite");
      const store = transaction.objectStore(CHUNKS_STORE);
      const index = store.index("timestamp");
      const request = index.openCursor(IDBKeyRange.upperBound(expirationTime));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();
