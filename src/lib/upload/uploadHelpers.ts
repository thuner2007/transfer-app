import axios from "axios";
import { BACKEND_URL } from "../api/constants";
import { FileWithPath } from "../interfaces/FolderStructure.interface";
import { UploadStateManager } from "./uploadStateManager";
import { sanitizeFilePath } from "../formating/sanitizeFilePath";
import { sanitizeFilename } from "../formating/sanitizeFilename";

export interface UploadFileInChunksParams {
  fileWithPath: FileWithPath;
  mail: string;
  collectionId?: string;
  setDownloadUrlCallback?: (url: string) => void;
  onChunkProgress?: (chunkSize: number) => void;
  fileId?: string;
  expirationTime: number;
  emailNotification: boolean;
  passwordRequired: boolean;
  passwordInput: string;
  uploadAbortController: React.MutableRefObject<AbortController | null>;
}

export const uploadFileInChunks = async ({
  fileWithPath,
  mail,
  collectionId,
  setDownloadUrlCallback,
  onChunkProgress,
  fileId,
  expirationTime,
  emailNotification,
  passwordRequired,
  passwordInput,
  uploadAbortController,
}: UploadFileInChunksParams): Promise<string> => {
  const CHUNK_SIZE = 30 * 1024 * 1024; // 30MB chunks
  const file = fileWithPath.file;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const generatedFileId =
    fileId || `${Date.now()}-${Math.random().toString(36).substring(2)}`;

  console.log(`Upload starting for ${file.name}:`, {
    generatedFileId,
    providedFileId: fileId,
    totalChunks,
  });

  // Edit the filename and path
  const sanitizedPath = sanitizeFilePath(fileWithPath.path);
  const sanitizedFileName = sanitizeFilename(file.name);

  console.log(
    `Uploading ${
      file.name
    } (sanitized: ${sanitizedFileName}) in ${totalChunks} chunks of ${
      CHUNK_SIZE / 1024 / 1024
    }MB each`
  );

  if (fileWithPath.path !== sanitizedPath) {
    console.log(`Path sanitized: "${fileWithPath.path}" -> "${sanitizedPath}"`);
  }

  let currentCollectionId = collectionId;

  // When resuming, sync with backend to get actual uploaded chunks
  if (fileId && collectionId) {
    try {
      const response = await axios.get(`${BACKEND_URL}/file/chunk-status`, {
        params: { collectionId, fileId: generatedFileId },
      });
      if (response.data.uploadedChunks) {
        // Update local state with actual server-side chunks
        const serverChunks = response.data.uploadedChunks as number[];

        // Clear local state and resync with server
        const state = await UploadStateManager.loadState();
        if (state) {
          const fileIndex = state.files.findIndex(
            (f) => f.fileId === generatedFileId
          );
          if (fileIndex !== -1) {
            const oldUploadedSize = state.files[fileIndex].uploadedSize;

            // Update chunks array
            state.files[fileIndex].uploadedChunks = serverChunks;

            // Recalculate uploadedSize based on actual chunks
            const fileSize = state.files[fileIndex].fileSize;
            const chunkSize = CHUNK_SIZE;
            let newUploadedSize = 0;

            for (const chunkNum of serverChunks) {
              const isLastChunk =
                chunkNum === state.files[fileIndex].totalChunks - 1;
              const thisChunkSize = isLastChunk
                ? fileSize - chunkNum * chunkSize
                : chunkSize;
              newUploadedSize += thisChunkSize;
            }

            state.files[fileIndex].uploadedSize = newUploadedSize;

            // Update total uploadedSize
            state.uploadedSize =
              state.uploadedSize - oldUploadedSize + newUploadedSize;

            await UploadStateManager.saveState(state);
          }
        }
      }
    } catch (error) {
      console.warn(
        "Could not sync with backend, continuing with local state:",
        error
      );
    }
  }

  // Check if this chunk has already been uploaded (for resume functionality)
  const isChunkAlreadyUploaded = async (
    chunkNumber: number
  ): Promise<boolean> => {
    const result = await UploadStateManager.isChunkUploaded(
      generatedFileId,
      chunkNumber
    );
    if (result) {
      console.log(
        `Chunk ${chunkNumber} already uploaded for fileId: ${generatedFileId}`
      );
    }
    return result;
  };

  for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
    // Check if upload is paused
    const state = await UploadStateManager.loadState();
    if (state?.isPaused) {
      throw new Error("Upload paused");
    }

    // Check if we should abort
    if (uploadAbortController.current?.signal.aborted) {
      throw new Error("Upload aborted");
    }

    // Skip if chunk already uploaded
    if (await isChunkAlreadyUploaded(chunkNumber)) {
      // Don't update progress for skipped chunks - they were already counted
      continue;
    }

    const start = chunkNumber * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append("isChunked", "true");
    formData.append("fileId", generatedFileId);
    formData.append("chunkNumber", chunkNumber.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("originalFileName", sanitizedPath);
    formData.append("totalSize", file.size.toString());
    formData.append("mimeType", file.type);
    formData.append("chunk", chunkBlob);
    formData.append("creator", mail);
    if (emailNotification) {
      formData.append("wantsToGetNotified", "true");
    }

    // Always include settings with first chunk of first file, or for existing collection
    if (!currentCollectionId || chunkNumber === 0) {
      formData.append(
        "expirationTime",
        new Date(
          Date.now() + expirationTime * 24 * 60 * 60 * 1000
        ).toISOString()
      );
      if (passwordRequired && passwordInput) {
        formData.append("password", passwordInput);
      }
    }

    if (currentCollectionId) {
      formData.append("collectionId", currentCollectionId);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        signal: uploadAbortController.current?.signal,
      });

      if (response.data.collectionId && !currentCollectionId) {
        currentCollectionId = response.data.collectionId;
        if (currentCollectionId) {
          await UploadStateManager.setCollectionId(currentCollectionId);
        }
      }

      // Mark chunk as uploaded
      const chunkSize = Math.min(
        CHUNK_SIZE,
        file.size - chunkNumber * CHUNK_SIZE
      );
      await UploadStateManager.markChunkUploaded(
        generatedFileId,
        chunkNumber,
        chunkSize
      );

      if (response.data.fileComplete) {
        // Set download URL if this is the first file and we have a callback
        if (response.data.downloadUrl && setDownloadUrlCallback) {
          setDownloadUrlCallback(response.data.downloadUrl);
        }
        return currentCollectionId || response.data.collectionId;
      }

      console.log(
        `Chunk ${chunkNumber + 1}/${totalChunks} uploaded for ${file.name}`
      );

      // Update progress after each chunk
      if (onChunkProgress) {
        onChunkProgress(chunkSize);
      }
    } catch (error) {
      // Check if it's an abort/pause
      if (
        axios.isAxiosError(error) &&
        (error as { code?: string }).code === "ERR_CANCELED"
      ) {
        console.log("Upload cancelled");
        throw new Error("Upload cancelled");
      }

      console.error(
        `Error uploading chunk ${chunkNumber + 1}/${totalChunks} for ${
          file.name
        }:`,
        error
      );

      // Log full error response
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
        console.error("Error response data:", axiosError.response?.data);
        console.error("Error response status:", axiosError.response?.status);
      }

      throw new Error(
        `Failed to upload chunk ${chunkNumber + 1}: ${(error as Error).message}`
      );
    }
  }

  return currentCollectionId || "";
};

