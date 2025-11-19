import { sanitizeFilename } from "./sanitizeFilename";

// Edit file path (for folders)
export const sanitizeFilePath = (filePath: string): string => {
  return filePath
    .split("/")
    .map((part) => (part.trim() ? sanitizeFilename(part) : ""))
    .filter((part) => part !== "")
    .join("/");
};
