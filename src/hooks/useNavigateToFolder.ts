import { useState } from "react";
import { BreadcrumbItem } from "../lib/interfaces/FolderStructure.interface";

export const useNavigateToFolder = () => {
  const [currentFolderPath, setCurrentFolderPath] = useState<string>("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { name: "Root", path: "" },
  ]);

  const navigateToFolder = (folderPath: string) => {
    setCurrentFolderPath(folderPath);

    const pathParts = folderPath ? folderPath.split("/") : [];
    const newBreadcrumbs: BreadcrumbItem[] = [{ name: "Root", path: "" }];

    let currentPath = "";
    pathParts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      newBreadcrumbs.push({ name: part, path: currentPath });
    });

    setBreadcrumbs(newBreadcrumbs);
  };

  return {
    currentFolderPath,
    breadcrumbs,
    navigateToFolder,
    setCurrentFolderPath,
    setBreadcrumbs,
  };
};