export interface UploadFilesParams {
  filesWithPaths: FileWithPath[];
  mail: string;
  resumeMode: boolean;
  mailVerified: boolean;
  expirationTime: number;
  emailNotification: boolean;
  passwordRequired: boolean;
  passwordInput: string;
  uploadAbortController: React.MutableRefObject<AbortController | null>;
  setIsUploading: (isUploading: boolean) => void;
  setUploadError: (error: string) => void;
  setUploadProgress: (progress: number) => void;
  setCurrentFileName: (fileName: string) => void;
  setDownloadLink: (link: string) => void;
  setFilesWithPaths: (files: FileWithPath[]) => void;
  setHasPendingUpload: (hasPending: boolean) => void;
  setVerifyModalOpen: (open: boolean) => void;
  setMailVerified: (verified: boolean) => void;
}

export const uploadFiles = async ({
  filesWithPaths,
  mail,
  resumeMode,
  mailVerified,
  expirationTime,
  emailNotification,
  passwordRequired,
  passwordInput,
  uploadAbortController,
  setIsUploading,
  setUploadError,
  setUploadProgress,
  setCurrentFileName,
  setDownloadLink,
  setFilesWithPaths,
  setHasPendingUpload,
  setVerifyModalOpen,
  setMailVerified,
}: UploadFilesParams) => {
  if (!resumeMode && (!filesWithPaths || filesWithPaths.length === 0)) {
    return;
  }

  if (!mailVerified) {
    const response = await axios.post(`${BACKEND_URL}/mail/send`, {
      email: mail,
    });
    if (response.data.error) {
      return;
    }
    if (response.data.verifyStatus === "pending") {
      setVerifyModalOpen(true);
      return;
    } else if (response.data.verifyStatus === "verified") {
      setMailVerified(true);
    }
  }

  try {
    setIsUploading(true);
    uploadAbortController.current = new AbortController();
    setUploadError("");

    let collectionId: string | undefined;
    const filesToUpload: FileWithPath[] = filesWithPaths;
    let startFileIndex = 0;

    // Check if we're resuming
    const existingState = await UploadStateManager.loadState();
    if (resumeMode && existingState) {
      collectionId = existingState.collectionId;
      startFileIndex = existingState.currentFileIndex;
      const currentProgress = await UploadStateManager.getProgress();
      setUploadProgress(currentProgress);

      // Use the existing state for tracking
      if (existingState.collectionId) {
        const downloadUrl =
          process.env.NEXT_PUBLIC_DOWNLOAD_SERVICE_URL +
          "/d/" +
          existingState.collectionId;
        setDownloadLink(downloadUrl);
      }
    } else if (!existingState || !resumeMode) {
      // Initialize new upload state ONLY if not resuming
      const totalSize = filesWithPaths.reduce(
        (acc: number, f: FileWithPath) => acc + f.file.size,
        0
      );

      const uploadState = {
        collectionId: undefined,
        files: filesWithPaths.map((f: FileWithPath) => ({
          fileId: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
          fileName: f.file.name,
          filePath: f.path,
          fileSize: f.file.size,
          mimeType: f.file.type,
          uploadedChunks: [],
          totalChunks: Math.ceil(f.file.size / (10 * 1024 * 1024)),
          uploadedSize: 0,
          isPaused: false,
          timestamp: Date.now(),
          mail: mail,
          settings: {
            expirationTime: expirationTime,
            password: passwordRequired ? passwordInput : undefined,
            emailNotification: emailNotification,
          },
        })),
        currentFileIndex: 0,
        totalSize: totalSize,
        uploadedSize: 0,
        isPaused: false,
        timestamp: Date.now(),
      };

      await UploadStateManager.saveState(uploadState);
      setUploadProgress(0);
    }

    let completedFiles = startFileIndex;

    // Calculate total size for accurate progress
    const totalSize = filesToUpload.reduce(
      (acc: number, f: FileWithPath) => acc + f.file.size,
      0
    );
    let uploadedSize = existingState?.uploadedSize || 0;

    for (let i = startFileIndex; i < filesToUpload.length; i++) {
      const fileWithPath = filesToUpload[i];
      const state = await UploadStateManager.loadState();
      const fileState = state?.files[i];

      try {
        setCurrentFileName(fileWithPath.file.name);

        const result = await uploadFileInChunks({
          fileWithPath,
          mail,
          collectionId,
          setDownloadUrlCallback:
            completedFiles === 0 ? setDownloadLink : undefined,
          onChunkProgress: (chunkSize: number) => {
            uploadedSize += chunkSize;
            const overallProgress = (uploadedSize / totalSize) * 100;
            setUploadProgress(overallProgress);
          },
          fileId: fileState?.fileId,
          expirationTime,
          emailNotification,
          passwordRequired,
          passwordInput,
          uploadAbortController,
        });

        if (!collectionId) {
          collectionId = result;
        }

        completedFiles++;
        await UploadStateManager.moveToNextFile();
      } catch (fileError) {
        const errorMsg = (fileError as Error).message;
        if (errorMsg === "Upload paused" || errorMsg === "Upload cancelled") {
          return; // Exit without clearing state
        }

        throw new Error(
          `Failed to upload ${fileWithPath.file.name}: ${errorMsg}`
        );
      }
    }

    setUploadProgress(100);
    setCurrentFileName("");

    // Clear upload state after successful completion
    await UploadStateManager.clearState();
    setHasPendingUpload(false);
  } catch (error) {
    const errorMsg = (error as Error).message;
    if (errorMsg !== "Upload paused" && errorMsg !== "Upload cancelled") {
      setUploadError("Upload failed: " + errorMsg);
    }
  } finally {
    const state = await UploadStateManager.loadState();
    if (!state?.isPaused) {
      setIsUploading(false);
      setFilesWithPaths([]);
      setCurrentFileName("");
    }
  }
};
