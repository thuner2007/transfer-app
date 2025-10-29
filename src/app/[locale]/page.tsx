"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BACKEND_URL, ERROR_MESSAGES } from "../../lib/api/constants";
import FileSelector from "../../components/Homepage/FileSelector";
import { FileWithPath } from "../../lib/interfaces/FolderStructure.interface";
import FileManager from "../../components/Homepage/FileManager";
import SettingsPanel from "../../components/Homepage/SettingsPanel";
import SharePanel from "../../components/Homepage/SharePanel";
import VerifyEmailModal from "../../components/Homepage/VerifyEmailModal";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import {
  UploadStateManager,
  type CollectionUploadState,
} from "../../lib/upload/uploadStateManager";

export default function Home() {
  const t = useTranslations("HomePage");
  const params = useParams();
  const locale = params.locale as string;

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [downloadLink, setDownloadLink] = useState<string>(
    "https://transfer.cwx-dev.com/"
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mailVerified, setMailVerified] = useState<boolean>(false);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [filesWithPaths, setFilesWithPaths] = useState<FileWithPath[]>([]);

  const [expirationTime, setExpirationTime] = useState<number>(3);
  const [emailNotification, setEmailNotification] = useState<boolean>(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [userMail, setUserMail] = useState<string>("");
  const [receiverMail, setReceiverMail] = useState<string>("");
  const [verificationError, setVerificationError] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordRequired, setPasswordRequired] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");

  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [hasPendingUpload, setHasPendingUpload] = useState<boolean>(false);
  const [pendingProgress, setPendingProgress] = useState<number>(0);
  const uploadAbortController = useRef<AbortController | null>(null);

  // Initialize IndexedDB and check for pending uploads on mount
  useEffect(() => {
    const initAndCheckPending = async () => {
      await UploadStateManager.init();
      const pendingState = await UploadStateManager.loadState();
      const hasPending = await UploadStateManager.hasPendingUploads();

      if (pendingState && hasPending) {
        const progress = await UploadStateManager.getProgress();
        setHasPendingUpload(true);
        setPendingProgress(progress);
        if (pendingState.collectionId) {
          const downloadUrl =
            process.env.NEXT_PUBLIC_DOWNLOAD_SERVICE_URL +
            "/d/" +
            pendingState.collectionId;
          setDownloadLink(downloadUrl);
        }
        console.log("Found pending uploads, progress:", progress);
      }
    };

    initAndCheckPending();
  }, []);

  // Edit filename to be good for MinIO storage
  const sanitizeFilename = (filename: string): string => {
    // Save the file extension
    const lastDotIndex = filename.lastIndexOf(".");
    const name =
      lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";

    // Replace problematic characters with safe alternatives
    const sanitizedName =
      name
        // Replace spaces with underscores
        .replace(/\s+/g, "_")
        // Replace special characters with underscores or remove them
        .replace(/[^\w\-_.]/g, "_")
        // Remove multiple consecutive underscores
        .replace(/_+/g, "_")
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, "") ||
      // Ensure it's not empty
      "file";

    // Edit extension (keep only alphanumeric and the dot)
    const sanitizedExtension = extension.replace(/[^\w.]/g, "");

    // Limit total filename length to 200 characters (Minio limit is 1024, but we keep it shorter to be safe)
    const maxLength = 200;
    const fullName = sanitizedName + sanitizedExtension;

    if (fullName.length > maxLength) {
      const extensionLength = sanitizedExtension.length;
      const nameLength = maxLength - extensionLength;
      return sanitizedName.substring(0, nameLength) + sanitizedExtension;
    }

    return fullName;
  };

  // Edit file path (for folders)
  const sanitizeFilePath = (filePath: string): string => {
    return filePath
      .split("/")
      .map((part) => (part.trim() ? sanitizeFilename(part) : ""))
      .filter((part) => part !== "")
      .join("/");
  };

  // Generate QR code when downloadLink changes
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataURL = await QRCode.toDataURL(downloadLink, {
          width: 120,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeData(qrDataURL);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    if (downloadLink) {
      generateQRCode();
    }
  }, [downloadLink]);

  const uploadFileInChunks = async (
    fileWithPath: FileWithPath,
    mail: string,
    collectionId?: string,
    setDownloadUrlCallback?: (url: string) => void,
    onChunkProgress?: (chunkSize: number) => void,
    fileId?: string
  ): Promise<string> => {
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
      console.log(
        `Path sanitized: "${fileWithPath.path}" -> "${sanitizedPath}"`
      );
    }

    let currentCollectionId = collectionId;

    // When resuming, sync with backend to get actual uploaded chunks
    if (fileId && collectionId) {
      console.log(`Syncing state with backend for fileId: ${generatedFileId}`);
      try {
        const response = await axios.get(`${BACKEND_URL}/file/chunk-status`, {
          params: { collectionId, fileId: generatedFileId },
        });
        if (response.data.uploadedChunks) {
          // Update local state with actual server-side chunks
          const serverChunks = response.data.uploadedChunks as number[];
          console.log(
            `Backend has ${serverChunks.length} chunks for this file`
          );

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
              console.log(
                `Synced local state with server: ${serverChunks.length} chunks, ${newUploadedSize} bytes uploaded`
              );
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
        console.log("Upload paused by user");
        throw new Error("Upload paused");
      }

      // Check if we should abort
      if (uploadAbortController.current?.signal.aborted) {
        console.log("Upload aborted");
        throw new Error("Upload aborted");
      }

      // Skip if chunk already uploaded
      if (await isChunkAlreadyUploaded(chunkNumber)) {
        console.log(
          `Chunk ${chunkNumber + 1}/${totalChunks} already uploaded for ${
            file.name
          }, skipping`
        );
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
          console.log(`File ${file.name} uploaded successfully`);
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

        // Log the full error response for debugging
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { data?: unknown; status?: number };
          };
          console.error("Error response data:", axiosError.response?.data);
          console.error("Error response status:", axiosError.response?.status);
        }

        throw new Error(
          `Failed to upload chunk ${chunkNumber + 1}: ${
            (error as Error).message
          }`
        );
      }
    }

    return currentCollectionId || "";
  };

  const uploadFiles = async (mail: string, resumeMode: boolean = false) => {
    if (!resumeMode && (!filesWithPaths || filesWithPaths.length === 0)) {
      console.error("No files selected for upload");
      return;
    }

    if (!mailVerified) {
      console.log("Data to verify:", { mail, verificationCode });
      const response = await axios.post(`${BACKEND_URL}/mail/send`, {
        email: mail,
      });
      if (response.data.error) {
        console.error("Error verifying email:", response.data.error);
        return;
      }
      if (response.data.verifyStatus === "pending") {
        console.log("Verification email sent. Please verify your email.");
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
        console.log("Resuming upload from previous state");
        collectionId = existingState.collectionId;
        startFileIndex = existingState.currentFileIndex;
        const currentProgress = await UploadStateManager.getProgress();
        setUploadProgress(currentProgress);

        // Use the existing state for tracking
        console.log(
          `Resuming from file ${startFileIndex + 1}/${
            existingState.files.length
          }`
        );

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

        const uploadState: CollectionUploadState = {
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

      const totalFiles = filesToUpload.length;
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

        console.log(`File ${i} upload info:`, {
          fileName: fileWithPath.file.name,
          stateFileId: fileState?.fileId,
          hasFileState: !!fileState,
          uploadedChunks: fileState?.uploadedChunks?.length || 0,
        });

        try {
          console.log(
            `Starting upload for file: ${fileWithPath.file.name} (${fileWithPath.file.size} bytes)`
          );

          setCurrentFileName(fileWithPath.file.name);

          const result = await uploadFileInChunks(
            fileWithPath,
            mail,
            collectionId,
            // Only set download link for the first file
            completedFiles === 0 ? setDownloadLink : undefined,
            // Progress callback for each chunk
            (chunkSize: number) => {
              uploadedSize += chunkSize;
              const overallProgress = (uploadedSize / totalSize) * 100;
              setUploadProgress(overallProgress);
            },
            fileState?.fileId
          );

          if (!collectionId) {
            collectionId = result;
          }

          completedFiles++;
          await UploadStateManager.moveToNextFile();

          console.log(
            `File ${completedFiles}/${totalFiles} completed: ${fileWithPath.file.name}`
          );
        } catch (fileError) {
          const errorMsg = (fileError as Error).message;
          if (errorMsg === "Upload paused" || errorMsg === "Upload cancelled") {
            console.log("Upload paused, saving state");
            return; // Exit without clearing state
          }

          console.error(
            `Failed to upload file ${fileWithPath.file.name}:`,
            fileError
          );
          throw new Error(
            `Failed to upload ${fileWithPath.file.name}: ${errorMsg}`
          );
        }
      }

      setUploadProgress(100);
      console.log("All files uploaded successfully!");
      setCurrentFileName("");

      // Clear upload state after successful completion
      await UploadStateManager.clearState();
      setHasPendingUpload(false);
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg !== "Upload paused" && errorMsg !== "Upload cancelled") {
        console.error("Upload error:", error);
        setUploadError(ERROR_MESSAGES.UPLOAD_FAILED + ": " + errorMsg);
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

  const pauseUpload = async () => {
    console.log("Pausing upload");
    setHasPendingUpload(true);

    // Get current progress before pausing
    const currentProgress = await UploadStateManager.getProgress();
    setPendingProgress(currentProgress);

    await UploadStateManager.pauseUpload();
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }
    setIsUploading(false);
  };

  const resumeUpload = async () => {
    console.log("Resuming upload");
    await UploadStateManager.resumeUpload();
    setHasPendingUpload(false);

    // Call uploadFiles with resumeMode = true
    uploadFiles(userMail, true);
  };

  return (
    <div className="flex items-start justify-center w-screen h-screen pt-26">
      <div className="px-8 py-4 flex items-center justify-center w-4/5 max-w-6xl min-h-4/5 bg-white rounded-2xl flex-col">
        <div className="p-4 w-full h-20 flex items-start justify-between">
          <h1
            className="text-4xl font-bold text-start mb-4 cursor-pointer"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t("title")}
          </h1>
          <LanguageSwitcher currentLocale={locale} />
        </div>

        <div className="w-full h-full flex items-start justify-center">
          <div className="w-1/2 h-full flex items-center justify-start gap-6 flex-col p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-xl w-full text-gray-700">{t("yourEmail")}</h4>
              <input
                className="border border-gray-400 p-2 rounded-md w-full"
                placeholder={t("enterEmail")}
                type="email"
                value={userMail}
                onChange={(e) => setUserMail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <FileSelector
              selectedFiles={selectedFiles}
              onFilesSelected={setSelectedFiles}
            />

            <FileManager
              setFilesWithPathsExt={setFilesWithPaths}
              selectedFiles={selectedFiles}
              onFilesSelected={setSelectedFiles}
            />
          </div>
          <div className="w-1/2 h-full flex items-center justify-start gap-6 flex-col p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-xl w-full text-gray-700">{t("sendTo")}</h4>
              <input
                className="border border-gray-400 p-2 rounded-md w-full"
                placeholder={t("enterEmail")}
                type="email"
                value={receiverMail}
                onChange={(e) => setReceiverMail(e.target.value)}
              />
            </div>

            <SharePanel
              downloadLink={downloadLink}
              uploadProgress={uploadProgress}
              qrCodeData={qrCodeData}
            />

            <SettingsPanel
              passwordRequired={passwordRequired}
              setPasswordRequired={setPasswordRequired}
              passwordInput={passwordInput}
              setPasswordInput={setPasswordInput}
              emailNotification={emailNotification}
              setEmailNotification={setEmailNotification}
              expirationTime={expirationTime}
              setExpirationTime={setExpirationTime}
            />

            {uploadError && (
              <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
                {uploadError}
              </div>
            )}

            {isUploading && (
              <div className="w-full space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="truncate max-w-[70%]">
                    {currentFileName || t("preparingUpload")}
                  </span>
                  <span className="font-semibold">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Resume upload button - shown when there's a pending upload */}
            {!isUploading && hasPendingUpload && (
              <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-md mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-semibold text-blue-900">
                        {t("pendingUpload")}
                      </p>
                    </div>
                    <p className="text-sm text-blue-700 mb-1">
                      {t("resumeUploadMessage")}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${pendingProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-blue-700">
                        {Math.round(pendingProgress)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={resumeUpload}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t("resume")}
                    </button>
                    <button
                      onClick={async () => {
                        await UploadStateManager.clearState();
                        setHasPendingUpload(false);
                        setPendingProgress(0);
                      }}
                      className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                      title={t("cancel")}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full flex gap-2">
              <button
                disabled={
                  isUploading ||
                  !filesWithPaths ||
                  filesWithPaths.length === 0 ||
                  downloadLink !== "https://transfer.cwx-dev.com/" ||
                  !userMail.trim()
                }
                onClick={() => uploadFiles(userMail, false)}
                className={`text-white font-bold text-xl flex-1 p-3 rounded-md transition-all duration-200 ${
                  isUploading ||
                  !filesWithPaths ||
                  filesWithPaths.length === 0 ||
                  downloadLink !== "https://transfer.cwx-dev.com/" ||
                  !userMail.trim()
                    ? "bg-gray-400 cursor-not-allowed opacity-60"
                    : "bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
                }`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("uploading")}
                  </span>
                ) : (
                  t("upload")
                )}
              </button>

              {/* Pause button - only shown during upload */}
              {isUploading && (
                <button
                  onClick={pauseUpload}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xl px-6 p-3 rounded-md transition-all duration-200 cursor-pointer hover:shadow-lg"
                  title={t("pause") || "Pause"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {verifyModalOpen && (
        <VerifyEmailModal
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          verificationError={verificationError}
          setVerificationError={setVerificationError}
          setMailVerified={setMailVerified}
          setVerifyModalOpen={setVerifyModalOpen}
          userMail={userMail}
        />
      )}
    </div>
  );
}
