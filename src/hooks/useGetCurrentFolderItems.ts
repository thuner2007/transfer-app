import { useMemo } from "react";

// Generic type constraint for folder items
type FolderItemBase = {
  name: string;
  type: "folder" | "file";
  children?: FolderItemBase[];
};

export const useGetCurrentFolderItems = <T extends FolderItemBase>(
  folderStructure: T[],
  currentFolderPath: string
): T[] => {
  return useMemo(() => {
    if (!currentFolderPath) return folderStructure;

    const pathParts = currentFolderPath.split("/").filter((p) => p);
    let current = folderStructure;

    for (const part of pathParts) {
      const folder = current.find(
        (item) => item.type === "folder" && item.name === part
      );
      if (folder?.children) {
        current = folder.children as T[];
      } else {
        return [];
      }
    }

    return current;
  }, [folderStructure, currentFolderPath]);
};
