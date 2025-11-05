import { FileWithPath } from "../../../lib/interfaces/FolderStructure.interface";

interface UploadButtonProps {
  isUploading: boolean;
  filesWithPaths: FileWithPath[];
  downloadLink: string;
  userMail: string;
  uploadFiles: (mail: string, isResuming: boolean) => void;
  t: (key: string) => string;
}

const UploadButton: React.FC<UploadButtonProps> = ({
  isUploading,
  filesWithPaths,
  downloadLink,
  userMail,
  uploadFiles,
  t,
}) => {
  return (
    <button
      disabled={
        isUploading ||
        !filesWithPaths ||
        filesWithPaths.length === 0 ||
        downloadLink !== "https://transfer.cwx-dev.com/" ||
        !userMail.trim()
      }
      onClick={() => uploadFiles(userMail, false)}
      className={`text-white font-bold text-xl flex-1 p-3 rounded-md transition-all duration-200 ${
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
  );
};

export default UploadButton;
