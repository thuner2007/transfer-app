"use client";
import React from "react";
import { formatFileSize } from "../../lib/formating/formatFileSize";
import { getFileIcon } from "../../lib/formating/getFileIcon";
import { handleDownloadFile } from "../../lib/download/handleDownloadFile";
import { sendDownloadNotification } from "../../lib/download/sendDownloadNotification";

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

interface FolderStructureDisplayProps {
  currentFolderPath: string;
  getCurrentFolderItems: DownloadFolderItem[];
  navigateToFolder: (path: string) => void;
  collectionId: string;
  hasSentDownloadNotification: boolean;
  setHasSentDownloadNotification: (sent: boolean) => void;
  t: (key: string) => string;
}

const FolderStructureDisplay: React.FC<FolderStructureDisplayProps> = ({
  currentFolderPath,
  getCurrentFolderItems,
  navigateToFolder,
  collectionId,
  hasSentDownloadNotification,
  setHasSentDownloadNotification,
  t,
}) => {
  return (
    <div className="w-full border border-gray-400 px-4 rounded-md min-h-[200px]">
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <h5 className="text-gray-700 font-medium">{t("filesAndFolders")}</h5>
      </div>

      <div className="py-2">
        {getCurrentFolderItems.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t("noFiles")}</p>
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
                      handleDownloadFile(item.file!.filename, collectionId);
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
  );
};

export default FolderStructureDisplay;
