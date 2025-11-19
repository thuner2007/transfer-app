import { useTranslations } from "next-intl";
import Image from "next/image";

interface SharePanelProps {
  downloadLink: string;
  uploadProgress: number;
  qrCodeData: string;
}

const SharePanel: React.FC<SharePanelProps> = ({
  downloadLink,
  uploadProgress,
  qrCodeData,
}) => {
  const t = useTranslations("SharePanel");

  return (
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
            {t("copy")}
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
            {t("share")}
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
  );
};
export default SharePanel;
