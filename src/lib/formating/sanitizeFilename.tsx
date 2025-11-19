// Edit filename to be good for MinIO storage
export const sanitizeFilename = (filename: string): string => {
  // Save the file extension
  const lastDotIndex = filename.lastIndexOf(".");
  const name =
    lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";

  // Replace problematic characters with safe alternatives
  const sanitizedName =
    name
      // Replace spaces with underscores
      .replace(/\s+/g, "_")
      // Replace special characters with underscores or remove them
      .replace(/[^\w\-_.]/g, "_")
      // Remove multiple consecutive underscores
      .replace(/_+/g, "_")
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, "") ||
    // Ensure it's not empty
    "file";

  // Edit extension (keep only alphanumeric and the dot)
  const sanitizedExtension = extension.replace(/[^\w.]/g, "");

  // Limit total filename length to 200 characters (Minio limit is 1024, but we keep it shorter to be safe)
  const maxLength = 200;
  const fullName = sanitizedName + sanitizedExtension;

  if (fullName.length > maxLength) {
    const extensionLength = sanitizedExtension.length;
    const nameLength = maxLength - extensionLength;
    return sanitizedName.substring(0, nameLength) + sanitizedExtension;
  }

  return fullName;
};
