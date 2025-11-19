interface DownloadButtonProps {
  isDownloading: boolean;
  downloadAll: () => void;
  t: (key: string) => string;
}

const DownloadingButton = ({
  isDownloading,
  downloadAll,
  t,
}: DownloadButtonProps) => {
  return (
    <button
      onClick={() => downloadAll()}
      disabled={isDownloading}
      className={
        isDownloading
          ? "text-white font-bold text-base md:text-xl w-full md:w-1/3 p-3 rounded-md transition-all duration-200 bg-gray-500 cursor-not-allowed"
          : "text-white font-bold text-base md:text-xl w-full md:w-1/3 p-3 rounded-md transition-all duration-200 bg-blue-500 cursor-pointer hover:bg-blue-600 hover:shadow-lg"
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
          <span>{t("preparingDownload")}</span>
        </div>
      ) : (
        t("downloadAll")
      )}
    </button>
  );
};

export default DownloadingButton;
