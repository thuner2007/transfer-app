"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import axios from "axios";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [markedFiles, setMarkedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadLink, setDownloadLink] = useState<string>(
    "https://cwx-dev.com"
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  const [expirationTime, setExpirationTime] = useState<number>(3);
  const [emailNotification, setEmailNotification] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

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

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => {
        const newFiles = Array.from(files);
        const dataTransfer = new DataTransfer();

        // Add existing files first
        if (prevFiles && prevFiles.length > 0) {
          Array.from(prevFiles).forEach((f) => dataTransfer.items.add(f));
        }

        // Process each new file
        newFiles.forEach((f) => {
          let newName = f.name;
          let counter = 1;

          // Get the base name and extension for proper numbering
          const fileExtension = f.name.includes(".")
            ? f.name.split(".").pop()
            : "";
          const nameWithoutExt = fileExtension
            ? f.name.replace(`.${fileExtension}`, "")
            : f.name;

          // Keep incrementing until we find a unique name
          while (
            Array.from(dataTransfer.files).some((file) => file.name === newName)
          ) {
            if (fileExtension) {
              newName = `${nameWithoutExt} (${counter}).${fileExtension}`;
            } else {
              newName = `${nameWithoutExt} (${counter})`;
            }
            counter++;
          }

          const newFile = new File([f], newName, { type: f.type });
          dataTransfer.items.add(newFile);
        });

        return dataTransfer.files;
      });

      console.log("Selected files:", files);
      Array.from(files).forEach((file) => {
        console.log(
          `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`
        );
      });
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    else if (size < 1024 * 1024)
      return `${(size / 1024).toFixed(2).replace(/\.00$/, "")} KB`;
    else if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(2).replace(/\.00$/, "")} MB`;
    else
      return `${(size / (1024 * 1024 * 1024))
        .toFixed(2)
        .replace(/\.00$/, "")} GB`;
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.type.toLowerCase();

    // Image files
    if (
      mimeType.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)
    ) {
      return (
        <svg
          className="w-8 h-8 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Video files
    if (
      mimeType.startsWith("video/") ||
      ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(extension)
    ) {
      return (
        <svg
          className="w-8 h-8 text-red-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    }

    // Audio files
    if (
      mimeType.startsWith("audio/") ||
      ["mp3", "wav", "flac", "aac", "ogg", "wma"].includes(extension)
    ) {
      return (
        <svg
          className="w-8 h-8 text-purple-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      );
    }

    // PDF files
    if (mimeType === "application/pdf" || extension === "pdf") {
      return (
        <svg
          className="w-8 h-8 text-red-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Archive files
    if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
      return (
        <svg
          className="w-8 h-8 text-yellow-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Document files
    if (
      ["doc", "docx", "txt", "rtf", "odt"].includes(extension) ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    ) {
      return (
        <svg
          className="w-8 h-8 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Spreadsheet files
    if (
      ["xls", "xlsx", "csv", "ods"].includes(extension) ||
      mimeType.includes("spreadsheet")
    ) {
      return (
        <svg
          className="w-8 h-8 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Code files
    if (
      [
        "js",
        "ts",
        "jsx",
        "tsx",
        "html",
        "css",
        "scss",
        "py",
        "java",
        "cpp",
        "c",
        "php",
        "rb",
        "go",
        "rs",
      ].includes(extension)
    ) {
      return (
        <svg
          className="w-8 h-8 text-indigo-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    // Default file icon
    return (
      <svg
        className="w-8 h-8 text-gray-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleClick = () => {
    // Reset the input value before opening file dialog to allow same file selection
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleRenameFile = (file: File) => {
    const newName = prompt("Enter new file name", file.name);
    if (newName && selectedFiles) {
      const updatedFiles = Array.from(selectedFiles).map((f) =>
        f === file ? new File([f], newName, { type: f.type }) : f
      );
      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((f) => dataTransfer.items.add(f));
      setSelectedFiles(dataTransfer.files);
    }
  };

  const handleDeleteFile = (file: File) => {
    if (selectedFiles) {
      const updatedFiles = Array.from(selectedFiles).filter((f) => f !== file);
      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((f) => dataTransfer.items.add(f));
      setSelectedFiles(dataTransfer.files);
      console.log("Leftover files:", dataTransfer.files);
    }
  };

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api";
  console.log("Backend URL:", backendUrl);

  const uploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      console.error("No files selected for upload");
      return;
    }

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    try {
      setIsUploading(true);
      const response = await axios.post(`${backendUrl}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDownloadLink(response.data.downloadUrl);
      setUploadProgress(100);
      console.log("Upload successful:", response.data);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-start justify-center w-screen h-screen">
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
              />
            </div>
            <div
              className={`bg-white rounded-md w-full h-64 text-center flex items-center justify-center flex-col cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-blue-500 bg-blue-50 scale-105"
                  : "border-gray-400 hover:border-gray-600 hover:bg-gray-50"
              }`}
              style={{
                border: `3px dashed ${isDragging ? "#3b82f6" : "#9ca3af"}`,
                borderRadius: "6px",
              }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <h2
                  className={`text-2xl font-bold ${
                    isDragging ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {isDragging ? "Drop files here!" : "Select files"}
                </h2>
                <p className="text-gray-500 text-sm">or drag & drop</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              onFocus={(e) => {
                // Reset value when input gets focus to allow same file selection
                e.target.value = "";
              }}
              className="hidden"
              accept="*/*"
            />
            {selectedFiles && Array.from(selectedFiles).length > 0 && (
              <div className="w-full border border-gray-400 px-4 rounded-md">
                {Array.from(selectedFiles).map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <div className="flex flex-col">
                        <span className="text-gray-700">{file.name}</span>
                        <span className="text-gray-400 text-xs">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className="text-gray-500 text-sm"
                        onClick={() => {
                          handleRenameFile(file);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          <path
                            fillRule="evenodd"
                            d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                      <span
                        className="text-gray-500 text-sm"
                        onClick={() => {
                          handleDeleteFile(file);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h1v10a2 2 0 002 2h6a2 2 0 002-2V6h1a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 6a1 1 0 012 0v8a1 1 0 11-2 0V6zm5-1a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-1/2 h-full flex items-center justify-start gap-6 flex-col p-4">
            <div className="w-full flex items-center justify-between flex-col gap-1">
              <h4 className="text-xl w-full text-gray-700">Send to</h4>
              <input
                className="border border-gray-400 p-2 rounded-md w-full"
                placeholder="Enter an email"
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
                  type="checkbox"
                  className="mr-2 w-5 h-5 rounded-md appearance-none border border-gray-400 checked:bg-blue-500 checked:border-blue-500 relative checked:after:content-['✕'] checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:absolute checked:after:top-0 checked:after:left-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:w-full checked:after:h-full"
                />
                <input
                  type="password"
                  className="flex-1 outline-none"
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
            <button
              disabled={
                isUploading ||
                !selectedFiles ||
                selectedFiles.length === 0 ||
                downloadLink !== "https://cwx-dev.com"
              }
              onClick={() => uploadFiles()}
              className={`text-white font-bold text-xl w-full p-3 rounded-md transition-all duration-200 ${
                isUploading ||
                !selectedFiles ||
                selectedFiles.length === 0 ||
                downloadLink !== "https://cwx-dev.com"
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
              }`}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
