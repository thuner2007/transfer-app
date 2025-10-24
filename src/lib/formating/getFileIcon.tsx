import { FILE_TYPES } from "../api/constants";

// Helper function to check if a file matches a specific type
const isFileType = (
  mimeType: string,
  fileType: (typeof FILE_TYPES)[keyof typeof FILE_TYPES]
) => {
  const extension = mimeType.split("/").pop() || "";

  // Check extensions
  if (fileType.extensions && fileType.extensions.includes(extension)) {
    return true;
  }

  // Check mime prefix
  if (
    "mimePrefix" in fileType &&
    fileType.mimePrefix &&
    mimeType.startsWith(fileType.mimePrefix)
  ) {
    return true;
  }

  // Check specific mime types
  if (
    "mimeTypes" in fileType &&
    fileType.mimeTypes &&
    fileType.mimeTypes.includes(mimeType)
  ) {
    return true;
  }

  // Check mime includes
  if ("mimeIncludes" in fileType && fileType.mimeIncludes) {
    return fileType.mimeIncludes.some((include: string) =>
      mimeType.includes(include)
    );
  }

  return false;
};

export const getFileIcon = (mimeType: string) => {
  // Image files
  if (isFileType(mimeType, FILE_TYPES.IMAGE)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.IMAGE.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Video files
  if (isFileType(mimeType, FILE_TYPES.VIDEO)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.VIDEO.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
    );
  }

  // Audio files
  if (isFileType(mimeType, FILE_TYPES.AUDIO)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.AUDIO.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
    );
  }

  // PDF files
  if (isFileType(mimeType, FILE_TYPES.PDF)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.PDF.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Archive files
  if (isFileType(mimeType, FILE_TYPES.ARCHIVE)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.ARCHIVE.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Document files
  if (isFileType(mimeType, FILE_TYPES.DOCUMENT)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.DOCUMENT.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Spreadsheet files
  if (isFileType(mimeType, FILE_TYPES.SPREADSHEET)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.SPREADSHEET.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Code files
  if (isFileType(mimeType, FILE_TYPES.CODE)) {
    return (
      <svg
        className={`w-8 h-8 ${FILE_TYPES.CODE.color}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg
      className="w-8 h-8 text-gray-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );
};
