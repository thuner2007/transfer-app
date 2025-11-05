interface UploadProgressBarProps {
  currentFileName?: string;
  uploadProgress: number;
  t: (key: string) => string;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  currentFileName,
  uploadProgress,
  t,
}) => {
  return (
    <div className="w-full space-y-2 mb-4">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span className="truncate max-w-[70%]">
          {currentFileName || t("preparingUpload")}
        </span>
        <span className="font-semibold">{Math.round(uploadProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${uploadProgress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgressBar;
