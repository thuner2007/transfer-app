export interface FileWithPath {
  file: File;
  path: string; // e.g., "folder1/folder2/filename.png"
  folderPath: string; // e.g., "folder1/folder2"
}

export interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: FolderItem[];
  file?: FileWithPath;
  parentPath: string; // Full path to parent folder
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}
