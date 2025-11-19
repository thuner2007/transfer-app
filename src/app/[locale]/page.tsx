"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import FileSelector from "../../components/Homepage/FileSelector";
import { FileWithPath } from "../../lib/interfaces/FolderStructure.interface";
import FileManager from "../../components/Homepage/FileManager";
import SettingsPanel from "../../components/Homepage/SettingsPanel";
import SharePanel from "../../components/Homepage/SharePanel";
import VerifyEmailModal from "../../components/Homepage/VerifyEmailModal";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { UploadStateManager } from "../../lib/upload/uploadStateManager";
import ResumeUploadButton from "../../components/Homepage/Buttons/ResumeUploadButton";
import PauseButton from "../../components/Homepage/Buttons/PauseButton";
import UploadProgressBar from "../../components/Homepage/UploadProgressBar";
import UploadButton from "../../components/Homepage/Buttons/UploadButton";
import { uploadFiles } from "../../lib/upload/uploadHelpers";
import { generateQRCode } from "../../lib/formating/qrCodeGenerator";

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
    const updateQRCode = async () => {
      const qrDataURL = await generateQRCode(downloadLink);
      if (qrDataURL) {
        setQrCodeData(qrDataURL);
      }
    };

    if (downloadLink) {
      updateQRCode();
    }
  }, [downloadLink]);

  const handleUploadFiles = async (
    mail: string,
    resumeMode: boolean = false
  ) => {
    await uploadFiles({
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
    });
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

    // Call handleUploadFiles with resumeMode = true
    handleUploadFiles(mailToUse, true);
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
                uploadFiles={handleUploadFiles}
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
