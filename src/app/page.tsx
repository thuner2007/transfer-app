"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import axios from "axios";
import { BACKEND_URL, ERROR_MESSAGES } from "../lib/api/constants";
import FileSelector from "../components/Homepage/FileSelector";
import { FileWithPath } from "../lib/interfaces/FolderStructure.interface";
import FileManager from "../components/Homepage/FileManager";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
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

  const dropdownOptions = [
    { value: 1, label: "1 day" },
    { value: 3, label: "3 days" },
    { value: 5, label: "5 days" },
    { value: 7, label: "1 week" },
    { value: 14, label: "2 weeks" },
  ];

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

            {/* File Manager */}
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
            <div className="flex items-center justify-between w-full gap-2">
              <div className="w-5/6 flex flex-col items-center justify-center gap-2">
                <div className="text-gray-700  border border-gray-400 rounded-md w-full p-2">
                  <p
                    onClick={() => window.open(downloadLink, "_blank")?.focus()}
                    className={`underline ${
                      uploadProgress === 100
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-25"
                    }`}
                  >
                    {downloadLink}
                  </p>
                </div>
                <div className="flex items-center justify-center w-full gap-2 mt-2">
                  <button
                    disabled={uploadProgress !== 100}
                    onClick={() => {
                      navigator.clipboard.writeText(downloadLink);
                      // Optional: Show a toast notification here
                    }}
                    className={`flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors ${
                      uploadProgress === 100
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-25"
                    }`}
                  >
                    Copy
                  </button>
                  <button
                    disabled={uploadProgress !== 100}
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: "File Transfer Link",
                            text: "Check out this file transfer link",
                            url: downloadLink,
                          })
                          .catch((error) => {
                            console.error("Error sharing:", error);
                          });
                      } else {
                        // Fallback for browsers that don't support Web Share API
                        navigator.clipboard.writeText(downloadLink);
                      }
                    }}
                    className={`flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors ${
                      uploadProgress === 100
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-25"
                    }`}
                  >
                    Share
                  </button>
                </div>
              </div>

              <div className="border border-gray-400 rounded-md bg-white h-25 w-25 flex items-center justify-center p-1">
                {qrCodeData ? (
                  <Image
                    src={qrCodeData}
                    alt="QR Code for download link"
                    width={72}
                    height={72}
                    className={`w-full h-full object-contain ${
                      uploadProgress === 100
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded"></div>
                )}
              </div>
            </div>

            <div className="border border-gray-400 p-4 rounded-md w-full flex items-center justify-center flex-col gap-2">
              {/* Password input with checkbox */}
              <div className="flex items-center border border-gray-400 p-2 rounded-md w-full mt-2">
                <input
                  checked={passwordRequired}
                  onChange={() => {
                    setPasswordRequired(!passwordRequired);
                    if (passwordRequired) {
                      setPasswordInput("");
                    }
                  }}
                  type="checkbox"
                  className="mr-2 w-5 h-5 rounded-md appearance-none border border-gray-400 checked:bg-blue-500 checked:border-blue-500 relative checked:after:content-['✕'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:w-full checked:after:h-full"
                />
                <input
                  disabled={!passwordRequired}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  type="password"
                  className={`flex-1 outline-none p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    passwordRequired ? "bg-white" : "cursor-not-allowed"
                  }`}
                  placeholder="Password"
                />
              </div>

              {/* Expiration time */}
              <div className="flex items-center justify-between w-full mt-2 border border-gray-400 p-2 rounded-md">
                <span className="text-md text-gray-700">Expiration time:</span>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between px-2 py-1 text-md text-gray-700 bg-white min-w-[80px] text-left cursor-pointer"
                  >
                    {
                      dropdownOptions.find(
                        (opt) => opt.value === expirationTime
                      )?.label
                    }
                    <svg
                      className={`w-8 h-8 ml-2 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        stroke="#a1a1aa"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m6 8 4 4 4-4"
                      />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[100px]">
                      {dropdownOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setExpirationTime(option.value);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg transition-colors cursor-pointer ${
                            expirationTime === option.value
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expiration info */}
              <p className="w-full text-md text-gray-700">
                Link expires in {expirationTime} day(s)
              </p>

              {/* Email notification toggle */}
              <div className="flex items-center w-full mt-2">
                <button
                  onClick={() => setEmailNotification(!emailNotification)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotification ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotification ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-700">
                  Email me when files are downloaded
                </span>
              </div>
            </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
            <p className="mb-4">
              A verification email has been sent to your email address. Please
              enter the 6-digit verification code from your email below.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                onChange={(e) => {
                  // Only allow numbers and limit to 6 digits
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                }}
              />
            </div>

            <span className="text-sm text-gray-500 block mb-4">
              NOTE: Also check your spam folder!
            </span>

            {verificationError && (
              <p className="text-red-500 mb-4">{verificationError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  if (verificationCode.length !== 6) {
                    alert("Please enter a 6-digit verification code");
                    return;
                  }

                  try {
                    const response = await axios.post(
                      `${BACKEND_URL}/mail/verify`,
                      {
                        code: parseInt(verificationCode),
                        email: userMail,
                      }
                    );

                    if (response.data.verifyStatus === "success") {
                      setMailVerified(true);
                      setVerifyModalOpen(false);
                      console.log("Email verified successfully!");
                    } else {
                      setVerificationError(
                        ERROR_MESSAGES.INVALID_VERIFICATION_CODE
                      );
                    }
                  } catch (error) {
                    console.error("Error verifying code:", error);
                    setVerificationError(
                      ERROR_MESSAGES.ERROR_VERIFY_FAILED +
                        ": " +
                        (error as Error).message
                    );
                  }
                }}
                disabled={verificationCode.length !== 6}
                className={`flex-1 font-bold py-2 px-4 rounded-md transition-colors ${
                  verificationCode.length === 6
                    ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
