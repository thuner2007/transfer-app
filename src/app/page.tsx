"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import axios from "axios";
import { BACKEND_URL, ERROR_MESSAGES } from "../lib/api/constants";
import FileSelector from "../components/Homepage/FileSelector";
import { FileWithPath } from "../lib/interfaces/FolderStructure.interface";
import FileManager from "../components/Homepage/FileManager";
import SettingsPanel from "../components/Homepage/SettingsPanel";
import SharePanel from "../components/Homepage/SharePanel";
import VerifyEmailModal from "../components/Homepage/VerifyEmailModal";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [downloadLink, setDownloadLink] = useState<string>(
    "https://cwx-dev.com"
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

  const handleLanguageChange = () => {};

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

    const formData = new FormData();
    formData.append("creator", mail);
    formData.append(
      "expirationTime",
      new Date(Date.now() + expirationTime * 24 * 60 * 60 * 1000).toISOString()
    );

    if (passwordRequired && passwordInput) {
      formData.append("password", passwordInput);
    }

    // Add files with their folder paths
    filesWithPaths.forEach((fileWithPath) => {
      // Create a new file with the folder path as the name
      const fileWithFolderName = new File(
        [fileWithPath.file],
        fileWithPath.path,
        {
          type: fileWithPath.file.type,
        }
      );
      formData.append("files", fileWithFolderName);
    });

    try {
      setIsUploading(true);
      const response = await axios.post(`${BACKEND_URL}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDownloadLink(response.data.downloadUrl);
      setUploadProgress(100);
    } catch (error) {
      setUploadError(
        ERROR_MESSAGES.UPLOAD_FAILED + ": " + (error as Error).message
      );
    } finally {
      setIsUploading(false);
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
            File Transfer
          </h1>
          <p
            className="text-gray-600 cursor-pointer"
            onClick={handleLanguageChange}
          >
            English
          </p>
        </div>

        <div className="w-full h-full flex items-start justify-center">
          <div className="w-1/2 h-full flex items-center justify-start gap-6 flex-col p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-xl w-full text-gray-700">Your email</h4>
              <input
                className="border border-gray-400 p-2 rounded-md w-full"
                placeholder="Enter an email"
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
            />
          </div>
          <div className="w-1/2 h-full flex items-center justify-start gap-6 flex-col p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-xl w-full text-gray-700">Send to</h4>
              <input
                className="border border-gray-400 p-2 rounded-md w-full"
                placeholder="Enter an email"
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
            <button
              disabled={
                isUploading ||
                !filesWithPaths ||
                filesWithPaths.length === 0 ||
                downloadLink !== "https://cwx-dev.com" ||
                !userMail.trim()
              }
              onClick={() => uploadFiles(userMail)}
              className={`text-white font-bold text-xl w-full p-3 rounded-md transition-all duration-200 ${
                isUploading ||
                !filesWithPaths ||
                filesWithPaths.length === 0 ||
                downloadLink !== "https://cwx-dev.com" ||
                !userMail.trim()
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
              }`}
            >
              {isUploading ? "Uploading..." : "Upload"}
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
