import { UploadStateManager } from "../../../lib/upload/uploadStateManager";

interface ResumeUploadButtonProps {
  resumeUpload: () => void;
  pendingProgress: number;
  t: (key: string) => string;
  setHasPendingUpload: (hasPending: boolean) => void;
  setPendingProgress: (progress: number) => void;
}

const ResumeUploadButton: React.FC<ResumeUploadButtonProps> = ({
  resumeUpload,
  pendingProgress,
  t,
  setHasPendingUpload,
  setPendingProgress,
}) => {
  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-md mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-semibold text-blue-900">{t("pendingUpload")}</p>
          </div>
          <p className="text-sm text-blue-700 mb-1">
            {t("resumeUploadMessage")}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${pendingProgress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-blue-700">
              {Math.round(pendingProgress)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={resumeUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("resume")}
          </button>
          <button
            onClick={async () => {
              await UploadStateManager.clearState();
              setHasPendingUpload(false);
              setPendingProgress(0);
            }}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            title={t("cancel")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadButton;
