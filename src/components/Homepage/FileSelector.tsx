import React, { useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface FileSelectorProps {
  selectedFiles: FileList | null;
  onFilesSelected: (files: FileList | null) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ selectedFiles, onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const dataTransfer = new DataTransfer();

      // Add existing files first
      if (selectedFiles && selectedFiles.length > 0) {
        Array.from(selectedFiles).forEach((f) => dataTransfer.items.add(f));
      }

      // Process each new file
      newFiles.forEach((f) => {
        let newName = f.name;
        let counter = 1;

        // Get the base name and extension for proper numbering
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

      onFilesSelected(dataTransfer.files);

      console.log("Selected files:", files);
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
    // Reset the input value before opening file dialog to allow same file selection
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
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        onFocus={(e) => {
          // Reset value when input gets focus to allow same file selection
          e.target.value = "";
        }}
        className="hidden"
        accept="*/*"
      />
    </>
  );
};

export default FileSelector;
