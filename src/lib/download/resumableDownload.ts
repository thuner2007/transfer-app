/**
 * Manages resumable downloads with pause/resume support
 */

export interface DownloadState {
  collectionId: string;
  fileName: string;
  totalSize: number;
  downloadedSize: number;
  chunks: Uint8Array[];
  isPaused: boolean;
  timestamp: number;
}

const DOWNLOAD_STATE_KEY_PREFIX = "transfer_download_";

export class ResumableDownloadManager {
  private collectionId: string;
  private fileName: string;
  private downloadedChunks: Uint8Array[] = [];
  private downloadedSize: number = 0;
  private totalSize: number = 0;
  private isPaused: boolean = false;
  private abortController: AbortController | null = null;

  constructor(collectionId: string, fileName: string) {
    this.collectionId = collectionId;
    this.fileName = fileName;
  }

  private getStateKey(): string {
    return `${DOWNLOAD_STATE_KEY_PREFIX}${this.collectionId}`;
  }

  /**
   * Start or resume download
   */
  async download(
    url: string,
    onProgress?: (downloaded: number, total: number) => void,
    onComplete?: (blob: Blob) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      this.isPaused = false;
      this.abortController = new AbortController();

      // Try to get the total file size first
      const headResponse = await fetch(url, {
        method: "HEAD",
      });

      if (headResponse.ok) {
        const contentLength = headResponse.headers.get("Content-Length");
        if (contentLength) {
          this.totalSize = parseInt(contentLength, 10);
        }
      }

      // Start downloading from where we left off
      const response = await fetch(url, {
        headers: {
          Range: `bytes=${this.downloadedSize}-`,
        },
        signal: this.abortController.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get content length from response if we don't have it
      if (this.totalSize === 0) {
        const contentLength = response.headers.get("Content-Length");
        if (contentLength) {
          this.totalSize = parseInt(contentLength, 10) + this.downloadedSize;
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done || this.isPaused) {
          break;
        }

        if (value) {
          this.downloadedChunks.push(value);
          this.downloadedSize += value.length;

          if (onProgress) {
            onProgress(this.downloadedSize, this.totalSize);
          }

          // Save state periodically (every 5MB)
          if (this.downloadedSize % (5 * 1024 * 1024) < value.length) {
            this.saveState();
          }
        }
      }

      if (!this.isPaused && this.downloadedSize >= this.totalSize) {
        // Download complete
        const blob = new Blob(this.downloadedChunks as BlobPart[]);
        if (onComplete) {
          onComplete(blob);
        }
        this.clearState();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Download paused");
      } else {
        console.error("Download error:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    }
  }

  /**
   * Pause the download
   */
  pause(): void {
    this.isPaused = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.saveState();
  }

  /**
   * Resume the download
   */
  resume(
    url: string,
    onProgress?: (downloaded: number, total: number) => void,
    onComplete?: (blob: Blob) => void,
    onError?: (error: Error) => void
  ): void {
    this.download(url, onProgress, onComplete, onError);
  }

  /**
   * Cancel the download and clear state
   */
  cancel(): void {
    this.isPaused = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.clearState();
    this.downloadedChunks = [];
    this.downloadedSize = 0;
  }

  /**
   * Save download state to localStorage
   */
  private saveState(): void {
    try {
      const state: DownloadState = {
        collectionId: this.collectionId,
        fileName: this.fileName,
        totalSize: this.totalSize,
        downloadedSize: this.downloadedSize,
        chunks: this.downloadedChunks,
        isPaused: this.isPaused,
        timestamp: Date.now(),
      };
      // Note: This will only work for smaller files due to localStorage size limits
      // For larger files, consider using IndexedDB instead
      localStorage.setItem(this.getStateKey(), JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save download state:", error);
    }
  }

  /**
   * Load download state from localStorage
   */
  loadState(): boolean {
    try {
      const stateJson = localStorage.getItem(this.getStateKey());
      if (!stateJson) return false;

      const state: DownloadState = JSON.parse(stateJson);

      // Check if state is not too old (1 day)
      if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        this.clearState();
        return false;
      }

      this.totalSize = state.totalSize;
      this.downloadedSize = state.downloadedSize;
      this.downloadedChunks = state.chunks.map(
        (chunk) => new Uint8Array(chunk)
      );
      this.isPaused = state.isPaused;

      return true;
    } catch (error) {
      console.error("Failed to load download state:", error);
      return false;
    }
  }

  /**
   * Clear download state from localStorage
   */
  private clearState(): void {
    try {
      localStorage.removeItem(this.getStateKey());
    } catch (error) {
      console.error("Failed to clear download state:", error);
    }
  }

  /**
   * Get download progress percentage
   */
  getProgress(): number {
    if (this.totalSize === 0) return 0;
    return (this.downloadedSize / this.totalSize) * 100;
  }

  /**
   * Check if download is paused
   */
  isPausedStatus(): boolean {
    return this.isPaused;
  }

  /**
   * Get downloaded size
   */
  getDownloadedSize(): number {
    return this.downloadedSize;
  }

  /**
   * Get total size
   */
  getTotalSize(): number {
    return this.totalSize;
  }
}
