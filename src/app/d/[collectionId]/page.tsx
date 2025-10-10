"use client";
import React, { useEffect } from "react";
import axios from "axios";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api";

interface DownloadPageProps {
  params: {
    collectionId: string;
  };
}

interface CollectionData {
  id: string;
  creator: string;
  fileCount: number;
  filesSize: number;
  files: {
    id: string;
    filename: string;
    mimetype: string;
    size: number;
  }[];
  hasPassword: boolean;
  createdAt: string;
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { collectionId } = params;

  const [collectionData, setCollectionData] = React.useState<CollectionData>(
    {} as CollectionData
  );
  const [openPasswordModal, setOpenPasswordModal] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");

  const getFileIcon = (mimeType: string) => {
    // Image files
    if (
      mimeType.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(mimeType)
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
      ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(mimeType)
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
      ["mp3", "wav", "flac", "aac", "ogg", "wma"].includes(mimeType)
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
    if (mimeType === "application/pdf" || mimeType === "pdf") {
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
    if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(mimeType)) {
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
      ["doc", "docx", "txt", "rtf", "odt"].includes(mimeType) ||
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
      ["xls", "xlsx", "csv", "ods"].includes(mimeType) ||
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
      ].includes(mimeType)
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

  const downloadAll = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/file/?collectionId=${collectionId}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${collectionId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Error downloading all files:", error);
    }
  };

  const handleDownloadFile = async (filename: string, collectionId: string) => {
    try {
      const response = await axios.get(
        `${backendUrl}/file/single?collectionId=${collectionId}&filename=${encodeURIComponent(
          filename
        )}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  async function fetchDownloadInfo() {
    // Get download information from backend
    try {
      const response = await axios.get(
        `${backendUrl}/file/info?collectionId=${collectionId}`,
        {}
      );
      console.log("Download info:", response.data);
      setCollectionData(response.data);
    } catch (err) {
      console.error("Failed to fetch download info:", err);
    }
  }

  const checkPassword = async () => {
    try {
      const response = await axios.post(
        `${backendUrl}/file/check-password?collectionId=${collectionId}`
      );
      console.log("Password check response:", response.data);
      if (response.data.hasPassword) {
        setOpenPasswordModal(true);
      } else {
        fetchDownloadInfo();
      }
    } catch (err) {
      console.error("Failed to check password requirement:", err);
    }
  };

  useEffect(() => {
    // Check if it has password
    checkPassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-start pt-32 justify-center w-screen h-screen">
      <div className="px-8 py-6 flex items-start justify-center w-2/3 max-w-6xl min-h-4/5 bg-white rounded-2xl">
        <div className="w-full h-full flex-col flex items-start justify-start gap-6">
          <div>
            <h1 className="text-3xl font-bold w-full">Download Files</h1>
            <div className="flex items-center justify-start gap-2 fill-gray-700 w-full">
              <svg
                className="w-5 h-5"
                version="1.1"
                id="Capa_1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 416.979 416.979"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <g>
                    {" "}
                    <path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path>{" "}
                  </g>{" "}
                </g>
              </svg>
              <p className="text-gray-700">{`${
                collectionData?.creator
              } uploaded ${collectionData?.fileCount} files at ${new Date(
                collectionData?.createdAt || ""
              ).toLocaleString()}`}</p>
            </div>
          </div>
          <button
            onClick={() => downloadAll()}
            className={
              "text-white font-bold text-xl w-1/3 p-3 rounded-md transition-all duration-200  bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
            }
          >
            Download All (ZIP)
          </button>
          {collectionData?.filesSize > 0 && (
            <div className="w-full border border-gray-400 px-4 rounded-md">
              {Array.from(collectionData.files).map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.mimetype)}
                    <div className="flex flex-col">
                      <span className="text-gray-700">{file.filename}</span>
                      <span className="text-gray-400 text-xs">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-gray-500 text-sm cursor-pointer"
                      onClick={() => {
                        handleDownloadFile(file.filename, collectionId);
                      }}
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          {" "}
                          <path
                            d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
                            fill="#1C274C"
                          ></path>{" "}
                          <path
                            d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
                            fill="#1C274C"
                          ></path>{" "}
                        </g>
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {openPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">
              This download is password protected!
            </h2>
            <p className="mb-4">
              Please enter the password to access the files.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="text"
                value={passwordInput}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                }}
              />
            </div>

            {passwordError && (
              <p className="text-red-500 mb-4">{passwordError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpenPasswordModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      `${backendUrl}/file/check-password/password-validation`,
                      {
                        collectionId: collectionId,
                        password: passwordInput,
                      }
                    );
                    console.log("Password verify response:", response.data);
                    if (response.data.verified) {
                      setOpenPasswordModal(false);
                      fetchDownloadInfo();
                    } else {
                      setPasswordError(
                        response.data.error ||
                          "Incorrect password. Please try again."
                      );
                    }
                  } catch (err) {
                    console.error("Failed to verify password:", err);
                    if (axios.isAxiosError(err) && err.response?.data?.error) {
                      setPasswordError(err.response.data.error);
                    } else {
                      setPasswordError(
                        "Error verifying password. Please try again."
                      );
                    }
                  }
                }}
                className={
                  "flex-1 font-bold py-2 px-4 rounded-md transition-colors bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                }
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
      {/** Email verification modal */}
    </div>
  );
}
