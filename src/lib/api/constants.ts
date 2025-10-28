// API Configuration
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3008/api";

// File type mappings for icons
export const FILE_TYPES = {
  IMAGE: {
    extensions: ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"],
    mimePrefix: "image/",
    color: "text-green-500",
  },
  VIDEO: {
    extensions: ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"],
    mimePrefix: "video/",
    color: "text-red-500",
  },
  AUDIO: {
    extensions: ["mp3", "wav", "flac", "aac", "ogg", "wma"],
    mimePrefix: "audio/",
    color: "text-purple-500",
  },
  PDF: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    color: "text-red-600",
  },
  ARCHIVE: {
    extensions: ["zip", "rar", "7z", "tar", "gz", "bz2"],
    color: "text-yellow-600",
  },
  DOCUMENT: {
    extensions: ["doc", "docx", "txt", "rtf", "odt"],
    mimeIncludes: ["document", "text"],
    color: "text-blue-500",
  },
  SPREADSHEET: {
    extensions: ["xls", "xlsx", "csv", "ods"],
    mimeIncludes: ["spreadsheet"],
    color: "text-green-600",
  },
  CODE: {
    extensions: [
      "js",
      "ts",
      "jsx",
      "tsx",
      "html",
      "css",
      "scss",
      "py",
      "java",
      "cpp",
      "c",
      "php",
      "rb",
      "go",
      "rs",
    ],
    color: "text-indigo-500",
  },
};

// Error messages
export const ERROR_MESSAGES = {
  DOWNLOAD_FAILED: "Error downloading file",
  DOWNLOAD_ALL_FAILED: "Error downloading all files",
  FETCH_INFO_FAILED: "Failed to fetch download info",
  PASSWORD_CHECK_FAILED: "Failed to check password requirement",
  PASSWORD_VERIFY_FAILED: "Failed to verify password",
  PASSWORD_INCORRECT: "Incorrect password. Please try again.",
  PASSWORD_ERROR_GENERIC: "Error verifying password. Please try again.",
  UPLOAD_FAILED: "Error uploading files. Please try again.",
  INVALID_VERIFICATION_CODE: "Invalid verification code. Please try again.",
  ERROR_VERIFY_FAILED: "Error verifying code. Please try again.",
} as const;

// UI Constants
export const UI_CONFIG = {
  MODAL_Z_INDEX: "z-50",
  CONTAINER_MAX_WIDTH: "max-w-6xl",
  CONTAINER_WIDTH: "w-2/3",
  BUTTON_WIDTH: "w-1/3",
} as const;

// File size units
export const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
export const BYTES_PER_UNIT = 1024;
