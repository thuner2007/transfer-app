/**
 * Manages upload state persistence across sessions
 * Uses IndexedDB for better storage capacity (fallback to localStorage)
 */

import {
  indexedDBManager,
  type UploadStateDB,
} from "../storage/indexedDBManager";

export interface UploadState {
  collectionId?: string;
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
}

export interface CollectionUploadState {
  collectionId?: string;
  files: UploadState[];
  currentFileIndex: number;
  totalSize: number;
  uploadedSize: number;
  isPaused: boolean;
  timestamp: number;
}

const UPLOAD_STATE_KEY = "transfer_upload_state";
const STATE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATE_ID = "current";

export class UploadStateManager {
  private static useIndexedDB = true;

  /**
   * Initialize the manager
   */
  static async init(): Promise<void> {
    try {
      await indexedDBManager.init();
      this.useIndexedDB = true;
    } catch (error) {
      console.warn("IndexedDB not available, using localStorage:", error);
      this.useIndexedDB = false;
    }
  }

  /**
   * Save upload state
   */
  static async saveState(state: CollectionUploadState): Promise<void> {
    try {
      if (this.useIndexedDB) {
        const dbState: UploadStateDB = {
          id: STATE_ID,
          ...state,
        };
        await indexedDBManager.saveUploadState(dbState);
      } else {
        // Fallback to localStorage
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      console.error("Failed to save upload state:", error);
      // Try localStorage as fallback
      try {
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    }
  }

  /**
   * Load upload state
   */
  static async loadState(): Promise<CollectionUploadState | null> {
    try {
      if (this.useIndexedDB) {
        const dbState = await indexedDBManager.loadUploadState(STATE_ID);
        if (!dbState) return null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...state } = dbState;
        return state as CollectionUploadState;
      } else {
        // Fallback to localStorage
        const stateJson = localStorage.getItem(UPLOAD_STATE_KEY);
        if (!stateJson) return null;

        const state: CollectionUploadState = JSON.parse(stateJson);

        // Check if state has expired
        if (Date.now() - state.timestamp > STATE_EXPIRATION_MS) {
          this.clearState();
          return null;
        }

        return state;
      }
    } catch (error) {
      console.error("Failed to load upload state:", error);
      return null;
    }
  }

  /**
   * Clear upload state
   */
  static async clearState(): Promise<void> {
    try {
      if (this.useIndexedDB) {
        await indexedDBManager.clearUploadState(STATE_ID);
      } else {
        localStorage.removeItem(UPLOAD_STATE_KEY);
      }
    } catch (error) {
      console.error("Failed to clear upload state:", error);
    }
  }

  /**
   * Update specific file state
   */
  static async updateFileState(
    fileId: string,
    updates: Partial<UploadState>
  ): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    const fileIndex = state.files.findIndex((f) => f.fileId === fileId);
    if (fileIndex === -1) return;

    state.files[fileIndex] = { ...state.files[fileIndex], ...updates };
    state.timestamp = Date.now();

    await this.saveState(state);
  }

  /**
   * Mark a chunk as uploaded
   */
  static async markChunkUploaded(
    fileId: string,
    chunkNumber: number,
    chunkSize: number
  ): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    const fileIndex = state.files.findIndex((f) => f.fileId === fileId);
    if (fileIndex === -1) return;

    const file = state.files[fileIndex];
    if (!file.uploadedChunks.includes(chunkNumber)) {
      file.uploadedChunks.push(chunkNumber);
      file.uploadedSize += chunkSize;
      state.uploadedSize += chunkSize;
    }

    state.timestamp = Date.now();
    await this.saveState(state);
  }

  /**
   * Check if a specific chunk has been uploaded
   */
  static async isChunkUploaded(
    fileId: string,
    chunkNumber: number
  ): Promise<boolean> {
    const state = await this.loadState();
    if (!state) return false;

    const file = state.files.find((f) => f.fileId === fileId);
    return file ? file.uploadedChunks.includes(chunkNumber) : false;
  }

  /**
   * Pause upload
   */
  static async pauseUpload(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    state.isPaused = true;
    state.timestamp = Date.now();
    await this.saveState(state);
  }

  /**
   * Resume upload
   */
  static async resumeUpload(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    state.isPaused = false;
    state.timestamp = Date.now();
    await this.saveState(state);
  }

  /**
   * Set collection ID
   */
  static async setCollectionId(collectionId: string): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    state.collectionId = collectionId;
    state.timestamp = Date.now();
    await this.saveState(state);
  }

  /**
   * Move to next file
   */
  static async moveToNextFile(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    state.currentFileIndex++;
    state.timestamp = Date.now();
    await this.saveState(state);
  }

  /**
   * Check if there are pending uploads
   */
  static async hasPendingUploads(): Promise<boolean> {
    const state = await this.loadState();
    if (!state) return false;

    return state.files.some(
      (file) => file.uploadedChunks.length < file.totalChunks
    );
  }

  /**
   * Get upload progress percentage
   */
  static async getProgress(): Promise<number> {
    const state = await this.loadState();
    if (!state || state.totalSize === 0) return 0;

    return (state.uploadedSize / state.totalSize) * 100;
  }

  /**
   * Get current file being uploaded
   */
  static async getCurrentFile(): Promise<UploadState | null> {
    const state = await this.loadState();
    if (!state) return null;

    return state.files[state.currentFileIndex] || null;
  }
}
