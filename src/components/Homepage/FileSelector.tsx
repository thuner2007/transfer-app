import React, {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { formatFileSize } from "../../lib/formating/formatFileSize";

interface FileSelectorProps {
  selectedFiles: FileList | null;
  onFilesSelected: (files: FileList | null) => void;
}

const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB

const FileSelector: React.FC<FileSelectorProps> = ({
  selectedFiles,
  onFilesSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateTotalSize = (fileList: FileList): number => {
    return Array.from(fileList).reduce((total, file) => total + file.size, 0);
  };

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSizeError("");

      const newFiles = Array.from(files);
      const dataTransfer = new DataTransfer();

      // Add existing files first
      if (selectedFiles && selectedFiles.length > 0) {
        Array.from(selectedFiles).forEach((f) => dataTransfer.items.add(f));
      }

      newFiles.forEach((f) => {
        let newName = f.name;
        let counter = 1;

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

      // Check total file size
      const totalSize = calculateTotalSize(dataTransfer.files);
      if (totalSize > MAX_TOTAL_FILE_SIZE) {
        setSizeError(
          `Total file size (${formatFileSize(
            totalSize
          )}) exceeds the ${formatFileSize(
            MAX_TOTAL_FILE_SIZE
          )} limit. Please select fewer or smaller files.`
        );
        return;
      }

      onFilesSelected(dataTransfer.files);

      console.log("Selected files:", files);
      console.log(
        `Total size: ${formatFileSize(totalSize)} / ${formatFileSize(
          MAX_TOTAL_FILE_SIZE
        )}`
      );
      Array.from(files).forEach((file) => {
        console.log(
          `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`
        );
      });
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <>
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
          <p className="text-gray-400 text-xs mt-2">
            Maximum total size: {formatFileSize(MAX_TOTAL_FILE_SIZE)}
          </p>
          {selectedFiles &&
            selectedFiles.length > 0 &&
            (() => {
              const currentSize = calculateTotalSize(selectedFiles);
              const isNearLimit = currentSize > MAX_TOTAL_FILE_SIZE * 0.8;
              return (
                <p
                  className={`text-xs mt-1 ${
                    isNearLimit ? "text-yellow-600" : "text-blue-600"
                  }`}
                >
                  Current total: {formatFileSize(currentSize)}
                  {isNearLimit && " (⚠️ Approaching limit)"}
                </p>
              );
            })()}
        </div>
      </div>

      {/* Error message display */}
      {sizeError && (
        <div className="w-full mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-sm">File Size Error</p>
              <p className="text-sm">{sizeError}</p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        onFocus={(e) => {
          e.target.value = "";
        }}
        className="hidden"
        accept="*/*"
      />
    </>
  );
};

export default FileSelector;
