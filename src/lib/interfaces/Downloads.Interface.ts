export interface DownloadFolderItem {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: DownloadFolderItem[];
  file?: {
    filename: string;
    size: number;
    mimetype: string;
  };
  parentPath: string;
}