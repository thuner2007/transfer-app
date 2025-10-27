"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatFileSize } from "../../../lib/formating/formatFileSize";
import { handleDownloadFile } from "../../../lib/download/handleDownloadFile";
import { BACKEND_URL, ERROR_MESSAGES } from "../../../lib/api/constants";
import { getFileIcon } from "../../../lib/formating/getFileIcon";
import { CollectionData } from "../../../lib/interfaces/CollectionData.interface";
import { sendDownloadNotification } from "../../../lib/download/sendDownloadNotification";
import BreadcrumbNavigation from "../../../components/Homepage/BreadcrumbNavigation";
import { useNavigateToFolder } from "../../../hooks/useNavigateToFolder";
import { useGetCurrentFolderItems } from "../../../hooks/useGetCurrentFolderItems";

// Download-specific interfaces
interface DownloadFolderItem {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: DownloadFolderItem[];
  file?: {
    filename: string;
    size: number;
    mimetype: string;
  };
  parentPath: string;
}

interface DownloadPageProps {
  params: {
    collectionId: string;
  };
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { collectionId } = params;

  const [collectionData, setCollectionData] = React.useState<CollectionData>(
    {} as CollectionData
  );
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [hasSentDownloadNotification, setHasSentDownloadNotification] =
    useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Folder navigation state
  const { currentFolderPath, breadcrumbs, navigateToFolder } =
    useNavigateToFolder();
  const [folderStructure, setFolderStructure] = React.useState<
    DownloadFolderItem[]
  >([]);

  const getCurrentFolderItems = useGetCurrentFolderItems(
    folderStructure,
    currentFolderPath
  );

  // Helper function to build folder structure from file paths
  const buildFolderStructure = (
    files: { filename: string; size: number; mimetype: string }[]
  ): DownloadFolderItem[] => {
    const root: DownloadFolderItem[] = [];

    files.forEach((file) => {
      const pathParts = file.filename.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const folderParts = pathParts.slice(0, -1);

      let currentLevel = root;
      let currentPath = "";

      // Create folder structure
      folderParts.forEach((folderName: string, index: number) => {
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folder = currentLevel.find(
          (item) => item.name === folderName && item.type === "folder"
        );
        if (!folder) {
          folder = {
            id: `folder-${currentPath}`,
            name: folderName,
            type: "folder",
            children: [],
            parentPath: folderParts.slice(0, index).join("/"),
          };
          currentLevel.push(folder);
        }
        currentLevel = folder.children!;
      });

      // Add file to the appropriate folder
      const fileItem: DownloadFolderItem = {
        id: `file-${file.filename}`,
        name: fileName,
        type: "file",
        file: {
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
        },
        parentPath: folderParts.join("/"),
      };

      currentLevel.push(fileItem);
    });

    return root;
  };

