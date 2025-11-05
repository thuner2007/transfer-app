"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BACKEND_URL, ERROR_MESSAGES } from "../../../../lib/api/constants";
import { CollectionData } from "../../../../lib/interfaces/CollectionData.interface";
import { sendDownloadNotification } from "../../../../lib/download/sendDownloadNotification";
import BreadcrumbNavigation from "../../../../components/Homepage/BreadcrumbNavigation";
import { useNavigateToFolder } from "../../../../hooks/useNavigateToFolder";
import { useGetCurrentFolderItems } from "../../../../hooks/useGetCurrentFolderItems";
import LanguageSwitcher from "../../../../components/LanguageSwitcher";
import LoadingModal from "../../../../components/Downloadpage/LoadingModal";
import FolderStructureDisplay from "../../../../components/Downloadpage/FolderStructureDisplay";
import PasswordModal from "../../../../components/Downloadpage/PasswordModal";
import DownloadingButton from "../../../../components/Downloadpage/DownloadButton";
import UploadedByInfo from "../../../../components/Downloadpage/UploadedByInfo";
import { DownloadFolderItem } from "../../../../lib/interfaces/Downloads.Interface";

interface DownloadPageProps {
  params: Promise<{
    collectionId: string;
  }>;
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { collectionId } = React.use(params);
  const urlParams = useParams();
  const locale = urlParams.locale as string;
  const t = useTranslations("DownloadPage");

  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(true);
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
      setIsLoading(false);
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
        setIsLoading(false);
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
          <div className="w-full">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <LanguageSwitcher currentLocale={locale} />
            </div>{" "}
            {!isLoading && !openPasswordModal && (
              <UploadedByInfo collectionData={collectionData} t={t} />
            )}
          </div>
          <DownloadingButton
            isDownloading={isDownloading}
            downloadAll={downloadAll}
            t={t}
          />

          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation
            breadcrumbs={breadcrumbs}
            navigateToFolder={navigateToFolder}
          />

          {/* Folder Structure Display */}
          {folderStructure.length > 0 && (
            <FolderStructureDisplay
              currentFolderPath={currentFolderPath}
              getCurrentFolderItems={getCurrentFolderItems}
              navigateToFolder={navigateToFolder}
              collectionId={collectionId}
              hasSentDownloadNotification={hasSentDownloadNotification}
              setHasSentDownloadNotification={setHasSentDownloadNotification}
              t={t}
            />
          )}
        </div>
      </div>
      {openPasswordModal && (
        <PasswordModal
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          passwordError={passwordError}
          setPasswordError={setPasswordError}
          setOpenPasswordModal={setOpenPasswordModal}
          collectionId={collectionId}
          fetchDownloadInfo={fetchDownloadInfo}
          t={t}
        />
      )}
      {isLoading && <LoadingModal t={t} />}
    </div>
  );
}
