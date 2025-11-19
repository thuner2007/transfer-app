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
import ResumeUploadButton from "../../components/Homepage/Buttons/ResumeUploadButton";
import PauseButton from "../../components/Homepage/Buttons/PauseButton";
import UploadProgressBar from "../../components/Homepage/UploadProgressBar";
import UploadButton from "../../components/Homepage/Buttons/UploadButton";
import { sanitizeFilePath } from "../../lib/formating/sanitizeFilePath";
import { sanitizeFilename } from "../../lib/formating/sanitizeFilename";

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

  // Initialize IndexedDB and check for pending uploads
  useEffect(() => {
    const initAndCheckPending = async () => {
      await UploadStateManager.init();
      const pendingState = await UploadStateManager.loadState();
      const hasPending = await UploadStateManager.hasPendingUploads();

      if (pendingState && hasPending) {
        const progress = await UploadStateManager.getProgress();
        setHasPendingUpload(true);
        setPendingProgress(progress);

        // Restore email from first file's state
        if (pendingState.files.length > 0 && pendingState.files[0].mail) {
          setUserMail(pendingState.files[0].mail);
          setMailVerified(true); // Email was already verified when upload started
        }

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
    await UploadStateManager.resumeUpload();
    setHasPendingUpload(false);

    // Get mail from saved state if userMail is empty
    const state = await UploadStateManager.loadState();
    const mailToUse = userMail || state?.files[0]?.mail || "";

    if (!mailToUse) {
      setUploadError("Email not found. Please start a new upload.");
      return;
    }

    // Call uploadFiles with resumeMode = true
    uploadFiles(mailToUse, true);
  };

  return (
    <div className="flex items-start justify-center w-screen min-h-screen pt-8 md:pt-26 px-4 md:px-0">
      <div className="px-4 md:px-8 py-4 flex items-center justify-center w-full md:w-4/5 max-w-6xl min-h-4/5 bg-white rounded-2xl flex-col">
        <div className="p-2 md:p-4 w-full min-h-16 md:h-20 flex items-start justify-between gap-2">
          <h1
            className="text-2xl md:text-4xl font-bold text-start mb-2 md:mb-4 cursor-pointer"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t("title")}
          </h1>
          <LanguageSwitcher currentLocale={locale} />
        </div>

        <div className="w-full h-full flex flex-col md:flex-row items-start justify-center">
          <div className="w-full md:w-1/2 h-full flex items-center justify-start gap-4 md:gap-6 flex-col p-2 md:p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-lg md:text-xl w-full text-gray-700">
                {t("yourEmail")}
              </h4>
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
              t={t}
            />

            <FileManager
              setFilesWithPathsExt={setFilesWithPaths}
              selectedFiles={selectedFiles}
              onFilesSelected={setSelectedFiles}
              t={t}
            />
          </div>
          <div className="w-full md:w-1/2 h-full flex items-center justify-start gap-4 md:gap-6 flex-col p-2 md:p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-lg md:text-xl w-full text-gray-700">
                {t("sendTo")}
              </h4>
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
              <UploadProgressBar
                currentFileName={currentFileName}
                uploadProgress={uploadProgress}
                t={t}
              />
            )}

            {/* Resume upload button - shown when there's a pending upload */}
            {!isUploading && hasPendingUpload && (
              <ResumeUploadButton
                resumeUpload={resumeUpload}
                pendingProgress={pendingProgress}
                t={t}
                setHasPendingUpload={setHasPendingUpload}
                setPendingProgress={setPendingProgress}
              />
            )}

            <div className="w-full flex gap-2">
              <UploadButton
                isUploading={isUploading}
                filesWithPaths={filesWithPaths}
                downloadLink={downloadLink}
                userMail={userMail}
                uploadFiles={uploadFiles}
                t={t}
              />

              {/* Pause button - only shown during upload */}
              {isUploading && <PauseButton pauseUpload={pauseUpload} t={t} />}
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