  const downloadAll = async () => {
    if (isDownloading) return; // Prevent multiple simultaneous downloads

    try {
      setIsDownloading(true);
      console.log("Starting download for collection:", collectionId);

      const response = await axios.get(
        `${BACKEND_URL}/file/?collectionId=${collectionId}`,
        {
          responseType: "blob",
          timeout: 300000, // 5 minutes timeout for large files
        }
      );

      // Send download notification
      if (!hasSentDownloadNotification) {
        sendDownloadNotification(collectionId);
        setHasSentDownloadNotification(true);
      }

      // Create a link to download the ZIP file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${collectionId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Download completed successfully");
    } catch (error) {
      console.error(ERROR_MESSAGES.DOWNLOAD_ALL_FAILED, error);
      // Show user-friendly error message for large file downloads
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        alert(
          "Download timeout - the file might be too large. Please try again or contact support."
        );
      } else {
        alert("Download failed. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  async function fetchDownloadInfo() {
    // Get download information from backend
    try {
      const response = await axios.get(
        `${BACKEND_URL}/file/info?collectionId=${collectionId}`
      );
      console.log("Download info:", response.data);
      setCollectionData(response.data);

      // Build folder structure from files
      if (response.data.files && response.data.files.length > 0) {
        const structure = buildFolderStructure(response.data.files);
        setFolderStructure(structure);
      }
    } catch (err) {
      console.error(ERROR_MESSAGES.FETCH_INFO_FAILED, err);
    }
  }

  const checkPassword = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/file/check-password?collectionId=${collectionId}`
      );
      console.log("Password check response:", response.data);
      if (response.data.hasPassword) {
        setOpenPasswordModal(true);
      } else {
        fetchDownloadInfo();
      }
    } catch (err) {
      console.error(ERROR_MESSAGES.PASSWORD_CHECK_FAILED, err);
    }
  };

  useEffect(() => {
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
                <g stroke-linecap="round" stroke-linejoin="round"></g>
                <g>
                  <g>
                    <path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path>{" "}
                  </g>
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
            disabled={isDownloading}
            className={
              isDownloading
                ? "text-white font-bold text-xl w-1/3 p-3 rounded-md transition-all duration-200 bg-gray-500 cursor-not-allowed"
                : "text-white font-bold text-xl w-1/3 p-3 rounded-md transition-all duration-200 bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
            }
          >
            {isDownloading ? (
              <div className="flex items-center justify-center gap-2">
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
                <span>Preparing Download...</span>
              </div>
            ) : (
              "Download All (ZIP)"
            )}
          </button>

          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation
            breadcrumbs={breadcrumbs}
            navigateToFolder={navigateToFolder}
          />

          {/* Folder Structure Display */}
          {folderStructure.length > 0 && (
            <div className="w-full border border-gray-400 px-4 rounded-md min-h-[200px]">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <h5 className="text-gray-700 font-medium">Files & Folders</h5>
              </div>

              <div className="py-2">
                {getCurrentFolderItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No files or folders
                  </p>
                ) : (
                  getCurrentFolderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {item.type === "folder" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-yellow-500 cursor-pointer"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            onClick={() => {
                              const newPath = currentFolderPath
                                ? `${currentFolderPath}/${item.name}`
                                : item.name;
                              navigateToFolder(newPath);
                            }}
                          >
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        ) : (
                          getFileIcon(item.file?.mimetype || "")
                        )}
                        <div className="flex flex-col">
                          <span
                            className={`text-gray-700 ${
                              item.type === "folder"
                                ? "cursor-pointer hover:text-blue-600"
                                : ""
                            }`}
                            onClick={() => {
                              if (item.type === "folder") {
                                const newPath = currentFolderPath
                                  ? `${currentFolderPath}/${item.name}`
                                  : item.name;
                                navigateToFolder(newPath);
                              }
                            }}
                          >
                            {item.name}
                          </span>
                          {item.type === "file" && item.file && (
                            <span className="text-gray-400 text-xs">
                              {formatFileSize(item.file.size)}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.type === "file" && item.file && (
                        <div className="flex items-center gap-1">
                          <span
                            className="text-gray-500 text-sm cursor-pointer"
                            onClick={() => {
                              handleDownloadFile(
                                item.file!.filename,
                                collectionId
                              );
                              if (!hasSentDownloadNotification) {
                                sendDownloadNotification(collectionId);
                                setHasSentDownloadNotification(true);
                              }
                            }}
                            title="Download file"
                          >
                            <svg
                              className="w-6 h-6 text-gray-400 hover:text-gray-600"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                              <g
                                id="SVGRepo_tracerCarrier"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></g>
                              <g id="SVGRepo_iconCarrier">
                                <path
                                  d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
                                  fill="currentColor"
                                />
                                <path
                                  d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
                                  fill="currentColor"
                                />
                              </g>
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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
                      `${BACKEND_URL}/file/check-password/password-validation`,
                      {
                        collectionId: collectionId,
                        password: passwordInput,
                      }
                    );
                    if (response.data.verified) {
                      setOpenPasswordModal(false);
                      fetchDownloadInfo();
                    } else {
                      setPasswordError(
                        response.data.error || ERROR_MESSAGES.PASSWORD_INCORRECT
                      );
                    }
                  } catch (err) {
                    console.error("Failed to verify password:", err);
                    if (axios.isAxiosError(err) && err.response?.data?.error) {
                      setPasswordError(err.response.data.error);
                    } else {
                      setPasswordError(ERROR_MESSAGES.PASSWORD_VERIFY_FAILED);
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
    </div>
  );
}
