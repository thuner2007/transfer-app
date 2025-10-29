"use client";

import { useState, useEffect } from "react";
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
    onChunkProgress?: (chunkSize: number) => void
  ): Promise<string> => {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const file = fileWithPath.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

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

    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append("isChunked", "true");
      formData.append("fileId", fileId);
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
        });

        if (response.data.collectionId && !currentCollectionId) {
          currentCollectionId = response.data.collectionId;
        }

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
          const chunkSize = Math.min(
            CHUNK_SIZE,
            file.size - chunkNumber * CHUNK_SIZE
          );
          onChunkProgress(chunkSize);
        }
      } catch (error) {
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

  const uploadFiles = async (mail: string) => {
    if (!filesWithPaths || filesWithPaths.length === 0) {
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
      setUploadProgress(0);
      setUploadError("");

      let collectionId: string | undefined;

      const totalFiles = filesWithPaths.length;
      let completedFiles = 0;

      // Calculate total size for accurate progress
      const totalSize = filesWithPaths.reduce((acc, f) => acc + f.file.size, 0);
      let uploadedSize = 0;

      for (const fileWithPath of filesWithPaths) {
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
            }
          );

          if (!collectionId) {
            collectionId = result;
          }

          completedFiles++;

          console.log(
            `File ${completedFiles}/${totalFiles} completed: ${fileWithPath.file.name}`
          );
        } catch (fileError) {
          console.error(
            `Failed to upload file ${fileWithPath.file.name}:`,
            fileError
          );
          throw new Error(
            `Failed to upload ${fileWithPath.file.name}: ${
              (fileError as Error).message
            }`
          );
        }
      }

      setUploadProgress(100);
      console.log("All files uploaded successfully!");
      setCurrentFileName("");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        ERROR_MESSAGES.UPLOAD_FAILED + ": " + (error as Error).message
      );
    } finally {
      setIsUploading(false);
      setFilesWithPaths([]);
      setCurrentFileName("");
    }
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

            <button
              disabled={
                isUploading ||
                !filesWithPaths ||
                filesWithPaths.length === 0 ||
                downloadLink !== "https://transfer.cwx-dev.com/" ||
                !userMail.trim()
              }
              onClick={() => uploadFiles(userMail)}
              className={`text-white font-bold text-xl w-full p-3 rounded-md transition-all duration-200 ${
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
